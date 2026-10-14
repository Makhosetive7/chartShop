package com.chartshop.app.data.api

import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ApiErrorTest {

    private val json = Json { ignoreUnknownKeys = true }

    @Test
    fun `uses the server's error text and code`() {
        val error = ApiError.fromHttp(
            403,
            """{"success":false,"code":"MUST_SET_PIN","error":"Set your PIN with the setup code first."}""",
            json,
        )
        assertEquals("Set your PIN with the setup code first.", error.message)
        assertEquals(ApiError.CODE_MUST_SET_PIN, error.code)
        assertEquals(403, error.status)
    }

    @Test
    fun `reads username suggestions from a conflict`() {
        val error = ApiError.fromHttp(
            409,
            """{"success":false,"error":"Username is already taken","suggestions":["tina1","tina2"]}""",
            json,
        )
        assertEquals(listOf("tina1", "tina2"), error.suggestions)
    }

    @Test
    fun `rate limiter body uses message instead of the error keyword`() {
        val error = ApiError.fromHttp(
            429,
            """{"error":"rate_limit_exceeded","message":"Too many login attempts. (12 minutes remaining)","retryAfter":720}""",
            json,
        )
        assertEquals("Too many login attempts. (12 minutes remaining)", error.message)
        assertEquals(720L, error.retryAfterSeconds)
        assertNull(error.code)
    }

    @Test
    fun `falls back to a status message for empty or non-json bodies`() {
        assertEquals("Your session has ended. Sign in again.", ApiError.fromHttp(401, "", json).message)
        assertEquals(
            "ChartShop is having trouble right now. Try again in a moment.",
            ApiError.fromHttp(502, "<html>Bad gateway</html>", json).message,
        )
    }
}
