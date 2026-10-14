package com.chartshop.app.ui.auth

import androidx.compose.runtime.Composable
import androidx.navigation.NavController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.toRoute
import com.chartshop.app.ui.containerViewModel
import kotlinx.serialization.Serializable

@Serializable
private data object LoginRoute

@Serializable
private data object RegisterRoute

@Serializable
private data object RecoverRoute

@Serializable
private data class SetupPinRoute(val username: String? = null)

@Composable
fun AuthNavHost() {
    val nav = rememberNavController()

    NavHost(navController = nav, startDestination = LoginRoute) {
        composable<LoginRoute> {
            LoginScreen(
                viewModel = containerViewModel { LoginViewModel(it.authRepository, it.sessionManager) },
                onRegister = { nav.navigate(RegisterRoute) },
                onRecover = { nav.navigate(RecoverRoute) },
                onSetupPin = { username -> nav.navigate(SetupPinRoute(username)) },
            )
        }
        composable<RegisterRoute> {
            RegisterScreen(
                viewModel = containerViewModel { RegisterViewModel(it.authRepository) },
                onSignIn = { nav.restartAtLogin() },
                onBack = { nav.popBackStack() },
            )
        }
        composable<RecoverRoute> {
            PinResetScreen(
                viewModel = containerViewModel { PinResetViewModel(it.authRepository, PinResetMode.Recovery, null) },
                onSignIn = { nav.restartAtLogin() },
                onBack = { nav.popBackStack() },
            )
        }
        composable<SetupPinRoute> { entry ->
            val route = entry.toRoute<SetupPinRoute>()
            PinResetScreen(
                viewModel = containerViewModel {
                    PinResetViewModel(it.authRepository, PinResetMode.Invite, route.username)
                },
                onSignIn = { nav.restartAtLogin() },
                onBack = { nav.popBackStack() },
            )
        }
    }
}

/** A fresh login screen picks up the username remembered by a recovery or invite setup. */
private fun NavController.restartAtLogin() {
    navigate(LoginRoute) {
        popUpTo(LoginRoute) { inclusive = true }
    }
}
