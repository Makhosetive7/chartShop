import { describe, it, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import http from "http";

if (!process.env.TELEGRAM_BOT_TOKEN) {
  process.env.TELEGRAM_BOT_TOKEN = "000000000:API_ACTIVITY_TEST_DUMMY";
}

const { connectTestDb, disconnectTestDb, wipeShopData } = await import(
  "./helpers/mongo.js"
);
const { createTestShop, createTestProduct, createTestCustomer } = await import(
  "./helpers/fixtures.js"
);
const { default: createApp } = await import("../app.js");
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

describe("API activity attribution", () => {
  let server;
  let shop;
  let user;
  let username;
  let pin;
  let token;

  before(async () => {
    await connectTestDb();
    const app = createApp();
    server = await new Promise((resolve) => {
      const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });
  });

  after(async () => {
    await new Promise((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
    await disconnectTestDb();
  });

  beforeEach(async () => {
    const created = await createTestShop();
    shop = created.shop;
    user = created.user;
    username = created.username;
    pin = created.pin;
    await createTestProduct(shop._id, { name: "attribbread", price: 2, stock: 20 });

    const login = await request(server, {
      method: "POST",
      path: "/api/v1/auth/login",
      body: { username, pin },
    });
    assert.equal(login.status, 200);
    token = login.body.token;
  });

  afterEach(async () => {
    await wipeShopData({ shopId: shop._id, username });
  });

  it("attributes cash sales to the signed-in user", async () => {
    const sale = await request(server, {
      method: "POST",
      path: "/api/v1/sales/cash",
      token,
      body: {
        items: [{ name: "attribbread", quantity: 1 }],
      },
    });
    assert.equal(sale.status, 201, JSON.stringify(sale.body));

    const logs = await ActivityLog.find({
      shopId: shop._id,
      action: "sale.cash",
    })
      .sort({ createdAt: -1 })
      .limit(1)
      .lean();

    assert.equal(logs.length, 1);
    assert.equal(String(logs[0].actorId), String(user._id));

    const list = await request(server, {
      method: "GET",
      path: "/api/v1/activity?action=sale.cash&limit=5",
      token,
    });
    assert.equal(list.status, 200);
    const item = list.body.items?.[0];
    assert.ok(item);
    assert.equal(item.actorUsername, username);
    assert.ok(item.actorDisplayName);
  });

  it("lets admin add a teammate who can also log attributed activity", async () => {
    const memberUser = `mem${Date.now().toString().slice(-8)}`;
    const add = await request(server, {
      method: "POST",
      path: "/api/v1/team",
      token,
      body: {
        username: memberUser,
        pin: "4829",
        displayName: "Teammate",
        role: "member",
      },
    });
    assert.equal(add.status, 201, JSON.stringify(add.body));

    const memberLogin = await request(server, {
      method: "POST",
      path: "/api/v1/auth/login",
      body: { username: memberUser, pin: "4829" },
    });
    assert.equal(memberLogin.status, 200);
    const memberToken = memberLogin.body.token;
    const memberId = memberLogin.body.user.id;

    const expense = await request(server, {
      method: "POST",
      path: "/api/v1/expenses",
      token: memberToken,
      body: {
        amount: 5,
        description: "Transport for stock",
        category: "transport",
        allowOverspend: true,
      },
    });
    assert.equal(expense.status, 201, JSON.stringify(expense.body));

    const logs = await ActivityLog.find({
      shopId: shop._id,
      action: "expense.recorded",
    })
      .sort({ createdAt: -1 })
      .limit(1)
      .lean();
    assert.equal(String(logs[0].actorId), String(memberId));

    await wipeShopData({ username: memberUser });
  });

  it("includes API sales as activity bubbles in /chat/history", async () => {
    await createTestCustomer(shop._id, { name: "Jane Chat" });

    const sale = await request(server, {
      method: "POST",
      path: "/api/v1/sales/to-customer",
      token,
      body: {
        customer: "Jane Chat",
        items: [{ name: "attribbread", quantity: 1 }],
      },
    });
    assert.equal(sale.status, 201, JSON.stringify(sale.body));

    const help = await request(server, {
      method: "POST",
      path: "/api/v1/chat",
      token,
      body: { message: "help" },
    });
    assert.equal(help.status, 200, JSON.stringify(help.body));

    const history = await request(server, {
      method: "GET",
      path: "/api/v1/chat/history?limit=50",
      token,
    });
    assert.equal(history.status, 200, JSON.stringify(history.body));
    const messages = history.body.messages || [];

    const saleBubble = messages.find(
      (m) => m.type === "activity" && /Sale to Jane Chat/i.test(m.text || "")
    );
    assert.ok(
      saleBubble,
      `expected Sale to Jane Chat activity bubble, got: ${JSON.stringify(messages)}`
    );
    assert.equal(saleBubble.actorUsername, username);
    assert.equal(saleBubble.channel, "web");
    assert.equal(saleBubble.entityType, "sale");
    assert.ok(saleBubble.entityId);
    assert.ok(saleBubble.customerId);

    const credit = await request(server, {
      method: "POST",
      path: "/api/v1/sales/credit",
      token,
      body: {
        customer: "Jane Chat",
        items: [{ name: "attribbread", quantity: 1 }],
        dueDate: "2030-01-15",
      },
    });
    assert.equal(credit.status, 201, JSON.stringify(credit.body));

    const history2 = await request(server, {
      method: "GET",
      path: "/api/v1/chat/history?limit=50",
      token,
    });
    assert.equal(history2.status, 200);
    const creditBubble = (history2.body.messages || []).find(
      (m) => m.type === "activity" && /Credit to Jane Chat/i.test(m.text || "")
    );
    assert.ok(
      creditBubble,
      `expected Credit to Jane Chat bubble, got: ${JSON.stringify(history2.body.messages)}`
    );

    const helpIn = messages.find(
      (m) => m.role === "user" && String(m.text || "").toLowerCase() === "help"
    );
    const helpOut = messages.find(
      (m) =>
        m.role === "assistant" &&
        m.type !== "activity" &&
        /help|command/i.test(m.text || "")
    );
    assert.ok(helpIn, "expected user help bubble");
    assert.ok(helpOut, "expected assistant help reply bubble");
  });

  it("supports promote and demote via team role API", async () => {
    const memberUser = `rol${Date.now().toString().slice(-8)}`;
    const add = await request(server, {
      method: "POST",
      path: "/api/v1/team",
      token,
      body: {
        username: memberUser,
        pin: "4829",
        displayName: "Role Test",
      },
    });
    assert.equal(add.status, 201);
    const memberId = add.body.member.id;

    const promote = await request(server, {
      method: "PATCH",
      path: `/api/v1/team/${memberId}/role`,
      token,
      body: { role: "admin" },
    });
    assert.equal(promote.status, 200, JSON.stringify(promote.body));
    assert.equal(promote.body.member.role, "admin");

    await wipeShopData({ username: memberUser });
  });
});
