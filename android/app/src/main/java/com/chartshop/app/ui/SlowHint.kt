package com.chartshop.app.ui

import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private const val SLOW_AFTER_MS = 4_000L

/** Runs [block], flipping [onSlowChange] to true if it is still running after a few seconds. */
suspend fun <T> withSlowHint(onSlowChange: (Boolean) -> Unit, block: suspend () -> T): T = coroutineScope {
    val hint = launch {
        delay(SLOW_AFTER_MS)
        onSlowChange(true)
    }
    try {
        block()
    } finally {
        hint.cancel()
        onSlowChange(false)
    }
}
