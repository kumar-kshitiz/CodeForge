import { z } from 'zod';

export const createRoomSchema = z.object({
  title: z.string().min(1).max(100),
});

export const snapshotSchema = z.object({
  code: z.string(),
  language: z.string().min(1),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type SnapshotInput = z.infer<typeof snapshotSchema>;
