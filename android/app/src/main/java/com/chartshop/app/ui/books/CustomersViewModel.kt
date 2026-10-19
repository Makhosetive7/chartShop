package com.chartshop.app.ui.books

import com.chartshop.app.data.model.Customer
import com.chartshop.app.data.model.NewCustomerRequest
import com.chartshop.app.data.shop.ShopRepository
import com.chartshop.app.domain.ShopDates
import com.chartshop.app.ui.Remote
import com.chartshop.app.ui.ScreenViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

enum class CustomerFilter(val wire: String, val label: String) { All("all", "All"), Active("active", "Active (30d)") }

data class CustomerForm(
    val name: String = "",
    val phone: String = "",
    val email: String = "",
    val adding: Boolean = false,
    val filter: CustomerFilter = CustomerFilter.All,
)

class CustomersViewModel(
    repository: ShopRepository,
    val dates: ShopDates,
    canEdit: Boolean,
) : ScreenViewModel(repository, canEdit) {

    private val _form = MutableStateFlow(CustomerForm())
    val form: StateFlow<CustomerForm> = _form.asStateFlow()

    private val _list = MutableStateFlow(Remote<List<Customer>>())
    val list: StateFlow<Remote<List<Customer>>> = _list.asStateFlow()

    init {
        refresh()
        reloadOnChanges(::refresh)
    }

    fun refresh() {
        val filter = _form.value.filter.wire
        load(_list) { shop { customers(filter).customers } }
    }

    fun onFilterChange(filter: CustomerFilter) {
        if (filter == _form.value.filter) return
        _form.update { it.copy(filter = filter) }
        _list.value = Remote()
        refresh()
    }

    fun onNameChange(value: String) = _form.update { it.copy(name = value) }
    fun onPhoneChange(value: String) = _form.update { it.copy(phone = value) }
    fun onEmailChange(value: String) = _form.update { it.copy(email = value) }

    fun add() {
        val form = _form.value
        if (form.adding) return
        val name = form.name.trim()
        val phone = form.phone.trim()
        if (name.isEmpty()) return fail("Customer name is required.")
        if (phone.isEmpty()) return fail("Phone number is required.")
        write(
            busy = { busy -> _form.update { it.copy(adding = busy) } },
            block = { shopWrite { createCustomer(NewCustomerRequest(name, phone, form.email.trim().ifEmpty { null })) } },
        ) {
            success("Customer added.")
            _form.update { it.copy(name = "", phone = "", email = "") }
        }
    }
}
