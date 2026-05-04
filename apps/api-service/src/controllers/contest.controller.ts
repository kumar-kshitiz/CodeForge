import { Request, Response, NextFunction } from 'express';
import * as contestService from '../services/contest.service';

export async function listContests(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const contests = await contestService.listContests();
    res.json({ contests });
  } catch (err) {
    next(err);
  }
}

export async function getContest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const contest = await contestService.getContest(req.params.id);
    if (!contest) {
      res.status(404).json({ error: 'Contest not found' });
      return;
    }
    
    const now = new Date();
    const status = contest.endTime < now ? 'PAST' : contest.startTime > now ? 'UPCOMING' : 'ACTIVE';
    
    res.json({ contest: { ...contest, status } });
  } catch (err) {
    next(err);
  }
}

export async function joinContest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const participation = await contestService.joinContest(req.params.id, req.user!.id);
    res.json({ participation });
  } catch (err) {
    next(err);
  }
}

export async function getLeaderboard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const leaderboard = await contestService.getLeaderboard(req.params.id);
    res.json({ leaderboard });
  } catch (err) {
    next(err);
  }
}
