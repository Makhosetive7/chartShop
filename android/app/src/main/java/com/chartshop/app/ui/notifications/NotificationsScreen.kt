package com.chartshop.app.ui.notifications

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Assignment
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Inventory2
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.Schedule
import androidx.compose.material.icons.outlined.WarningAmber
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chartshop.app.domain.FeedIcon
import com.chartshop.app.domain.FeedRow
import com.chartshop.app.domain.FeedTone
import com.chartshop.app.ui.components.Banner
import com.chartshop.app.ui.components.BannerTone
import com.chartshop.app.ui.components.EmptyState
import com.chartshop.app.ui.components.ScreenPage
import com.chartshop.app.ui.components.SkeletonBar
import com.chartshop.app.ui.components.Tabs
import com.chartshop.app.ui.theme.ChartShopColors

@Composable
fun NotificationsScreen(viewModel: NotificationsViewModel) {
    val ui by viewModel.ui.collectAsStateWithLifecycle()
    val refreshing by viewModel.refreshing.collectAsStateWithLifecycle()
    val toast by viewModel.toast.collectAsStateWithLifecycle()
    val rows = ui.rows

    ScreenPage(
        toast = toast,
        onDismissToast = viewModel::dismissToast,
        refreshing = refreshing && rows != null,
        onRefresh = viewModel::refresh,
    ) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
            val enabled = ui.unreadCount > 0
            Text(
                "Mark all as read",
                modifier = Modifier
                    .alpha(if (enabled) 1f else 0.4f)
                    .clickable(enabled = enabled, onClick = viewModel::markAll)
                    .padding(vertical = 6.dp),
                color = ChartShopColors.Maroon,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
            )
        }
        if (ui.error != null) Banner(ui.error ?: "Could not load notifications.", BannerTone.Error)
        Tabs(
            labels = listOf("All", "Unread" + if (ui.unreadCount > 0) " · ${ui.unreadCount}" else ""),
            selectedIndex = if (ui.unreadOnly) 1 else 0,
            onSelect = { viewModel.onFilter(it == 1) },
        )

        Column(
            Modifier
                .fillMaxWidth()
                .background(ChartShopColors.Surface)
                .border(1.dp, ChartShopColors.Border),
        ) {
            when {
                rows == null -> FeedSkeleton()
                ui.visible.isEmpty() -> EmptyState(
                    if (ui.unreadOnly) "You're all caught up" else "No notifications yet",
                    if (ui.unreadOnly) {
                        "Credit, stock, orders, and laybyes stay here until you read them."
                    } else {
                        "Credit due, low stock, waiting orders, and quiet laybyes land here."
                    },
                    icon = Icons.Outlined.Notifications,
                    modifier = Modifier.padding(vertical = 20.dp),
                )
                else -> {
                    val fresh = ui.visible.filter { it.unread }
                    val earlier = ui.visible.filter { !it.unread }
                    if (fresh.isNotEmpty()) {
                        SectionLabel("New")
                        fresh.forEach { FeedItem(it) { viewModel.markRead(it) } }
                    }
                    if (earlier.isNotEmpty()) {
                        SectionLabel("Earlier")
                        earlier.forEach { FeedItem(it) { viewModel.markRead(it) } }
                    }
                }
            }
        }
    }
}

@Composable
private fun SectionLabel(text: String) {
    Text(
        text,
        modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 14.dp, bottom = 6.dp),
        color = ChartShopColors.Maroon,
        fontSize = 16.sp,
        fontWeight = FontWeight.Bold,
        letterSpacing = (-0.02).em,
    )
}

private fun avatarColor(tone: FeedTone): Color = when (tone) {
    FeedTone.Danger -> ChartShopColors.Danger
    FeedTone.Warning -> ChartShopColors.Secondary
    FeedTone.Info -> ChartShopColors.PrimaryLight
    FeedTone.Muted -> ChartShopColors.Maroon
}

private fun badgeColor(tone: FeedTone): Color = when (tone) {
    FeedTone.Danger -> ChartShopColors.Danger
    FeedTone.Warning -> ChartShopColors.Warning
    FeedTone.Info -> ChartShopColors.Info
    FeedTone.Muted -> ChartShopColors.Maroon
}

private fun iconFor(icon: FeedIcon) = when (icon) {
    FeedIcon.Alert -> Icons.Outlined.WarningAmber
    FeedIcon.Clock -> Icons.Outlined.Schedule
    FeedIcon.Calendar -> Icons.Outlined.CalendarMonth
    FeedIcon.Package -> Icons.Outlined.Inventory2
    FeedIcon.Clipboard -> Icons.AutoMirrored.Outlined.Assignment
    FeedIcon.Bell -> Icons.Outlined.Notifications
}

@Composable
private fun FeedItem(row: FeedRow, onMarkRead: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .background(if (row.unread) ChartShopColors.PrimaryTint else ChartShopColors.Surface)
            .clickable(enabled = row.unread, onClick = onMarkRead)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(Modifier.size(48.dp)) {
            Box(
                Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .background(avatarColor(row.tone)),
                contentAlignment = Alignment.Center,
            ) {
                if (row.avatar != null) {
                    Text(row.avatar, color = Color.White, fontSize = 15.sp, fontWeight = FontWeight.Bold, letterSpacing = (-0.03).em)
                } else {
                    Icon(iconFor(row.icon), contentDescription = null, tint = Color.White, modifier = Modifier.size(22.dp))
                }
            }
            Box(
                Modifier
                    .align(Alignment.BottomEnd)
                    .offset(x = 2.dp, y = 2.dp)
                    .size(22.dp)
                    .clip(CircleShape)
                    .background(ChartShopColors.Surface)
                    .padding(2.dp)
                    .clip(CircleShape)
                    .background(badgeColor(row.tone)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(iconFor(row.icon), contentDescription = null, tint = Color.White, modifier = Modifier.size(11.dp))
            }
        }
        Column(Modifier.weight(1f)) {
            Text(
                buildAnnotatedString {
                    if (row.lead.isNotEmpty()) withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { append(row.lead) }
                    append(row.copy)
                },
                color = ChartShopColors.TextPrimary,
                fontSize = 14.5.sp,
                lineHeight = 20.sp,
            )
            Text(
                row.meta,
                modifier = Modifier.padding(top = 4.dp),
                color = if (row.unread) ChartShopColors.PrimaryLight else ChartShopColors.TextMuted,
                fontSize = 12.5.sp,
                fontWeight = FontWeight.SemiBold,
            )
        }
        if (row.unread) {
            Box(
                Modifier
                    .padding(top = 18.dp)
                    .size(12.dp)
                    .clip(CircleShape)
                    .background(ChartShopColors.PrimaryLight),
            )
        }
    }
}

@Composable
private fun FeedSkeleton() {
    Column(Modifier.padding(horizontal = 16.dp, vertical = 12.dp)) {
        repeat(4) {
            Row(Modifier.padding(vertical = 12.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Box(Modifier.size(48.dp).clip(CircleShape).background(ChartShopColors.Cream))
                Column(Modifier.weight(1f)) {
                    SkeletonBar(220.dp, 12.dp, Modifier.background(ChartShopColors.Cream))
                    Spacer(Modifier.height(8.dp))
                    SkeletonBar(110.dp, 10.dp)
                }
                Spacer(Modifier.width(0.dp))
            }
        }
    }
}
