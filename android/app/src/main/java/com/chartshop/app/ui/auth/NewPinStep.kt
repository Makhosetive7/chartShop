package com.chartshop.app.ui.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.chartshop.app.ui.components.Banner
import com.chartshop.app.ui.components.BannerTone
import com.chartshop.app.ui.components.PinEntry
import com.chartshop.app.ui.theme.ChartShopColors

@Composable
fun NewPinStep(
    state: NewPinState,
    enabled: Boolean,
    onEntryChange: (String) -> Unit,
    onComplete: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        if (state.mismatch) {
            Banner("Those PINs didn't match. Choose your PIN again.", BannerTone.Error)
        }
        Text(
            text = when (state.stage) {
                NewPinState.Stage.Choose -> "Choose a 4-digit PIN"
                NewPinState.Stage.Confirm -> "Enter the same PIN again"
            },
            style = MaterialTheme.typography.titleMedium,
            color = ChartShopColors.Maroon,
        )
        PinEntry(
            value = state.entry,
            onValueChange = onEntryChange,
            onComplete = onComplete,
            enabled = enabled,
            isError = state.mismatch,
        )
    }
}
