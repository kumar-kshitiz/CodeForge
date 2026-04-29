import { Request, Response, NextFunction } from 'express';
import { createRoomSchema, snapshotSchema } from '../validators/room.validator';
import * as roomService from '../services/room.service';

export async function createRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = createRoomSchema.parse(req.body);
    const room = await roomService.createRoom(req.user!.id, input);
    res.status(201).json({ room });
  } catch (err) {
    next(err);
  }
}

export async function getRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const room = await roomService.getRoomById(req.params.id);
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }
    res.json({ room });
  } catch (err) {
    next(err);
  }
}

export async function listRooms(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rooms = await roomService.getUserRooms(req.user!.id);
    res.json({ rooms });
  } catch (err) {
    next(err);
  }
}

export async function saveSnapshot(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const internalKey = req.headers['x-internal-key'];
    if (internalKey !== 'socket-service' && !req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const input = snapshotSchema.parse(req.body);
    const snapshot = await roomService.saveSnapshot(req.params.id, input);
    res.status(201).json({ snapshot });
  } catch (err) {
    next(err);
  }
}

export async function getSnapshot(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const snapshot = await roomService.getLatestSnapshot(req.params.id);
    if (!snapshot) {
      res.status(404).json({ error: 'No snapshot found' });
      return;
    }
    res.json({ snapshot });
  } catch (err) {
    next(err);
  }
}
