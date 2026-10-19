package com.chartshop.app.ui.settings

import com.chartshop.app.data.model.NewMemberRequest
import com.chartshop.app.data.model.RoleUpdate
import com.chartshop.app.data.model.TeamResponse
import com.chartshop.app.data.model.User
import com.chartshop.app.data.shop.ShopRepository
import com.chartshop.app.domain.NumberInput
import com.chartshop.app.domain.PinRules
import com.chartshop.app.domain.UsernameRules
import com.chartshop.app.ui.Remote
import com.chartshop.app.ui.ScreenViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

enum class InviteMode { Setup, Pin }

data class SetupInvite(val username: String, val setupCode: String)

data class TeamForm(
    val inviteMode: InviteMode = InviteMode.Setup,
    val displayName: String = "",
    val username: String = "",
    val pin: String = "",
    val adding: Boolean = false,
    /** Member id whose role or setup code is being changed. */
    val busyMemberId: String? = null,
    val removeTarget: User? = null,
    val removing: Boolean = false,
    val invite: SetupInvite? = null,
)

/** You first, then people waiting to set a PIN, then by name. */
fun sortMembers(members: List<User>, selfId: String?): List<User> =
    members.sortedWith(
        compareBy<User>({ if (it.id == selfId) 0 else 1 }, { if (it.mustSetPin) 0 else 1 })
            .thenBy(String.CASE_INSENSITIVE_ORDER) { it.displayName.ifBlank { it.username } },
    )

class TeamViewModel(
    repository: ShopRepository,
    val selfId: String?,
    val isAdmin: Boolean,
    canEdit: Boolean,
) : ScreenViewModel(repository, canEdit) {

    private val _team = MutableStateFlow(Remote<TeamResponse>())
    val team: StateFlow<Remote<TeamResponse>> = _team.asStateFlow()

    private val _form = MutableStateFlow(TeamForm())
    val form: StateFlow<TeamForm> = _form.asStateFlow()

    init {
        if (canEdit) refresh()
    }

    fun refresh() {
        if (canEdit) load(_team) { owner { team() } }
    }

    fun onMode(mode: InviteMode) = _form.update { it.copy(inviteMode = mode) }
    fun onDisplayName(value: String) = _form.update { it.copy(displayName = value) }
    fun onUsername(value: String) = _form.update { it.copy(username = UsernameRules.sanitizeInput(value)) }
    fun onPin(value: String) = _form.update { it.copy(pin = NumberInput.sanitizeCount(value).take(PinRules.LENGTH)) }

    fun add() {
        val form = _form.value
        val validation = UsernameRules.validate(form.username)
        if (validation is UsernameRules.Validation.Invalid) return fail(validation.message)
        if (form.displayName.isBlank()) return fail("Display name is required.")
        val pin = if (form.inviteMode == InviteMode.Pin) form.pin.trim() else null
        if (pin != null && !PinRules.isValid(pin)) return fail("PIN must be exactly 4 digits.")
        write(
            busy = { busy -> _form.update { it.copy(adding = busy) } },
            block = {
                ownerWrite {
                    addMember(NewMemberRequest(validation.normalized, form.displayName.trim(), User.ROLE_MEMBER, pin))
                }
            },
        ) { result ->
            _form.update { TeamForm(invite = result.setupCode?.let { SetupInvite(validation.normalized, it) }) }
            success(if (result.setupCode != null) "Invite created — share the setup code now." else "Team member added.")
            refresh()
        }
    }

    fun toggleRole(member: User) {
        val role = if (member.isAdmin) User.ROLE_MEMBER else User.ROLE_ADMIN
        write(
            busy = { busy -> _form.update { it.copy(busyMemberId = if (busy) member.id else null) } },
            block = { ownerWrite { updateRole(member.id, RoleUpdate(role)) } },
        ) { result ->
            success(if ((result.member?.role ?: role) == User.ROLE_ADMIN) "Promoted to admin." else "Set to member.")
            refresh()
        }
    }

    fun newSetupCode(member: User) {
        write(
            busy = { busy -> _form.update { it.copy(busyMemberId = if (busy) member.id else null) } },
            block = { ownerWrite { newSetupCode(member.id) } },
        ) { result ->
            val code = result.setupCode ?: return@write fail("Could not regenerate setup code")
            _form.update { it.copy(invite = SetupInvite(result.member?.username ?: member.username, code)) }
            success("New setup code ready — share it now.")
            refresh()
        }
    }

    fun askRemove(member: User) = _form.update { it.copy(removeTarget = member) }

    fun dismissRemove() {
        if (!_form.value.removing) _form.update { it.copy(removeTarget = null) }
    }

    fun remove() {
        val target = _form.value.removeTarget ?: return
        write(
            busy = { busy -> _form.update { it.copy(removing = busy) } },
            block = { ownerWrite { removeMember(target.id) } },
        ) {
            _form.update { it.copy(removeTarget = null) }
            success("Member removed.")
            refresh()
        }
    }

    fun dismissInvite() = _form.update { it.copy(invite = null) }
}
