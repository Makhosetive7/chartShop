package com.chartshop.app.ui.home

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.TrendingUp
import androidx.compose.material.icons.outlined.AccountBalanceWallet
import androidx.compose.material.icons.outlined.Inventory2
import androidx.compose.material.icons.outlined.Payments
import androidx.compose.material.icons.outlined.ShoppingCart
import androidx.compose.material.icons.outlined.WarningAmber
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chartshop.app.data.model.InventoryStats
import com.chartshop.app.data.model.SalesStats
import com.chartshop.app.data.model.StatsOverview
import com.chartshop.app.domain.formatMoney
import com.chartshop.app.ui.components.Banner
import com.chartshop.app.ui.components.BannerTone
import com.chartshop.app.ui.components.BarChart
import com.chartshop.app.ui.components.Card
import com.chartshop.app.ui.components.ChartPalette
import com.chartshop.app.ui.components.ChartPoint
import com.chartshop.app.ui.components.CompactTable
import com.chartshop.app.ui.components.DonutChart
import com.chartshop.app.ui.components.HorizontalBars
import com.chartshop.app.ui.components.PageLead
import com.chartshop.app.ui.components.PeriodTabs
import com.chartshop.app.ui.components.ScreenPage
import com.chartshop.app.ui.components.SkeletonBar
import com.chartshop.app.ui.components.SlowServerHint
import com.chartshop.app.ui.theme.ChartShopColors
import kotlin.math.roundToInt

private enum class HintTone { Muted, Warning, Ok }

private data class Kpi(val label: String, val value: String, val hint: String, val tone: HintTone, val icon: ImageVector)

@Composable
fun HomeScreen(viewModel: HomeViewModel, onOpenNotifications: () -> Unit) {
    val days by viewModel.days.collectAsStateWithLifecycle()
    val overview by viewModel.overview.collectAsStateWithLifecycle()
    val sales by viewModel.sales.collectAsStateWithLifecycle()
    val inventory by viewModel.inventory.collectAsStateWithLifecycle()
    val toast by viewModel.toast.collectAsStateWithLifecycle()

    ScreenPage(
        toast = toast,
        onDismissToast = viewModel::dismissToast,
        refreshing = overview.loading && overview.data != null,
        onRefresh = viewModel::refresh,
    ) {
        PageLead("Till cash, today’s pulse, who owes you, and stock to fix — live from the same numbers as chat.")
        PeriodTabs(
            labels = DASHBOARD_DAYS.map { "${it}d" },
            selectedIndex = DASHBOARD_DAYS.indexOf(days),
            onSelect = { viewModel.onDaysChange(DASHBOARD_DAYS[it]) },
        )
        if (overview.error != null || sales.error != null || inventory.error != null) {
            Banner("Could not load dashboard stats. Pull down to try again.", BannerTone.Error)
        }
        val data = overview.data
        if (data == null) {
            if (overview.error == null) {
                DashboardSkeleton()
                SlowServerHint(overview.slow)
            }
        } else {
            KpiGrid(data)
            Highlights(data)
            ChartPanels(data, sales.data, days)
            Panels(data, inventory.data, days, onOpenNotifications)
        }
    }
}

@Composable
private fun KpiGrid(overview: StatsOverview) {
    val snap = overview.snapshots
    val todayCash = snap.today.byType?.cash ?: 0.0
    val todayCredit = snap.today.byType?.credit ?: 0.0
    val todayLeft = snap.todayOperatingResult ?: snap.todayLeft ?: (snap.today.revenue - snap.todayExpenses)
    val owed = overview.customers.totals.totalOutstanding
    val debtors = overview.customers.totals.withBalance
    val topDebtor = overview.highlights.topDebtor
    val laybyeAmount = snap.laybyeDue?.amount ?: 0.0
    val laybyeCount = snap.laybyeDue?.count ?: snap.activeLaybyes
    val low = overview.inventory.lowStock
    val out = overview.inventory.outOfStock
    val stockAlerts = low + out

    val salesHint = buildList {
        add("${snap.today.count} sale${if (snap.today.count == 1) "" else "s"}")
        if (todayCash > 0 || todayCredit > 0) add("${formatMoney(todayCash)} cash · ${formatMoney(todayCredit)} credit")
    }.joinToString(" · ")
    val restock = snap.todayInventoryTransfers ?: 0.0
    val restockNote = if (restock > 0) " · Restock cash-out ${formatMoney(restock)}" else ""

    val cards = listOf(
        Kpi("Cash in till", formatMoney(snap.cashAvailable ?: 0.0), "Cash sales + payments − cash expenses only", HintTone.Muted, Icons.Outlined.Payments),
        Kpi("Today's sales", formatMoney(snap.today.revenue), salesHint, HintTone.Muted, Icons.Outlined.ShoppingCart),
        Kpi(
            "Today's expenses",
            formatMoney(snap.todayExpenses),
            "Operating result: ${if (todayLeft >= 0) "+" else ""}${formatMoney(todayLeft)}$restockNote",
            if (todayLeft >= 0) HintTone.Ok else HintTone.Warning,
            Icons.Outlined.AccountBalanceWallet,
        ),
        Kpi(
            "Owed to you",
            formatMoney(owed),
            when {
                topDebtor != null -> "${topDebtor.name} owes ${formatMoney(topDebtor.currentBalance ?: 0.0)}"
                debtors > 0 -> "$debtors customer${if (debtors == 1) "" else "s"} on credit"
                else -> "No credit balances"
            },
            if (owed > 0) HintTone.Warning else HintTone.Muted,
            Icons.AutoMirrored.Outlined.TrendingUp,
        ),
        Kpi(
            "Laybye due",
            formatMoney(laybyeAmount),
            if (laybyeCount > 0) "$laybyeCount active agreement${if (laybyeCount == 1) "" else "s"}" else "No active laybyes",
            if (laybyeAmount > 0) HintTone.Warning else HintTone.Muted,
            Icons.Outlined.Inventory2,
        ),
        Kpi(
            "Stock alerts",
            stockAlerts.toString(),
            if (stockAlerts > 0) "$low low · $out out" else "Stock looks fine",
            if (stockAlerts > 0) HintTone.Warning else HintTone.Ok,
            Icons.Outlined.WarningAmber,
        ),
    )
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        cards.chunked(2).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                row.forEach { KpiTile(it, Modifier.weight(1f)) }
            }
        }
    }
}

@Composable
private fun KpiTile(kpi: Kpi, modifier: Modifier) {
    Column(
        modifier
            .background(ChartShopColors.Surface)
            .border(1.dp, ChartShopColors.Border)
            .padding(14.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Icon(kpi.icon, contentDescription = null, tint = ChartShopColors.Primary, modifier = Modifier.size(15.dp))
            Text(kpi.label, color = ChartShopColors.TextSecondary, fontSize = 13.sp, fontWeight = FontWeight.Medium, maxLines = 1)
        }
        Text(
            kpi.value,
            modifier = Modifier.padding(top = 8.dp),
            color = ChartShopColors.Maroon,
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = (-0.03).em,
        )
        Text(
            kpi.hint,
            modifier = Modifier.padding(top = 4.dp),
            color = when (kpi.tone) {
                HintTone.Warning -> ChartShopColors.Warning
                HintTone.Ok -> ChartShopColors.Success
                HintTone.Muted -> ChartShopColors.TextMuted
            },
            fontSize = 12.sp,
            lineHeight = 16.sp,
        )
    }
}

@Composable
private fun Highlights(overview: StatsOverview) {
    val h = overview.highlights
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        HighlightTile(
            "Top product",
            h.mostPurchased?.productName ?: "—",
            h.mostPurchased?.let { "${it.quantity} units · ${formatMoney(it.revenue)}" } ?: "No sales yet",
        )
        HighlightTile(
            "Best client",
            h.bestClient?.name ?: "—",
            h.bestClient?.let { formatMoney(it.totalSpent ?: 0.0) } ?: "No customer sales yet",
        )
        HighlightTile(
            "Watch list",
            h.topDebtor?.name ?: h.slowest?.productName ?: "All clear",
            when {
                h.topDebtor != null -> "Owes ${formatMoney(h.topDebtor.currentBalance ?: 0.0)}"
                h.slowest != null -> "Slow mover · ${h.slowest.quantity} sold"
                else -> "${overview.snapshots.openOrders} open orders"
            },
        )
    }
}

@Composable
private fun HighlightTile(label: String, value: String, note: String) {
    Column(
        Modifier
            .fillMaxWidth()
            .background(Brush.linearGradient(listOf(ChartShopColors.PeachSoft, ChartShopColors.PrimaryTint)))
            .border(1.dp, ChartShopColors.Border)
            .padding(16.dp),
    ) {
        Text(label, color = ChartShopColors.Maroon, fontSize = 12.5.sp, fontWeight = FontWeight.SemiBold)
        Text(
            value,
            modifier = Modifier.padding(top = 6.dp),
            color = ChartShopColors.Maroon,
            fontSize = 16.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = (-0.02).em,
        )
        Text(note, modifier = Modifier.padding(top = 4.dp), color = ChartShopColors.TextSecondary, fontSize = 13.sp)
    }
}

@Composable
private fun Panel(title: String, lead: String?, leadAction: Pair<String, () -> Unit>? = null, content: @Composable ColumnScope.() -> Unit) {
    Card {
        Text(title, color = ChartShopColors.Maroon, fontSize = 17.sp, fontWeight = FontWeight.SemiBold)
        if (lead != null) {
            Row(Modifier.padding(top = 4.dp, bottom = 16.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(lead, color = ChartShopColors.TextSecondary, fontSize = 13.5.sp)
                if (leadAction != null) {
                    Text(" · ", color = ChartShopColors.TextSecondary, fontSize = 13.5.sp)
                    Text(
                        leadAction.first,
                        modifier = Modifier.clickable(onClick = leadAction.second),
                        color = ChartShopColors.Maroon,
                        fontSize = 13.5.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }
        }
        content()
    }
}

@Composable
private fun EmptyNote(text: String) {
    Text(text, modifier = Modifier.padding(top = 4.dp), color = ChartShopColors.TextMuted, fontSize = 14.sp)
}

private fun round2(value: Double) = (value * 100).roundToInt() / 100.0

@Composable
private fun ChartPanels(overview: StatsOverview, sales: SalesStats?, days: Int) {
    val weekday = sales?.byWeekday.orEmpty().map { ChartPoint(it.label ?: it.day.toString(), round2(it.revenue)) }
    val hours = sales?.byHour.orEmpty().let { if (it.size > 7) it.subList(7, minOf(22, it.size)) else emptyList() }
        .map { ChartPoint(hourLabel(it.hour ?: 0), round2(it.revenue)) }
    val mix = sales?.byType.orEmpty().mapIndexed { index, bucket ->
        ChartPoint(
            (bucket.type ?: "other").replaceFirstChar(Char::uppercase),
            bucket.revenue,
            ChartPalette[index % ChartPalette.size],
        )
    }
    Panel("Revenue by weekday", "Last $days days · shop timezone") {
        BarChart(weekday, ::formatMoney)
    }
    Panel("Sales mix", "Cash, credit, laybye and more") {
        DonutChart(mix, centerValue = formatMoney(overview.sales.revenue), centerLabel = "revenue")
    }
    val peak = overview.highlights.peakHour
    Panel(
        "Busy hours",
        if (peak != null) "Peak around ${hourLabel(peak.hour ?: 0)} (${peak.count} sales)" else "Hourly revenue · last $days days",
    ) {
        BarChart(hours, ::formatMoney, height = 200.dp)
    }
}

@Composable
private fun Panels(overview: StatsOverview, inventory: InventoryStats?, days: Int, onOpenNotifications: () -> Unit) {
    val top = overview.products.topByRevenue
    Panel("Product performance", "Top sellers by revenue") {
        if (top.isEmpty()) {
            EmptyNote("No product sales in this period.")
        } else {
            HorizontalBars(top.take(6).map { ChartPoint(it.productName, it.revenue) }, ::formatMoney)
            Spacer(Modifier.height(18.dp))
            CompactTable(listOf("Product", "Qty", "Revenue"), top.map { listOf(it.productName, it.quantity.toString(), formatMoney(it.revenue)) })
        }
    }

    val best = overview.customers.bestClients
    Panel("Best clients", "Highest lifetime spend") {
        if (best.isEmpty()) {
            EmptyNote("No customer history yet.")
        } else {
            HorizontalBars(best.take(6).map { ChartPoint(it.name, it.totalSpent ?: 0.0) }, ::formatMoney, color = Color(0xFF8B1E3A))
            Spacer(Modifier.height(18.dp))
            CompactTable(
                listOf("Client", "Visits", "Spent"),
                best.map { listOf(it.name, it.totalVisits?.toString() ?: "—", formatMoney(it.totalSpent ?: 0.0)) },
            )
        }
    }

    val frequent = overview.customers.mostFrequent
    Panel("Most frequent shoppers", "By visit count") {
        if (frequent.isEmpty()) {
            EmptyNote("No frequent shoppers yet.")
        } else {
            CompactTable(
                listOf("Client", "Visits", "Spent"),
                frequent.map { listOf(it.name, (it.totalVisits ?: 0).toString(), formatMoney(it.totalSpent ?: 0.0)) },
            )
        }
    }

    Panel("Balances & stock alerts", "Debtors and inventory warnings", leadAction = "Notifications" to onOpenNotifications) {
        val debtors = overview.customers.debtors
        if (debtors.isEmpty()) {
            EmptyNote("No outstanding balances.")
        } else {
            CompactTable(listOf("Debtor", "Balance"), debtors.map { listOf(it.name, formatMoney(it.currentBalance ?: 0.0)) })
        }
        val stock = (inventory?.outOfStock.orEmpty().map { it.copy(stock = 0) } + inventory?.lowStock.orEmpty()).take(8)
        Spacer(Modifier.height(16.dp))
        if (stock.isEmpty()) {
            EmptyNote("Stock levels look healthy.")
        } else {
            CompactTable(listOf("Stock alert", "Qty"), stock.map { listOf(it.productName, (it.stock ?: 0).toString()) })
        }
    }

    val slowest = overview.products.slowest
    if (slowest.isNotEmpty()) {
        Panel("Slow movers", "Lowest units sold in the last $days days") {
            CompactTable(
                listOf("Product", "Qty", "Revenue"),
                slowest.map { listOf(it.productName, it.quantity.toString(), formatMoney(it.revenue)) },
            )
        }
    }
}

@Composable
private fun DashboardSkeleton() {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        repeat(3) {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                repeat(2) {
                    Box(
                        Modifier
                            .weight(1f)
                            .height(96.dp)
                            .border(1.dp, ChartShopColors.Border)
                            .background(ChartShopColors.Surface)
                            .padding(14.dp),
                    ) {
                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            SkeletonBar(90.dp, 12.dp)
                            SkeletonBar(70.dp, 20.dp)
                            SkeletonBar(110.dp, 10.dp)
                        }
                    }
                }
            }
        }
        repeat(2) { SkeletonBar(320.dp, 72.dp, Modifier.fillMaxWidth()) }
    }
}
