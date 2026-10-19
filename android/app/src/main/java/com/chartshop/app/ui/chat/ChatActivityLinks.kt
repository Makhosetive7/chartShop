package com.chartshop.app.ui.chat

import com.chartshop.app.data.model.ChatBubble
import com.chartshop.app.ui.shell.AppDestination

enum class ChatFeedFilter(val label: String) {
    All("All"),
    Sales("Sales"),
    Commands("Commands"),
}

fun isSalesActivity(msg: ChatBubble): Boolean {
    if (!msg.isActivity) return false
    val action = msg.action.orEmpty()
    return action.startsWith("sale.") ||
        action.startsWith("laybye.") ||
        action.startsWith("customer.credit") ||
        action.startsWith("customer.payment")
}

fun matchesFeedFilter(msg: ChatBubble, filter: ChatFeedFilter): Boolean = when (filter) {
    ChatFeedFilter.All -> true
    ChatFeedFilter.Sales -> isSalesActivity(msg)
    ChatFeedFilter.Commands -> !msg.isActivity
}

/** Map an activity bubble to a shell destination (web parity). */
fun chatActivityDestination(msg: ChatBubble): AppDestination? {
    if (!msg.isActivity) return null
    val action = msg.action.orEmpty()
    val entityType = msg.entityType.orEmpty().lowercase()
    return when {
        entityType == "sale" || action.startsWith("sale.") -> AppDestination.Sales
        entityType == "customer" || action.startsWith("customer.") -> AppDestination.Customers
        entityType == "product" || action.startsWith("product.") -> AppDestination.Products
        entityType == "order" || action.startsWith("order.") -> AppDestination.Orders
        entityType == "expense" || action.startsWith("expense.") -> AppDestination.Expenses
        entityType == "laybye" || action.startsWith("laybye.") -> AppDestination.Laybyes
        else -> AppDestination.Activity
    }
}
