@file:OptIn(ExperimentalLayoutApi::class)

package com.chartshop.app.ui.activity

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Chat
import androidx.compose.material.icons.outlined.Dns
import androidx.compose.material.icons.outlined.Language
import androidx.compose.material.icons.outlined.Phone
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chartshop.app.data.model.ActivityItem
import com.chartshop.app.ui.components.ArrowButton
import com.chartshop.app.ui.components.Badge
import com.chartshop.app.ui.components.BadgeTone
import com.chartshop.app.ui.components.Banner
import com.chartshop.app.ui.components.BannerTone
import com.chartshop.app.ui.components.Card
import com.chartshop.app.ui.components.EmptyState
import com.chartshop.app.ui.components.Modal
import com.chartshop.app.ui.components.PageLead
import com.chartshop.app.ui.components.ScreenPage
import com.chartshop.app.ui.components.SearchInput
import com.chartshop.app.ui.components.SkeletonBar
import com.chartshop.app.ui.components.SlowServerHint
import com.chartshop.app.ui.components.Tabs
import com.chartshop.app.ui.theme.ChartShopColors

private val PrimaryDark = Color(0xFF6B1530)

@Composable
fun ActivityScreen(viewModel: ActivityViewModel) {
    val filters by viewModel.filters.collectAsStateWithLifecycle()
    val remote by viewModel.items.collectAsStateWithLifecycle()
    val toast by viewModel.toast.collectAsStateWithLifecycle()
    val dates = viewModel.dates
    val items = remote.data
    val visible = items?.let { viewModel.filter(it, filters.query) }

    ScreenPage(
        toast = toast,
        onDismissToast = viewModel::dismissToast,
        refreshing = remote.loading && items != null,
        onRefresh = viewModel::refresh,
    ) {
        PageLead("Shop timeline across web, Telegram, and WhatsApp — see who did what.")

        if (items == null) {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                repeat(2) { SkeletonBar(150.dp, 72.dp, Modifier.weight(1f)) }
            }
        } else {
            val count = { channel: String -> items.count { it.channel == channel } }
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                listOf(
                    listOf("Loaded" to items.size, "Web" to count("web")),
                    listOf("Telegram" to count("telegram"), "WhatsApp" to count("whatsapp")),
                ).forEach { row ->
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        row.forEach { (label, value) -> StatTile(label, value.toString(), Modifier.weight(1f)) }
                    }
                }
            }
        }

        Tabs(
            labels = ACTIVITY_CHANNELS.map { it.replaceFirstChar(Char::uppercase) },
            selectedIndex = ACTIVITY_CHANNELS.indexOf(filters.channel),
            onSelect = { viewModel.onChannel(ACTIVITY_CHANNELS[it]) },
        )
        Tabs(
            labels = listOf("Everyone", "My activity"),
            selectedIndex = if (filters.mineOnly) 1 else 0,
            onSelect = { viewModel.onMineOnly(it == 1) },
        )
        Tabs(
            labels = ACTIVITY_ACTIONS.map { if (it == "all") "All actions" else actionLabel(it) },
            selectedIndex = ACTIVITY_ACTIONS.indexOf(filters.action),
            onSelect = { viewModel.onAction(ACTIVITY_ACTIONS[it]) },
        )
        SearchInput(filters.query, viewModel::onQuery, "Search activity")

        if (remote.error != null) Banner("Could not load activity.", BannerTone.Error)

        if (visible == null) {
            if (remote.error == null) {
                repeat(4) { SkeletonBar(320.dp, 84.dp, Modifier.fillMaxWidth()) }
                SlowServerHint(remote.slow)
            }
        } else {
            Text(
                "Showing ${visible.size} event${if (visible.size == 1) "" else "s"}",
                modifier = Modifier.fillMaxWidth(),
                color = ChartShopColors.TextMuted,
                fontSize = 13.5.sp,
                textAlign = TextAlign.Center,
            )
            var lastDay: Any? = null
            visible.forEach { row ->
                val day = dates.dayKey(row.createdAt)
                if (day != lastDay) {
                    lastDay = day
                    Text(
                        dates.dayLabel(row.createdAt),
                        modifier = Modifier.fillMaxWidth().padding(top = 6.dp),
                        color = ChartShopColors.TextSecondary,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        textAlign = TextAlign.Center,
                    )
                }
                ActivityRow(row, dates.time(row.createdAt)) { viewModel.showDetail(row) }
            }
            if (visible.isEmpty()) {
                Card {
                    EmptyState(
                        if (items.isEmpty()) "No activity yet" else "No matches",
                        if (items.isEmpty()) {
                            "Open Chat and send help, or sign in again to see the first events."
                        } else {
                            "Try another channel, action, or search term."
                        },
                    )
                }
            }
        }
    }

    val detail = filters.detail
    if (detail != null) {
        val (input, reply) = chatParts(detail)
        Modal(
            title = "Command & reply",
            description = detail.summary,
            onDismiss = { viewModel.showDetail(null) },
            footer = { ArrowButton("Done", onClick = { viewModel.showDetail(null) }) },
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if (input.isNotEmpty()) DetailBubble("Command", input, ChartShopColors.PrimaryTint)
                if (reply.isNotEmpty()) DetailBubble("Reply", reply, ChartShopColors.Cream)
            }
        }
    }
}

@Composable
private fun StatTile(label: String, value: String, modifier: Modifier) {
    Column(
        modifier
            .background(ChartShopColors.Surface)
            .border(1.dp, ChartShopColors.Border)
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(label, color = ChartShopColors.TextSecondary, fontSize = 12.5.sp, fontWeight = FontWeight.Medium)
        Text(
            value,
            modifier = Modifier.padding(top = 6.dp),
            color = ChartShopColors.Maroon,
            fontSize = 21.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = (-0.03).em,
        )
    }
}

@Composable
private fun ActivityRow(row: ActivityItem, time: String, onShowDetail: () -> Unit) {
    val (input, reply) = chatParts(row)
    val who = actorLabel(row)
    Column(
        Modifier
            .fillMaxWidth()
            .background(ChartShopColors.Surface)
            .border(1.dp, ChartShopColors.Border)
            .padding(horizontal = 16.dp, vertical = 14.dp),
    ) {
        Row(Modifier.fillMaxWidth().padding(bottom = 8.dp), verticalAlignment = Alignment.Top) {
            FlowRow(
                Modifier.weight(1f),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                ChannelPill(row.channel)
                Badge(
                    actionLabel(row.action),
                    tone = when (row.action) {
                        "auth.login" -> BadgeTone.Success
                        "chat.turn" -> BadgeTone.Info
                        else -> BadgeTone.Warning
                    },
                )
                if (who != null) Badge(who, tone = BadgeTone.Info)
            }
            Text(time, modifier = Modifier.padding(start = 8.dp), color = ChartShopColors.TextMuted, fontSize = 13.sp)
        }
        Text(row.summary, color = ChartShopColors.TextPrimary, fontSize = 15.sp, lineHeight = 22.sp)
        if (input.isNotEmpty() || reply.isNotEmpty()) {
            Text(
                "Show command & reply",
                modifier = Modifier.padding(top = 10.dp).clickable(onClick = onShowDetail),
                color = ChartShopColors.Maroon,
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}

@Composable
private fun ChannelPill(channel: String) {
    val (background, foreground) = when (channel) {
        "web" -> ChartShopColors.PrimaryTint to PrimaryDark
        "whatsapp" -> ChartShopColors.SuccessTint to ChartShopColors.Success
        "system" -> ChartShopColors.WarningTint to ChartShopColors.Warning
        else -> ChartShopColors.InfoTint to ChartShopColors.Info
    }
    val icon = when (channel) {
        "web" -> Icons.Outlined.Language
        "whatsapp" -> Icons.Outlined.Phone
        "system" -> Icons.Outlined.Dns
        else -> Icons.AutoMirrored.Outlined.Chat
    }
    Row(
        Modifier.background(background).padding(horizontal = 9.dp, vertical = 3.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(5.dp),
    ) {
        Icon(icon, contentDescription = null, tint = foreground, modifier = Modifier.size(12.dp))
        Text(channel.replaceFirstChar(Char::uppercase), color = foreground, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
private fun DetailBubble(label: String, text: String, background: Color) {
    Column(Modifier.fillMaxWidth().background(background).padding(horizontal = 12.dp, vertical = 10.dp)) {
        Text(
            label.uppercase(),
            modifier = Modifier.padding(bottom = 4.dp),
            color = ChartShopColors.TextSecondary,
            fontSize = 11.5.sp,
            fontWeight = FontWeight.SemiBold,
            letterSpacing = 0.04.em,
        )
        Text(text, color = ChartShopColors.TextPrimary, fontSize = 14.sp, lineHeight = 20.sp)
    }
}
