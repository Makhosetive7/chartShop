package com.chartshop.app.ui.auth

/** Choose-then-confirm flow for a new 4-digit PIN. */
data class NewPinState(
    val stage: Stage = Stage.Choose,
    val firstPin: String = "",
    val entry: String = "",
    val mismatch: Boolean = false,
) {
    enum class Stage { Choose, Confirm }

    fun withEntry(value: String) = copy(entry = value, mismatch = false)

    /** Returns the next state, plus the PIN once both entries match. */
    fun complete(pin: String): Pair<NewPinState, String?> = when (stage) {
        Stage.Choose -> copy(stage = Stage.Confirm, firstPin = pin, entry = "") to null
        Stage.Confirm ->
            if (pin == firstPin) copy(entry = pin) to pin
            else NewPinState(mismatch = true) to null
    }

    fun reset() = NewPinState()
}
