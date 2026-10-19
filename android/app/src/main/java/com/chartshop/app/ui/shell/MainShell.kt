package com.chartshop.app.ui.shell

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.chartshop.app.data.session.SessionState
import com.chartshop.app.domain.ShopDates
import com.chartshop.app.ui.activity.ActivityScreen
import com.chartshop.app.ui.activity.ActivityViewModel
import com.chartshop.app.ui.appContainer
import com.chartshop.app.ui.books.CustomersScreen
import com.chartshop.app.ui.books.CustomersViewModel
import com.chartshop.app.ui.books.ExpensesScreen
import com.chartshop.app.ui.books.ExpensesViewModel
import com.chartshop.app.ui.books.LaybyesScreen
import com.chartshop.app.ui.books.LaybyesViewModel
import com.chartshop.app.ui.books.OrdersScreen
import com.chartshop.app.ui.books.OrdersViewModel
import com.chartshop.app.ui.chat.ChatScreen
import com.chartshop.app.ui.chat.ChatViewModel
import com.chartshop.app.ui.components.Banner
import com.chartshop.app.ui.components.BannerTone
import com.chartshop.app.ui.containerViewModel
import com.chartshop.app.ui.home.HomeScreen
import com.chartshop.app.ui.home.HomeViewModel
import com.chartshop.app.ui.notifications.NotificationsScreen
import com.chartshop.app.ui.notifications.NotificationsViewModel
import com.chartshop.app.ui.products.ProductsScreen
import com.chartshop.app.ui.products.ProductsViewModel
import com.chartshop.app.ui.reports.ReportsScreen
import com.chartshop.app.ui.reports.ReportsViewModel
import com.chartshop.app.ui.sales.SalesScreen
import com.chartshop.app.ui.sales.SalesViewModel
import com.chartshop.app.ui.settings.SettingsScreen
import com.chartshop.app.ui.settings.SettingsViewModel
import com.chartshop.app.ui.settings.TeamViewModel
import com.chartshop.app.ui.theme.ChartShopColors
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private const val NOTIFICATION_POLL_MS = 60_000L

@Composable
fun MainShell(session: SessionState.SignedIn) {
    val nav = rememberNavController()
    val backStackEntry by nav.currentBackStackEntryAsState()
    val current = AppDestination.fromRoute(backStackEntry?.destination?.route) ?: AppDestination.Home
    val isTab = current in AppDestination.tabs

    val container = appContainer()
    val notifications by container.notificationCenter.state.collectAsStateWithLifecycle()
    val badge = notifications.badge

    LaunchedEffect(session.shop.id) {
        launch { container.shopRepository.changes.collect { container.notificationCenter.refresh() } }
        while (true) {
            delay(NOTIFICATION_POLL_MS)
            container.notificationCenter.refresh()
        }
    }

    val timezone = session.shop.settings?.timezone
    val dates = remember(timezone) { ShopDates(timezone) }
    val canEdit = !session.shop.isDemo
    // A timezone change in Settings rebuilds the screens that format dates.
    val tzKey = timezone ?: ShopDates.DEFAULT_TIMEZONE

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            ShellTopBar(
                session = session,
                current = current,
                badge = badge,
                onBack = if (isTab) null else ({ nav.popBackStack() }),
                onNotifications = { nav.navigate(AppDestination.Notifications.route) { launchSingleTop = true } },
            )
        },
        bottomBar = {
            NavigationBar(containerColor = ChartShopColors.Surface) {
                AppDestination.tabs.forEach { tab ->
                    val selected = tab == current || (tab == AppDestination.More && !isTab)
                    NavigationBarItem(
                        selected = selected,
                        onClick = { nav.navigateToTab(tab) },
                        icon = {
                            if (tab == AppDestination.More && badge > 0) {
                                BadgedBox(badge = { CountBadge(badge) }) { Icon(tab.icon, contentDescription = null) }
                            } else {
                                Icon(tab.icon, contentDescription = null)
                            }
                        },
                        label = { Text(tab.label) },
                        colors = NavigationBarItemDefaults.colors(
                            indicatorColor = ChartShopColors.PrimaryTint,
                            selectedIconColor = ChartShopColors.Primary,
                            selectedTextColor = ChartShopColors.Primary,
                        ),
                    )
                }
            }
        },
    ) { padding ->
        Column(
            Modifier
                .padding(padding)
                .consumeWindowInsets(padding)
                .imePadding()
                .fillMaxSize(),
        ) {
            if (session.shop.isDemo) {
                Banner("Demo shop — you can look around, but changes aren't saved.", BannerTone.Warning)
            }
            NavHost(navController = nav, startDestination = AppDestination.Home.route) {
                AppDestination.entries.forEach { destination ->
                    composable(destination.route) {
                        when (destination) {
                            AppDestination.Home -> HomeScreen(
                                viewModel = containerViewModel { HomeViewModel(it.shopRepository) },
                                onOpenNotifications = {
                                    nav.navigate(AppDestination.Notifications.route) { launchSingleTop = true }
                                },
                            )
                            AppDestination.Sales -> SalesScreen(
                                containerViewModel("sales-$tzKey") {
                                    SalesViewModel(it.shopRepository, it.productRepository, dates, canEdit)
                                },
                            )
                            AppDestination.Products -> ProductsScreen(
                                viewModel = containerViewModel {
                                    ProductsViewModel(
                                        repository = it.productRepository,
                                        shopLowStockAlert = session.shop.settings?.lowStockAlert,
                                        canEdit = canEdit,
                                    )
                                },
                            )
                            AppDestination.Chat -> ChatScreen(
                                viewModel = containerViewModel("chat-$tzKey") {
                                    ChatViewModel(it.shopRepository, dates, session.shop.isDemo)
                                },
                                shopName = session.shop.businessName,
                            )
                            AppDestination.More -> MoreScreen(
                                session = session,
                                badge = badge,
                                onOpen = { nav.navigate(it.route) { launchSingleTop = true } },
                            )
                            AppDestination.Laybyes -> LaybyesScreen(
                                containerViewModel("laybyes-$tzKey") {
                                    LaybyesViewModel(it.shopRepository, it.productRepository, dates, canEdit)
                                },
                            )
                            AppDestination.Customers -> CustomersScreen(
                                containerViewModel("customers-$tzKey") { CustomersViewModel(it.shopRepository, dates, canEdit) },
                            )
                            AppDestination.Orders -> OrdersScreen(
                                containerViewModel("orders-$tzKey") {
                                    OrdersViewModel(it.shopRepository, it.productRepository, dates, canEdit)
                                },
                            )
                            AppDestination.Expenses -> ExpensesScreen(
                                containerViewModel("expenses-$tzKey") {
                                    ExpensesViewModel(it.shopRepository, dates, session.isAdmin, canEdit)
                                },
                            )
                            AppDestination.Reports -> ReportsScreen(
                                containerViewModel { ReportsViewModel(it.shopRepository) },
                            )
                            AppDestination.Activity -> ActivityScreen(
                                containerViewModel("activity-$tzKey") { ActivityViewModel(it.shopRepository, dates) },
                            )
                            AppDestination.Notifications -> NotificationsScreen(
                                containerViewModel("notifications-$tzKey") {
                                    NotificationsViewModel(it.shopRepository, it.notificationCenter, dates)
                                },
                            )
                            AppDestination.Settings -> SettingsScreen(
                                viewModel = containerViewModel("settings-$tzKey") {
                                    SettingsViewModel(it.shopRepository, it.authRepository, it.sessionManager, dates, canEdit)
                                },
                                team = containerViewModel {
                                    TeamViewModel(it.shopRepository, session.user?.id, session.isAdmin, canEdit)
                                },
                                session = session,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
internal fun CountBadge(count: Int) {
    Badge(containerColor = ChartShopColors.Coral) {
        Text(if (count > 99) "99+" else count.toString())
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ShellTopBar(
    session: SessionState.SignedIn,
    current: AppDestination,
    badge: Int,
    onBack: (() -> Unit)?,
    onNotifications: () -> Unit,
) {
    TopAppBar(
        colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background),
        navigationIcon = {
            if (onBack != null) {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                }
            }
        },
        title = {
            Column {
                Text(
                    text = if (current == AppDestination.Home) session.shop.businessName else current.label,
                    style = MaterialTheme.typography.titleLarge,
                    color = ChartShopColors.Maroon,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                if (current == AppDestination.Home) {
                    Text(
                        text = "@${session.username}",
                        style = MaterialTheme.typography.bodySmall,
                        color = ChartShopColors.TextSecondary,
                    )
                }
            }
        },
        actions = {
            if (current != AppDestination.Notifications) {
                IconButton(onClick = onNotifications) {
                    val description = if (badge > 0) "Notifications, $badge unread" else "Notifications"
                    BadgedBox(badge = { if (badge > 0) CountBadge(badge) }) {
                        Icon(Icons.Outlined.Notifications, contentDescription = description)
                    }
                }
            }
        },
    )
}

private fun NavController.navigateToTab(tab: AppDestination) {
    navigate(tab.route) {
        popUpTo(graph.findStartDestination().id) { saveState = true }
        launchSingleTop = true
        restoreState = true
    }
}
