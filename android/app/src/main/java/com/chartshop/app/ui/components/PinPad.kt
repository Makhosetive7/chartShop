package com.chartshop.app.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Backspace
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.chartshop.app.domain.PinRules
import com.chartshop.app.ui.theme.ChartShopColors

@Composable
fun PinDots(
    filled: Int,
    modifier: Modifier = Modifier,
    isError: Boolean = false,
) {
    val color = if (isError) ChartShopColors.Danger else MaterialTheme.colorScheme.primary
    Row(
        modifier = modifier.semantics { contentDescription = "$filled of ${PinRules.LENGTH} digits entered" },
        horizontalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        repeat(PinRules.LENGTH) { index ->
            Box(
                modifier = Modifier
                    .size(16.dp)
                    .border(2.dp, color)
                    .background(if (index < filled) color else ChartShopColors.Surface),
            )
        }
    }
}

/**
 * Four-digit PIN entry with an on-screen keypad. Calls [onComplete] as soon as the fourth digit is entered.
 * There is no text field, so the PIN can't be pasted or captured by a keyboard app.
 */
@Composable
fun PinEntry(
    value: String,
    onValueChange: (String) -> Unit,
    onComplete: (String) -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    isError: Boolean = false,
) {
    val haptics = LocalHapticFeedback.current

    fun press(digit: Char) {
        if (!enabled || value.length >= PinRules.LENGTH) return
        haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove)
        val next = value + digit
        onValueChange(next)
        if (next.length == PinRules.LENGTH) onComplete(next)
    }

    fun backspace() {
        if (!enabled || value.isEmpty()) return
        onValueChange(value.dropLast(1))
    }

    Column(
        modifier = modifier.widthIn(max = 320.dp).fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        PinDots(filled = value.length, isError = isError)
        Spacer(Modifier.height(28.dp))
        val rows = listOf("123", "456", "789")
        rows.forEach { row ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                row.forEach { digit ->
                    PinKey(Modifier.weight(1f), enabled, onClick = { press(digit) }) {
                        Text(digit.toString(), style = MaterialTheme.typography.headlineSmall)
                    }
                }
            }
            Spacer(Modifier.height(12.dp))
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Spacer(Modifier.weight(1f))
            PinKey(Modifier.weight(1f), enabled, onClick = { press('0') }) {
                Text("0", style = MaterialTheme.typography.headlineSmall)
            }
            PinKey(Modifier.weight(1f), enabled && value.isNotEmpty(), onClick = ::backspace, outlined = false) {
                Icon(Icons.AutoMirrored.Outlined.Backspace, contentDescription = "Delete digit")
            }
        }
    }
}

@Composable
private fun PinKey(
    modifier: Modifier,
    enabled: Boolean,
    onClick: () -> Unit,
    outlined: Boolean = true,
    content: @Composable () -> Unit,
) {
    Surface(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.aspectRatio(1.6f),
        color = if (outlined) ChartShopColors.Surface else ChartShopColors.Cream,
        contentColor = if (enabled) MaterialTheme.colorScheme.onSurface else ChartShopColors.TextMuted,
        border = if (outlined) BorderStroke(1.dp, ChartShopColors.Border) else null,
    ) {
        Box(contentAlignment = Alignment.Center) { content() }
    }
}
