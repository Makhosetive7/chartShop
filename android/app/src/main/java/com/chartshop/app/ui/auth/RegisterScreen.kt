package com.chartshop.app.ui.auth

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AssistChip
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
fun RegisterScreen(
    viewModel: RegisterViewModel,
    onSignIn: () -> Unit,
    onBack: () -> Unit,
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    // The account already exists at this point; leaving would lose the only view of the codes.
    BackHandler(enabled = state.step == RegisterUiState.Step.RecoveryCodes) {}
    BackHandler(enabled = state.step == RegisterUiState.Step.Pin && !state.loading) {
        viewModel.backToDetails()
    }

    when (state.step) {
        RegisterUiState.Step.Details -> AuthScaffold(
            eyebrow = "New shop",
            title = "Register ChartShop",
            lead = "One username and PIN for the app, web, Telegram, and WhatsApp.",
            onBack = onBack,
            footer = { FooterLink("Already registered?", "Sign in", onSignIn) },
        ) {
            DetailsForm(
                state = state,
                onBusinessNameChange = viewModel::onBusinessNameChange,
                onUsernameChange = viewModel::onUsernameChange,
                onDescriptionChange = viewModel::onDescriptionChange,
                onContinue = viewModel::continueToPin,
            )
        }

        RegisterUiState.Step.Pin -> AuthScaffold(
            eyebrow = "Step 2 of 2",
            title = "Lock the till",
            lead = "You'll use this PIN with @${state.username} everywhere you sign in.",
            onBack = if (state.loading) null else viewModel::backToDetails,
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                state.error?.let { Banner(it, BannerTone.Error) }
                SlowServerHint(state.slow)
                NewPinStep(
                    state = state.pin,
                    enabled = !state.loading,
                    onEntryChange = viewModel::onPinEntry,
                    onComplete = viewModel::onPinComplete,
                )
                if (state.loading) {
                    Text(
                        "Creating your shop…",
                        style = MaterialTheme.typography.bodyMedium,
                        color = ChartShopColors.TextSecondary,
                    )
                }
            }
        }

        RegisterUiState.Step.RecoveryCodes -> AuthScaffold(
            eyebrow = "Save these codes",
            title = "Your only free way to reset a lost PIN",
            lead = "Copy or share them now. ChartShop never shows recovery codes again.",
        ) {
            RecoveryCodesPanel(
                codes = state.pending?.recoveryCodes.orEmpty(),
                username = state.pending?.session?.username,
                saved = state.codesSaved,
                onSavedChange = viewModel::onCodesSavedChange,
                onContinue = viewModel::finish,
            )
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun DetailsForm(
    state: RegisterUiState,
    onBusinessNameChange: (String) -> Unit,
    onUsernameChange: (String) -> Unit,
    onDescriptionChange: (String) -> Unit,
    onContinue: () -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        state.error?.let { Banner(it, BannerTone.Error) }

        OutlinedTextField(
            value = state.businessName,
            onValueChange = onBusinessNameChange,
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Shop name") },
            singleLine = true,
            keyboardOptions = KeyboardOptions(
                capitalization = KeyboardCapitalization.Words,
                imeAction = ImeAction.Next,
            ),
        )

        val availability = state.availability
        OutlinedTextField(
            value = state.username,
            onValueChange = onUsernameChange,
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Username") },
            prefix = { Text("@") },
            singleLine = true,
            isError = availability is UsernameAvailability.Unavailable,
            supportingText = {
                when (availability) {
                    UsernameAvailability.Idle ->
                        Text("3–15 lowercase letters, digits only at the end")
                    UsernameAvailability.Checking -> Text("Checking availability…")
                    UsernameAvailability.Available ->
                        Text("Username is available", color = ChartShopColors.Success)
                    is UsernameAvailability.Unavailable -> Text(availability.message)
                }
            },
            keyboardOptions = KeyboardOptions(
                capitalization = KeyboardCapitalization.None,
                autoCorrectEnabled = false,
                keyboardType = KeyboardType.Ascii,
                imeAction = ImeAction.Next,
            ),
        )
        if (availability is UsernameAvailability.Unavailable && availability.suggestions.isNotEmpty()) {
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                availability.suggestions.forEach { suggestion ->
                    AssistChip(onClick = { onUsernameChange(suggestion) }, label = { Text("@$suggestion") })
                }
            }
        }

        OutlinedTextField(
            value = state.businessDescription,
            onValueChange = onDescriptionChange,
            modifier = Modifier.fillMaxWidth(),
            label = { Text("What do you sell? (optional)") },
            placeholder = { Text("General merchandise") },
            keyboardOptions = KeyboardOptions(
                capitalization = KeyboardCapitalization.Sentences,
                imeAction = ImeAction.Done,
            ),
        )

        PrimaryButton(
            text = "Continue",
            onClick = onContinue,
            enabled = state.businessName.isNotBlank() && state.username.isNotBlank(),
        )
    }
}
