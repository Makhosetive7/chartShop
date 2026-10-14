package com.chartshop.app.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp

/** Palette from frontend/src/styles/theme.ts. */
object ChartShopColors {
    val Primary = Color(0xFF8B1E3A)
    val PrimaryLight = Color(0xFFC43B5A)
    val PrimaryTint = Color(0xFFF8E8EC)
    val Secondary = Color(0xFFE85A4F)
    val Coral = Color(0xFFE8705A)
    val Peach = Color(0xFFF5D5C0)
    val PeachSoft = Color(0xFFFAE8DC)
    val Cream = Color(0xFFF7F1EB)
    val Maroon = Color(0xFF4A0E1C)
    val MaroonDeep = Color(0xFF3D0A16)

    val Success = Color(0xFF22C55E)
    val SuccessTint = Color(0xFFDCFCE7)
    val Warning = Color(0xFFF59E0B)
    val WarningTint = Color(0xFFFEF3C7)
    val Danger = Color(0xFFDC2626)
    val DangerTint = Color(0xFFFEE2E2)
    val Info = Color(0xFF3B82F6)
    val InfoTint = Color(0xFFDBEAFE)

    val TextPrimary = Color(0xFF1A0A0A)
    val TextSecondary = Color(0xFF6B5B5B)
    val TextMuted = Color(0xFF9A8A8A)
    val Border = Color(0xFFE8D9D0)
    val BorderStrong = Color(0xFFD4BDB0)
    val Surface = Color.White
}

private val colorScheme = lightColorScheme(
    primary = ChartShopColors.Primary,
    onPrimary = Color.White,
    primaryContainer = ChartShopColors.PrimaryTint,
    onPrimaryContainer = ChartShopColors.Maroon,
    secondary = ChartShopColors.Secondary,
    onSecondary = Color.White,
    secondaryContainer = ChartShopColors.PeachSoft,
    onSecondaryContainer = ChartShopColors.Maroon,
    tertiary = ChartShopColors.Coral,
    background = ChartShopColors.Cream,
    onBackground = ChartShopColors.TextPrimary,
    surface = ChartShopColors.Surface,
    onSurface = ChartShopColors.TextPrimary,
    surfaceVariant = ChartShopColors.PeachSoft,
    onSurfaceVariant = ChartShopColors.TextSecondary,
    surfaceContainer = ChartShopColors.Cream,
    surfaceContainerLow = ChartShopColors.Surface,
    surfaceContainerHigh = ChartShopColors.PeachSoft,
    outline = ChartShopColors.BorderStrong,
    outlineVariant = ChartShopColors.Border,
    error = ChartShopColors.Danger,
    onError = Color.White,
    errorContainer = ChartShopColors.DangerTint,
    onErrorContainer = ChartShopColors.Danger,
)

// The web app uses square corners everywhere (all radii are 0).
private val square = RoundedCornerShape(0.dp)
private val shapes = Shapes(
    extraSmall = square,
    small = square,
    medium = square,
    large = square,
    extraLarge = square,
)

private val base = Typography()
private val headingSpacing = (-0.02).em
private val typography = base.copy(
    displaySmall = base.displaySmall.copy(fontWeight = FontWeight.Bold, letterSpacing = headingSpacing),
    headlineLarge = base.headlineLarge.copy(fontWeight = FontWeight.Bold, letterSpacing = headingSpacing),
    headlineMedium = base.headlineMedium.copy(fontWeight = FontWeight.Bold, letterSpacing = headingSpacing),
    headlineSmall = base.headlineSmall.copy(fontWeight = FontWeight.Bold, letterSpacing = headingSpacing),
    titleLarge = base.titleLarge.copy(fontWeight = FontWeight.Bold, letterSpacing = headingSpacing),
    titleMedium = base.titleMedium.copy(fontWeight = FontWeight.SemiBold),
    labelLarge = base.labelLarge.copy(fontWeight = FontWeight.SemiBold),
    labelSmall = TextStyle(
        fontWeight = FontWeight.SemiBold,
        fontSize = 11.sp,
        lineHeight = 16.sp,
        letterSpacing = 0.12.em,
    ),
)

@Composable
fun ChartShopTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = colorScheme,
        shapes = shapes,
        typography = typography,
        content = content,
    )
}
