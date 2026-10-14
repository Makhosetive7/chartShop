package com.chartshop.app.ui.auth

import android.content.ClipData
import android.content.ClipDescription
import android.content.Intent
import android.os.Build
import android.os.PersistableBundle
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.selection.toggleable
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ContentCopy
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material3.Checkbox
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.ClipEntry
import androidx.compose.ui.platform.LocalClipboard
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import com.chartshop.app.ui.components.Banner
import com.chartshop.app.ui.components.BannerTone
import com.chartshop.app.ui.components.PrimaryButton
import com.chartshop.app.ui.theme.ChartShopColors
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun RecoveryCodesPanel(
    codes: List<String>,
    username: String?,
    saved: Boolean,
    onSavedChange: (Boolean) -> Unit,
    onContinue: () -> Unit,
) {
    val context = LocalContext.current
    val clipboard = LocalClipboard.current
    val scope = rememberCoroutineScope()
    var copied by remember { mutableStateOf(false) }

    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Banner(
            "Save these codes now. They are shown once and never again. If you lose your PIN and these codes, " +
                "your shop may be unrecoverable.",
            BannerTone.Error,
        )
        Text(
            "Use one code with your username under “Forgot PIN?” to reset your PIN. Each code works only once.",
            style = MaterialTheme.typography.bodyMedium,
            color = ChartShopColors.TextSecondary,
        )
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(ChartShopColors.Cream)
                .border(1.dp, ChartShopColors.Border)
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            codes.forEach { code ->
                Text(code, fontFamily = FontFamily.Monospace, style = MaterialTheme.typography.bodyLarge)
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            OutlinedButton(
                shape = MaterialTheme.shapes.small,
                onClick = {
                    scope.launch {
                        clipboard.setClipEntry(ClipEntry(sensitiveClip(codes.joinToString("\n"))))
                        copied = true
                        delay(2_000)
                        copied = false
                    }
                },
            ) {
                Icon(Icons.Outlined.ContentCopy, contentDescription = null)
                Spacer(Modifier.width(8.dp))
                Text(if (copied) "Copied" else "Copy all")
            }
            OutlinedButton(
                shape = MaterialTheme.shapes.small,
                onClick = {
                    val send = Intent(Intent.ACTION_SEND).apply {
                        type = "text/plain"
                        putExtra(Intent.EXTRA_SUBJECT, "ChartShop recovery codes")
                        putExtra(Intent.EXTRA_TEXT, shareText(codes, username))
                    }
                    context.startActivity(Intent.createChooser(send, "Save recovery codes"))
                },
            ) {
                Icon(Icons.Outlined.Share, contentDescription = null)
                Spacer(Modifier.width(8.dp))
                Text("Share")
            }
        }
        Text(
            "Tip: in WhatsApp, choose “Message yourself” so the codes stay in your personal notes. " +
                "Anyone with that chat can reset your PIN.",
            style = MaterialTheme.typography.bodySmall,
            color = ChartShopColors.TextMuted,
        )
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .toggleable(value = saved, role = Role.Checkbox, onValueChange = onSavedChange),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Checkbox(checked = saved, onCheckedChange = null)
            Text(
                "I saved these codes offline. I understand ChartShop cannot show them again.",
                modifier = Modifier.padding(start = 12.dp),
                style = MaterialTheme.typography.bodyMedium,
            )
        }
        PrimaryButton(text = "I saved my codes — continue", onClick = onContinue, enabled = saved)
    }
}

private fun sensitiveClip(text: String): ClipData =
    ClipData.newPlainText("ChartShop recovery codes", text).apply {
        description.extras = PersistableBundle().apply {
            val key = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                ClipDescription.EXTRA_IS_SENSITIVE
            } else {
                "android.content.extra.IS_SENSITIVE"
            }
            putBoolean(key, true)
        }
    }

private fun shareText(codes: List<String>, username: String?): String = buildString {
    appendLine("ChartShop recovery codes" + (username?.let { " for @$it" } ?: ""))
    appendLine("Keep private. Each code resets your PIN once.")
    appendLine("Anyone with this chat can reset your shop PIN.")
    appendLine()
    codes.forEach { appendLine(it) }
    appendLine()
    append("Reset: ChartShop app → Forgot PIN, or https://chart-shop.vercel.app/recover")
}
