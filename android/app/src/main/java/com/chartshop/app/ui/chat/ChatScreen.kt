package com.chartshop.app.ui.chat

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.outlined.ChatBubbleOutline
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.Inventory2
import androidx.compose.material.icons.outlined.People
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.chartshop.app.data.model.ChatBubble
import com.chartshop.app.ui.components.BrandMark
import com.chartshop.app.ui.components.SkeletonBar
import com.chartshop.app.ui.components.SlowServerHint
import com.chartshop.app.ui.components.ToastHost
import com.chartshop.app.ui.shell.AppDestination
import com.chartshop.app.ui.theme.ChartShopColors

private sealed interface ThreadRow {
    val key: String

    data class Day(val label: String, override val key: String) : ThreadRow
    data class Message(val bubble: ChatBubble, override val key: String) : ThreadRow
}

private fun suggestionIcon(cmd: String): ImageVector = when (cmd) {
    "help" -> Icons.Filled.AutoAwesome
    "list", "low stock" -> Icons.Outlined.Inventory2
    "customers" -> Icons.Outlined.People
    else -> Icons.AutoMirrored.Filled.TrendingUp
}

@Composable
fun ChatScreen(
    viewModel: ChatViewModel,
    shopName: String,
    onOpen: (AppDestination) -> Unit = {},
) {
    val ui by viewModel.ui.collectAsState()
    val toast by viewModel.toast.collectAsState()
    val dates = viewModel.dates
    val listState = rememberLazyListState()

    val rows = buildList {
        var lastDay: Any? = null
        ui.messages.forEachIndexed { index, msg ->
            val day = dates.dayKey(msg.createdAt)
            if (day != null && day != lastDay) {
                lastDay = day
                add(ThreadRow.Day(dates.dayLabel(msg.createdAt), "day-$day"))
            }
            add(ThreadRow.Message(msg, msg.id ?: "${msg.role}-$index-${msg.createdAt}"))
        }
    }

    LaunchedEffect(rows.size, ui.sending) {
        val last = rows.size + (if (ui.sending) 1 else 0) - 1
        if (last >= 0) listState.animateScrollToItem(last)
    }

    Box(Modifier.fillMaxSize().imePadding()) {
        Column(Modifier.fillMaxSize().background(ChartShopColors.Cream)) {
            Header(shopName, viewModel.isDemo, viewModel::newConversation)
            SlowServerHint(ui.slow && ui.messages.isEmpty(), Modifier.padding(horizontal = 16.dp, vertical = 8.dp))
            Box(Modifier.weight(1f).fillMaxWidth()) {
                when {
                    ui.loading && ui.messages.isEmpty() && !ui.filterEmpty -> ThreadSkeleton()
                    ui.error != null && ui.messages.isEmpty() && !ui.hasAnyHistory -> ChatEmpty(
                        title = "Couldn’t load chat history",
                        body = "Your past commands from web and Telegram should appear here after login. " +
                            "Check your connection and try again.",
                    ) {
                        EmptyAction(Icons.Filled.AutoAwesome, "Retry", "reload history", viewModel::refresh)
                    }
                    ui.isEmpty -> ChatEmpty(
                        badge = "Ready when you are",
                        title = "Run your shop from chat",
                        body = "Sell, restock, check reports — the same commands as Telegram, right here. " +
                            "WhatsApp is coming soon.",
                    ) {
                        CHAT_SUGGESTIONS.take(4).forEach { s ->
                            EmptyAction(suggestionIcon(s.cmd), s.label, s.cmd) { viewModel.submit(s.cmd) }
                        }
                    }
                    else -> Column(Modifier.fillMaxSize()) {
                        if (ui.hasAnyHistory) {
                            FeedFilterRow(ui.feedFilter, viewModel::setFeedFilter)
                        }
                        if (ui.filterEmpty) {
                            Text(
                                if (ui.feedFilter == ChatFeedFilter.Sales) {
                                    "No sales in this feed yet. Ring one up on Sales or switch to All."
                                } else {
                                    "No commands in this feed yet. Send help or switch to All."
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 28.dp, vertical = 32.dp),
                                color = ChartShopColors.TextMuted,
                                fontSize = 14.sp,
                                lineHeight = 20.sp,
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                            )
                        } else {
                            LazyColumn(
                                state = listState,
                                modifier = Modifier.fillMaxSize(),
                                contentPadding = PaddingValues(horizontal = 14.dp, vertical = 16.dp),
                                verticalArrangement = Arrangement.spacedBy(10.dp),
                            ) {
                                items(rows, key = { it.key }) { row ->
                                    when (row) {
                                        is ThreadRow.Day -> DayDivider(row.label)
                                        is ThreadRow.Message -> MessageRow(
                                            row.bubble,
                                            dates.time(row.bubble.createdAt),
                                            onOpen = onOpen,
                                        )
                                    }
                                }
                                if (ui.sending) item(key = "typing") { TypingRow() }
                            }
                        }
                    }
                }
            }
            Footer(ui, viewModel)
        }
        ToastHost(toast, viewModel::dismissToast, Modifier.align(Alignment.TopCenter).padding(12.dp))
    }
}

@Composable
private fun FeedFilterRow(active: ChatFeedFilter, onSelect: (ChatFeedFilter) -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .padding(horizontal = 14.dp, vertical = 8.dp)
            .background(ChartShopColors.PeachSoft)
            .padding(6.dp)
            .horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        ChatFeedFilter.entries.forEach { filter ->
            val selected = filter == active
            Text(
                filter.label,
                modifier = Modifier
                    .background(if (selected) ChartShopColors.Surface else Color.Transparent)
                    .clickable { onSelect(filter) }
                    .padding(horizontal = 14.dp, vertical = 9.dp),
                color = ChartShopColors.Maroon,
                fontSize = 13.5.sp,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}

@Composable
private fun Header(shopName: String, isDemo: Boolean, onNew: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .background(ChartShopColors.Surface)
            .border(1.dp, ChartShopColors.Border)
            .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        BrandMark(size = 40.dp)
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    shopName.ifBlank { "ChartShop" },
                    color = ChartShopColors.Maroon,
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    modifier = Modifier.weight(1f, fill = false),
                )
                Row(
                    Modifier.background(ChartShopColors.SuccessTint).padding(horizontal = 8.dp, vertical = 2.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(5.dp),
                ) {
                    Box(Modifier.size(6.dp).background(ChartShopColors.Success, androidx.compose.foundation.shape.CircleShape))
                    Text("Online", color = ChartShopColors.Success, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                }
            }
            Text(
                if (isDemo) "Try help · list · daily · best — sell commands need your own shop" else "Chat commands for your shop",
                color = ChartShopColors.TextSecondary,
                fontSize = 12.5.sp,
                maxLines = 2,
            )
        }
        Box(
            Modifier
                .size(40.dp)
                .border(1.dp, ChartShopColors.Border)
                .clickable(onClick = onNew),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Filled.Add, contentDescription = "New conversation", tint = ChartShopColors.Maroon)
        }
    }
}

@Composable
private fun DayDivider(label: String) {
    Row(
        Modifier.fillMaxWidth().padding(vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Box(Modifier.weight(1f).heightIn(min = 1.dp, max = 1.dp).background(ChartShopColors.Border))
        Text(
            label,
            modifier = Modifier.background(ChartShopColors.Surface).border(1.dp, ChartShopColors.Border)
                .padding(horizontal = 10.dp, vertical = 3.dp),
            color = ChartShopColors.TextMuted,
            fontSize = 11.5.sp,
            fontWeight = FontWeight.SemiBold,
        )
        Box(Modifier.weight(1f).heightIn(min = 1.dp, max = 1.dp).background(ChartShopColors.Border))
    }
}

@Composable
private fun BubbleAvatar() {
    Box(
        Modifier.size(28.dp).background(ChartShopColors.PrimaryTint).border(1.dp, ChartShopColors.Border),
        contentAlignment = Alignment.Center,
    ) {
        Icon(Icons.Outlined.ChatBubbleOutline, contentDescription = null, tint = ChartShopColors.Maroon, modifier = Modifier.size(14.dp))
    }
}

@Composable
private fun MessageRow(
    msg: ChatBubble,
    time: String,
    onOpen: (AppDestination) -> Unit = {},
) {
    val mine = msg.mine
    val activity = msg.isActivity
    val destination = chatActivityDestination(msg)
    Row(
        Modifier.fillMaxWidth(),
        horizontalArrangement = if (mine) Arrangement.End else Arrangement.Start,
        verticalAlignment = Alignment.Bottom,
    ) {
        if (!mine) {
            BubbleAvatar()
            Spacer(Modifier.size(8.dp))
        }
        val bubble = when {
            mine -> Modifier.background(Brush.linearGradient(listOf(ChartShopColors.Coral, ChartShopColors.Maroon)))
            activity -> Modifier.background(ChartShopColors.PeachSoft).border(1.dp, ChartShopColors.Border)
            else -> Modifier.background(ChartShopColors.Surface).border(1.dp, ChartShopColors.Border)
        }.then(
            if (destination != null) {
                Modifier.clickable { onOpen(destination) }
            } else {
                Modifier
            },
        )
        Column(bubble.widthIn(max = 300.dp).padding(horizontal = 13.dp, vertical = 9.dp)) {
            Text(
                msg.text,
                color = if (mine) Color.White else ChartShopColors.TextPrimary,
                fontSize = 14.5.sp,
                lineHeight = 21.sp,
            )
            val meta = buildString {
                if (msg.createdAt != null) append(time)
                val actor = msg.actorUsername
                if (!actor.isNullOrBlank()) append(" · @$actor")
                if (msg.channel != null && !mine) append(" · ${msg.channel}")
                if (activity) append(" · log")
            }
            if (meta.isNotEmpty()) {
                Text(
                    meta,
                    modifier = Modifier.align(if (mine) Alignment.End else Alignment.Start).padding(top = 4.dp),
                    color = if (mine) Color.White.copy(alpha = 0.75f) else ChartShopColors.TextMuted,
                    fontSize = 11.sp,
                )
            }
        }
    }
}

@Composable
private fun TypingRow() {
    val transition = rememberInfiniteTransition(label = "typing")
    Row(verticalAlignment = Alignment.Bottom) {
        BubbleAvatar()
        Spacer(Modifier.size(8.dp))
        Row(
            Modifier.background(ChartShopColors.Surface).border(1.dp, ChartShopColors.Border)
                .padding(horizontal = 14.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(5.dp),
        ) {
            listOf(0, 140, 280).forEach { delayMs ->
                val lift by transition.animateFloat(
                    initialValue = 0f,
                    targetValue = 1f,
                    animationSpec = infiniteRepeatable(tween(600, delayMillis = delayMs), RepeatMode.Reverse),
                    label = "dot$delayMs",
                )
                Box(
                    Modifier
                        .offset(y = (-4 * lift).dp)
                        .alpha(0.4f + 0.6f * lift)
                        .size(7.dp)
                        .background(ChartShopColors.Maroon, androidx.compose.foundation.shape.CircleShape),
                )
            }
        }
    }
}

@Composable
private fun ThreadSkeleton() {
    Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        listOf(0.6f to false, 0.45f to true, 0.7f to false, 0.4f to true).forEach { (fraction, mine) ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = if (mine) Arrangement.End else Arrangement.Start) {
                SkeletonBar(width = (300 * fraction).dp, height = 44.dp)
            }
        }
    }
}

@Composable
private fun ChatEmpty(
    title: String,
    body: String,
    badge: String? = null,
    actions: @Composable () -> Unit,
) {
    Column(
        Modifier.fillMaxSize().padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        if (badge != null) {
            Row(
                Modifier.background(ChartShopColors.PrimaryTint).padding(horizontal = 10.dp, vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Icon(Icons.Filled.AutoAwesome, contentDescription = null, tint = ChartShopColors.Maroon, modifier = Modifier.size(14.dp))
                Text(badge, color = ChartShopColors.Maroon, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            }
        }
        Text(title, color = ChartShopColors.Maroon, fontSize = 22.sp, fontWeight = FontWeight.Bold)
        Text(
            body,
            color = ChartShopColors.TextSecondary,
            fontSize = 14.sp,
            lineHeight = 21.sp,
            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
        )
        Column(Modifier.fillMaxWidth().padding(top = 6.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            actions()
        }
    }
}

@Composable
private fun EmptyAction(icon: ImageVector, label: String, hint: String, onClick: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .background(ChartShopColors.Surface)
            .border(1.dp, ChartShopColors.Border)
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Icon(icon, contentDescription = null, tint = ChartShopColors.Maroon, modifier = Modifier.size(18.dp))
        Column {
            Text(label, color = ChartShopColors.TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
            Text(hint, color = ChartShopColors.TextMuted, fontSize = 12.5.sp)
        }
    }
}

@Composable
private fun Footer(ui: ChatUi, viewModel: ChatViewModel) {
    Column(
        Modifier
            .fillMaxWidth()
            .background(ChartShopColors.Surface)
            .border(1.dp, ChartShopColors.Border)
            .padding(horizontal = 14.dp, vertical = 10.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        if (!ui.isEmpty) {
            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                CHAT_SUGGESTIONS.forEach { s ->
                    Row(
                        Modifier
                            .border(1.dp, ChartShopColors.Border)
                            .background(ChartShopColors.Cream)
                            .clickable { viewModel.submit(s.cmd) }
                            .padding(horizontal = 10.dp, vertical = 7.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(5.dp),
                    ) {
                        Icon(suggestionIcon(s.cmd), contentDescription = null, tint = ChartShopColors.Maroon, modifier = Modifier.size(13.dp))
                        Text(s.label, color = ChartShopColors.Maroon, fontSize = 12.5.sp, fontWeight = FontWeight.Medium)
                    }
                }
            }
        }
        Row(
            Modifier.fillMaxWidth().border(1.dp, ChartShopColors.BorderStrong).background(ChartShopColors.Surface)
                .padding(start = 12.dp, end = 6.dp, top = 6.dp, bottom = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Icon(Icons.Outlined.Edit, contentDescription = null, tint = ChartShopColors.TextMuted, modifier = Modifier.size(18.dp))
            Box(Modifier.weight(1f)) {
                if (ui.draft.isEmpty()) {
                    Text(
                        if (viewModel.isDemo) "Try: help · list · daily · best · low stock" else "Type a message",
                        color = ChartShopColors.TextMuted,
                        fontSize = 15.sp,
                    )
                }
                BasicTextField(
                    value = ui.draft,
                    onValueChange = viewModel::onDraft,
                    modifier = Modifier.fillMaxWidth(),
                    textStyle = TextStyle(color = ChartShopColors.TextPrimary, fontSize = 15.sp),
                    cursorBrush = SolidColor(ChartShopColors.Primary),
                    maxLines = 4,
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                    keyboardActions = KeyboardActions(onSend = { viewModel.submit() }),
                )
            }
            val canSend = ui.draft.isNotBlank() && !ui.sending
            Box(
                Modifier
                    .size(40.dp)
                    .background(
                        if (canSend || ui.sending) {
                            Brush.linearGradient(listOf(ChartShopColors.Coral, ChartShopColors.Maroon))
                        } else {
                            SolidColor(ChartShopColors.Border)
                        },
                    )
                    .clickable(enabled = canSend) { viewModel.submit() },
                contentAlignment = Alignment.Center,
            ) {
                if (ui.sending) {
                    CircularProgressIndicator(Modifier.size(18.dp), color = Color.White, strokeWidth = 2.5.dp)
                } else {
                    Icon(Icons.Filled.ArrowUpward, contentDescription = "Send", tint = Color.White, modifier = Modifier.size(18.dp))
                }
            }
        }
        Text(
            if (viewModel.isDemo) {
                "Read-only commands work in demo (help, list, daily, best…). Sell, stock, and expense commands need your own shop."
            } else {
                "ChartShop chat uses the same command language as Telegram. Messages are logged in Activity. WhatsApp is coming soon."
            },
            color = ChartShopColors.TextMuted,
            fontSize = 11.5.sp,
            lineHeight = 16.sp,
        )
    }
}
