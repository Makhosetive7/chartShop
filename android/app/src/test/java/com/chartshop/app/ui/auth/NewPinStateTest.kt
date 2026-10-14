package com.chartshop.app.ui.auth

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class NewPinStateTest {

    @Test
    fun `matching confirmation returns the pin`() {
        val (confirming, none) = NewPinState().complete("4829")
        assertNull(none)
        assertEquals(NewPinState.Stage.Confirm, confirming.stage)
        assertEquals("", confirming.entry)

        val (_, pin) = confirming.complete("4829")
        assertEquals("4829", pin)
    }

    @Test
    fun `mismatch restarts from the first entry and flags the error`() {
        val (confirming, _) = NewPinState().complete("4829")
        val (restarted, pin) = confirming.complete("4830")
        assertNull(pin)
        assertEquals(NewPinState.Stage.Choose, restarted.stage)
        assertEquals("", restarted.firstPin)
        assertTrue(restarted.mismatch)
        assertTrue(!restarted.withEntry("1").mismatch)
    }
}
