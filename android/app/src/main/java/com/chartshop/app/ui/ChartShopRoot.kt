package com.chartshop.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chartshop.app.data.consent.ConsentState
import com.chartshop.app.data.session.SessionState
import com.chartshop.app.ui.auth.AuthNavHost
import com.chartshop.app.ui.components.BrandMark
import com.chartshop.app.ui.shell.MainShell
import com.chartshop.app.ui.welcome.WelcomeScreen

@Composable
fun ChartShopRoot() {
    val container = appContainer()
    val session by container.sessionManager.state.collectAsStateWithLifecycle()
    val consent by container.legalConsent.state.collectAsStateWithLifecycle()

    val current = session
    when {
        current == SessionState.Loading || consent == ConsentState.Loading -> Splash()
        consent == ConsentState.Required -> WelcomeScreen(onAgree = container.legalConsent::accept)
        current is SessionState.SignedOut -> AuthNavHost()
        current is SessionState.SignedIn -> MainShell(current)
    }
}

@Composable
private fun Splash() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentAlignment = Alignment.Center,
    ) {
        BrandMark(size = 72.dp)
    }
}
