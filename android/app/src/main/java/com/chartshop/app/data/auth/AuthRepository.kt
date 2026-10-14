package com.chartshop.app.data.auth

import com.chartshop.app.data.api.ApiError
import com.chartshop.app.data.api.ApiResult
import com.chartshop.app.data.api.AuthApi
import com.chartshop.app.data.api.apiCall
import com.chartshop.app.data.model.AuthResponse
import com.chartshop.app.data.model.LoginRequest
import com.chartshop.app.data.model.RecoveryRedeemRequest
import com.chartshop.app.data.model.RecoveryRedeemResponse
import com.chartshop.app.data.model.RegisterRequest
import com.chartshop.app.data.model.SetupPinRequest
import com.chartshop.app.data.model.UsernameCheckResponse
import com.chartshop.app.data.session.SessionManager
import com.chartshop.app.data.session.StoredSession
import kotlinx.serialization.json.Json

/** A registered shop whose session is held back until the owner confirms they saved the recovery codes. */
data class PendingRegistration(
    val session: StoredSession,
    val recoveryCodes: List<String>,
)

class AuthRepository(
    private val api: AuthApi,
    private val sessions: SessionManager,
    private val json: Json,
) {

    suspend fun login(username: String, pin: String): ApiResult<Unit> =
        when (val result = apiCall(json) { api.login(LoginRequest(username, pin)) }) {
            is ApiResult.Failure -> result
            is ApiResult.Success -> result.value.toSession()?.let {
                sessions.signIn(it)
                ApiResult.Success(Unit)
            } ?: incompleteResponse()
        }

    suspend fun register(request: RegisterRequest): ApiResult<PendingRegistration> =
        when (val result = apiCall(json) { api.register(request) }) {
            is ApiResult.Failure -> result
            is ApiResult.Success -> result.value.toSession()?.let {
                ApiResult.Success(PendingRegistration(it, result.value.recoveryCodes))
            } ?: incompleteResponse()
        }

    suspend fun completeRegistration(pending: PendingRegistration) {
        sessions.signIn(pending.session)
    }

    suspend fun checkUsername(username: String): ApiResult<UsernameCheckResponse> =
        apiCall(json) { api.checkUsername(username) }

    suspend fun redeemRecoveryCode(
        username: String,
        code: String,
        newPin: String,
    ): ApiResult<RecoveryRedeemResponse> {
        val result = apiCall(json) { api.redeemRecovery(RecoveryRedeemRequest(username, code, newPin)) }
        if (result is ApiResult.Success) sessions.rememberUsername(username)
        return result
    }

    suspend fun setupPin(username: String, setupCode: String, newPin: String): ApiResult<String?> {
        val result = apiCall(json) { api.setupPin(SetupPinRequest(username, setupCode, newPin)) }
        if (result is ApiResult.Success) sessions.rememberUsername(username)
        return when (result) {
            is ApiResult.Success -> ApiResult.Success(result.value.message)
            is ApiResult.Failure -> result
        }
    }

    suspend fun refreshAccount(): ApiResult<Unit> =
        when (val result = apiCall(json) { api.me() }) {
            is ApiResult.Failure -> result
            is ApiResult.Success -> {
                sessions.updateAccount(result.value.shop, result.value.user)
                ApiResult.Success(Unit)
            }
        }

    /** Ends this device's session even when the server can't be reached. */
    suspend fun logout() {
        apiCall(json) { api.logout() }
        sessions.signOut()
    }

    suspend fun forgetRememberedUser() {
        sessions.rememberUsername(null)
    }

    private fun AuthResponse.toSession(): StoredSession? {
        val token = token?.takeIf { it.isNotBlank() } ?: return null
        val shop = shop ?: return null
        return StoredSession(token, shop, user)
    }

    private fun incompleteResponse() = ApiResult.Failure(
        ApiError(ApiError.Kind.Unexpected, "ChartShop didn't return a session. Please try again."),
    )
}
