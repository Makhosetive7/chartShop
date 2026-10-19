package com.chartshop.app.data.products

import com.chartshop.app.data.api.ApiResult
import com.chartshop.app.data.api.ProductsApi
import com.chartshop.app.data.api.apiCall
import com.chartshop.app.data.model.CreateProductRequest
import com.chartshop.app.data.model.DeleteProductRequest
import com.chartshop.app.data.model.NewPackRequest
import com.chartshop.app.data.model.NewVariantRequest
import com.chartshop.app.data.model.Product
import com.chartshop.app.data.model.StockRequest
import com.chartshop.app.data.model.UpdateProductRequest
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.serialization.json.Json

enum class StockOp(val wire: String) { Add("+"), Remove("-") }

/**
 * Holds the shop's catalog for every screen. Each write returns the updated product,
 * which replaces the cached copy so lists and details agree without a refetch.
 */
class ProductRepository(
    private val api: ProductsApi,
    private val json: Json,
) {
    private val _products = MutableStateFlow<List<Product>?>(null)

    /** `null` until the first successful load. */
    val products: StateFlow<List<Product>?> = _products.asStateFlow()

    suspend fun refresh(): ApiResult<Unit> =
        when (val result = apiCall(json) { api.list() }) {
            is ApiResult.Failure -> result
            is ApiResult.Success -> {
                _products.value = result.value.products.filter { it.isActive }.sortedForDisplay()
                ApiResult.Success(Unit)
            }
        }

    suspend fun create(request: CreateProductRequest): ApiResult<Product> =
        write { api.create(request).product }

    suspend fun update(productId: String, request: UpdateProductRequest): ApiResult<Product> =
        write { api.update(productId, request).product }

    suspend fun adjustStock(productId: String, variantId: String, op: StockOp, quantity: Int): ApiResult<Product> =
        write { api.adjustStock(productId, StockRequest(op.wire, quantity, variantId)).product }

    suspend fun addVariant(productId: String, request: NewVariantRequest): ApiResult<Product> =
        write { api.addVariant(productId, request).product }

    suspend fun deleteVariant(productId: String, variantId: String): ApiResult<Product> =
        write { api.deleteVariant(productId, variantId).product }

    suspend fun addPack(productId: String, variantId: String, request: NewPackRequest): ApiResult<Product> =
        write { api.addPack(productId, variantId, request).product }

    suspend fun deletePack(productId: String, variantId: String, packId: String): ApiResult<Product> =
        write { api.deletePack(productId, variantId, packId).product }

    /** Soft-deletes even when the product has sales; past sales keep their records. */
    suspend fun delete(productId: String): ApiResult<Unit> =
        when (val result = apiCall(json) { api.delete(productId, DeleteProductRequest(confirm = true)) }) {
            is ApiResult.Failure -> result
            is ApiResult.Success -> {
                _products.update { list -> list?.filterNot { it.id == productId } }
                ApiResult.Success(Unit)
            }
        }

    /** Drops the cache so another shop signing in on this phone never sees it. */
    fun clear() {
        _products.value = null
    }

    private suspend fun write(block: suspend () -> Product): ApiResult<Product> {
        val result = apiCall(json, block)
        if (result is ApiResult.Success) upsert(result.value)
        return result
    }

    private fun upsert(product: Product) {
        _products.update { list ->
            if (list == null) return@update null
            val others = list.filterNot { it.id == product.id }
            (if (product.isActive) others + product else others).sortedForDisplay()
        }
    }

    private fun List<Product>.sortedForDisplay() = sortedBy { it.name.lowercase() }
}
