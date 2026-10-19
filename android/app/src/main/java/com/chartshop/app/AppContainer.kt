package com.chartshop.app

import android.content.Context
import com.chartshop.app.data.api.AuthApi
import com.chartshop.app.data.api.AuthInterceptor
import com.chartshop.app.data.api.OwnerApi
import com.chartshop.app.data.api.ProductsApi
import com.chartshop.app.data.api.ShopApi
import com.chartshop.app.data.auth.AuthRepository
import com.chartshop.app.data.consent.DataStoreConsentStorage
import com.chartshop.app.data.consent.LegalConsent
import com.chartshop.app.data.notifications.NotificationCenter
import com.chartshop.app.data.products.ProductRepository
import com.chartshop.app.data.session.DataStoreSessionStorage
import com.chartshop.app.data.session.SessionManager
import com.chartshop.app.data.session.SessionState
import com.chartshop.app.data.shop.ShopRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import java.io.File
import java.util.concurrent.TimeUnit

class AppContainer(context: Context, appScope: CoroutineScope) {

    val json = Json {
        ignoreUnknownKeys = true
        explicitNulls = false
        coerceInputValues = true
    }

    val sessionManager = SessionManager(DataStoreSessionStorage(context, json), appScope)

    val legalConsent = LegalConsent(DataStoreConsentStorage(context), appScope)

    // Render's free tier can take 10–30 s to wake, so timeouts are well above OkHttp's 10 s default.
    private val okHttp = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .callTimeout(90, TimeUnit.SECONDS)
        .addInterceptor(AuthInterceptor(sessionManager, "chartshop-android/${BuildConfig.VERSION_NAME}"))
        .apply {
            if (BuildConfig.DEBUG) {
                addInterceptor(HttpLoggingInterceptor().setLevel(HttpLoggingInterceptor.Level.BASIC))
            }
        }
        .build()

    private val retrofit = Retrofit.Builder()
        .baseUrl(BuildConfig.API_BASE_URL)
        .client(okHttp)
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()

    val authRepository = AuthRepository(retrofit.create(AuthApi::class.java), sessionManager, json)

    val productRepository = ProductRepository(retrofit.create(ProductsApi::class.java), json)

    /** Shared through `res/xml/file_paths.xml` so report PDFs can go to WhatsApp, email, or Drive. */
    val reportsDir = File(context.cacheDir, "reports")

    val shopRepository = ShopRepository(
        shopApi = retrofit.create(ShopApi::class.java),
        ownerApi = retrofit.create(OwnerApi::class.java),
        products = productRepository,
        json = json,
        reportsDir = reportsDir,
    )

    val notificationCenter = NotificationCenter(shopRepository)

    init {
        appScope.launch {
            sessionManager.state
                .map { (it as? SessionState.SignedIn)?.shop?.id }
                .distinctUntilChanged()
                .collect {
                    productRepository.clear()
                    notificationCenter.clear()
                    reportsDir.deleteRecursively()
                }
        }
    }
}
