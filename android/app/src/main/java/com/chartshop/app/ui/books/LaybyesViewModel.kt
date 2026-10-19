package com.chartshop.app.ui.books

import androidx.lifecycle.viewModelScope
import com.chartshop.app.data.api.ApiResult
import com.chartshop.app.data.model.Laybye
import com.chartshop.app.data.model.LaybyeCompleteRequest
import com.chartshop.app.data.model.LaybyePayRequest
import com.chartshop.app.data.model.NewLaybyeRequest
import com.chartshop.app.data.model.Product
import com.chartshop.app.data.products.ProductRepository
import com.chartshop.app.data.shop.ShopRepository
import com.chartshop.app.domain.CatalogLine
import com.chartshop.app.domain.NumberInput
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

data class LaybyeForm(
    val customer: String = "",
    val deposit: String = "0",
    val lines: List<CatalogLine> = listOf(CatalogLine()),
    val creating: Boolean = false,
    val payCustomer: String = "",
    val payAmount: String = "",
    val paying: Boolean = false,
    val completingId: String? = null,
)

class LaybyesViewModel(
    repository: ShopRepository,
    private val products: ProductRepository,
    val dates: ShopDates,
    canEdit: Boolean,
) : ScreenViewModel(repository, canEdit) {

    private val _form = MutableStateFlow(LaybyeForm())
    val form: StateFlow<LaybyeForm> = _form.asStateFlow()

    private val _active = MutableStateFlow(Remote<List<Laybye>>())
    val active: StateFlow<Remote<List<Laybye>>> = _active.asStateFlow()

    private val _customers = MutableStateFlow<List<String>>(emptyList())
    val customerNames: StateFlow<List<String>> = _customers.asStateFlow()

    val catalog: StateFlow<List<Product>?> = products.products

    init {
        refresh()
        reloadOnChanges(::loadLists)
    }

    fun refresh() {
        loadLists()
        viewModelScope.launch { products.refresh() }
    }

    private fun loadLists() {
        load(_active) { shop { laybyes("active").laybyes } }
        viewModelScope.launch {
            val result = repository.shop { customers("all").customers.map { it.name } }
            if (result is ApiResult.Success) _customers.value = result.value
        }
    }

    fun onCustomerChange(value: String) = _form.update { it.copy(customer = value) }
    fun onDepositChange(value: String) = _form.update { it.copy(deposit = NumberInput.sanitizeMoney(value)) }
    fun onPayCustomerChange(value: String) = _form.update { it.copy(payCustomer = value) }
    fun onPayAmountChange(value: String) = _form.update { it.copy(payAmount = NumberInput.sanitizeMoney(value)) }

    fun onLineChange(index: Int, line: CatalogLine) =
        _form.update { it.copy(lines = it.lines.toMutableList().also { list -> list[index] = line }) }

    fun addLine() = _form.update { it.copy(lines = it.lines + CatalogLine()) }

    fun removeLine(index: Int) =
        _form.update { it.copy(lines = it.lines.filterIndexed { i, _ -> i != index }.ifEmpty { listOf(CatalogLine()) }) }

    fun create() {
        val form = _form.value
        if (form.creating) return
        val customer = form.customer.trim()
        val items = form.lines.mapNotNull(ProductCatalog::toSaleItem)
        if (customer.isEmpty()) return fail("Customer is required.")
        if (items.isEmpty()) return fail("Add at least one item.")
        val deposit = NumberInput.parseMoney(form.deposit) ?: 0.0
        write(
            busy = { busy -> _form.update { it.copy(creating = busy) } },
            block = { shopWrite(touchesStock = true) { createLaybye(NewLaybyeRequest(customer, items, deposit)) } },
        ) { result ->
            val total = result.laybye?.let { " · ${formatMoney(it.totalAmount)}" }.orEmpty()
            success(if (result.completed) "Laybye completed$total." else "Laybye created.")
            _form.update { it.copy(customer = "", deposit = "0", lines = listOf(CatalogLine())) }
        }
    }

    /** "Pay" on a row fills the Record payment card with that customer's balance. */
    fun prefillPayment(laybye: Laybye) =
        _form.update { it.copy(payCustomer = laybye.customerName, payAmount = NumberInput.moneyField(laybye.balanceDue)) }

    fun pay() {
        val form = _form.value
        if (form.paying) return
        val customer = form.payCustomer.trim()
        val amount = NumberInput.parseMoney(form.payAmount)
        if (customer.isEmpty()) return fail("Customer is required.")
        if (amount == null || amount <= 0) return fail("Enter a payment amount.")
        write(
            busy = { busy -> _form.update { it.copy(paying = busy) } },
            block = { shopWrite(touchesStock = true) { payLaybye(LaybyePayRequest(customer, amount)) } },
        ) { result ->
            success(if (result.completed) "Laybye completed." else "Laybye payment recorded.")
            _form.update { it.copy(payCustomer = "", payAmount = "") }
        }
    }

    fun complete(laybye: Laybye) {
        if (_form.value.completingId != null) return
        write(
            busy = { busy -> _form.update { it.copy(completingId = if (busy) laybye.id else null) } },
            block = { shopWrite(touchesStock = true) { completeLaybye(LaybyeCompleteRequest(laybye.customerName)) } },
        ) {
            success("Laybye completed for ${laybye.customerName}.")
        }
    }
}
