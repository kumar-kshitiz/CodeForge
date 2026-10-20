import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env";
import { authenticate } from "../middleware/authenticate";
import { getQuestionCatalog } from "../services/catalog.service";
import * as matches from "../services/match.service";

const router = Router();

const createSchema = z.object({
  name: z.string().trim().min(3).max(60),
  teamCount: z.number().int().min(2).max(4),
  durationMinutes: z.number().int().min(5).max(180),
});
const difficultySchema = z.object({
  difficulty: z.enum(["EASY", "MEDIUM", "TOUGH"]),
});

router.post("/internal/scores", async (req, res, next) => {
  try {
    if (req.header("x-internal-key") !== env.internalServiceKey) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const input = z
      .object({
        matchId: z.string().uuid(),
        userId: z.string().min(1),
        problemId: z.string().min(1),
        passedTestCases: z.number().int().min(0),
        totalTestCases: z.number().int().min(0),
        verdict: z.string().optional(),
      })
      .parse(req.body);
    res.json({ match: await matches.recordScore(input) });
  } catch (error) {
    next(error);
  }
});

router.post("/internal/validate-submission", async (req, res, next) => {
  try {
    if (req.header("x-internal-key") !== env.internalServiceKey) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const input = z
      .object({
        matchId: z.string().uuid(),
        userId: z.string().min(1),
        problemId: z.string().min(1),
      })
      .parse(req.body);
    await matches.validateCodingSubmission(input);
    res.json({ allowed: true });
  } catch (error) {
    next(error);
  }
});

router.use(authenticate);

router.post("/", async (req, res, next) => {
  try {
    res.status(201).json({
      match: await matches.createMatch(req.user!, createSchema.parse(req.body)),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/join-by-code", async (req, res, next) => {
  try {
    const { inviteCode } = z
      .object({ inviteCode: z.string().trim().min(6).max(16) })
      .parse(req.body);
    res.json({
      match: await matches.joinMatchByCode(inviteCode, req.user!),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/mine", async (req, res, next) => {
  try {
    res.json({ match: await matches.getCurrentMatch(req.user!.id) });
  } catch (error) {
    next(error);
  }
});

router.get("/:matchId", async (req, res, next) => {
  try {
    let match = await matches.getMatch(req.params.matchId);
    if (!match) {
      res.status(404).json({ error: "Match not found" });
      return;
    }
    const isParticipant = match.teams.some((team) =>
      team.players.some((player) => player.userId === req.user!.id),
    );
    if (!isParticipant) {
      res.status(403).json({ error: "This is an invite-only squad" });
      return;
    }
    if (match.status === "LIVE" && match.endsAt && Date.now() >= Date.parse(match.endsAt)) {
      match = await matches.finishExpiredMatch(match.id);
    }
    res.json({ match });
  } catch (error) {
    next(error);
  }
});

router.post("/:matchId/difficulty", async (req, res, next) => {
  try {
    const { difficulty } = difficultySchema.parse(req.body);
    res.json({
      match: await matches.voteDifficulty(
        req.params.matchId,
        difficulty,
        req.user!.id,
      ),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/:matchId/start-matchmaking", async (req, res, next) => {
  try {
    res.json({
      match: await matches.startMatchmaking(req.params.matchId, req.user!.id),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/:matchId/ability/activate", async (req, res, next) => {
  try {
    res.json({
      match: await matches.activateAbility(req.params.matchId, req.user!.id),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:matchId/ability/puzzle", async (req, res, next) => {
  try {
    res.json({
      puzzle: await matches.getAbilityPuzzle(req.params.matchId, req.user!.id),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/:matchId/ability/answer", async (req, res, next) => {
  try {
    const { puzzleId, option, answerText } = z
      .object({
        puzzleId: z.string().min(1),
        option: z.number().int().min(0).max(5).optional(),
        answerText: z.string().trim().min(1).max(240).optional(),
      })
      .refine((value) => value.option !== undefined || value.answerText, {
        message: "Choose an option or enter an answer",
      })
      .parse(req.body);
    res.json({
      result: await matches.answerAbilityPuzzle(
        req.params.matchId,
        req.user!.id,
        puzzleId,
        { option, answerText },
      ),
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/:matchId", async (req, res, next) => {
  try {
    await matches.destroySquad(req.params.matchId, req.user!.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get("/:matchId/questions", async (req, res, next) => {
  try {
    const match = await matches.getMatch(req.params.matchId);
    if (!match?.difficulty) {
      res.status(409).json({ error: "Difficulty has not been agreed" });
      return;
    }
    const leader = match.teams.some((team) => team.leaderId === req.user!.id);
    if (!leader) {
      res.status(403).json({ error: "Only team leaders can view the draft pool" });
      return;
    }
    res.json({ questions: await getQuestionCatalog(match.difficulty) });
  } catch (error) {
    next(error);
  }
});

router.post("/:matchId/draft", async (req, res, next) => {
  try {
    const { questionIds } = z
      .object({ questionIds: z.array(z.string()).min(1).max(8) })
      .parse(req.body);
    res.json({
      match: await matches.submitDraft(
        req.params.matchId,
        questionIds,
        req.user!.id,
      ),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
