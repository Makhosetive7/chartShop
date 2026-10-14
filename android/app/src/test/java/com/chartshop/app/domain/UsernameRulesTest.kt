package com.chartshop.app.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class UsernameRulesTest {

    @Test
    fun `accepts lowercase letters with optional trailing digits`() {
        assertTrue(UsernameRules.validate("tinashop") is UsernameRules.Validation.Valid)
        assertTrue(UsernameRules.validate("tina2024") is UsernameRules.Validation.Valid)
        assertEquals("tinashop", UsernameRules.validate("  TinaShop ").normalized)
    }

    @Test
    fun `rejects bad shapes with the web app's messages`() {
        assertInvalid("", "Username cannot be empty")
        assertInvalid("ab", "Username must be at least 3 characters")
        assertInvalid("abcdefghijklmnop", "Username must be at most 15 characters")
        assertInvalid("tina_shop", "Use lowercase letters only, with optional digits at the end (no spaces or symbols)")
        assertInvalid("2tina", "Use lowercase letters only, with optional digits at the end (no spaces or symbols)")
        assertInvalid("ti2na", "Use lowercase letters only, with optional digits at the end (no spaces or symbols)")
        assertInvalid("admin", "\"admin\" is reserved. Please choose a different username")
    }

    @Test
    fun `sanitizes registration input but keeps underscores for legacy logins`() {
        assertEquals("tinashop", UsernameRules.sanitizeInput("Tina Shop!"))
        assertEquals(15, UsernameRules.sanitizeInput("a".repeat(30)).length)
        assertEquals("old_user", UsernameRules.sanitizeLoginInput("Old_User"))
    }

    @Test
    fun `local suggestions append digits to the letter root`() {
        assertEquals(listOf("musa1", "musa2", "musa3"), UsernameRules.localSuggestions("musa"))
        assertEquals(listOf("musa1", "musa3", "musa4"), UsernameRules.localSuggestions("musa", exclude = listOf("musa2")))
        assertEquals(listOf("shop1", "shop2", "shop3"), UsernameRules.localSuggestions("123"))
    }

    @Test
    fun `server suggestions come first and are topped up locally`() {
        assertEquals(listOf("musa7", "musa1", "musa2"), UsernameRules.mergeSuggestions(listOf("musa7"), "musa"))
        assertEquals(listOf("a1", "b1", "c1"), UsernameRules.mergeSuggestions(listOf("a1", "b1", "c1", "d1"), "musa"))
    }

    @Test
    fun `pin must be exactly four digits`() {
        assertTrue(PinRules.isValid("0429"))
        assertTrue(!PinRules.isValid("429"))
        assertTrue(!PinRules.isValid("04a9"))
        assertTrue(!PinRules.isValid("04291"))
    }

    private fun assertInvalid(input: String, message: String) {
        val result = UsernameRules.validate(input)
        assertTrue("expected $input to be invalid", result is UsernameRules.Validation.Invalid)
        assertEquals(message, (result as UsernameRules.Validation.Invalid).message)
    }
}
