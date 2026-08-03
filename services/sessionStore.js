import AuthSession from "../models/AuthSession.js";

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const REGISTRATION_TTL_MS = 15 * 60 * 1000;
const PIN_CHANGE_TTL_MS = 10 * 60 * 1000;

function ttlDate(msFromNow) {
  return new Date(Date.now() + msFromNow);
}

/**
 * Mongo-backed auth session helpers (login / registration / PIN change).
 */
class SessionStore {
  async get(telegramId, type) {
    return AuthSession.findOne({ telegramId, type });
  }

  async delete(telegramId, type) {
    await AuthSession.deleteOne({ telegramId, type });
  }

  async upsertLoginSession(telegramId, { sessionToken, shopId, loginTime }) {
    const now = new Date();
    return AuthSession.findOneAndUpdate(
      { telegramId, type: "session" },
      {
        $set: {
          telegramId,
          type: "session",
          sessionToken,
          shopId,
          loginTime: loginTime || now,
          lastActivity: now,
          expireAt: ttlDate(SESSION_TTL_MS),
        },
        $unset: { step: 1, data: 1, startTime: 1 },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  async touchLoginSession(telegramId) {
    const now = new Date();
    return AuthSession.findOneAndUpdate(
      { telegramId, type: "session" },
      {
        lastActivity: now,
        expireAt: ttlDate(SESSION_TTL_MS),
      },
      { new: true }
    );
  }

  async getLoginSession(telegramId) {
    return this.get(telegramId, "session");
  }

  async deleteLoginSession(telegramId) {
    return this.delete(telegramId, "session");
  }

  async upsertRegistration(telegramId, { step, data, startTime }) {
    const started =
      startTime instanceof Date
        ? startTime
        : startTime
          ? new Date(startTime)
          : new Date();

    return AuthSession.findOneAndUpdate(
      { telegramId, type: "registration" },
      {
        telegramId,
        type: "registration",
        step,
        data: data || {},
        startTime: started,
        expireAt: new Date(started.getTime() + REGISTRATION_TTL_MS),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  async getRegistration(telegramId) {
    return this.get(telegramId, "registration");
  }

  async deleteRegistration(telegramId) {
    return this.delete(telegramId, "registration");
  }

  async upsertPinChange(telegramId, { step, startTime, data }) {
    const started =
      startTime instanceof Date
        ? startTime
        : startTime
          ? new Date(startTime)
          : new Date();

    return AuthSession.findOneAndUpdate(
      { telegramId, type: "pin_change" },
      {
        telegramId,
        type: "pin_change",
        step,
        data: data || {},
        startTime: started,
        expireAt: new Date(started.getTime() + PIN_CHANGE_TTL_MS),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  async getPinChange(telegramId) {
    return this.get(telegramId, "pin_change");
  }

  async deletePinChange(telegramId) {
    return this.delete(telegramId, "pin_change");
  }
}

export {
  SESSION_TTL_MS,
  REGISTRATION_TTL_MS,
  PIN_CHANGE_TTL_MS,
};
export default new SessionStore();
