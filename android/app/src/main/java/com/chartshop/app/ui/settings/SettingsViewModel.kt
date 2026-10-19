package com.chartshop.app.ui.settings

import androidx.lifecycle.viewModelScope
import com.chartshop.app.data.api.ApiResult
import com.chartshop.app.data.auth.AuthRepository
import com.chartshop.app.data.model.AccountResponse
import com.chartshop.app.data.model.BusinessNameUpdate
import com.chartshop.app.data.model.DescriptionUpdate
import com.chartshop.app.data.model.DisplayNameUpdate
import com.chartshop.app.data.model.PinUpdate
import com.chartshop.app.data.model.ProfileResponse
import com.chartshop.app.data.model.RecoveryStatus
import com.chartshop.app.data.model.SettingsUpdate
import com.chartshop.app.data.model.UsernameUpdate
import com.chartshop.app.data.session.SessionManager
import com.chartshop.app.data.session.SessionState
import com.chartshop.app.data.shop.ShopRepository
import com.chartshop.app.domain.NumberInput
import com.chartshop.app.domain.PinRules
import com.chartshop.app.domain.ShopDates
import com.chartshop.app.domain.UsernameRules
import com.chartshop.app.ui.Remote
import com.chartshop.app.ui.ScreenViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

val TIMEZONE_OPTIONS = listOf(
    "Africa/Harare", "Africa/Johannesburg", "Africa/Lusaka", "Africa/Maputo",
    "Africa/Nairobi", "Africa/Lagos", "Africa/Cairo", "UTC",
)

sealed interface UsernameCheck {
    data object Idle : UsernameCheck
    data object Checking : UsernameCheck
    data class Ready(val available: Boolean, val message: String? = null, val suggestions: List<String> = emptyList()) : UsernameCheck
}

/** Which save button is spinning. */
enum class SettingsBusy { Preferences, DisplayName, Username, BusinessName, Description, Pin, Recovery, Logout }

data class SettingsForm(
    val businessName: String = "",
    val username: String = "",
    val displayName: String = "",
    val description: String = "",
    val oldPin: String = "",
    val newPin: String = "",
    val confirmPin: String = "",
    val timezone: String = ShopDates.DEFAULT_TIMEZONE,
    val lowStockAlert: String = "10",
    val usernameCheck: UsernameCheck = UsernameCheck.Idle,
    val busy: SettingsBusy? = null,
    val confirmRegenerate: Boolean = false,
    val freshCodes: List<String>? = null,
    val codesSaved: Boolean = false,
)

class SettingsViewModel(
    repository: ShopRepository,
    private val auth: AuthRepository,
    private val sessions: SessionManager,
    val dates: ShopDates,
    canEdit: Boolean,
) : ScreenViewModel(repository, canEdit) {

    private val _form = MutableStateFlow(SettingsForm())
    val form: StateFlow<SettingsForm> = _form.asStateFlow()

    private val _profile = MutableStateFlow(Remote<ProfileResponse>())
    val profile: StateFlow<Remote<ProfileResponse>> = _profile.asStateFlow()

    private val _recovery = MutableStateFlow(Remote<RecoveryStatus>())
    val recovery: StateFlow<Remote<RecoveryStatus>> = _recovery.asStateFlow()

    private var checkJob: Job? = null

    private val session: SessionState.SignedIn? get() = sessions.state.value as? SessionState.SignedIn

    private val currentUsername: String get() = session?.username.orEmpty().lowercase()

    init {
        session?.let { s ->
            _form.update {
                it.copy(
                    businessName = s.shop.businessName,
                    username = s.username,
                    displayName = s.user?.displayName?.ifBlank { null } ?: s.username,
                    description = s.shop.businessDescription.orEmpty(),
                    timezone = s.shop.settings?.timezone ?: ShopDates.DEFAULT_TIMEZONE,
                    lowStockAlert = (s.shop.settings?.lowStockAlert ?: 10).toString(),
                )
            }
        }
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _profile.update { it.copy(loading = true, error = null) }
            when (val result = repository.owner { profile() }) {
                is ApiResult.Success -> {
                    _profile.value = Remote(result.value)
                    result.value.shop?.let { shop ->
                        _form.update {
                            it.copy(
                                businessName = shop.businessName,
                                description = shop.businessDescription.orEmpty(),
                                timezone = shop.settings?.timezone ?: ShopDates.DEFAULT_TIMEZONE,
                                lowStockAlert = (shop.settings?.lowStockAlert ?: 10).toString(),
                            )
                        }
                    }
                }
                is ApiResult.Failure -> _profile.update { it.copy(loading = false, error = result.error.message) }
            }
        }
        val s = session
        if (s != null && s.isAdmin && !s.shop.isDemo) {
            load(_recovery) { owner { recoveryStatus() } }
        }
    }

    fun onBusinessName(value: String) = _form.update { it.copy(businessName = value) }
    fun onDisplayName(value: String) = _form.update { it.copy(displayName = value.take(50)) }
    fun onDescription(value: String) = _form.update { it.copy(description = value) }
    fun onOldPin(value: String) = _form.update { it.copy(oldPin = NumberInput.sanitizeCount(value).take(PinRules.LENGTH)) }
    fun onNewPin(value: String) = _form.update { it.copy(newPin = NumberInput.sanitizeCount(value).take(PinRules.LENGTH)) }
    fun onConfirmPin(value: String) = _form.update { it.copy(confirmPin = NumberInput.sanitizeCount(value).take(PinRules.LENGTH)) }
    fun onTimezone(value: String) = _form.update { it.copy(timezone = value) }
    fun onLowStock(value: String) = _form.update { it.copy(lowStockAlert = NumberInput.sanitizeCount(value)) }

    fun onUsername(raw: String) {
        val username = UsernameRules.sanitizeInput(raw)
        _form.update { it.copy(username = username) }
        checkUsername(username)
    }

    /** Live availability, debounced like the web's 350 ms check. */
    private fun checkUsername(username: String) {
        checkJob?.cancel()
        val normalized = UsernameRules.normalize(username)
        if (normalized.isEmpty()) return setCheck(UsernameCheck.Idle)
        if (normalized == currentUsername) return setCheck(UsernameCheck.Ready(available = true))
        val validation = UsernameRules.validate(normalized)
        val local = UsernameRules.localSuggestions(normalized)
        setCheck(
            if (validation is UsernameRules.Validation.Invalid) {
                UsernameCheck.Ready(false, validation.message, local)
            } else {
                UsernameCheck.Checking
            },
        )
        checkJob = viewModelScope.launch {
            delay(350)
            when (val result = auth.checkUsername(normalized)) {
                is ApiResult.Success -> {
                    val r = result.value
                    setCheck(
                        UsernameCheck.Ready(
                            available = r.available,
                            message = r.message ?: (validation as? UsernameRules.Validation.Invalid)?.message,
                            suggestions = if (r.available) emptyList() else UsernameRules.mergeSuggestions(r.suggestions, normalized),
                        ),
                    )
                }
                is ApiResult.Failure -> setCheck(
                    if (validation is UsernameRules.Validation.Invalid) {
                        UsernameCheck.Ready(false, validation.message, local)
                    } else {
                        UsernameCheck.Idle
                    },
                )
            }
        }
    }

    private fun setCheck(check: UsernameCheck) = _form.update { it.copy(usernameCheck = check) }

    private fun setBusy(which: SettingsBusy, busy: Boolean) =
        _form.update { it.copy(busy = if (busy) which else if (it.busy == which) null else it.busy) }

    /** Profile saves return the refreshed account; keep this phone's session in step. */
    private fun applyAccount(response: AccountResponse) {
        val s = session ?: return
        val shop = response.shop ?: s.shop
        viewModelScope.launch { sessions.updateAccount(shop, response.user ?: s.user) }
    }

    fun savePreferences() {
        val form = _form.value
        val low = NumberInput.parseCount(form.lowStockAlert) ?: return fail("Enter a low-stock level.")
        write(
            busy = { setBusy(SettingsBusy.Preferences, it) },
            block = { ownerWrite { updateSettings(SettingsUpdate(form.timezone.trim(), low)) } },
        ) {
            success(it.message ?: "Shop preferences updated.")
            applyAccount(it)
        }
    }

    fun saveDisplayName() {
        val name = _form.value.displayName.trim()
        if (name.isEmpty()) return fail("Display name is required.")
        write(
            busy = { setBusy(SettingsBusy.DisplayName, it) },
            block = { ownerWrite { updateDisplayName(DisplayNameUpdate(name)) } },
        ) {
            success(it.message ?: "Display name updated.")
            _form.update { f -> f.copy(displayName = it.user?.displayName ?: name) }
            applyAccount(it)
        }
    }

    fun saveUsername() {
        val form = _form.value
        val validation = UsernameRules.validate(form.username)
        if (validation is UsernameRules.Validation.Invalid) {
            fail(validation.message)
            return setCheck(UsernameCheck.Ready(false, validation.message, UsernameRules.mergeSuggestions(emptyList(), form.username)))
        }
        val check = form.usernameCheck
        if (check is UsernameCheck.Ready && !check.available) return fail(check.message ?: "Username is not available.")
        if (validation.normalized == currentUsername) return success("Username unchanged.")
        write(
            busy = { setBusy(SettingsBusy.Username, it) },
            block = { ownerWrite { updateUsername(UsernameUpdate(validation.normalized)) } },
            onFailure = { error ->
                fail(error)
                setCheck(UsernameCheck.Ready(false, error.message, UsernameRules.mergeSuggestions(error.suggestions, validation.normalized)))
            },
        ) {
            success(it.message ?: "Username updated.")
            val next = it.user?.username ?: it.shop?.username ?: validation.normalized
            _form.update { f -> f.copy(username = next, usernameCheck = UsernameCheck.Ready(available = true)) }
            applyAccount(it)
        }
    }

    fun saveBusinessName() {
        val name = _form.value.businessName.trim()
        if (name.isEmpty()) return fail("Business name is required.")
        write(
            busy = { setBusy(SettingsBusy.BusinessName, it) },
            block = { ownerWrite { updateBusinessName(BusinessNameUpdate(name)) } },
        ) {
            success("Business name updated.")
            applyAccount(it)
        }
    }

    fun saveDescription() {
        val description = _form.value.description.trim()
        if (description.isEmpty()) return fail("Description is required.")
        write(
            busy = { setBusy(SettingsBusy.Description, it) },
            block = { ownerWrite { updateDescription(DescriptionUpdate(description)) } },
        ) {
            success("Description updated.")
            applyAccount(it)
        }
    }

    fun savePin() {
        val form = _form.value
        if (!PinRules.isValid(form.newPin)) return fail("New PIN must be exactly 4 digits.")
        if (form.newPin != form.confirmPin) return fail("New PIN and confirmation do not match.")
        write(
            busy = { setBusy(SettingsBusy.Pin, it) },
            block = { owner { updatePin(PinUpdate(form.oldPin, form.newPin)) } },
        ) {
            success("PIN updated.")
            _form.update { f -> f.copy(oldPin = "", newPin = "", confirmPin = "") }
        }
    }

    fun askRegenerate() = _form.update { it.copy(confirmRegenerate = true) }

    fun dismissRegenerate() {
        if (_form.value.busy != SettingsBusy.Recovery) _form.update { it.copy(confirmRegenerate = false) }
    }

    fun regenerateCodes() {
        write(
            busy = { setBusy(SettingsBusy.Recovery, it) },
            block = { owner { regenerateRecoveryCodes() } },
        ) { result ->
            if (result.recoveryCodes.isEmpty()) return@write fail("Could not regenerate codes")
            _form.update { it.copy(freshCodes = result.recoveryCodes, codesSaved = false, confirmRegenerate = false) }
            success("New recovery codes issued — save them now.")
            load(_recovery) { owner { recoveryStatus() } }
        }
    }

    fun onCodesSaved(saved: Boolean) = _form.update { it.copy(codesSaved = saved) }

    fun hideCodes() = _form.update { it.copy(freshCodes = null, codesSaved = false) }

    fun logout() {
        if (_form.value.busy == SettingsBusy.Logout) return
        setBusy(SettingsBusy.Logout, true)
        viewModelScope.launch { auth.logout() }
    }
}
