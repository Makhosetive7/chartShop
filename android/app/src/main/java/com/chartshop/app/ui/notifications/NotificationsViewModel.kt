package com.chartshop.app.ui.notifications

import androidx.lifecycle.viewModelScope
import com.chartshop.app.data.notifications.NotificationCenter
import com.chartshop.app.data.notifications.NotificationsState
import com.chartshop.app.data.shop.ShopRepository
import com.chartshop.app.domain.FeedRow
import com.chartshop.app.domain.NotificationFeed
import com.chartshop.app.domain.ShopDates
import com.chartshop.app.ui.ScreenViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class NotificationsUi(
    val rows: List<FeedRow>? = null,
    val unreadOnly: Boolean = false,
    val error: String? = null,
) {
    val unreadCount: Int get() = rows?.count { it.unread } ?: 0
    val visible: List<FeedRow> get() = rows.orEmpty().filter { !unreadOnly || it.unread }
}

class NotificationsViewModel(
    repository: ShopRepository,
    private val center: NotificationCenter,
    private val dates: ShopDates,
) : ScreenViewModel(repository, canEdit = true) {

    private val unreadOnly = MutableStateFlow(false)

    val ui: StateFlow<NotificationsUi> = combine(center.state, unreadOnly) { state: NotificationsState, unread ->
        NotificationsUi(
            rows = state.sources?.let { NotificationFeed.build(it, state.seen, dates) },
            unreadOnly = unread,
            error = state.error,
        )
    }.stateIn(viewModelScope, SharingStarted.Eagerly, NotificationsUi())

    private val _refreshing = MutableStateFlow(false)
    val refreshing: StateFlow<Boolean> = _refreshing.asStateFlow()

    init {
        refresh()
        reloadOnChanges(::refresh)
    }

    fun refresh() {
        viewModelScope.launch {
            _refreshing.value = true
            center.refresh()
            _refreshing.value = false
        }
    }

    fun onFilter(unread: Boolean) {
        unreadOnly.value = unread
    }

    fun markRead(row: FeedRow) {
        if (!row.unread) return
        viewModelScope.launch { center.markRead(listOf(row.seenKey)) }
    }

    fun markAll() {
        viewModelScope.launch { center.markAll() }
    }
}
