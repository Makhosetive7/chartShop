import { describe, it, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import {
  connectTestDb,
  disconnectTestDb,
  wipeShopData,
  testMongoUri,
} from "./helpers/mongo.js";
import { createTestShop } from "./helpers/fixtures.js";
import AuthService from "../services/AuthService.js";
import SessionStore from "../services/sessionStore.js";

describe("auth session survives restart", () => {
  let shop;
  let telegramId;

  before(async () => {
    await connectTestDb();
  });

  after(async () => {
    await disconnectTestDb();
  });

  beforeEach(async () => {
    const created = await createTestShop();
    shop = created.shop;
    telegramId = created.telegramId;
  });

  afterEach(async () => {
    await wipeShopData({ shopId: shop._id, telegramId });
  });

  it("keeps login after mongoose disconnect/reconnect (process restart)", async () => {
    await AuthService.createLoginSession(telegramId, shop._id);
    assert.equal(await AuthService.isAuthenticated(telegramId), true);

    const before = await SessionStore.getLoginSession(telegramId);
    assert.ok(before);
    assert.equal(String(before.shopId), String(shop._id));

    // Simulate process restart: drop connection, reconnect, ask again
    await mongoose.disconnect();
    await mongoose.connect(testMongoUri(), { serverSelectionTimeoutMS: 8000 });

    assert.equal(await AuthService.isAuthenticated(telegramId), true);

    const after = await SessionStore.getLoginSession(telegramId);
    assert.ok(after);
    assert.equal(after.sessionToken, before.sessionToken);
  });

  it("logout clears persisted session across reconnect", async () => {
    await AuthService.createLoginSession(telegramId, shop._id);
    await AuthService.logout(telegramId);

    await mongoose.disconnect();
    await mongoose.connect(testMongoUri(), { serverSelectionTimeoutMS: 8000 });

    assert.equal(await AuthService.isAuthenticated(telegramId), false);
    assert.equal(await SessionStore.getLoginSession(telegramId), null);
  });
});
