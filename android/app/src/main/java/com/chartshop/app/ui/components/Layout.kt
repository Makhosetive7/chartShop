@file:OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)

package com.chartshop.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.SelectableDates
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.PopupProperties
import com.chartshop.app.ui.theme.ChartShopColors
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset

/**
 * The standard app page: pull to refresh, a scrolling column with the web's 16px gutters,
 * and the page toast pinned to the top. Pass `toast = null` while a dialog shows its own.
 */
@Composable
fun ScreenPage(
    toast: Toast?,
    onDismissToast: () -> Unit,
    refreshing: Boolean,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit,
) {
    Box(modifier.fillMaxSize()) {
        PullToRefreshBox(isRefreshing = refreshing, onRefresh = onRefresh, modifier = Modifier.fillMaxSize()) {
            Column(
                Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                content = content,
            )
        }
        ToastHost(toast, onDismissToast, Modifier.align(Alignment.TopCenter))
    }
}

/** Card heading with an optional lead line and a trailing action, like the web's `SectionHead`. */
@Composable
fun SectionHead(
    title: String,
    modifier: Modifier = Modifier,
    lead: String? = null,
    action: (@Composable () -> Unit)? = null,
) {
    FlowRow(
        modifier.fillMaxWidth().padding(bottom = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp, Alignment.Start),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Column(Modifier.weight(1f, fill = true)) {
            CardTitle(title)
            if (lead != null) {
                Text(
                    lead,
                    modifier = Modifier.padding(top = 4.dp),
                    color = ChartShopColors.TextSecondary,
                    fontSize = 14.sp,
                    lineHeight = 20.sp,
                )
            }
        }
        if (action != null) action()
    }
}

/** Two fields side by side, like the web's `Row` of `Field`s on a phone. */
@Composable
fun FieldRow(modifier: Modifier = Modifier, content: @Composable RowScope.() -> Unit) {
    Row(
        modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.Top,
        content = content,
    )
}

/** Buttons that wrap onto a second line when the phone is narrow. */
@Composable
fun ButtonRow(modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    FlowRow(
        modifier,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) { content() }
}

class TableColumn<T>(
    val title: String,
    val width: Dp,
    val cell: @Composable (T) -> Unit,
)

/**
 * The web table on phones: the first column stays put while the rest scroll sideways
 * behind a soft edge shadow. Rows share one fixed height so both halves line up.
 */
@Composable
fun <T> DataTable(
    rows: List<T>,
    key: (T) -> Any,
    columns: List<TableColumn<T>>,
    modifier: Modifier = Modifier,
    rowHeight: Dp = 56.dp,
) {
    val pinned = columns.first()
    val rest = columns.drop(1)
    Row(modifier.fillMaxWidth()) {
        Column(
            Modifier
                .width(pinned.width)
                .drawBehind {
                    drawLine(ChartShopColors.Border, Offset(size.width, 0f), Offset(size.width, size.height), 1.dp.toPx())
                },
        ) {
            HeaderCell(pinned.title, pinned.width)
            rows.forEach { row -> key(key(row)) { BodyCell(pinned.width, rowHeight) { pinned.cell(row) } } }
        }
        Box(Modifier.weight(1f)) {
            Column(Modifier.horizontalScroll(rememberScrollState())) {
                Row { rest.forEach { HeaderCell(it.title, it.width) } }
                rows.forEach { row ->
                    key(key(row)) {
                        Row { rest.forEach { column -> BodyCell(column.width, rowHeight) { column.cell(row) } } }
                    }
                }
            }
            Box(Modifier.matchParentSize()) {
                Box(
                    Modifier
                        .width(8.dp)
                        .fillMaxHeight()
                        .background(Brush.horizontalGradient(listOf(Color(0x291A0A0A), Color.Transparent))),
                )
            }
        }
    }
}

@Composable
private fun HeaderCell(text: String, width: Dp) {
    Box(
        Modifier
            .width(width)
            .height(36.dp)
            .bottomBorder()
            .padding(horizontal = 8.dp),
        contentAlignment = Alignment.CenterStart,
    ) {
        Text(
            text.uppercase(),
            color = ChartShopColors.TextMuted,
            fontSize = 11.5.sp,
            fontWeight = FontWeight.SemiBold,
            letterSpacing = 0.04.em,
            maxLines = 1,
        )
    }
}

@Composable
private fun BodyCell(width: Dp, height: Dp, content: @Composable () -> Unit) {
    Box(
        Modifier
            .width(width)
            .height(height)
            .bottomBorder()
            .padding(horizontal = 8.dp),
        contentAlignment = Alignment.CenterStart,
    ) { content() }
}

/**
 * The web's `<Table compact>` for two or three short columns: fits the width, no sideways scroll.
 * The first column takes the spare room; the others hug their content on the right.
 */
@Composable
fun CompactTable(headers: List<String>, rows: List<List<String>>, modifier: Modifier = Modifier) {
    Column(modifier.fillMaxWidth()) {
        CompactRow(headers, header = true)
        rows.forEach { CompactRow(it, header = false) }
    }
}

@Composable
private fun CompactRow(cells: List<String>, header: Boolean) {
    Row(
        Modifier
            .fillMaxWidth()
            .bottomBorder()
            .padding(horizontal = 4.dp, vertical = if (header) 8.dp else 10.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        cells.forEachIndexed { index, text ->
            Text(
                if (header) text.uppercase() else text,
                modifier = if (index == 0) Modifier.weight(1f) else Modifier.width(if (cells.size > 2) 72.dp else 96.dp),
                color = if (header) ChartShopColors.TextMuted else ChartShopColors.TextPrimary,
                fontSize = if (header) 11.5.sp else 14.sp,
                fontWeight = if (header) FontWeight.SemiBold else FontWeight.Normal,
                letterSpacing = if (header) 0.04.em else 0.em,
                textAlign = if (index == 0) TextAlign.Start else TextAlign.End,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

/** Plain table text; [muted] is the web's secondary colour used for item lists. */
@Composable
fun CellText(
    text: String,
    modifier: Modifier = Modifier,
    muted: Boolean = false,
    bold: Boolean = false,
    maxLines: Int = 2,
) {
    Text(
        text,
        modifier = modifier,
        color = if (muted) ChartShopColors.TextSecondary else ChartShopColors.TextPrimary,
        fontSize = if (muted) 13.sp else 14.sp,
        fontWeight = if (bold) FontWeight.SemiBold else FontWeight.Normal,
        lineHeight = 18.sp,
        maxLines = maxLines,
        overflow = TextOverflow.Ellipsis,
    )
}

fun Modifier.bottomBorder(): Modifier = drawBehind {
    val y = size.height - 0.5.dp.toPx()
    drawLine(ChartShopColors.Border, Offset(0f, y), Offset(size.width, y), 1.dp.toPx())
}

/** Cream boxes with an uppercase label over a maroon figure (the web's `StatStrip`). */
@Composable
fun StatStrip(stats: List<Pair<String, String>>, modifier: Modifier = Modifier, columns: Int = 2) {
    Column(modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        stats.chunked(columns).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                row.forEach { (label, value) -> StatBox(label, value, Modifier.weight(1f)) }
                repeat(columns - row.size) { Box(Modifier.weight(1f)) }
            }
        }
    }
}

@Composable
fun StatBox(label: String, value: String, modifier: Modifier = Modifier) {
    Column(
        modifier
            .background(ChartShopColors.Cream)
            .border(1.dp, ChartShopColors.Border)
            .padding(horizontal = 14.dp, vertical = 12.dp),
    ) {
        Text(
            label.uppercase(),
            color = ChartShopColors.TextMuted,
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold,
            letterSpacing = 0.04.em,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Text(
            value,
            modifier = Modifier.padding(top = 4.dp),
            color = ChartShopColors.Maroon,
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = (-0.02).em,
        )
    }
}

/** Centered "nothing here" message with an optional icon. */
@Composable
fun EmptyState(title: String, body: String? = null, modifier: Modifier = Modifier, icon: ImageVector? = null) {
    Column(
        modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 28.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        if (icon != null) {
            Icon(icon, contentDescription = null, tint = ChartShopColors.TextSecondary, modifier = Modifier.size(28.dp).padding(bottom = 4.dp))
        }
        Text(
            title,
            color = ChartShopColors.TextPrimary,
            fontSize = 16.sp,
            fontWeight = FontWeight.SemiBold,
            textAlign = TextAlign.Center,
        )
        if (body != null) {
            Text(
                body,
                modifier = Modifier.padding(top = 6.dp),
                color = ChartShopColors.TextSecondary,
                fontSize = 14.sp,
                lineHeight = 20.sp,
                textAlign = TextAlign.Center,
            )
        }
    }
}

@Composable
fun SkeletonBar(width: Dp, height: Dp, modifier: Modifier = Modifier) {
    Box(modifier.width(width).height(height).background(ChartShopColors.PeachSoft))
}

@Composable
fun TableSkeleton(widths: List<Dp> = listOf(110.dp, 90.dp, 60.dp, 70.dp), rows: Int = 6) {
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        repeat(rows) {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                widths.forEach { SkeletonBar(it, 18.dp) }
            }
        }
    }
}

/** The web's `TextArea`: a taller cream box that wraps. */
@Composable
fun TextArea(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String = "",
    minHeight: Dp = 88.dp,
) {
    val interaction = remember { MutableInteractionSource() }
    val focused by interaction.collectIsFocusedAsState()
    BasicTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier,
        interactionSource = interaction,
        textStyle = TextStyle(color = ChartShopColors.TextPrimary, fontSize = 15.sp, lineHeight = 22.sp),
        cursorBrush = SolidColor(ChartShopColors.Primary),
        decorationBox = { inner ->
            Box(
                Modifier
                    .then(if (focused) Modifier.border(3.dp, ChartShopColors.PrimaryTint) else Modifier)
                    .border(1.dp, if (focused) ChartShopColors.BorderStrong else ChartShopColors.Border)
                    .background(if (focused) ChartShopColors.Surface else ChartShopColors.Cream)
                    .heightIn(min = minHeight)
                    .padding(horizontal = 13.dp, vertical = 11.dp),
            ) {
                if (value.isEmpty() && placeholder.isNotEmpty()) {
                    Text(placeholder, color = ChartShopColors.TextMuted, fontSize = 15.sp)
                }
                inner()
            }
        },
    )
}

/** Search box with a magnifier, like the Products and Activity search. */
@Composable
fun SearchInput(query: String, onQueryChange: (String) -> Unit, placeholder: String, modifier: Modifier = Modifier) {
    Row(
        modifier
            .fillMaxWidth()
            .border(1.dp, ChartShopColors.Border)
            .background(ChartShopColors.Cream)
            .padding(horizontal = 14.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Icon(Icons.Outlined.Search, contentDescription = null, tint = ChartShopColors.TextMuted, modifier = Modifier.size(16.dp))
        BasicTextField(
            value = query,
            onValueChange = onQueryChange,
            modifier = Modifier.weight(1f).semantics { contentDescription = placeholder },
            singleLine = true,
            textStyle = TextStyle(color = ChartShopColors.TextPrimary, fontSize = 15.sp),
            cursorBrush = SolidColor(ChartShopColors.Primary),
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
            decorationBox = { inner ->
                Box {
                    if (query.isEmpty()) Text(placeholder, color = ChartShopColors.TextMuted, fontSize = 15.sp)
                    inner()
                }
            },
        )
    }
}

/**
 * The web's `<input type="date">`: shows the chosen day and opens a calendar.
 * [isoDay] is the API's `YYYY-MM-DD`; days before [minIsoDay] can't be picked.
 */
@Composable
fun DateField(
    isoDay: String,
    onChange: (String) -> Unit,
    display: (String) -> String,
    modifier: Modifier = Modifier,
    minIsoDay: String? = null,
) {
    var open by remember { mutableStateOf(false) }
    Row(
        modifier
            .fillMaxWidth()
            .border(1.dp, ChartShopColors.Border)
            .background(ChartShopColors.Cream)
            .clickable { open = true }
            .heightIn(min = 44.dp)
            .padding(start = 13.dp, end = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            if (isoDay.isEmpty()) "Pick a date" else display(isoDay),
            modifier = Modifier.weight(1f),
            color = if (isoDay.isEmpty()) ChartShopColors.TextMuted else ChartShopColors.TextPrimary,
            fontSize = 15.sp,
            maxLines = 1,
        )
        Icon(Icons.Outlined.CalendarMonth, contentDescription = null, tint = ChartShopColors.TextSecondary, modifier = Modifier.size(18.dp))
    }
    if (!open) return

    val minMillis = minIsoDay?.let { runCatching { LocalDate.parse(it) }.getOrNull() }?.toUtcMillis()
    val pickerState = rememberDatePickerState(
        initialSelectedDateMillis = runCatching { LocalDate.parse(isoDay) }.getOrNull()?.toUtcMillis(),
        selectableDates = object : SelectableDates {
            override fun isSelectableDate(utcTimeMillis: Long): Boolean = minMillis == null || utcTimeMillis >= minMillis
        },
    )
    DatePickerDialog(
        onDismissRequest = { open = false },
        shape = RectangleShape,
        confirmButton = {
            TextButton(onClick = {
                pickerState.selectedDateMillis?.let {
                    onChange(Instant.ofEpochMilli(it).atZone(ZoneOffset.UTC).toLocalDate().toString())
                }
                open = false
            }) { Text("Done") }
        },
        dismissButton = { TextButton(onClick = { open = false }) { Text("Cancel") } },
    ) {
        DatePicker(pickerState)
    }
}

private fun LocalDate.toUtcMillis(): Long = atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli()

/**
 * A text box with the web `<datalist>` behaviour: typing shows matching [suggestions]
 * underneath, and tapping one fills it in. Anything typed is still accepted.
 */
@Composable
fun SuggestInput(
    value: String,
    onValueChange: (String) -> Unit,
    suggestions: List<String>,
    modifier: Modifier = Modifier,
    placeholder: String = "",
    isError: Boolean = false,
) {
    val interaction = remember { MutableInteractionSource() }
    val focused by interaction.collectIsFocusedAsState()
    var dismissed by remember { mutableStateOf(false) }
    val query = value.trim().lowercase()
    val matches = remember(query, suggestions) {
        if (query.isEmpty()) {
            emptyList()
        } else {
            suggestions.filter { it.lowercase().contains(query) && !it.equals(value.trim(), ignoreCase = true) }.distinct().take(6)
        }
    }
    Box(modifier) {
        SuggestTextBox(value, { dismissed = false; onValueChange(it) }, placeholder, isError, interaction)
        DropdownMenu(
            expanded = focused && !dismissed && matches.isNotEmpty(),
            onDismissRequest = { dismissed = true },
            properties = PopupProperties(focusable = false),
            shape = RectangleShape,
        ) {
            matches.forEach { name ->
                DropdownMenuItem(text = { Text(name) }, onClick = {
                    dismissed = true
                    onValueChange(name)
                })
            }
        }
    }
}

@Composable
private fun SuggestTextBox(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    isError: Boolean,
    interaction: MutableInteractionSource,
) {
    val focused by interaction.collectIsFocusedAsState()
    BasicTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = Modifier.fillMaxWidth(),
        singleLine = true,
        interactionSource = interaction,
        textStyle = TextStyle(color = ChartShopColors.TextPrimary, fontSize = 15.sp),
        cursorBrush = SolidColor(ChartShopColors.Primary),
        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
        decorationBox = { inner ->
            Box(
                Modifier
                    .then(if (focused && !isError) Modifier.border(3.dp, ChartShopColors.PrimaryTint) else Modifier)
                    .border(1.dp, if (isError) ChartShopColors.Danger else if (focused) ChartShopColors.BorderStrong else ChartShopColors.Border)
                    .background(if (isError) ChartShopColors.DangerTint else if (focused) ChartShopColors.Surface else ChartShopColors.Cream)
                    .heightIn(min = 44.dp)
                    .padding(horizontal = 13.dp, vertical = 11.dp),
                contentAlignment = Alignment.CenterStart,
            ) {
                if (value.isEmpty() && placeholder.isNotEmpty()) {
                    Text(placeholder, color = ChartShopColors.TextMuted, fontSize = 15.sp, maxLines = 1)
                }
                inner()
            }
        },
    )
}

/** Small segmented control for periods (7 / 30 / 90 days), smaller than [Tabs]. */
@Composable
fun PeriodTabs(labels: List<String>, selectedIndex: Int, onSelect: (Int) -> Unit, modifier: Modifier = Modifier) {
    Row(
        modifier.background(ChartShopColors.PeachSoft).padding(4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        labels.forEachIndexed { index, label ->
            val active = index == selectedIndex
            Text(
                label,
                modifier = Modifier
                    .background(if (active) ChartShopColors.Surface else Color.Transparent)
                    .clickable { onSelect(index) }
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                color = ChartShopColors.Maroon,
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
            )
        }
    }
}
