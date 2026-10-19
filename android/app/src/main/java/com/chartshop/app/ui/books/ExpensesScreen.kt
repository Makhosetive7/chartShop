package com.chartshop.app.ui.books

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chartshop.app.data.model.EXPENSE_RESTOCK
import com.chartshop.app.domain.formatMoney
import com.chartshop.app.ui.components.ArrowButton
import com.chartshop.app.ui.components.ButtonRow
import com.chartshop.app.ui.components.ButtonTone
import com.chartshop.app.ui.components.Card
import com.chartshop.app.ui.components.CardTitle
import com.chartshop.app.ui.components.CellText
import com.chartshop.app.ui.components.ConfirmDialog
import com.chartshop.app.ui.components.DataTable
import com.chartshop.app.ui.components.Field
import com.chartshop.app.ui.components.FieldRow
import com.chartshop.app.ui.components.InputKind
import com.chartshop.app.ui.components.ScreenPage
import com.chartshop.app.ui.components.SelectInput
import com.chartshop.app.ui.components.SkeletonBar
import com.chartshop.app.ui.components.SlowServerHint
import com.chartshop.app.ui.components.TableColumn
import com.chartshop.app.ui.components.TableSkeleton
import com.chartshop.app.ui.components.Tabs
import com.chartshop.app.ui.components.TextInput
import com.chartshop.app.ui.components.ToastHost
import com.chartshop.app.ui.theme.ChartShopColors

private val QuickActionsBackground = Color(0xFFFFF7F4)

@Composable
fun ExpensesScreen(viewModel: ExpensesViewModel) {
    val form by viewModel.form.collectAsStateWithLifecycle()
    val list by viewModel.list.collectAsStateWithLifecycle()
    val breakdown by viewModel.breakdown.collectAsStateWithLifecycle()
    val cash by viewModel.cashAvailable.collectAsStateWithLifecycle()
    val toast by viewModel.toast.collectAsStateWithLifecycle()
    val dates = viewModel.dates

    ScreenPage(
        toast = if (form.overspend == null) toast else null,
        onDismissToast = viewModel::dismissToast,
        refreshing = list.loading && list.data != null,
        onRefresh = viewModel::refresh,
    ) {
        Text(
            buildAnnotatedString {
                append("Record spend and review period totals / category mix.")
                cash?.let {
                    append(" Cash available in the till: ")
                    withStyle(SpanStyle(fontWeight = FontWeight.Bold, color = ChartShopColors.TextPrimary)) { append(formatMoney(it)) }
                    append(".")
                }
            },
            color = ChartShopColors.TextSecondary,
            fontSize = 15.sp,
            lineHeight = 23.sp,
        )

        Card {
            Column(
                Modifier
                    .fillMaxWidth()
                    .border(1.dp, ChartShopColors.Border)
                    .background(QuickActionsBackground)
                    .padding(12.dp),
            ) {
                Text("Quick actions", color = ChartShopColors.TextPrimary, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                Text(
                    if (viewModel.isAdmin) {
                        "Use Restock for supplier/stock top-ups. Records cash out only — stock levels managed separately in Products."
                    } else {
                        "Restock is available to admins only. You can still record normal expenses below."
                    },
                    modifier = Modifier.padding(top = 6.dp, bottom = 12.dp),
                    color = ChartShopColors.TextSecondary,
                    fontSize = 13.sp,
                    lineHeight = 19.sp,
                )
                ButtonRow {
                    if (viewModel.isAdmin) {
                        ArrowButton(
                            "Restock",
                            onClick = viewModel::useRestock,
                            tone = if (form.restock) ButtonTone.Filled else ButtonTone.Light,
                        )
                    }
                    ArrowButton(
                        "Normal expense",
                        onClick = viewModel::useNormal,
                        tone = if (!form.restock) ButtonTone.Filled else ButtonTone.Light,
                    )
                }
            }
            Spacer(Modifier.height(16.dp))
            FieldRow {
                Field("Amount", Modifier.weight(1f)) {
                    TextInput(form.amount, viewModel::onAmountChange, Modifier.fillMaxWidth(), placeholder = "Amount spent", kind = InputKind.Money)
                }
                Field("Method", Modifier.weight(1f)) {
                    SelectInput(PAYMENT_METHODS.map { it to it }, form.paymentMethod, viewModel::onMethodChange, Modifier.fillMaxWidth())
                }
            }
            Spacer(Modifier.height(16.dp))
            Field("Description", Modifier.fillMaxWidth()) {
                TextInput(
                    form.description,
                    viewModel::onDescriptionChange,
                    Modifier.fillMaxWidth(),
                    placeholder = if (form.restock) "What stock are you buying" else "What was this for",
                )
            }
            if (!form.restock) {
                Spacer(Modifier.height(16.dp))
                Field("Category", Modifier.fillMaxWidth()) {
                    SelectInput(
                        EXPENSE_CATEGORY_LABELS.filterKeys { it != "restocking" }.toList(),
                        form.category,
                        viewModel::onCategoryChange,
                        Modifier.fillMaxWidth(),
                    )
                }
            }
            Spacer(Modifier.height(20.dp))
            val saving = form.saving && form.overspend == null
            ArrowButton(if (saving) "Recording…" else "Record", onClick = viewModel::record, loading = saving)
        }

        Tabs(
            labels = EXPENSE_PERIODS.map { it.replaceFirstChar(Char::uppercase) },
            selectedIndex = EXPENSE_PERIODS.indexOf(form.period),
            onSelect = { viewModel.onPeriodChange(EXPENSE_PERIODS[it]) },
        )

        Card {
            val data = list.data
            when {
                data == null && list.error != null -> Text(list.error.orEmpty(), color = ChartShopColors.Danger, fontSize = 14.sp)
                data == null -> {
                    SkeletonBar(160.dp, 16.dp)
                    Spacer(Modifier.height(16.dp))
                    TableSkeleton(listOf(90.dp, 100.dp, 110.dp, 60.dp))
                    SlowServerHint(list.slow, Modifier.padding(top = 12.dp))
                }
                else -> {
                    Text(
                        buildAnnotatedString {
                            append("Cash out total: ")
                            withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { append(formatMoney(data.total)) }
                            append(" (Operating ${formatMoney(data.operatingTotal)} + Restock ${formatMoney(data.inventoryTransferTotal)})")
                        },
                        color = ChartShopColors.TextPrimary,
                        fontSize = 15.sp,
                        lineHeight = 22.sp,
                    )
                    Spacer(Modifier.height(12.dp))
                    if (data.expenses.isNotEmpty()) {
                        DataTable(
                            rows = data.expenses,
                            key = { it.id },
                            columns = listOf(
                                TableColumn("Date", 100.dp) { CellText(dates.date(it.date)) },
                                TableColumn("Type", 130.dp) {
                                    CellText(if (it.kind == EXPENSE_RESTOCK) "Restock (cash out)" else "Operating expense")
                                },
                                TableColumn("Description", 170.dp) { CellText(it.description) },
                                TableColumn("Category", 110.dp) { CellText(EXPENSE_CATEGORY_LABELS[it.category] ?: it.category) },
                                TableColumn("Amount", 90.dp) { CellText(formatMoney(it.amount)) },
                            ),
                        )
                    }
                }
            }
        }

        Card {
            CardTitle("Breakdown")
            Spacer(Modifier.height(12.dp))
            val rows = breakdown.data
            when {
                rows == null && breakdown.error != null -> Text(breakdown.error.orEmpty(), color = ChartShopColors.Danger, fontSize = 14.sp)
                rows == null -> TableSkeleton(listOf(100.dp, 50.dp, 70.dp), rows = 5)
                rows.isNotEmpty() -> DataTable(
                    rows = rows,
                    key = { it.category },
                    rowHeight = 48.dp,
                    columns = listOf(
                        TableColumn("Category", 130.dp) { CellText(EXPENSE_CATEGORY_LABELS[it.category] ?: it.category) },
                        TableColumn("Count", 80.dp) { CellText(it.count.toString()) },
                        TableColumn("Total", 100.dp) { CellText(formatMoney(it.total)) },
                    ),
                )
            }
        }
    }

    val overspend = form.overspend
    if (overspend != null) {
        ConfirmDialog(
            title = "Not enough recorded cash",
            description = "This expense is ${formatMoney(overspend.amount)}, but the till only shows " +
                "${formatMoney(overspend.cashAvailable)} recorded cash (shortfall ${formatMoney(overspend.shortfall)}). " +
                "If you paid from your pocket or cash not yet recorded, confirm and we’ll add an owner cash-in for the shortfall.",
            confirmLabel = "Record with owner cash-in",
            cancelLabel = "Cancel",
            danger = false,
            loading = form.saving,
            onConfirm = viewModel::confirmOverspend,
            onDismiss = viewModel::dismissOverspend,
            overlay = { ToastHost(toast, viewModel::dismissToast) },
        )
    }
}
