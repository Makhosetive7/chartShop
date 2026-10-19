package com.chartshop.app.ui.sales

import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chartshop.app.data.model.Sale
import com.chartshop.app.domain.ProductCatalog
import com.chartshop.app.domain.formatMoney
import com.chartshop.app.ui.components.ArrowButton
import com.chartshop.app.ui.components.Badge
import com.chartshop.app.ui.components.BadgeTone
import com.chartshop.app.ui.components.ButtonRow
import com.chartshop.app.ui.components.ButtonSize
import com.chartshop.app.ui.components.ButtonTone
import com.chartshop.app.ui.components.Card
import com.chartshop.app.ui.components.CellText
import com.chartshop.app.ui.components.ConfirmDialog
import com.chartshop.app.ui.components.DataTable
import com.chartshop.app.ui.components.DateField
import com.chartshop.app.ui.components.EmptyState
import com.chartshop.app.ui.components.Field
import com.chartshop.app.ui.components.PageLead
import com.chartshop.app.ui.components.PeriodTabs
import com.chartshop.app.ui.components.ProductLineFields
import com.chartshop.app.ui.components.ScreenPage
import com.chartshop.app.ui.components.SectionHead
import com.chartshop.app.ui.components.SlowServerHint
import com.chartshop.app.ui.components.StatStrip
import com.chartshop.app.ui.components.SuggestInput
import com.chartshop.app.ui.components.TableColumn
import com.chartshop.app.ui.components.TableSkeleton
import com.chartshop.app.ui.components.Tabs
import com.chartshop.app.ui.components.ToastHost
import com.chartshop.app.ui.theme.ChartShopColors

@Composable
fun SalesScreen(viewModel: SalesViewModel) {
    val form by viewModel.form.collectAsStateWithLifecycle()
    val recent by viewModel.recent.collectAsStateWithLifecycle()
    val refunds by viewModel.refunds.collectAsStateWithLifecycle()
    val catalog by viewModel.catalog.collectAsStateWithLifecycle()
    val customers by viewModel.customerNames.collectAsStateWithLifecycle()
    val toast by viewModel.toast.collectAsStateWithLifecycle()
    val dates = viewModel.dates

    ScreenPage(
        toast = if (form.cancel == null) toast else null,
        onDismissToast = viewModel::dismissToast,
        refreshing = recent.loading && recent.data != null,
        onRefresh = viewModel::refresh,
    ) {
        PageLead("Cash, credit, and customer sales. Option and pack pickers appear when a product has them.")
        Tabs(
            labels = SaleMode.entries.map { it.label },
            selectedIndex = form.mode.ordinal,
            onSelect = { viewModel.onModeChange(SaleMode.entries[it]) },
        )

        Card {
            if (form.mode != SaleMode.Cash) {
                Field("Customer (name / phone)", Modifier.fillMaxWidth()) {
                    SuggestInput(form.customer, viewModel::onCustomerChange, customers, Modifier.fillMaxWidth(), placeholder = "Name or phone")
                }
                Spacer(Modifier.height(16.dp))
                if (form.mode == SaleMode.Credit) {
                    Field("Pay by", Modifier.fillMaxWidth()) {
                        DateField(
                            form.dueDate,
                            viewModel::onDueDateChange,
                            display = dates::formatIsoDay,
                            minIsoDay = dates.isoDayFromToday(0),
                        )
                    }
                    Spacer(Modifier.height(16.dp))
                }
            }
            form.lines.forEachIndexed { index, line ->
                if (index > 0) Spacer(Modifier.height(20.dp))
                ProductLineFields(
                    line = line,
                    products = catalog.orEmpty(),
                    onChange = { viewModel.onLineChange(index, it) },
                    onRemove = if (form.lines.size > 1) ({ viewModel.removeLine(index) }) else null,
                )
            }
            Spacer(Modifier.height(24.dp))
            ButtonRow {
                ArrowButton("+ Line", onClick = viewModel::addLine, tone = ButtonTone.Ghost)
                ArrowButton(
                    if (form.selling) "Processing…" else "Complete sale",
                    onClick = viewModel::completeSale,
                    loading = form.selling,
                )
            }
        }

        Card {
            SectionHead(
                "Recent sales",
                action = {
                    ArrowButton(
                        "Cancel last",
                        onClick = viewModel::askCancelLast,
                        tone = ButtonTone.Danger,
                        size = ButtonSize.Sm,
                        loading = form.cancelling && form.cancel == CancelTarget.Last,
                    )
                },
            )
            val sales = recent.data
            when {
                sales == null && recent.error != null -> Text(recent.error.orEmpty(), color = ChartShopColors.Danger, fontSize = 14.sp)
                sales == null -> {
                    TableSkeleton(listOf(100.dp, 120.dp, 50.dp, 60.dp))
                    SlowServerHint(recent.slow, Modifier.padding(top = 12.dp))
                }
                sales.isEmpty() -> Text("No recent sales.", color = ChartShopColors.TextPrimary, fontSize = 15.sp)
                else -> RecentTable(sales, form, viewModel)
            }
        }

        Card {
            SectionHead(
                "Refunds / cancellations",
                lead = "Cancelled sales in the selected window. Stock and credit are already reversed when a sale is cancelled above.",
            )
            PeriodTabs(
                labels = REFUND_PERIODS.map { "$it days" },
                selectedIndex = REFUND_PERIODS.indexOf(form.refundDays),
                onSelect = { viewModel.onRefundDaysChange(REFUND_PERIODS[it]) },
            )
            Spacer(Modifier.height(16.dp))
            val data = refunds.data
            when {
                data == null && refunds.error != null -> Text(refunds.error.orEmpty(), color = ChartShopColors.TextPrimary, fontSize = 14.sp)
                data == null -> TableSkeleton(listOf(110.dp, 60.dp, 120.dp, 60.dp), rows = 4)
                else -> {
                    StatStrip(
                        listOf(
                            "Total refunded" to formatMoney(data.totalRefundAmount),
                            "Cancellations" to data.sales.size.toString(),
                            "Period" to "Last ${form.refundDays} days",
                        ),
                    )
                    Spacer(Modifier.height(16.dp))
                    if (data.sales.isEmpty()) {
                        EmptyState(
                            "No cancellations in the last ${form.refundDays} days",
                            "When you cancel a sale from Recent sales, it will show up here with the amount and reason.",
                        )
                    } else {
                        RefundsTable(data.sales, viewModel)
                    }
                }
            }
        }
    }

    val cancel = form.cancel
    if (cancel != null) {
        ConfirmDialog(
            title = if (cancel == CancelTarget.Last) "Cancel last sale?" else "Cancel this sale?",
            description = when (cancel) {
                CancelTarget.Last -> "This reverses the most recent sale and returns items to stock. This cannot be undone from the till."
                is CancelTarget.One -> "This reverses ${cancel.label} and returns items to stock. This cannot be undone from the till."
            },
            confirmLabel = "Cancel sale",
            cancelLabel = "Keep sale",
            loading = form.cancelling,
            onConfirm = viewModel::confirmCancel,
            onDismiss = viewModel::dismissCancel,
            overlay = { ToastHost(toast, viewModel::dismissToast) },
        )
    }
}

private fun customerLabel(sale: Sale) = sale.customerName?.takeIf { it.isNotBlank() } ?: if (sale.type == "cash") "Walk-in" else "—"

@Composable
private fun RecentTable(sales: List<Sale>, form: SalesForm, viewModel: SalesViewModel) {
    val dates = viewModel.dates
    DataTable(
        rows = sales,
        key = { it.id.ifEmpty { "${it.date}-${it.total}" } },
        rowHeight = 64.dp,
        columns = listOf(
            TableColumn("Customer", 110.dp) { CellText(customerLabel(it), maxLines = 1) },
            TableColumn("Items", 170.dp) { CellText(ProductCatalog.itemsSummary(it.items), muted = true) },
            TableColumn("Type", 72.dp) { CellText(it.type) },
            TableColumn("Total", 80.dp) { CellText(formatMoney(it.total)) },
            TableColumn("Pay by", 100.dp) {
                CellText(if (it.type == "credit" && it.dueDate != null) dates.date(it.dueDate) else "—")
            },
            TableColumn("When", 100.dp) { CellText(dates.date(it.date)) },
            TableColumn("", 100.dp) { sale ->
                ArrowButton(
                    "Cancel",
                    onClick = { viewModel.askCancel(sale) },
                    tone = ButtonTone.Ghost,
                    size = ButtonSize.Sm,
                    enabled = sale.id.isNotEmpty(),
                    loading = form.cancelling && (form.cancel as? CancelTarget.One)?.id == sale.id,
                )
            },
        ),
    )
}

@Composable
private fun RefundsTable(sales: List<Sale>, viewModel: SalesViewModel) {
    val dates = viewModel.dates
    DataTable(
        rows = sales,
        key = { it.id },
        rowHeight = 64.dp,
        columns = listOf(
            TableColumn("Cancelled", 120.dp) { CellText(if (it.cancelledAt != null) dates.dateTime(it.cancelledAt) else "—") },
            TableColumn("Type", 100.dp) { Badge(it.type.replace('_', ' '), tone = BadgeTone.Danger) },
            TableColumn("Items", 170.dp) { CellText(ProductCatalog.itemsSummary(it.items), muted = true) },
            TableColumn("Customer", 110.dp) { CellText(customerLabel(it)) },
            TableColumn("Amount", 80.dp) { CellText(formatMoney(it.total)) },
            TableColumn("Reason", 160.dp) { CellText(it.cancellationReason?.ifBlank { null } ?: "—") },
        ),
    )
}
