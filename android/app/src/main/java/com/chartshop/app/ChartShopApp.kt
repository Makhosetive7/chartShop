package com.chartshop.app

import android.app.Application
import com.chartshop.app.data.session.SessionState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class ChartShopApp : Application() {

    private val appScope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this, appScope)
        appScope.launch { container.legalConsent.restore() }
        appScope.launch {
            container.sessionManager.restore()
            if (container.sessionManager.state.value is SessionState.SignedIn) {
                container.authRepository.refreshAccount()
            }
        }
    }
}
