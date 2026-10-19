package com.chartshop.app.ui.books

import androidx.lifecycle.viewModelScope
import com.chartshop.app.data.api.ApiResult
import com.chartshop.app.data.model.NewOrderRequest
import com.chartshop.app.data.model.Order
import com.chartshop.app.data.model.OrderStatusRequest
import com.chartshop.app.data.model.Product
import com.chartshop.app.data.products.ProductRepository
import com.chartshop.app.data.shop.ShopRepository
import com.chartshop.app.domain.CatalogLine
import com.chartshop.app.domain.ProductCatalog
import com.chartshop.app.domain.ShopDates
import com.chartshop.app.ui.Remote
import com.chartshop.app.ui.ScreenViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

val ORDER_STATUSES = listOf("all", "pending", "completed", "cancelled")

val ORDER_TYPES = listOf("pickup" to "Pickup", "delivery" to "Delivery", "reservation" to "Reservation")

/** Which status changes each order status offers, as on the web. */
fun nextOrderActions(status: String): List<String> = when (status) {
    "pending", "confirmed", "ready" -> listOf("completed", "cancelled")
    else -> emptyList()
}

data class OrderForm(
    val customer: String = "",
    val orderType: String = "pickup",
    val notes: String = "",
    val line: CatalogLine = CatalogLine(),
    val placing: Boolean = false,
    val status: String = "all",
    /** `orderId:nextStatus` while that change is saving. */
    val statusBusy: String? = null,
    val cancel: Order? = null,
)

class OrdersViewModel(
    repository: ShopRepository,
    private val products: ProductRepository,
    val dates: ShopDates,
    canEdit: Boolean,
) : ScreenViewModel(repository, canEdit) {

    private val _form = MutableStateFlow(OrderForm())
    val form: StateFlow<OrderForm> = _form.asStateFlow()

    private val _orders = MutableStateFlow(Remote<List<Order>>())
    val orders: StateFlow<Remote<List<Order>>> = _orders.asStateFlow()

    private val _customers = MutableStateFlow<List<String>>(emptyList())
    val customerNames: StateFlow<List<String>> = _customers.asStateFlow()

    val catalog: StateFlow<List<Product>?> = products.products

    init {
        refresh()
        reloadOnChanges(::loadOrders)
    }

    fun refresh() {
        loadOrders()
        viewModelScope.launch {
            val result = repository.shop { customers("all").customers.map { it.name } }
            if (result is ApiResult.Success) _customers.value = result.value
        }
        viewModelScope.launch { products.refresh() }
    }

    private fun loadOrders() {
        val status = _form.value.status
        load(_orders) { shop { orders(status, 40).orders } }
    }

    fun onStatusTab(status: String) {
        if (status == _form.value.status) return
        _form.update { it.copy(status = status) }
        _orders.value = Remote()
        loadOrders()
    }

    fun onCustomerChange(value: String) = _form.update { it.copy(customer = value) }
    fun onTypeChange(value: String) = _form.update { it.copy(orderType = value) }
    fun onNotesChange(value: String) = _form.update { it.copy(notes = value) }
    fun onLineChange(line: CatalogLine) = _form.update { it.copy(line = line) }

    fun place() {
        val form = _form.value
        if (form.placing) return
        val item = ProductCatalog.toSaleItem(form.line) ?: return fail("Choose a product and quantity.")
        val customer = form.customer.trim()
        if (customer.isEmpty()) return fail("Customer is required.")
        write(
            busy = { busy -> _form.update { it.copy(placing = busy) } },
            block = {
                shopWrite {
                    createOrder(NewOrderRequest(customer, listOf(item), form.orderType, form.notes.ifBlank { null }))
                }
            },
        ) {
            success("Order placed.")
            _form.update { it.copy(line = CatalogLine(), notes = "") }
        }
    }

    fun onAction(order: Order, next: String) {
        if (next == "cancelled") {
            _form.update { it.copy(cancel = order) }
        } else {
            applyStatus(order, next)
        }
    }

    fun dismissCancel() {
        if (_form.value.statusBusy == null) _form.update { it.copy(cancel = null) }
    }

    fun confirmCancel() {
        val order = _form.value.cancel ?: return
        applyStatus(order, "cancelled")
    }

    private fun applyStatus(order: Order, next: String) {
        if (_form.value.statusBusy != null) return
        write(
            busy = { busy -> _form.update { it.copy(statusBusy = if (busy) "${order.id}:$next" else null) } },
            block = { shopWrite(touchesStock = next == "completed") { updateOrderStatus(order.id, OrderStatusRequest(next)) } },
        ) {
            success(if (next == "cancelled") "Order cancelled." else "Order → $next")
            _form.update { it.copy(cancel = null) }
        }
    }
}
