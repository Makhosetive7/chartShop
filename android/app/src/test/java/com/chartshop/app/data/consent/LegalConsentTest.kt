package com.chartshop.app.data.consent

import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class LegalConsentTest {

    private class FakeConsentStorage(var version: Int? = null) : ConsentStorage {
        var acceptedAt: Long? = null
        override suspend fun acceptedVersion() = version
        override suspend fun saveAcceptance(version: Int, acceptedAtMillis: Long) {
            this.version = version
            acceptedAt = acceptedAtMillis
        }
    }

    private suspend fun TestScope.consent(storage: ConsentStorage) =
        LegalConsent(storage, this, clock = { 1_700_000_000_000 }).also { it.restore() }

    @Test
    fun firstLaunchRequiresConsent() = runTest {
        assertEquals(ConsentState.Required, consent(FakeConsentStorage()).state.value)
    }

    @Test
    fun currentVersionIsAccepted() = runTest {
        val storage = FakeConsentStorage(LegalConsent.CURRENT_VERSION)
        assertEquals(ConsentState.Accepted, consent(storage).state.value)
    }

    @Test
    fun olderVersionAsksAgain() = runTest {
        val storage = FakeConsentStorage(LegalConsent.CURRENT_VERSION - 1)
        assertEquals(ConsentState.Required, consent(storage).state.value)
    }

    @Test
    fun acceptPersistsVersionAndTime() = runTest {
        val storage = FakeConsentStorage()
        val consent = consent(storage)

        consent.accept()
        assertEquals(ConsentState.Accepted, consent.state.value)
        advanceUntilIdle()

        assertEquals(LegalConsent.CURRENT_VERSION, storage.version)
        assertEquals(1_700_000_000_000, storage.acceptedAt)
    }
}
