/**
 * End-to-end: register → recovery codes → change username → redeem → login.
 *
 * Usage:
 *   TEST_MONGODB_URI=... node scripts/e2eRecovery.js
 *   (falls back to MONGODB_URI / local phase4 DB like other tests)
 */
import http from "http";
import assert from "node:assert/strict";

if (!process.env.TELEGRAM_BOT_TOKEN) {
  process.env.TELEGRAM_BOT_TOKEN = "000000000:E2E_RECOVERY_DUMMY";
}

const { connectTestDb, disconnectTestDb, wipeShopData } = await import(
  "../tests/helpers/mongo.js"
);
const { default: createApp } = await import("../app.js");
const { default: RecoveryCode } = await import("../models/RecoveryCode.js");
const { hashRecoveryCode } = await import("../utils/recoveryCodes.js");

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
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          let json = null;
          try {
            json = data ? JSON.parse(data) : null;
          } catch {
            json = data;
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

const results = [];
function check(name, cond, detail = "") {
  results.push({ name, ok: !!cond, detail: String(detail).slice(0, 200) });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${String(detail).slice(0, 120)}` : ""}`);
}

const stamp = Date.now().toString().slice(-8);
const username = `eerecv${stamp}`.slice(0, 15);
const pin = "4829";
const newPin = "5731";
const renamed = `eerenm${stamp}`.slice(0, 15);

await connectTestDb();
const app = createApp();
const server = await new Promise((resolve) => {
  const s = app.listen(0, "127.0.0.1", () => resolve(s));
});

let shopId = null;

try {
  // 1. Register
  const reg = await request(server, {
    method: "POST",
    path: "/api/v1/auth/register",
    body: {
      username,
      businessName: `E2E Recovery ${stamp}`,
      pin,
      businessDescription: "End to end recovery codes test shop",
    },
  });
  check("register 201", reg.status === 201, JSON.stringify(reg.body?.error || ""));
  check("returns 8 recovery codes", reg.body?.recoveryCodes?.length === 8);
  check("codes look like cs-xxxx-xxxx", /^cs-[a-z0-9]{4}-[a-z0-9]{4}$/.test(reg.body?.recoveryCodes?.[0] || ""));
  const token = reg.body?.token;
  shopId = reg.body?.shop?.id;
  const codes = reg.body?.recoveryCodes || [];

  // 2. Hashes only in DB
  const stored = await RecoveryCode.find({ shopId }).lean();
  check("8 hashes stored", stored.length === 8);
  check(
    "no plaintext in DB",
    stored.every((row) => !codes.includes(row.codeHash) && row.codeHash.length === 64)
  );
  check(
    "hash matches issued code",
    stored.some((row) => row.codeHash === hashRecoveryCode(codes[0]))
  );

  // 3. Status while authed
  const status = await request(server, {
    method: "GET",
    path: "/api/v1/auth/recovery",
    token,
  });
  check("recovery status remaining=8", status.status === 200 && status.body.remaining === 8);

  // 4. Username availability (self = available)
  const selfCheck = await request(server, {
    method: "GET",
    path: `/api/v1/auth/username?username=${encodeURIComponent(username)}`,
    token,
  });
  check("own username available when authed", selfCheck.body?.available === true);

  // 5. Change username
  const renamedRes = await request(server, {
    method: "PATCH",
    path: "/api/v1/auth/profile/username",
    token,
    body: { username: renamed },
  });
  check("username change 200", renamedRes.status === 200, JSON.stringify(renamedRes.body?.error || ""));
  check("shop username updated", renamedRes.body?.shop?.username === renamed);

  // 6. Regenerate codes
  const regen = await request(server, {
    method: "POST",
    path: "/api/v1/auth/recovery/regenerate",
    token,
  });
  check("regenerate 200", regen.status === 200);
  check("regen returns 8 new codes", regen.body?.recoveryCodes?.length === 8);
  const freshCodes = regen.body?.recoveryCodes || [];
  check(
    "old code set revoked (old plaintext unused)",
    !freshCodes.includes(codes[0])
  );

  // 7. Old code from first set should fail after revoke
  const oldRedeem = await request(server, {
    method: "POST",
    path: "/api/v1/auth/recovery/redeem",
    body: { username: renamed, code: codes[0], newPin },
  });
  check("revoked code rejected", oldRedeem.status === 401);

  // 8. Redeem a fresh code
  const redeem = await request(server, {
    method: "POST",
    path: "/api/v1/auth/recovery/redeem",
    body: { username: renamed, code: freshCodes[0], newPin },
  });
  check("redeem 200", redeem.status === 200, JSON.stringify(redeem.body?.error || ""));
  check("remaining=7", redeem.body?.remaining === 7);

  // 9. Reuse same code fails
  const reuse = await request(server, {
    method: "POST",
    path: "/api/v1/auth/recovery/redeem",
    body: { username: renamed, code: freshCodes[0], newPin: "5820" },
  });
  check("used code rejected", reuse.status === 401);

  // 10. Old PIN fails; new PIN works; old username fails
  const badPin = await request(server, {
    method: "POST",
    path: "/api/v1/auth/login",
    body: { username: renamed, pin },
  });
  check("old PIN rejected", badPin.status === 401);

  const oldUser = await request(server, {
    method: "POST",
    path: "/api/v1/auth/login",
    body: { username, pin: newPin },
  });
  check("old username rejected", oldUser.status === 401);

  const okLogin = await request(server, {
    method: "POST",
    path: "/api/v1/auth/login",
    body: { username: renamed, pin: newPin },
  });
  check("login with new username+PIN", okLogin.status === 200);

  // 11. Reserved username blocked
  const reserved = await request(server, {
    method: "GET",
    path: "/api/v1/auth/username?username=admin",
  });
  check(
    "reserved username suggestions",
    reserved.body?.available === false &&
      reserved.body?.valid === false &&
      (reserved.body?.suggestions?.length || 0) >= 1
  );
} finally {
  if (shopId) {
    await wipeShopData({ shopId, username: renamed });
    await wipeShopData({ username });
  }
  await new Promise((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve()))
  );
  await disconnectTestDb();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) {
  console.error("Failed:", failed.map((f) => f.name).join(", "));
  process.exit(1);
}
console.log("E2E recovery flow OK");
