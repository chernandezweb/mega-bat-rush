import { GameSave } from './state';

export interface LeaderboardEntry {
  playerId: string;
  name: string;
  distance: number;
  leagueTier: number;
  updatedAt: number;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  totalPlayers: number;
  yourRank: number | null;
}

export interface SubmitResult {
  ok: boolean;
  error?: 'NAME_TAKEN' | 'INVALID_NAME' | 'NETWORK';
  data?: LeaderboardResponse;
}

const API_URL = 'https://mega-bat-rush.netlify.app/api/leaderboard';

export async function fetchLeaderboard(playerId: string): Promise<LeaderboardResponse> {
  const url = `${API_URL}?playerId=${encodeURIComponent(playerId)}`;
  const res = await fetch(url, { method: 'GET', cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as LeaderboardResponse;
}

export async function submitLeaderboardScore(
  save: GameSave,
  allowZeroDistance = false
): Promise<SubmitResult> {
  if (!allowZeroDistance && save.bestDistance < 1) return { ok: false };
  const name = (save.playerName || '').trim();
  if (name.length < 2) return { ok: false, error: 'INVALID_NAME' };

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId: save.playerId,
        name,
        distance: save.bestDistance,
        leagueTier: save.leagueTier,
      }),
    });
    if (res.status === 409) {
      return { ok: false, error: 'NAME_TAKEN' };
    }
    if (res.status === 400) {
      return { ok: false, error: 'INVALID_NAME' };
    }
    if (!res.ok) return { ok: false, error: 'NETWORK' };
    const data = (await res.json()) as LeaderboardResponse;
    return { ok: true, data };
  } catch {
    return { ok: false, error: 'NETWORK' };
  }
}
