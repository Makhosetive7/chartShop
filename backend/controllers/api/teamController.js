import AuthService from "../../services/AuthService.js";
import ActivityService from "../../services/ActivityService.js";
import { stripMarkdown } from "../../utils/apiResponse.js";

export async function listMembers(req, res) {
  try {
    const members = await AuthService.listTeamMembers(req.shopId);
    return res.json({
      success: true,
      members,
    });
  } catch (error) {
    console.error("[api/team]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to list team members.",
    });
  }
}

export async function addMember(req, res) {
  try {
    const username = String(req.body?.username || "").trim();
    const pin = String(req.body?.pin || "").trim();
    const displayName = String(
      req.body?.displayName || req.body?.name || username
    ).trim();
    const role = String(req.body?.role || "member").trim().toLowerCase();

    if (!username) {
      return res.status(400).json({
        success: false,
        error: "username is required.",
      });
    }

    const result = await AuthService.addTeamMember({
      shopId: req.shopId,
      username,
      pin: pin || null,
      displayName,
      role: role === "admin" ? "admin" : "member",
    });

    if (!result.success) {
      const status = /taken|already/i.test(result.message) ? 409 : 400;
      return res.status(status).json({
        success: false,
        error: stripMarkdown(result.message),
        ...(result.suggestions?.length
          ? { suggestions: result.suggestions }
          : {}),
      });
    }

    await ActivityService.log({
      shopId: req.shopId,
      userId: req.userId,
      channel: req.channel || "web",
      action: "team.member.added",
      summary: result.message,
      entityType: "user",
      entityId: result.user?.id,
    });

    return res.status(201).json({
      success: true,
      member: result.user,
      setupCode: result.setupCode || null,
      message: stripMarkdown(result.message),
    });
  } catch (error) {
    console.error("[api/team/add]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to add team member.",
    });
  }
}

export async function removeMember(req, res) {
  try {
    const userId = String(req.params.userId || "").trim();
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "userId is required.",
      });
    }

    const result = await AuthService.deactivateTeamMember({
      shopId: req.shopId,
      userId,
      actingUserId: req.userId,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: stripMarkdown(result.message),
      });
    }

    await ActivityService.log({
      shopId: req.shopId,
      userId: req.userId,
      channel: req.channel || "web",
      action: "team.member.removed",
      summary: result.message,
      entityType: "user",
      entityId: userId,
    });

    return res.json({
      success: true,
      message: stripMarkdown(result.message),
    });
  } catch (error) {
    console.error("[api/team/remove]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to remove team member.",
    });
  }
}

export async function updateMemberRole(req, res) {
  try {
    const userId = String(req.params.userId || "").trim();
    const role = String(req.body?.role || "").trim().toLowerCase();
    if (!userId || !["admin", "member"].includes(role)) {
      return res.status(400).json({
        success: false,
        error: "userId and role (admin|member) are required.",
      });
    }

    const result = await AuthService.setTeamMemberRole({
      shopId: req.shopId,
      userId,
      role,
      actingUserId: req.userId,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: stripMarkdown(result.message),
      });
    }

    await ActivityService.log({
      shopId: req.shopId,
      userId: req.userId,
      channel: req.channel || "web",
      action: "team.member.role",
      summary: result.message,
      entityType: "user",
      entityId: userId,
      metadata: { role },
    });

    return res.json({
      success: true,
      member: result.user,
      message: stripMarkdown(result.message),
    });
  } catch (error) {
    console.error("[api/team/role]", error);
    return res.status(500).json({
      success: false,
      error: "Failed to update role.",
    });
  }
}

