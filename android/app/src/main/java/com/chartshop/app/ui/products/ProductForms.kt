package com.chartshop.app.ui.products

import com.chartshop.app.data.model.CreateProductRequest
import com.chartshop.app.data.model.NewPackRequest
import com.chartshop.app.data.model.NewVariantRequest
import com.chartshop.app.data.model.Product
import com.chartshop.app.data.model.UpdateProductRequest
import com.chartshop.app.domain.NumberInput
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive

/** One option row of the "Add product" card. Numbers stay as text until the form is submitted. */
data class OptionDraft(
    val label: String = "",
    val price: String = "",
    val costPrice: String = "",
    val stock: String = "",
)

data class OptionErrors(
    val label: String? = null,
    val price: String? = null,
    val stock: String? = null,
) {
    val any: Boolean get() = label != null || price != null || stock != null
}

/** The "Add option" panel in the edit dialog. */
data class VariantDraft(
    val label: String = "",
    val price: String = "",
    val stock: String = "",
)

/** The "Sell in packs" panel in the edit dialog. */
data class PackDraft(
    val variantId: String = "",
    val label: String = "",
    val unitsPerPack: String = "24",
    val price: String = "",
)

sealed interface FormCheck<out T> {
    data class Valid<T>(val value: T) : FormCheck<T>

    /** [rowErrors] is `null` when the problem isn't tied to an option row. */
    data class Invalid(val message: String, val rowErrors: List<OptionErrors>? = null) : FormCheck<Nothing>
}

/** Client-side checks and messages from the web Products page; the server re-validates everything. */
object ProductForms {
    const val DEFAULT_LOW_STOCK_ALERT = 10

    fun checkCreate(
        name: String,
        lowStockThreshold: String,
        shopLowStockAlert: Int?,
        options: List<OptionDraft>,
    ): FormCheck<CreateProductRequest> {
        val trimmedName = name.trim()
        if (trimmedName.isEmpty()) return FormCheck.Invalid("Product name is required.")

        val multi = options.size > 1
        val rowErrors = options.map { row ->
            val price = NumberInput.parseMoney(row.price)
            val stock = NumberInput.parseCount(row.stock)
            OptionErrors(
                label = if (multi && row.label.isBlank()) "Label required" else null,
                price = if (price == null || price <= 0.0) "Price required" else null,
                stock = if (stock == null || stock <= 0) "Stock must be > 0" else null,
            )
        }
        if (rowErrors.any { it.any }) {
            val missingPrice = rowErrors.any { it.price != null }
            val missingStock = rowErrors.any { it.stock != null }
            val message = when {
                missingPrice && missingStock -> "Each option needs a price and stock greater than 0."
                missingPrice -> "Each option needs a price."
                missingStock -> "Each option needs stock greater than 0."
                else -> "Name each option when adding more than one."
            }
            return FormCheck.Invalid(message, rowErrors)
        }

        val threshold = NumberInput.parseCount(lowStockThreshold)?.takeIf { it > 0 }
            ?: shopLowStockAlert?.takeIf { it > 0 }
            ?: DEFAULT_LOW_STOCK_ALERT
        return FormCheck.Valid(
            CreateProductRequest(
                name = trimmedName,
                variants = options.map { row ->
                    NewVariantRequest(
                        label = row.label.trim(),
                        price = NumberInput.parseMoney(row.price) ?: 0.0,
                        costPrice = NumberInput.parseMoney(row.costPrice),
                        stock = NumberInput.parseCount(row.stock) ?: 0,
                        lowStockThreshold = threshold,
                    )
                },
            ),
        )
    }

    fun checkNewVariant(draft: VariantDraft): FormCheck<NewVariantRequest> {
        val price = NumberInput.parseMoney(draft.price)
        val stock = NumberInput.parseCount(draft.stock)
        return when {
            price == null || price <= 0.0 -> FormCheck.Invalid("Option price must be greater than 0.")
            stock == null || stock <= 0 -> FormCheck.Invalid("Option stock must be greater than 0.")
            else -> FormCheck.Valid(NewVariantRequest(label = draft.label.trim(), price = price, stock = stock))
        }
    }

    fun checkPack(draft: PackDraft): FormCheck<NewPackRequest> {
        val units = NumberInput.parseCount(draft.unitsPerPack)
        val price = NumberInput.parseMoney(draft.price)
        return when {
            draft.variantId.isEmpty() -> FormCheck.Invalid("Choose which option the pack belongs to.")
            draft.label.isBlank() -> FormCheck.Invalid("Pack label is required.")
            units == null || units < 1 -> FormCheck.Invalid("Units per pack must be at least 1.")
            price == null -> FormCheck.Invalid("Pack price is required.")
            else -> FormCheck.Valid(NewPackRequest(label = draft.label.trim(), unitsPerPack = units, price = price))
        }
    }

    /** How many to add or take out; an empty box means one. */
    fun stockQuantity(raw: String): FormCheck<Int> {
        if (raw.isBlank()) return FormCheck.Valid(1)
        val quantity = NumberInput.parseCount(raw)
        return if (quantity == null || quantity <= 0) {
            FormCheck.Invalid("Enter how many to add or take out.")
        } else {
            FormCheck.Valid(quantity)
        }
    }

    /** The table's inline price box. `null` means nothing to save (empty, unchanged, or unreadable). */
    fun priceUpdate(product: Product, raw: String): UpdateProductRequest? {
        val price = NumberInput.parseMoney(raw) ?: return null
        return if (price == product.price) null else UpdateProductRequest(price = price)
    }

    /** The table's inline cost box; emptying it clears the cost. */
    fun costUpdate(product: Product, raw: String): UpdateProductRequest? {
        val cost = if (raw.isBlank()) null else NumberInput.parseMoney(raw) ?: return null
        if (cost == product.costPrice) return null
        return UpdateProductRequest(costPrice = if (cost == null) JsonNull else JsonPrimitive(cost))
    }
}
