package com.chartshop.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.chartshop.app.ui.theme.ChartShopColors

@Composable
fun AuthScaffold(
    eyebrow: String,
    title: String,
    modifier: Modifier = Modifier,
    lead: String? = null,
    onBack: (() -> Unit)? = null,
    footer: @Composable ColumnScope.() -> Unit = {},
    content: @Composable ColumnScope.() -> Unit,
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .safeDrawingPadding()
            .imePadding(),
        contentAlignment = Alignment.TopCenter,
    ) {
        Column(
            modifier = Modifier
                .widthIn(max = 480.dp)
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 32.dp, vertical = 16.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (onBack != null) {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                    Spacer(Modifier.width(4.dp))
                }
                BrandMark(size = 36.dp)
                Spacer(Modifier.width(10.dp))
                Text(
                    "ChartShop",
                    style = MaterialTheme.typography.titleMedium,
                    color = ChartShopColors.Maroon,
                )
            }
            Spacer(Modifier.height(32.dp))
            Text(
                eyebrow.uppercase(),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.primary,
            )
            Spacer(Modifier.height(6.dp))
            Text(title, style = MaterialTheme.typography.headlineMedium, color = ChartShopColors.Maroon)
            if (lead != null) {
                Spacer(Modifier.height(8.dp))
                Text(lead, style = MaterialTheme.typography.bodyLarge, color = ChartShopColors.TextSecondary)
            }
            Spacer(Modifier.height(28.dp))
            content()
            Spacer(Modifier.height(32.dp))
            footer()
        }
    }
}

@Composable
fun PrimaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    loading: Boolean = false,
) {
    Button(
        onClick = onClick,
        enabled = enabled && !loading,
        modifier = modifier.fillMaxWidth().heightIn(min = 52.dp),
        shape = MaterialTheme.shapes.small,
    ) {
        if (loading) {
            CircularProgressIndicator(
                modifier = Modifier.size(18.dp),
                strokeWidth = 2.dp,
                color = MaterialTheme.colorScheme.onPrimary,
            )
            Spacer(Modifier.width(10.dp))
        }
        Text(text)
    }
}

@Composable
fun FooterLink(prompt: String, label: String, onClick: () -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(prompt, style = MaterialTheme.typography.bodyMedium, color = ChartShopColors.TextSecondary)
        TextButton(onClick = onClick) { Text(label) }
    }
}

enum class BannerTone { Error, Info, Success, Warning }

@Composable
fun Banner(message: String, tone: BannerTone, modifier: Modifier = Modifier) {
    val (background, foreground) = when (tone) {
        BannerTone.Error -> ChartShopColors.DangerTint to ChartShopColors.Danger
        BannerTone.Info -> ChartShopColors.InfoTint to Color(0xFF1D4ED8)
        BannerTone.Success -> ChartShopColors.SuccessTint to Color(0xFF15803D)
        BannerTone.Warning -> ChartShopColors.WarningTint to Color(0xFFB45309)
    }
    Text(
        text = message,
        modifier = modifier
            .fillMaxWidth()
            .background(background)
            .padding(horizontal = 14.dp, vertical = 12.dp)
            .semantics { liveRegion = LiveRegionMode.Polite },
        color = foreground,
        style = MaterialTheme.typography.bodyMedium,
    )
}

/** Shown while a request is slow, which on Render's free tier usually means the server is waking up. */
@Composable
fun SlowServerHint(visible: Boolean, modifier: Modifier = Modifier) {
    if (!visible) return
    Banner(
        message = "Waking up the server… this can take up to 30 seconds after a quiet spell.",
        tone = BannerTone.Info,
        modifier = modifier,
    )
}

@Composable
fun FormSpacing(content: @Composable ColumnScope.() -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp), content = content)
}
