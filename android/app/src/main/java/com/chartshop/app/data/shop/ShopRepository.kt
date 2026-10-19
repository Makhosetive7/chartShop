package com.chartshop.app.data.shop

import com.chartshop.app.data.api.ApiError
import com.chartshop.app.data.api.ApiResult
import com.chartshop.app.data.api.OwnerApi
import com.chartshop.app.data.api.ShopApi
import com.chartshop.app.data.api.apiCall
import com.chartshop.app.data.products.ProductRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import java.io.File

/**
 * Every screen past Products talks to the API through here. Writes bump [changes], which
 * screens watch to reload, the way the web app invalidates its queries after a mutation.
 */
class ShopRepository(
    private val shopApi: ShopApi,
    private val ownerApi: OwnerApi,
    private val products: ProductRepository,
    private val json: Json,
    private val reportsDir: File,
) {
    private val _changes = MutableStateFlow(0L)

    /** Goes up after every successful write anywhere in the app. */
    val changes: StateFlow<Long> = _changes.asStateFlow()

    suspend fun <T> shop(block: suspend ShopApi.() -> T): ApiResult<T> = apiCall(json) { shopApi.block() }

    suspend fun <T> owner(block: suspend OwnerApi.() -> T): ApiResult<T> = apiCall(json) { ownerApi.block() }

    /** A write that may move stock (sales, laybyes, orders, chat) also refreshes the product cache. */
    suspend fun <T> shopWrite(touchesStock: Boolean = false, block: suspend ShopApi.() -> T): ApiResult<T> =
        afterWrite(shop(block), touchesStock)

    suspend fun <T> ownerWrite(touchesStock: Boolean = false, block: suspend OwnerApi.() -> T): ApiResult<T> =
        afterWrite(owner(block), touchesStock)

    fun notifyChanged() = _changes.update { it + 1 }

    private suspend fun <T> afterWrite(result: ApiResult<T>, touchesStock: Boolean): ApiResult<T> {
        if (result is ApiResult.Success) {
            notifyChanged()
            if (touchesStock) products.refresh()
        }
        return result
    }

    /** Saves the same PDF Telegram's `export` sends, so it can be shared from the phone. */
    suspend fun downloadReportPdf(type: String, month: String?): ApiResult<File> {
        val response = when (val result = owner { exportPdf(type, month) }) {
            is ApiResult.Failure -> return result
            is ApiResult.Success -> result.value
        }
        val body = response.body()
        if (!response.isSuccessful || body == null) {
            return ApiResult.Failure(
                ApiError.fromHttp(response.code(), response.errorBody()?.string(), json),
            )
        }
        if (body.contentType()?.subtype?.contains("json") == true) {
            val error = ApiError.fromHttp(response.code(), body.string(), json)
            return ApiResult.Failure(if (response.isSuccessful) error.copy(message = "Failed to download PDF.") else error)
        }
        val fileName = Regex("""filename="?([^";]+)"?""", RegexOption.IGNORE_CASE)
            .find(response.headers()["Content-Disposition"].orEmpty())
            ?.groupValues?.get(1)
            ?: "chartshop-$type-report.pdf"
        return apiCall(json) {
            withContext(Dispatchers.IO) {
                reportsDir.mkdirs()
                val file = File(reportsDir, fileName.replace(Regex("""[\\/]"""), "_"))
                body.byteStream().use { input -> file.outputStream().use { input.copyTo(it) } }
                file
            }
        }
    }
}
