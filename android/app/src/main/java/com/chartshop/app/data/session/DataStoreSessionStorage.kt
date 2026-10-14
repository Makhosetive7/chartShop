package com.chartshop.app.data.session

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json

private val Context.sessionDataStore by preferencesDataStore(name = "session")

class DataStoreSessionStorage(
    context: Context,
    private val json: Json,
    private val cipher: KeystoreCipher = KeystoreCipher(),
) : SessionStorage {

    private val store = context.applicationContext.sessionDataStore

    override suspend fun load(): StoredSession? = withContext(Dispatchers.IO) {
        val encrypted = store.data.first()[SESSION] ?: return@withContext null
        val plain = cipher.decrypt(encrypted)
        val session = plain?.let { runCatching { json.decodeFromString<StoredSession>(it) }.getOrNull() }
        if (session == null) clearSession()
        session
    }

    override suspend fun save(session: StoredSession) = withContext(Dispatchers.IO) {
        val encrypted = cipher.encrypt(json.encodeToString(StoredSession.serializer(), session))
        store.edit { it[SESSION] = encrypted }
        Unit
    }

    override suspend fun clearSession() = withContext(Dispatchers.IO) {
        store.edit { it.remove(SESSION) }
        Unit
    }

    override suspend fun lastUsername(): String? = withContext(Dispatchers.IO) {
        store.data.first()[LAST_USERNAME]
    }

    override suspend fun saveLastUsername(username: String?) = withContext(Dispatchers.IO) {
        store.edit { prefs ->
            if (username.isNullOrBlank()) prefs.remove(LAST_USERNAME) else prefs[LAST_USERNAME] = username
        }
        Unit
    }

    private companion object {
        val SESSION = stringPreferencesKey("session")
        val LAST_USERNAME = stringPreferencesKey("last_username")
    }
}
