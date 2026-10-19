package com.chartshop.app.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.chartshop.app.data.model.Product
import com.chartshop.app.domain.CatalogLine
import com.chartshop.app.domain.NumberInput
import com.chartshop.app.domain.ProductCatalog
import com.chartshop.app.domain.activeVariants

/**
 * Product → option → pack → qty → custom price, showing the option and pack pickers
 * only when the product has them. Mirror of frontend/src/components/products/ProductLineFields.tsx.
 */
@Composable
fun ProductLineFields(
    line: CatalogLine,
    products: List<Product>,
    onChange: (CatalogLine) -> Unit,
    modifier: Modifier = Modifier,
    onRemove: (() -> Unit)? = null,
    hidePrice: Boolean = false,
) {
    val product = products.firstOrNull { it.id == line.productId }
    val variants = product?.activeVariants.orEmpty()
    val packs = ProductCatalog.packsFor(product, line.variantId)
    val selectedPack = packs.firstOrNull { it.id == line.packId }
    val selectedVariant = variants.firstOrNull { it.id == line.variantId }

    Column(modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Field("Product", Modifier.fillMaxWidth()) {
            SelectInput(
                options = products.map { it.id to ProductCatalog.productOption(it) },
                selected = line.productId.ifEmpty { null },
                onSelect = { id -> onChange(ProductCatalog.selectProduct(line, products.firstOrNull { it.id == id })) },
                modifier = Modifier.fillMaxWidth(),
                placeholder = if (products.isEmpty()) "No products yet" else "Select…",
            )
        }
        if (ProductCatalog.showVariantPicker(product)) {
            Field("Option", Modifier.fillMaxWidth()) {
                SelectInput(
                    options = variants.map { it.id to ProductCatalog.variantOption(it) },
                    selected = line.variantId.ifEmpty { null },
                    onSelect = { onChange(ProductCatalog.selectVariant(line, product, it)) },
                    modifier = Modifier.fillMaxWidth(),
                    placeholder = if (variants.isEmpty()) "No options" else "Select…",
                )
            }
        }
        if (ProductCatalog.showPackPicker(product, line.variantId)) {
            Field("Pack", Modifier.fillMaxWidth()) {
                SelectInput(
                    options = packs.map { it.id to ProductCatalog.packOption(it) },
                    selected = line.packId.ifEmpty { null },
                    onSelect = { onChange(line.copy(packId = it, price = "")) },
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }
        FieldRow {
            Field("Qty", Modifier.weight(1f)) {
                TextInput(
                    line.quantity,
                    { onChange(line.copy(quantity = NumberInput.sanitizeCount(it))) },
                    Modifier.fillMaxWidth(),
                    placeholder = "Quantity",
                    kind = InputKind.Count,
                )
            }
            if (!hidePrice) {
                Field("Custom price (optional)", Modifier.weight(1f)) {
                    TextInput(
                        line.price,
                        { onChange(line.copy(price = NumberInput.sanitizeMoney(it))) },
                        Modifier.fillMaxWidth(),
                        placeholder = NumberInput.moneyField(selectedPack?.price ?: selectedVariant?.price).ifEmpty { "Override price" },
                        kind = InputKind.Money,
                    )
                }
            }
        }
        if (onRemove != null) {
            ArrowButton("Remove", onClick = onRemove, tone = ButtonTone.Ghost)
        }
    }
}
