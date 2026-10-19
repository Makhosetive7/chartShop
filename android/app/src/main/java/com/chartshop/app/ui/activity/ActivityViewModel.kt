package com.chartshop.app.ui.activity

import com.chartshop.app.data.model.ActivityItem
import com.chartshop.app.data.shop.ShopRepository
import com.chartshop.app.domain.ShopDates
import com.chartshop.app.ui.Remote
import com.chartshop.app.ui.ScreenViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.serialization.json.JsonPrimitive

val ACTIVITY_CHANNELS = listOf("all", "web", "telegram", "whatsapp", "system")

val ACTIVITY_ACTIONS = listOf(
    "all", "chat.turn", "auth.login", "sale.cash", "sale.credit", "sale.cancelled",
    "credit.reminder", "expense.recorded", "product.create", "product.stock",
)

fun actionLabel(action: String): String = when {
    action == "chat.turn" -> "Chat"
    action == "auth.login" -> "Login"
    action == "sale.cash" -> "Cash sale"
    action == "sale.credit" -> "Credit sale"
    action == "credit.reminder" -> "Credit reminder"
    action == "sale.to_customer" -> "Sale"
    action == "sale.cancelled" -> "Cancelled"
    action == "expense.recorded" -> "Expense"
    action == "product.create" -> "New product"
    action == "product.update" -> "Product edit"
    action == "product.stock" -> "Stock"
    action == "product.delete" -> "Product removed"
    action == "product.variant.add" -> "Product option"
    action == "product.pack.add" -> "Product pack"
    action == "customer.create" -> "Customer"
    action == "customer.credit" -> "Credit"
    action == "customer.payment" -> "Payment"
    action == "laybye.created" -> "Laybye"
    action == "laybye.payment" -> "Laybye pay"
    action == "laybye.completed" -> "Laybye done"
    action == "order.create" -> "Order"
    action == "order.status" -> "Order status"
    action.startsWith("team.") -> "Team"
    action == "shop.name" -> "Shop name"
    action == "shop.description" -> "Shop about"
    action == "shop.settings" -> "Settings"
    action == "auth.username" -> "Username"
    action == "auth.display_name" -> "Display name"
    action == "auth.pin" -> "PIN change"
    action == "auth.setup_pin" -> "PIN setup"
    else -> action
}

private val MONGO_ID = Regex("^[a-f0-9]{24}$", RegexOption.IGNORE_CASE)

fun actorLabel(item: ActivityItem): String? = when {
    !item.actorDisplayName.isNullOrBlank() && !item.actorUsername.isNullOrBlank() -> "${item.actorDisplayName} (@${item.actorUsername})"
    !item.actorUsername.isNullOrBlank() -> "@${item.actorUsername}"
    !item.actorDisplayName.isNullOrBlank() -> item.actorDisplayName
    item.actorId.isNotBlank() && !MONGO_ID.matches(item.actorId) -> item.actorId
    else -> null
}

/** The chat command and bot reply stored on `chat.turn` events. */
fun chatParts(item: ActivityItem): Pair<String, String> {
    fun text(key: String) = (item.metadata?.get(key) as? JsonPrimitive)?.takeIf { it.isString }?.content.orEmpty()
    return text("input") to text("reply")
}

data class ActivityFilters(
    val channel: String = "all",
    val action: String = "all",
    val mineOnly: Boolean = false,
    val query: String = "",
    val detail: ActivityItem? = null,
)

class ActivityViewModel(repository: ShopRepository, val dates: ShopDates) : ScreenViewModel(repository, canEdit = true) {

    private val _filters = MutableStateFlow(ActivityFilters())
    val filters: StateFlow<ActivityFilters> = _filters.asStateFlow()

    private val _items = MutableStateFlow(Remote<List<ActivityItem>>())
    val items: StateFlow<Remote<List<ActivityItem>>> = _items.asStateFlow()

    private var loadJob: Job? = null

    init {
        refresh()
        reloadOnChanges(::refresh)
    }

    fun refresh() {
        val f = _filters.value
        loadJob?.cancel()
        loadJob = load(_items) {
            owner {
                activity(
                    limit = 120,
                    channel = f.channel.takeIf { it != "all" },
                    action = f.action.takeIf { it != "all" },
                    mine = if (f.mineOnly) 1 else null,
                ).items
            }
        }
    }

    private fun refetch(transform: (ActivityFilters) -> ActivityFilters) {
        val before = _filters.value
        val after = transform(before)
        if (after == before) return
        _filters.value = after
        _items.value = Remote()
        refresh()
    }

    fun onChannel(channel: String) = refetch { it.copy(channel = channel) }
    fun onAction(action: String) = refetch { it.copy(action = action) }
    fun onMineOnly(mine: Boolean) = refetch { it.copy(mineOnly = mine) }
    fun onQuery(query: String) = _filters.update { it.copy(query = query) }
    fun showDetail(item: ActivityItem?) = _filters.update { it.copy(detail = item) }

    fun filter(items: List<ActivityItem>, query: String): List<ActivityItem> {
        val q = query.trim().lowercase()
        if (q.isEmpty()) return items
        return items.filter { row ->
            val (input, reply) = chatParts(row)
            val actor = "${row.actorDisplayName.orEmpty()} ${row.actorUsername.orEmpty()} ${row.actorId}".lowercase()
            row.summary.lowercase().contains(q) || row.action.lowercase().contains(q) || row.channel.lowercase().contains(q) ||
                actor.contains(q) || input.lowercase().contains(q) || reply.lowercase().contains(q)
        }
    }
}
