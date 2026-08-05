import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateUsername,
  isUsernameShaped,
  isReservedUsername,
  suggestUsernames,
  USERNAME_PATTERN,
} from "../utils/usernamePolicy.js";

describe("usernamePolicy", () => {
  it("accepts valid usernames and normalizes case", () => {
    const result = validateUsername("Musa");
    assert.equal(result.valid, true);
    assert.equal(result.normalized, "musa");
    assert.equal(validateUsername("musa7").valid, true);
    assert.equal(validateUsername("devking").valid, true);
    assert.equal(validateUsername("chartshop1").valid, true);
  });

  it("rejects invalid shapes", () => {
    assert.equal(validateUsername("mu").valid, false);
    assert.equal(validateUsername("musa_7").valid, false);
    assert.equal(validateUsername("musa.shop").valid, false);
    assert.equal(validateUsername("7musa").valid, false);
    assert.equal(validateUsername("mu7sa").valid, false);
    assert.equal(validateUsername("verylongusername123").valid, false);
    assert.equal(USERNAME_PATTERN.test("verylongusername123"), false);
  });

  it("blocks reserved names exactly", () => {
    assert.equal(isReservedUsername("admin"), true);
    assert.equal(isReservedUsername("ChartShop"), true);
    assert.equal(validateUsername("support").valid, false);
    assert.equal(validateUsername("system").valid, false);
    assert.equal(validateUsername("chartshop").valid, false);
    assert.equal(validateUsername("chartshop1").valid, true);
  });

  it("recognizes legacy shapes for login routing only", () => {
    assert.equal(isUsernameShaped("boutique_demo"), true);
    assert.equal(isUsernameShaped("musa"), true);
    assert.equal(validateUsername("boutique_demo").valid, false);
  });

  it("suggests digit-suffix alternatives", async () => {
    const taken = new Set(["musa", "musa1"]);
    const suggestions = await suggestUsernames(
      "musa",
      async (c) => taken.has(c),
      3
    );
    assert.deepEqual(suggestions, ["musa2", "musa3", "musa4"]);
  });
});
