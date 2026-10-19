package com.chartshop.app.ui.shell

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Assignment
import androidx.compose.material.icons.automirrored.outlined.Chat
import androidx.compose.material.icons.outlined.AccountBalanceWallet
import androidx.compose.material.icons.outlined.Assessment
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Dashboard
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.Inventory2
import androidx.compose.material.icons.outlined.Menu
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.People
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.ShoppingCart
import androidx.compose.ui.graphics.vector.ImageVector

/** Mirrors the web app's routes under /app and the PRIMARY / MORE split in AppLayout.tsx. */
enum class AppDestination(val route: String, val label: String, val icon: ImageVector) {
    Home("home", "Home", Icons.Outlined.Dashboard),
    Sales("sales", "Sales", Icons.Outlined.ShoppingCart),
    Products("products", "Products", Icons.Outlined.Inventory2),
    Chat("chat", "Chat", Icons.AutoMirrored.Outlined.Chat),
    More("more", "More", Icons.Outlined.Menu),

    Laybyes("laybyes", "Laybyes", Icons.Outlined.CalendarMonth),
    Customers("customers", "Customers", Icons.Outlined.People),
    Orders("orders", "Orders", Icons.AutoMirrored.Outlined.Assignment),
    Expenses("expenses", "Expenses", Icons.Outlined.AccountBalanceWallet),
    Reports("reports", "Reports", Icons.Outlined.Assessment),
    Activity("activity", "Activity", Icons.Outlined.History),
    Notifications("notifications", "Notifications", Icons.Outlined.Notifications),
    Settings("settings", "Settings", Icons.Outlined.Settings);

    companion object {
        val tabs = listOf(Home, Sales, Products, Chat, More)
        val moreItems = listOf(Laybyes, Customers, Orders, Expenses, Reports, Activity, Notifications, Settings)

        fun fromRoute(route: String?): AppDestination? = entries.firstOrNull { it.route == route }
    }
}
