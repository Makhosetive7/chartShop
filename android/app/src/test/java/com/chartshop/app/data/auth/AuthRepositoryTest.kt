package com.chartshop.app.data.auth

import com.chartshop.app.data.api.ApiError
import com.chartshop.app.data.api.ApiResult
import com.chartshop.app.data.api.AuthApi
import com.chartshop.app.data.api.AuthInterceptor
import com.chartshop.app.data.model.RegisterRequest
import com.chartshop.app.data.session.SessionManager
import com.chartshop.app.data.session.SessionState
import com.chartshop.app.data.session.SessionStorage
import com.chartshop.app.data.session.StoredSession
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

@OptIn(ExperimentalCoroutinesApi::class)
class AuthRepositoryTest {

    private val json = Json {
        ignoreUnknownKeys = true
        explicitNulls = false
        coerceInputValues = true
    }
    private lateinit var server: MockWebServer
    private lateinit var storage: FakeSessionStorage

    @Before
    fun setUp() {
        server = MockWebServer().apply { start() }
        storage = FakeSessionStorage()
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun `login stores the session and remembers the username`() = runTest {
        val (repo, sessions) = build()
        server.enqueue(MockResponse().setResponseCode(200).setBody(authBody()))

        val result = repo.login("tinashop", "4829")

        assertTrue(result is ApiResult.Success)
        val request = server.takeRequest()
        assertEquals("/api/v1/auth/login", request.path)
        assertEquals("""{"username":"tinashop","pin":"4829"}""", request.body.readUtf8())
        assertNull(request.getHeader("Authorization"))

        val state = sessions.state.value as SessionState.SignedIn
        assertEquals("tok-123", state.token)
        assertEquals("Tina's Shop", state.shop.businessName)
        assertTrue(state.isAdmin)
        assertEquals("tok-123", storage.session?.token)
        assertEquals("tinashop", storage.lastUsername)
    }

    @Test
    fun `invited user without a pin gets MUST_SET_PIN and stays signed out`() = runTest {
        val (repo, sessions) = build()
        server.enqueue(
            MockResponse().setResponseCode(403)
                .setBody("""{"success":false,"code":"MUST_SET_PIN","error":"Set your PIN first."}"""),
        )

        val result = repo.login("newhire", "0000")

        val error = (result as ApiResult.Failure).error
        assertEquals(ApiError.CODE_MUST_SET_PIN, error.code)
        assertTrue(sessions.state.value is SessionState.SignedOut)
        assertNull(storage.session)
    }

    @Test
    fun `register holds the session back until the codes are confirmed`() = runTest {
        val (repo, sessions) = build()
        server.enqueue(
            MockResponse().setResponseCode(201)
                .setBody(authBody(""","recoveryCodes":["cs-aaaa-bbbb","cs-cccc-dddd"]""")),
        )

        val result = repo.register(RegisterRequest("tinashop", "Tina's Shop", "4829"))

        val pending = (result as ApiResult.Success).value
        assertEquals(listOf("cs-aaaa-bbbb", "cs-cccc-dddd"), pending.recoveryCodes)
        assertTrue(sessions.state.value is SessionState.SignedOut)
        assertTrue("businessDescription omitted when null", !server.takeRequest().body.readUtf8().contains("businessDescription"))

        repo.completeRegistration(pending)
        assertTrue(sessions.state.value is SessionState.SignedIn)
    }

    @Test
    fun `a 401 on the current token signs out with a notice`() = runTest {
        storage.session = StoredSession("tok-old", json.decodeFromString(SHOP_JSON), null)
        storage.lastUsername = "tinashop"
        val (repo, sessions) = build()
        server.enqueue(
            MockResponse().setResponseCode(401)
                .setBody("""{"success":false,"error":"Session expired. Please login again."}"""),
        )

        val result = repo.refreshAccount()
        advanceUntilIdle()

        assertEquals("Bearer tok-old", server.takeRequest().getHeader("Authorization"))
        assertEquals("Session expired. Please login again.", (result as ApiResult.Failure).error.message)
        val state = sessions.state.value as SessionState.SignedOut
        assertEquals("tinashop", state.lastUsername)
        assertEquals(SessionManager.SESSION_ENDED_NOTICE, state.notice)
        assertNull(storage.session)
    }

    @Test
    fun `logout signs out locally even when the server is unreachable`() = runTest {
        storage.session = StoredSession("tok-1", json.decodeFromString(SHOP_JSON), null)
        val (repo, sessions) = build()
        server.shutdown()

        repo.logout()

        assertTrue(sessions.state.value is SessionState.SignedOut)
        assertNull(storage.session)
    }

    @Test
    fun `connection failures map to a network error`() = runTest {
        val (repo, _) = build()
        server.shutdown()

        val result = repo.login("tinashop", "4829")

        assertEquals(ApiError.Kind.Network, (result as ApiResult.Failure).error.kind)
    }

    /** Wires the repository like AppContainer does, including the restore() that runs at app start. */
    private suspend fun TestScope.build(): Pair<AuthRepository, SessionManager> {
        val sessions = SessionManager(storage, backgroundScope).apply { restore() }
        val client = OkHttpClient.Builder()
            .addInterceptor(AuthInterceptor(sessions, "chartshop-android/test"))
            .build()
        val api = Retrofit.Builder()
            .baseUrl(server.url("/api/v1/"))
            .client(client)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
            .create(AuthApi::class.java)
        return AuthRepository(api, sessions, json) to sessions
    }

    private class FakeSessionStorage : SessionStorage {
        var session: StoredSession? = null
        var lastUsername: String? = null

        override suspend fun load() = session
        override suspend fun save(session: StoredSession) { this.session = session }
        override suspend fun clearSession() { session = null }
        override suspend fun lastUsername() = lastUsername
        override suspend fun saveLastUsername(username: String?) { lastUsername = username }
    }

    private companion object {
        const val SHOP_JSON =
            """{"id":"s1","username":"tinashop","businessName":"Tina's Shop","settings":{"timezone":"Africa/Harare","currency":"USD"},"channels":{"telegramLinked":true}}"""
        const val USER_JSON =
            """{"id":"u1","shopId":"s1","username":"tinashop","displayName":"Tina","role":"admin","mustSetPin":false,"lastLogin":null,"channels":{"telegramLinked":true,"whatsappLinked":false}}"""

        fun authBody(extraFields: String = "") =
            """{"success":true,"token":"tok-123","shop":$SHOP_JSON,"user":$USER_JSON$extraFields}"""
    }
}
