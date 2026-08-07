import AuthSession from "../models/AuthSession.js";

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const REGISTRATION_TTL_MS = 15 * 60 * 1000;
const PIN_CHANGE_TTL_MS = 10 * 60 * 1000;

function ttlDate(msFromNow) {
  return new Date(Date.now() + msFromNow);
}

function identityFilter(channel, channelKey, type) {
  return { channel, channelKey: String(channelKey), type };
}

/**
 * Mongo-backed auth session helpers (login / registration / PIN change).
 * Keys are (channel, channelKey) so web + Telegram + WhatsApp can coexist.
 */
class SessionStore {
  async get(channel, channelKey, type) {
    return AuthSession.findOne(identityFilter(channel, channelKey, type));
  }

  async delete(channel, channelKey, type) {
    await AuthSession.deleteOne(identityFilter(channel, channelKey, type));
  }

  async upsertLoginSession({
    channel,
    channelKey,
    sessionToken,
    shopId,
    userId,
    loginTime,
  }) {
    const now = new Date();
    const key = String(channelKey);
    const $set = {
      channel,
      channelKey: key,
      type: "session",
      sessionToken,
      shopId,
      loginTime: loginTime || now,
      lastActivity: now,
      expireAt: ttlDate(SESSION_TTL_MS),
    };
    if (userId) {
      $set.userId = userId;
    }
    return AuthSession.findOneAndUpdate(
      identityFilter(channel, key, "session"),
      {
        $set,
        $unset: { step: 1, data: 1, startTime: 1 },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  async touchLoginSession(channel, channelKey) {
    const now = new Date();
    return AuthSession.findOneAndUpdate(
      identityFilter(channel, channelKey, "session"),
      {
        lastActivity: now,
        expireAt: ttlDate(SESSION_TTL_MS),
      },
      { new: true }
    );
  }

  async touchLoginSessionByToken(sessionToken) {
    const now = new Date();
    return AuthSession.findOneAndUpdate(
      { type: "session", sessionToken },
      {
        lastActivity: now,
        expireAt: ttlDate(SESSION_TTL_MS),
      },
      { new: true }
    );
  }

  async getLoginSession(channel, channelKey) {
    return this.get(channel, channelKey, "session");
  }

  async getLoginSessionByToken(sessionToken) {
    if (!sessionToken) return null;
    return AuthSession.findOne({ type: "session", sessionToken });
  }

  async deleteLoginSession(channel, channelKey) {
    return this.delete(channel, channelKey, "session");
  }

  async deleteLoginSessionByToken(sessionToken) {
    if (!sessionToken) return;
    await AuthSession.deleteOne({ type: "session", sessionToken });
  }

  /** End every login session for a shop (e.g. after PIN recovery). */
  async deleteLoginSessionsByShopId(shopId) {
    if (!shopId) return;
    await AuthSession.deleteMany({ type: "session", shopId });
  }

  /** End every login session for a user (leave shop / PIN change). */
  async deleteLoginSessionsByUserId(userId) {
    if (!userId) return;
    await AuthSession.deleteMany({ type: "session", userId });
  }

  async upsertRegistration(channel, channelKey, { step, data, startTime }) {
    const started =
      startTime instanceof Date
        ? startTime
        : startTime
          ? new Date(startTime)
          : new Date();
    const key = String(channelKey);

    return AuthSession.findOneAndUpdate(
      identityFilter(channel, key, "registration"),
      {
        channel,
        channelKey: key,
        type: "registration",
        step,
        data: data || {},
        startTime: started,
        expireAt: new Date(started.getTime() + REGISTRATION_TTL_MS),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  async getRegistration(channel, channelKey) {
    return this.get(channel, channelKey, "registration");
  }

  async deleteRegistration(channel, channelKey) {
    return this.delete(channel, channelKey, "registration");
  }

  async upsertPinChange(channel, channelKey, { step, startTime, data }) {
    const started =
      startTime instanceof Date
        ? startTime
        : startTime
          ? new Date(startTime)
          : new Date();
    const key = String(channelKey);

    return AuthSession.findOneAndUpdate(
      identityFilter(channel, key, "pin_change"),
      {
        channel,
        channelKey: key,
        type: "pin_change",
        step,
        data: data || {},
        startTime: started,
        expireAt: new Date(started.getTime() + PIN_CHANGE_TTL_MS),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  async getPinChange(channel, channelKey) {
    return this.get(channel, channelKey, "pin_change");
  }

  async deletePinChange(channel, channelKey) {
    return this.delete(channel, channelKey, "pin_change");
  }
}

export { SESSION_TTL_MS, REGISTRATION_TTL_MS, PIN_CHANGE_TTL_MS };
export default new SessionStore();
