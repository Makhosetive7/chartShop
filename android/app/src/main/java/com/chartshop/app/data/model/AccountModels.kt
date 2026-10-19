package com.chartshop.app.data.model

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonObject

@Serializable
data class ChatBubble(
    val id: String? = null,
    val role: String = ROLE_ASSISTANT,
    val text: String = "",
    val type: String? = null,
    val action: String? = null,
    val entityType: String? = null,
    val entityId: String? = null,
    val customerId: String? = null,
    val channel: String? = null,
    val actorUsername: String? = null,
    val actorDisplayName: String? = null,
    val createdAt: String? = null,
) {
    val mine: Boolean get() = role == ROLE_USER
    val isActivity: Boolean get() = type == "activity"

    companion object {
        const val ROLE_USER = "user"
        const val ROLE_ASSISTANT = "assistant"
    }
}

@Serializable
data class ChatHistoryResponse(val messages: List<ChatBubble> = emptyList(), val demoFeed: Boolean = false)

@Serializable
data class ChatRequest(val message: String)

@Serializable
data class ChatResponse(val message: ChatBubble? = null, val reply: ChatBubble? = null)

@Serializable
data class ActivityItem(
    val id: String,
    val actorId: String = "",
    val actorUsername: String? = null,
    val actorDisplayName: String? = null,
    val channel: String = "",
    val action: String = "",
    val summary: String = "",
    val metadata: JsonObject? = null,
    val createdAt: String? = null,
)

@Serializable
data class ActivityResponse(val items: List<ActivityItem> = emptyList())

@Serializable
data class ReadStateResponse(val seenKeys: List<String> = emptyList())

@Serializable
data class ReadStateUpdate(val seenKeys: List<String>, val merge: Boolean = false, val source: String = "mobile")

@Serializable
data class ReadStateAdd(val keys: List<String>)

@Serializable
data class ShopProfile(
    val businessName: String? = null,
    val registeredAt: String? = null,
    val lastLogin: String? = null,
)

@Serializable
data class ProfileResponse(val shop: Shop? = null, val user: User? = null, val profile: ShopProfile? = null)

/** What every profile `PATCH` returns: the refreshed account. */
@Serializable
data class AccountResponse(val shop: Shop? = null, val user: User? = null, val message: String? = null)

@Serializable
data class UsernameUpdate(val username: String)

@Serializable
data class DisplayNameUpdate(val displayName: String)

@Serializable
data class BusinessNameUpdate(val businessName: String)

@Serializable
data class DescriptionUpdate(val businessDescription: String)

@Serializable
data class PinUpdate(val oldPin: String, val newPin: String)

@Serializable
data class SettingsUpdate(val timezone: String, val lowStockAlert: Int)

@Serializable
data class RecoveryStatus(val hasCodes: Boolean = false, val remaining: Int = 0)

@Serializable
data class RecoveryCodesResponse(val recoveryCodes: List<String> = emptyList(), val remaining: Int? = null)

@Serializable
data class TeamResponse(val members: List<User> = emptyList())

@Serializable
data class NewMemberRequest(
    val username: String,
    val displayName: String,
    val role: String = User.ROLE_MEMBER,
    val pin: String? = null,
)

@Serializable
data class MemberResponse(val member: User? = null, val setupCode: String? = null, val message: String? = null)

@Serializable
data class RoleUpdate(val role: String)
