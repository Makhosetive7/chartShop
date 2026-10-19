package com.chartshop.app.ui.shell

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.automirrored.outlined.OpenInNew
import androidx.compose.material.icons.outlined.Description
import androidx.compose.material.icons.outlined.PrivacyTip
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.ListItemDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chartshop.app.data.session.SessionState
import com.chartshop.app.ui.containerViewModel
import com.chartshop.app.ui.theme.ChartShopColors
import com.chartshop.app.ui.welcome.LegalLinks
import com.chartshop.app.ui.welcome.openSafely

@Composable
fun MoreScreen(
    session: SessionState.SignedIn,
    badge: Int,
    onOpen: (AppDestination) -> Unit,
) {
    val account = containerViewModel { AccountViewModel(it.authRepository) }
    val signingOut by account.signingOut.collectAsStateWithLifecycle()
    var confirmSignOut by rememberSaveable { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
    ) {
        AccountCard(session)
        Spacer(Modifier.height(16.dp))
        Column(Modifier.background(ChartShopColors.Surface).border(1.dp, ChartShopColors.Border)) {
            AppDestination.moreItems.forEachIndexed { index, destination ->
                if (index > 0) HorizontalDivider(color = ChartShopColors.Border)
                ListItem(
                    modifier = Modifier.clickable { onOpen(destination) },
                    colors = ListItemDefaults.colors(containerColor = Color.Transparent),
                    leadingContent = {
                        Icon(destination.icon, contentDescription = null, tint = ChartShopColors.Primary)
                    },
                    headlineContent = { Text(destination.label) },
                    trailingContent = {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            if (destination == AppDestination.Notifications && badge > 0) CountBadge(badge)
                            Icon(Icons.AutoMirrored.Outlined.KeyboardArrowRight, contentDescription = null)
                        }
                    },
                )
            }
        }
        Spacer(Modifier.height(16.dp))
        LegalLinksCard()
        Spacer(Modifier.height(24.dp))
        OutlinedButton(
            onClick = { confirmSignOut = true },
            enabled = !signingOut,
            modifier = Modifier.fillMaxWidth().height(52.dp),
            shape = MaterialTheme.shapes.small,
            border = BorderStroke(1.dp, ChartShopColors.Danger),
            colors = ButtonDefaults.outlinedButtonColors(contentColor = ChartShopColors.Danger),
        ) {
            Icon(Icons.AutoMirrored.Outlined.Logout, contentDescription = null)
            Spacer(Modifier.width(8.dp))
            Text(if (signingOut) "Signing out…" else "Sign out")
        }
        Text(
            "Signing out here doesn't affect the web, Telegram, or WhatsApp.",
            modifier = Modifier.padding(top = 8.dp),
            style = MaterialTheme.typography.bodySmall,
            color = ChartShopColors.TextMuted,
        )
    }

    if (confirmSignOut) {
        AlertDialog(
            onDismissRequest = { confirmSignOut = false },
            title = { Text("Sign out of ChartShop?") },
            text = { Text("You'll need your PIN to get back in on this phone.") },
            confirmButton = {
                TextButton(onClick = {
                    confirmSignOut = false
                    account.signOut()
                }) { Text("Sign out", color = ChartShopColors.Danger) }
            },
            dismissButton = {
                TextButton(onClick = { confirmSignOut = false }) { Text("Cancel") }
            },
        )
    }
}

@Composable
private fun LegalLinksCard() {
    val uriHandler = LocalUriHandler.current
    val links = listOf(
        Triple(Icons.Outlined.PrivacyTip, "Privacy Policy", LegalLinks.PRIVACY_URL),
        Triple(Icons.Outlined.Description, "Terms and Conditions", LegalLinks.TERMS_URL),
    )
    Column(Modifier.background(ChartShopColors.Surface).border(1.dp, ChartShopColors.Border)) {
        links.forEachIndexed { index, (icon, label, url) ->
            if (index > 0) HorizontalDivider(color = ChartShopColors.Border)
            ListItem(
                modifier = Modifier.clickable { uriHandler.openSafely(url) },
                colors = ListItemDefaults.colors(containerColor = Color.Transparent),
                leadingContent = { Icon(icon, contentDescription = null, tint = ChartShopColors.TextSecondary) },
                headlineContent = { Text(label) },
                trailingContent = {
                    Icon(Icons.AutoMirrored.Outlined.OpenInNew, contentDescription = "Opens in browser")
                },
            )
        }
    }
}

@Composable
private fun AccountCard(session: SessionState.SignedIn) {
    val user = session.user
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(ChartShopColors.Surface)
            .border(1.dp, ChartShopColors.Border)
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier.size(48.dp).background(ChartShopColors.Maroon),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = (user?.displayName?.ifBlank { null } ?: session.username).take(1).uppercase(),
                color = Color.White,
                style = MaterialTheme.typography.titleLarge,
            )
        }
        Spacer(Modifier.width(14.dp))
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(session.shop.businessName, style = MaterialTheme.typography.titleMedium, color = ChartShopColors.Maroon)
            Text(
                "@${session.username}",
                style = MaterialTheme.typography.bodyMedium,
                color = ChartShopColors.TextSecondary,
            )
            Text(
                linkedChannels(session),
                style = MaterialTheme.typography.bodySmall,
                color = ChartShopColors.TextMuted,
            )
        }
        Text(
            text = if (session.isAdmin) "ADMIN" else "MEMBER",
            modifier = Modifier
                .background(if (session.isAdmin) ChartShopColors.PrimaryTint else ChartShopColors.PeachSoft)
                .padding(horizontal = 8.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Bold,
            color = ChartShopColors.Primary,
        )
    }
}

private fun linkedChannels(session: SessionState.SignedIn): String {
    val channels = session.user?.channels ?: session.shop.channels
    val linked = buildList {
        if (channels.telegramLinked) add("Telegram")
        if (channels.whatsappLinked) add("WhatsApp")
    }
    return if (linked.isEmpty()) "No chat channels linked" else "Linked: ${linked.joinToString(" · ")}"
}
