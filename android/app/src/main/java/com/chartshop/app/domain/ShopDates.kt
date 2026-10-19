package com.chartshop.app.domain

import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import java.util.Locale

/** Mirror of frontend/src/utils/dates.ts: fixed English dates in the shop's timezone, e.g. "6 Aug 2026". */
class ShopDates(timezone: String?) {

    val zone: ZoneId = timezone?.trim()?.takeIf { it.isNotEmpty() }
        ?.let { runCatching { ZoneId.of(it) }.getOrNull() }
        ?: ZoneId.of(DEFAULT_TIMEZONE)

    fun parse(value: String?): ZonedDateTime? {
        if (value.isNullOrBlank()) return null
        val instant = runCatching { Instant.parse(value) }.getOrNull()
            ?: runCatching { LocalDate.parse(value.take(10)).atStartOfDay(zone).toInstant() }.getOrNull()
            ?: return null
        return instant.atZone(zone)
    }

    fun date(value: String?): String = parse(value)?.format(DATE) ?: "—"

    fun time(value: String?): String = parse(value)?.format(TIME) ?: "—"

    fun dateTime(value: String?): String = parse(value)?.let { "${it.format(DATE)} · ${it.format(TIME)}" } ?: "—"

    /** Calendar day in the shop's timezone, for grouping feeds by day. */
    fun dayKey(value: String?): LocalDate? = parse(value)?.toLocalDate()

    fun today(): LocalDate = LocalDate.now(zone)

    /** Today · Yesterday · Monday · Monday, 6 Aug · 6 Aug 2025 */
    fun dayLabel(value: String?): String {
        val day = dayKey(value) ?: return "—"
        val today = today()
        val daysAgo = ChronoUnit.DAYS.between(day, today)
        return when {
            daysAgo == 0L -> "Today"
            daysAgo == 1L -> "Yesterday"
            daysAgo in 2..6 -> day.format(WEEKDAY)
            day.year == today.year -> "${day.format(WEEKDAY)}, ${day.format(DAY_MONTH)}"
            else -> day.format(DATE)
        }
    }

    /** Calendar date [days] from today in the shop's timezone, as the API's `YYYY-MM-DD`. */
    fun isoDayFromToday(days: Long): String = today().plusDays(days).toString()

    fun formatIsoDay(isoDay: String): String =
        runCatching { LocalDate.parse(isoDay).format(DATE) }.getOrDefault(isoDay)

    companion object {
        const val DEFAULT_TIMEZONE = "Africa/Harare"

        private val DATE = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.UK)
        private val TIME = DateTimeFormatter.ofPattern("HH:mm", Locale.UK)
        private val WEEKDAY = DateTimeFormatter.ofPattern("EEEE", Locale.UK)
        private val DAY_MONTH = DateTimeFormatter.ofPattern("d MMM", Locale.UK)
    }
}
