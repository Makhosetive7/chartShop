@file:OptIn(ExperimentalLayoutApi::class, ExperimentalMaterial3Api::class)

package com.chartshop.app.ui.products

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
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chartshop.app.data.model.Product
import com.chartshop.app.data.model.ProductVariant
import com.chartshop.app.data.products.StockOp
import com.chartshop.app.domain.NumberInput
import com.chartshop.app.domain.ProductSummary
import com.chartshop.app.domain.StockStatus
import com.chartshop.app.domain.activePacks
import com.chartshop.app.domain.activeVariants
import com.chartshop.app.domain.displayLabel
import com.chartshop.app.domain.formatMoney
import com.chartshop.app.domain.hasOptions
import com.chartshop.app.domain.priceDetails
import com.chartshop.app.domain.stockStatus
import com.chartshop.app.ui.components.ArrowButton
import com.chartshop.app.ui.components.Badge
import com.chartshop.app.ui.components.BadgeTone
import com.chartshop.app.ui.components.Banner
import com.chartshop.app.ui.components.BannerTone
import com.chartshop.app.ui.components.ButtonSize
import com.chartshop.app.ui.components.ButtonTone
import com.chartshop.app.ui.components.Card
import com.chartshop.app.ui.components.CardTitle
import com.chartshop.app.ui.components.ConfirmDialog
import com.chartshop.app.ui.components.Field
import com.chartshop.app.ui.components.InputKind
import com.chartshop.app.ui.components.Modal
import com.chartshop.app.ui.components.PageLead
import com.chartshop.app.ui.components.SelectInput
import com.chartshop.app.ui.components.SlowServerHint
import com.chartshop.app.ui.components.Tabs
import com.chartshop.app.ui.components.TextInput
import com.chartshop.app.ui.components.Toast
import com.chartshop.app.ui.components.ToastHost
import com.chartshop.app.ui.theme.ChartShopColors

private val NameColumnWidth = 128.dp
private val StockColumnWidth = 64.dp
private val MoneyColumnWidth = 88.dp
private val ActionsColumnWidth = 240.dp
private val HeaderHeight = 36.dp
private val RowHeight = 60.dp

/** Field rows wrap like the web's flex rows, which leave 24px between wrapped lines. */
private val WrappedRowGap = 24.dp

@Composable
fun ProductsScreen(viewModel: ProductsViewModel) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val edit = state.edit
    val editing = state.editing
    val confirm = state.confirm

    Box(Modifier.fillMaxSize()) {
        PullToRefreshBox(
            isRefreshing = state.refreshing && state.products != null,
            onRefresh = viewModel::refresh,
            modifier = Modifier.fillMaxSize(),
        ) {
            ProductsPage(state, viewModel)
        }
        if (edit == null && confirm == null) {
            ToastHost(state.toast, viewModel::dismissToast, Modifier.align(Alignment.TopCenter))
        }
    }

    if (edit != null && editing != null) {
        EditProductDialog(
            product = editing,
            edit = edit,
            viewModel = viewModel,
            toast = if (confirm == null) state.toast else null,
        )
    }
    if (confirm != null) {
        ConfirmPrompt(confirm, state.confirmBusy, viewModel, state.toast)
    }
}

@Composable
private fun ProductsPage(state: ProductsUiState, viewModel: ProductsViewModel) {
    val products = state.products
    val summary = state.summary
    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 24.dp),
    ) {
        PageLead(
            "Add simple products, or products with options (500ml / 2L, Size 2, Red…) and packs " +
                "(crate, tray). Stock is counted per option.",
        )
        Spacer(Modifier.height(24.dp))

        if (state.loadError != null) {
            Banner(state.loadError, BannerTone.Error)
            if (products == null) {
                Spacer(Modifier.height(8.dp))
                ArrowButton("Try again", onClick = viewModel::refresh, tone = ButtonTone.Ghost, size = ButtonSize.Sm)
            }
            Spacer(Modifier.height(16.dp))
        }
        if (products == null) {
            SummarySkeleton()
            SlowServerHint(state.slow, Modifier.padding(top = 12.dp))
        } else {
            Summary(summary)
        }
        Spacer(Modifier.height(16.dp))

        AddProductCard(state, viewModel)
        Spacer(Modifier.height(16.dp))

        Tabs(
            labels = listOf("All", "Low stock (${summary.low})", "Out (${summary.out})"),
            selectedIndex = state.tab.ordinal,
            onSelect = { viewModel.onTabChange(ProductTab.entries[it]) },
        )
        Spacer(Modifier.height(12.dp))
        SearchField(state.query, viewModel::onQueryChange)
        Spacer(Modifier.height(16.dp))

        Card {
            if (products == null) {
                TableSkeleton()
            } else {
                val visible = state.visible
                ProductTable(visible, viewModel)
                if (visible.isEmpty()) {
                    Text(
                        if (products.isEmpty()) "No products yet." else "No matching products.",
                        modifier = Modifier.padding(top = 16.dp),
                        color = ChartShopColors.TextPrimary,
                        fontSize = 15.sp,
                    )
                }
            }
        }
    }
}

@Composable
private fun Summary(summary: ProductSummary) {
    FlowRow(
        Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(18.dp, Alignment.CenterHorizontally),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        SummaryItem("Products", summary.total.toString())
        SummaryItem("Stock value", formatMoney(summary.stockValue))
        SummaryItem("Low", summary.low.toString())
        SummaryItem("Out", summary.out.toString())
    }
}

@Composable
private fun SummaryItem(label: String, value: String) {
    Text(
        buildAnnotatedString {
            append("$label ")
            withStyle(SpanStyle(color = ChartShopColors.Maroon, fontWeight = FontWeight.SemiBold)) { append(value) }
        },
        color = ChartShopColors.TextSecondary,
        fontSize = 14.5.sp,
    )
}

@Composable
private fun AddProductCard(state: ProductsUiState, viewModel: ProductsViewModel) {
    val focusManager = LocalFocusManager.current
    val submitFromKeyboard = {
        focusManager.clearFocus()
        viewModel.create()
    }
    Card {
        CardTitle("Add product")
        Spacer(Modifier.height(16.dp))
        FieldRow {
            Field("Name", Modifier.weight(1f)) {
                TextInput(state.name, viewModel::onNameChange, Modifier.fillMaxWidth(), placeholder = "Product name")
            }
            Field("Low threshold", Modifier.weight(1f)) {
                TextInput(
                    state.lowStockThreshold,
                    viewModel::onThresholdChange,
                    Modifier.fillMaxWidth(),
                    placeholder = "Low stock alert",
                    kind = InputKind.Count,
                )
            }
        }
        state.options.forEachIndexed { index, option ->
            val errors = state.optionErrors.getOrNull(index) ?: OptionErrors()
            Spacer(Modifier.height(16.dp))
            FieldRow {
                Field("Variants", Modifier.weight(1f), hint = errors.label, isError = true) {
                    TextInput(
                        option.label,
                        { viewModel.onOptionChange(index, option.copy(label = it)) },
                        Modifier.fillMaxWidth(),
                        placeholder = "Size or colour",
                        isError = errors.label != null,
                    )
                }
                Field("Price", Modifier.weight(1f), hint = errors.price, isError = true) {
                    TextInput(
                        option.price,
                        { viewModel.onOptionChange(index, option.copy(price = it)) },
                        Modifier.fillMaxWidth(),
                        placeholder = "Sell price",
                        kind = InputKind.Money,
                        isError = errors.price != null,
                    )
                }
            }
            Spacer(Modifier.height(WrappedRowGap))
            FieldRow {
                Field("Cost", Modifier.weight(1f)) {
                    TextInput(
                        option.costPrice,
                        { viewModel.onOptionChange(index, option.copy(costPrice = it)) },
                        Modifier.fillMaxWidth(),
                        placeholder = "What you paid",
                        kind = InputKind.Money,
                    )
                }
                Field("Stock", Modifier.weight(1f), hint = errors.stock, isError = true) {
                    TextInput(
                        option.stock,
                        { viewModel.onOptionChange(index, option.copy(stock = it)) },
                        Modifier.fillMaxWidth(),
                        placeholder = "Units in stock",
                        kind = InputKind.Count,
                        isError = errors.stock != null,
                        imeAction = if (index == state.options.lastIndex) ImeAction.Done else ImeAction.Next,
                        onDone = submitFromKeyboard.takeIf { index == state.options.lastIndex },
                    )
                }
            }
            if (state.options.size > 1) {
                Spacer(Modifier.height(WrappedRowGap))
                ArrowButton("Remove", onClick = { viewModel.removeOptionRow(index) }, tone = ButtonTone.Ghost)
            }
        }
        Spacer(Modifier.height(20.dp))
        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            ArrowButton("+ Add option", onClick = viewModel::addOptionRow, tone = ButtonTone.Ghost)
            ArrowButton(
                if (state.creating) "Adding…" else "Add",
                onClick = viewModel::create,
                loading = state.creating,
            )
        }
    }
}

@Composable
private fun FieldRow(content: @Composable RowScope.() -> Unit) {
    Row(
        Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.Top,
        content = content,
    )
}

@Composable
private fun SearchField(query: String, onQueryChange: (String) -> Unit) {
    Row(
        Modifier
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
            modifier = Modifier.weight(1f).semantics { contentDescription = "Search products" },
            singleLine = true,
            textStyle = TextStyle(color = ChartShopColors.TextPrimary, fontSize = 15.sp),
            cursorBrush = SolidColor(ChartShopColors.Primary),
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
            decorationBox = { inner ->
                Box {
                    if (query.isEmpty()) Text("Search products", color = ChartShopColors.TextMuted, fontSize = 15.sp)
                    inner()
                }
            },
        )
    }
}

/** The web table on phones: a pinned NAME column, with the other columns scrolling sideways beside it. */
@Composable
private fun ProductTable(products: List<Product>, viewModel: ProductsViewModel) {
    Row(Modifier.fillMaxWidth()) {
        Column(
            Modifier
                .width(NameColumnWidth)
                .drawBehind {
                    drawLine(ChartShopColors.Border, Offset(size.width, 0f), Offset(size.width, size.height), 1.dp.toPx())
                },
        ) {
            HeaderCell("Name", NameColumnWidth)
            products.forEach { product -> key(product.id) { NameCell(product) } }
        }
        Box(Modifier.weight(1f)) {
            Column(Modifier.horizontalScroll(rememberScrollState())) {
                Row {
                    HeaderCell("Stock", StockColumnWidth)
                    HeaderCell("Price", MoneyColumnWidth)
                    HeaderCell("Cost", MoneyColumnWidth)
                    HeaderCell("", ActionsColumnWidth)
                }
                products.forEach { product ->
                    key(product.id) {
                        Row(Modifier.height(RowHeight).bottomBorder(), verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                if (product.trackStock) product.stock.toString() else "—",
                                modifier = Modifier.width(StockColumnWidth).padding(horizontal = 8.dp),
                                color = ChartShopColors.TextPrimary,
                                fontSize = 14.sp,
                            )
                            Box(Modifier.width(MoneyColumnWidth).padding(horizontal = 8.dp)) {
                                InlineMoneyInput(product.price, "Price", "Price for ${product.name}") {
                                    viewModel.savePrice(product, it)
                                }
                            }
                            Box(Modifier.width(MoneyColumnWidth).padding(horizontal = 8.dp)) {
                                InlineMoneyInput(product.costPrice, "Cost", "Cost for ${product.name}") {
                                    viewModel.saveCost(product, it)
                                }
                            }
                            Row(
                                Modifier.width(ActionsColumnWidth).padding(horizontal = 8.dp),
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                            ) {
                                ArrowButton("Edit", onClick = { viewModel.openEdit(product) }, tone = ButtonTone.Ghost, size = ButtonSize.Sm)
                                ArrowButton("Delete", onClick = { viewModel.askDelete(product) }, tone = ButtonTone.Danger, size = ButtonSize.Sm)
                            }
                        }
                    }
                }
            }
            Row(Modifier.matchParentSize()) {
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
            .height(HeaderHeight)
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
private fun NameCell(product: Product) {
    val status = product.stockStatus()
    val optionCount = product.activeVariants.size
    Row(
        Modifier
            .width(NameColumnWidth)
            .height(RowHeight)
            .bottomBorder()
            .padding(horizontal = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(
            product.name,
            modifier = Modifier.weight(1f, fill = false),
            color = ChartShopColors.TextPrimary,
            fontSize = 14.sp,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        if (product.hasOptions) {
            Badge("$optionCount option${if (optionCount == 1) "" else "s"}", tone = BadgeTone.Info)
        }
        when (status) {
            StockStatus.Out -> Badge("Out", tone = BadgeTone.Danger)
            StockStatus.Low -> Badge("Low", tone = BadgeTone.Warning)
            else -> Unit
        }
    }
}

/** Saves when the box loses focus; goes back to the saved value if there was nothing to save. */
@Composable
private fun InlineMoneyInput(saved: Double?, placeholder: String, label: String, onCommit: (String) -> Boolean) {
    val savedText = NumberInput.moneyField(saved)
    var text by remember(savedText) { mutableStateOf(savedText) }
    var focused by remember { mutableStateOf(false) }
    val focusManager = LocalFocusManager.current
    TextInput(
        value = text,
        onValueChange = { text = NumberInput.sanitizeMoney(it) },
        modifier = Modifier
            .width(72.dp)
            .onFocusChanged { state ->
                if (focused && !state.isFocused && text != savedText && !onCommit(text)) text = savedText
                focused = state.isFocused
            }
            .semantics { contentDescription = label },
        placeholder = placeholder,
        kind = InputKind.Money,
        compact = true,
        imeAction = ImeAction.Done,
        onDone = { focusManager.clearFocus() },
    )
}

@Composable
private fun EditProductDialog(product: Product, edit: EditState, viewModel: ProductsViewModel, toast: Toast?) {
    val variants = product.activeVariants
    var nameFocused by remember { mutableStateOf(false) }
    Modal(
        title = "Edit ${product.name}",
        description = "Change the name, update stock here, or add another option (size, colour, flavour…). Packs are optional.",
        onDismiss = viewModel::closeEdit,
        maxWidth = 720.dp,
        footer = { ArrowButton("Done", onClick = viewModel::closeEdit) },
        overlay = { ToastHost(toast, viewModel::dismissToast) },
    ) {
        // Read inside the dialog: it has its own focus owner, separate from the page's.
        val focusManager = LocalFocusManager.current
        Field("Product name", Modifier.fillMaxWidth()) {
            TextInput(
                edit.name,
                viewModel::onEditNameChange,
                Modifier
                    .fillMaxWidth()
                    .onFocusChanged { state ->
                        if (nameFocused && !state.isFocused) viewModel.saveName()
                        nameFocused = state.isFocused
                    },
                placeholder = "Product name",
                imeAction = ImeAction.Done,
                onDone = { focusManager.clearFocus() },
            )
        }
        Spacer(Modifier.height(16.dp))
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            variants.forEach { variant ->
                key(variant.id) {
                    SizeRow(product, variant, removable = variants.size > 1, edit = edit, viewModel = viewModel)
                }
            }
        }
        Spacer(Modifier.height(16.dp))
        when (edit.panel) {
            EditPanel.List -> FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                ArrowButton("+ Add option", onClick = { viewModel.showPanel(EditPanel.AddOption) }, tone = ButtonTone.Ghost)
                ArrowButton("+ Sell in packs (crate, tray…)", onClick = { viewModel.showPanel(EditPanel.AddPack) }, tone = ButtonTone.Ghost)
            }
            EditPanel.AddOption -> AddOptionSection(edit, viewModel)
            EditPanel.AddPack -> AddPackSection(variants, edit, viewModel)
        }
    }
}

@Composable
private fun SizeRow(product: Product, variant: ProductVariant, removable: Boolean, edit: EditState, viewModel: ProductsViewModel) {
    val busy = edit.stockBusy?.takeIf { it.variantId == variant.id }
    val packs = variant.activePacks
    Column(
        Modifier
            .fillMaxWidth()
            .background(ChartShopColors.Cream)
            .border(1.dp, ChartShopColors.Border)
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Column {
            Text(variant.displayLabel(), color = ChartShopColors.TextPrimary, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
            Text(
                variant.priceDetails(),
                modifier = Modifier.padding(top = 4.dp),
                color = ChartShopColors.TextSecondary,
                fontSize = 14.sp,
                lineHeight = 20.sp,
            )
            Text(
                when {
                    !variant.trackStock -> "Stock tracking off"
                    busy != null -> "Updating stock…"
                    else -> "${variant.stock} in stock"
                },
                modifier = Modifier.padding(top = 6.dp),
                color = ChartShopColors.Maroon,
                fontSize = 15.sp,
                fontWeight = FontWeight.SemiBold,
            )
        }
        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            if (variant.trackStock) {
                Text(
                    "CHANGE STOCK",
                    modifier = Modifier.fillMaxWidth(),
                    color = ChartShopColors.TextMuted,
                    fontSize = 12.5.sp,
                    fontWeight = FontWeight.SemiBold,
                    letterSpacing = 0.04.em,
                )
                Box(Modifier.height(ButtonSize.Sm.height), contentAlignment = Alignment.Center) {
                    AdjustGroup(
                        quantity = edit.stockInputs[variant.id].orEmpty(),
                        onQuantityChange = { viewModel.onStockInputChange(variant.id, it) },
                        busy = busy?.op,
                        locked = edit.stockBusy != null,
                        label = variant.label.ifBlank { product.name },
                        onAdjust = { viewModel.adjustStock(variant.id, it) },
                    )
                }
            }
            if (removable) {
                ArrowButton(
                    "Remove",
                    onClick = { viewModel.askRemoveOption(product, variant.id, variant.label) },
                    tone = ButtonTone.Ghost,
                    size = ButtonSize.Sm,
                )
            }
            if (packs.size > 1) {
                packs.filter { it.unitsPerPack != 1 }.forEach { pack ->
                    ArrowButton(
                        "Remove ${pack.label}",
                        onClick = { viewModel.askRemovePack(product, variant.id, variant.label, pack.id, pack.label) },
                        tone = ButtonTone.Ghost,
                        size = ButtonSize.Sm,
                    )
                }
            }
        }
    }
}

/** Qty | + | − strip; an empty Qty box counts as one. */
@Composable
private fun AdjustGroup(
    quantity: String,
    onQuantityChange: (String) -> Unit,
    busy: StockOp?,
    locked: Boolean,
    label: String,
    onAdjust: (StockOp) -> Unit,
) {
    val interaction = remember { MutableInteractionSource() }
    val focused by interaction.collectIsFocusedAsState()
    Row(
        Modifier
            .height(32.dp)
            .border(1.dp, ChartShopColors.Border)
            .background(ChartShopColors.Cream),
    ) {
        BasicTextField(
            value = quantity,
            onValueChange = onQuantityChange,
            modifier = Modifier
                .width(42.dp)
                .fillMaxHeight()
                .alpha(if (locked) 0.5f else 1f)
                .background(if (focused) ChartShopColors.Surface else Color.Transparent)
                .semantics { contentDescription = "How many to change for $label" },
            enabled = !locked,
            singleLine = true,
            interactionSource = interaction,
            textStyle = TextStyle(color = ChartShopColors.TextPrimary, fontSize = 14.sp, textAlign = TextAlign.Center),
            cursorBrush = SolidColor(ChartShopColors.Primary),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Done),
            keyboardActions = KeyboardActions(onDone = { onAdjust(StockOp.Add) }),
            decorationBox = { inner ->
                Box(Modifier.padding(horizontal = 6.dp), contentAlignment = Alignment.Center) {
                    if (quantity.isEmpty()) Text("Qty", color = ChartShopColors.TextMuted, fontSize = 14.sp)
                    inner()
                }
            },
        )
        CellDivider()
        StepButton("+", if (busy == StockOp.Add) "Adding stock" else "Add stock", busy == StockOp.Add, !locked) { onAdjust(StockOp.Add) }
        CellDivider()
        StepButton("−", if (busy == StockOp.Remove) "Removing stock" else "Take out stock", busy == StockOp.Remove, !locked) {
            onAdjust(StockOp.Remove)
        }
    }
}

@Composable
private fun StepButton(symbol: String, description: String, busy: Boolean, enabled: Boolean, onClick: () -> Unit) {
    Box(
        Modifier
            .width(30.dp)
            .fillMaxHeight()
            .alpha(if (enabled || busy) 1f else 0.45f)
            .clickable(enabled = enabled, onClick = onClick)
            .semantics {
                contentDescription = description
                role = Role.Button
            },
        contentAlignment = Alignment.Center,
    ) {
        if (busy) {
            CircularProgressIndicator(Modifier.size(14.dp), color = ChartShopColors.Maroon, strokeWidth = 2.dp)
        } else {
            Text(symbol, color = ChartShopColors.Maroon, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun CellDivider() {
    Box(Modifier.width(1.dp).fillMaxHeight().background(ChartShopColors.Border))
}

@Composable
private fun AddOptionSection(edit: EditState, viewModel: ProductsViewModel) {
    val draft = edit.variantDraft
    AddSection(
        title = "Add option",
        lead = "Examples: 500ml, Size 2, Red, 1kg. Needs its own price and starting stock.",
    ) {
        FieldRow {
            Field("Variants", Modifier.weight(1f)) {
                TextInput(draft.label, { viewModel.onVariantDraftChange(draft.copy(label = it)) }, Modifier.fillMaxWidth(), placeholder = "Size or colour")
            }
            Field("Price", Modifier.weight(1f)) {
                TextInput(
                    draft.price,
                    { viewModel.onVariantDraftChange(draft.copy(price = it)) },
                    Modifier.fillMaxWidth(),
                    placeholder = "Sell price",
                    kind = InputKind.Money,
                )
            }
        }
        Spacer(Modifier.height(WrappedRowGap))
        Field("Starting stock", Modifier.fillMaxWidth()) {
            TextInput(
                draft.stock,
                { viewModel.onVariantDraftChange(draft.copy(stock = it)) },
                Modifier.fillMaxWidth(),
                placeholder = "Units in stock",
                kind = InputKind.Count,
                imeAction = ImeAction.Done,
                onDone = viewModel::saveVariant,
            )
        }
        Spacer(Modifier.height(WrappedRowGap))
        SectionButtons(
            saveLabel = "Save option",
            saving = edit.saving,
            onSave = viewModel::saveVariant,
            onCancel = { viewModel.showPanel(EditPanel.List) },
        )
    }
}

@Composable
private fun AddPackSection(variants: List<ProductVariant>, edit: EditState, viewModel: ProductsViewModel) {
    val draft = edit.packDraft
    AddSection(
        title = "Sell in packs",
        lead = "Same stock, sold as a group — e.g. a crate of 24. Pick which option the pack belongs to.",
    ) {
        Field("Which option?", Modifier.fillMaxWidth()) {
            SelectInput(
                options = variants.map { v ->
                    v.id to v.displayLabel() + if (v.trackStock) " (${v.stock} in stock)" else ""
                },
                selected = draft.variantId.ifEmpty { null },
                onSelect = { viewModel.onPackDraftChange(draft.copy(variantId = it)) },
                modifier = Modifier.fillMaxWidth(),
            )
        }
        Spacer(Modifier.height(WrappedRowGap))
        FieldRow {
            Field("Pack name", Modifier.weight(1f)) {
                TextInput(draft.label, { viewModel.onPackDraftChange(draft.copy(label = it)) }, Modifier.fillMaxWidth(), placeholder = "Pack name")
            }
            Field("How many inside?", Modifier.weight(1f)) {
                TextInput(
                    draft.unitsPerPack,
                    { viewModel.onPackDraftChange(draft.copy(unitsPerPack = it)) },
                    Modifier.fillMaxWidth(),
                    placeholder = "Units per pack",
                    kind = InputKind.Count,
                )
            }
        }
        Spacer(Modifier.height(WrappedRowGap))
        Field("Pack price", Modifier.fillMaxWidth()) {
            TextInput(
                draft.price,
                { viewModel.onPackDraftChange(draft.copy(price = it)) },
                Modifier.fillMaxWidth(),
                placeholder = "Sell price",
                kind = InputKind.Money,
                imeAction = ImeAction.Done,
                onDone = viewModel::savePack,
            )
        }
        Spacer(Modifier.height(WrappedRowGap))
        SectionButtons(
            saveLabel = "Save pack",
            saving = edit.saving,
            onSave = viewModel::savePack,
            onCancel = { viewModel.showPanel(EditPanel.List) },
        )
    }
}

@Composable
private fun SectionButtons(saveLabel: String, saving: Boolean, onSave: () -> Unit, onCancel: () -> Unit) {
    FlowRow(
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        ArrowButton(saveLabel, onClick = onSave, loading = saving)
        ArrowButton("Cancel", onClick = onCancel, tone = ButtonTone.Ghost, enabled = !saving)
    }
}

/** Dashed-border panel for the "Add option" and "Sell in packs" forms. */
@Composable
private fun AddSection(title: String, lead: String, content: @Composable ColumnScope.() -> Unit) {
    Column(
        Modifier
            .padding(top = 12.dp)
            .fillMaxWidth()
            .background(ChartShopColors.Surface)
            .drawBehind {
                drawRect(
                    ChartShopColors.BorderStrong,
                    style = Stroke(width = 1.dp.toPx(), pathEffect = PathEffect.dashPathEffect(floatArrayOf(6.dp.toPx(), 4.dp.toPx()))),
                )
            }
            .padding(12.dp),
    ) {
        Text(title, modifier = Modifier.padding(bottom = 4.dp), color = ChartShopColors.Maroon, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
        Text(
            lead,
            modifier = Modifier.padding(bottom = 12.dp),
            color = ChartShopColors.TextSecondary,
            fontSize = 14.sp,
            lineHeight = 20.sp,
        )
        content()
    }
}

@Composable
private fun ConfirmPrompt(request: ConfirmRequest, busy: Boolean, viewModel: ProductsViewModel, toast: Toast?) {
    val (title, description, confirmLabel) = when (request) {
        is ConfirmRequest.DeleteProduct -> Triple(
            "Delete product?",
            "Remove ${request.name} from the catalogue. This cannot be undone.",
            "Delete",
        )
        is ConfirmRequest.RemoveOption -> Triple("Remove option?", "Remove ${request.label} from ${request.productName}?", "Remove")
        is ConfirmRequest.RemovePack -> Triple("Remove pack?", "Stop selling ${request.packLabel} for ${request.ownerLabel}?", "Remove")
    }
    ConfirmDialog(
        title = title,
        description = description,
        confirmLabel = confirmLabel,
        cancelLabel = "Keep",
        loading = busy,
        onConfirm = viewModel::confirm,
        onDismiss = viewModel::dismissConfirm,
        overlay = { ToastHost(toast, viewModel::dismissToast) },
    )
}

@Composable
private fun SummarySkeleton() {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(18.dp, Alignment.CenterHorizontally)) {
        listOf(80.dp, 110.dp, 44.dp, 44.dp).forEach { SkeletonBar(it, 16.dp) }
    }
}

@Composable
private fun TableSkeleton() {
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        repeat(8) {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                listOf(112.dp, 44.dp, 64.dp, 64.dp).forEach { SkeletonBar(it, 18.dp) }
            }
        }
    }
}

@Composable
private fun SkeletonBar(width: Dp, height: Dp) {
    Box(Modifier.width(width).height(height).background(ChartShopColors.PeachSoft))
}

private fun Modifier.bottomBorder(): Modifier = drawBehind {
    val y = size.height - 0.5.dp.toPx()
    drawLine(ChartShopColors.Border, Offset(0f, y), Offset(size.width, y), 1.dp.toPx())
}
