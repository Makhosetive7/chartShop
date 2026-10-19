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
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chartshop.app.domain.formatMoney
import com.chartshop.app.ui.components.ArrowButton
import com.chartshop.app.ui.components.ButtonRow
import com.chartshop.app.ui.components.ButtonSize
import com.chartshop.app.ui.components.ButtonTone
import com.chartshop.app.ui.components.Card
import com.chartshop.app.ui.components.CardTitle
import com.chartshop.app.ui.components.CellText
import com.chartshop.app.ui.components.DataTable
import com.chartshop.app.ui.components.Field
import com.chartshop.app.ui.components.FieldRow
import com.chartshop.app.ui.components.InputKind
import com.chartshop.app.ui.components.PageLead
import com.chartshop.app.ui.components.ProductLineFields
import com.chartshop.app.ui.components.ScreenPage
import com.chartshop.app.ui.components.SlowServerHint
import com.chartshop.app.ui.components.SuggestInput
import com.chartshop.app.ui.components.TableColumn
import com.chartshop.app.ui.components.TableSkeleton
import com.chartshop.app.ui.components.TextInput
import com.chartshop.app.ui.theme.ChartShopColors

@Composable
fun LaybyesScreen(viewModel: LaybyesViewModel) {
    val form by viewModel.form.collectAsStateWithLifecycle()
    val active by viewModel.active.collectAsStateWithLifecycle()
    val catalog by viewModel.catalog.collectAsStateWithLifecycle()
    val customers by viewModel.customerNames.collectAsStateWithLifecycle()
    val toast by viewModel.toast.collectAsStateWithLifecycle()
    val dates = viewModel.dates

    ScreenPage(
        toast = toast,
        onDismissToast = viewModel::dismissToast,
        refreshing = active.loading && active.data != null,
        onRefresh = viewModel::refresh,
    ) {
        PageLead(
            "Create agreements, take deposits and installments, and complete when paid in full. " +
                "Pick option/pack when a product has them.",
        )

        Card {
            CardTitle("New laybye")
            Spacer(Modifier.height(16.dp))
            FieldRow {
                Field("Customer (name / phone)", Modifier.weight(1.4f)) {
                    SuggestInput(form.customer, viewModel::onCustomerChange, customers, Modifier.fillMaxWidth(), placeholder = "Name or phone")
                }
                Field("Deposit", Modifier.weight(1f)) {
                    TextInput(form.deposit, viewModel::onDepositChange, Modifier.fillMaxWidth(), placeholder = "Deposit amount", kind = InputKind.Money)
                }
            }
            form.lines.forEachIndexed { index, line ->
                Spacer(Modifier.height(20.dp))
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
                ArrowButton(if (form.creating) "Creating…" else "Create laybye", onClick = viewModel::create, loading = form.creating)
            }
        }

        Card {
            CardTitle("Active laybyes")
            Spacer(Modifier.height(12.dp))
            val laybyes = active.data
            when {
                laybyes == null && active.error != null -> Text(active.error.orEmpty(), color = ChartShopColors.Danger, fontSize = 14.sp)
                laybyes == null -> {
                    TableSkeleton(listOf(110.dp, 70.dp, 70.dp, 80.dp), rows = 4)
                    SlowServerHint(active.slow, Modifier.padding(top = 12.dp))
                }
                laybyes.isEmpty() -> Text("No active laybyes.", color = ChartShopColors.TextPrimary, fontSize = 15.sp)
                else -> DataTable(
                    rows = laybyes,
                    key = { it.id },
                    columns = listOf(
                        TableColumn("Customer", 120.dp) { CellText(it.customerName, bold = true) },
                        TableColumn("Paid", 140.dp) { CellText("${formatMoney(it.amountPaid)} / ${formatMoney(it.totalAmount)}") },
                        TableColumn("Balance", 90.dp) { CellText(formatMoney(it.balanceDue)) },
                        TableColumn("Due", 110.dp) { CellText(if (it.dueDate != null) dates.date(it.dueDate) else "—") },
                        TableColumn("", 220.dp) { laybye ->
                            val canComplete = laybye.balanceDue <= 0
                            val completing = form.completingId == laybye.id
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                if (!canComplete) {
                                    ArrowButton("Pay", onClick = { viewModel.prefillPayment(laybye) }, tone = ButtonTone.Ghost, size = ButtonSize.Sm)
                                }
                                ArrowButton(
                                    if (completing) "…" else "Complete",
                                    onClick = { viewModel.complete(laybye) },
                                    size = ButtonSize.Sm,
                                    enabled = canComplete,
                                    loading = completing,
                                )
                            }
                        },
                    ),
                )
            }
        }

        Card {
            CardTitle("Record payment")
            Spacer(Modifier.height(16.dp))
            FieldRow {
                Field("Customer", Modifier.weight(1.4f)) {
                    SuggestInput(
                        form.payCustomer,
                        viewModel::onPayCustomerChange,
                        active.data.orEmpty().map { it.customerName },
                        Modifier.fillMaxWidth(),
                        placeholder = "Customer name",
                    )
                }
                Field("Amount", Modifier.weight(1f)) {
                    TextInput(
                        form.payAmount,
                        viewModel::onPayAmountChange,
                        Modifier.fillMaxWidth(),
                        placeholder = "Payment amount",
                        kind = InputKind.Money,
                        imeAction = ImeAction.Done,
                        onDone = viewModel::pay,
                    )
                }
            }
            Spacer(Modifier.height(20.dp))
            ArrowButton(if (form.paying) "Paying…" else "Pay laybye", onClick = viewModel::pay, loading = form.paying)
        }
    }
}
