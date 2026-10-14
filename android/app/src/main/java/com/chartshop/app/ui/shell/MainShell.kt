package com.chartshop.app.ui.shell

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.Notifications
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
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.navigation.NavController
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.chartshop.app.data.session.SessionState
import com.chartshop.app.ui.components.Banner
import com.chartshop.app.ui.components.BannerTone
import com.chartshop.app.ui.theme.ChartShopColors

@Composable
fun MainShell(session: SessionState.SignedIn) {
    val nav = rememberNavController()
    val backStackEntry by nav.currentBackStackEntryAsState()
    val current = AppDestination.fromRoute(backStackEntry?.destination?.route) ?: AppDestination.Home
    val isTab = current in AppDestination.tabs

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            ShellTopBar(
                session = session,
                current = current,
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
                        icon = { Icon(tab.icon, contentDescription = null) },
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
        Column(Modifier.padding(padding).fillMaxSize()) {
            if (session.shop.isDemo) {
                Banner("Demo shop — you can look around, but changes aren't saved.", BannerTone.Warning)
            }
            NavHost(navController = nav, startDestination = AppDestination.Home.route) {
                AppDestination.entries.forEach { destination ->
                    composable(destination.route) {
                        when (destination) {
                            AppDestination.More -> MoreScreen(
                                session = session,
                                onOpen = { nav.navigate(it.route) { launchSingleTop = true } },
                            )
                            else -> PlaceholderScreen(destination, session)
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ShellTopBar(
    session: SessionState.SignedIn,
    current: AppDestination,
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
                    Icon(Icons.Outlined.Notifications, contentDescription = "Notifications")
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
