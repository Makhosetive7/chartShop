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
  let username;
  const channel = "telegram";
  const channelKey = "tg_test_chat_1";

  before(async () => {
    await connectTestDb();
  });

  after(async () => {
    await disconnectTestDb();
  });

  beforeEach(async () => {
    const created = await createTestShop({
      telegramChatId: channelKey,
    });
    shop = created.shop;
    username = created.username;
  });

  afterEach(async () => {
    await wipeShopData({
      shopId: shop._id,
      username,
      channelKey,
    });
  });

  it("keeps login after mongoose disconnect/reconnect (process restart)", async () => {
    await AuthService.createLoginSession(shop._id, channel, channelKey);
    assert.equal(await AuthService.isAuthenticated(channel, channelKey), true);

    const before = await SessionStore.getLoginSession(channel, channelKey);
    assert.ok(before);
    assert.equal(String(before.shopId), String(shop._id));

    await mongoose.disconnect();
    await mongoose.connect(testMongoUri(), { serverSelectionTimeoutMS: 8000 });

    assert.equal(await AuthService.isAuthenticated(channel, channelKey), true);

    const after = await SessionStore.getLoginSession(channel, channelKey);
    assert.ok(after);
    assert.equal(after.sessionToken, before.sessionToken);
  });

  it("logout clears persisted session across reconnect", async () => {
    await AuthService.createLoginSession(shop._id, channel, channelKey);
    await AuthService.logout(channel, channelKey);

    await mongoose.disconnect();
    await mongoose.connect(testMongoUri(), { serverSelectionTimeoutMS: 8000 });

    assert.equal(await AuthService.isAuthenticated(channel, channelKey), false);
    assert.equal(await SessionStore.getLoginSession(channel, channelKey), null);
  });

  it("allows concurrent web + telegram sessions", async () => {
    const webToken = await AuthService.createLoginSession(shop._id, "web", null);
    await AuthService.createLoginSession(shop._id, channel, channelKey);

    assert.equal(await AuthService.isAuthenticated("web", webToken), true);
    assert.equal(await AuthService.isAuthenticated(channel, channelKey), true);

    await AuthService.logout(channel, channelKey);
    assert.equal(await AuthService.isAuthenticated(channel, channelKey), false);
    assert.equal(await AuthService.isAuthenticated("web", webToken), true);
  });

  it("login with username+pin binds telegram channel", async () => {
    const unbound = await createTestShop({ username: `bind_${Date.now()}` });
    const result = await AuthService.loginWithCredentials({
      username: unbound.username,
      pin: unbound.pin,
      channel: "telegram",
      channelKey: "999888777",
    });
    assert.equal(result.success, true);

    const refreshed = await AuthService.findShopByUsername(unbound.username);
    assert.equal(refreshed.channels.telegramChatId, "999888777");

    await wipeShopData({
      shopId: unbound.shop._id,
      username: unbound.username,
      channelKey: "999888777",
    });
  });
});
