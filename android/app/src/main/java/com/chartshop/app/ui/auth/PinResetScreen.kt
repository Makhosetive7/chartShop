package com.chartshop.app.ui.auth

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chartshop.app.ui.components.AuthScaffold
import com.chartshop.app.ui.components.Banner
import com.chartshop.app.ui.components.BannerTone
import com.chartshop.app.ui.components.FooterLink
import com.chartshop.app.ui.components.PrimaryButton
import com.chartshop.app.ui.components.SlowServerHint
import com.chartshop.app.ui.theme.ChartShopColors

@Composable
fun PinResetScreen(
    viewModel: PinResetViewModel,
    onSignIn: () -> Unit,
    onBack: () -> Unit,
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val recovery = state.mode == PinResetMode.Recovery

    BackHandler(enabled = state.step == PinResetUiState.Step.Pin && !state.loading) {
        viewModel.backToDetails()
    }

    when (state.step) {
        PinResetUiState.Step.Details -> AuthScaffold(
            eyebrow = if (recovery) "Forgot PIN" else "Team invite",
            title = if (recovery) "Reset with a recovery code" else "Set your PIN",
            lead = if (recovery) {
                "Use one of the codes you saved when the shop was registered. Each code works once."
            } else {
                "Enter your username and the one-time setup code from your shop admin."
            },
            onBack = onBack,
            footer = { FooterLink("Remembered it?", "Sign in", onSignIn) },
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                state.error?.let { Banner(it, BannerTone.Error) }
                OutlinedTextField(
                    value = state.username,
                    onValueChange = viewModel::onUsernameChange,
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Username") },
                    prefix = { Text("@") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(
                        capitalization = KeyboardCapitalization.None,
                        autoCorrectEnabled = false,
                        keyboardType = KeyboardType.Ascii,
                        imeAction = ImeAction.Next,
                    ),
                )
                OutlinedTextField(
                    value = state.code,
                    onValueChange = viewModel::onCodeChange,
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text(if (recovery) "Recovery code" else "Setup code") },
                    placeholder = { Text("cs-a3k9-m2pq") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(
                        capitalization = KeyboardCapitalization.None,
                        autoCorrectEnabled = false,
                        keyboardType = KeyboardType.Password,
                        imeAction = ImeAction.Done,
                    ),
                    keyboardActions = KeyboardActions(onDone = { viewModel.continueToPin() }),
                )
                PrimaryButton(
                    text = "Continue",
                    onClick = viewModel::continueToPin,
                    enabled = state.username.isNotBlank() && state.code.isNotBlank(),
                )
            }
        }

        PinResetUiState.Step.Pin -> AuthScaffold(
            eyebrow = if (recovery) "Forgot PIN" else "Team invite",
            title = "Choose your new PIN",
            lead = "For @${state.username}.",
            onBack = if (state.loading) null else viewModel::backToDetails,
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                SlowServerHint(state.slow)
                NewPinStep(
                    state = state.pin,
                    enabled = !state.loading,
                    onEntryChange = viewModel::onPinEntry,
                    onComplete = viewModel::onPinComplete,
                )
                if (state.loading) {
                    Text(
                        "Saving your PIN…",
                        style = MaterialTheme.typography.bodyMedium,
                        color = ChartShopColors.TextSecondary,
                    )
                }
            }
        }

        PinResetUiState.Step.Done -> AuthScaffold(
            eyebrow = "All set",
            title = "Your PIN is ready",
            lead = state.doneMessage ?: "Sign in with @${state.username} and your new PIN.",
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                if (recovery) {
                    if (state.mustRegenerate) {
                        Banner(
                            "That was your last recovery code. After signing in, an admin should issue new codes " +
                                "in Settings.",
                            BannerTone.Warning,
                        )
                    } else {
                        state.remainingCodes?.let { remaining ->
                            Banner(
                                "$remaining recovery ${if (remaining == 1) "code" else "codes"} left. " +
                                    "Cross off the one you used.",
                                BannerTone.Info,
                            )
                        }
                    }
                }
                PrimaryButton(text = "Sign in", onClick = onSignIn)
            }
        }
    }
}
