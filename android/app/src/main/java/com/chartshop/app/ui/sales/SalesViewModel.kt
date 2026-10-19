package com.chartshop.app.ui.sales

import androidx.lifecycle.viewModelScope
import com.chartshop.app.data.api.ApiResult
import com.chartshop.app.data.model.CancelRequest
import com.chartshop.app.data.model.CashSaleRequest
import com.chartshop.app.data.model.CreditSaleRequest
import com.chartshop.app.data.model.CustomerSaleRequest
import com.chartshop.app.data.model.Product
import com.chartshop.app.data.model.RefundsResponse
import com.chartshop.app.data.model.Sale
import com.chartshop.app.data.model.SaleResponse
import com.chartshop.app.data.products.ProductRepository
import com.chartshop.app.data.shop.ShopRepository
import com.chartshop.app.domain.CatalogLine
import com.chartshop.app.domain.ProductCatalog
import com.chartshop.app.domain.ShopDates
import com.chartshop.app.domain.formatMoney
import com.chartshop.app.ui.Remote
import com.chartshop.app.ui.ScreenViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class SaleMode(val label: String) { Cash("Cash"), Credit("Credit"), Customer("Sell to customer") }

sealed interface CancelTarget {
    data object Last : CancelTarget
    data class One(val id: String, val label: String) : CancelTarget
}

data class SalesForm(
    val mode: SaleMode = SaleMode.Cash,
    val lines: List<CatalogLine> = listOf(CatalogLine()),
    val customer: String = "",
    val dueDate: String = "",
    val selling: Boolean = false,
    val refundDays: Int = 30,
    val cancel: CancelTarget? = null,
    val cancelling: Boolean = false,
)

val REFUND_PERIODS = listOf(7, 30, 90)

private const val CANCEL_REASON = "Cancelled from Android"

class SalesViewModel(
    repository: ShopRepository,
    private val products: ProductRepository,
    val dates: ShopDates,
    canEdit: Boolean,
) : ScreenViewModel(repository, canEdit) {

    private val _form = MutableStateFlow(SalesForm(dueDate = dates.isoDayFromToday(7)))
    val form: StateFlow<SalesForm> = _form.asStateFlow()

    private val _recent = MutableStateFlow(Remote<List<Sale>>())
    val recent: StateFlow<Remote<List<Sale>>> = _recent.asStateFlow()

    private val _refunds = MutableStateFlow(Remote<RefundsResponse>())
    val refunds: StateFlow<Remote<RefundsResponse>> = _refunds.asStateFlow()

    private val _customers = MutableStateFlow<List<String>>(emptyList())
    val customerNames: StateFlow<List<String>> = _customers.asStateFlow()

    val catalog: StateFlow<List<Product>?> = products.products

    init {
        refresh()
        reloadOnChanges { loadLists() }
    }

    fun refresh() {
        loadLists()
        viewModelScope.launch { products.refresh() }
    }

    private fun loadLists() {
        load(_recent) { shop { recentSales(15).sales } }
        loadRefunds()
        viewModelScope.launch {
            val result = repository.shop { customers("all").customers.map { it.name } }
            if (result is ApiResult.Success) _customers.value = result.value
        }
    }

    private fun loadRefunds() {
        val days = _form.value.refundDays
        load(_refunds) { shop { refunds(days) } }
    }

    fun onModeChange(mode: SaleMode) = _form.update { it.copy(mode = mode) }

    fun onCustomerChange(value: String) = _form.update { it.copy(customer = value) }

    fun onDueDateChange(value: String) = _form.update { it.copy(dueDate = value) }

    fun onLineChange(index: Int, line: CatalogLine) =
        _form.update { it.copy(lines = it.lines.toMutableList().also { list -> list[index] = line }) }

    fun addLine() = _form.update { it.copy(lines = it.lines + CatalogLine()) }

    fun removeLine(index: Int) =
        _form.update { it.copy(lines = it.lines.filterIndexed { i, _ -> i != index }.ifEmpty { listOf(CatalogLine()) }) }

    fun onRefundDaysChange(days: Int) {
        if (days == _form.value.refundDays) return
        _form.update { it.copy(refundDays = days) }
        _refunds.update { Remote() }
        loadRefunds()
    }

    fun completeSale() {
        val form = _form.value
        if (form.selling) return
        val items = form.lines.mapNotNull(ProductCatalog::toSaleItem)
        val customer = form.customer.trim()
        when {
            items.isEmpty() -> return fail("Add at least one item.")
            form.mode != SaleMode.Cash && customer.isEmpty() -> return fail("Customer is required.")
            form.mode == SaleMode.Credit && form.dueDate.isEmpty() -> return fail("Payment date is required.")
        }
        write(
            busy = { busy -> _form.update { it.copy(selling = busy) } },
            block = {
                shopWrite(touchesStock = true) {
                    when (form.mode) {
                        SaleMode.Cash -> cashSale(CashSaleRequest(items))
                        SaleMode.Credit -> creditSale(CreditSaleRequest(customer, items, form.dueDate))
                        SaleMode.Customer -> customerSale(CustomerSaleRequest(customer, items))
                    }
                }
            },
        ) { response ->
            success(soldMessage(response))
            _form.update { it.copy(lines = listOf(CatalogLine()), dueDate = dates.isoDayFromToday(7)) }
        }
    }

    fun askCancelLast() = _form.update { it.copy(cancel = CancelTarget.Last) }

    fun askCancel(sale: Sale) {
        val label = buildString {
            append("${ProductCatalog.itemsSummary(sale.items)} · ${sale.type} · ${formatMoney(sale.total)}")
            if (!sale.customerName.isNullOrBlank()) append(" · ${sale.customerName}")
        }
        _form.update { it.copy(cancel = CancelTarget.One(sale.id, label)) }
    }

    fun dismissCancel() {
        if (!_form.value.cancelling) _form.update { it.copy(cancel = null) }
    }

    fun confirmCancel() {
        val target = _form.value.cancel ?: return
        write(
            busy = { busy -> _form.update { it.copy(cancelling = busy) } },
            block = {
                shopWrite(touchesStock = true) {
                    when (target) {
                        CancelTarget.Last -> cancelLastSale(CancelRequest(CANCEL_REASON))
                        is CancelTarget.One -> cancelSale(target.id, CancelRequest(CANCEL_REASON))
                    }
                }
            },
        ) {
            success("Sale cancelled.")
            _form.update { it.copy(cancel = null) }
        }
    }

    private fun soldMessage(response: SaleResponse): String {
        val sale = response.sale
        val total = sale?.let { " · ${formatMoney(it.total)}" }.orEmpty()
        val names = ProductCatalog.itemsSummary(sale?.items.orEmpty())
        return if (names != "—") "Sold $names$total." else "Sale recorded$total."
    }
}
