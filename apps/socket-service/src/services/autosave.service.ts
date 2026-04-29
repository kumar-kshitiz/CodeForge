import fetch from 'node-fetch';
import { env } from '../config/env';
import { debounceByKey } from '../utils/debounce';

const AUTOSAVE_DELAY_MS = 3000;

export function scheduleAutosave(roomId: string, code: string, language: string): void {
  debounceByKey(`autosave:${roomId}`, () => persistSnapshot(roomId, code, language), AUTOSAVE_DELAY_MS);
}

async function persistSnapshot(roomId: string, code: string, language: string): Promise<void> {
  try {
    const res = await fetch(`${env.apiServiceUrl}/api/rooms/${roomId}/snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-key': 'socket-service' },
      body: JSON.stringify({ code, language }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`[autosave] failed for room ${roomId}: ${res.status} ${text}`);
    } else {
      console.log(`[autosave] saved snapshot for room ${roomId}`);
    }
  } catch (err) {
    console.error('[autosave] network error:', (err as Error).message);
  }
}
