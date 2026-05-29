const test = require("node:test");
const assert = require("node:assert");
const { hashPassword, verifyPassword } = require("../server/auth");

test("hash + verify round-trip", async () => {
  const h = await hashPassword("secret123");
  assert.notStrictEqual(h, "secret123");
  assert.strictEqual(await verifyPassword("secret123", h), true);
  assert.strictEqual(await verifyPassword("wrong", h), false);
});
