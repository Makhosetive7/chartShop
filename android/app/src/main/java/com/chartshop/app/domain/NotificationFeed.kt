package com.chartshop.app.domain

import com.chartshop.app.data.model.ActivityItem
import com.chartshop.app.data.model.CreditDueItem
import com.chartshop.app.data.model.LaybyeAlertItem
import com.chartshop.app.data.model.OrderAlertItem
import com.chartshop.app.data.model.SaleLine
import com.chartshop.app.data.model.StockAlertItem

enum class FeedKind { Chase, Alert, Stock, Order, Laybye }

enum class FeedTone { Danger, Warning, Info, Muted }

enum class FeedIcon { Alert, Clock, Calendar, Package, Clipboard, Bell }

/**
 * One row of the notifications feed. [lead] renders bold, followed by [copy].
 * Mirror of `FeedRow` in frontend/src/pages/NotificationsPage.tsx.
 */
data class FeedRow(
    val key: String,
    val seenKey: String,
    val unread: Boolean,
    val sort: Int,
    val kind: FeedKind,
    val avatar: String?,
    val tone: FeedTone,
    val icon: FeedIcon,
    val lead: String,
    val copy: String,
    val meta: String,
)

data class FeedSources(
    val credit: List<CreditDueItem> = emptyList(),
    val stock: List<StockAlertItem> = emptyList(),
    val orders: List<OrderAlertItem> = emptyList(),
    val laybyes: List<LaybyeAlertItem> = emptyList(),
    val reminders: List<ActivityItem> = emptyList(),
)

object NotificationFeed {
    private val ACTIONABLE = setOf("overdue", "due", "tomorrow")
    private const val UNREAD_BOOST = 10_000

    fun creditKey(item: CreditDueItem) = "${item.id}:${item.status}"
    fun stockKey(item: StockAlertItem) = "stock:${item.id}:${item.status}"
    fun orderKey(item: OrderAlertItem) = "order:${item.id}:${item.status}"
    fun laybyeKey(item: LaybyeAlertItem) = "laybye:${item.id}:${item.status}"
    fun alertKey(item: ActivityItem) = "alert:${item.id}"

    fun isCreditUnread(item: CreditDueItem, seen: Set<String>) =
        item.status in ACTIONABLE && creditKey(item) !in seen

    private fun prefixedKeys(sources: FeedSources) =
        sources.stock.map(::stockKey) + sources.orders.map(::orderKey) + sources.laybyes.map(::laybyeKey)

    /** The bell badge: credit chases plus stock, order, and laybye rows (not reminder events). */
    fun badgeCount(sources: FeedSources, seen: Set<String>): Int =
        sources.credit.count { isCreditUnread(it, seen) } + prefixedKeys(sources).count { it !in seen }

    /** Every key "Mark all as read" stores; keys for rows that left the live lists are dropped. */
    fun markAllKeys(sources: FeedSources, seen: Set<String>): Set<String> {
        val liveCredit = sources.credit.map { it.id }.toSet()
        val livePrefixed = prefixedKeys(sources).toSet()
        val kept = seen.filter { key ->
            when {
                key.startsWith("alert:") -> true
                key.startsWith("stock:") || key.startsWith("order:") || key.startsWith("laybye:") -> key in livePrefixed
                else -> key.substringBefore(':') in liveCredit
            }
        }
        return (kept + sources.credit.map(::creditKey) + livePrefixed + sources.reminders.map(::alertKey)).toSet()
    }

    fun build(sources: FeedSources, seen: Set<String>, dates: ShopDates): List<FeedRow> {
        val rows = buildList {
            sources.credit.forEach { add(chase(it, seen, dates)) }
            sources.stock.forEach { add(stock(it, seen)) }
            sources.orders.forEach { add(order(it, seen, dates)) }
            sources.laybyes.forEach { add(laybye(it, seen, dates)) }
            sources.reminders.forEach { add(reminder(it, seen, dates)) }
        }
        return rows.sortedByDescending { it.sort }
    }

    fun initials(name: String): String {
        val parts = name.trim().split(Regex("""\s+""")).filter { it.isNotEmpty() }
        return when {
            parts.isEmpty() -> "?"
            parts.size == 1 -> parts[0].take(2).uppercase()
            else -> "${parts.first()[0]}${parts.last()[0]}".uppercase()
        }
    }

    private fun plural(n: Int, word: String) = "$n $word${if (n == 1) "" else "s"}"

    private fun goods(items: List<SaleLine>, fallback: String): String {
        val preview = items.take(2).map { ProductCatalog.itemLabel(it) }.filter { it.isNotEmpty() }.joinToString(", ")
        if (preview.isEmpty()) return fallback
        return if (items.size > 2) "$preview +${items.size - 2}" else preview
    }

    private fun boosted(base: Int, unread: Boolean) = base + if (unread) UNREAD_BOOST else 0

    private fun chase(item: CreditDueItem, seen: Set<String>, dates: ShopDates): FeedRow {
        val unread = isCreditUnread(item, seen)
        val goods = goods(item.items, "a credit sale")
        val owes = formatMoney(item.customerBalance)
        val (copy, meta, base) = when (item.status) {
            "overdue" -> Triple(
                " still owes $owes for $goods. Payment is ${plural(item.daysOverdue, "day")} late.",
                "${item.daysOverdue}d late · pay by ${dates.date(item.dueDate)}",
                1000 + item.daysOverdue,
            )
            "due" -> Triple(" owes $owes for $goods. Payment is due today.", "Due today", 500)
            "tomorrow" -> Triple(" owes $owes for $goods. Payment is due tomorrow.", "Tomorrow", 400)
            else -> Triple(
                " owes $owes for $goods. Payment is in ${plural(item.daysUntilDue, "day")}.",
                dates.date(item.dueDate),
                100 - item.daysUntilDue,
            )
        }
        val tone = when (item.status) {
            "overdue" -> FeedTone.Danger
            "due" -> FeedTone.Warning
            "tomorrow" -> FeedTone.Info
            else -> FeedTone.Muted
        }
        val icon = when (item.status) {
            "overdue" -> FeedIcon.Alert
            "upcoming" -> FeedIcon.Calendar
            else -> FeedIcon.Clock
        }
        return FeedRow(
            key = "chase-${item.id}", seenKey = creditKey(item), unread = unread, sort = boosted(base, unread),
            kind = FeedKind.Chase, avatar = initials(item.customerName), tone = tone, icon = icon,
            lead = item.customerName, copy = copy, meta = meta,
        )
    }

    private fun stock(item: StockAlertItem, seen: Set<String>): FeedRow {
        val key = stockKey(item)
        val unread = key !in seen
        val name = if (item.variantLabel.isNotBlank()) "${item.productName} · ${item.variantLabel}" else item.productName
        val out = item.status == "out"
        return FeedRow(
            key = "stock-${item.id}", seenKey = key, unread = unread,
            sort = boosted(if (out) 950 else 450 - item.stock, unread),
            kind = FeedKind.Stock, avatar = initials(item.productName),
            tone = if (out) FeedTone.Danger else FeedTone.Warning, icon = FeedIcon.Package,
            lead = name,
            copy = if (out) {
                " is out of stock. Alert is ${plural(item.lowStockThreshold, "unit")}."
            } else {
                " is down to ${plural(item.stock, "unit")} (alert at ${item.lowStockThreshold})."
            },
            meta = if (out) "Out of stock" else "${item.stock} left · alert at ${item.lowStockThreshold}",
        )
    }

    private fun order(item: OrderAlertItem, seen: Set<String>, dates: ShopDates): FeedRow {
        val key = orderKey(item)
        val unread = key !in seen
        val kind = when (item.orderType) {
            "delivery" -> "delivery"
            "reservation" -> "reservation"
            else -> "pickup"
        }
        val goods = goods(item.items, kind)
        val (copy, meta, base) = when (item.status) {
            "overdue" -> Triple(
                " still has a $kind for $goods. It is ${plural(item.daysOverdue, "day")} late.",
                if (item.pickupDate != null) "${item.daysOverdue}d late · ${dates.date(item.pickupDate)}" else "${item.daysOverdue}d late",
                920 + item.daysOverdue,
            )
            "due" -> Triple(" has a $kind for $goods due today.", "Due today", 480)
            "tomorrow" -> Triple(" has a $kind for $goods tomorrow.", "Tomorrow", 380)
            else -> Triple(
                "'s $kind for $goods is still ${item.orderStatus} · ${plural(item.daysOpen, "day")}.",
                "${item.daysOpen}d open",
                350 + item.daysOpen,
            )
        }
        val tone = when (item.status) {
            "overdue" -> FeedTone.Danger
            "due", "stale" -> FeedTone.Warning
            else -> FeedTone.Info
        }
        return FeedRow(
            key = "order-${item.id}", seenKey = key, unread = unread, sort = boosted(base, unread),
            kind = FeedKind.Order, avatar = initials(item.customerName), tone = tone, icon = FeedIcon.Clipboard,
            lead = item.customerName, copy = copy, meta = meta,
        )
    }

    private fun laybye(item: LaybyeAlertItem, seen: Set<String>, dates: ShopDates): FeedRow {
        val key = laybyeKey(item)
        val unread = key !in seen
        val goods = goods(item.items, "a laybye")
        val owes = formatMoney(item.balanceDue)
        val (copy, base) = when (item.status) {
            "overdue" -> " still owes $owes on $goods. Payment is ${plural(item.daysOverdue, "day")} late." to 910 + item.daysOverdue
            "due" -> " owes $owes on $goods. Payment is due today." to 440
            "tomorrow" -> " owes $owes on $goods. Payment is due tomorrow." to 390
            else -> "'s laybye for $goods has had no payment in ${plural(item.daysQuiet, "day")} · $owes left." to 340 + item.daysQuiet
        }
        val meta = when {
            item.status == "overdue" && item.dueDate != null -> "${item.daysOverdue}d late · pay by ${dates.date(item.dueDate)}"
            item.status == "due" -> "Due today"
            item.status == "tomorrow" -> "Tomorrow"
            else -> "${item.daysQuiet}d quiet"
        }
        val tone = when (item.status) {
            "overdue" -> FeedTone.Danger
            "due", "quiet" -> FeedTone.Warning
            else -> FeedTone.Info
        }
        return FeedRow(
            key = "laybye-${item.id}", seenKey = key, unread = unread, sort = boosted(base, unread),
            kind = FeedKind.Laybye, avatar = initials(item.customerName), tone = tone, icon = FeedIcon.Calendar,
            lead = item.customerName, copy = copy, meta = meta,
        )
    }

    private fun reminder(item: ActivityItem, seen: Set<String>, dates: ShopDates): FeedRow {
        val key = alertKey(item)
        val unread = key !in seen
        return FeedRow(
            key = "alert-${item.id}", seenKey = key, unread = unread, sort = if (unread) 200 else 10,
            kind = FeedKind.Alert, avatar = null, tone = FeedTone.Muted, icon = FeedIcon.Bell,
            lead = "", copy = item.summary, meta = dates.dateTime(item.createdAt),
        )
    }
}
