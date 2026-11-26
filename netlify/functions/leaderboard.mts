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
const BOARD_KEY = 'global-top-v2';

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
  return String(raw || '')
    .replace(/[<>&"'`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 14);
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
      const visible = entries
        .filter((e) => e.distance > 0)
        .sort((a, b) => b.distance - a.distance || a.updatedAt - b.updatedAt);
      const rankIdx = playerId ? visible.findIndex((e) => e.playerId === playerId) : -1;
      return jsonResponse({
        entries: visible.slice(0, 50),
        totalPlayers: visible.length,
        yourRank: rankIdx >= 0 ? rankIdx + 1 : null,
      });
    }

    if (req.method === 'POST') {
      const body = (await req.json()) as Partial<LeaderboardEntry> & { checkOnly?: boolean };
      const playerId = String(body.playerId || '')
        .replace(/[^a-zA-Z0-9_-]/g, '')
        .slice(0, 40);
      const rawDist = Number(body.distance ?? 0);
      const distance = Number.isFinite(rawDist) ? Math.max(0, Math.min(25000, Math.round(rawDist))) : 0;
      const leagueTier = Math.max(0, Math.min(4, Math.round(Number(body.leagueTier) || 0)));
      const name = sanitizeName(body.name);

      if (!playerId || name.length < 2) {
        return jsonResponse({ error: 'INVALID_NAME', message: 'Name must be at least 2 characters.' }, 400);
      }

      // Enforce case-insensitive unique usernames across all other players!
      const lower = name.toLowerCase();
      const nameTaken = entries.some(
        (e) => e.playerId !== playerId && e.name.trim().toLowerCase() === lower
      );
      if (nameTaken) {
        return jsonResponse(
          { error: 'NAME_TAKEN', message: 'That username is already taken!' },
          409
        );
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
      const trimmed = entries.slice(0, 150);
      await store.setJSON(BOARD_KEY, trimmed);

      const visible = trimmed.filter((e) => e.distance > 0);
      const rankIdx = visible.findIndex((e) => e.playerId === playerId);
      return jsonResponse({
        ok: true,
        entries: visible.slice(0, 50),
        totalPlayers: visible.length,
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
