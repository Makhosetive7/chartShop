package com.chartshop.app.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chartshop.app.data.api.ApiError
import com.chartshop.app.data.api.ApiResult
import com.chartshop.app.data.shop.ShopRepository
import com.chartshop.app.ui.components.Toast
import com.chartshop.app.ui.components.ToastTone
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** One server read: the last good [data], whether a request is running, and the last error. */
data class Remote<out T>(
    val data: T? = null,
    val loading: Boolean = false,
    val error: String? = null,
    val slow: Boolean = false,
) {
    /** Nothing to show yet, so the screen draws skeletons. */
    val firstLoad: Boolean get() = data == null && error == null
}

const val DEMO_BLOCKED = "This is a demo shop, so changes aren't saved."

/** Shared plumbing for the screens past Products: toasts, demo blocking, loads, and reloads after writes. */
abstract class ScreenViewModel(
    protected val repository: ShopRepository,
    protected val canEdit: Boolean,
) : ViewModel() {

    private val _toast = MutableStateFlow<Toast?>(null)
    val toast: StateFlow<Toast?> = _toast.asStateFlow()

    fun dismissToast() {
        _toast.value = null
    }

    protected fun success(message: String) {
        _toast.value = Toast(message, ToastTone.Success)
    }

    protected fun fail(message: String) {
        _toast.value = Toast(message, ToastTone.Error)
    }

    protected fun info(message: String) {
        _toast.value = Toast(message, ToastTone.Info)
    }

    protected fun fail(error: ApiError) = fail(error.message)

    /** Shows the demo toast and returns true when this shop can't save changes. */
    protected fun blockedInDemo(): Boolean {
        if (canEdit) return false
        info(DEMO_BLOCKED)
        return true
    }

    /** Runs [action] whenever any screen saves something, so this one never shows stale numbers. */
    protected fun reloadOnChanges(action: () -> Unit) {
        viewModelScope.launch { repository.changes.drop(1).collect { action() } }
    }

    /** Loads into [target], keeping the previous data on screen while it refreshes or fails. */
    protected fun <T> load(
        target: MutableStateFlow<Remote<T>>,
        block: suspend ShopRepository.() -> ApiResult<T>,
    ): Job {
        target.update { it.copy(loading = true, error = null) }
        return viewModelScope.launch {
            val result = withSlowHint({ slow -> target.update { it.copy(slow = slow) } }) { repository.block() }
            target.update {
                when (result) {
                    is ApiResult.Success -> Remote(data = result.value)
                    is ApiResult.Failure -> it.copy(loading = false, error = result.error.message)
                }
            }
        }
    }

    /**
     * A save: checks demo mode, flips [busy] around the call, and toasts any failure.
     * [onSuccess] runs only when the server accepted it.
     */
    protected fun <T> write(
        busy: (Boolean) -> Unit,
        block: suspend ShopRepository.() -> ApiResult<T>,
        onFailure: (ApiError) -> Unit = { fail(it) },
        onSuccess: (T) -> Unit,
    ) {
        if (blockedInDemo()) return
        busy(true)
        viewModelScope.launch {
            val result = repository.block()
            busy(false)
            when (result) {
                is ApiResult.Success -> onSuccess(result.value)
                is ApiResult.Failure -> onFailure(result.error)
            }
        }
    }
}
