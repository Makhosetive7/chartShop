package com.chartshop.app.data.api

import com.chartshop.app.data.model.AuthResponse
import com.chartshop.app.data.model.LoginRequest
import com.chartshop.app.data.model.MeResponse
import com.chartshop.app.data.model.MessageResponse
import com.chartshop.app.data.model.RecoveryRedeemRequest
import com.chartshop.app.data.model.RecoveryRedeemResponse
import com.chartshop.app.data.model.RegisterRequest
import com.chartshop.app.data.model.SetupPinRequest
import com.chartshop.app.data.model.UsernameCheckResponse
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

interface AuthApi {
    @POST("auth/login")
    suspend fun login(@Body body: LoginRequest): AuthResponse

    @POST("auth/register")
    suspend fun register(@Body body: RegisterRequest): AuthResponse

    @GET("auth/username")
    suspend fun checkUsername(@Query("username") username: String): UsernameCheckResponse

    @POST("auth/recovery/redeem")
    suspend fun redeemRecovery(@Body body: RecoveryRedeemRequest): RecoveryRedeemResponse

    @POST("auth/setup-pin")
    suspend fun setupPin(@Body body: SetupPinRequest): MessageResponse

    @POST("auth/logout")
    suspend fun logout(): MessageResponse

    @GET("auth/me")
    suspend fun me(): MeResponse
}
