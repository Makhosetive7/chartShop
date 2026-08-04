/**
 * End-to-end command-path test for Phase 3 split.
 * Drives commandService.processCommand against a real MongoDB.
 *
 * Usage:
 *   MONGODB_URI=mongodb://127.0.0.1:27017/chartshop_e2e node scripts/e2ePhase3.js
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import commandService from "../services/commandService.js";
import Product from "../models/Product.js";
import Sale from "../models/Sale.js";
import Shop from "../models/Shop.js";
import Customer from "../models/Customer.js";

dotenv.config();

const TG = `e2e_${Date.now()}`;
const PIN = "4829";
const results = [];

function assert(name, cond, detail = "") {
  results.push({ name, ok: !!cond, detail: String(detail).slice(0, 240) });
  const mark = cond ? "PASS" : "FAIL";
  console.log(`${mark}  ${name}${detail ? ` — ${String(detail).slice(0, 120)}` : ""}`);
}

function includes(hay, ...needles) {
  const h = (hay || "").toLowerCase();
  return needles.every((n) => h.includes(String(n).toLowerCase()));
}

async function cmd(text) {
  const response = await commandService.processCommand(TG, text);
  if (response && typeof response === "object") {
    return JSON.stringify(response);
  }
  return String(response ?? "");
}

async function cleanup() {
  const shop = await Shop.findOne({ telegramId: TG });
  if (shop) {
    await Promise.all([
      Product.deleteMany({ shopId: shop._id }),
      Sale.deleteMany({ shopId: shop._id }),
      Customer.deleteMany({ shopId: shop._id }),
    ]);
    await Shop.deleteOne({ _id: shop._id });
  }
  await mongoose.connection.db.collection("authsessions").deleteMany({
    telegramId: TG,
  });
}

async function main() {
  const uri =
    process.env.E2E_MONGODB_URI ||
    process.env.MONGODB_URI ||
    "mongodb://127.0.0.1:27017/chartshop_e2e";

  console.log(`Connecting… (${uri.replace(/\/\/.*@/, "//***@")})`);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log(`DB: ${mongoose.connection.name}\nTelegram test id: ${TG}\n`);

  await cleanup();

  // 1. Register (quick format)
  let r = await cmd(`register "Phase3 E2E Shop" ${PIN}`);
  assert(
    "register",
    includes(r, "phase3 e2e shop") || includes(r, "welcome") || includes(r, "registered") || includes(r, "success") || includes(r, "logged"),
    r
  );

  // If register returned a multi-step prompt, finish the flow
  if (includes(r, "step") || includes(r, "description") || includes(r, "business name")) {
    r = await cmd("register");
    // start registration then steps
  }
  // Ensure logged in via login if needed
  if (includes(r, "already have") || includes(r, "login")) {
    r = await cmd(`login ${PIN}`);
  }

  // Re-check auth with status
  r = await cmd("status");
  if (!includes(r, "phase3") && !includes(r, "logged") && !includes(r, "active")) {
    // Try full register flow
    await cleanup();
    r = await cmd("register");
    assert("register start", includes(r, "business name") || includes(r, "step"), r);
    r = await cmd("Phase3 E2E Shop");
    assert("register name", includes(r, "description") || includes(r, "step"), r);
    r = await cmd("End to end test shop for phase three command split");
    assert("register description", includes(r, "pin") || includes(r, "step"), r);
    r = await cmd(PIN);
    assert("register pin", includes(r, "phase3") || includes(r, "success") || includes(r, "welcome") || includes(r, "ready"), r);
  }

  r = await cmd("status");
  assert("status after auth", includes(r, "phase3") || includes(r, "logged") || includes(r, "active"), r);

  r = await cmd("account");
  assert("account shows businessName", includes(r, "phase3 e2e shop"), r);

  // Products
  r = await cmd("add e2ebread 2.50 stock 10");
  assert("add bread", includes(r, "e2ebread") || includes(r, "added") || includes(r, "created") || includes(r, "success"), r);

  r = await cmd('add "e2e milk" 3.20 stock 5');
  assert("add milk", includes(r, "milk") || includes(r, "added") || includes(r, "created"), r);

  r = await cmd("list");
  assert("list products", includes(r, "e2ebread") && includes(r, "milk"), r);

  // Cash sale
  r = await cmd("sell 2 e2ebread");
  assert("cash sell", includes(r, "cash") || includes(r, "receipt") || includes(r, "5.00") || includes(r, "total"), r);

  const shop = await Shop.findOne({ telegramId: TG });
  let bread = await Product.findOne({ shopId: shop._id, name: /e2ebread/i });
  assert("stock after sell", bread && bread.stock === 8, `stock=${bread?.stock}`);

  // Oversell should fail
  r = await cmd("sell 100 e2ebread");
  assert("oversell rejected", includes(r, "insufficient") || includes(r, "stock"), r);

  bread = await Product.findOne({ shopId: shop._id, name: /e2ebread/i });
  assert("stock unchanged after oversell", bread.stock === 8, `stock=${bread.stock}`);

  // Daily
  r = await cmd("daily");
  assert("daily report", includes(r, "operating") || includes(r, "revenue") || includes(r, "sales") || includes(r, "daily"), r);

  // Cancel
  r = await cmd('cancel last "phase3 e2e"');
  assert("cancel last", includes(r, "cancel") || includes(r, "refund") || includes(r, "restored") || includes(r, "success"), r);
  bread = await Product.findOne({ shopId: shop._id, name: /e2ebread/i });
  assert("stock restored after cancel", bread.stock === 10, `stock=${bread.stock}`);

  // Customer + credit sale (multi-word names must be quoted)
  r = await cmd('customer add "Phase3 Cust" 5550003333');
  assert("add customer", includes(r, "phase3 cust") || includes(r, "added") || includes(r, "success"), r);

  r = await cmd('credit sale to "Phase3 Cust" 2 e2ebread');
  assert("credit sale", includes(r, "credit") || includes(r, "5.00") || includes(r, "phase3"), r);
  bread = await Product.findOne({ shopId: shop._id, name: /e2ebread/i });
  assert("stock after credit sale", bread.stock === 8, `stock=${bread.stock}`);

  let cust = await Customer.findOne({ shopId: shop._id, name: /Phase3 Cust/i });
  assert("customer balance after credit sale", cust && cust.currentBalance === 5, `balance=${cust?.currentBalance}`);

  // Ledger credit via parseSaleItems (quoted customer + product)
  r = await cmd('credit "Phase3 Cust" 1 "e2e milk"');
  assert("ledger credit quoted product", includes(r, "credit") || includes(r, "3.20") || includes(r, "milk"), r);
  cust = await Customer.findOne({ shopId: shop._id, name: /Phase3 Cust/i });
  assert("balance after ledger credit", cust && cust.currentBalance === 8.2, `balance=${cust?.currentBalance}`);

  // Payment
  r = await cmd('payment "Phase3 Cust" 3.20');
  assert("payment", includes(r, "payment") || includes(r, "paid") || includes(r, "balance"), r);
  cust = await Customer.findOne({ shopId: shop._id, name: /Phase3 Cust/i });
  assert("balance after payment", cust && Math.abs(cust.currentBalance - 5) < 0.001, `balance=${cust?.currentBalance}`);

  // Sell to customer
  r = await cmd('sell to "Phase3 Cust" 1 e2ebread');
  assert("sell to customer", includes(r, "invoice") || includes(r, "phase3") || includes(r, "2.50") || includes(r, "total"), r);

  // Expense breakdown reachable
  r = await cmd('expense 10.00 supplier cash "phase3 test"');
  assert("record expense", includes(r, "expense") || includes(r, "10") || includes(r, "recorded") || includes(r, "success"), r);

  r = await cmd("expense breakdown");
  assert(
    "expense breakdown",
    includes(r, "breakdown") && !includes(r, "failed") && !includes(r, "not defined"),
    r
  );

  // Help + unknown
  r = await cmd("help");
  assert("help", includes(r, "sell") && includes(r, "credit"), r);

  r = await cmd("notacommandxyz");
  assert("unknown command", includes(r, "unknown"), r);

  // Logout / login
  r = await cmd("logout");
  assert("logout", includes(r, "logout") || includes(r, "logged out") || includes(r, "goodbye") || includes(r, "session"), r);

  r = await cmd("list");
  assert("blocked when logged out", includes(r, "login") || includes(r, "register") || includes(r, "welcome"), r);

  r = await cmd(`login ${PIN}`);
  assert("login again", includes(r, "phase3") || includes(r, "welcome") || includes(r, "success") || includes(r, "logged"), r);

  r = await cmd("list");
  assert("list after re-login", includes(r, "e2ebread"), r);

  // Markdown escape path (product not found with special chars)
  r = await cmd("sell 1 star*name");
  assert("markdown escape in error", includes(r, "not found") && r.includes("\\*"), r);

  await cleanup();
  await mongoose.disconnect();

  const failed = results.filter((x) => !x.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    console.log("\nFailures:");
    failed.forEach((f) => console.log(` - ${f.name}: ${f.detail}`));
    process.exit(1);
  }
  console.log("\nPhase 3 e2e: ALL PASSED");
}

main().catch(async (err) => {
  console.error("E2E crashed:", err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
