package com.chartshop.app.data.api

import com.chartshop.app.data.model.CreateProductRequest
import com.chartshop.app.data.model.DeleteProductRequest
import com.chartshop.app.data.model.MessageResponse
import com.chartshop.app.data.model.NewPackRequest
import com.chartshop.app.data.model.NewVariantRequest
import com.chartshop.app.data.model.ProductListResponse
import com.chartshop.app.data.model.ProductResponse
import com.chartshop.app.data.model.StockRequest
import com.chartshop.app.data.model.UpdateProductRequest
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.HTTP
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path

interface ProductsApi {
    @GET("products")
    suspend fun list(): ProductListResponse

    @POST("products")
    suspend fun create(@Body body: CreateProductRequest): ProductResponse

    @PATCH("products/{id}")
    suspend fun update(@Path("id") id: String, @Body body: UpdateProductRequest): ProductResponse

    @HTTP(method = "DELETE", path = "products/{id}", hasBody = true)
    suspend fun delete(@Path("id") id: String, @Body body: DeleteProductRequest): MessageResponse

    @POST("products/{id}/stock")
    suspend fun adjustStock(@Path("id") id: String, @Body body: StockRequest): ProductResponse

    @POST("products/{id}/variants")
    suspend fun addVariant(@Path("id") id: String, @Body body: NewVariantRequest): ProductResponse

    @DELETE("products/{id}/variants/{variantId}")
    suspend fun deleteVariant(@Path("id") id: String, @Path("variantId") variantId: String): ProductResponse

    @POST("products/{id}/variants/{variantId}/packs")
    suspend fun addPack(
        @Path("id") id: String,
        @Path("variantId") variantId: String,
        @Body body: NewPackRequest,
    ): ProductResponse

    @DELETE("products/{id}/variants/{variantId}/packs/{packId}")
    suspend fun deletePack(
        @Path("id") id: String,
        @Path("variantId") variantId: String,
        @Path("packId") packId: String,
    ): ProductResponse
}
