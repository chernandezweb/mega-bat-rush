import { getStore } from '@netlify/blobs';
import type { Config, Context } from '@netlify/functions';

interface LeaderboardEntry {
  playerId: string;
  name: string;
  distance: number;
  leagueTier: number;
  updatedAt: number;
}

const STORE_NAME = 'mega-bat-leaderboard';
const BOARD_KEY = 'global-top-v1';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: CORS_HEADERS });
}

function sanitizeName(raw: unknown): string {
  const cleaned = String(raw || 'Slugger')
    .replace(/[<>&"'`]/g, '')
    .trim()
    .slice(0, 14);
  return cleaned || 'Slugger';
}

export default async (req: Request, _context: Context): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const store = getStore(STORE_NAME);
    const existing = (await store.get(BOARD_KEY, { type: 'json' })) as LeaderboardEntry[] | null;
    const entries: LeaderboardEntry[] = Array.isArray(existing) ? existing : [];

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const playerId = url.searchParams.get('playerId') || '';
      entries.sort((a, b) => b.distance - a.distance || a.updatedAt - b.updatedAt);
      const rankIdx = playerId ? entries.findIndex((e) => e.playerId === playerId) : -1;
      return jsonResponse({
        entries: entries.slice(0, 50),
        totalPlayers: entries.length,
        yourRank: rankIdx >= 0 ? rankIdx + 1 : null,
      });
    }

    if (req.method === 'POST') {
      const body = (await req.json()) as Partial<LeaderboardEntry>;
      const playerId = String(body.playerId || '')
        .replace(/[^a-zA-Z0-9_-]/g, '')
        .slice(0, 40);
      const distance = Math.round(Number(body.distance));
      const leagueTier = Math.max(0, Math.min(4, Math.round(Number(body.leagueTier) || 0)));
      const name = sanitizeName(body.name);

      if (!playerId || !Number.isFinite(distance) || distance < 1 || distance > 25000) {
        return jsonResponse({ error: 'Invalid score payload' }, 400);
      }

      const now = Date.now();
      const idx = entries.findIndex((e) => e.playerId === playerId);
      if (idx >= 0) {
        entries[idx] = {
          playerId,
          name,
          distance: Math.max(entries[idx].distance, distance),
          leagueTier: Math.max(entries[idx].leagueTier, leagueTier),
          updatedAt: now,
        };
      } else {
        entries.push({ playerId, name, distance, leagueTier, updatedAt: now });
      }

      entries.sort((a, b) => b.distance - a.distance || a.updatedAt - b.updatedAt);
      const trimmed = entries.slice(0, 100);
      await store.setJSON(BOARD_KEY, trimmed);

      const rankIdx = trimmed.findIndex((e) => e.playerId === playerId);
      return jsonResponse({
        ok: true,
        entries: trimmed.slice(0, 50),
        totalPlayers: trimmed.length,
        yourRank: rankIdx >= 0 ? rankIdx + 1 : null,
      });
    }

    return jsonResponse({ error: 'Method not allowed' }, 405);
  } catch (err) {
    return jsonResponse({ error: 'Leaderboard error', detail: String(err) }, 500);
  }
};

export const config: Config = {
  path: '/api/leaderboard',
};
