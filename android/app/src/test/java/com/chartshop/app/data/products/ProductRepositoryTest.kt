package com.chartshop.app.data.products

import com.chartshop.app.data.api.ApiResult
import com.chartshop.app.data.api.ProductsApi
import com.chartshop.app.data.model.UpdateProductRequest
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonNull
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

class ProductRepositoryTest {

    private val json = Json {
        ignoreUnknownKeys = true
        explicitNulls = false
        coerceInputValues = true
    }
    private lateinit var server: MockWebServer
    private lateinit var repo: ProductRepository

    @Before
    fun setUp() {
        server = MockWebServer().apply { start() }
        val api = Retrofit.Builder()
            .baseUrl(server.url("/api/v1/"))
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
            .create(ProductsApi::class.java)
        repo = ProductRepository(api, json)
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun `refresh loads the catalog sorted by name`() = runTest {
        server.enqueue(ok("""{"success":true,"products":[${product("p2", "sugar")},${product("p1", "Bread")}]}"""))

        assertTrue(repo.refresh() is ApiResult.Success)

        assertEquals(listOf("Bread", "sugar"), repo.products.value!!.map { it.name })
        val variant = repo.products.value!!.first().variants.single()
        assertEquals(12, variant.stock)
        assertEquals("Single", variant.packs.single().label)
    }

    @Test
    fun `a stock change replaces the cached product`() = runTest {
        server.enqueue(ok("""{"success":true,"products":[${product("p1", "Bread", stock = 12)}]}"""))
        repo.refresh()
        server.takeRequest()
        server.enqueue(ok("""{"success":true,"product":${product("p1", "Bread", stock = 17)}}"""))

        val result = repo.adjustStock("p1", "v1", StockOp.Add, 5)

        assertTrue(result is ApiResult.Success)
        val request = server.takeRequest()
        assertEquals("/api/v1/products/p1/stock", request.path)
        assertEquals("""{"op":"+","quantity":5,"variantId":"v1"}""", request.body.readUtf8())
        assertEquals(17, repo.products.value!!.single().variants.single().stock)
    }

    @Test
    fun `writes before the first load don't invent a partial catalog`() = runTest {
        server.enqueue(ok("""{"success":true,"product":${product("p1", "Bread")}}"""))

        repo.update("p1", UpdateProductRequest(name = "Bread"))

        assertNull(repo.products.value)
    }

    @Test
    fun `clearing a cost sends an explicit null`() = runTest {
        server.enqueue(ok("""{"success":true,"product":${product("p1", "Bread")}}"""))

        repo.update("p1", UpdateProductRequest(costPrice = JsonNull))

        val request = server.takeRequest()
        assertEquals("PATCH", request.method)
        assertEquals("/api/v1/products/p1", request.path)
        assertEquals("""{"costPrice":null}""", request.body.readUtf8())
    }

    @Test
    fun `delete confirms and drops the product from the cache`() = runTest {
        server.enqueue(ok("""{"success":true,"products":[${product("p1", "Bread")},${product("p2", "Milk")}]}"""))
        repo.refresh()
        server.takeRequest()
        server.enqueue(ok("""{"success":true,"message":"Product Bread deleted."}"""))

        assertTrue(repo.delete("p1") is ApiResult.Success)

        val request = server.takeRequest()
        assertEquals("DELETE", request.method)
        assertEquals("""{"confirm":true}""", request.body.readUtf8())
        assertEquals(listOf("Milk"), repo.products.value!!.map { it.name })
    }

    @Test
    fun `server validation errors come back as messages`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(409).setBody("""{"success":false,"error":"Product \"Bread\" already exists."}"""),
        )

        val result = repo.update("p1", UpdateProductRequest(name = "Bread"))

        assertEquals("Product \"Bread\" already exists.", (result as ApiResult.Failure).error.message)
    }

    private fun ok(body: String) = MockResponse().setResponseCode(200).setBody(body)

    private fun product(id: String, name: String, stock: Int = 12) = """
        {"id":"$id","name":"$name","price":2.5,"costPrice":null,"stock":$stock,"trackStock":true,
         "lowStockThreshold":5,"isActive":true,"variants":[{"id":"v1","label":"","baseUnit":"piece","price":2.5,
         "costPrice":null,"stock":$stock,"lowStockThreshold":5,"trackStock":true,"barcode":null,"isActive":true,
         "sortOrder":0,"packs":[{"id":"k1","label":"Single","unitsPerPack":1,"price":2.5,"costPrice":null,
         "barcode":null,"isActive":true,"sortOrder":0}]}]}
    """.trimIndent()
}
