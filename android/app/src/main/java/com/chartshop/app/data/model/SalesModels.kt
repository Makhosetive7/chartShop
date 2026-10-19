package com.chartshop.app.data.model

import kotlinx.serialization.Serializable

/** One line of a sale, laybye, order, or ledger credit, as sent to the server. */
@Serializable
data class SaleItemInput(
    val productId: String? = null,
    val name: String? = null,
    val variantId: String? = null,
    val packId: String? = null,
    val quantity: Int,
    val price: Double? = null,
)

/** A line as the server stored it; the names are snapshots taken at sale time. */
@Serializable
data class SaleLine(
    val productName: String? = null,
    val variantLabel: String? = null,
    val packLabel: String? = null,
    val quantity: Int? = null,
    val price: Double? = null,
    val total: Double? = null,
)

@Serializable
data class Sale(
    val id: String = "",
    val type: String = "",
    val total: Double = 0.0,
    val status: String = "",
    val isCancelled: Boolean = false,
    val customerId: String? = null,
    val customerName: String? = null,
    val items: List<SaleLine> = emptyList(),
    val date: String? = null,
    val dueDate: String? = null,
    val cancelledAt: String? = null,
    val cancellationReason: String? = null,
)

@Serializable
data class CashSaleRequest(val items: List<SaleItemInput>)

@Serializable
data class CreditSaleRequest(val customer: String, val items: List<SaleItemInput>, val dueDate: String)

@Serializable
data class CustomerSaleRequest(val customer: String, val items: List<SaleItemInput>)

@Serializable
data class SaleResponse(val sale: Sale? = null, val customerBalance: Double? = null)

@Serializable
data class SalesListResponse(val sales: List<Sale> = emptyList())

@Serializable
data class CancelRequest(val reason: String? = null)

@Serializable
data class CancelResponse(val message: String? = null, val sale: Sale? = null)

@Serializable
data class RefundsResponse(
    val days: Int? = null,
    val totalRefundAmount: Double = 0.0,
    val sales: List<Sale> = emptyList(),
)

@Serializable
data class Laybye(
    val id: String,
    val customerId: String? = null,
    val customerName: String = "",
    val customerPhone: String? = null,
    val totalAmount: Double = 0.0,
    val amountPaid: Double = 0.0,
    val balanceDue: Double = 0.0,
    val status: String = "",
    val dueDate: String? = null,
)

@Serializable
data class LaybyeListResponse(val laybyes: List<Laybye> = emptyList())

@Serializable
data class NewLaybyeRequest(val customer: String, val items: List<SaleItemInput>, val deposit: Double = 0.0)

@Serializable
data class LaybyePayRequest(val customer: String, val amount: Double)

@Serializable
data class LaybyeCompleteRequest(val customer: String)

@Serializable
data class LaybyeResponse(val completed: Boolean = false, val laybye: Laybye? = null)

@Serializable
data class CreditDueItem(
    val id: String,
    val customerId: String = "",
    val customerName: String = "",
    val customerBalance: Double = 0.0,
    val total: Double = 0.0,
    val dueDate: String? = null,
    val status: String = "",
    val daysOverdue: Int = 0,
    val daysUntilDue: Int = 0,
    val items: List<SaleLine> = emptyList(),
)

@Serializable
data class CreditDueResponse(val items: List<CreditDueItem> = emptyList())

@Serializable
data class LaybyeAlertItem(
    val id: String,
    val customerName: String = "",
    val balanceDue: Double = 0.0,
    val dueDate: String? = null,
    val status: String = "",
    val daysOverdue: Int = 0,
    val daysUntilDue: Int = 0,
    val daysQuiet: Int = 0,
    val items: List<SaleLine> = emptyList(),
)

@Serializable
data class LaybyeAlertsResponse(val items: List<LaybyeAlertItem> = emptyList())
