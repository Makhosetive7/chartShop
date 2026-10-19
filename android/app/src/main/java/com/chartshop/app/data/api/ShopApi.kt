package com.chartshop.app.data.api

import com.chartshop.app.data.model.CancelRequest
import com.chartshop.app.data.model.CancelResponse
import com.chartshop.app.data.model.CashAvailableResponse
import com.chartshop.app.data.model.CashSaleRequest
import com.chartshop.app.data.model.CreditDueResponse
import com.chartshop.app.data.model.CreditSaleRequest
import com.chartshop.app.data.model.CustomerListResponse
import com.chartshop.app.data.model.CustomerResponse
import com.chartshop.app.data.model.CustomerSaleRequest
import com.chartshop.app.data.model.ExpenseBreakdownResponse
import com.chartshop.app.data.model.ExpenseListResponse
import com.chartshop.app.data.model.ExpenseResponse
import com.chartshop.app.data.model.LaybyeAlertsResponse
import com.chartshop.app.data.model.LaybyeCompleteRequest
import com.chartshop.app.data.model.LaybyeListResponse
import com.chartshop.app.data.model.LaybyePayRequest
import com.chartshop.app.data.model.LaybyeResponse
import com.chartshop.app.data.model.NewCustomerRequest
import com.chartshop.app.data.model.NewExpenseRequest
import com.chartshop.app.data.model.NewLaybyeRequest
import com.chartshop.app.data.model.NewOrderRequest
import com.chartshop.app.data.model.OrderAlertsResponse
import com.chartshop.app.data.model.OrderListResponse
import com.chartshop.app.data.model.OrderResponse
import com.chartshop.app.data.model.OrderStatusRequest
import com.chartshop.app.data.model.RefundsResponse
import com.chartshop.app.data.model.SaleResponse
import com.chartshop.app.data.model.SalesListResponse
import com.chartshop.app.data.model.StockAlertsResponse
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

/** Counter and books routes: sales, laybyes, customers, orders, expenses, and the alert feeds. */
interface ShopApi {
    @POST("sales/cash")
    suspend fun cashSale(@Body body: CashSaleRequest): SaleResponse

    @POST("sales/credit")
    suspend fun creditSale(@Body body: CreditSaleRequest): SaleResponse

    @POST("sales/to-customer")
    suspend fun customerSale(@Body body: CustomerSaleRequest): SaleResponse

    @GET("sales/recent")
    suspend fun recentSales(@Query("limit") limit: Int): SalesListResponse

    @POST("sales/cancel/last")
    suspend fun cancelLastSale(@Body body: CancelRequest): CancelResponse

    @POST("sales/{id}/cancel")
    suspend fun cancelSale(@Path("id") id: String, @Body body: CancelRequest): CancelResponse

    @GET("sales/refunds")
    suspend fun refunds(@Query("days") days: Int): RefundsResponse

    @GET("sales/credit-due")
    suspend fun creditDue(): CreditDueResponse

    @GET("laybye")
    suspend fun laybyes(@Query("status") status: String): LaybyeListResponse

    @GET("laybye/alerts")
    suspend fun laybyeAlerts(): LaybyeAlertsResponse

    @POST("laybye")
    suspend fun createLaybye(@Body body: NewLaybyeRequest): LaybyeResponse

    @POST("laybye/pay")
    suspend fun payLaybye(@Body body: LaybyePayRequest): LaybyeResponse

    @POST("laybye/complete")
    suspend fun completeLaybye(@Body body: LaybyeCompleteRequest): LaybyeResponse

    @GET("customers")
    suspend fun customers(@Query("filter") filter: String): CustomerListResponse

    @POST("customers")
    suspend fun createCustomer(@Body body: NewCustomerRequest): CustomerResponse

    @GET("orders")
    suspend fun orders(@Query("status") status: String, @Query("limit") limit: Int): OrderListResponse

    @GET("orders/alerts")
    suspend fun orderAlerts(): OrderAlertsResponse

    @POST("orders")
    suspend fun createOrder(@Body body: NewOrderRequest): OrderResponse

    @PATCH("orders/{id}/status")
    suspend fun updateOrderStatus(@Path("id") id: String, @Body body: OrderStatusRequest): OrderResponse

    @GET("expenses")
    suspend fun expenses(@Query("period") period: String): ExpenseListResponse

    @GET("expenses/breakdown")
    suspend fun expenseBreakdown(@Query("period") period: String): ExpenseBreakdownResponse

    @GET("expenses/cash-available")
    suspend fun cashAvailable(): CashAvailableResponse

    @POST("expenses")
    suspend fun createExpense(@Body body: NewExpenseRequest): ExpenseResponse

    @GET("products/low-stock")
    suspend fun stockAlerts(): StockAlertsResponse
}
