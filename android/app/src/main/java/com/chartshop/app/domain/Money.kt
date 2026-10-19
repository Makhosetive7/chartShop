package com.chartshop.app.domain

import java.util.Locale

/** Mirror of `money()` in frontend/src/api/types.ts. */
fun formatMoney(amount: Double): String = "$" + String.format(Locale.US, "%.2f", amount)

object NumberInput {
    private const val MAX_DIGITS = 9

    /** Keeps digits and one decimal point with at most two decimals, so the field can't hold an unparseable amount. */
    fun sanitizeMoney(raw: String): String {
        val cleaned = StringBuilder()
        var seenDot = false
        var decimals = 0
        for (c in raw) {
            when {
                c == '.' && !seenDot -> {
                    seenDot = true
                    cleaned.append(c)
                }
                c.isDigit() && seenDot && decimals < 2 -> {
                    decimals += 1
                    cleaned.append(c)
                }
                c.isDigit() && !seenDot && cleaned.length < MAX_DIGITS -> cleaned.append(c)
            }
        }
        return cleaned.toString()
    }

    fun sanitizeCount(raw: String): String = raw.filter { it.isDigit() }.take(MAX_DIGITS)

    fun parseMoney(raw: String): Double? = sanitizeMoney(raw.trim()).takeIf { it.isNotEmpty() && it != "." }?.toDoubleOrNull()

    fun parseCount(raw: String): Int? = sanitizeCount(raw.trim()).takeIf { it.isNotEmpty() }?.toIntOrNull()

    /** Formats a stored amount for an edit field: "2.5" → "2.50", "3.0" → "3". */
    fun moneyField(amount: Double?): String {
        if (amount == null) return ""
        return if (amount % 1.0 == 0.0) amount.toLong().toString() else String.format(Locale.US, "%.2f", amount)
    }
}
