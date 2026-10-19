package com.chartshop.app.ui.chat

import androidx.lifecycle.viewModelScope
import com.chartshop.app.data.api.ApiError
import com.chartshop.app.data.api.ApiResult
import com.chartshop.app.data.model.ChatBubble
import com.chartshop.app.data.model.ChatHistoryResponse
import com.chartshop.app.data.model.ChatRequest
import com.chartshop.app.data.shop.ShopRepository
import com.chartshop.app.domain.ShopDates
import com.chartshop.app.ui.Remote
import com.chartshop.app.ui.ScreenViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.time.Instant

data class ChatSuggestion(val cmd: String, val label: String)

val CHAT_SUGGESTIONS = listOf(
    ChatSuggestion("help", "Help"),
    ChatSuggestion("list", "Products"),
    ChatSuggestion("daily", "Today"),
    ChatSuggestion("customers", "Customers"),
    ChatSuggestion("low stock", "Low stock"),
    ChatSuggestion("best", "Best sellers"),
)

const val CHAT_HISTORY_LIMIT = 120
private const val CHAT_POLL_MS = 8_000L

private val DEMO_SAFE_COMMANDS = setOf(
    "help", "list", "daily", "weekly", "monthly", "best", "low stock", "customers", "orders", "status", "expenses",
)

/** Commands that only read data, so they run in shared demo shops. */
fun isDemoSafeCommand(text: String): Boolean {
    val cmd = text.trim().lowercase()
    return cmd in DEMO_SAFE_COMMANDS ||
        cmd.startsWith("best ") ||
        cmd.startsWith("orders ") ||
        cmd.startsWith("expenses")
}

data class ChatUi(
    val messages: List<ChatBubble> = emptyList(),
    val feedFilter: ChatFeedFilter = ChatFeedFilter.All,
    val hasAnyHistory: Boolean = false,
    val filterEmpty: Boolean = false,
    val loading: Boolean = false,
    val error: String? = null,
    val slow: Boolean = false,
    val sending: Boolean = false,
    val draft: String = "",
) {
    val isEmpty: Boolean get() = !hasAnyHistory && !loading && error == null
}

class ChatViewModel(
    repository: ShopRepository,
    val dates: ShopDates,
    val isDemo: Boolean,
) : ScreenViewModel(repository, canEdit = true) {

    private val history = MutableStateFlow(Remote<ChatHistoryResponse>())
    private val local = MutableStateFlow<List<ChatBubble>>(emptyList())
    private val draft = MutableStateFlow("")
    private val sending = MutableStateFlow(false)
    private val feedFilter = MutableStateFlow(ChatFeedFilter.All)

    /** "New conversation" hides older history on this screen only; nothing is deleted. */
    private val sessionStartedAt = MutableStateFlow<String?>(null)

    private data class BaseUi(
        val sessionRows: List<ChatBubble>,
        val local: List<ChatBubble>,
        val hasServerHistory: Boolean,
        val loading: Boolean,
        val error: String?,
        val slow: Boolean,
        val sending: Boolean,
        val draft: String,
    )

    val ui: StateFlow<ChatUi> = combine(
        combine(history, local, draft, sending, sessionStartedAt) { h, l, d, s, since ->
            val rows = h.data?.messages.orEmpty()
            val sessionRows = if (since == null) rows else rows.filter { (it.createdAt ?: "") >= since }
            BaseUi(
                sessionRows = sessionRows,
                local = l,
                hasServerHistory = rows.isNotEmpty(),
                loading = h.loading && h.data == null,
                error = h.error.takeIf { h.data == null },
                slow = h.slow,
                sending = s,
                draft = d,
            )
        },
        feedFilter,
    ) { base, filter ->
        val filteredHistory = if (filter == ChatFeedFilter.All) {
            base.sessionRows
        } else {
            base.sessionRows.filter { matchesFeedFilter(it, filter) }
        }
        // Keep in-flight local turns visible under any filter.
        val visible = filteredHistory + base.local
        val hasAny = base.sessionRows.isNotEmpty() || base.local.isNotEmpty() || base.hasServerHistory
        ChatUi(
            messages = visible,
            feedFilter = filter,
            hasAnyHistory = hasAny,
            filterEmpty = hasAny && visible.isEmpty() && !base.loading && filter != ChatFeedFilter.All,
            loading = base.loading,
            error = base.error,
            slow = base.slow,
            sending = base.sending,
            draft = base.draft,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), ChatUi(loading = true))

    val refreshing: StateFlow<Boolean> = combine(history, sending) { h, s -> h.loading && h.data != null && !s }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), false)

    init {
        refresh()
        reloadOnChanges { silentRefresh() }
        viewModelScope.launch {
            while (isActive) {
                delay(CHAT_POLL_MS)
                silentRefresh()
            }
        }
    }

    fun refresh() {
        load(history) { owner { chatHistory(CHAT_HISTORY_LIMIT) } }
    }

    private fun silentRefresh() {
        viewModelScope.launch {
            when (val result = repository.owner { chatHistory(CHAT_HISTORY_LIMIT) }) {
                is ApiResult.Success -> {
                    history.update {
                        it.copy(data = result.value, loading = false, error = null, slow = false)
                    }
                }
                is ApiResult.Failure -> Unit
            }
        }
    }

    fun onDraft(value: String) {
        draft.value = value
    }

    fun setFeedFilter(filter: ChatFeedFilter) {
        feedFilter.value = filter
    }

    fun newConversation() {
        sessionStartedAt.value = Instant.now().toString()
        feedFilter.value = ChatFeedFilter.All
        local.value = emptyList()
        draft.value = ""
    }

    fun submit(text: String = draft.value) {
        val message = text.trim()
        if (message.isEmpty() || sending.value) return
        if (isDemo && !isDemoSafeCommand(message)) {
            info("This is a demo shop — sell, stock and expense commands need your own shop.")
            return
        }
        draft.value = ""
        local.update { it + ChatBubble(role = ChatBubble.ROLE_USER, text = message, createdAt = Instant.now().toString()) }
        sending.value = true
        viewModelScope.launch {
            val result = repository.ownerWrite(touchesStock = true) { sendChat(ChatRequest(message)) }
            when (result) {
                is ApiResult.Success -> {
                    load(history) { owner { chatHistory(CHAT_HISTORY_LIMIT) } }.join()
                    if (history.value.error == null) {
                        local.value = emptyList()
                    } else {
                        result.value.reply?.let { reply -> local.update { it + reply } }
                    }
                }
                is ApiResult.Failure -> onSendFailed(result.error)
            }
            sending.value = false
        }
    }

    private fun onSendFailed(error: ApiError) {
        if (error.code == ApiError.CODE_DEMO_READ_ONLY) {
            local.update { it.dropLast(1) }
            info(error.message)
            return
        }
        local.update {
            it + ChatBubble(
                role = ChatBubble.ROLE_ASSISTANT,
                text = error.message.ifBlank { "Something went wrong. Please try again." },
                createdAt = Instant.now().toString(),
            )
        }
    }
}
