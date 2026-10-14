package com.chartshop.app.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chartshop.app.data.api.ApiResult
import com.chartshop.app.data.auth.AuthRepository
import com.chartshop.app.data.auth.PendingRegistration
import com.chartshop.app.data.model.RegisterRequest
import com.chartshop.app.domain.UsernameRules
import com.chartshop.app.ui.withSlowHint
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

sealed interface UsernameAvailability {
    data object Idle : UsernameAvailability
    data object Checking : UsernameAvailability
    data object Available : UsernameAvailability
    data class Unavailable(val message: String, val suggestions: List<String>) : UsernameAvailability
}

data class RegisterUiState(
    val step: Step = Step.Details,
    val businessName: String = "",
    val username: String = "",
    val businessDescription: String = "",
    val availability: UsernameAvailability = UsernameAvailability.Idle,
    val pin: NewPinState = NewPinState(),
    val loading: Boolean = false,
    val slow: Boolean = false,
    val error: String? = null,
    val pending: PendingRegistration? = null,
    val codesSaved: Boolean = false,
) {
    enum class Step { Details, Pin, RecoveryCodes }
}

class RegisterViewModel(private val auth: AuthRepository) : ViewModel() {

    private val _state = MutableStateFlow(RegisterUiState())
    val state: StateFlow<RegisterUiState> = _state.asStateFlow()

    private var usernameCheck: Job? = null

    fun onBusinessNameChange(value: String) {
        _state.update { it.copy(businessName = value.take(80), error = null) }
    }

    fun onDescriptionChange(value: String) {
        _state.update { it.copy(businessDescription = value.take(200)) }
    }

    fun onUsernameChange(value: String) {
        val username = UsernameRules.sanitizeInput(value)
        _state.update { it.copy(username = username, error = null) }
        checkAvailability(username)
    }

    private fun checkAvailability(username: String) {
        usernameCheck?.cancel()
        if (username.isBlank()) {
            _state.update { it.copy(availability = UsernameAvailability.Idle) }
            return
        }
        val validation = UsernameRules.validate(username)
        if (validation is UsernameRules.Validation.Invalid) {
            _state.update {
                it.copy(
                    availability = UsernameAvailability.Unavailable(
                        validation.message,
                        UsernameRules.localSuggestions(username),
                    ),
                )
            }
            return
        }
        _state.update { it.copy(availability = UsernameAvailability.Checking) }
        usernameCheck = viewModelScope.launch {
            delay(USERNAME_DEBOUNCE_MS)
            val availability = when (val result = auth.checkUsername(validation.normalized)) {
                is ApiResult.Success ->
                    if (result.value.available) {
                        UsernameAvailability.Available
                    } else {
                        UsernameAvailability.Unavailable(
                            result.value.message ?: "Username is not available",
                            UsernameRules.mergeSuggestions(result.value.suggestions, validation.normalized),
                        )
                    }
                // The register call re-checks, so an offline check shouldn't block the form.
                is ApiResult.Failure -> UsernameAvailability.Idle
            }
            _state.update { if (it.username == username) it.copy(availability = availability) else it }
        }
    }

    fun continueToPin() {
        val current = _state.value
        val validation = UsernameRules.validate(current.username)
        val error = when {
            current.businessName.isBlank() -> "Enter your shop's name."
            validation is UsernameRules.Validation.Invalid -> validation.message
            current.availability is UsernameAvailability.Unavailable -> current.availability.message
            else -> null
        }
        if (error != null) {
            _state.update { it.copy(error = error) }
            return
        }
        _state.update { it.copy(step = RegisterUiState.Step.Pin, pin = NewPinState(), error = null) }
    }

    fun backToDetails() {
        _state.update { it.copy(step = RegisterUiState.Step.Details, pin = NewPinState(), error = null) }
    }

    fun onPinEntry(value: String) {
        _state.update { it.copy(pin = it.pin.withEntry(value), error = null) }
    }

    fun onPinComplete(pin: String) {
        val (next, confirmed) = _state.value.pin.complete(pin)
        _state.update { it.copy(pin = next) }
        if (confirmed != null) register(confirmed)
    }

    private fun register(pin: String) {
        val current = _state.value
        if (current.loading) return
        _state.update { it.copy(loading = true, error = null) }
        viewModelScope.launch {
            val request = RegisterRequest(
                username = UsernameRules.normalize(current.username),
                businessName = current.businessName.trim(),
                pin = pin,
                businessDescription = current.businessDescription.trim().ifBlank { null },
            )
            val result = withSlowHint({ slow -> _state.update { it.copy(slow = slow) } }) {
                auth.register(request)
            }
            when (result) {
                is ApiResult.Success -> {
                    if (result.value.recoveryCodes.isEmpty()) {
                        auth.completeRegistration(result.value)
                    } else {
                        _state.update {
                            it.copy(
                                loading = false,
                                step = RegisterUiState.Step.RecoveryCodes,
                                pending = result.value,
                            )
                        }
                    }
                }
                is ApiResult.Failure -> {
                    val error = result.error
                    val usernameProblem = error.status == 409 || error.suggestions.isNotEmpty()
                    _state.update {
                        it.copy(
                            loading = false,
                            error = error.message,
                            pin = NewPinState(),
                            step = if (usernameProblem) RegisterUiState.Step.Details else it.step,
                            availability = if (usernameProblem) {
                                UsernameAvailability.Unavailable(
                                    error.message,
                                    UsernameRules.mergeSuggestions(error.suggestions, request.username),
                                )
                            } else {
                                it.availability
                            },
                        )
                    }
                }
            }
        }
    }

    fun onCodesSavedChange(saved: Boolean) {
        _state.update { it.copy(codesSaved = saved) }
    }

    fun finish() {
        val pending = _state.value.pending ?: return
        if (!_state.value.codesSaved) return
        viewModelScope.launch { auth.completeRegistration(pending) }
    }

    private companion object {
        const val USERNAME_DEBOUNCE_MS = 350L
    }
}
