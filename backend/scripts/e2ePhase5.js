/**
 * End-to-end checks for Phase 5 (adapters + cost price + parser fix)
 * plus core money-path regression.
 *
 * Usage:
 *   TEST_MONGODB_URI=mongodb://127.0.0.1:27017/chartshop_e2e node scripts/e2ePhase5.js
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import http from "http";

dotenv.config();

// Dummy token so telegramService can load if adapters pull it in
if (!process.env.TELEGRAM_BOT_TOKEN) {
  process.env.TELEGRAM_BOT_TOKEN = "000000000:E2E_DUMMY_TOKEN_FOR_LOCAL_TESTS";
}
process.env.WHATSAPP_ENABLED = "true";
process.env.WHATSAPP_TOKEN = "e2e-token";
process.env.WHATSAPP_PHONE_NUMBER_ID = "e2e-phone-id";
process.env.WHATSAPP_VERIFY_TOKEN = "e2e-verify";

const { default: commandService } = await import(
  "../services/commandService.js"
);
const { default: Product } = await import("../models/Product.js");
const { default: Sale } = await import("../models/Sale.js");
const { default: Shop } = await import("../models/Shop.js");
const { default: Customer } = await import("../models/Customer.js");
const { handleInboundMessage } = await import("../adapters/inbound.js");
const {
  verifyWhatsAppWebhook,
  handleWhatsAppWebhook,
  isWhatsAppConfigured,
} = await import("../adapters/whatsapp.js");
const { handleTelegramUpdate } = await import("../adapters/telegram.js");

const TG_CHAT = `${Date.now()}`.slice(-9);
const TG_USER = `e2e5tg${Date.now().toString().slice(-7)}`.slice(0, 15);
const WA_PHONE = "263771234567";
const WA = `wa:${WA_PHONE}`;
const WA_USER = `e2e5wa${Date.now().toString().slice(-7)}`.slice(0, 15);
const PIN = "4829";
const results = [];

function assert(name, cond, detail = "") {
  results.push({ name, ok: !!cond, detail: String(detail).slice(0, 280) });
  console.log(
    `${cond ? "PASS" : "FAIL"}  ${name}${
      detail ? ` — ${String(detail).slice(0, 140)}` : ""
    }`
  );
}

function includes(hay, ...needles) {
  const h = (hay || "").toLowerCase();
  return needles.every((n) => h.includes(String(n).toLowerCase()));
}

async function cmd(userId, text, channelHint) {
  const response = await commandService.processCommand(
    userId,
    text,
    channelHint
  );
  if (response && typeof response === "object") {
    return JSON.stringify(response);
  }
  return String(response ?? "");
}

async function wipeByUsername(username) {
  const shop = await Shop.findOne({ username });
  if (shop) {
    await Promise.all([
      Product.deleteMany({ shopId: shop._id }),
      Sale.deleteMany({ shopId: shop._id }),
      Customer.deleteMany({ shopId: shop._id }),
    ]);
    await Shop.deleteOne({ _id: shop._id });
  }
  await mongoose.connection.db
    .collection("authsessions")
    .deleteMany({ shopId: shop?._id });
}

async function wipeChannel(channel, channelKey) {
  await mongoose.connection.db
    .collection("authsessions")
    .deleteMany({ channel, channelKey: String(channelKey) });
}

function httpGet(port, path) {
  return new Promise((resolve, reject) => {
    http
      .get({ hostname: "127.0.0.1", port, path }, (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () =>
          resolve({ status: res.statusCode, body, headers: res.headers })
        );
      })
      .on("error", reject);
  });
}

async function main() {
  const uri =
    process.env.TEST_MONGODB_URI ||
    process.env.E2E_MONGODB_URI ||
    "mongodb://127.0.0.1:27017/chartshop_e2e";

  console.log(`Connecting… (${uri.replace(/\/\/.*@/, "//***@")})`);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log(`DB: ${mongoose.connection.name}\nTG=${TG_CHAT} @${TG_USER}\nWA=${WA} @${WA_USER}\n`);

  await wipeByUsername(TG_USER);
  await wipeByUsername(WA_USER);
  await wipeChannel("telegram", TG_CHAT);
  await wipeChannel("whatsapp", WA_PHONE);

  // ---------- Core regression ----------
  let r = await cmd(
    TG_CHAT,
    `register ${TG_USER} "Phase5 E2E Shop" ${PIN}`,
    "telegram"
  );
  assert("register", includes(r, "phase5 e2e shop") || includes(r, "ready"), r);

  r = await cmd(TG_CHAT, "status", "telegram");
  assert("status logged in", includes(r, "phase5") || includes(r, "logged"), r);

  r = await cmd(TG_CHAT, "add e2ebread 2.50 stock 20", "telegram");
  assert("add bread", includes(r, "e2ebread") || includes(r, "added"), r);

  r = await cmd(TG_CHAT, 'add "e2e milk" 3.20 stock 10', "telegram");
  assert("add milk", includes(r, "milk") || includes(r, "added"), r);

  r = await cmd(TG_CHAT, "sell 2 e2ebread", "telegram");
  assert("cash sell", includes(r, "cash") || includes(r, "total") || includes(r, "5.00"), r);

  let shop = await Shop.findOne({ username: TG_USER });
  let bread = await Product.findOne({ shopId: shop._id, name: /e2ebread/i });
  assert("stock after sell", bread?.stock === 18, `stock=${bread?.stock}`);

  r = await cmd(TG_CHAT, "sell 100 e2ebread", "telegram");
  assert("oversell rejected", includes(r, "insufficient"), r);

  r = await cmd(TG_CHAT, 'cancel last "e2e5"', "telegram");
  assert("cancel last", includes(r, "cancel"), r);
  bread = await Product.findOne({ shopId: shop._id, name: /e2ebread/i });
  assert("stock restored", bread?.stock === 20, `stock=${bread?.stock}`);

  // ---------- Parser fix ----------
  r = await cmd(TG_CHAT, "sell 2 e2ebread 1 \"e2e milk\"", "telegram");
  assert(
    "multi-item sale 2 bread 1 milk",
    includes(r, "e2ebread") && includes(r, "milk") && includes(r, "cash"),
    r
  );
  bread = await Product.findOne({ shopId: shop._id, name: /e2ebread/i });
  let milk = await Product.findOne({ shopId: shop._id, name: /e2e milk/i });
  assert("multi-item stock bread", bread?.stock === 18, `stock=${bread?.stock}`);
  assert("multi-item stock milk", milk?.stock === 9, `stock=${milk?.stock}`);

  r = await cmd(TG_CHAT, "sell 1 e2ebread 2.25", "telegram");
  assert("custom price still works", includes(r, "2.25") || includes(r, "cash"), r);

  // ---------- Cost / margin ----------
  r = await cmd(TG_CHAT, "add p5bread 2.50 cost 1.00 stock 10", "telegram");
  assert(
    "add with cost",
    includes(r, "cost") && includes(r, "1.00") && includes(r, "margin"),
    r
  );

  r = await cmd(TG_CHAT, "sell 2 p5bread", "telegram");
  assert("sell shows COGS", includes(r, "cogs") && includes(r, "gross profit"), r);

  const p5Sale = await Sale.findOne({
    shopId: shop._id,
    "items.productName": /p5bread/i,
    isCancelled: false,
  }).sort({ date: -1 });
  assert("sale.costTotal stored", p5Sale?.costTotal === 2, `costTotal=${p5Sale?.costTotal}`);
  assert("sale.profit stored", p5Sale?.profit === 3, `profit=${p5Sale?.profit}`);

  r = await cmd(TG_CHAT, "daily", "telegram");
  assert(
    "daily product margin",
    includes(r, "product margin") || includes(r, "gross profit") || includes(r, "cogs"),
    r
  );

  r = await cmd(TG_CHAT, "edit p5bread cost 1.25", "telegram");
  assert("edit cost", includes(r, "cost") && includes(r, "1.25"), r);

  // ---------- Credit path still works ----------
  r = await cmd(TG_CHAT, 'customer add "Phase5 Cust" 5550005555', "telegram");
  assert("add customer", includes(r, "phase5 cust") || includes(r, "added"), r);

  r = await cmd(TG_CHAT, 'credit sale to "Phase5 Cust" 1 e2ebread', "telegram");
  assert("credit sale", includes(r, "credit"), r);

  r = await cmd(TG_CHAT, "logout", "telegram");
  assert("logout", includes(r, "logged out") || includes(r, "goodbye"), r);

  r = await cmd(TG_CHAT, "list", "telegram");
  assert("blocked when logged out", includes(r, "login") || includes(r, "welcome"), r);

  r = await cmd(TG_CHAT, `login ${PIN}`, "telegram");
  assert("re-login pin-only on linked chat", includes(r, "phase5") || includes(r, "welcome"), r);

  // ---------- Shared inbound adapter ----------
  const replies = [];
  await handleInboundMessage({
    userId: TG_CHAT,
    text: "list",
    channel: "telegram",
    sendText: async (body) => {
      replies.push(body);
    },
  });
  assert(
    "inbound adapter list",
    replies.length === 1 && includes(replies[0], "e2ebread"),
    replies[0]
  );

  // ---------- WhatsApp verify + identity ----------
  assert("whatsapp configured", isWhatsAppConfigured() === true);

  const verify = verifyWhatsAppWebhook({
    "hub.mode": "subscribe",
    "hub.verify_token": "e2e-verify",
    "hub.challenge": "4242",
  });
  assert("whatsapp hub verify", verify.ok && verify.challenge === "4242", JSON.stringify(verify));

  // Register a separate WhatsApp shop (different username)
  r = await cmd(WA, `register ${WA_USER} "WA E2E Shop" ${PIN}`, "whatsapp");
  assert("wa register", includes(r, "wa e2e shop") || includes(r, "ready"), r);

  r = await cmd(WA, "add wabread 1.50 stock 5", "whatsapp");
  assert("wa add product", includes(r, "wabread") || includes(r, "added"), r);

  const waShop = await Shop.findOne({ username: WA_USER });
  const tgShop = await Shop.findOne({ username: TG_USER });
  assert(
    "wa and tg shops are separate",
    waShop && tgShop && String(waShop._id) !== String(tgShop._id),
    `wa=${waShop?._id} tg=${tgShop?._id}`
  );
  assert(
    "channels linked on each shop",
    tgShop.channels?.telegramChatId === TG_CHAT &&
      waShop.channels?.whatsappPhone === WA_PHONE,
    JSON.stringify({ tg: tgShop.channels, wa: waShop.channels })
  );

  const waReplies = [];
  await handleInboundMessage({
    userId: WA,
    text: "list",
    channel: "whatsapp",
    sendText: async (body) => waReplies.push(body),
  });
  assert(
    "wa inbound list",
    waReplies.length === 1 && includes(waReplies[0], "wabread"),
    waReplies[0]
  );

  // Telegram update adapter
  const ignored = await handleTelegramUpdate({ update_id: 2 });
  assert("telegram adapter ignores non-text", ignored?.ignored === true, JSON.stringify(ignored));
  assert(
    "telegram adapter module callable",
    typeof handleTelegramUpdate === "function",
    ""
  );

  // ---------- HTTP: health + whatsapp verify via minimal express mount ----------
  const express = (await import("express")).default;
  const whatsappRoutes = (await import("../routes/whatsapp.js")).default;
  const app = express();
  app.use(express.json());
  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      whatsapp: isWhatsAppConfigured() ? "enabled" : "disabled",
    });
  });
  app.use("/webhook", whatsappRoutes);

  const server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const port = server.address().port;

  const health = await httpGet(port, "/health");
  assert(
    "http health whatsapp enabled",
    health.status === 200 && includes(health.body, "enabled"),
    health.body
  );

  const hub = await httpGet(
    port,
    "/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=e2e-verify&hub.challenge=777"
  );
  assert(
    "http whatsapp verify challenge",
    hub.status === 200 && hub.body === "777",
    `status=${hub.status} body=${hub.body}`
  );

  const badHub = await httpGet(
    port,
    "/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=1"
  );
  assert("http whatsapp verify reject", badHub.status === 403, `status=${badHub.status}`);

  await new Promise((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve()))
  );

  await wipeByUsername(TG_USER);
  await wipeByUsername(WA_USER);
  await wipeChannel("telegram", TG_CHAT);
  await wipeChannel("whatsapp", WA_PHONE);
  await mongoose.disconnect();

  const failed = results.filter((x) => !x.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    console.log("\nFailures:");
    failed.forEach((f) => console.log(` - ${f.name}: ${f.detail}`));
    process.exit(1);
  }
  console.log("\nPhase 5 e2e: ALL PASSED");
}

main().catch(async (err) => {
  console.error("E2E crashed:", err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
