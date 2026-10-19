package com.chartshop.app.domain

import com.chartshop.app.data.model.Product
import com.chartshop.app.data.model.ProductPack
import com.chartshop.app.data.model.ProductVariant

enum class StockStatus { Ok, Low, Out, Off }

/** Mirror of `stockStatus` in frontend/src/pages/ProductsPage.tsx, read from the product's synced totals. */
fun Product.stockStatus(): StockStatus = when {
    !trackStock -> StockStatus.Off
    stock <= 0 -> StockStatus.Out
    stock <= lowStockThreshold -> StockStatus.Low
    else -> StockStatus.Ok
}

val Product.activeVariants: List<ProductVariant>
    get() = variants.filter { it.isActive }.sortedBy { it.sortOrder }

val ProductVariant.activePacks: List<ProductPack>
    get() = packs.filter { it.isActive }.sortedBy { it.sortOrder }

/** Mirror of `productHasOptions` in frontend/src/utils/productCatalog.ts. */
val Product.hasOptions: Boolean
    get() {
        val active = activeVariants
        return active.size > 1 ||
            active.any { it.label.isNotBlank() } ||
            active.any { it.activePacks.size > 1 }
    }

fun ProductVariant.displayLabel(): String = label.trim().ifEmpty { "Standard" }

/** "Sell price $1.20 · Single $1.20 · Crate of 24 · $26.00", as on the web edit dialog. */
fun ProductVariant.priceDetails(): String {
    val packs = activePacks.joinToString(" · ") { pack ->
        if (pack.unitsPerPack == 1) "Single ${formatMoney(pack.price)}"
        else "${pack.label} of ${pack.unitsPerPack} · ${formatMoney(pack.price)}"
    }
    return "Sell price ${formatMoney(price)}" + if (packs.isEmpty()) "" else " · $packs"
}

data class ProductSummary(
    val total: Int,
    val low: Int,
    val out: Int,
    val stockValue: Double,
)

fun List<Product>.summary() = ProductSummary(
    total = size,
    low = count { it.stockStatus() == StockStatus.Low },
    out = count { it.stockStatus() == StockStatus.Out },
    stockValue = filter { it.trackStock }.sumOf { it.stock * it.price },
)
