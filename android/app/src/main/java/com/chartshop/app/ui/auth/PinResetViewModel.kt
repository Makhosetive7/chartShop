package com.chartshop.app.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chartshop.app.data.api.ApiResult
import com.chartshop.app.data.auth.AuthRepository
import com.chartshop.app.domain.UsernameRules
import com.chartshop.app.ui.withSlowHint
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** Both flows trade a one-time `cs-xxxx-xxxx` code plus username for a new PIN. */
enum class PinResetMode { Recovery, Invite }

data class PinResetUiState(
    val mode: PinResetMode,
    val step: Step = Step.Details,
    val username: String = "",
    val code: String = "",
    val pin: NewPinState = NewPinState(),
    val loading: Boolean = false,
    val slow: Boolean = false,
    val error: String? = null,
    val doneMessage: String? = null,
    val remainingCodes: Int? = null,
    val mustRegenerate: Boolean = false,
) {
    enum class Step { Details, Pin, Done }
}

class PinResetViewModel(
    private val auth: AuthRepository,
    mode: PinResetMode,
    initialUsername: String?,
) : ViewModel() {

    private val _state = MutableStateFlow(
        PinResetUiState(mode = mode, username = UsernameRules.sanitizeLoginInput(initialUsername.orEmpty())),
    )
    val state: StateFlow<PinResetUiState> = _state.asStateFlow()

    fun onUsernameChange(value: String) {
        _state.update { it.copy(username = UsernameRules.sanitizeLoginInput(value), error = null) }
    }

    fun onCodeChange(value: String) {
        _state.update { it.copy(code = value.lowercase().filter { c -> c.isLetterOrDigit() || c == '-' }.take(16), error = null) }
    }

    fun continueToPin() {
        val current = _state.value
        val error = when {
            current.username.length < UsernameRules.MIN_LENGTH -> "Enter your username."
            current.code.count { it.isLetterOrDigit() } < CODE_MIN_CHARS -> when (current.mode) {
                PinResetMode.Recovery -> "Enter one of your recovery codes."
                PinResetMode.Invite -> "Enter the setup code your shop admin gave you."
            }
            else -> null
        }
        if (error != null) {
            _state.update { it.copy(error = error) }
            return
        }
        _state.update { it.copy(step = PinResetUiState.Step.Pin, pin = NewPinState(), error = null) }
    }

    fun backToDetails() {
        _state.update { it.copy(step = PinResetUiState.Step.Details, pin = NewPinState(), error = null) }
    }

    fun onPinEntry(value: String) {
        _state.update { it.copy(pin = it.pin.withEntry(value), error = null) }
    }

    fun onPinComplete(pin: String) {
        val (next, confirmed) = _state.value.pin.complete(pin)
        _state.update { it.copy(pin = next) }
        if (confirmed != null) submit(confirmed)
    }

    private fun submit(pin: String) {
        val current = _state.value
        if (current.loading) return
        _state.update { it.copy(loading = true, error = null) }
        viewModelScope.launch {
            val username = UsernameRules.normalize(current.username)
            val code = current.code.trim()
            withSlowHint({ slow -> _state.update { it.copy(slow = slow) } }) {
                when (current.mode) {
                    PinResetMode.Recovery -> when (val result = auth.redeemRecoveryCode(username, code, pin)) {
                        is ApiResult.Success -> _state.update {
                            it.copy(
                                loading = false,
                                step = PinResetUiState.Step.Done,
                                doneMessage = result.value.message,
                                remainingCodes = result.value.remaining,
                                mustRegenerate = result.value.mustRegenerate,
                            )
                        }
                        is ApiResult.Failure -> fail(result.error.message)
                    }
                    PinResetMode.Invite -> when (val result = auth.setupPin(username, code, pin)) {
                        is ApiResult.Success -> _state.update {
                            it.copy(loading = false, step = PinResetUiState.Step.Done, doneMessage = result.value)
                        }
                        is ApiResult.Failure -> fail(result.error.message)
                    }
                }
            }
        }
    }

    /** A wrong code is the usual cause, so send the user back to the details they can fix. */
    private fun fail(message: String) {
        _state.update {
            it.copy(loading = false, error = message, step = PinResetUiState.Step.Details, pin = NewPinState())
        }
    }

    private companion object {
        const val CODE_MIN_CHARS = 8
    }
}
