package com.chartshop.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.chartshop.app.ui.ChartShopRoot
import com.chartshop.app.ui.theme.ChartShopTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            ChartShopTheme {
                ChartShopRoot()
            }
        }
    }
}
