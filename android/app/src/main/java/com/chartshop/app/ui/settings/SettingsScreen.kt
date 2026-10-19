package com.chartshop.app.ui.settings

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.chartshop.app.BuildConfig
import com.chartshop.app.data.model.User
import com.chartshop.app.data.session.SessionState
import com.chartshop.app.ui.auth.RecoveryCodesPanel
import com.chartshop.app.ui.components.ArrowButton
import com.chartshop.app.ui.components.Badge
import com.chartshop.app.ui.components.BadgeTone
import com.chartshop.app.ui.components.ButtonSize
import com.chartshop.app.ui.components.ButtonTone
import com.chartshop.app.ui.components.Card
import com.chartshop.app.ui.components.CardTitle
import com.chartshop.app.ui.components.ConfirmDialog
import com.chartshop.app.ui.components.Field
import com.chartshop.app.ui.components.InputKind
import com.chartshop.app.ui.components.Modal
import com.chartshop.app.ui.components.ScreenPage
import com.chartshop.app.ui.components.SelectInput
import com.chartshop.app.ui.components.TextArea
import com.chartshop.app.ui.components.TextInput
import com.chartshop.app.ui.components.ToastHost
import com.chartshop.app.ui.theme.ChartShopColors
import kotlinx.coroutines.delay

@Composable
fun SettingsScreen(
    viewModel: SettingsViewModel,
    team: TeamViewModel,
    session: SessionState.SignedIn,
) {
    val toast by viewModel.toast.collectAsState()
    val teamToast by team.toast.collectAsState()
    val form by viewModel.form.collectAsState()
    val profile by viewModel.profile.collectAsState()
    val recovery by viewModel.recovery.collectAsState()
    val teamForm by team.form.collectAsState()
    val dialogOpen = form.confirmRegenerate || teamForm.removeTarget != null || teamForm.invite != null

    // Both cards share one toast slot on the page, newest wins.
    val pageToast = listOfNotNull(toast, teamToast).maxByOrNull { it.id }
    val dismissPageToast = {
        viewModel.dismissToast()
        team.dismissToast()
    }

    ScreenPage(
        toast = if (dialogOpen) null else pageToast,
        onDismissToast = dismissPageToast,
        refreshing = profile.loading && profile.data != null,
        onRefresh = {
            viewModel.refresh()
            team.refresh()
        },
    ) {
        Hero(session, viewModel)
        if (session.isAdmin) PreferencesCard(form, viewModel)
        AccountCard(session, form, viewModel)
        PinCard(form, viewModel)
        if (!session.shop.isDemo) TeamCard(team, teamForm)
        if (session.isAdmin && !session.shop.isDemo) {
            RecoveryCard(form, recovery.data?.remaining, recovery.firstLoad, viewModel, session.username)
        }
        SessionCard(form.busy == SettingsBusy.Logout, viewModel::logout)
    }

    if (form.confirmRegenerate) {
        ConfirmDialog(
            title = "Regenerate recovery codes?",
            description = "Your old unused codes stop working immediately. Save the new set offline before closing.",
            confirmLabel = "Generate codes",
            cancelLabel = "Keep existing",
            danger = false,
            loading = form.busy == SettingsBusy.Recovery,
            onConfirm = viewModel::regenerateCodes,
            onDismiss = viewModel::dismissRegenerate,
            overlay = { ToastHost(toast, viewModel::dismissToast) },
        )
    }
    teamForm.removeTarget?.let { target ->
        ConfirmDialog(
            title = "Remove team member?",
            description = "@${target.username} will lose access immediately. Past sales and activity stay on the shop.",
            confirmLabel = "Remove",
            cancelLabel = "Keep",
            loading = teamForm.removing,
            onConfirm = team::remove,
            onDismiss = team::dismissRemove,
            overlay = { ToastHost(teamToast, team::dismissToast) },
        )
    }
    teamForm.invite?.let { invite ->
        SetupInviteDialog(invite, team::dismissInvite) { ToastHost(teamToast, team::dismissToast) }
    }
}

@Composable
private fun Hero(session: SessionState.SignedIn, viewModel: SettingsViewModel) {
    val dates = viewModel.dates
    val user = session.user
    Column(
        Modifier
            .fillMaxWidth()
            .background(Brush.linearGradient(listOf(ChartShopColors.Maroon, ChartShopColors.MaroonDeep)))
            .padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Column(Modifier.weight(1f)) {
                Text(
                    session.shop.businessName.ifBlank { "Your shop" },
                    color = Color.White,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    "@${session.username} · ${if (session.isAdmin) "Admin" else "Member"}",
                    color = Color.White.copy(alpha = 0.8f),
                    fontSize = 14.sp,
                )
            }
            Text(
                "Logged in",
                modifier = Modifier
                    .background(Color.White.copy(alpha = 0.16f))
                    .padding(horizontal = 10.dp, vertical = 4.dp),
                color = Color.White,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
            )
        }
        val stats = listOf(
            "Last login" to dates.dateTime(user?.lastLogin ?: session.shop.lastLogin),
            "Registered" to dates.date(user?.createdAt ?: session.shop.createdAt),
            "Currency" to "USD",
            "Timezone" to (session.shop.settings?.timezone ?: dates.zone.id),
        )
        stats.chunked(2).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                row.forEach { (label, value) ->
                    Column(
                        Modifier
                            .weight(1f)
                            .background(Color.White.copy(alpha = 0.1f))
                            .border(1.dp, Color.White.copy(alpha = 0.18f))
                            .padding(horizontal = 12.dp, vertical = 10.dp),
                    ) {
                        Text(label.uppercase(), color = Color.White.copy(alpha = 0.7f), fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                        Text(value, color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
    }
}

@Composable
private fun CardHead(title: String, lead: String) {
    Column(Modifier.padding(bottom = 14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        CardTitle(title)
        Text(lead, color = ChartShopColors.TextSecondary, fontSize = 14.sp, lineHeight = 20.sp)
    }
}

@Composable
private fun PreferencesCard(form: SettingsForm, viewModel: SettingsViewModel) {
    Card {
        CardHead("Shop preferences", "Timezone sets report days and dates. Low-stock default applies to new products.")
        Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Field("Currency", hint = "All prices are in US dollars.") {
                TextInput("USD", {}, enabled = false)
            }
            Field("Timezone") {
                SelectInput(TIMEZONE_OPTIONS.map { it to it }, form.timezone, viewModel::onTimezone)
            }
            Field("Low-stock default") {
                TextInput(form.lowStockAlert, viewModel::onLowStock, kind = InputKind.Count, placeholder = "10")
            }
            ArrowButton(
                "Save preferences",
                viewModel::savePreferences,
                Modifier.fillMaxWidth(),
                loading = form.busy == SettingsBusy.Preferences,
            )
        }
    }
}

@Composable
private fun AccountCard(session: SessionState.SignedIn, form: SettingsForm, viewModel: SettingsViewModel) {
    Card {
        if (session.isAdmin) {
            CardHead("Shop & login", "How you sign in, and how your shop shows up in chat and reports.")
        } else {
            CardHead("Your login", "How you sign in and how teammates see you.")
        }
        Column(verticalArrangement = Arrangement.spacedBy(18.dp)) {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Field("Display name", hint = "Shown to teammates in activity and chat.") {
                    TextInput(form.displayName, viewModel::onDisplayName, placeholder = "Your name")
                }
                ArrowButton(
                    "Save display name",
                    viewModel::saveDisplayName,
                    Modifier.fillMaxWidth(),
                    tone = ButtonTone.Light,
                    loading = form.busy == SettingsBusy.DisplayName,
                )
            }
            UsernameBlock(session, form, viewModel)
            if (session.isAdmin) {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Field("Business name") {
                        TextInput(form.businessName, viewModel::onBusinessName, placeholder = "Business name")
                    }
                    ArrowButton(
                        "Save business name",
                        viewModel::saveBusinessName,
                        Modifier.fillMaxWidth(),
                        tone = ButtonTone.Light,
                        loading = form.busy == SettingsBusy.BusinessName,
                    )
                }
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Field("What you sell", hint = "Helps the assistant understand your products.") {
                        TextArea(form.description, viewModel::onDescription, placeholder = "e.g. Groceries, airtime and household goods")
                    }
                    ArrowButton(
                        "Save description",
                        viewModel::saveDescription,
                        Modifier.fillMaxWidth(),
                        tone = ButtonTone.Light,
                        loading = form.busy == SettingsBusy.Description,
                    )
                }
            }
        }
    }
}

@Composable
private fun UsernameBlock(session: SessionState.SignedIn, form: SettingsForm, viewModel: SettingsViewModel) {
    val normalized = form.username.trim().lowercase()
    val current = session.username.lowercase()
    val check = form.usernameCheck
    val (status, tone) = when {
        normalized.isEmpty() -> null to ChartShopColors.TextMuted
        normalized == current -> "This is your current username" to ChartShopColors.TextMuted
        check is UsernameCheck.Checking -> "Checking availability…" to ChartShopColors.TextMuted
        check is UsernameCheck.Ready && check.available -> "Username is available" to ChartShopColors.Success
        check is UsernameCheck.Ready -> (check.message ?: "Username is not available") to ChartShopColors.Danger
        else -> null to ChartShopColors.TextMuted
    }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Field("Username", hint = "Your login on web, Android and chat.") {
            TextInput(
                form.username,
                viewModel::onUsername,
                placeholder = "username",
                isError = check is UsernameCheck.Ready && !check.available && normalized != current,
            )
        }
        if (normalized.isNotEmpty()) {
            Text("Login will be @$normalized", color = ChartShopColors.TextSecondary, fontSize = 13.sp)
        }
        if (status != null) Text(status, color = tone, fontSize = 13.sp, fontWeight = FontWeight.Medium)
        val suggestions = (check as? UsernameCheck.Ready)?.takeIf { !it.available }?.suggestions.orEmpty()
        if (suggestions.isNotEmpty() && normalized != current) {
            Text("Try one of these instead", color = ChartShopColors.TextMuted, fontSize = 12.5.sp)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                suggestions.forEach { suggestion ->
                    Text(
                        "@$suggestion",
                        modifier = Modifier
                            .border(1.dp, ChartShopColors.Border)
                            .background(ChartShopColors.Cream)
                            .clickable { viewModel.onUsername(suggestion) }
                            .padding(horizontal = 12.dp, vertical = 8.dp),
                        color = ChartShopColors.Maroon,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }
        }
        ArrowButton(
            "Save username",
            viewModel::saveUsername,
            Modifier.fillMaxWidth(),
            tone = ButtonTone.Light,
            loading = form.busy == SettingsBusy.Username,
        )
    }
}

@Composable
private fun PinCard(form: SettingsForm, viewModel: SettingsViewModel) {
    Card {
        CardHead("PIN", "Your 4-digit PIN signs you in on web, Android and chat.")
        Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Field("Current PIN") {
                TextInput(form.oldPin, viewModel::onOldPin, kind = InputKind.Count, placeholder = "••••", secret = true)
            }
            Field("New PIN") {
                TextInput(form.newPin, viewModel::onNewPin, kind = InputKind.Count, placeholder = "••••", secret = true)
            }
            Field("Confirm new PIN") {
                TextInput(form.confirmPin, viewModel::onConfirmPin, kind = InputKind.Count, placeholder = "••••", secret = true)
            }
            ArrowButton("Update PIN", viewModel::savePin, Modifier.fillMaxWidth(), loading = form.busy == SettingsBusy.Pin)
        }
    }
}

@Composable
private fun TeamCard(team: TeamViewModel, form: TeamForm) {
    val remote by team.team.collectAsState()
    val members = sortMembers(remote.data?.members.orEmpty(), team.selfId)
    val pending = members.count { it.mustSetPin }
    val summary = if (members.isNotEmpty()) {
        " ${members.size} people" + (if (pending > 0) " · $pending waiting to set a PIN" else "") + "."
    } else {
        ""
    }
    Card {
        CardHead("Team", "Everyone on this shop shares sales and stock. Admins manage people and settings.$summary")
        when {
            remote.firstLoad || (remote.loading && remote.data == null) -> EmptyNote("Loading team…")
            remote.data == null && remote.error != null -> EmptyNote(remote.error ?: "Could not load team.")
            members.isEmpty() -> EmptyNote("No team members yet.")
            else -> Column(Modifier.padding(bottom = 18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                members.forEach { member ->
                    MemberRow(member, isYou = member.id == team.selfId, team, form)
                }
            }
        }
        if (team.isAdmin) {
            InviteBlock(team, form)
        } else {
            Text(
                "Ask an admin if you need someone else added to this shop.",
                color = ChartShopColors.TextMuted,
                fontSize = 14.sp,
            )
        }
    }
}

@Composable
private fun EmptyNote(text: String) {
    Text(
        text,
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 18.dp)
            .border(1.dp, ChartShopColors.Border)
            .background(ChartShopColors.Cream)
            .padding(14.dp),
        color = ChartShopColors.TextSecondary,
        fontSize = 14.sp,
    )
}

@Composable
private fun MemberRow(member: User, isYou: Boolean, team: TeamViewModel, form: TeamForm) {
    val busy = form.busyMemberId == member.id
    Column(
        Modifier
            .fillMaxWidth()
            .border(1.dp, if (member.mustSetPin) ChartShopColors.Warning.copy(alpha = 0.4f) else ChartShopColors.Border)
            .background(
                when {
                    member.mustSetPin -> ChartShopColors.WarningTint.copy(alpha = 0.5f)
                    isYou -> ChartShopColors.Cream
                    else -> ChartShopColors.Surface
                },
            )
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
            itemVerticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                member.displayName.ifBlank { member.username },
                color = ChartShopColors.TextPrimary,
                fontSize = 15.sp,
                fontWeight = FontWeight.SemiBold,
            )
            Badge(if (member.isAdmin) "Admin" else "Member", tone = if (member.isAdmin) BadgeTone.Info else BadgeTone.Neutral)
            if (member.mustSetPin) Badge("Pending setup", tone = BadgeTone.Warning)
            if (isYou) Badge("You", tone = BadgeTone.Success)
        }
        Text("@${member.username}", color = ChartShopColors.TextMuted, fontSize = 13.sp)
        if (member.mustSetPin) {
            Text(
                "Hasn't set a PIN yet — share a setup code so they can join.",
                color = ChartShopColors.Warning,
                fontSize = 13.sp,
            )
        }
        if (team.isAdmin && !isYou) {
            Column(Modifier.padding(top = 4.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if (member.mustSetPin) {
                    ArrowButton(
                        "New setup code",
                        { team.newSetupCode(member) },
                        Modifier.fillMaxWidth(),
                        size = ButtonSize.Sm,
                        loading = busy,
                    )
                }
                ManageMenu(member, enabled = !busy, team)
            }
        }
    }
}

@Composable
private fun ManageMenu(member: User, enabled: Boolean, team: TeamViewModel) {
    var open by remember { mutableStateOf(false) }
    Column {
        Text(
            "Manage ▾",
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, ChartShopColors.Border)
                .background(if (open) ChartShopColors.Cream else ChartShopColors.Surface)
                .clickable(enabled = enabled) { open = true }
                .padding(vertical = 11.dp),
            color = if (enabled) ChartShopColors.Maroon else ChartShopColors.TextMuted,
            fontSize = 14.sp,
            fontWeight = FontWeight.Medium,
            textAlign = TextAlign.Center,
        )
        DropdownMenu(expanded = open, onDismissRequest = { open = false }) {
            DropdownMenuItem(
                text = { Text(if (member.isAdmin) "Make member" else "Make admin") },
                onClick = {
                    open = false
                    team.toggleRole(member)
                },
            )
            DropdownMenuItem(
                text = { Text("Remove", color = ChartShopColors.Danger) },
                onClick = {
                    open = false
                    team.askRemove(member)
                },
            )
        }
    }
}

@Composable
private fun InviteBlock(team: TeamViewModel, form: TeamForm) {
    Column(
        Modifier
            .fillMaxWidth()
            .padding(top = 2.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Column(Modifier.fillMaxWidth().background(ChartShopColors.Border).padding(top = 1.dp)) {}
        Text("Invite someone", color = ChartShopColors.Maroon, fontSize = 16.sp, fontWeight = FontWeight.Bold)
        Text(
            "They get the same till access. Prefer a setup code so they choose their own PIN.",
            color = ChartShopColors.TextSecondary,
            fontSize = 14.sp,
            lineHeight = 20.sp,
        )
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            ModeChip("They set their own PIN", form.inviteMode == InviteMode.Setup) { team.onMode(InviteMode.Setup) }
            ModeChip("I set their PIN", form.inviteMode == InviteMode.Pin) { team.onMode(InviteMode.Pin) }
        }
        Field("Display name") {
            TextInput(form.displayName, team::onDisplayName, placeholder = "Their name")
        }
        Field("Username", hint = "Their login on web & chat") {
            TextInput(form.username, team::onUsername, placeholder = "Their username")
        }
        if (form.inviteMode == InviteMode.Pin) {
            Field("PIN", hint = "Exactly 4 digits") {
                TextInput(form.pin, team::onPin, kind = InputKind.Count, placeholder = "4-digit PIN", secret = true)
            }
        }
        ArrowButton(
            when {
                form.adding -> "Inviting…"
                form.inviteMode == InviteMode.Setup -> "Create invite"
                else -> "Add with PIN"
            },
            team::add,
            Modifier.fillMaxWidth(),
            loading = form.adding,
        )
    }
}

@Composable
private fun ModeChip(label: String, active: Boolean, onClick: () -> Unit) {
    Text(
        label,
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, if (active) ChartShopColors.Maroon else ChartShopColors.Border)
            .background(if (active) ChartShopColors.PrimaryTint else ChartShopColors.Surface)
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 11.dp),
        color = if (active) ChartShopColors.Maroon else ChartShopColors.TextPrimary,
        fontSize = 13.5.sp,
        fontWeight = if (active) FontWeight.SemiBold else FontWeight.Normal,
    )
}

@Composable
private fun RecoveryCard(
    form: SettingsForm,
    remaining: Int?,
    loading: Boolean,
    viewModel: SettingsViewModel,
    username: String,
) {
    Card {
        CardHead("Recovery codes", "One-time codes that reset a lost PIN. Keep them offline, away from your phone.")
        val codes = form.freshCodes
        if (codes != null) {
            RecoveryCodesPanel(
                codes = codes,
                username = username,
                saved = form.codesSaved,
                onSavedChange = viewModel::onCodesSaved,
                onContinue = viewModel::hideCodes,
            )
            return@Card
        }
        val count = remaining ?: 0
        Text(
            when {
                loading -> "Checking your codes…"
                count > 0 -> "$count unused code${if (count == 1) "" else "s"} remaining. Regenerating revokes unused old codes."
                else -> "No unused recovery codes. Generate a set and save them offline — this is how you reset a lost PIN."
            },
            modifier = Modifier.padding(bottom = 14.dp),
            color = ChartShopColors.TextSecondary,
            fontSize = 14.sp,
            lineHeight = 20.sp,
        )
        ArrowButton(
            if (count > 0) "Regenerate codes" else "Generate recovery codes",
            viewModel::askRegenerate,
            Modifier.fillMaxWidth(),
            tone = ButtonTone.Light,
            enabled = !loading,
        )
    }
}

@Composable
private fun SessionCard(loggingOut: Boolean, onLogout: () -> Unit) {
    Card {
        CardHead("Session", "Sign out of this phone only. Your other devices and chat links stay signed in.")
        ArrowButton("Log out", onLogout, Modifier.fillMaxWidth(), tone = ButtonTone.Danger, loading = loggingOut)
    }
}

private fun setupUrl(username: String) = "${BuildConfig.WEB_BASE_URL}/setup?username=${Uri.encode(username)}"

private fun shareText(invite: SetupInvite) = listOf(
    "ChartShop invite for @${invite.username}",
    "Set your PIN with this one-time setup code:",
    invite.setupCode,
    "",
    "Open: ${setupUrl(invite.username)}",
    "Enter your username, this code, and choose a 4-digit PIN.",
).joinToString("\n")

@Composable
private fun SetupInviteDialog(invite: SetupInvite, onDone: () -> Unit, overlay: @Composable () -> Unit) {
    val context = LocalContext.current
    var copied by remember { mutableStateOf(false) }
    LaunchedEffect(copied) {
        if (copied) {
            delay(2_000)
            copied = false
        }
    }
    Modal(
        title = "Share this setup code once",
        onDismiss = onDone,
        description = "Send it to @${invite.username}. They open /setup, enter username + code, and choose a PIN.",
        dismissible = false,
        overlay = overlay,
        footer = { ArrowButton("I've shared it", onDone, Modifier.fillMaxWidth()) },
    ) {
        Text(
            "Shown once. If it gets lost, use New setup code on their team row.",
            modifier = Modifier
                .fillMaxWidth()
                .background(ChartShopColors.WarningTint)
                .padding(12.dp),
            color = ChartShopColors.Warning,
            fontSize = 13.sp,
        )
        Text(
            invite.setupCode,
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 12.dp)
                .border(1.dp, ChartShopColors.Border)
                .background(ChartShopColors.Cream)
                .padding(vertical = 16.dp),
            color = ChartShopColors.Maroon,
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            fontFamily = FontFamily.Monospace,
            letterSpacing = 3.sp,
            textAlign = TextAlign.Center,
        )
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            ArrowButton(
                if (copied) "Copied" else "Copy code",
                {
                    copyText(context, invite.setupCode)
                    copied = true
                },
                Modifier.weight(1f),
                tone = ButtonTone.Light,
                size = ButtonSize.Sm,
            )
            ArrowButton(
                "Share invite",
                { shareInvite(context, invite) },
                Modifier.weight(1f),
                tone = ButtonTone.Light,
                size = ButtonSize.Sm,
            )
        }
        Text(
            "Tip: in WhatsApp, pick their chat (or Message yourself first, then forward). ChartShop never sends " +
                "the code for you — this only opens a share on your device.",
            modifier = Modifier.padding(top = 12.dp),
            color = ChartShopColors.TextMuted,
            fontSize = 12.5.sp,
            lineHeight = 18.sp,
        )
    }
}

private fun copyText(context: Context, text: String) {
    context.getSystemService(ClipboardManager::class.java)
        ?.setPrimaryClip(ClipData.newPlainText("ChartShop setup code", text))
}

private fun shareInvite(context: Context, invite: SetupInvite) {
    val send = Intent(Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(Intent.EXTRA_SUBJECT, "ChartShop invite for @${invite.username}")
        putExtra(Intent.EXTRA_TEXT, shareText(invite))
    }
    context.startActivity(Intent.createChooser(send, "Share invite"))
}
