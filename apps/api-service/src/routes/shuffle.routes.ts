import { randomUUID } from "crypto";
import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma/client";
import { redisPublisher as redis } from "../redis/pubsub";
import { authenticate } from "../middleware/authenticate";

const router = Router();
const TTL = 30 * 60;
interface Deck {
  id: string;
  cards: { token: string; problemId: string }[];
  selected?: string;
}

// Compare-and-swap prevents simultaneous shuffles from overwriting a selection.
const replaceDeck = `
if (redis.call('GET', KEYS[1]) or '') ~= ARGV[1] then return 0 end
redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
return 1
`;
const selectCard = `
local raw = redis.call('GET', KEYS[1])
if not raw then return {'expired'} end
local deck = cjson.decode(raw)
if deck.id ~= ARGV[1] then return {'expired'} end
if deck.selected and deck.selected ~= ARGV[2] then return {'locked'} end
for _, card in ipairs(deck.cards) do
  if card.token == ARGV[2] then
    deck.selected = card.token
    redis.call('SET', KEYS[1], cjson.encode(deck), 'KEEPTTL')
    return {'ok', card.problemId, cjson.encode(deck)}
  end
end
return {'missing'}
`;

router.use(authenticate);
router.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

router.post("/", async (req, res, next) => {
  try {
    const key = `shuffle:deck:${req.user!.id}`;
    const previousRaw = await redis.get(key);
    const previous: Deck | null = previousRaw ? JSON.parse(previousRaw) : null;
    const excluded = previous?.cards.map((card) => card.problemId) ?? [];
    // Only IDs leave PostgreSQL. Prefer unseen questions, filling from the old
    // deck only when the remaining pool cannot supply twelve cards.
    const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT id FROM problems
      WHERE status = 'PUBLISHED'
        AND (kind = 'QUESTION' OR (kind = 'CHALLENGE'
          AND challenge_ends_at <= NOW() AND publish_after_challenge = true))
      ORDER BY CASE WHEN id IN (${Prisma.join(excluded.length ? excluded : [""])})
        THEN 1 ELSE 0 END, RANDOM()
      LIMIT 12
    `);
    const deck: Deck = {
      id: randomUUID(),
      cards: rows.map(({ id }) => ({ token: randomUUID(), problemId: id })),
    };
    const saved = await redis.eval(replaceDeck, 1, key, previousRaw ?? "", JSON.stringify(deck), TTL);
    if (saved !== 1) {
      res.status(409).json({ error: "Your deck changed. Please shuffle again." });
      return;
    }
    res.json({
      deckId: deck.id,
      cards: deck.cards.map(({ token }) => ({ token })),
      expiresAt: new Date(Date.now() + TTL * 1000).toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/:deckId/select", async (req, res, next) => {
  try {
    const token = req.body?.cardToken;
    if (typeof token !== "string" || token.length > 100) {
      res.status(400).json({ error: "A valid card token is required." });
      return;
    }
    const [result, problemId, deckRaw] = await redis.eval(
      selectCard, 1, `shuffle:deck:${req.user!.id}`, req.params.deckId, token,
    ) as string[];
    if (result !== "ok") {
      res.status(result === "missing" ? 404 : 409).json({
        error: result === "locked"
          ? "This deck already has a chosen card. Shuffle again for a new deck."
          : "This card has expired or is unavailable. Please shuffle again.",
      });
      return;
    }
    const selectedDeck = JSON.parse(deckRaw) as Deck;
    const availableProblems = await prisma.problem.findMany({
      where: {
        id: { in: selectedDeck.cards.map((card) => card.problemId) },
        status: "PUBLISHED",
        OR: [
          { kind: "QUESTION" },
          { kind: "CHALLENGE", challengeEndsAt: { lte: new Date() }, publishAfterChallenge: true },
        ],
      },
      select: { id: true, slug: true, title: true },
    });
    const problemsById = new Map(availableProblems.map((problem) => [problem.id, problem]));
    const problem = problemsById.get(problemId);
    if (!problem) {
      res.status(410).json({ error: "This question is no longer available. Please shuffle again." });
      return;
    }
    res.json({
      slug: problem.slug,
      selectedToken: token,
      cards: selectedDeck.cards.map((card) => ({
        token: card.token,
        title: problemsById.get(card.problemId)?.title ?? "Question unavailable",
      })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
