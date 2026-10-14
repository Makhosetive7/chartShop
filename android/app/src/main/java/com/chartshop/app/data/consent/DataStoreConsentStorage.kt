package com.chartshop.app.data.consent

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withContext

private val Context.consentDataStore by preferencesDataStore(name = "consent")

class DataStoreConsentStorage(context: Context) : ConsentStorage {

    private val store = context.applicationContext.consentDataStore

    override suspend fun acceptedVersion(): Int? = withContext(Dispatchers.IO) {
        store.data.first()[ACCEPTED_VERSION]
    }

    override suspend fun saveAcceptance(version: Int, acceptedAtMillis: Long) = withContext(Dispatchers.IO) {
        store.edit {
            it[ACCEPTED_VERSION] = version
            it[ACCEPTED_AT] = acceptedAtMillis
        }
        Unit
    }

    private companion object {
        val ACCEPTED_VERSION = intPreferencesKey("legal_accepted_version")
        val ACCEPTED_AT = longPreferencesKey("legal_accepted_at")
    }
}
