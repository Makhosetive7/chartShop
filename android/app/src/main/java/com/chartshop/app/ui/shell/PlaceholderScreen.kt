package com.chartshop.app.ui.shell

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.chartshop.app.data.session.SessionState
import com.chartshop.app.ui.theme.ChartShopColors

/** Stand-in for screens that arrive in later milestones of the Android app. */
@Composable
fun PlaceholderScreen(destination: AppDestination, session: SessionState.SignedIn) {
    Box(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            modifier = Modifier.widthIn(max = 420.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Box(
                modifier = Modifier.size(64.dp).background(ChartShopColors.PrimaryTint),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    destination.icon,
                    contentDescription = null,
                    tint = ChartShopColors.Primary,
                    modifier = Modifier.size(32.dp),
                )
            }
            if (destination == AppDestination.Home) {
                Text(
                    "Signed in as @${session.username}",
                    style = MaterialTheme.typography.titleMedium,
                    color = ChartShopColors.Maroon,
                )
            }
            Text(destination.label, style = MaterialTheme.typography.headlineSmall, color = ChartShopColors.Maroon)
            Text(
                destination.summary,
                style = MaterialTheme.typography.bodyLarge,
                color = ChartShopColors.TextSecondary,
                textAlign = TextAlign.Center,
            )
            Text(
                "Coming in milestone ${destination.milestone}. Until then, use the web app or Telegram for this.",
                style = MaterialTheme.typography.bodySmall,
                color = ChartShopColors.TextMuted,
                textAlign = TextAlign.Center,
            )
        }
    }
}
