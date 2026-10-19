package com.chartshop.app.data.model

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

/** A sell multiple of one variant's stock, e.g. a crate of 24 bottles. */
@Serializable
data class ProductPack(
    val id: String,
    val label: String = "",
    val unitsPerPack: Int = 1,
    val price: Double = 0.0,
    val costPrice: Double? = null,
    val isActive: Boolean = true,
    val sortOrder: Int = 0,
)

/** An independently stocked option of a product (size, flavour, weight). Stock is counted in [baseUnit]. */
@Serializable
data class ProductVariant(
    val id: String,
    val label: String = "",
    val baseUnit: String = "piece",
    val price: Double = 0.0,
    val costPrice: Double? = null,
    val stock: Int = 0,
    val lowStockThreshold: Int = 0,
    val trackStock: Boolean = true,
    val isActive: Boolean = true,
    val sortOrder: Int = 0,
    val packs: List<ProductPack> = emptyList(),
)

/**
 * The server keeps top-level fields in sync with [variants]: `stock` and `trackStock` cover every
 * tracked option, while `price`, `costPrice` and `lowStockThreshold` come from the first option.
 */
@Serializable
data class Product(
    val id: String,
    val name: String,
    val price: Double = 0.0,
    val costPrice: Double? = null,
    val stock: Int = 0,
    val trackStock: Boolean = true,
    val lowStockThreshold: Int = 0,
    val isActive: Boolean = true,
    val variants: List<ProductVariant> = emptyList(),
)

@Serializable
data class ProductListResponse(
    val products: List<Product> = emptyList(),
)

@Serializable
data class ProductResponse(
    val product: Product,
)

@Serializable
data class NewVariantRequest(
    val label: String = "",
    val price: Double,
    val costPrice: Double? = null,
    val stock: Int,
    val lowStockThreshold: Int? = null,
)

@Serializable
data class CreateProductRequest(
    val name: String,
    val variants: List<NewVariantRequest>,
)

/**
 * Every field is optional; `price` and `costPrice` also update the first option and its single pack.
 * [costPrice] is a [JsonElement] because the app's Json drops nulls, and the server needs an
 * explicit `null` to clear a cost price.
 */
@Serializable
data class UpdateProductRequest(
    val name: String? = null,
    val price: Double? = null,
    val costPrice: JsonElement? = null,
)

@Serializable
data class StockRequest(
    val op: String,
    val quantity: Int,
    val variantId: String,
)

@Serializable
data class NewPackRequest(
    val label: String,
    val unitsPerPack: Int,
    val price: Double,
)

@Serializable
data class DeleteProductRequest(
    val confirm: Boolean,
)
