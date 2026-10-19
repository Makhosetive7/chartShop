package com.chartshop.app.domain

import com.chartshop.app.data.model.Product
import com.chartshop.app.data.model.ProductPack
import com.chartshop.app.data.model.ProductVariant
import com.chartshop.app.data.model.SaleItemInput
import com.chartshop.app.data.model.SaleLine

/** One product line on the sale, laybye, and order forms. Mirror of `CatalogLine` in frontend/src/utils/productCatalog.ts. */
data class CatalogLine(
    val productId: String = "",
    val variantId: String = "",
    val packId: String = "",
    val quantity: String = "1",
    val price: String = "",
)

object ProductCatalog {

    fun packsFor(product: Product?, variantId: String): List<ProductPack> =
        product?.activeVariants?.firstOrNull { it.id == variantId }?.activePacks.orEmpty()

    private fun defaultPack(packs: List<ProductPack>): ProductPack? = packs.firstOrNull { it.unitsPerPack == 1 } ?: packs.firstOrNull()

    /** Picking a product selects its first option and that option's single pack. */
    fun selectProduct(line: CatalogLine, product: Product?): CatalogLine {
        val variant = product?.activeVariants?.firstOrNull()
        val pack = variant?.let { defaultPack(it.activePacks) }
        return line.copy(productId = product?.id.orEmpty(), variantId = variant?.id.orEmpty(), packId = pack?.id.orEmpty(), price = "")
    }

    fun selectVariant(line: CatalogLine, product: Product?, variantId: String): CatalogLine =
        line.copy(variantId = variantId, packId = defaultPack(packsFor(product, variantId))?.id.orEmpty(), price = "")

    fun showVariantPicker(product: Product?): Boolean {
        val variants = product?.activeVariants.orEmpty()
        return variants.size > 1 || variants.any { it.label.isNotBlank() }
    }

    fun showPackPicker(product: Product?, variantId: String): Boolean = packsFor(product, variantId).size > 1

    fun toSaleItem(line: CatalogLine): SaleItemInput? {
        val quantity = NumberInput.parseCount(line.quantity) ?: return null
        if (line.productId.isEmpty() || quantity <= 0) return null
        return SaleItemInput(
            productId = line.productId,
            variantId = line.variantId.ifEmpty { null },
            packId = line.packId.ifEmpty { null },
            quantity = quantity,
            price = NumberInput.parseMoney(line.price),
        )
    }

    fun productOption(product: Product): String =
        "${product.name} · ${formatMoney(product.price)}" + if (product.trackStock) " · stock ${product.stock}" else ""

    fun variantOption(variant: ProductVariant): String =
        variant.displayLabel() + (if (variant.trackStock) " · stock ${variant.stock}" else "") + " · ${formatMoney(variant.price)}"

    fun packOption(pack: ProductPack): String = "${pack.label} (${pack.unitsPerPack}) · ${formatMoney(pack.price)}"

    /** "2× Coke · 2L": strips legacy "Name (variant)" snapshots and shows the last qualifier only. */
    fun itemLabel(item: SaleLine): String {
        val raw = item.productName?.trim().orEmpty().ifEmpty { "Item" }
        val name = raw.replace(Regex("""\s*\([^)]*\)\s*$"""), "").trim().ifEmpty { raw }
        val pack = item.packLabel?.trim().orEmpty()
        val variant = item.variantLabel?.trim().orEmpty()
        val last = when {
            pack.isNotEmpty() && pack != "Single" -> pack
            variant.isNotEmpty() -> variant
            else -> ""
        }
        val label = if (last.isNotEmpty()) "$name · $last" else name
        return item.quantity?.let { "$it× $label" } ?: label
    }

    /** First two items, then "+N more". */
    fun itemsSummary(items: List<SaleLine>, moreSuffix: String = " more", empty: String = "—"): String {
        if (items.isEmpty()) return empty
        val preview = items.take(2).joinToString(", ") { itemLabel(it) }
        return if (items.size > 2) "$preview +${items.size - 2}$moreSuffix" else preview
    }
}
