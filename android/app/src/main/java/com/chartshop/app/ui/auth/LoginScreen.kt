package com.chartshop.app.ui.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chartshop.app.ui.components.AuthScaffold
import com.chartshop.app.ui.components.Banner
import com.chartshop.app.ui.components.BannerTone
import com.chartshop.app.ui.components.FooterLink
import com.chartshop.app.ui.components.PinEntry
import com.chartshop.app.ui.components.PrimaryButton
import com.chartshop.app.ui.components.SlowServerHint
import com.chartshop.app.ui.theme.ChartShopColors

@Composable
fun LoginScreen(
    viewModel: LoginViewModel,
    onRegister: () -> Unit,
    onRecover: () -> Unit,
    onSetupPin: (username: String?) -> Unit,
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    LaunchedEffect(viewModel) {
        viewModel.events.collect { event ->
            when (event) {
                is LoginEvent.MustSetPin -> onSetupPin(event.username)
            }
        }
    }

    AuthScaffold(
        eyebrow = "Welcome back",
        title = "Open the till again",
        lead = when (state.step) {
            LoginUiState.Step.Username -> "Sign in with your username and PIN."
            LoginUiState.Step.Pin -> "Enter your 4-digit PIN."
        },
        onBack = if (state.step == LoginUiState.Step.Pin && state.rememberedUsername == null) {
            viewModel::changeUser
        } else {
            null
        },
        footer = {
            FooterLink("New shop?", "Register ChartShop", onRegister)
            FooterLink("Forgot PIN?", "Use a recovery code", onRecover)
            FooterLink("Invited to a team?", "Set your PIN") { onSetupPin(null) }
        },
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            state.notice?.let { Banner(it, BannerTone.Info) }
            state.error?.let { Banner(it, BannerTone.Error) }
            SlowServerHint(state.slow)

            when (state.step) {
                LoginUiState.Step.Username -> UsernameStep(
                    username = state.usernameInput,
                    onUsernameChange = viewModel::onUsernameChange,
                    onContinue = viewModel::continueToPin,
                )
                LoginUiState.Step.Pin -> PinStep(
                    state = state,
                    onPinChange = viewModel::onPinChange,
                    onSubmit = viewModel::submit,
                    onChangeUser = viewModel::changeUser,
                )
            }
        }
    }
}

@Composable
private fun UsernameStep(
    username: String,
    onUsernameChange: (String) -> Unit,
    onContinue: () -> Unit,
) {
    OutlinedTextField(
        value = username,
        onValueChange = onUsernameChange,
        modifier = Modifier.fillMaxWidth(),
        label = { Text("Username") },
        supportingText = { Text("Your personal login — same on web, Telegram, and WhatsApp") },
        singleLine = true,
        keyboardOptions = KeyboardOptions(
            capitalization = KeyboardCapitalization.None,
            autoCorrectEnabled = false,
            keyboardType = KeyboardType.Ascii,
            imeAction = ImeAction.Next,
        ),
        keyboardActions = KeyboardActions(onNext = { onContinue() }),
    )
    PrimaryButton(text = "Continue", onClick = onContinue, enabled = username.isNotBlank())
}

@Composable
private fun PinStep(
    state: LoginUiState,
    onPinChange: (String) -> Unit,
    onSubmit: (String) -> Unit,
    onChangeUser: () -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(
            "@${state.activeUsername}",
            style = MaterialTheme.typography.titleMedium,
            color = ChartShopColors.Maroon,
        )
        TextButton(onClick = onChangeUser, enabled = !state.loading) {
            Text(if (state.rememberedUsername != null) "Not you?" else "Change")
        }
    }
    Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
        PinEntry(
            value = state.pin,
            onValueChange = onPinChange,
            onComplete = onSubmit,
            enabled = !state.loading,
            isError = state.error != null,
        )
        if (state.loading) {
            Text(
                "Signing in…",
                modifier = Modifier.fillMaxWidth().padding(top = 16.dp),
                style = MaterialTheme.typography.bodyMedium,
                color = ChartShopColors.TextSecondary,
                textAlign = TextAlign.Center,
            )
        }
    }
}
