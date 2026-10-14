package com.chartshop.app.domain

/** Mirror of backend/utils/usernamePolicy.js (via frontend/src/utils/username.ts). The server stays authoritative. */
object UsernameRules {
    const val MIN_LENGTH = 3
    const val MAX_LENGTH = 15

    /** Legacy accounts may use underscores and up to 32 characters, so login input is looser than registration. */
    const val LOGIN_MAX_LENGTH = 32

    private val pattern = Regex("^[a-z]+[0-9]*$")
    private val reserved = setOf("admin", "support", "system", "chartshop")

    sealed interface Validation {
        val normalized: String

        data class Valid(override val normalized: String) : Validation
        data class Invalid(override val normalized: String, val message: String) : Validation
    }

    fun normalize(raw: String): String = raw.trim().lowercase()

    fun sanitizeInput(raw: String): String =
        raw.lowercase().filter { it in 'a'..'z' || it in '0'..'9' }.take(MAX_LENGTH)

    fun sanitizeLoginInput(raw: String): String =
        raw.lowercase().filter { it in 'a'..'z' || it in '0'..'9' || it == '_' }.take(LOGIN_MAX_LENGTH)

    fun validate(raw: String): Validation {
        val normalized = normalize(raw)
        val message = when {
            normalized.isEmpty() -> "Username cannot be empty"
            normalized.length < MIN_LENGTH -> "Username must be at least $MIN_LENGTH characters"
            normalized.length > MAX_LENGTH -> "Username must be at most $MAX_LENGTH characters"
            !pattern.matches(normalized) ->
                "Use lowercase letters only, with optional digits at the end (no spaces or symbols)"
            normalized in reserved -> "\"$normalized\" is reserved. Please choose a different username"
            else -> null
        }
        return if (message == null) Validation.Valid(normalized) else Validation.Invalid(normalized, message)
    }

    fun letterRoot(raw: String): String {
        val root = normalize(raw).trimEnd { it.isDigit() }.filter { it in 'a'..'z' }
        return when {
            root.length >= 2 -> root.take(MAX_LENGTH - 1)
            root.length == 1 -> "${root}u"
            else -> "shop"
        }
    }

    /** Local alternatives like musa1, musa2. Prefer server suggestions, which skip taken names. */
    fun localSuggestions(desired: String, count: Int = 3, exclude: Collection<String> = emptyList()): List<String> {
        val excluded = (exclude + desired).map(::normalize).toSet()
        val root = letterRoot(desired)
        val suggestions = mutableListOf<String>()
        var n = 1
        while (suggestions.size < count && n < 1000) {
            val suffix = n.toString()
            n += 1
            val maxLetters = MAX_LENGTH - suffix.length
            if (maxLetters < 2) break
            val candidate = root.take(maxLetters) + suffix
            if (validate(candidate) is Validation.Valid && candidate !in excluded) {
                suggestions += candidate
            }
        }
        return suggestions
    }

    /** Server suggestions first, topped up with local ones, max three. */
    fun mergeSuggestions(fromServer: List<String>, desired: String): List<String> {
        val server = fromServer.filter { it.isNotBlank() }
        if (server.size >= 3) return server.take(3)
        return (server + localSuggestions(desired, 3, server)).take(3)
    }
}

object PinRules {
    const val LENGTH = 4

    fun isValid(pin: String): Boolean = pin.length == LENGTH && pin.all { it.isDigit() }
}
