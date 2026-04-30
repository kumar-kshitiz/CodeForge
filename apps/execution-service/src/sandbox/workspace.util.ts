import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { SANDBOX_CONFIG } from '../config/sandbox.config';

export interface Workspace {
  id: string;
  dirPath: string;
  filePath: string;
}

export async function createWorkspace(code: string, extension: string = 'txt'): Promise<Workspace> {
  const id = randomUUID();
  const dirPath = path.join(SANDBOX_CONFIG.BASE_WORKSPACE_DIR, id);
  const filePath = path.join(dirPath, `source.${extension}`);

  await fs.mkdir(dirPath, { recursive: true });
  await fs.writeFile(filePath, code, 'utf-8');

  return { id, dirPath, filePath };
}

export async function cleanupWorkspace(dirPath: string): Promise<void> {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (err) {
    console.error(`[workspace] Failed to cleanup workspace at ${dirPath}:`, err);
  }
}
