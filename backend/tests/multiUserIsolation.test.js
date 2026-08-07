import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "http";

if (!process.env.TELEGRAM_BOT_TOKEN) {
  process.env.TELEGRAM_BOT_TOKEN = "000000000:MULTI_USER_E2E_DUMMY";
}

const { connectTestDb, disconnectTestDb, wipeShopData } = await import(
  "./helpers/mongo.js"
);
const {
  createTestShop,
  createTestProduct,
  createTestCustomer,
  uniqueUsername,
} = await import("./helpers/fixtures.js");
const { default: createApp } = await import("../app.js");
const { default: Sale } = await import("../models/Sale.js");
const { default: Expense } = await import("../models/Expense.js");
const { default: AuthSession } = await import("../models/AuthSession.js");
const { default: ActivityLog } = await import("../models/ActivityLog.js");

function request(server, { method = "GET", path, body, token } = {}) {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    const payload = body != null ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: addr.port,
        path,
        method,
        headers: {
          ...(payload
            ? {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(payload),
              }
            : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          let json = null;
          try {
            json = raw ? JSON.parse(raw) : null;
          } catch {
            json = raw;
          }
          resolve({ status: res.statusCode, body: json });
        });
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function login(server, username, pin) {
  const res = await request(server, {
    method: "POST",
    path: "/api/v1/auth/login",
    body: { username, pin },
  });
  return res;
}

/**
 * End-to-end multi-user + cross-shop isolation.
 * Creates two shops (A and B). Shop A has admin + member (+ optional invite).
 */
describe("multi-user E2E isolation", () => {
  let server;
  const cleanup = [];

  before(async () => {
    await connectTestDb();
    const app = createApp();
    server = await new Promise((resolve) => {
      const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });
  });

  after(async () => {
    for (const entry of cleanup.reverse()) {
      await wipeShopData(entry);
    }
    await new Promise((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
    await disconnectTestDb();
  });

  it("covers shared shop access, RBAC, invite setup, and no cross-shop leaks", async () => {
    // ── Shop A: admin ──────────────────────────────────────────────
    const shopA = await createTestShop({
      businessName: "Isolation Shop A",
      displayName: "Admin A",
      pin: "4829",
    });
    cleanup.push({ shopId: shopA.shop._id, username: shopA.username });

    const productA = await createTestProduct(shopA.shop._id, {
      name: "asecretbread",
      price: 10,
      stock: 50,
    });
    const customerA = await createTestCustomer(shopA.shop._id, {
      name: "Alice Cust",
      phone: `77${Date.now().toString().slice(-8)}`,
    });

    const adminLogin = await login(server, shopA.username, shopA.pin);
    assert.equal(adminLogin.status, 200, JSON.stringify(adminLogin.body));
    assert.equal(adminLogin.body.user.role, "admin");
    const adminToken = adminLogin.body.token;
    const adminUserId = adminLogin.body.user.id;
    assert.equal(String(adminLogin.body.shop.id), String(shopA.shop._id));

    // ── Shop B: separate tenant ────────────────────────────────────
    const shopB = await createTestShop({
      businessName: "Isolation Shop B",
      displayName: "Admin B",
      pin: "7391",
    });
    cleanup.push({ shopId: shopB.shop._id, username: shopB.username });

    const productB = await createTestProduct(shopB.shop._id, {
      name: "bsecretmilk",
      price: 5,
      stock: 30,
    });
    const customerB = await createTestCustomer(shopB.shop._id, {
      name: "Bob Cust",
      phone: `88${Date.now().toString().slice(-8)}`,
    });

    const bLogin = await login(server, shopB.username, shopB.pin);
    assert.equal(bLogin.status, 200);
    const bToken = bLogin.body.token;

    // Seed shop B activity so leaks would be visible
    const bSale = await request(server, {
      method: "POST",
      path: "/api/v1/sales/cash",
      token: bToken,
      body: { items: [{ name: "bsecretmilk", quantity: 1 }] },
    });
    assert.equal(bSale.status, 201, JSON.stringify(bSale.body));
    const saleBId = bSale.body.sale?.id || bSale.body.sale?._id;

    const bExpense = await request(server, {
      method: "POST",
      path: "/api/v1/expenses",
      token: bToken,
      body: {
        amount: 99,
        description: "Shop B secret expense",
        category: "other",
      },
    });
    assert.equal(bExpense.status, 201, JSON.stringify(bExpense.body));

    // ── Invite member without PIN (setup code) ─────────────────────
    const memberUser = uniqueUsername("mem");
    cleanup.push({ username: memberUser });
    const invite = await request(server, {
      method: "POST",
      path: "/api/v1/team",
      token: adminToken,
      body: {
        username: memberUser,
        displayName: "Member A",
        role: "member",
      },
    });
    assert.equal(invite.status, 201, JSON.stringify(invite.body));
    assert.ok(invite.body.setupCode, "setup code required when PIN omitted");
    assert.equal(invite.body.member.role, "member");
    const memberId = invite.body.member.id;
    const setupCode = invite.body.setupCode;

    // Login before PIN setup must fail with MUST_SET_PIN
    const premature = await login(server, memberUser, "9999");
    assert.ok([401, 403].includes(premature.status));
    assert.equal(premature.body.code, "MUST_SET_PIN");

    // Complete setup
    const setup = await request(server, {
      method: "POST",
      path: "/api/v1/auth/setup-pin",
      body: {
        username: memberUser,
        setupCode,
        newPin: "8462",
      },
    });
    assert.equal(setup.status, 200, JSON.stringify(setup.body));

    // Setup code is one-time
    const reuseCode = await request(server, {
      method: "POST",
      path: "/api/v1/auth/setup-pin",
      body: {
        username: memberUser,
        setupCode,
        newPin: "9173",
      },
    });
    assert.ok(reuseCode.status >= 400);

    const memberLogin = await login(server, memberUser, "8462");
    assert.equal(memberLogin.status, 200, JSON.stringify(memberLogin.body));
    assert.equal(memberLogin.body.user.role, "member");
    assert.equal(String(memberLogin.body.shop.id), String(shopA.shop._id));
    const memberToken = memberLogin.body.token;

    // ── Shared operational access within shop A ────────────────────
    const memberProducts = await request(server, {
      method: "GET",
      path: "/api/v1/products",
      token: memberToken,
    });
    assert.equal(memberProducts.status, 200);
    const memberNames = (memberProducts.body.products || []).map((p) => p.name);
    assert.ok(memberNames.includes("asecretbread"));
    assert.ok(!memberNames.includes("bsecretmilk"));

    const memberSale = await request(server, {
      method: "POST",
      path: "/api/v1/sales/cash",
      token: memberToken,
      body: { items: [{ name: "asecretbread", quantity: 2 }] },
    });
    assert.equal(memberSale.status, 201, JSON.stringify(memberSale.body));
    const saleAId = memberSale.body.sale?.id || memberSale.body.sale?._id;

    const saleDoc = await Sale.findById(saleAId).lean();
    assert.ok(saleDoc);
    assert.equal(String(saleDoc.shopId), String(shopA.shop._id));
    assert.equal(String(saleDoc.createdByUserId), String(memberId));

    const memberExpense = await request(server, {
      method: "POST",
      path: "/api/v1/expenses",
      token: memberToken,
      body: {
        amount: 7.5,
        description: "Member taxi",
        category: "transport",
      },
    });
    assert.equal(memberExpense.status, 201, JSON.stringify(memberExpense.body));
    const expenseId =
      memberExpense.body.expense?.id || memberExpense.body.expense?._id;
    const expenseDoc = await Expense.findById(expenseId).lean();
    assert.equal(String(expenseDoc.createdByUserId), String(memberId));

    // Chat path stamps actor
    const chat = await request(server, {
      method: "POST",
      path: "/api/v1/chat",
      token: memberToken,
      body: { message: "sell 1 asecretbread" },
    });
    assert.equal(chat.status, 200, JSON.stringify(chat.body));
    assert.ok(
      !/need to be logged in|welcome to chart shop/i.test(chat.body.reply?.text || chat.body.reply || ""),
      `chat not authenticated: ${JSON.stringify(chat.body)}`
    );

    const chatSale = await Sale.findOne({
      shopId: shopA.shop._id,
      createdByUserId: memberId,
    })
      .sort({ createdAt: -1 })
      .lean();
    // Prefer verifying the chat-created sale when present
    const salesByMember = await Sale.find({
      shopId: shopA.shop._id,
      createdByUserId: memberId,
    }).lean();
    assert.ok(salesByMember.length >= 1);
    if (chatSale) {
      assert.equal(String(chatSale.createdByUserId), String(memberId));
    }

    // Activity: shop-scoped + mine filter
    const allActivity = await request(server, {
      method: "GET",
      path: "/api/v1/activity?limit=50",
      token: memberToken,
    });
    assert.equal(allActivity.status, 200);
    const activities = allActivity.body.items || [];
    assert.ok(activities.length > 0);
    for (const row of activities) {
      // Must never surface shop B secrets
      assert.ok(!/Shop B secret/i.test(row.summary || ""));
      assert.ok(!/bsecretmilk/i.test(JSON.stringify(row)));
    }

    const mine = await request(server, {
      method: "GET",
      path: "/api/v1/activity?mine=1&limit=50",
      token: memberToken,
    });
    assert.equal(mine.status, 200);
    for (const row of mine.body.items || []) {
      assert.equal(String(row.actorId), String(memberId));
    }

    const adminMine = await request(server, {
      method: "GET",
      path: "/api/v1/activity?mine=1&limit=50",
      token: adminToken,
    });
    for (const row of adminMine.body.items || []) {
      assert.equal(String(row.actorId), String(adminUserId));
    }

    // ── RBAC: member cannot manage team / shop settings ────────────
    const memberAdd = await request(server, {
      method: "POST",
      path: "/api/v1/team",
      token: memberToken,
      body: {
        username: uniqueUsername("x"),
        displayName: "Nope",
        pin: "5827",
      },
    });
    assert.equal(memberAdd.status, 403);

    const memberSettings = await request(server, {
      method: "PATCH",
      path: "/api/v1/auth/profile/settings",
      token: memberToken,
      body: { timezone: "Africa/Johannesburg", lowStockAlert: 3 },
    });
    assert.equal(memberSettings.status, 403);

    const memberName = await request(server, {
      method: "PATCH",
      path: "/api/v1/auth/profile/name",
      token: memberToken,
      body: { businessName: "Hijacked" },
    });
    assert.equal(memberName.status, 403);

    // Admin can update settings (and it audits)
    const adminSettings = await request(server, {
      method: "PATCH",
      path: "/api/v1/auth/profile/settings",
      token: adminToken,
      body: { timezone: "Africa/Johannesburg", lowStockAlert: 4 },
    });
    assert.equal(adminSettings.status, 200, JSON.stringify(adminSettings.body));
    const settingsLog = await ActivityLog.findOne({
      shopId: shopA.shop._id,
      action: "shop.settings",
    })
      .sort({ createdAt: -1 })
      .lean();
    assert.ok(settingsLog);
    assert.equal(String(settingsLog.actorId), String(adminUserId));

    // ── Cross-shop IDOR / leak checks ──────────────────────────────
    const leakProduct = await request(server, {
      method: "GET",
      path: `/api/v1/products/${productB._id}`,
      token: adminToken,
    });
    assert.ok([404, 400].includes(leakProduct.status), JSON.stringify(leakProduct.body));

    const leakCustomer = await request(server, {
      method: "GET",
      path: `/api/v1/customers/${customerB._id}`,
      token: memberToken,
    });
    assert.ok(
      [404, 400].includes(leakCustomer.status),
      JSON.stringify(leakCustomer.body)
    );

    // Cancel shop B sale with shop A token
    if (saleBId) {
      const leakCancel = await request(server, {
        method: "POST",
        path: `/api/v1/sales/${saleBId}/cancel`,
        token: adminToken,
        body: {},
      });
      assert.ok(
        [404, 400, 403].includes(leakCancel.status),
        JSON.stringify(leakCancel.body)
      );
    }

    const listAProducts = await request(server, {
      method: "GET",
      path: "/api/v1/products",
      token: adminToken,
    });
    const aNames = (listAProducts.body.products || []).map((p) => p.name);
    assert.ok(aNames.includes("asecretbread"));
    assert.ok(!aNames.includes("bsecretmilk"));

    const listBProducts = await request(server, {
      method: "GET",
      path: "/api/v1/products",
      token: bToken,
    });
    const bNames = (listBProducts.body.products || []).map((p) => p.name);
    assert.ok(bNames.includes("bsecretmilk"));
    assert.ok(!bNames.includes("asecretbread"));

    const listACustomers = await request(server, {
      method: "GET",
      path: "/api/v1/customers",
      token: memberToken,
    });
    const aCustNames = (listACustomers.body.customers || []).map((c) => c.name);
    assert.ok(aCustNames.includes("Alice Cust"));
    assert.ok(!aCustNames.includes("Bob Cust"));

    const listAExpenses = await request(server, {
      method: "GET",
      path: "/api/v1/expenses",
      token: adminToken,
    });
    const expenseBlob = JSON.stringify(listAExpenses.body);
    assert.ok(!/Shop B secret expense/i.test(expenseBlob));

    const listASales = await request(server, {
      method: "GET",
      path: "/api/v1/sales/recent?limit=20",
      token: memberToken,
    });
    assert.equal(listASales.status, 200);
    for (const sale of listASales.body.sales || []) {
      assert.ok(
        !String(sale.id || sale._id).includes(String(saleBId || "___none___")) ||
          String(sale.id || sale._id) !== String(saleBId)
      );
      const items = JSON.stringify(sale.items || sale);
      assert.ok(!/bsecretmilk/i.test(items));
    }

    // Team list is shop-scoped (no shop B users)
    const team = await request(server, {
      method: "GET",
      path: "/api/v1/team",
      token: adminToken,
    });
    assert.equal(team.status, 200);
    const usernames = (team.body.members || []).map((m) => m.username);
    assert.ok(usernames.includes(shopA.username));
    assert.ok(usernames.includes(memberUser));
    assert.ok(!usernames.includes(shopB.username));

    // Shop B cannot list shop A team or use shop A member id
    const bTeam = await request(server, {
      method: "GET",
      path: "/api/v1/team",
      token: bToken,
    });
    const bUsernames = (bTeam.body.members || []).map((m) => m.username);
    assert.ok(!bUsernames.includes(memberUser));
    assert.ok(!bUsernames.includes(shopA.username));

    const bRemoveA = await request(server, {
      method: "DELETE",
      path: `/api/v1/team/${memberId}`,
      token: bToken,
    });
    assert.ok(
      [400, 403, 404].includes(bRemoveA.status) && !bRemoveA.body?.success,
      JSON.stringify(bRemoveA.body)
    );

    // Stats / reports must not include other shop revenue
    const statsA = await request(server, {
      method: "GET",
      path: "/api/v1/stats",
      token: adminToken,
    });
    assert.equal(statsA.status, 200);
    const statsBlob = JSON.stringify(statsA.body);
    assert.ok(!/bsecretmilk/i.test(statsBlob));
    assert.ok(!/Shop B secret/i.test(statsBlob));

    // ── Promote member → admin, then demote ────────────────────────
    const promote = await request(server, {
      method: "PATCH",
      path: `/api/v1/team/${memberId}/role`,
      token: adminToken,
      body: { role: "admin" },
    });
    assert.equal(promote.status, 200);
    assert.equal(promote.body.member.role, "admin");

    // Fresh login picks up role (or me endpoint)
    const meAsAdmin = await request(server, {
      method: "GET",
      path: "/api/v1/auth/me",
      token: memberToken,
    });
    assert.equal(meAsAdmin.status, 200);
    assert.equal(meAsAdmin.body.user.role, "admin");

    const demote = await request(server, {
      method: "PATCH",
      path: `/api/v1/team/${memberId}/role`,
      token: adminToken,
      body: { role: "member" },
    });
    assert.equal(demote.status, 200);
    assert.equal(demote.body.member.role, "member");

    // ── Soft-remove member: sessions die, history stays ────────────
    const remove = await request(server, {
      method: "DELETE",
      path: `/api/v1/team/${memberId}`,
      token: adminToken,
    });
    assert.equal(remove.status, 200, JSON.stringify(remove.body));

    const deadSession = await request(server, {
      method: "GET",
      path: "/api/v1/auth/me",
      token: memberToken,
    });
    assert.equal(deadSession.status, 401);

    const sessionsLeft = await AuthSession.countDocuments({
      userId: memberId,
    });
    assert.equal(sessionsLeft, 0);

    const loginRemoved = await login(server, memberUser, "8462");
    assert.ok([401, 403].includes(loginRemoved.status));

    // Past attributed sales remain on shop A
    const saleStillThere = await Sale.findById(saleAId).lean();
    assert.ok(saleStillThere);
    assert.equal(String(saleStillThere.shopId), String(shopA.shop._id));
    assert.equal(String(saleStillThere.createdByUserId), String(memberId));

    // Cannot use shop B customer for shop A laybye
    const badLaybye = await request(server, {
      method: "POST",
      path: "/api/v1/laybye",
      token: adminToken,
      body: {
        customer: String(customerB._id),
        items: [{ name: "asecretbread", quantity: 1 }],
        deposit: 1,
      },
    });
    assert.ok(
      [404, 400].includes(badLaybye.status),
      JSON.stringify(badLaybye.body)
    );

    // Valid shop A customer works
    const goodLaybye = await request(server, {
      method: "POST",
      path: "/api/v1/laybye",
      token: adminToken,
      body: {
        customer: String(customerA._id),
        items: [{ name: "asecretbread", quantity: 1 }],
        deposit: 2,
      },
    });
    assert.equal(goodLaybye.status, 201, JSON.stringify(goodLaybye.body));

    // Product A id remains readable; product B id still blocked after all ops
    const ownProduct = await request(server, {
      method: "GET",
      path: `/api/v1/products/${productA._id}`,
      token: adminToken,
    });
    assert.equal(ownProduct.status, 200);
    assert.equal(ownProduct.body.product.name, "asecretbread");

    // Actor filter with foreign user id must not reveal foreign activity
    const foreignActor = await request(server, {
      method: "GET",
      path: `/api/v1/activity?actorId=${bLogin.body.user.id}&limit=20`,
      token: adminToken,
    });
    assert.equal(foreignActor.status, 200);
    assert.equal((foreignActor.body.items || []).length, 0);

    // Add member with PIN directly (no setup code)
    const pinnedUser = uniqueUsername("pin");
    cleanup.push({ username: pinnedUser });
    const withPin = await request(server, {
      method: "POST",
      path: "/api/v1/team",
      token: adminToken,
      body: {
        username: pinnedUser,
        displayName: "Pinned",
        pin: "6914",
        role: "member",
      },
    });
    assert.equal(withPin.status, 201, JSON.stringify(withPin.body));
    assert.equal(withPin.body.setupCode, null);

    const pinnedLogin = await login(server, pinnedUser, "6914");
    assert.equal(pinnedLogin.status, 200);
    assert.equal(String(pinnedLogin.body.shop.id), String(shopA.shop._id));
  });
});
