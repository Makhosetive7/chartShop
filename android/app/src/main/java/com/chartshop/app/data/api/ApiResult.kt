package com.chartshop.app.data.api

import com.chartshop.app.data.model.ErrorBody
import kotlinx.coroutines.CancellationException
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json
import retrofit2.HttpException
import java.io.IOException
import java.io.InterruptedIOException

sealed interface ApiResult<out T> {
    data class Success<T>(val value: T) : ApiResult<T>
    data class Failure(val error: ApiError) : ApiResult<Nothing>
}

data class ApiError(
    val kind: Kind,
    val message: String,
    val status: Int? = null,
    val code: String? = null,
    val suggestions: List<String> = emptyList(),
    val retryAfterSeconds: Long? = null,
) {
    enum class Kind { Http, Network, Timeout, Unexpected }

    companion object {
        const val CODE_MUST_SET_PIN = "MUST_SET_PIN"
        const val CODE_DEMO_READ_ONLY = "DEMO_READ_ONLY"
        const val CODE_INSUFFICIENT_CASH = "INSUFFICIENT_CASH"

        private const val RATE_LIMIT_ERROR = "rate_limit_exceeded"

        fun fromHttp(status: Int, rawBody: String?, json: Json): ApiError {
            val body = rawBody
                ?.takeIf { it.isNotBlank() }
                ?.let { runCatching { json.decodeFromString<ErrorBody>(it) }.getOrNull() }
                ?: ErrorBody()

            val rateLimited = body.error == RATE_LIMIT_ERROR
            val message = when {
                rateLimited -> body.message ?: "Too many attempts. Please try again later."
                !body.error.isNullOrBlank() -> body.error
                !body.message.isNullOrBlank() -> body.message
                else -> defaultMessage(status)
            }
            return ApiError(
                kind = Kind.Http,
                message = message,
                status = status,
                code = body.code?.takeIf { it.isNotBlank() },
                suggestions = body.suggestions,
                retryAfterSeconds = body.retryAfter,
            )
        }

        private fun defaultMessage(status: Int): String = when (status) {
            401 -> "Your session has ended. Sign in again."
            403 -> "You don't have access to do that."
            404 -> "That wasn't found."
            409 -> "That conflicts with the current data. Refresh and try again."
            429 -> "Too many attempts. Please try again later."
            in 500..599 -> "ChartShop is having trouble right now. Try again in a moment."
            else -> "Something went wrong."
        }
    }
}

suspend fun <T> apiCall(json: Json, block: suspend () -> T): ApiResult<T> = try {
    ApiResult.Success(block())
} catch (e: CancellationException) {
    throw e
} catch (e: HttpException) {
    ApiResult.Failure(ApiError.fromHttp(e.code(), e.response()?.errorBody()?.string(), json))
} catch (e: InterruptedIOException) {
    ApiResult.Failure(
        ApiError(
            ApiError.Kind.Timeout,
            "The server took too long to respond. Check your connection and try again.",
        ),
    )
} catch (e: IOException) {
    ApiResult.Failure(
        ApiError(ApiError.Kind.Network, "Can't reach ChartShop. Check your internet connection."),
    )
} catch (e: SerializationException) {
    ApiResult.Failure(
        ApiError(ApiError.Kind.Unexpected, "ChartShop sent a response this app doesn't understand."),
    )
}
