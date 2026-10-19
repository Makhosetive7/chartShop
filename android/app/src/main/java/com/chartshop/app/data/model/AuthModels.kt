package com.chartshop.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class Channels(
    val telegramLinked: Boolean = false,
    val whatsappLinked: Boolean = false,
)

@Serializable
data class ShopSettings(
    val timezone: String? = null,
    val lowStockAlert: Int? = null,
)

@Serializable
data class Shop(
    val id: String,
    val username: String? = null,
    val businessName: String = "",
    val businessDescription: String? = null,
    val isActive: Boolean = true,
    val isDemo: Boolean = false,
    val demoSector: String? = null,
    val settings: ShopSettings? = null,
    val lastLogin: String? = null,
    val createdAt: String? = null,
    val channels: Channels = Channels(),
)

@Serializable
data class User(
    val id: String,
    val shopId: String? = null,
    val username: String,
    val displayName: String = "",
    val role: String = ROLE_MEMBER,
    val isActive: Boolean = true,
    val mustSetPin: Boolean = false,
    val lastLogin: String? = null,
    val createdAt: String? = null,
    val channels: Channels = Channels(),
) {
    val isAdmin: Boolean get() = role == ROLE_ADMIN

    companion object {
        const val ROLE_ADMIN = "admin"
        const val ROLE_MEMBER = "member"
    }
}

@Serializable
data class LoginRequest(
    val username: String,
    val pin: String,
)

@Serializable
data class RegisterRequest(
    val username: String,
    val businessName: String,
    val pin: String,
    val businessDescription: String? = null,
)

@Serializable
data class AuthResponse(
    val success: Boolean = false,
    val token: String? = null,
    val shop: Shop? = null,
    val user: User? = null,
    val recoveryCodes: List<String> = emptyList(),
)

@Serializable
data class MeResponse(
    val shop: Shop,
    val user: User? = null,
)

@Serializable
data class UsernameCheckResponse(
    val available: Boolean = false,
    val valid: Boolean = false,
    val username: String = "",
    val message: String? = null,
    val suggestions: List<String> = emptyList(),
)

@Serializable
data class RecoveryRedeemRequest(
    val username: String,
    val code: String,
    val newPin: String,
)

@Serializable
data class RecoveryRedeemResponse(
    val message: String? = null,
    val remaining: Int? = null,
    val mustRegenerate: Boolean = false,
)

@Serializable
data class SetupPinRequest(
    val username: String,
    val setupCode: String,
    val newPin: String,
)

@Serializable
data class MessageResponse(
    val success: Boolean = false,
    val message: String? = null,
)

/** Error body for every 4xx/5xx, including the rate limiter's `{ error, message, retryAfter }` shape. */
@Serializable
data class ErrorBody(
    val error: String? = null,
    val code: String? = null,
    val message: String? = null,
    val suggestions: List<String> = emptyList(),
    val retryAfter: Long? = null,
    val cashAvailable: Double? = null,
    val amount: Double? = null,
    val shortfall: Double? = null,
)
