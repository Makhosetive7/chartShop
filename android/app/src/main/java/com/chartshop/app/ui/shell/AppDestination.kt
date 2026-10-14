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
enum class AppDestination(
    val route: String,
    val label: String,
    val icon: ImageVector,
    val summary: String,
    val milestone: Int,
) {
    Home(
        "home", "Home", Icons.Outlined.Dashboard,
        "Today, this week, and this month at a glance: sales, top products, debtors, and stock value.", 4,
    ),
    Sales(
        "sales", "Sales", Icons.Outlined.ShoppingCart,
        "Ring up cash and credit sales, sell to a customer, and cancel or refund recent sales.", 2,
    ),
    Products(
        "products", "Products", Icons.Outlined.Inventory2,
        "Your catalog with variants and packs, stock adjustments, and low-stock alerts.", 2,
    ),
    Chat(
        "chat", "Chat", Icons.AutoMirrored.Outlined.Chat,
        "The same commands as the Telegram bot, like “sell 2 bread” or “daily”.", 5,
    ),
    More("more", "More", Icons.Outlined.Menu, "", 1),

    Laybyes(
        "laybyes", "Laybyes", Icons.Outlined.CalendarMonth,
        "Take deposits, record payments, and complete laybyes.", 3,
    ),
    Customers(
        "customers", "Customers", Icons.Outlined.People,
        "Customer profiles, purchase history, credit, and payments.", 3,
    ),
    Orders(
        "orders", "Orders", Icons.AutoMirrored.Outlined.Assignment,
        "Pickup, delivery, and reservation orders from pending to completed.", 3,
    ),
    Expenses(
        "expenses", "Expenses", Icons.Outlined.AccountBalanceWallet,
        "Record costs against the till and see breakdowns by category.", 3,
    ),
    Reports(
        "reports", "Reports", Icons.Outlined.Assessment,
        "Daily, weekly, and monthly reports, profit, best sellers, and PDF export.", 4,
    ),
    Activity(
        "activity", "Activity", Icons.Outlined.History,
        "Everything done on the web, Telegram, WhatsApp, and this app.", 4,
    ),
    Notifications(
        "notifications", "Notifications", Icons.Outlined.Notifications,
        "Low stock, due orders, laybyes, and credit that needs attention.", 4,
    ),
    Settings(
        "settings", "Settings", Icons.Outlined.Settings,
        "Shop details, your username and PIN, timezone, recovery codes, and team.", 5,
    );

    companion object {
        val tabs = listOf(Home, Sales, Products, Chat, More)
        val moreItems = listOf(Laybyes, Customers, Orders, Expenses, Reports, Activity, Notifications, Settings)

        fun fromRoute(route: String?): AppDestination? = entries.firstOrNull { it.route == route }
    }
}
