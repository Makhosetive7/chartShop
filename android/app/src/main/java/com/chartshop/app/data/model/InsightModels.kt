package com.chartshop.app.data.model

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.json.doubleOrNull

@Serializable
data class ProductStatRow(
    val productId: String? = null,
    val productName: String = "",
    val quantity: Int = 0,
    val revenue: Double = 0.0,
    val stock: Int? = null,
)

@Serializable
data class CustomerStatRow(
    val customerId: String? = null,
    val name: String = "",
    val totalSpent: Double? = null,
    val totalVisits: Int? = null,
    val currentBalance: Double? = null,
)

@Serializable
data class SalesBucket(
    val type: String? = null,
    val hour: Int? = null,
    val day: Int? = null,
    val label: String? = null,
    val count: Int = 0,
    val revenue: Double = 0.0,
)

@Serializable
data class TodayByType(val cash: Double? = null, val credit: Double? = null)

@Serializable
data class PeriodSnapshot(val count: Int = 0, val revenue: Double = 0.0, val byType: TodayByType? = null)

@Serializable
data class AmountCount(val amount: Double = 0.0, val count: Int = 0)

@Serializable
data class Snapshots(
    val today: PeriodSnapshot = PeriodSnapshot(),
    val todayExpenses: Double = 0.0,
    val todayInventoryTransfers: Double? = null,
    val todayLeft: Double? = null,
    val todayOperatingResult: Double? = null,
    val cashAvailable: Double? = null,
    val laybyeDue: AmountCount? = null,
    val activeLaybyes: Int = 0,
    val openOrders: Int = 0,
)

@Serializable
data class Highlights(
    val mostPurchased: ProductStatRow? = null,
    val slowest: ProductStatRow? = null,
    val bestClient: CustomerStatRow? = null,
    val topDebtor: CustomerStatRow? = null,
    val peakHour: SalesBucket? = null,
)

@Serializable
data class ProductStats(
    val slowest: List<ProductStatRow> = emptyList(),
    val topByRevenue: List<ProductStatRow> = emptyList(),
)

@Serializable
data class CustomerTotals(val withBalance: Int = 0, val totalOutstanding: Double = 0.0)

@Serializable
data class CustomerStats(
    val bestClients: List<CustomerStatRow> = emptyList(),
    val debtors: List<CustomerStatRow> = emptyList(),
    val mostFrequent: List<CustomerStatRow> = emptyList(),
    val totals: CustomerTotals = CustomerTotals(),
)

@Serializable
data class SalesSummary(val revenue: Double = 0.0)

@Serializable
data class InventoryTotals(val outOfStock: Int = 0, val lowStock: Int = 0)

@Serializable
data class StatsOverview(
    val snapshots: Snapshots = Snapshots(),
    val highlights: Highlights = Highlights(),
    val products: ProductStats = ProductStats(),
    val customers: CustomerStats = CustomerStats(),
    val sales: SalesSummary = SalesSummary(),
    val inventory: InventoryTotals = InventoryTotals(),
)

@Serializable
data class SalesStats(
    val byType: List<SalesBucket> = emptyList(),
    val byHour: List<SalesBucket> = emptyList(),
    val byWeekday: List<SalesBucket> = emptyList(),
)

@Serializable
data class InventoryStats(
    val outOfStock: List<ProductStatRow> = emptyList(),
    val lowStock: List<ProductStatRow> = emptyList(),
)

@Serializable
data class FlowBucket(val amount: Double = 0.0, val count: Int = 0)

@Serializable
data class Inflows(
    val cashSales: FlowBucket = FlowBucket(),
    val debtPayments: FlowBucket = FlowBucket(),
    val laybyePayments: FlowBucket = FlowBucket(),
    val ownerCashIns: FlowBucket = FlowBucket(),
    val total: Double = 0.0,
)

@Serializable
data class Outflows(
    val expenses: FlowBucket = FlowBucket(),
    val inventoryTransfers: FlowBucket = FlowBucket(),
    val refunds: FlowBucket = FlowBucket(),
    val total: Double = 0.0,
)

@Serializable
data class CashFlow(val inflows: Inflows = Inflows(), val outflows: Outflows = Outflows(), val net: Double = 0.0)

@Serializable
data class RevenueSplit(
    val cash: FlowBucket = FlowBucket(),
    val credit: FlowBucket = FlowBucket(),
    val completedLaybyes: FlowBucket = FlowBucket(),
    val total: Double = 0.0,
)

@Serializable
data class Profitability(
    val expenses: Double? = null,
    val operatingResult: Double? = null,
    val netProfit: Double? = null,
    val profitMargin: Double = 0.0,
    val grossProfit: Double = 0.0,
    val grossMarginPct: Double? = null,
    val hasProductCosts: Boolean = false,
)

@Serializable
data class CreditOutstanding(val amount: Double = 0.0, val customers: Int = 0)

@Serializable
data class Outstanding(
    val creditDue: CreditOutstanding = CreditOutstanding(),
    val laybyeDue: AmountCount = AmountCount(),
    val total: Double = 0.0,
)

@Serializable
data class TransactionCounts(
    val totalSales: Int = 0,
    val expenses: Int = 0,
    val inventoryTransfers: Int = 0,
    val refunds: Int = 0,
)

/**
 * One shape for every report's `data` payload: cash-flow reports fill [cashFlow],
 * the profit report fills [profit] and its siblings.
 */
@Serializable
data class ReportData(
    val cashFlow: CashFlow? = null,
    /** An object on cash-flow reports, a plain number on the profit report. */
    val revenue: JsonElement? = null,
    val profitability: Profitability? = null,
    val outstanding: Outstanding? = null,
    val transactions: TransactionCounts? = null,
    val insights: List<String> = emptyList(),
    val cashAvailable: Double? = null,
    val profit: Double? = null,
    val expenses: Double? = null,
    val salesCount: Int = 0,
    val expensesCount: Int = 0,
    val startDate: String? = null,
    val endDate: String? = null,
) {
    val revenueSplit: RevenueSplit?
        get() = (revenue as? JsonObject)?.let { runCatching { lenient.decodeFromJsonElement<RevenueSplit>(it) }.getOrNull() }

    val revenueTotal: Double?
        get() = (revenue as? JsonPrimitive)?.doubleOrNull

    private companion object {
        val lenient = Json { ignoreUnknownKeys = true; coerceInputValues = true }
    }
}

@Serializable
data class MonthInfo(
    val label: String? = null,
    val year: Int? = null,
    val daysElapsed: Int? = null,
    val daysInMonth: Int? = null,
    val isCurrentMonth: Boolean = false,
)

@Serializable
data class BestSellerRow(val productName: String = "", val quantity: Int = 0, val revenue: Double = 0.0)

@Serializable
data class ReportResponse(
    val data: ReportData? = null,
    val monthInfo: MonthInfo? = null,
    val products: List<BestSellerRow>? = null,
    val totalQuantity: Int = 0,
    val totalRevenue: Double = 0.0,
)
