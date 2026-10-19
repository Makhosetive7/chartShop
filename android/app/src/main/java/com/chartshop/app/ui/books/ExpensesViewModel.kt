package com.chartshop.app.ui.books

import androidx.lifecycle.viewModelScope
import com.chartshop.app.data.api.ApiError
import com.chartshop.app.data.api.ApiResult
import com.chartshop.app.data.model.EXPENSE_OPERATING
import com.chartshop.app.data.model.EXPENSE_RESTOCK
import com.chartshop.app.data.model.ExpenseListResponse
import com.chartshop.app.data.model.NewExpenseRequest
import com.chartshop.app.data.shop.ShopRepository
import com.chartshop.app.domain.NumberInput
import com.chartshop.app.domain.ShopDates
import com.chartshop.app.domain.formatMoney
import com.chartshop.app.ui.Remote
import com.chartshop.app.ui.ScreenViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonPrimitive

val EXPENSE_PERIODS = listOf("daily", "weekly", "monthly")

val EXPENSE_CATEGORY_LABELS = linkedMapOf(
    "purchases" to "Purchases",
    "restocking" to "Restocking",
    "rent" to "Rent",
    "utilities" to "Utilities",
    "transport" to "Transport",
    "marketing" to "Marketing",
    "packaging" to "Packaging",
    "market_fees" to "Market fees",
    "other" to "Other",
)

val PAYMENT_METHODS = listOf("cash", "bank", "mobile", "other")

private const val RESTOCK_DESCRIPTION = "Stock restock"

data class BreakdownRow(val category: String, val count: Int, val total: Double)

data class ExpenseForm(
    val amount: String = "",
    val description: String = "",
    val kind: String = EXPENSE_OPERATING,
    val category: String = "other",
    val paymentMethod: String = "cash",
    val saving: Boolean = false,
    val period: String = "daily",
    val overspend: ApiError.CashShortfall? = null,
) {
    val restock: Boolean get() = kind == EXPENSE_RESTOCK
}

class ExpensesViewModel(
    repository: ShopRepository,
    val dates: ShopDates,
    val isAdmin: Boolean,
    canEdit: Boolean,
) : ScreenViewModel(repository, canEdit) {

    private val _form = MutableStateFlow(ExpenseForm())
    val form: StateFlow<ExpenseForm> = _form.asStateFlow()

    private val _list = MutableStateFlow(Remote<ExpenseListResponse>())
    val list: StateFlow<Remote<ExpenseListResponse>> = _list.asStateFlow()

    private val _breakdown = MutableStateFlow(Remote<List<BreakdownRow>>())
    val breakdown: StateFlow<Remote<List<BreakdownRow>>> = _breakdown.asStateFlow()

    private val _cash = MutableStateFlow<Double?>(null)
    val cashAvailable: StateFlow<Double?> = _cash.asStateFlow()

    init {
        refresh()
        reloadOnChanges(::refresh)
    }

    fun refresh() {
        val period = _form.value.period
        load(_list) { shop { expenses(period) } }
        // The daily view shows the month's mix, as on the web.
        val breakdownPeriod = if (period == "daily") "monthly" else period
        load(_breakdown) { shop { parseBreakdown(expenseBreakdown(breakdownPeriod).breakdown) } }
        viewModelScope.launch {
            val result = repository.shop { cashAvailable().cashAvailable }
            if (result is ApiResult.Success) _cash.value = result.value
        }
    }

    fun onPeriodChange(period: String) {
        if (period == _form.value.period) return
        _form.update { it.copy(period = period) }
        _list.value = Remote()
        _breakdown.value = Remote()
        refresh()
    }

    fun onAmountChange(value: String) = _form.update { it.copy(amount = NumberInput.sanitizeMoney(value)) }
    fun onDescriptionChange(value: String) = _form.update { it.copy(description = value) }
    fun onCategoryChange(value: String) = _form.update { it.copy(category = value) }
    fun onMethodChange(value: String) = _form.update { it.copy(paymentMethod = value) }

    fun useRestock() {
        if (!isAdmin) return
        _form.update {
            it.copy(kind = EXPENSE_RESTOCK, category = "restocking", description = it.description.ifEmpty { RESTOCK_DESCRIPTION })
        }
    }

    fun useNormal() = _form.update {
        it.copy(
            kind = EXPENSE_OPERATING,
            category = if (it.category == "restocking") "other" else it.category,
            description = if (it.description == RESTOCK_DESCRIPTION) "" else it.description,
        )
    }

    fun record() = submit(allowOverspend = false)

    fun confirmOverspend() = submit(allowOverspend = true)

    fun dismissOverspend() {
        if (!_form.value.saving) _form.update { it.copy(overspend = null) }
    }

    private fun submit(allowOverspend: Boolean) {
        val form = _form.value
        if (form.saving) return
        val amount = NumberInput.parseMoney(form.amount)
        val description = form.description.trim()
        if (amount == null || amount <= 0) return fail("Enter an amount.")
        if (description.isEmpty()) return fail("Description is required.")
        val request = NewExpenseRequest(
            amount = amount,
            description = description,
            category = form.category,
            kind = form.kind,
            paymentMethod = form.paymentMethod,
            allowOverspend = if (allowOverspend) true else null,
        )
        write(
            busy = { busy -> _form.update { it.copy(saving = busy) } },
            block = { shopWrite { createExpense(request) } },
            onFailure = { error ->
                val shortfall = error.cashShortfall
                if (shortfall != null && !allowOverspend) {
                    _form.update { it.copy(overspend = shortfall) }
                } else {
                    fail(error)
                }
            },
        ) { result ->
            val topUp = if (result.ownerCashIn > 0) " Owner cash-in ${formatMoney(result.ownerCashIn)} recorded." else ""
            success("Expense recorded.$topUp")
            _form.update { ExpenseForm(period = it.period) }
        }
    }

    private fun parseBreakdown(raw: JsonElement?): List<BreakdownRow> =
        (raw as? JsonArray).orEmpty().mapNotNull { entry ->
            val pair = entry as? JsonArray ?: return@mapNotNull null
            val category = pair.getOrNull(0)?.jsonPrimitive?.contentOrNull ?: return@mapNotNull null
            val info = pair.getOrNull(1) as? JsonObject
            BreakdownRow(
                category = category,
                count = info?.get("count")?.jsonPrimitive?.intOrNull ?: 0,
                total = info?.get("total")?.jsonPrimitive?.doubleOrNull ?: 0.0,
            )
        }
}
