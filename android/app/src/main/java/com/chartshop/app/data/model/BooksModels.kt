package com.chartshop.app.data.model

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

@Serializable
data class Customer(
    val id: String,
    val name: String = "",
    val phone: String = "",
    val email: String = "",
    val currentBalance: Double = 0.0,
    val totalSpent: Double = 0.0,
    val totalVisits: Int = 0,
    val lastPurchaseDate: String? = null,
    val isActive: Boolean = true,
)

@Serializable
data class CustomerListResponse(val customers: List<Customer> = emptyList())

@Serializable
data class NewCustomerRequest(val name: String, val phone: String, val email: String? = null)

@Serializable
data class CustomerResponse(val customer: Customer? = null)

@Serializable
data class Order(
    val id: String,
    val shortId: String? = null,
    val customerName: String = "",
    val items: List<SaleLine> = emptyList(),
    val total: Double = 0.0,
    val orderType: String = "",
    val status: String = "",
    val notes: String? = null,
    val orderDate: String? = null,
)

@Serializable
data class OrderListResponse(val orders: List<Order> = emptyList())

@Serializable
data class NewOrderRequest(
    val customer: String,
    val items: List<SaleItemInput>,
    val orderType: String,
    val notes: String? = null,
)

@Serializable
data class OrderStatusRequest(val status: String, val notes: String? = null)

@Serializable
data class OrderResponse(val order: Order? = null)

@Serializable
data class OrderAlertItem(
    val id: String,
    val customerName: String = "",
    val orderType: String = "",
    val orderStatus: String = "",
    val pickupDate: String? = null,
    val status: String = "",
    val daysOverdue: Int = 0,
    val daysOpen: Int = 0,
    val items: List<SaleLine> = emptyList(),
)

@Serializable
data class OrderAlertsResponse(val items: List<OrderAlertItem> = emptyList())

@Serializable
data class Expense(
    val id: String,
    val amount: Double = 0.0,
    val description: String = "",
    val category: String = "",
    val kind: String = EXPENSE_OPERATING,
    val paymentMethod: String = "",
    val date: String? = null,
)

const val EXPENSE_OPERATING = "operating_expense"
const val EXPENSE_RESTOCK = "inventory_fund_transfer"

@Serializable
data class ExpenseListResponse(
    val expenses: List<Expense> = emptyList(),
    val total: Double = 0.0,
    val operatingTotal: Double = 0.0,
    val inventoryTransferTotal: Double = 0.0,
)

/** `breakdown` is `[[category, { total, count, expenses }], …]`, sorted by total. */
@Serializable
data class ExpenseBreakdownResponse(
    val total: Double = 0.0,
    val breakdown: JsonElement? = null,
)

@Serializable
data class CashAvailableResponse(val cashAvailable: Double = 0.0)

@Serializable
data class NewExpenseRequest(
    val amount: Double,
    val description: String,
    val category: String,
    val kind: String,
    val paymentMethod: String,
    val allowOverspend: Boolean? = null,
)

@Serializable
data class ExpenseResponse(val ownerCashIn: Double = 0.0, val cashAvailable: Double? = null)

@Serializable
data class StockAlertItem(
    val id: String,
    val productName: String = "",
    val variantLabel: String = "",
    val stock: Int = 0,
    val lowStockThreshold: Int = 0,
    val status: String = "",
)

@Serializable
data class StockAlertsResponse(val items: List<StockAlertItem> = emptyList())
