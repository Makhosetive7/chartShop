package com.chartshop.app.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chartshop.app.data.api.ApiError
import com.chartshop.app.data.api.ApiResult
import com.chartshop.app.data.auth.AuthRepository
import com.chartshop.app.data.session.SessionManager
import com.chartshop.app.data.session.SessionState
import com.chartshop.app.domain.UsernameRules
import com.chartshop.app.ui.withSlowHint
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class LoginUiState(
    val rememberedUsername: String? = null,
    val usernameInput: String = "",
    val step: Step = Step.Username,
    val pin: String = "",
    val loading: Boolean = false,
    val slow: Boolean = false,
    val error: String? = null,
    val notice: String? = null,
) {
    enum class Step { Username, Pin }

    val activeUsername: String get() = rememberedUsername ?: UsernameRules.normalize(usernameInput)
}

sealed interface LoginEvent {
    data class MustSetPin(val username: String) : LoginEvent
}

class LoginViewModel(
    private val auth: AuthRepository,
    sessions: SessionManager,
) : ViewModel() {

    private val _state: MutableStateFlow<LoginUiState>
    val state: StateFlow<LoginUiState>

    private val _events = Channel<LoginEvent>(Channel.BUFFERED)
    val events = _events.receiveAsFlow()

    init {
        val signedOut = sessions.state.value as? SessionState.SignedOut
        val remembered = signedOut?.lastUsername
        _state = MutableStateFlow(
            LoginUiState(
                rememberedUsername = remembered,
                step = if (remembered != null) LoginUiState.Step.Pin else LoginUiState.Step.Username,
                notice = signedOut?.notice,
            ),
        )
        state = _state.asStateFlow()
        sessions.consumeNotice()
    }

    fun onUsernameChange(value: String) {
        _state.update { it.copy(usernameInput = UsernameRules.sanitizeLoginInput(value), error = null) }
    }

    fun continueToPin() {
        val username = _state.value.activeUsername
        if (username.length < UsernameRules.MIN_LENGTH) {
            _state.update { it.copy(error = "Enter your username to continue.") }
            return
        }
        _state.update { it.copy(step = LoginUiState.Step.Pin, pin = "", error = null) }
    }

    fun changeUser() {
        val wasRemembered = _state.value.rememberedUsername != null
        if (wasRemembered) viewModelScope.launch { auth.forgetRememberedUser() }
        _state.update {
            it.copy(
                rememberedUsername = null,
                usernameInput = if (wasRemembered) "" else it.usernameInput,
                step = LoginUiState.Step.Username,
                pin = "",
                error = null,
                notice = null,
            )
        }
    }

    fun onPinChange(value: String) {
        _state.update { it.copy(pin = value, error = null) }
    }

    fun submit(pin: String) {
        val username = _state.value.activeUsername
        if (_state.value.loading) return
        _state.update { it.copy(loading = true, error = null, notice = null) }
        viewModelScope.launch {
            val result = withSlowHint({ slow -> _state.update { it.copy(slow = slow) } }) {
                auth.login(username, pin)
            }
            if (result is ApiResult.Failure) {
                if (result.error.code == ApiError.CODE_MUST_SET_PIN) {
                    _events.send(LoginEvent.MustSetPin(username))
                    _state.update { it.copy(loading = false, pin = "") }
                } else {
                    _state.update { it.copy(loading = false, pin = "", error = result.error.message) }
                }
            }
        }
    }
}
