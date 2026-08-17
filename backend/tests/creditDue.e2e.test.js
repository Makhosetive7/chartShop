/**
 * Credit due dates end-to-end: API create, chase list, chat command,
 * customer payment dropping owed rows, and reminder job keys.
 */
import { describe, it, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import http from "http";

if (!process.env.TELEGRAM_BOT_TOKEN) {
  process.env.TELEGRAM_BOT_TOKEN = "000000000:CREDIT_DUE_E2E_DUMMY_TOKEN";
}

const { connectTestDb, disconnectTestDb, wipeShopData } = await import(
  "./helpers/mongo.js"
);
const { createTestShop, createTestProduct } = await import(
  "./helpers/fixtures.js"
);
const { default: createApp } = await import("../app.js");
const { default: Sale } = await import("../models/Sale.js");
const { runCreditDueReminders } = await import(
  "../services/CreditDueReminderService.js"
);
const {
  addYmdDays,
  formatYmd,
  getZonedYmd,
  zonedLocalToUtc,
  DEFAULT_TIMEZONE,
} = await import("../utils/dateBounds.js");

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
          resolve({ status: res.statusCode, body: json, raw });
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
  assert.equal(res.status, 200, res.raw);
  return res.body.token;
}

function ymdOffset(days) {
  return formatYmd(addYmdDays(getZonedYmd(new Date()), days));
}

function dueUtc(days) {
  const ymd = addYmdDays(getZonedYmd(new Date()), days);
  return zonedLocalToUtc(
    ymd.year,
    ymd.month,
    ymd.day,
    0,
    0,
    0,
    0,
    DEFAULT_TIMEZONE
  );
}

describe("Credit due dates e2e", () => {
  let server;
  let shop;
  let username;
  let pin;
  let token;
  let demoShop;
  let demoUsername;

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
    pin = "4829";
    const created = await createTestShop({ pin });
    shop = created.shop;
    username = created.username;
    await createTestProduct(shop._id, {
      name: "e2ebread",
      price: 2.5,
      costPrice: 1,
      stock: 100,
    });
    token = await login(server, username, pin);

    const demo = await createTestShop({
      pin: "4829",
      isDemo: true,
      businessName: "Demo Credit Shop",
    });
    demoShop = demo.shop;
    demoUsername = demo.username;
    await createTestProduct(demoShop._id, {
      name: "e2ebread",
      price: 2.5,
      stock: 20,
    });
  });

  afterEach(async () => {
    await wipeShopData({ shopId: shop._id, username });
    if (demoShop) {
      await wipeShopData({ shopId: demoShop._id, username: demoUsername });
    }
  });

  async function addCustomer(name, phone) {
    const res = await request(server, {
      method: "POST",
      path: "/api/v1/customers",
      token,
      body: { name, phone },
    });
    assert.equal(res.status, 201, res.raw);
    return res.body.customer;
  }

  async function creditSale(customer, dueDate) {
    return request(server, {
      method: "POST",
      path: "/api/v1/sales/credit",
      token,
      body: {
        customer,
        items: [{ name: "e2ebread", quantity: 1 }],
        ...(dueDate ? { dueDate } : {}),
      },
    });
  }

  it("creates, lists chase statuses, chats, pays off, and reminds once", async () => {
    const overdueCust = await addCustomer("E2E Overdue", "0771000001");
    const dueCust = await addCustomer("E2E Due", "0771000002");
    const tomorrowCust = await addCustomer("E2E Tomorrow", "0771000003");
    const upcomingCust = await addCustomer("E2E Upcoming", "0771000004");
    const chatCust = await addCustomer("E2E Chat", "0771000005");
    const paidCust = await addCustomer("E2E Paid", "0771000006");

    const missing = await creditSale(overdueCust.name, null);
    assert.equal(missing.status, 400, missing.raw);
    assert.match(String(missing.body.error || ""), /dueDate/i);

    const overdueSale = await creditSale(overdueCust.name, ymdOffset(0));
    assert.equal(overdueSale.status, 201, overdueSale.raw);
    await Sale.updateOne(
      { _id: overdueSale.body.sale.id },
      { $set: { dueDate: dueUtc(-3) } }
    );

    const dueSale = await creditSale(dueCust.name, ymdOffset(0));
    assert.equal(dueSale.status, 201, dueSale.raw);
    assert.ok(dueSale.body.sale.dueDate);

    const tomorrowSale = await creditSale(tomorrowCust.name, ymdOffset(1));
    assert.equal(tomorrowSale.status, 201, tomorrowSale.raw);

    const upcomingSale = await creditSale(upcomingCust.name, ymdOffset(7));
    assert.equal(upcomingSale.status, 201, upcomingSale.raw);

    const paidSale = await creditSale(paidCust.name, ymdOffset(0));
    assert.equal(paidSale.status, 201, paidSale.raw);

    const listed = await request(server, {
      path: "/api/v1/sales/credit-due",
      token,
    });
    assert.equal(listed.status, 200, listed.raw);
    assert.equal(listed.body.date, ymdOffset(0));
    const byName = Object.fromEntries(
      listed.body.items.map((item) => [item.customerName, item])
    );
    assert.equal(byName["E2E Overdue"].status, "overdue");
    assert.equal(byName["E2E Overdue"].daysOverdue, 3);
    assert.equal(byName["E2E Due"].status, "due");
    assert.equal(byName["E2E Tomorrow"].status, "tomorrow");
    assert.equal(byName["E2E Upcoming"].status, "upcoming");
    assert.equal(byName["E2E Paid"].status, "due");
    assert.deepEqual(listed.body.summary, {
      overdue: 1,
      due: 2,
      tomorrow: 1,
      upcoming: 1,
    });

    const chatMissing = await request(server, {
      method: "POST",
      path: "/api/v1/chat",
      token,
      body: { message: 'credit sale to "E2E Chat" 1 e2ebread' },
    });
    assert.equal(chatMissing.status, 200, chatMissing.raw);
    assert.match(
      String(chatMissing.body.reply?.text || ""),
      /payment date required/i
    );

    const chatOk = await request(server, {
      method: "POST",
      path: "/api/v1/chat",
      token,
      body: {
        message: `credit sale to "E2E Chat" 1 e2ebread due ${ymdOffset(0)}`,
      },
    });
    assert.equal(chatOk.status, 200, chatOk.raw);
    assert.match(String(chatOk.body.reply?.text || ""), /due date/i);

    const afterChat = await request(server, {
      path: "/api/v1/sales/credit-due",
      token,
    });
    assert.equal(afterChat.status, 200, afterChat.raw);
    assert.equal(afterChat.body.summary.due, 3);
    assert.ok(
      afterChat.body.items.some((item) => item.customerName === "E2E Chat")
    );

    const pay = await request(server, {
      method: "POST",
      path: `/api/v1/customers/${paidCust.id}/payment`,
      token,
      body: { amount: 2.5 },
    });
    assert.equal(pay.status, 200, pay.raw);
    assert.equal(pay.body.customer.currentBalance, 0);

    const afterPay = await request(server, {
      path: "/api/v1/sales/credit-due",
      token,
    });
    assert.equal(afterPay.status, 200, afterPay.raw);
    assert.equal(
      afterPay.body.items.some((item) => item.customerName === "E2E Paid"),
      false
    );
    assert.equal(afterPay.body.summary.due, 2);

    const { default: Customer } = await import("../models/Customer.js");
    const demoCust = await Customer.create({
      shopId: demoShop._id,
      name: "Demo Debtor",
      phone: "0771999999",
      currentBalance: 2.5,
      isActive: true,
    });
    const demoSale = await Sale.create({
      shopId: demoShop._id,
      type: "credit",
      customerId: demoCust._id,
      customerName: demoCust.name,
      items: [{ productName: "e2ebread", quantity: 1, price: 2.5, total: 2.5 }],
      total: 2.5,
      dueDate: dueUtc(0),
      status: "completed",
    });

    const first = await runCreditDueReminders();
    assert.equal(first.salesReminded, 4, JSON.stringify(first));

    const overdueDoc = await Sale.findById(overdueSale.body.sale.id).lean();
    const dueDoc = await Sale.findById(dueSale.body.sale.id).lean();
    const tomorrowDoc = await Sale.findById(tomorrowSale.body.sale.id).lean();
    const upcomingDoc = await Sale.findById(upcomingSale.body.sale.id).lean();
    const demoDoc = await Sale.findById(demoSale._id).lean();
    assert.deepEqual(overdueDoc.creditReminderKeys, ["overdue:3"]);
    assert.deepEqual(dueDoc.creditReminderKeys, ["due"]);
    assert.deepEqual(tomorrowDoc.creditReminderKeys, ["before"]);
    assert.deepEqual(upcomingDoc.creditReminderKeys, []);
    assert.deepEqual(demoDoc.creditReminderKeys, []);

    const activity = await request(server, {
      path: "/api/v1/activity?action=credit.reminder&limit=10",
      token,
    });
    assert.equal(activity.status, 200, activity.raw);
    assert.ok(
      (activity.body.items || []).some((row) => row.action === "credit.reminder")
    );

    const second = await runCreditDueReminders();
    const dueAgain = await Sale.findById(dueSale.body.sale.id).lean();
    assert.deepEqual(dueAgain.creditReminderKeys, ["due"]);
    assert.equal(second.salesReminded, 0, JSON.stringify(second));
  });
});
