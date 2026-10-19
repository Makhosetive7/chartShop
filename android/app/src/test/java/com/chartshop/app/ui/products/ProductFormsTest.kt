package com.chartshop.app.ui.products

import com.chartshop.app.data.model.CreateProductRequest
import com.chartshop.app.data.model.Product
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ProductFormsTest {

    private fun create(
        name: String = "Coca-Cola",
        threshold: String = "",
        shopDefault: Int? = null,
        options: List<OptionDraft>,
    ) = ProductForms.checkCreate(name, threshold, shopDefault, options)

    private fun FormCheck<CreateProductRequest>.request() = (this as FormCheck.Valid).value

    private fun FormCheck<*>.message() = (this as FormCheck.Invalid).message

    @Test
    fun `a name is required before anything else`() {
        val check = create(name = "  ", options = listOf(OptionDraft()))
        assertEquals("Product name is required.", check.message())
        assertNull((check as FormCheck.Invalid).rowErrors)
    }

    @Test
    fun `a single option needs price and stock but no label`() {
        val request = create(options = listOf(OptionDraft(price = "2.50", stock = "10"))).request()
        assertEquals("", request.variants.single().label)
    }

    @Test
    fun `row errors and the toast use the web wording`() {
        val check = create(options = listOf(OptionDraft(price = "0", stock = "")))
        val rows = (check as FormCheck.Invalid).rowErrors!!
        assertEquals("Price required", rows.single().price)
        assertEquals("Stock must be > 0", rows.single().stock)
        assertEquals("Each option needs a price and stock greater than 0.", check.message)

        assertEquals("Each option needs a price.", create(options = listOf(OptionDraft(stock = "3"))).message())
        assertEquals("Each option needs stock greater than 0.", create(options = listOf(OptionDraft(price = "3"))).message())
    }

    @Test
    fun `several options each need a label`() {
        val check = create(
            options = listOf(
                OptionDraft(label = "500ml", price = "1", stock = "24"),
                OptionDraft(price = "2", stock = "6"),
            ),
        )
        val rows = (check as FormCheck.Invalid).rowErrors!!
        assertNull(rows[0].label)
        assertEquals("Label required", rows[1].label)
        assertEquals("Name each option when adding more than one.", check.message)
    }

    @Test
    fun `create request trims text and leaves an empty cost out`() {
        val request = create(
            name = "  Coca-Cola ",
            threshold = "5",
            options = listOf(OptionDraft(label = " 500ml ", price = "1.20", costPrice = "", stock = "48")),
        ).request()
        assertEquals("Coca-Cola", request.name)
        val variant = request.variants.single()
        assertEquals("500ml", variant.label)
        assertEquals(1.2, variant.price, 0.0)
        assertNull(variant.costPrice)
        assertEquals(48, variant.stock)
        assertEquals(5, variant.lowStockThreshold)
    }

    @Test
    fun `an empty or zero threshold falls back to the shop default, then 10`() {
        val option = OptionDraft(price = "1", stock = "1")
        assertEquals(7, create(threshold = "", shopDefault = 7, options = listOf(option)).request().variants.single().lowStockThreshold)
        assertEquals(7, create(threshold = "0", shopDefault = 7, options = listOf(option)).request().variants.single().lowStockThreshold)
        assertEquals(10, create(threshold = "", shopDefault = null, options = listOf(option)).request().variants.single().lowStockThreshold)
    }

    @Test
    fun `a new option needs a price, then stock`() {
        assertEquals("Option price must be greater than 0.", ProductForms.checkNewVariant(VariantDraft(stock = "4")).message())
        assertEquals("Option stock must be greater than 0.", ProductForms.checkNewVariant(VariantDraft(price = "2")).message())
        val request = (ProductForms.checkNewVariant(VariantDraft(" 2L ", "3.5", "6")) as FormCheck.Valid).value
        assertEquals("2L", request.label)
        assertEquals(6, request.stock)
    }

    @Test
    fun `packs are checked in the web order`() {
        assertEquals("Choose which option the pack belongs to.", ProductForms.checkPack(PackDraft(variantId = "")).message())
        assertEquals("Pack label is required.", ProductForms.checkPack(PackDraft(variantId = "v1")).message())
        assertEquals(
            "Units per pack must be at least 1.",
            ProductForms.checkPack(PackDraft(variantId = "v1", label = "Crate", unitsPerPack = "0")).message(),
        )
        assertEquals("Pack price is required.", ProductForms.checkPack(PackDraft(variantId = "v1", label = "Crate")).message())
        val request = (ProductForms.checkPack(PackDraft("v1", " Crate ", "24", "26")) as FormCheck.Valid).value
        assertEquals("Crate", request.label)
        assertEquals(24, request.unitsPerPack)
    }

    @Test
    fun `an empty stock box means one`() {
        assertEquals(1, (ProductForms.stockQuantity("") as FormCheck.Valid).value)
        assertEquals(5, (ProductForms.stockQuantity("5") as FormCheck.Valid).value)
        assertEquals("Enter how many to add or take out.", ProductForms.stockQuantity("0").message())
    }

    @Test
    fun `inline price only saves a real change`() {
        val product = Product(id = "p1", name = "Bread", price = 1.2, costPrice = 0.8)
        assertNull(ProductForms.priceUpdate(product, "1.20"))
        assertNull(ProductForms.priceUpdate(product, ""))
        assertEquals(1.5, ProductForms.priceUpdate(product, "1.5")!!.price!!, 0.0)
    }

    @Test
    fun `inline cost clears with an explicit null`() {
        val product = Product(id = "p1", name = "Bread", price = 1.2, costPrice = 0.8)
        assertNull(ProductForms.costUpdate(product, "0.80"))
        assertEquals(JsonNull, ProductForms.costUpdate(product, "")!!.costPrice)
        assertEquals(JsonPrimitive(0.9), ProductForms.costUpdate(product, "0.9")!!.costPrice)
        assertTrue(ProductForms.costUpdate(product.copy(costPrice = null), "") == null)
    }
}
