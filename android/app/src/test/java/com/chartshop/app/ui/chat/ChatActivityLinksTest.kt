package com.chartshop.app.ui.chat

import com.chartshop.app.data.model.ChatBubble
import com.chartshop.app.ui.shell.AppDestination
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ChatActivityLinksTest {

    private fun activity(
        action: String,
        entityType: String? = null,
    ) = ChatBubble(
        role = ChatBubble.ROLE_ASSISTANT,
        text = "Sale to Jane \$2.00",
        type = "activity",
        action = action,
        entityType = entityType,
    )

    @Test
    fun salesFilterMatchesSaleAndLaybye() {
        assertTrue(isSalesActivity(activity("sale.to_customer", "sale")))
        assertTrue(isSalesActivity(activity("laybye.created", "laybye")))
        assertTrue(isSalesActivity(activity("customer.payment", "customer")))
        assertFalse(isSalesActivity(activity("product.stock", "product")))
        assertFalse(isSalesActivity(ChatBubble(role = ChatBubble.ROLE_USER, text = "help")))
    }

    @Test
    fun commandsFilterExcludesActivity() {
        assertTrue(matchesFeedFilter(ChatBubble(role = ChatBubble.ROLE_USER, text = "help"), ChatFeedFilter.Commands))
        assertFalse(matchesFeedFilter(activity("sale.cash", "sale"), ChatFeedFilter.Commands))
        assertTrue(matchesFeedFilter(activity("sale.cash", "sale"), ChatFeedFilter.Sales))
    }

    @Test
    fun activityMapsToDestinations() {
        assertEquals(AppDestination.Sales, chatActivityDestination(activity("sale.credit", "sale")))
        assertEquals(AppDestination.Customers, chatActivityDestination(activity("customer.create", "customer")))
        assertEquals(AppDestination.Products, chatActivityDestination(activity("product.stock", "product")))
        assertEquals(AppDestination.Orders, chatActivityDestination(activity("order.create", "order")))
        assertEquals(AppDestination.Expenses, chatActivityDestination(activity("expense.recorded", "expense")))
        assertEquals(AppDestination.Laybyes, chatActivityDestination(activity("laybye.created", "laybye")))
        assertEquals(AppDestination.Activity, chatActivityDestination(activity("settings.update")))
        assertNull(chatActivityDestination(ChatBubble(role = ChatBubble.ROLE_USER, text = "help")))
    }
}
