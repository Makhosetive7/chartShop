package com.chartshop.app.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.chartshop.app.ui.theme.ChartShopColors
import kotlinx.coroutines.delay

/*
 * Compose versions of frontend/src/components/ui (primitives.tsx, Button.tsx, Modal.tsx,
 * ConfirmDialog.tsx, AppToaster.tsx), so app screens match the web app on small screens.
 */

private val DangerDeep = Color(0xFF9F1239)

enum class ButtonTone { Filled, Ghost, Light, Danger }

enum class ButtonSize(val height: Dp) { Md(48.dp), Sm(40.dp) }

/** The web's two-part button: a label, then a square arrow block that turns into a spinner while loading. */
@Composable
fun ArrowButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    tone: ButtonTone = ButtonTone.Filled,
    size: ButtonSize = ButtonSize.Md,
    enabled: Boolean = true,
    loading: Boolean = false,
) {
    val border = when (tone) {
        ButtonTone.Filled -> ChartShopColors.MaroonDeep
        ButtonTone.Danger -> DangerDeep
        else -> ChartShopColors.Maroon
    }
    val labelBackground = when (tone) {
        ButtonTone.Filled -> ChartShopColors.Maroon
        ButtonTone.Light -> ChartShopColors.Surface
        ButtonTone.Danger -> ChartShopColors.Danger
        ButtonTone.Ghost -> Color.Transparent
    }
    val labelColor = if (tone == ButtonTone.Ghost || tone == ButtonTone.Light) ChartShopColors.Maroon else Color.White
    val iconBackground = when (tone) {
        ButtonTone.Filled -> ChartShopColors.MaroonDeep
        ButtonTone.Danger -> DangerDeep
        else -> ChartShopColors.Maroon
    }
    val active = enabled && !loading
    Row(
        modifier = modifier
            .height(size.height)
            .alpha(if (active) 1f else 0.55f)
            .border(1.dp, border)
            .clickable(enabled = active, onClick = onClick),
    ) {
        Box(
            Modifier
                .weight(1f, fill = false)
                .fillMaxHeight()
                .background(labelBackground)
                .padding(start = if (size == ButtonSize.Sm) 16.dp else 20.dp, end = if (size == ButtonSize.Sm) 14.dp else 18.dp),
            contentAlignment = Alignment.CenterStart,
        ) {
            Text(
                text,
                color = labelColor,
                fontSize = if (size == ButtonSize.Sm) 13.5.sp else 15.sp,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        Box(
            Modifier
                .size(size.height - 2.dp)
                .background(iconBackground),
            contentAlignment = Alignment.Center,
        ) {
            val iconSize = if (size == ButtonSize.Sm) 16.dp else 18.dp
            if (loading) {
                CircularProgressIndicator(Modifier.size(iconSize), color = Color.White, strokeWidth = 2.dp)
            } else {
                Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null, tint = Color.White, modifier = Modifier.size(iconSize))
            }
        }
    }
}

/** White panel with a hairline border, like the web `Card`. */
@Composable
fun Card(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .shadow(3.dp, RectangleShape, ambientColor = ChartShopColors.TextPrimary, spotColor = ChartShopColors.TextPrimary)
            .background(ChartShopColors.Surface)
            .border(1.dp, ChartShopColors.Border)
            .padding(16.dp),
        content = content,
    )
}

@Composable
fun PageLead(text: String, modifier: Modifier = Modifier) {
    Text(
        text,
        modifier = modifier,
        color = ChartShopColors.TextSecondary,
        fontSize = 15.sp,
        lineHeight = 23.sp,
    )
}

/** Bold section heading used for card titles such as "Add product". */
@Composable
fun CardTitle(text: String, modifier: Modifier = Modifier) {
    Text(
        text,
        modifier = modifier,
        color = ChartShopColors.TextPrimary,
        fontSize = 21.sp,
        fontWeight = FontWeight.Bold,
        letterSpacing = (-0.02).em,
    )
}

enum class BadgeTone { Neutral, Success, Warning, Danger, Info }

@Composable
fun Badge(text: String, modifier: Modifier = Modifier, tone: BadgeTone = BadgeTone.Neutral) {
    val (background, foreground) = when (tone) {
        BadgeTone.Success -> ChartShopColors.SuccessTint to ChartShopColors.Success
        BadgeTone.Warning -> ChartShopColors.WarningTint to ChartShopColors.Warning
        BadgeTone.Danger -> ChartShopColors.DangerTint to ChartShopColors.Danger
        BadgeTone.Info -> ChartShopColors.InfoTint to ChartShopColors.Info
        BadgeTone.Neutral -> ChartShopColors.PrimaryTint to ChartShopColors.Maroon
    }
    Text(
        text,
        modifier = modifier.background(background).padding(horizontal = 8.dp, vertical = 3.dp),
        color = foreground,
        fontSize = 11.5.sp,
        fontWeight = FontWeight.SemiBold,
        maxLines = 1,
    )
}

/** Segmented tabs on a peach strip; the active tab is a raised white chip. */
@Composable
fun Tabs(
    labels: List<String>,
    selectedIndex: Int,
    onSelect: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(ChartShopColors.PeachSoft)
            .horizontalScroll(rememberScrollState())
            .padding(6.dp),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        labels.forEachIndexed { index, label ->
            val active = index == selectedIndex
            Text(
                label,
                modifier = Modifier
                    .then(if (active) Modifier.shadow(2.dp, RectangleShape) else Modifier)
                    .background(if (active) ChartShopColors.Surface else Color.Transparent)
                    .clickable { onSelect(index) }
                    .padding(horizontal = 14.dp, vertical = 9.dp),
                color = ChartShopColors.Maroon,
                fontSize = 13.5.sp,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}

/** Label above a control, like the web `Field`. */
@Composable
fun Field(label: String, modifier: Modifier = Modifier, hint: String? = null, isError: Boolean = false, content: @Composable () -> Unit) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(label, color = ChartShopColors.TextPrimary, fontSize = 13.5.sp, fontWeight = FontWeight.SemiBold)
        content()
        if (hint != null) {
            Text(
                hint,
                color = if (isError) ChartShopColors.Danger else ChartShopColors.TextMuted,
                fontSize = 12.sp,
            )
        }
    }
}

enum class InputKind(val keyboardType: KeyboardType) {
    Text(KeyboardType.Text),
    Money(KeyboardType.Decimal),
    Count(KeyboardType.Number),
}

/** Cream input with a square border that turns white on focus and red when invalid. */
@Composable
fun TextInput(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String = "",
    kind: InputKind = InputKind.Text,
    isError: Boolean = false,
    enabled: Boolean = true,
    compact: Boolean = false,
    textAlign: TextAlign = TextAlign.Start,
    imeAction: ImeAction = ImeAction.Next,
    onDone: (() -> Unit)? = null,
    secret: Boolean = false,
) {
    val interaction = remember { MutableInteractionSource() }
    val focused by interaction.collectIsFocusedAsState()
    val borderColor = when {
        isError -> ChartShopColors.Danger
        focused -> ChartShopColors.BorderStrong
        else -> ChartShopColors.Border
    }
    val background = when {
        isError -> ChartShopColors.DangerTint
        focused -> ChartShopColors.Surface
        else -> ChartShopColors.Cream
    }
    val fontSize = if (compact) 14.sp else 15.sp
    BasicTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier,
        enabled = enabled,
        singleLine = true,
        interactionSource = interaction,
        textStyle = TextStyle(color = ChartShopColors.TextPrimary, fontSize = fontSize, textAlign = textAlign),
        cursorBrush = SolidColor(ChartShopColors.Primary),
        visualTransformation = if (secret) PasswordVisualTransformation() else VisualTransformation.None,
        keyboardOptions = KeyboardOptions(
            keyboardType = if (secret && kind == InputKind.Count) KeyboardType.NumberPassword else kind.keyboardType,
            imeAction = imeAction,
        ),
        keyboardActions = if (onDone == null) KeyboardActions.Default else KeyboardActions(onDone = { onDone() }, onGo = { onDone() }),
        decorationBox = { inner ->
            Box(
                Modifier
                    .then(if (focused && !isError) Modifier.border(3.dp, ChartShopColors.PrimaryTint) else Modifier)
                    .border(1.dp, borderColor)
                    .background(background)
                    .heightIn(min = if (compact) 32.dp else 44.dp)
                    .padding(horizontal = if (compact) 8.dp else 13.dp, vertical = if (compact) 6.dp else 11.dp),
                contentAlignment = if (textAlign == TextAlign.Center) Alignment.Center else Alignment.CenterStart,
            ) {
                if (value.isEmpty() && placeholder.isNotEmpty()) {
                    Text(
                        placeholder,
                        color = ChartShopColors.TextMuted,
                        fontSize = fontSize,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        textAlign = textAlign,
                    )
                }
                inner()
            }
        },
    )
}

/** A web-style `<select>`: a cream box that opens a menu of [options]. */
@Composable
fun SelectInput(
    options: List<Pair<String, String>>,
    selected: String?,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String = "Choose…",
) {
    var open by remember { mutableStateOf(false) }
    Box(modifier) {
        Row(
            Modifier
                .fillMaxWidth()
                .border(1.dp, ChartShopColors.Border)
                .background(ChartShopColors.Cream)
                .clickable { open = true }
                .heightIn(min = 44.dp)
                .padding(start = 13.dp, end = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                options.firstOrNull { it.first == selected }?.second ?: placeholder,
                modifier = Modifier.weight(1f),
                color = if (selected == null) ChartShopColors.TextMuted else ChartShopColors.TextPrimary,
                fontSize = 15.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Icon(Icons.Filled.ArrowDropDown, contentDescription = null, tint = ChartShopColors.TextSecondary)
        }
        DropdownMenu(expanded = open, onDismissRequest = { open = false }, shape = RectangleShape) {
            options.forEach { (id, label) ->
                DropdownMenuItem(text = { Text(label) }, onClick = {
                    open = false
                    onSelect(id)
                })
            }
        }
    }
}

/** Centered dialog with a title, optional description, scrolling body, and a footer of buttons. */
@Composable
fun Modal(
    title: String,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
    description: String? = null,
    maxWidth: Dp = 520.dp,
    dismissible: Boolean = true,
    footer: (@Composable () -> Unit)? = null,
    overlay: @Composable () -> Unit = {},
    content: @Composable ColumnScope.() -> Unit,
) {
    Dialog(
        onDismissRequest = { if (dismissible) onDismiss() },
        properties = DialogProperties(usePlatformDefaultWidth = false, dismissOnClickOutside = dismissible, dismissOnBackPress = dismissible),
    ) {
        BoxWithConstraints(Modifier.padding(16.dp), contentAlignment = Alignment.Center) {
            Column(
                modifier
                    .widthIn(max = maxWidth)
                    .fillMaxWidth()
                    .heightIn(max = minOf(maxHeight * 0.9f, 720.dp))
                    .shadow(12.dp, RectangleShape)
                    .background(ChartShopColors.Surface)
                    .border(1.dp, ChartShopColors.Border)
                    .padding(start = 22.dp, end = 22.dp, top = 22.dp, bottom = 18.dp),
            ) {
                Text(
                    title,
                    color = ChartShopColors.Maroon,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = (-0.03).em,
                )
                if (description != null) {
                    Text(
                        description,
                        modifier = Modifier.padding(top = 6.dp),
                        color = ChartShopColors.TextSecondary,
                        fontSize = 15.sp,
                        lineHeight = 22.sp,
                    )
                }
                Column(
                    Modifier
                        .weight(1f, fill = false)
                        .padding(top = 12.dp)
                        .verticalScroll(rememberScrollState()),
                    content = content,
                )
                if (footer != null) {
                    Box(Modifier.fillMaxWidth().padding(top = 18.dp), contentAlignment = Alignment.CenterEnd) {
                        footer()
                    }
                }
            }
            Box(Modifier.align(Alignment.TopCenter)) { overlay() }
        }
    }
}

/** Ask-before-acting dialog: a ghost cancel button and a danger (or filled) confirm button. */
@Composable
fun ConfirmDialog(
    title: String,
    description: String,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit,
    confirmLabel: String = "Confirm",
    cancelLabel: String = "Keep",
    danger: Boolean = true,
    loading: Boolean = false,
    overlay: @Composable () -> Unit = {},
) {
    Modal(
        title = title,
        description = description,
        onDismiss = onDismiss,
        maxWidth = 420.dp,
        dismissible = !loading,
        overlay = overlay,
        footer = {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                ArrowButton(cancelLabel, onClick = onDismiss, tone = ButtonTone.Ghost, enabled = !loading)
                ArrowButton(
                    if (loading) "Working…" else confirmLabel,
                    onClick = onConfirm,
                    tone = if (danger) ButtonTone.Danger else ButtonTone.Filled,
                    loading = loading,
                )
            }
        },
    ) {}
}

enum class ToastTone { Success, Error, Info }

data class Toast(val message: String, val tone: ToastTone = ToastTone.Success, val id: Long = System.nanoTime())

/** Top-center toast like the web's react-toastify setup: one at a time, gone after 2.5 s or on tap. */
@Composable
fun ToastHost(toast: Toast?, onDismiss: () -> Unit, modifier: Modifier = Modifier) {
    if (toast == null) return
    LaunchedEffect(toast.id) {
        delay(2_500)
        onDismiss()
    }
    val (background, accent, foreground) = when (toast.tone) {
        ToastTone.Success -> Triple(ChartShopColors.Cream, ChartShopColors.Maroon, ChartShopColors.Maroon)
        ToastTone.Error -> Triple(ChartShopColors.PeachSoft, ChartShopColors.Coral, ChartShopColors.MaroonDeep)
        ToastTone.Info -> Triple(ChartShopColors.PeachSoft, ChartShopColors.Primary, ChartShopColors.Maroon)
    }
    Row(
        modifier
            .padding(horizontal = 12.dp, vertical = 16.dp)
            .widthIn(max = 420.dp)
            .fillMaxWidth()
            .height(IntrinsicSize.Min)
            .shadow(12.dp, RectangleShape)
            .background(background)
            .border(BorderStroke(1.dp, if (toast.tone == ToastTone.Error) ChartShopColors.BorderStrong else ChartShopColors.Border))
            .clickable(onClick = onDismiss)
            .semantics { liveRegion = LiveRegionMode.Polite },
    ) {
        Spacer(Modifier.width(4.dp).fillMaxHeight().background(accent))
        Text(
            toast.message,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
            color = foreground,
            fontSize = 14.5.sp,
            fontWeight = FontWeight.SemiBold,
            lineHeight = 21.sp,
        )
    }
}
