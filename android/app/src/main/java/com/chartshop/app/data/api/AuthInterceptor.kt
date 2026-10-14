package com.chartshop.app.data.api

import okhttp3.Interceptor
import okhttp3.Response

interface TokenProvider {
    val token: String?
    fun onUnauthorized(rejectedToken: String)
}

class AuthInterceptor(
    private val tokens: TokenProvider,
    private val clientHeader: String,
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val token = tokens.token
        val request = chain.request().newBuilder()
            .header("X-Client", clientHeader)
            .apply { if (token != null) header("Authorization", "Bearer $token") }
            .build()

        val response = chain.proceed(request)
        if (response.code == 401 && token != null) {
            tokens.onUnauthorized(token)
        }
        return response
    }
}
