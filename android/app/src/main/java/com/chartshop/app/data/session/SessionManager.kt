package com.chartshop.app.data.session

import com.chartshop.app.data.api.TokenProvider
import com.chartshop.app.data.model.Shop
import com.chartshop.app.data.model.User
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

sealed interface SessionState {
    data object Loading : SessionState

    data class SignedOut(
        val lastUsername: String? = null,
        val notice: String? = null,
    ) : SessionState

    data class SignedIn(
        val token: String,
        val shop: Shop,
        val user: User?,
    ) : SessionState {
        val username: String get() = user?.username ?: shop.username.orEmpty()
        val isAdmin: Boolean get() = user?.isAdmin == true
    }
}

class SessionManager(
    private val storage: SessionStorage,
    private val scope: CoroutineScope,
) : TokenProvider {

    private val _state = MutableStateFlow<SessionState>(SessionState.Loading)
    val state: StateFlow<SessionState> = _state.asStateFlow()

    private val mutex = Mutex()

    override val token: String?
        get() = (_state.value as? SessionState.SignedIn)?.token

    suspend fun restore() = mutex.withLock {
        val stored = storage.load()
        _state.value = if (stored != null) {
            SessionState.SignedIn(stored.token, stored.shop, stored.user)
        } else {
            SessionState.SignedOut(lastUsername = storage.lastUsername())
        }
    }

    suspend fun signIn(session: StoredSession) = mutex.withLock {
        storage.save(session)
        session.username?.let { storage.saveLastUsername(it) }
        _state.value = SessionState.SignedIn(session.token, session.shop, session.user)
    }

    suspend fun updateAccount(shop: Shop, user: User?) = mutex.withLock {
        val current = _state.value as? SessionState.SignedIn ?: return@withLock
        storage.save(StoredSession(current.token, shop, user))
        _state.value = current.copy(shop = shop, user = user)
    }

    suspend fun signOut(notice: String? = null) = mutex.withLock {
        storage.clearSession()
        _state.value = SessionState.SignedOut(lastUsername = storage.lastUsername(), notice = notice)
    }

    suspend fun rememberUsername(username: String?) = mutex.withLock {
        storage.saveLastUsername(username)
        _state.update { current ->
            if (current is SessionState.SignedOut) current.copy(lastUsername = username) else current
        }
    }

    fun consumeNotice() {
        _state.update { current ->
            if (current is SessionState.SignedOut) current.copy(notice = null) else current
        }
    }

    override fun onUnauthorized(rejectedToken: String) {
        scope.launch {
            mutex.withLock {
                val current = _state.value
                if (current is SessionState.SignedIn && current.token == rejectedToken) {
                    storage.clearSession()
                    _state.value = SessionState.SignedOut(
                        lastUsername = storage.lastUsername(),
                        notice = SESSION_ENDED_NOTICE,
                    )
                }
            }
        }
    }

    companion object {
        const val SESSION_ENDED_NOTICE = "Your session ended. Enter your PIN to continue."
    }
}
