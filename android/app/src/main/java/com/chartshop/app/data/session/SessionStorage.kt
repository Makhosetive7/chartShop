package com.chartshop.app.data.session

import com.chartshop.app.data.model.Shop
import com.chartshop.app.data.model.User
import kotlinx.serialization.Serializable

@Serializable
data class StoredSession(
    val token: String,
    val shop: Shop,
    val user: User? = null,
) {
    val username: String? get() = user?.username ?: shop.username
}

interface SessionStorage {
    suspend fun load(): StoredSession?
    suspend fun save(session: StoredSession)
    suspend fun clearSession()
    suspend fun lastUsername(): String?
    suspend fun saveLastUsername(username: String?)
}
