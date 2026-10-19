package com.chartshop.app.data.api

import com.chartshop.app.data.model.AccountResponse
import com.chartshop.app.data.model.ActivityResponse
import com.chartshop.app.data.model.BusinessNameUpdate
import com.chartshop.app.data.model.ChatHistoryResponse
import com.chartshop.app.data.model.ChatRequest
import com.chartshop.app.data.model.ChatResponse
import com.chartshop.app.data.model.DescriptionUpdate
import com.chartshop.app.data.model.DisplayNameUpdate
import com.chartshop.app.data.model.InventoryStats
import com.chartshop.app.data.model.MemberResponse
import com.chartshop.app.data.model.MessageResponse
import com.chartshop.app.data.model.NewMemberRequest
import com.chartshop.app.data.model.PinUpdate
import com.chartshop.app.data.model.ProfileResponse
import com.chartshop.app.data.model.ReadStateAdd
import com.chartshop.app.data.model.ReadStateResponse
import com.chartshop.app.data.model.ReadStateUpdate
import com.chartshop.app.data.model.RecoveryCodesResponse
import com.chartshop.app.data.model.RecoveryStatus
import com.chartshop.app.data.model.ReportResponse
import com.chartshop.app.data.model.RoleUpdate
import com.chartshop.app.data.model.SalesStats
import com.chartshop.app.data.model.SettingsUpdate
import com.chartshop.app.data.model.StatsOverview
import com.chartshop.app.data.model.TeamResponse
import com.chartshop.app.data.model.UsernameUpdate
import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query
import retrofit2.http.Streaming

/** Owner view and admin routes: stats, reports, activity, chat, notifications, profile, and team. */
interface OwnerApi {
    @GET("stats")
    suspend fun stats(@Query("days") days: Int, @Query("limit") limit: Int): StatsOverview

    @GET("stats/sales")
    suspend fun salesStats(@Query("days") days: Int): SalesStats

    @GET("stats/inventory")
    suspend fun inventoryStats(): InventoryStats

    @GET("reports/daily")
    suspend fun dailyReport(): ReportResponse

    @GET("reports/weekly")
    suspend fun weeklyReport(): ReportResponse

    @GET("reports/monthly")
    suspend fun monthlyReport(@Query("month") month: String?): ReportResponse

    @GET("reports/best-sellers")
    suspend fun bestSellers(@Query("days") days: Int): ReportResponse

    @GET("reports/profit")
    suspend fun profit(@Query("period") period: String): ReportResponse

    @Streaming
    @GET("reports/export")
    suspend fun exportPdf(
        @Query("type") type: String,
        @Query("month") month: String?,
        @Query("download") download: Int = 1,
    ): Response<ResponseBody>

    @GET("activity")
    suspend fun activity(
        @Query("limit") limit: Int,
        @Query("channel") channel: String?,
        @Query("action") action: String?,
        @Query("mine") mine: Int?,
    ): ActivityResponse

    @GET("chat/history")
    suspend fun chatHistory(@Query("limit") limit: Int): ChatHistoryResponse

    @POST("chat")
    suspend fun sendChat(@Body body: ChatRequest): ChatResponse

    @GET("notifications/read-state")
    suspend fun readState(): ReadStateResponse

    @POST("notifications/read-state")
    suspend fun replaceReadState(@Body body: ReadStateUpdate): ReadStateResponse

    @POST("notifications/read-state/add")
    suspend fun addReadKeys(@Body body: ReadStateAdd): ReadStateResponse

    @GET("auth/profile")
    suspend fun profile(): ProfileResponse

    @PATCH("auth/profile/username")
    suspend fun updateUsername(@Body body: UsernameUpdate): AccountResponse

    @PATCH("auth/profile/display-name")
    suspend fun updateDisplayName(@Body body: DisplayNameUpdate): AccountResponse

    @PATCH("auth/profile/name")
    suspend fun updateBusinessName(@Body body: BusinessNameUpdate): AccountResponse

    @PATCH("auth/profile/description")
    suspend fun updateDescription(@Body body: DescriptionUpdate): AccountResponse

    @PATCH("auth/profile/pin")
    suspend fun updatePin(@Body body: PinUpdate): MessageResponse

    @PATCH("auth/profile/settings")
    suspend fun updateSettings(@Body body: SettingsUpdate): AccountResponse

    @GET("auth/recovery")
    suspend fun recoveryStatus(): RecoveryStatus

    @POST("auth/recovery/regenerate")
    suspend fun regenerateRecoveryCodes(): RecoveryCodesResponse

    @GET("team")
    suspend fun team(): TeamResponse

    @POST("team")
    suspend fun addMember(@Body body: NewMemberRequest): MemberResponse

    @PATCH("team/{userId}/role")
    suspend fun updateRole(@Path("userId") userId: String, @Body body: RoleUpdate): MemberResponse

    @POST("team/{userId}/setup-code")
    suspend fun newSetupCode(@Path("userId") userId: String): MemberResponse

    @DELETE("team/{userId}")
    suspend fun removeMember(@Path("userId") userId: String): MessageResponse
}
