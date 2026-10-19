package com.chartshop.app.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.chartshop.app.ui.theme.ChartShopColors
import kotlin.math.max
import kotlin.math.roundToInt

/* Compose versions of frontend/src/components/charts/SimpleCharts.tsx. */

data class ChartPoint(val label: String, val value: Double, val color: Color = ChartShopColors.Primary)

/** Mix colours for the donut, in the web's order. */
val ChartPalette = listOf(Color(0xFF8B1E3A), Color(0xFFC43B5A), Color(0xFFE85A4F), Color(0xFFF5A07A), Color(0xFFF59E0B))

@Composable
private fun ChartEmpty(text: String, height: Dp = 180.dp) {
    Box(Modifier.fillMaxWidth().height(height), contentAlignment = Alignment.Center) {
        Text(text, color = ChartShopColors.TextMuted, fontSize = 14.sp)
    }
}

/** Vertical bars that scroll sideways when there are many; tap a bar to read its value. */
@Composable
fun BarChart(
    data: List<ChartPoint>,
    formatValue: (Double) -> String,
    modifier: Modifier = Modifier,
    height: Dp = 220.dp,
    color: Color = ChartShopColors.Primary,
) {
    if (data.isEmpty()) return ChartEmpty("No data for this period", height)
    val maxValue = max(data.maxOf { it.value }, 1.0)
    var selected by remember(data) { mutableStateOf<Int?>(null) }
    val slot = if (data.size > 10) 36.dp else 42.dp
    val barHeight = height - 16.dp - 36.dp

    Column(modifier.fillMaxWidth()) {
        Text(
            selected?.let { "${data[it].label}: ${formatValue(data[it].value)}" } ?: "Tap a bar for its value",
            modifier = Modifier.height(16.dp),
            color = if (selected != null) ChartShopColors.Maroon else ChartShopColors.TextMuted,
            fontSize = 12.sp,
            fontWeight = if (selected != null) FontWeight.SemiBold else FontWeight.Normal,
        )
        Box(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), contentAlignment = Alignment.Center) {
            Row(Modifier.padding(horizontal = 12.dp)) {
                data.forEachIndexed { index, point ->
                    val fraction = (point.value / maxValue).toFloat().coerceIn(0f, 1f)
                    Column(
                        Modifier
                            .width(slot)
                            .clickable { selected = if (selected == index) null else index },
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Box(Modifier.height(barHeight).fillMaxWidth(), contentAlignment = Alignment.BottomCenter) {
                            Box(
                                Modifier
                                    .width(minOf(28.dp, slot - 8.dp))
                                    .height(max(barHeight.value * fraction, 1f).dp)
                                    .alpha(if (selected == null || selected == index) 0.92f else 0.45f)
                                    .background(color),
                            )
                        }
                        Text(
                            point.label,
                            modifier = Modifier.height(36.dp).padding(top = 10.dp),
                            color = ChartShopColors.TextSecondary,
                            fontSize = 11.sp,
                            maxLines = 1,
                            textAlign = TextAlign.Center,
                        )
                    }
                }
            }
        }
    }
}

/** Labelled progress bars, longest first as given. */
@Composable
fun HorizontalBars(
    data: List<ChartPoint>,
    formatValue: (Double) -> String,
    modifier: Modifier = Modifier,
    color: Color = ChartShopColors.Primary,
) {
    if (data.isEmpty()) return ChartEmpty("No data for this period")
    val maxValue = max(data.maxOf { it.value }, 1.0)
    Column(modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        data.forEach { point ->
            Column {
                Row(Modifier.fillMaxWidth().padding(bottom = 4.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(
                        point.label,
                        modifier = Modifier.weight(1f),
                        color = ChartShopColors.TextPrimary,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(formatValue(point.value), color = ChartShopColors.TextSecondary, fontSize = 13.sp)
                }
                Box(Modifier.fillMaxWidth().height(8.dp).background(ChartShopColors.PrimaryTint)) {
                    Box(
                        Modifier
                            .fillMaxWidth(max((point.value / maxValue).toFloat(), 0.02f).coerceAtMost(1f))
                            .fillMaxHeight()
                            .background(color),
                    )
                }
            }
        }
    }
}

/** Ring chart with the total in the middle and a percentage legend. */
@Composable
fun DonutChart(
    data: List<ChartPoint>,
    modifier: Modifier = Modifier,
    centerValue: String? = null,
    centerLabel: String? = null,
) {
    val total = data.sumOf { it.value }
    if (total <= 0) return ChartEmpty("No sales mix yet")
    Row(
        modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(140.dp), contentAlignment = Alignment.Center) {
            Canvas(Modifier.size(140.dp)) {
                val stroke = 18.dp.toPx()
                val diameter = size.minDimension - stroke
                var start = -90f
                data.forEach { point ->
                    val sweep = (point.value / total * 360).toFloat()
                    drawArc(
                        color = point.color,
                        startAngle = start,
                        sweepAngle = sweep,
                        useCenter = false,
                        topLeft = Offset(stroke / 2, stroke / 2),
                        size = Size(diameter, diameter),
                        style = Stroke(width = stroke),
                    )
                    start += sweep
                }
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                if (centerValue != null) {
                    Text(
                        centerValue,
                        color = ChartShopColors.TextPrimary,
                        fontSize = if (centerValue.length > 8) 13.sp else 16.sp,
                        fontWeight = FontWeight.Bold,
                    )
                }
                if (centerLabel != null) Text(centerLabel, color = ChartShopColors.TextSecondary, fontSize = 11.sp)
            }
        }
        Column(Modifier.weight(1f).heightIn(min = 1.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            data.forEach { point ->
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Box(Modifier.size(10.dp).background(point.color))
                    Text(
                        point.label,
                        modifier = Modifier.weight(1f),
                        color = ChartShopColors.TextPrimary,
                        fontSize = 13.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text("${(point.value / total * 100).roundToInt()}%", color = ChartShopColors.TextMuted, fontSize = 13.sp)
                }
            }
        }
    }
}
