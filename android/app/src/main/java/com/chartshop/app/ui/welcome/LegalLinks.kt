package com.chartshop.app.ui.welcome

import android.content.ActivityNotFoundException
import androidx.compose.ui.platform.UriHandler
import com.chartshop.app.BuildConfig

object LegalLinks {
    const val PRIVACY_URL = "${BuildConfig.WEB_BASE_URL}/privacy"
    const val TERMS_URL = "${BuildConfig.WEB_BASE_URL}/terms"
}

/** Opens [url] in the browser; returns false when no app can handle it. */
fun UriHandler.openSafely(url: String): Boolean =
    try {
        openUri(url)
        true
    } catch (_: ActivityNotFoundException) {
        false
    } catch (_: IllegalArgumentException) {
        false
    }
