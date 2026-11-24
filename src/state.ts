export interface PowerupDef {
  id: 'fireball' | 'superbounce' | 'magnet' | 'sweetspot' | 'lowgrav' | 'goldenpitch';
  name: string;
  emoji: string;
  desc: string;
  cost: number;
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
  coins: number;
  gems: number;
  bestDistance: number;
  batLevel: number;
  muscleLevel: number;
  incomeLevel: number;
  combo: number;
  totalSwings: number;
  totalPerfects: number;
  totalUpgrades: number;
  totalBonuses: number;
  totalCoinsEarned: number;
  ownedItems: string[];
  equippedBat: string;
  equippedHelmet: string;
  equippedTrail: string;
  equippedSkin: string;
  activePowerups: Record<string, boolean>;
  missions: Mission[];
  soundEnabled: boolean;
  hapticsEnabled: boolean;
}

export const POWERUPS: PowerupDef[] = [
  {
    id: 'fireball',
    name: 'Fireball Slugger',
    emoji: '🔥',
    desc: '+28% launch power & fiery shockwave',
    cost: 65,
    currency: 'coins',
    color: '#ef4444',
  },
  {
    id: 'sweetspot',
    name: 'Giant Sweet Spot',
    emoji: '🎯',
    desc: 'Doubles the PERFECT hit window!',
    cost: 50,
    currency: 'coins',
    color: '#22c55e',
  },
  {
    id: 'superbounce',
    name: 'Hyper Bounce',
    emoji: '⚡',
    desc: 'Bouncier ball + extra jump pads ahead',
    cost: 80,
    currency: 'coins',
    color: '#06b6d4',
  },
  {
    id: 'lowgrav',
    name: 'Moon Glide',
    emoji: '🪶',
    desc: '22% lower gravity for longer hangtime',
    cost: 95,
    currency: 'coins',
    color: '#6366f1',
  },
  {
    id: 'magnet',
    name: 'Coin Magnet',
    emoji: '🧲',
    desc: 'Pulls air coin rings & 2× ring payout',
    cost: 110,
    currency: 'coins',
    color: '#a855f7',
  },
  {
    id: 'goldenpitch',
    name: 'Golden Pitch',
    emoji: '💎',
    desc: '2.5× total coin payout on your next hit!',
    cost: 8,
    currency: 'gems',
    color: '#f59e0b',
  },
];

export const SHOP_ITEMS: ShopItem[] = [
  // ===== BATS (8 distinct 3D models) =====
  {
    id: 'bat_wood',
    category: 'bats',
    name: 'Classic Ash',
    emoji: '🏏',
    desc: 'Reliable park slugger',
    cost: 0,
    currency: 'coins',
    primaryColor: 0xd9a066,
    secondaryColor: 0x222222,
    shape: 'classic',
    powerBonus: 0,
  },
  {
    id: 'bat_pro_metal',
    category: 'bats',
    name: 'Pro Alloy',
    emoji: '⚾',
    desc: '+6% swing power',
    cost: 180,
    currency: 'coins',
    primaryColor: 0xe2e8f0,
    secondaryColor: 0x2563eb,
    shape: 'alloy',
    powerBonus: 0.06,
  },
  {
    id: 'bat_mace',
    category: 'bats',
    name: 'Spiked Crusher',
    emoji: '⚔️',
    desc: '+12% swing power',
    cost: 520,
    currency: 'coins',
    primaryColor: 0x475569,
    secondaryColor: 0x94a3b8,
    shape: 'mace',
    powerBonus: 0.12,
  },
  {
    id: 'bat_neon',
    category: 'bats',
    name: 'Cyber Saber',
    emoji: '⚡',
    desc: '+18% swing power',
    cost: 1100,
    currency: 'coins',
    primaryColor: 0x22d3ee,
    secondaryColor: 0x0f172a,
    emissive: 0x0891b2,
    shape: 'saber',
    powerBonus: 0.18,
  },
  {
    id: 'bat_hammer',
    category: 'bats',
    name: 'Thunder Hammer',
    emoji: '🔨',
    desc: '+24% swing power',
    cost: 28,
    currency: 'gems',
    primaryColor: 0x94a3b8,
    secondaryColor: 0x78350f,
    emissive: 0x38bdf8,
    shape: 'hammer',
    powerBonus: 0.24,
  },
  {
    id: 'bat_magma',
    category: 'bats',
    name: 'Magma Club',
    emoji: '🌋',
    desc: '+30% swing power',
    cost: 50,
    currency: 'gems',
    primaryColor: 0xf97316,
    secondaryColor: 0x450a0a,
    emissive: 0xdc2626,
    shape: 'mace',
    powerBonus: 0.3,
  },
  {
    id: 'bat_gold',
    category: 'bats',
    name: 'Royal Scepter',
    emoji: '👑',
    desc: '+35% power & +15% coins',
    cost: 85,
    currency: 'gems',
    primaryColor: 0xfacc15,
    secondaryColor: 0x854d0e,
    emissive: 0xb45309,
    shape: 'scepter',
    powerBonus: 0.35,
    coinBonus: 0.15,
  },
  {
    id: 'bat_galaxy',
    category: 'bats',
    name: 'Void Nova',
    emoji: '🌌',
    desc: '+45% cosmic power',
    cost: 140,
    currency: 'gems',
    primaryColor: 0xc084fc,
    secondaryColor: 0x1e1b4b,
    emissive: 0x9333ea,
    shape: 'saber',
    powerBonus: 0.45,
  },

  // ===== HELMETS (7 distinct 3D headgear!) =====
  {
    id: 'helmet_cap',
    category: 'helmets',
    name: 'Park Cap',
    emoji: '🧢',
    desc: 'Classic baseball cap',
    cost: 0,
    currency: 'coins',
    primaryColor: 0x1d4ed8,
    secondaryColor: 0xffffff,
    shape: 'cap',
  },
  {
    id: 'helmet_pro',
    category: 'helmets',
    name: 'Pro Helmet',
    emoji: '⛑️',
    desc: '+10% coin gain',
    cost: 160,
    currency: 'coins',
    primaryColor: 0xef4444,
    secondaryColor: 0xf8fafc,
    shape: 'batting',
    coinBonus: 0.1,
  },
  {
    id: 'helmet_viking',
    category: 'helmets',
    name: 'Viking Horns',
    emoji: '🪖',
    desc: '+10% launch power',
    cost: 460,
    currency: 'coins',
    primaryColor: 0x64748b,
    secondaryColor: 0xfef3c7,
    shape: 'viking',
    powerBonus: 0.1,
  },
  {
    id: 'helmet_visor',
    category: 'helmets',
    name: 'Cyber Visor',
    emoji: '🕶️',
    desc: '+28% sweet spot size',
    cost: 850,
    currency: 'coins',
    primaryColor: 0x0f172a,
    secondaryColor: 0x22d3ee,
    emissive: 0x06b6d4,
    shape: 'visor',
    sweetSpotBonus: 0.28,
  },
  {
    id: 'helmet_mohawk',
    category: 'helmets',
    name: 'Blaze Mohawk',
    emoji: '🔥',
    desc: '+16% power & +10% coins',
    cost: 24,
    currency: 'gems',
    primaryColor: 0x1e293b,
    secondaryColor: 0xf97316,
    emissive: 0xea580c,
    shape: 'mohawk',
    powerBonus: 0.16,
    coinBonus: 0.1,
  },
  {
    id: 'helmet_astro',
    category: 'helmets',
    name: 'Astro Dome',
    emoji: '👩‍🚀',
    desc: '+16% air glide distance',
    cost: 48,
    currency: 'gems',
    primaryColor: 0xf8fafc,
    secondaryColor: 0x38bdf8,
    emissive: 0x0284c7,
    shape: 'astro',
    glideBonus: 0.16,
  },
  {
    id: 'helmet_crown',
    category: 'helmets',
    name: 'MVP Crown',
    emoji: '👑',
    desc: '+30% coins & +15% power',
    cost: 80,
    currency: 'gems',
    primaryColor: 0xfacc15,
    secondaryColor: 0xef4444,
    emissive: 0xd97706,
    shape: 'crown',
    coinBonus: 0.3,
    powerBonus: 0.15,
  },

  // ===== TRAILS =====
  {
    id: 'trail_classic',
    category: 'trails',
    name: 'Air Streak',
    emoji: '💨',
    desc: 'Clean white wind trail',
    cost: 0,
    currency: 'coins',
    primaryColor: 0xffffff,
  },
  {
    id: 'trail_fire',
    category: 'trails',
    name: 'Blaze Comet',
    emoji: '🔥',
    desc: 'Fiery orange sparks',
    cost: 320,
    currency: 'coins',
    primaryColor: 0xff5500,
    emissive: 0xff2200,
  },
  {
    id: 'trail_electric',
    category: 'trails',
    name: 'Volt Bolt',
    emoji: '⚡',
    desc: 'Electric cyan energy',
    cost: 20,
    currency: 'gems',
    primaryColor: 0x38bdf8,
    emissive: 0x0284c7,
  },
  {
    id: 'trail_rainbow',
    category: 'trails',
    name: 'Prism Hyper',
    emoji: '🌈',
    desc: 'Shifting rainbow ribbon',
    cost: 50,
    currency: 'gems',
    primaryColor: 0xf472b6,
    emissive: 0xec4899,
  },
  {
    id: 'trail_gold',
    category: 'trails',
    name: 'Midas Dust',
    emoji: '✨',
    desc: 'Glittering golden comet',
    cost: 85,
    currency: 'gems',
    primaryColor: 0xfde047,
    emissive: 0xeab308,
  },

  // ===== BATTER SKINS =====
  {
    id: 'skin_blue',
    category: 'skins',
    name: 'Park Blue',
    emoji: '🔵',
    desc: 'Original hero',
    cost: 0,
    currency: 'coins',
    primaryColor: 0x0ea5e9,
  },
  {
    id: 'skin_emerald',
    category: 'skins',
    name: 'Turbo Mint',
    emoji: '🟢',
    desc: 'Fresh park ace',
    cost: 280,
    currency: 'coins',
    primaryColor: 0x10b981,
  },
  {
    id: 'skin_violet',
    category: 'skins',
    name: 'Hyper Violet',
    emoji: '🟣',
    desc: 'Neon slugger',
    cost: 680,
    currency: 'coins',
    primaryColor: 0x8b5cf6,
  },
  {
    id: 'skin_gold',
    category: 'skins',
    name: 'MVP Gold',
    emoji: '🏆',
    desc: 'Shining champion',
    cost: 42,
    currency: 'gems',
    primaryColor: 0xfbbf24,
    emissive: 0x92400e,
  },
  {
    id: 'skin_shadow',
    category: 'skins',
    name: 'Shadow Pro',
    emoji: '🥷',
    desc: 'Stealth obsidian',
    cost: 70,
    currency: 'gems',
    primaryColor: 0x1e293b,
    emissive: 0x38bdf8,
  },
];

const SAVE_KEY = 'mega_bat_rush_save_v2';

export function createInitialMissions(): Mission[] {
  return [
    { id: 'm_dist', type: 'distance', title: 'Hit a ball 80m', target: 80, progress: 0, rewardGems: 12, tier: 1 },
    { id: 'm_perf', type: 'perfects', title: 'Land 2 Perfect Hits', target: 2, progress: 0, rewardGems: 16, tier: 1 },
    { id: 'm_upg', type: 'upgrades', title: 'Buy 3 Upgrades', target: 3, progress: 0, rewardGems: 12, tier: 1 },
    { id: 'm_bon', type: 'bonuses', title: 'Hit 2 Pads or Rings', target: 2, progress: 0, rewardGems: 14, tier: 1 },
  ];
}

export function createDefaultSave(): GameSave {
  return {
    coins: 45,
    gems: 15,
    bestDistance: 0,
    batLevel: 1,
    muscleLevel: 1,
    incomeLevel: 1,
    combo: 0,
    totalSwings: 0,
    totalPerfects: 0,
    totalUpgrades: 0,
    totalBonuses: 0,
    totalCoinsEarned: 0,
    ownedItems: ['bat_wood', 'helmet_cap', 'trail_classic', 'skin_blue'],
    equippedBat: 'bat_wood',
    equippedHelmet: 'helmet_cap',
    equippedTrail: 'trail_classic',
    equippedSkin: 'skin_blue',
    activePowerups: {},
    missions: createInitialMissions(),
    soundEnabled: true,
    hapticsEnabled: true,
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
      ownedItems: Array.isArray(parsed.ownedItems) ? parsed.ownedItems : def.ownedItems,
      missions: Array.isArray(parsed.missions) && parsed.missions.length ? parsed.missions : def.missions,
      activePowerups: parsed.activePowerups && typeof parsed.activePowerups === 'object' ? parsed.activePowerups : {},
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

export function getUpgradeCost(level: number, base = 25, growth = 1.22): number {
  return Math.floor(base * Math.pow(growth, level - 1) + (level - 1) * 10);
}

export function getIncomeMultiplier(level: number): number {
  return Number((1 + (level - 1) * 0.25).toFixed(2));
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
      return { ...m, tier: nextTier, target, progress: 0, title: `Hit ${target} Pads or Rings`, rewardGems: 12 + nextTier * 5 };
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
