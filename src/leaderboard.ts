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

const API_URL = 'https://mega-bat-rush.netlify.app/api/leaderboard';

export async function fetchLeaderboard(playerId: string): Promise<LeaderboardResponse> {
  const url = `${API_URL}?playerId=${encodeURIComponent(playerId)}`;
  const res = await fetch(url, { method: 'GET', cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as LeaderboardResponse;
}

export async function submitLeaderboardScore(save: GameSave): Promise<LeaderboardResponse | null> {
  if (save.bestDistance < 1) return null;
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId: save.playerId,
        name: save.playerName || 'Slugger',
        distance: save.bestDistance,
        leagueTier: save.leagueTier,
      }),
    });
    if (!res.ok) return null;
    return (await res.json()) as LeaderboardResponse;
  } catch {
    return null;
  }
}
