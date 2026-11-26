import { detectDefaultLang, Lang } from './i18n';

export interface PowerupDef {
  id: 'fireball' | 'superbounce' | 'magnet' | 'sweetspot' | 'lowgrav' | 'goldenpitch';
  name: string;
  emoji: string;
  desc: string;
  cost: number;
  costRatio: number; // fraction of current Bat upgrade cost for coin powerups
  cooldownSwings: number;
  currency: 'coins' | 'gems';
  color: string;
}

export interface ShopItem {
  id: string;
  category: 'bats' | 'helmets' | 'trails' | 'skins';
  name: string;
  emoji: string;
  desc: string;
  cost: number;
  currency: 'coins' | 'gems';
  primaryColor: number;
  secondaryColor?: number;
  emissive?: number;
  shape?: string;
  powerBonus?: number;
  coinBonus?: number;
  sweetSpotBonus?: number;
  glideBonus?: number;
}

export interface GearSetBonus {
  id: 'storm' | 'midas' | 'cosmic';
  name: string;
  emoji: string;
  desc: string;
  helmetId: string;
  batId: string;
  trailId: string;
}

export interface WallDef {
  id: string;
  distance: number;
  name: string;
  worldUnlocked: string;
  maxHp: number;
  color: number;
  accent: number;
  rewardGems: number;
  coinMultBonus: number;
}

export interface BossDef {
  id: 'flamethrower' | 'knuckle' | 'phantom' | 'emperor';
  name: string;
  pitchName: string;
  emoji: string;
  color: number;
  hatColor: number;
  coinMult: number;
}

export interface LeagueDef {
  tier: number;
  name: string;
  emoji: string;
  reqDistance: number;
  coinMult: number;
  powerMult: number;
  relicDesc: string;
}

export interface RivalChallenge {
  name: string;
  distance: number;
  beaten: boolean;
}

export interface Mission {
  id: string;
  type: 'distance' | 'perfects' | 'upgrades' | 'bonuses' | 'swings' | 'coins';
  title: string;
  target: number;
  progress: number;
  rewardGems: number;
  tier: number;
}

export interface GameSave {
  playerId: string;
  playerName: string;
  coins: number;
  gems: number;
  bestDistance: number;
  batLevel: number;
  muscleLevel: number;
  incomeLevel: number;
  leagueTier: number; // 0 = Rookie, 1 = Minor, 2 = Major, 3 = All-Star, 4 = Hall of Fame
  combo: number;
  totalSwings: number;
  totalPerfects: number;
  totalUpgrades: number;
  totalBonuses: number;
  totalCoinsEarned: number;
  bossDefeats: number;
  wallDamage: Record<string, number>; // damage dealt to each wall
  brokenWalls: string[];
  ownedItems: string[];
  equippedBat: string;
  equippedHelmet: string;
  equippedTrail: string;
  equippedSkin: string;
  activePowerups: Record<string, boolean>;
  powerupCooldowns: Record<string, number>;
  missions: Mission[];
  soundEnabled: boolean;
  musicEnabled: boolean;
  hapticsEnabled: boolean;
  lang: Lang;
}

export const WALLS: WallDef[] = [
  {
    id: 'wall_park',
    distance: 150,
    name: 'PARK FENCE',
    worldUnlocked: 'DOWNTOWN',
    maxHp: 140,
    color: 0xb45309,
    accent: 0xfde68a,
    rewardGems: 10,
    coinMultBonus: 0.25,
  },
  {
    id: 'wall_glass',
    distance: 350,
    name: 'GLASS TOWER',
    worldUnlocked: 'SUNSET CANYON',
    maxHp: 340,
    color: 0x38bdf8,
    accent: 0xe0f2fe,
    rewardGems: 18,
    coinMultBonus: 0.4,
  },
  {
    id: 'wall_cyber',
    distance: 700,
    name: 'CYBER BARRIER',
    worldUnlocked: 'NEON STRIP',
    maxHp: 680,
    color: 0xa855f7,
    accent: 0xf0abfc,
    rewardGems: 28,
    coinMultBonus: 0.6,
  },
  {
    id: 'wall_space',
    distance: 1200,
    name: 'ORBITAL SHIELD',
    worldUnlocked: 'COSMIC ZONE',
    maxHp: 1200,
    color: 0xfacc15,
    accent: 0x38bdf8,
    rewardGems: 45,
    coinMultBonus: 0.9,
  },
];

export const BOSSES: BossDef[] = [
  {
    id: 'flamethrower',
    name: 'THE FLAMETHROWER',
    pitchName: '🔥 TURBO SPLITTER',
    emoji: '🔥',
    color: 0xdc2626,
    hatColor: 0xf97316,
    coinMult: 2.0,
  },
  {
    id: 'knuckle',
    name: 'CURVEBALL KING',
    pitchName: '🌀 WOBBLE KNUCKLE',
    emoji: '🌀',
    color: 0x7c3aed,
    hatColor: 0x38bdf8,
    coinMult: 2.2,
  },
  {
    id: 'phantom',
    name: 'PHANTOM ACE',
    pitchName: '👻 GHOST PITCH',
    emoji: '👻',
    color: 0x0f172a,
    hatColor: 0x22d3ee,
    coinMult: 2.5,
  },
  {
    id: 'emperor',
    name: 'GOLDEN EMPEROR',
    pitchName: '👑 HEAVY GOLD BALL (4×)',
    emoji: '👑',
    color: 0xd97706,
    hatColor: 0xfacc15,
    coinMult: 4.0,
  },
];

export const GEAR_SETS: GearSetBonus[] = [
  {
    id: 'storm',
    name: 'Storm God Set',
    emoji: '⚡',
    desc: 'Lightning bounces (+14% bounce carry & +15 coins per bounce!)',
    helmetId: 'helmet_viking',
    batId: 'bat_hammer',
    trailId: 'trail_electric',
  },
  {
    id: 'midas',
    name: 'Royal Midas Set',
    emoji: '👑',
    desc: '+45% total coins & every 4th pitch is Golden!',
    helmetId: 'helmet_crown',
    batId: 'bat_gold',
    trailId: 'trail_gold',
  },
  {
    id: 'cosmic',
    name: 'Cosmic Ace Set',
    emoji: '🌌',
    desc: '-18% gravity & +12% launch velocity!',
    helmetId: 'helmet_astro',
    batId: 'bat_galaxy',
    trailId: 'trail_rainbow',
  },
];

export const LEAGUES: LeagueDef[] = [
  { tier: 0, name: 'Rookie Park', emoji: '⚾', reqDistance: 0, coinMult: 1.0, powerMult: 1.0, relicDesc: 'Welcome to the big leagues!' },
  { tier: 1, name: 'Minor League', emoji: '🥉', reqDistance: 300, coinMult: 1.45, powerMult: 1.12, relicDesc: 'Relic: +15% Wall Smash damage & 1.45× coins!' },
  { tier: 2, name: 'Major League', emoji: '🥈', reqDistance: 650, coinMult: 2.1, powerMult: 1.26, relicDesc: 'Relic: Free Fireball every 5th swing & 2.1× coins!' },
  { tier: 3, name: 'All-Star Pro', emoji: '🥇', reqDistance: 1150, coinMult: 3.0, powerMult: 1.42, relicDesc: 'Relic: +50% Gem drops from chests & 3× coins!' },
  { tier: 4, name: 'Hall of Fame', emoji: '🏆', reqDistance: 1850, coinMult: 4.5, powerMult: 1.62, relicDesc: 'Relic: +20% permanent bounce carry & 4.5× coins!' },
];

export const POWERUPS: PowerupDef[] = [
  {
    id: 'fireball',
    name: 'Fireball Slugger',
    emoji: '🔥',
    desc: '+22% launch power & extra wall smash damage',
    cost: 120,
    costRatio: 0.55,
    cooldownSwings: 3,
    currency: 'coins',
    color: '#ef4444',
  },
  {
    id: 'sweetspot',
    name: 'Giant Sweet Spot',
    emoji: '🎯',
    desc: 'Widens the PERFECT hit window!',
    cost: 90,
    costRatio: 0.42,
    cooldownSwings: 3,
    currency: 'coins',
    color: '#22c55e',
  },
  {
    id: 'superbounce',
    name: 'Hyper Bounce',
    emoji: '⚡',
    desc: 'Bouncier ball + extra jump pads ahead',
    cost: 140,
    costRatio: 0.62,
    cooldownSwings: 3,
    currency: 'coins',
    color: '#06b6d4',
  },
  {
    id: 'lowgrav',
    name: 'Moon Glide',
    emoji: '🪶',
    desc: '18% lower gravity for longer hangtime',
    cost: 160,
    costRatio: 0.7,
    cooldownSwings: 4,
    currency: 'coins',
    color: '#6366f1',
  },
  {
    id: 'magnet',
    name: 'Coin Magnet',
    emoji: '🧲',
    desc: 'Pulls air coin rings & 2× ring payout',
    cost: 180,
    costRatio: 0.78,
    cooldownSwings: 4,
    currency: 'coins',
    color: '#a855f7',
  },
  {
    id: 'goldenpitch',
    name: 'Golden Pitch',
    emoji: '💎',
    desc: '2.2× total coin payout on your next hit!',
    cost: 15,
    costRatio: 0,
    cooldownSwings: 5,
    currency: 'gems',
    color: '#f59e0b',
  },
];

export const SHOP_ITEMS: ShopItem[] = [
  // ===== BATS =====
  { id: 'bat_wood', category: 'bats', name: 'Classic Ash', emoji: '🏏', desc: 'Reliable park slugger', cost: 0, currency: 'coins', primaryColor: 0xd9a066, secondaryColor: 0x222222, shape: 'classic', powerBonus: 0 },
  { id: 'bat_pro_metal', category: 'bats', name: 'Pro Alloy', emoji: '⚾', desc: '+6% swing power', cost: 180, currency: 'coins', primaryColor: 0xe2e8f0, secondaryColor: 0x2563eb, shape: 'alloy', powerBonus: 0.06 },
  { id: 'bat_mace', category: 'bats', name: 'Spiked Crusher', emoji: '⚔️', desc: '+12% swing power', cost: 520, currency: 'coins', primaryColor: 0x475569, secondaryColor: 0x94a3b8, shape: 'mace', powerBonus: 0.12 },
  { id: 'bat_neon', category: 'bats', name: 'Cyber Saber', emoji: '⚡', desc: '+18% swing power', cost: 1100, currency: 'coins', primaryColor: 0x22d3ee, secondaryColor: 0x0f172a, emissive: 0x0891b2, shape: 'saber', powerBonus: 0.18 },
  { id: 'bat_hammer', category: 'bats', name: 'Thunder Hammer', emoji: '🔨', desc: '+24% power (Storm Set)', cost: 28, currency: 'gems', primaryColor: 0x94a3b8, secondaryColor: 0x78350f, emissive: 0x38bdf8, shape: 'hammer', powerBonus: 0.24 },
  { id: 'bat_magma', category: 'bats', name: 'Magma Club', emoji: '🌋', desc: '+30% swing power', cost: 50, currency: 'gems', primaryColor: 0xf97316, secondaryColor: 0x450a0a, emissive: 0xdc2626, shape: 'mace', powerBonus: 0.3 },
  { id: 'bat_gold', category: 'bats', name: 'Royal Scepter', emoji: '👑', desc: '+35% pwr +15% coins (Midas)', cost: 85, currency: 'gems', primaryColor: 0xfacc15, secondaryColor: 0x854d0e, emissive: 0xb45309, shape: 'scepter', powerBonus: 0.35, coinBonus: 0.15 },
  { id: 'bat_galaxy', category: 'bats', name: 'Void Nova', emoji: '🌌', desc: '+45% power (Cosmic Set)', cost: 140, currency: 'gems', primaryColor: 0xc084fc, secondaryColor: 0x1e1b4b, emissive: 0x9333ea, shape: 'saber', powerBonus: 0.45 },

  // ===== HELMETS =====
  { id: 'helmet_cap', category: 'helmets', name: 'Park Cap', emoji: '🧢', desc: 'Classic baseball cap', cost: 0, currency: 'coins', primaryColor: 0x1d4ed8, secondaryColor: 0xffffff, shape: 'cap' },
  { id: 'helmet_pro', category: 'helmets', name: 'Pro Helmet', emoji: '⛑️', desc: '+10% coin gain', cost: 160, currency: 'coins', primaryColor: 0xef4444, secondaryColor: 0xf8fafc, shape: 'batting', coinBonus: 0.1 },
  { id: 'helmet_viking', category: 'helmets', name: 'Viking Horns', emoji: '🪖', desc: '+10% power (Storm Set)', cost: 460, currency: 'coins', primaryColor: 0x64748b, secondaryColor: 0xfef3c7, shape: 'viking', powerBonus: 0.1 },
  { id: 'helmet_visor', category: 'helmets', name: 'Cyber Visor', emoji: '🕶️', desc: '+28% sweet spot size', cost: 850, currency: 'coins', primaryColor: 0x0f172a, secondaryColor: 0x22d3ee, emissive: 0x06b6d4, shape: 'visor', sweetSpotBonus: 0.28 },
  { id: 'helmet_mohawk', category: 'helmets', name: 'Blaze Mohawk', emoji: '🔥', desc: '+16% power & +10% coins', cost: 24, currency: 'gems', primaryColor: 0x1e293b, secondaryColor: 0xf97316, emissive: 0xea580c, shape: 'mohawk', powerBonus: 0.16, coinBonus: 0.1 },
  { id: 'helmet_astro', category: 'helmets', name: 'Astro Dome', emoji: '👩‍🚀', desc: '+16% glide (Cosmic Set)', cost: 48, currency: 'gems', primaryColor: 0xf8fafc, secondaryColor: 0x38bdf8, emissive: 0x0284c7, shape: 'astro', glideBonus: 0.16 },
  { id: 'helmet_crown', category: 'helmets', name: 'MVP Crown', emoji: '👑', desc: '+30% coins +15% pwr (Midas)', cost: 80, currency: 'gems', primaryColor: 0xfacc15, secondaryColor: 0xef4444, emissive: 0xd97706, shape: 'crown', coinBonus: 0.3, powerBonus: 0.15 },

  // ===== TRAILS =====
  { id: 'trail_classic', category: 'trails', name: 'Air Streak', emoji: '💨', desc: 'Clean white wind trail', cost: 0, currency: 'coins', primaryColor: 0xffffff },
  { id: 'trail_fire', category: 'trails', name: 'Blaze Comet', emoji: '🔥', desc: 'Fiery orange sparks', cost: 320, currency: 'coins', primaryColor: 0xff5500, emissive: 0xff2200 },
  { id: 'trail_electric', category: 'trails', name: 'Volt Bolt', emoji: '⚡', desc: 'Electric cyan (Storm Set)', cost: 20, currency: 'gems', primaryColor: 0x38bdf8, emissive: 0x0284c7 },
  { id: 'trail_rainbow', category: 'trails', name: 'Prism Hyper', emoji: '🌈', desc: 'Rainbow ribbon (Cosmic Set)', cost: 50, currency: 'gems', primaryColor: 0xf472b6, emissive: 0xec4899 },
  { id: 'trail_gold', category: 'trails', name: 'Midas Dust', emoji: '✨', desc: 'Golden comet (Midas Set)', cost: 85, currency: 'gems', primaryColor: 0xfde047, emissive: 0xeab308 },

  // ===== BATTER SKINS =====
  { id: 'skin_blue', category: 'skins', name: 'Park Blue', emoji: '🔵', desc: 'Original hero', cost: 0, currency: 'coins', primaryColor: 0x0ea5e9 },
  { id: 'skin_emerald', category: 'skins', name: 'Turbo Mint', emoji: '🟢', desc: 'Fresh park ace', cost: 280, currency: 'coins', primaryColor: 0x10b981 },
  { id: 'skin_violet', category: 'skins', name: 'Hyper Violet', emoji: '🟣', desc: 'Neon slugger', cost: 680, currency: 'coins', primaryColor: 0x8b5cf6 },
  { id: 'skin_gold', category: 'skins', name: 'MVP Gold', emoji: '🏆', desc: 'Shining champion', cost: 42, currency: 'gems', primaryColor: 0xfbbf24, emissive: 0x92400e },
  { id: 'skin_shadow', category: 'skins', name: 'Shadow Pro', emoji: '🥷', desc: 'Stealth obsidian', cost: 70, currency: 'gems', primaryColor: 0x1e293b, emissive: 0x38bdf8 },
];

const SAVE_KEY = 'mega_bat_rush_save_v2';

export function createInitialMissions(): Mission[] {
  return [
    { id: 'm_dist', type: 'distance', title: 'Hit a ball 80m', target: 80, progress: 0, rewardGems: 12, tier: 1 },
    { id: 'm_perf', type: 'perfects', title: 'Land 2 Perfect Hits', target: 2, progress: 0, rewardGems: 16, tier: 1 },
    { id: 'm_upg', type: 'upgrades', title: 'Buy 3 Upgrades', target: 3, progress: 0, rewardGems: 12, tier: 1 },
    { id: 'm_bon', type: 'bonuses', title: 'Hit 2 Pads, Taxis or Rings', target: 2, progress: 0, rewardGems: 14, tier: 1 },
  ];
}

function generatePlayerId(): string {
  try {
    if (crypto && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID().replace(/-/g, '').slice(0, 20);
    }
  } catch { /* fallback */ }
  return 'p_' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
}

export function createDefaultSave(): GameSave {
  return {
    playerId: generatePlayerId(),
    playerName: 'Slugger',
    coins: 45,
    gems: 15,
    bestDistance: 0,
    batLevel: 1,
    muscleLevel: 1,
    incomeLevel: 1,
    leagueTier: 0,
    combo: 0,
    totalSwings: 0,
    totalPerfects: 0,
    totalUpgrades: 0,
    totalBonuses: 0,
    totalCoinsEarned: 0,
    bossDefeats: 0,
    wallDamage: {},
    brokenWalls: [],
    ownedItems: ['bat_wood', 'helmet_cap', 'trail_classic', 'skin_blue'],
    equippedBat: 'bat_wood',
    equippedHelmet: 'helmet_cap',
    equippedTrail: 'trail_classic',
    equippedSkin: 'skin_blue',
    activePowerups: {},
    powerupCooldowns: {},
    missions: createInitialMissions(),
    soundEnabled: true,
    musicEnabled: true,
    hapticsEnabled: true,
    lang: detectDefaultLang(),
  };
}

export function loadSave(): GameSave {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return createDefaultSave();
    const parsed = JSON.parse(raw);
    const def = createDefaultSave();
    return {
      ...def,
      ...parsed,
      playerId: typeof parsed.playerId === 'string' && parsed.playerId ? parsed.playerId : def.playerId,
      ownedItems: Array.isArray(parsed.ownedItems) ? parsed.ownedItems : def.ownedItems,
      brokenWalls: Array.isArray(parsed.brokenWalls) ? parsed.brokenWalls : [],
      wallDamage: parsed.wallDamage && typeof parsed.wallDamage === 'object' ? parsed.wallDamage : {},
      missions: Array.isArray(parsed.missions) && parsed.missions.length ? parsed.missions : def.missions,
      activePowerups: parsed.activePowerups && typeof parsed.activePowerups === 'object' ? parsed.activePowerups : {},
      powerupCooldowns: parsed.powerupCooldowns && typeof parsed.powerupCooldowns === 'object' ? parsed.powerupCooldowns : {},
    };
  } catch {
    return createDefaultSave();
  }
}

export function saveGame(state: GameSave): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage quota errors
  }
}

export function parseRivalFromURL(): RivalChallenge | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const dist = Number(params.get('dist'));
    const name = (params.get('rival') || '').trim().slice(0, 16);
    if (name && Number.isFinite(dist) && dist >= 10) {
      return { name, distance: Math.round(dist), beaten: false };
    }
  } catch {
    // ignore
  }
  return null;
}

export function getActiveGearSet(state: GameSave): GearSetBonus | null {
  return (
    GEAR_SETS.find(
      (s) =>
        state.equippedHelmet === s.helmetId &&
        state.equippedBat === s.batId &&
        state.equippedTrail === s.trailId
    ) || null
  );
}

export function getCurrentLeague(state: GameSave): LeagueDef {
  return LEAGUES[Math.min(LEAGUES.length - 1, state.leagueTier)] || LEAGUES[0];
}

export function getNextLeague(state: GameSave): LeagueDef | null {
  return LEAGUES[state.leagueTier + 1] || null;
}

export function getWallCoinMultiplier(state: GameSave): number {
  let mult = 1;
  for (const w of WALLS) {
    if (state.brokenWalls.includes(w.id)) mult += w.coinMultBonus;
  }
  return Number(mult.toFixed(2));
}

export function getUpgradeCost(level: number, base = 35, growth = 1.34): number {
  return Math.floor(base * Math.pow(growth, level - 1) + (level - 1) * 18);
}

export function getMaxPowerupSlots(state: GameSave): number {
  return state.leagueTier >= 2 ? 2 : 1;
}

export function getPowerupCost(pu: PowerupDef, state: GameSave): number {
  if (pu.currency === 'gems') {
    return pu.cost + state.leagueTier * 8;
  }
  const refUpgrade = Math.max(
    getUpgradeCost(state.batLevel, 35, 1.34),
    getUpgradeCost(state.muscleLevel, 35, 1.34)
  );
  const leagueFactor = 1 + state.leagueTier * 0.45;
  return Math.max(pu.cost, Math.round(refUpgrade * pu.costRatio * leagueFactor));
}

export function getIncomeMultiplier(level: number): number {
  return Number((1 + (level - 1) * 0.16).toFixed(2));
}

export function getBatTierName(level: number): string {
  const tiers = ['Wood', 'Hardwood', 'Alloy', 'Titanium', 'Neon', 'Plasma', 'Magma', 'Diamond', 'Cosmic', 'Omega'];
  return tiers[Math.min(tiers.length - 1, Math.floor((level - 1) / 5))];
}

export function getMuscleTierName(level: number): string {
  const tiers = ['Rookie', 'Slugger', 'All-Star', 'Crusher', 'Titan', 'Hulk', 'Supernova', 'Legend', 'Mythic', 'Godlike'];
  return tiers[Math.min(tiers.length - 1, Math.floor((level - 1) / 5))];
}

export function getEquippedItem(state: GameSave, category: 'bats' | 'helmets' | 'trails' | 'skins'): ShopItem {
  const id =
    category === 'bats'
      ? state.equippedBat
      : category === 'helmets'
      ? state.equippedHelmet
      : category === 'trails'
      ? state.equippedTrail
      : state.equippedSkin;
  return SHOP_ITEMS.find((i) => i.id === id) || SHOP_ITEMS.find((i) => i.category === category)!;
}

export function advanceMission(m: Mission): Mission {
  const nextTier = m.tier + 1;
  switch (m.type) {
    case 'distance': {
      const target = Math.round((m.target * 1.45) / 10) * 10;
      return { ...m, tier: nextTier, target, progress: 0, title: `Hit a ball ${target}m`, rewardGems: 10 + nextTier * 6 };
    }
    case 'perfects': {
      const target = m.target + 2;
      return { ...m, tier: nextTier, target, progress: 0, title: `Land ${target} Perfect Hits`, rewardGems: 14 + nextTier * 6 };
    }
    case 'upgrades': {
      const target = m.target + 3;
      return { ...m, tier: nextTier, target, progress: 0, title: `Buy ${target} Upgrades`, rewardGems: 10 + nextTier * 5 };
    }
    case 'bonuses': {
      const target = m.target + 2;
      return { ...m, tier: nextTier, target, progress: 0, title: `Hit ${target} Pads, Taxis or Rings`, rewardGems: 12 + nextTier * 5 };
    }
    default:
      return { ...m, tier: nextTier, target: m.target + 5, progress: 0, title: `Complete ${m.target + 5} Swings`, rewardGems: 15 + nextTier * 5 };
  }
}

export function formatNumber(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (abs >= 10_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return Math.floor(n).toLocaleString();
}
