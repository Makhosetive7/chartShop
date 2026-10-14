package com.chartshop.app.ui.welcome

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Devices
import androidx.compose.material.icons.outlined.Groups
import androidx.compose.material.icons.outlined.Inventory2
import androidx.compose.material.icons.outlined.PointOfSale
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.LinkAnnotation
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextLinkStyles
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withLink
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.chartshop.app.ui.components.Banner
import com.chartshop.app.ui.components.BannerTone
import com.chartshop.app.ui.components.BrandMark
import com.chartshop.app.ui.components.PrimaryButton
import com.chartshop.app.ui.theme.ChartShopColors
import com.chartshop.app.ui.theme.ChartShopTheme

private data class Highlight(val icon: ImageVector, val title: String, val body: String)

private val highlights = listOf(
    Highlight(Icons.Outlined.PointOfSale, "Sell in seconds", "Ring up sales and see today’s takings at a glance."),
    Highlight(Icons.Outlined.Inventory2, "Know your stock", "Low-stock alerts before the shelves run empty."),
    Highlight(Icons.Outlined.Groups, "Credit that adds up", "Customer balances, lay-byes and payments in one place."),
    Highlight(Icons.Outlined.Devices, "One shop, everywhere", "The same books on Android, the web and Telegram, shared with your team."),
)

/** First-launch screen: what ChartShop is, plus acceptance of the Privacy Policy and Terms. */
@Composable
fun WelcomeScreen(onAgree: () -> Unit) {
    var linkFailed by rememberSaveable { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .safeDrawingPadding(),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Column(
            modifier = Modifier
                .weight(1f)
                .widthIn(max = 480.dp)
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(Modifier.height(40.dp))
            Hero()
            Spacer(Modifier.height(32.dp))
            Text(
                "Welcome to ChartShop",
                style = MaterialTheme.typography.headlineMedium,
                color = ChartShopColors.Maroon,
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(10.dp))
            Text(
                "The till in your pocket. Record sales, track stock and keep customer credit straight, built for small shops that move fast.",
                style = MaterialTheme.typography.bodyLarge,
                color = ChartShopColors.TextSecondary,
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(28.dp))
            Column(verticalArrangement = Arrangement.spacedBy(18.dp)) {
                highlights.forEach { HighlightRow(it) }
            }
            Spacer(Modifier.height(24.dp))
        }

        Column(
            modifier = Modifier
                .widthIn(max = 480.dp)
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            linkFailed?.let { url ->
                Banner("No browser found. Visit $url to read it.", BannerTone.Warning)
                Spacer(Modifier.height(12.dp))
            }
            LegalNotice(onLinkFailed = { linkFailed = it })
            Spacer(Modifier.height(16.dp))
            PrimaryButton(text = "Agree and continue", onClick = onAgree)
        }
    }
}

@Composable
private fun Hero() {
    Box(
        modifier = Modifier
            .size(200.dp)
            .background(ChartShopColors.PeachSoft),
        contentAlignment = Alignment.Center,
    ) {
        Box(
            modifier = Modifier
                .size(140.dp)
                .background(ChartShopColors.Peach),
            contentAlignment = Alignment.Center,
        ) {
            BrandMark(size = 88.dp)
        }
    }
}

@Composable
private fun HighlightRow(highlight: Highlight) {
    Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .background(ChartShopColors.PrimaryTint),
            contentAlignment = Alignment.Center,
        ) {
            Icon(highlight.icon, contentDescription = null, tint = ChartShopColors.Maroon, modifier = Modifier.size(22.dp))
        }
        Spacer(Modifier.width(14.dp))
        Column {
            Text(highlight.title, style = MaterialTheme.typography.titleMedium, color = ChartShopColors.TextPrimary)
            Text(highlight.body, style = MaterialTheme.typography.bodyMedium, color = ChartShopColors.TextSecondary)
        }
    }
}

@Composable
private fun LegalNotice(onLinkFailed: (String) -> Unit) {
    val uriHandler = LocalUriHandler.current
    val linkStyles = TextLinkStyles(SpanStyle(color = ChartShopColors.Primary, fontWeight = FontWeight.SemiBold))
    val text = remember(uriHandler) {
        fun link(url: String) = LinkAnnotation.Url(url, linkStyles) {
            if (!uriHandler.openSafely(url)) onLinkFailed(url)
        }
        buildAnnotatedString {
            append("Read our ")
            withLink(link(LegalLinks.PRIVACY_URL)) { append("Privacy Policy") }
            append(". Tap “Agree and continue” to accept the ")
            withLink(link(LegalLinks.TERMS_URL)) { append("Terms and Conditions") }
            append(".")
        }
    }
    Text(
        text,
        style = MaterialTheme.typography.bodyMedium,
        color = ChartShopColors.TextSecondary,
        textAlign = TextAlign.Center,
    )
}

@Preview(showBackground = true, widthDp = 393, heightDp = 852)
@Composable
private fun WelcomeScreenPreview() {
    ChartShopTheme { WelcomeScreen(onAgree = {}) }
}
