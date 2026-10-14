package com.chartshop.app.data.consent

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

enum class ConsentState { Loading, Required, Accepted }

interface ConsentStorage {
    suspend fun acceptedVersion(): Int?
    suspend fun saveAcceptance(version: Int, acceptedAtMillis: Long)
}

/** Tracks whether the user has accepted the current Privacy Policy and Terms. */
class LegalConsent(
    private val storage: ConsentStorage,
    private val scope: CoroutineScope,
    private val clock: () -> Long = System::currentTimeMillis,
) {
    private val _state = MutableStateFlow(ConsentState.Loading)
    val state: StateFlow<ConsentState> = _state.asStateFlow()

    suspend fun restore() {
        val accepted = storage.acceptedVersion()
        _state.value = if (accepted != null && accepted >= CURRENT_VERSION) {
            ConsentState.Accepted
        } else {
            ConsentState.Required
        }
    }

    fun accept() {
        _state.value = ConsentState.Accepted
        scope.launch { storage.saveAcceptance(CURRENT_VERSION, clock()) }
    }

    companion object {
        /** Must match LEGAL_VERSION in frontend/src/content/legal.ts. */
        const val CURRENT_VERSION = 1
    }
}
