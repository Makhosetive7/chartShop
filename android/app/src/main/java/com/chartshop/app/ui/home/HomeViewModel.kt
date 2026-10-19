package com.chartshop.app.ui.home

import com.chartshop.app.data.model.InventoryStats
import com.chartshop.app.data.model.SalesStats
import com.chartshop.app.data.model.StatsOverview
import com.chartshop.app.data.shop.ShopRepository
import com.chartshop.app.ui.Remote
import com.chartshop.app.ui.ScreenViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

val DASHBOARD_DAYS = listOf(7, 30, 90)

/** "7a", "12p", "3p": the web's compact hour labels. */
fun hourLabel(hour: Int): String {
    val h = ((hour % 24) + 24) % 24
    val base = if (h % 12 == 0) 12 else h % 12
    return "$base${if (h < 12) "a" else "p"}"
}

class HomeViewModel(repository: ShopRepository) : ScreenViewModel(repository, canEdit = true) {

    private val _days = MutableStateFlow(30)
    val days: StateFlow<Int> = _days.asStateFlow()

    private val _overview = MutableStateFlow(Remote<StatsOverview>())
    val overview: StateFlow<Remote<StatsOverview>> = _overview.asStateFlow()

    private val _sales = MutableStateFlow(Remote<SalesStats>())
    val sales: StateFlow<Remote<SalesStats>> = _sales.asStateFlow()

    private val _inventory = MutableStateFlow(Remote<InventoryStats>())
    val inventory: StateFlow<Remote<InventoryStats>> = _inventory.asStateFlow()

    init {
        refresh()
        reloadOnChanges(::refresh)
    }

    fun refresh() {
        val days = _days.value
        load(_overview) { owner { stats(days, 8) } }
        load(_sales) { owner { salesStats(days) } }
        load(_inventory) { owner { inventoryStats() } }
    }

    fun onDaysChange(days: Int) {
        if (days == _days.value) return
        _days.value = days
        refresh()
    }
}
