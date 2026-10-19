package com.chartshop.app.data.notifications

import com.chartshop.app.data.api.ApiResult
import com.chartshop.app.data.model.ReadStateAdd
import com.chartshop.app.data.model.ReadStateUpdate
import com.chartshop.app.data.shop.ShopRepository
import com.chartshop.app.domain.FeedSources
import com.chartshop.app.domain.NotificationFeed
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

data class NotificationsState(
    val sources: FeedSources? = null,
    val seen: Set<String> = emptySet(),
    val loading: Boolean = false,
    val error: String? = null,
) {
    val badge: Int get() = sources?.let { NotificationFeed.badgeCount(it, seen) } ?: 0
}

/**
 * The alert feeds plus the read state the server keeps per user, so the bell
 * badge here and on the web agree. Shared by the shell and the Notifications screen.
 */
class NotificationCenter(private val repository: ShopRepository) {
    private val _state = MutableStateFlow(NotificationsState())
    val state: StateFlow<NotificationsState> = _state.asStateFlow()

    suspend fun refresh() {
        _state.update { it.copy(loading = it.sources == null, error = null) }
        coroutineScope {
            val credit = async { repository.shop { creditDue().items } }
            val stock = async { repository.shop { stockAlerts().items } }
            val orders = async { repository.shop { orderAlerts().items } }
            val laybyes = async { repository.shop { laybyeAlerts().items } }
            val reminders = async { repository.owner { activity(20, null, "credit.reminder", null).items } }
            val readState = async { repository.owner { readState().seenKeys } }

            val feeds = listOf(credit.await(), stock.await(), orders.await(), laybyes.await())
            val error = feeds.filterIsInstance<ApiResult.Failure>().firstOrNull()?.error?.message
            val previous = _state.value.sources ?: FeedSources()
            val sources = FeedSources(
                credit = credit.await().valueOr(previous.credit),
                stock = stock.await().valueOr(previous.stock),
                orders = orders.await().valueOr(previous.orders),
                laybyes = laybyes.await().valueOr(previous.laybyes),
                reminders = reminders.await().valueOr(previous.reminders),
            )
            val seen = readState.await().valueOr(null)?.toSet()
            _state.update {
                it.copy(sources = sources, seen = seen ?: it.seen, loading = false, error = error)
            }
        }
    }

    suspend fun markRead(keys: List<String>) {
        if (keys.isEmpty()) return
        _state.update { it.copy(seen = it.seen + keys) }
        val result = repository.owner { addReadKeys(ReadStateAdd(keys)).seenKeys }
        if (result is ApiResult.Success) _state.update { it.copy(seen = result.value.toSet()) }
    }

    suspend fun markAll() {
        val current = _state.value
        val keys = NotificationFeed.markAllKeys(current.sources ?: return, current.seen)
        _state.update { it.copy(seen = keys) }
        val result = repository.owner { replaceReadState(ReadStateUpdate(keys.toList())).seenKeys }
        if (result is ApiResult.Success) _state.update { it.copy(seen = result.value.toSet()) }
    }

    fun clear() {
        _state.value = NotificationsState()
    }

    private fun <T> ApiResult<T>.valueOr(fallback: T): T = (this as? ApiResult.Success)?.value ?: fallback
}
