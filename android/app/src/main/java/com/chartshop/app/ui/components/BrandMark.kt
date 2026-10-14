package com.chartshop.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import com.chartshop.app.ui.theme.ChartShopColors

/** ChartShop logo tile — "CS" monogram on the coral→maroon gradient. */
@Composable
fun BrandMark(modifier: Modifier = Modifier, size: Dp = 40.dp) {
    Box(
        modifier = modifier
            .size(size)
            .background(Brush.linearGradient(listOf(ChartShopColors.Coral, ChartShopColors.Maroon))),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = "CS",
            color = Color.White,
            fontWeight = FontWeight.Bold,
            fontSize = (size.value * 0.38f).coerceAtLeast(10f).sp,
            letterSpacing = (-0.02).em,
        )
    }
}
