package com.chartshop.app.ui.books

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
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
import com.chartshop.app.domain.ProductCatalog
import com.chartshop.app.domain.formatMoney
import com.chartshop.app.ui.components.ArrowButton
import com.chartshop.app.ui.components.Badge
import com.chartshop.app.ui.components.BadgeTone
import com.chartshop.app.ui.components.ButtonSize
import com.chartshop.app.ui.components.ButtonTone
import com.chartshop.app.ui.components.Card
import com.chartshop.app.ui.components.CardTitle
import com.chartshop.app.ui.components.CellText
import com.chartshop.app.ui.components.ConfirmDialog
import com.chartshop.app.ui.components.DataTable
import com.chartshop.app.ui.components.Field
import com.chartshop.app.ui.components.FieldRow
import com.chartshop.app.ui.components.PageLead
import com.chartshop.app.ui.components.ProductLineFields
import com.chartshop.app.ui.components.ScreenPage
import com.chartshop.app.ui.components.SelectInput
import com.chartshop.app.ui.components.SlowServerHint
import com.chartshop.app.ui.components.SuggestInput
import com.chartshop.app.ui.components.TableColumn
import com.chartshop.app.ui.components.TableSkeleton
import com.chartshop.app.ui.components.Tabs
import com.chartshop.app.ui.components.TextInput
import com.chartshop.app.ui.components.ToastHost
import com.chartshop.app.ui.theme.ChartShopColors

@Composable
fun OrdersScreen(viewModel: OrdersViewModel) {
    val form by viewModel.form.collectAsStateWithLifecycle()
    val orders by viewModel.orders.collectAsStateWithLifecycle()
    val catalog by viewModel.catalog.collectAsStateWithLifecycle()
    val customers by viewModel.customerNames.collectAsStateWithLifecycle()
    val toast by viewModel.toast.collectAsStateWithLifecycle()
    val dates = viewModel.dates

    ScreenPage(
        toast = if (form.cancel == null) toast else null,
        onDismissToast = viewModel::dismissToast,
        refreshing = orders.loading && orders.data != null,
        onRefresh = viewModel::refresh,
    ) {
        PageLead(
            "Pickup / delivery orders — pending until completed or cancelled. " +
                "Choose option/pack when the product has options.",
        )

        Card {
            CardTitle("New order")
            Spacer(Modifier.height(16.dp))
            FieldRow {
                Field("Customer", Modifier.weight(1.4f)) {
                    SuggestInput(form.customer, viewModel::onCustomerChange, customers, Modifier.fillMaxWidth(), placeholder = "Customer name")
                }
                Field("Type", Modifier.weight(1f)) {
                    SelectInput(ORDER_TYPES, form.orderType, viewModel::onTypeChange, Modifier.fillMaxWidth())
                }
            }
            Spacer(Modifier.height(16.dp))
            Field("Notes", Modifier.fillMaxWidth()) {
                TextInput(form.notes, viewModel::onNotesChange, Modifier.fillMaxWidth(), placeholder = "Order notes")
            }
            Spacer(Modifier.height(16.dp))
            ProductLineFields(
                line = form.line,
                products = catalog.orEmpty(),
                onChange = viewModel::onLineChange,
                hidePrice = true,
            )
            Spacer(Modifier.height(20.dp))
            ArrowButton(if (form.placing) "Placing…" else "Place order", onClick = viewModel::place, loading = form.placing)
        }

        Tabs(
            labels = ORDER_STATUSES.map { it.replaceFirstChar(Char::uppercase) },
            selectedIndex = ORDER_STATUSES.indexOf(form.status),
            onSelect = { viewModel.onStatusTab(ORDER_STATUSES[it]) },
        )

        Card {
            val list = orders.data
            when {
                list == null && orders.error != null -> Text(orders.error.orEmpty(), color = ChartShopColors.Danger, fontSize = 14.sp)
                list == null -> {
                    TableSkeleton(listOf(40.dp, 100.dp, 120.dp, 60.dp))
                    SlowServerHint(orders.slow, Modifier.padding(top = 12.dp))
                }
                list.isEmpty() -> Text("No orders.", color = ChartShopColors.TextPrimary, fontSize = 15.sp)
                else -> DataTable(
                    rows = list,
                    key = { it.id },
                    rowHeight = 64.dp,
                    columns = listOf(
                        TableColumn("Customer", 120.dp) { order ->
                            CellText("#${order.shortId ?: order.id.takeLast(4)} · ${order.customerName}", bold = true)
                        },
                        TableColumn("Items", 170.dp) { CellText(ProductCatalog.itemsSummary(it.items.take(2), moreSuffix = ""), muted = true) },
                        TableColumn("Total", 80.dp) { CellText(formatMoney(it.total)) },
                        TableColumn("Status", 100.dp) {
                            Badge(
                                it.status,
                                tone = when (it.status) {
                                    "completed" -> BadgeTone.Success
                                    "cancelled" -> BadgeTone.Danger
                                    else -> BadgeTone.Warning
                                },
                            )
                        },
                        TableColumn("When", 100.dp) { CellText(dates.date(it.orderDate)) },
                        TableColumn("Update", 230.dp) { order ->
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                nextOrderActions(order.status).forEach { next ->
                                    val busy = form.statusBusy == "${order.id}:$next"
                                    ArrowButton(
                                        when {
                                            busy -> "…"
                                            next == "completed" -> "complete"
                                            else -> "cancel"
                                        },
                                        onClick = { viewModel.onAction(order, next) },
                                        tone = ButtonTone.Ghost,
                                        size = ButtonSize.Sm,
                                        loading = busy,
                                    )
                                }
                            }
                        },
                    ),
                )
            }
        }
    }

    val cancel = form.cancel
    if (cancel != null) {
        ConfirmDialog(
            title = "Cancel this order?",
            description = "Cancel order for ${cancel.customerName.ifBlank { cancel.shortId ?: cancel.id }}. " +
                "You can still view it under cancelled orders.",
            confirmLabel = "Cancel order",
            cancelLabel = "Keep order",
            loading = form.statusBusy != null,
            onConfirm = viewModel::confirmCancel,
            onDismiss = viewModel::dismissCancel,
            overlay = { ToastHost(toast, viewModel::dismissToast) },
        )
    }
}
