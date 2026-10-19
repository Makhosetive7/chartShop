package com.chartshop.app.ui.books

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
import com.chartshop.app.ui.components.Badge
import com.chartshop.app.ui.components.BadgeTone
import com.chartshop.app.ui.components.Card
import com.chartshop.app.ui.components.CardTitle
import com.chartshop.app.ui.components.CellText
import com.chartshop.app.ui.components.DataTable
import com.chartshop.app.ui.components.Field
import com.chartshop.app.ui.components.FieldRow
import com.chartshop.app.ui.components.PageLead
import com.chartshop.app.ui.components.ScreenPage
import com.chartshop.app.ui.components.SlowServerHint
import com.chartshop.app.ui.components.TableColumn
import com.chartshop.app.ui.components.TableSkeleton
import com.chartshop.app.ui.components.Tabs
import com.chartshop.app.ui.components.TextInput
import com.chartshop.app.ui.theme.ChartShopColors

@Composable
fun CustomersScreen(viewModel: CustomersViewModel) {
    val form by viewModel.form.collectAsStateWithLifecycle()
    val list by viewModel.list.collectAsStateWithLifecycle()
    val toast by viewModel.toast.collectAsStateWithLifecycle()
    val dates = viewModel.dates

    ScreenPage(
        toast = toast,
        onDismissToast = viewModel::dismissToast,
        refreshing = list.loading && list.data != null,
        onRefresh = viewModel::refresh,
    ) {
        PageLead("Customer profiles and balances for this shop.")

        Card {
            CardTitle("Add customer")
            Spacer(Modifier.height(16.dp))
            FieldRow {
                Field("Name", Modifier.weight(1f)) {
                    TextInput(form.name, viewModel::onNameChange, Modifier.fillMaxWidth(), placeholder = "Customer name")
                }
                Field("Phone", Modifier.weight(1f)) {
                    TextInput(form.phone, viewModel::onPhoneChange, Modifier.fillMaxWidth(), placeholder = "Phone number")
                }
            }
            Spacer(Modifier.height(16.dp))
            Field("Email", Modifier.fillMaxWidth()) {
                TextInput(
                    form.email,
                    viewModel::onEmailChange,
                    Modifier.fillMaxWidth(),
                    placeholder = "Email address",
                    imeAction = ImeAction.Done,
                    onDone = viewModel::add,
                )
            }
            Spacer(Modifier.height(20.dp))
            ArrowButton(if (form.adding) "Adding…" else "Add", onClick = viewModel::add, loading = form.adding)
        }

        Tabs(
            labels = CustomerFilter.entries.map { it.label },
            selectedIndex = form.filter.ordinal,
            onSelect = { viewModel.onFilterChange(CustomerFilter.entries[it]) },
        )

        Card {
            val customers = list.data
            when {
                customers == null && list.error != null -> Text(list.error.orEmpty(), color = ChartShopColors.Danger, fontSize = 14.sp)
                customers == null -> {
                    TableSkeleton(listOf(110.dp, 80.dp, 90.dp, 60.dp))
                    SlowServerHint(list.slow, Modifier.padding(top = 12.dp))
                }
                customers.isEmpty() -> Text("No customers.", color = ChartShopColors.TextPrimary, fontSize = 15.sp)
                else -> DataTable(
                    rows = customers,
                    key = { it.id },
                    columns = listOf(
                        TableColumn("Name", 120.dp) { CellText(it.name, bold = true) },
                        TableColumn("Phone", 120.dp) { CellText(it.phone) },
                        TableColumn("Email", 160.dp) { CellText(it.email.ifBlank { "—" }, maxLines = 1) },
                        TableColumn("Spent", 90.dp) { CellText(formatMoney(it.totalSpent)) },
                        TableColumn("Balance", 100.dp) {
                            if (it.currentBalance > 0) {
                                Badge(formatMoney(it.currentBalance), tone = BadgeTone.Warning)
                            } else {
                                CellText(formatMoney(0.0))
                            }
                        },
                        TableColumn("Visits", 64.dp) { CellText(it.totalVisits.toString()) },
                        TableColumn("Last purchase", 120.dp) {
                            CellText(if (it.lastPurchaseDate != null) dates.date(it.lastPurchaseDate) else "—")
                        },
                    ),
                )
            }
        }
    }
}
