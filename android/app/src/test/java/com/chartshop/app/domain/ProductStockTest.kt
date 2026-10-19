package com.chartshop.app.domain

import com.chartshop.app.data.model.Product
import com.chartshop.app.data.model.ProductPack
import com.chartshop.app.data.model.ProductVariant
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ProductStockTest {

    private fun variant(
        id: String = "v1",
        label: String = "",
        stock: Int = 20,
        threshold: Int = 5,
        price: Double = 2.5,
        trackStock: Boolean = true,
        isActive: Boolean = true,
        baseUnit: String = "piece",
    ) = ProductVariant(
        id = id, label = label, stock = stock, lowStockThreshold = threshold, price = price,
        trackStock = trackStock, isActive = isActive, baseUnit = baseUnit,
    )

    private fun product(vararg variants: ProductVariant) = Product(id = "p1", name = "Coke", variants = variants.toList())

    /** A product as the server sends it, with its synced totals. */
    private fun totals(id: String = "p1", stock: Int, threshold: Int = 5, price: Double = 2.5, trackStock: Boolean = true) =
        Product(id = id, name = id, stock = stock, lowStockThreshold = threshold, price = price, trackStock = trackStock)

    @Test
    fun `status reads the product totals like the web page`() {
        assertEquals(StockStatus.Ok, totals(stock = 6, threshold = 5).stockStatus())
        assertEquals(StockStatus.Low, totals(stock = 5, threshold = 5).stockStatus())
        assertEquals(StockStatus.Out, totals(stock = 0).stockStatus())
        assertEquals(StockStatus.Off, totals(stock = 0, trackStock = false).stockStatus())
    }

    @Test
    fun `options show for labels, several variants, or extra packs`() {
        assertFalse(product(variant()).hasOptions)
        assertTrue(product(variant(label = "500ml")).hasOptions)
        assertTrue(product(variant("a"), variant("b")).hasOptions)
        assertFalse(product(variant("a"), variant("b", isActive = false)).hasOptions)
        val withCrate = variant().copy(
            packs = listOf(ProductPack(id = "s", label = "Single"), ProductPack(id = "c", label = "Crate", unitsPerPack = 24)),
        )
        assertTrue(product(withCrate).hasOptions)
    }

    @Test
    fun `price details list each pack`() {
        val v = variant(price = 1.2).copy(
            packs = listOf(
                ProductPack(id = "s", label = "Single", price = 1.2),
                ProductPack(id = "c", label = "Crate", unitsPerPack = 24, price = 26.0),
                ProductPack(id = "x", label = "Tray", unitsPerPack = 12, price = 13.0, isActive = false),
            ),
        )
        assertEquals("Sell price $1.20 · Single $1.20 · Crate of 24 · $26.00", v.priceDetails())
        assertEquals("Sell price $2.50", variant().priceDetails())
        assertEquals("Standard", variant(label = "  ").displayLabel())
    }

    @Test
    fun `summary counts low and out, and values tracked stock`() {
        val summary = listOf(
            totals("a", stock = 0),
            totals("b", stock = 2, price = 1.0),
            totals("c", stock = 50, price = 2.0),
            totals("d", stock = 100, price = 9.0, trackStock = false),
        ).summary()
        assertEquals(4, summary.total)
        assertEquals(1, summary.low)
        assertEquals(1, summary.out)
        assertEquals(102.0, summary.stockValue, 0.0001)
    }

    @Test
    fun `money formats like the web app`() {
        assertEquals("$0.00", formatMoney(0.0))
        assertEquals("$1234.50", formatMoney(1234.5))
    }

    @Test
    fun `money input keeps one point and two decimals`() {
        assertEquals("12.50", NumberInput.sanitizeMoney("1a2.5.09"))
        assertEquals(".5", NumberInput.sanitizeMoney(".5"))
        assertEquals(0.5, NumberInput.parseMoney(".5")!!, 0.0)
        assertNull(NumberInput.parseMoney("."))
        assertNull(NumberInput.parseMoney(""))
    }

    @Test
    fun `count input is digits only`() {
        assertEquals("24", NumberInput.sanitizeCount("2-4 "))
        assertEquals(24, NumberInput.parseCount(" 24 "))
        assertNull(NumberInput.parseCount("abc"))
    }

    @Test
    fun `money field drops trailing zeros on whole amounts`() {
        assertEquals("3", NumberInput.moneyField(3.0))
        assertEquals("2.50", NumberInput.moneyField(2.5))
        assertEquals("", NumberInput.moneyField(null))
    }
}
