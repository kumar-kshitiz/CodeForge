// Run: node --test apps/api-service/src/routes/shuffle.routes.test.cjs
const { test } = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
process.env.TS_NODE_PROJECT = require("node:path").join(__dirname, "../../tsconfig.json");
require("ts-node/register/transpile-only");

const calls = [];
let previous = null;
let result = 1;
let rows = Array.from({ length: 12 }, (_, i) => ({ id: `private-question-${i}` }));
const originalLoad = Module._load;
Module._load = function (name, parent, ...rest) {
  if (parent?.filename.endsWith("shuffle.routes.ts")) {
    if (name === "../prisma/client") return { prisma: {
      $queryRaw: async (query) => { calls.push(["query", query]); return rows; },
      problem: { findMany: async () => [
        { id: "private-question-1", slug: "selected-question", title: "Selected Question" },
        { id: "private-question-2", slug: "another-question", title: "Another Question" },
      ] },
    } };
    if (name === "../redis/pubsub") return { redisPublisher: {
      get: async (key) => { calls.push(["get", key]); return previous; },
      eval: async (...args) => { calls.push(["eval", ...args]); return result; },
    } };
    if (name === "../middleware/authenticate") return { authenticate: (_req, _res, next) => next() };
  }
  return originalLoad.call(this, name, parent, ...rest);
};
const router = require("./shuffle.routes.ts").default;
Module._load = originalLoad;

async function request(path, body = {}) {
  const route = router.stack.find((layer) => layer.route?.path === path).route;
  const response = { statusCode: 200, status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; } };
  await route.stack[0].handle(
    { user: { id: "alice" }, params: { deckId: "deck-1" }, body },
    response, (error) => { throw error; },
  );
  return response;
}

test("deck exposes twelve opaque tokens, stores assignments with a TTL, and excludes prior IDs", async () => {
  previous = JSON.stringify({ id: "old-deck", cards: [{ token: "old", problemId: "old-question" }] });
  const response = await request("/");
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.cards.length, 12);
  assert.equal(new Set(response.body.cards.map((card) => card.token)).size, 12);
  assert.ok(response.body.cards.every((card) => Object.keys(card).join() === "token"));
  assert.ok(!JSON.stringify(response.body).includes("private-question"));
  const query = calls.find(([type]) => type === "query")[1];
  assert.ok(query.values.includes("old-question"));
  const saved = calls.find(([type]) => type === "eval");
  assert.equal(saved[3], "shuffle:deck:alice");
  assert.equal(saved[4], previous);
  assert.equal(JSON.parse(saved[5]).cards[0].problemId, "private-question-0");
  assert.equal(saved[6], 1800);
});

test("a concurrent deck change returns a conflict", async () => {
  result = 0;
  assert.equal((await request("/")).statusCode, 409);
});

test("empty question pools return an empty deck", async () => {
  result = 1;
  rows = [];
  assert.deepEqual((await request("/")).body.cards, []);
});

test("selection resolves only a valid token and handles expired, locked and missing cards", async () => {
  assert.equal((await request("/:deckId/select", {})).statusCode, 400);
  for (const [state, status] of [["expired", 409], ["locked", 409], ["missing", 404]]) {
    result = [state];
    const response = await request("/:deckId/select", { cardToken: "opaque-token" });
    assert.equal(response.statusCode, status);
    assert.equal(response.body.slug, undefined);
  }
  result = ["ok", "private-question-1", JSON.stringify({
    id: "deck-1",
    selected: "opaque-token",
    cards: [
      { token: "opaque-token", problemId: "private-question-1" },
      { token: "other-token", problemId: "private-question-2" },
    ],
  })];
  assert.deepEqual((await request("/:deckId/select", { cardToken: "opaque-token" })).body, {
    slug: "selected-question",
    selectedToken: "opaque-token",
    cards: [
      { token: "opaque-token", title: "Selected Question" },
      { token: "other-token", title: "Another Question" },
    ],
  });
});
