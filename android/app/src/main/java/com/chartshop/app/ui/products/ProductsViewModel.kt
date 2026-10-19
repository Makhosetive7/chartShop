package com.chartshop.app.ui.products

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chartshop.app.data.api.ApiResult
import com.chartshop.app.data.model.Product
import com.chartshop.app.data.model.UpdateProductRequest
import com.chartshop.app.data.products.ProductRepository
import com.chartshop.app.data.products.StockOp
import com.chartshop.app.domain.NumberInput
import com.chartshop.app.domain.StockStatus
import com.chartshop.app.domain.activeVariants
import com.chartshop.app.domain.stockStatus
import com.chartshop.app.domain.summary
import com.chartshop.app.ui.components.Toast
import com.chartshop.app.ui.components.ToastTone
import com.chartshop.app.ui.withSlowHint
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class ProductTab { All, Low, Out }

enum class EditPanel { List, AddOption, AddPack }

data class StockBusy(val variantId: String, val op: StockOp)

/** The "Edit {name}" dialog. */
data class EditState(
    val productId: String,
    val name: String,
    val panel: EditPanel = EditPanel.List,
    val stockInputs: Map<String, String> = emptyMap(),
    val stockBusy: StockBusy? = null,
    val variantDraft: VariantDraft = VariantDraft(),
    val packDraft: PackDraft = PackDraft(),
    val saving: Boolean = false,
)

sealed interface ConfirmRequest {
    data class DeleteProduct(val productId: String, val name: String) : ConfirmRequest
    data class RemoveOption(val productId: String, val variantId: String, val label: String, val productName: String) : ConfirmRequest
    data class RemovePack(val productId: String, val variantId: String, val packId: String, val packLabel: String, val ownerLabel: String) : ConfirmRequest
}

data class ProductsUiState(
    /** `null` until the catalog has loaded once. */
    val products: List<Product>? = null,
    val refreshing: Boolean = false,
    val slow: Boolean = false,
    val loadError: String? = null,
    val tab: ProductTab = ProductTab.All,
    val query: String = "",
    val name: String = "",
    val lowStockThreshold: String = "",
    val options: List<OptionDraft> = listOf(OptionDraft()),
    val optionErrors: List<OptionErrors> = emptyList(),
    val creating: Boolean = false,
    val edit: EditState? = null,
    val confirm: ConfirmRequest? = null,
    val confirmBusy: Boolean = false,
    val toast: Toast? = null,
) {
    val summary get() = products.orEmpty().summary()

    val visible: List<Product>
        get() {
            val q = query.trim().lowercase()
            return products.orEmpty().filter { product ->
                if (q.isNotEmpty() && !product.name.lowercase().contains(q)) return@filter false
                when (tab) {
                    ProductTab.All -> true
                    ProductTab.Low -> product.stockStatus() == StockStatus.Low
                    ProductTab.Out -> product.stockStatus() == StockStatus.Out
                }
            }
        }

    val editing: Product? get() = edit?.let { e -> products?.firstOrNull { it.id == e.productId } }
}

/** Everything on the Products page, which mirrors the web page: add card, filtered table, edit dialog. */
class ProductsViewModel(
    private val repository: ProductRepository,
    private val shopLowStockAlert: Int?,
    private val canEdit: Boolean,
) : ViewModel() {

    private val defaultThreshold = (shopLowStockAlert ?: ProductForms.DEFAULT_LOW_STOCK_ALERT).toString()

    private var nameInFlight: String? = null

    private val _state = MutableStateFlow(ProductsUiState(lowStockThreshold = defaultThreshold))
    val state: StateFlow<ProductsUiState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            repository.products.collect { products ->
                _state.update { state ->
                    val stillThere = state.edit == null || products?.any { it.id == state.edit.productId } == true
                    state.copy(products = products, edit = if (stillThere) state.edit else null)
                }
            }
        }
        refresh()
    }

    fun refresh() {
        if (_state.value.refreshing) return
        _state.update { it.copy(refreshing = true, loadError = null) }
        viewModelScope.launch {
            val result = withSlowHint({ slow -> _state.update { it.copy(slow = slow) } }) {
                repository.refresh()
            }
            _state.update {
                it.copy(refreshing = false, loadError = (result as? ApiResult.Failure)?.error?.message)
            }
        }
    }

    fun dismissToast() = _state.update { it.copy(toast = null) }

    fun onTabChange(tab: ProductTab) = _state.update { it.copy(tab = tab) }

    fun onQueryChange(value: String) = _state.update { it.copy(query = value) }

    // Add product card

    fun onNameChange(value: String) = _state.update { it.copy(name = value) }

    fun onThresholdChange(value: String) = _state.update { it.copy(lowStockThreshold = NumberInput.sanitizeCount(value)) }

    /** Editing a field clears only that field's error, like the web form. */
    fun onOptionChange(index: Int, draft: OptionDraft) = _state.update { state ->
        val previous = state.options.getOrNull(index) ?: return@update state
        val clean = draft.copy(
            price = NumberInput.sanitizeMoney(draft.price),
            costPrice = NumberInput.sanitizeMoney(draft.costPrice),
            stock = NumberInput.sanitizeCount(draft.stock),
        )
        val errors = state.optionErrors.mapIndexed { i, e ->
            if (i != index) e
            else e.copy(
                label = e.label.takeIf { clean.label == previous.label },
                price = e.price.takeIf { clean.price == previous.price },
                stock = e.stock.takeIf { clean.stock == previous.stock },
            )
        }
        state.copy(options = state.options.toMutableList().also { it[index] = clean }, optionErrors = errors)
    }

    fun addOptionRow() = _state.update { it.copy(options = it.options + OptionDraft(), optionErrors = emptyList()) }

    fun removeOptionRow(index: Int) = _state.update { state ->
        state.copy(
            options = state.options.filterIndexed { i, _ -> i != index },
            optionErrors = state.optionErrors.filterIndexed { i, _ -> i != index },
        )
    }

    fun create() {
        val current = _state.value
        if (current.creating || blockedInDemo()) return
        when (val check = ProductForms.checkCreate(current.name, current.lowStockThreshold, shopLowStockAlert, current.options)) {
            is FormCheck.Invalid -> _state.update {
                it.copy(optionErrors = check.rowErrors ?: it.optionErrors, toast = error(check.message))
            }
            is FormCheck.Valid -> {
                _state.update { it.copy(creating = true, optionErrors = emptyList()) }
                viewModelScope.launch {
                    when (val result = repository.create(check.value)) {
                        is ApiResult.Success -> _state.update {
                            it.copy(
                                creating = false,
                                name = "",
                                lowStockThreshold = defaultThreshold,
                                options = listOf(OptionDraft()),
                                optionErrors = emptyList(),
                                toast = success("Product added."),
                            )
                        }
                        is ApiResult.Failure -> _state.update {
                            it.copy(creating = false, toast = error(result.error.message))
                        }
                    }
                }
            }
        }
    }

    // Table inline edits

    /** Returns false when there's nothing to save, so the box can go back to the saved value. */
    fun savePrice(product: Product, raw: String): Boolean =
        saveInline(product, ProductForms.priceUpdate(product, raw), "Updated price for ${product.name}")

    fun saveCost(product: Product, raw: String): Boolean =
        saveInline(product, ProductForms.costUpdate(product, raw), "Updated cost for ${product.name}")

    private fun saveInline(product: Product, request: UpdateProductRequest?, message: String): Boolean {
        if (request == null || blockedInDemo()) return false
        viewModelScope.launch {
            val result = repository.update(product.id, request)
            _state.update { it.copy(toast = result.toToast(message)) }
        }
        return true
    }

    // Edit dialog

    fun openEdit(product: Product) = _state.update {
        it.copy(
            edit = EditState(
                productId = product.id,
                name = product.name,
                packDraft = PackDraft(variantId = product.activeVariants.firstOrNull()?.id.orEmpty()),
            ),
        )
    }

    /** Closing saves a changed name too, since tapping Done doesn't take focus from the name box. */
    fun closeEdit() {
        saveName()
        _state.update { it.copy(edit = null) }
    }

    fun onEditNameChange(value: String) = updateEdit { it.copy(name = value) }

    fun saveName() {
        val edit = _state.value.edit ?: return
        val product = _state.value.editing ?: return
        val trimmed = edit.name.trim()
        if (trimmed == nameInFlight) return
        if (trimmed.isEmpty() || trimmed == product.name) {
            updateEdit { it.copy(name = product.name) }
            return
        }
        if (blockedInDemo()) {
            updateEdit { it.copy(name = product.name) }
            return
        }
        nameInFlight = trimmed
        viewModelScope.launch {
            val result = repository.update(product.id, UpdateProductRequest(name = trimmed))
            nameInFlight = null
            when (result) {
                is ApiResult.Success -> _state.update { it.copy(toast = success("Product name updated.")) }
                is ApiResult.Failure -> _state.update {
                    it.copy(
                        edit = it.edit?.copy(name = product.name),
                        toast = error(result.error.message),
                    )
                }
            }
        }
    }

    fun onStockInputChange(variantId: String, value: String) =
        updateEdit { it.copy(stockInputs = it.stockInputs + (variantId to NumberInput.sanitizeCount(value))) }

    fun adjustStock(variantId: String, op: StockOp) {
        val edit = _state.value.edit ?: return
        if (edit.stockBusy != null) return
        val quantity = when (val check = ProductForms.stockQuantity(edit.stockInputs[variantId].orEmpty())) {
            is FormCheck.Invalid -> return showToast(error(check.message))
            is FormCheck.Valid -> check.value
        }
        if (blockedInDemo()) return
        updateEdit { it.copy(stockBusy = StockBusy(variantId, op)) }
        viewModelScope.launch {
            val result = repository.adjustStock(edit.productId, variantId, op, quantity)
            val message = if (op == StockOp.Add) "Added $quantity to stock." else "Took out $quantity from stock."
            _state.update { state ->
                state.copy(
                    edit = state.edit?.let { e ->
                        e.copy(stockBusy = null, stockInputs = if (result is ApiResult.Success) e.stockInputs - variantId else e.stockInputs)
                    },
                    toast = result.toToast(message),
                )
            }
        }
    }

    fun showPanel(panel: EditPanel) = updateEdit { edit ->
        val firstVariant = _state.value.editing?.activeVariants?.firstOrNull()?.id.orEmpty()
        when (panel) {
            EditPanel.AddPack -> edit.copy(
                panel = panel,
                packDraft = edit.packDraft.copy(variantId = edit.packDraft.variantId.ifEmpty { firstVariant }),
            )
            EditPanel.List -> edit.copy(
                panel = panel,
                variantDraft = VariantDraft(),
                packDraft = edit.packDraft.copy(label = "", unitsPerPack = "24", price = ""),
            )
            EditPanel.AddOption -> edit.copy(panel = panel)
        }
    }

    fun onVariantDraftChange(draft: VariantDraft) = updateEdit {
        it.copy(variantDraft = draft.copy(price = NumberInput.sanitizeMoney(draft.price), stock = NumberInput.sanitizeCount(draft.stock)))
    }

    fun onPackDraftChange(draft: PackDraft) = updateEdit {
        it.copy(packDraft = draft.copy(unitsPerPack = NumberInput.sanitizeCount(draft.unitsPerPack), price = NumberInput.sanitizeMoney(draft.price)))
    }

    fun saveVariant() {
        val edit = _state.value.edit ?: return
        val product = _state.value.editing ?: return
        if (edit.saving || blockedInDemo()) return
        val request = when (val check = ProductForms.checkNewVariant(edit.variantDraft)) {
            is FormCheck.Invalid -> return showToast(error(check.message))
            is FormCheck.Valid -> check.value
        }
        updateEdit { it.copy(saving = true) }
        viewModelScope.launch {
            when (val result = repository.addVariant(product.id, request)) {
                is ApiResult.Success -> _state.update {
                    it.copy(
                        edit = it.edit?.copy(saving = false, panel = EditPanel.List, variantDraft = VariantDraft()),
                        toast = success("Added option to ${product.name}"),
                    )
                }
                is ApiResult.Failure -> _state.update {
                    it.copy(edit = it.edit?.copy(saving = false), toast = error(result.error.message))
                }
            }
        }
    }

    fun savePack() {
        val edit = _state.value.edit ?: return
        val product = _state.value.editing ?: return
        if (edit.saving || blockedInDemo()) return
        val request = when (val check = ProductForms.checkPack(edit.packDraft)) {
            is FormCheck.Invalid -> return showToast(error(check.message))
            is FormCheck.Valid -> check.value
        }
        updateEdit { it.copy(saving = true) }
        viewModelScope.launch {
            when (val result = repository.addPack(product.id, edit.packDraft.variantId, request)) {
                is ApiResult.Success -> _state.update {
                    it.copy(
                        edit = it.edit?.copy(saving = false, panel = EditPanel.List, packDraft = PackDraft()),
                        toast = success("Added pack to ${product.name}"),
                    )
                }
                is ApiResult.Failure -> _state.update {
                    it.copy(edit = it.edit?.copy(saving = false), toast = error(result.error.message))
                }
            }
        }
    }

    // Confirmations

    fun askDelete(product: Product) = _state.update {
        it.copy(confirm = ConfirmRequest.DeleteProduct(product.id, product.name))
    }

    fun askRemoveOption(product: Product, variantId: String, label: String) {
        if (blockedInDemo()) return
        _state.update {
            it.copy(confirm = ConfirmRequest.RemoveOption(product.id, variantId, label.trim().ifEmpty { "this option" }, product.name))
        }
    }

    fun askRemovePack(product: Product, variantId: String, variantLabel: String, packId: String, packLabel: String) {
        if (blockedInDemo()) return
        _state.update {
            it.copy(confirm = ConfirmRequest.RemovePack(product.id, variantId, packId, packLabel, variantLabel.trim().ifEmpty { product.name }))
        }
    }

    fun dismissConfirm() = _state.update { if (it.confirmBusy) it else it.copy(confirm = null) }

    fun confirm() {
        val request = _state.value.confirm ?: return
        if (_state.value.confirmBusy) return
        if (blockedInDemo()) {
            _state.update { it.copy(confirm = null) }
            return
        }
        _state.update { it.copy(confirmBusy = true) }
        viewModelScope.launch {
            val (result, message) = when (request) {
                is ConfirmRequest.DeleteProduct -> repository.delete(request.productId) to "Deleted ${request.name}"
                is ConfirmRequest.RemoveOption -> repository.deleteVariant(request.productId, request.variantId) to "Option removed."
                is ConfirmRequest.RemovePack -> repository.deletePack(request.productId, request.variantId, request.packId) to "Pack removed."
            }
            _state.update {
                it.copy(
                    confirmBusy = false,
                    confirm = if (result is ApiResult.Success) null else it.confirm,
                    toast = result.toToast(message),
                )
            }
        }
    }

    private fun blockedInDemo(): Boolean {
        if (canEdit) return false
        showToast(Toast("This is a demo shop, so changes aren't saved.", ToastTone.Info))
        return true
    }

    private fun showToast(toast: Toast) = _state.update { it.copy(toast = toast) }

    private fun updateEdit(transform: (EditState) -> EditState) =
        _state.update { state -> state.copy(edit = state.edit?.let(transform)) }

    private fun success(message: String) = Toast(message, ToastTone.Success)

    private fun error(message: String) = Toast(message, ToastTone.Error)

    private fun ApiResult<*>.toToast(successMessage: String) = when (this) {
        is ApiResult.Success -> success(successMessage)
        is ApiResult.Failure -> error(error.message)
    }
}
