import './styles.css';
import {
  advanceMission,
  createDefaultSave,
  formatNumber,
  GameSave,
  getBatTierName,
  getIncomeMultiplier,
  getMuscleTierName,
  getUpgradeCost,
  loadSave,
  POWERUPS,
  saveGame,
  SHOP_ITEMS,
} from './state';
import { BaseballGame, GamePhase, RunResult } from './game';
import { sound } from './audio';

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;

const save: GameSave = loadSave();

// DOM elements
const canvas = $<HTMLCanvasElement>('game-canvas');
const coinCount = $('coin-count');
const gemCount = $('gem-count');
const coinPill = $('coin-pill');
const gemPill = $('gem-pill');
const bestDistanceEl = $('best-distance');
const comboPill = $('combo-pill');

const tapStartPrompt = $('tap-start-prompt');
const timingHud = $('timing-hud');
const pitchTypeBadge = $('pitch-type-badge');
const timingCursor = $('timing-cursor');

const flightHud = $('flight-hud');
const flightDistance = $('flight-distance');
const flightSpeed = $('flight-speed');
const flightZone = $('flight-zone');
const flightCoinsLive = $('flight-coins-live');
const slamPrompt = $('slam-prompt');
const slamBarFill = $('slam-bar-fill');
const slamText = $('slam-text');

const calloutLayer = $('callout-layer');
const upgradeDock = $('upgrade-dock');
const leftButtons = $('left-buttons');
const rightButtons = $('right-buttons');
const activePowerupsStrip = $('active-powerups-strip');
const powerupActiveDot = $('powerup-active-dot');
const questBadge = $('quest-badge');

// Upgrade card elements
const upgBat = $<HTMLButtonElement>('upg-bat');
const upgMuscle = $<HTMLButtonElement>('upg-muscle');
const upgIncome = $<HTMLButtonElement>('upg-income');

// Result overlay elements
const resultOverlay = $('result-overlay');
const resultNewRecord = $('result-new-record');
const resultQuality = $('result-quality');
const resultDistNum = $('result-dist-num');
const resultHeight = $('result-height');
const resultBounces = $('result-bounces');
const resultBonuses = $('result-bonuses');
const resultCoins = $('result-coins');
const resultGemLine = $('result-gem-line');
const resultGems = $('result-gems');
const btnBonus2x = $<HTMLButtonElement>('btn-bonus-2x');
const btnContinue = $<HTMLButtonElement>('btn-continue');

// Modals
const modalBackdrop = $('modal-backdrop');
const modalPowerups = $('modal-powerups');
const modalShop = $('modal-shop');
const modalQuests = $('modal-quests');
const modalSettings = $('modal-settings');
const powerupListEl = $('powerup-list');
const shopGridEl = $('shop-grid');
const questListEl = $('quest-list');
const settingsStatsEl = $('settings-stats');
const toggleSound = $<HTMLInputElement>('toggle-sound');
const toggleHaptics = $<HTMLInputElement>('toggle-haptics');

let activeShopTab: 'bats' | 'helmets' | 'trails' | 'skins' = 'bats';
let lastRunResult: RunResult | null = null;
let bonusClaimed = false;

function bumpPill(el: HTMLElement): void {
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
  setTimeout(() => el.classList.remove('bump'), 160);
}

function showCallout(text: string, color = '#ffffff', big = false): void {
  const el = document.createElement('div');
  el.className = `callout-item${big ? ' big' : ''}`;
  el.textContent = text;
  el.style.color = color;
  calloutLayer.appendChild(el);
  setTimeout(() => el.remove(), 1080);
}

function renderDots(containerId: string, level: number): void {
  const container = $(containerId);
  const filled = ((level - 1) % 5) + 1;
  container.innerHTML = '';
  for (let i = 1; i <= 5; i++) {
    const dot = document.createElement('span');
    dot.className = `card-dot${i <= filled ? ' filled' : ''}`;
    container.appendChild(dot);
  }
}

function updateHUD(): void {
  coinCount.textContent = formatNumber(save.coins);
  gemCount.textContent = formatNumber(save.gems);
  bestDistanceEl.textContent = `${save.bestDistance}m`;

  if (save.combo >= 2) {
    comboPill.classList.remove('hidden');
    comboPill.textContent = `🔥 x${save.combo}`;
  } else {
    comboPill.classList.add('hidden');
  }

  // Upgrade cards
  const batCost = getUpgradeCost(save.batLevel, 30, 1.24);
  const muscleCost = getUpgradeCost(save.muscleLevel, 30, 1.24);
  const incomeCost = getUpgradeCost(save.incomeLevel, 35, 1.26);

  $('lv-bat').textContent = String(save.batLevel);
  $('tier-bat').textContent = getBatTierName(save.batLevel);
  $('cost-bat').textContent = formatNumber(batCost);
  renderDots('dots-bat', save.batLevel);
  upgBat.classList.toggle('affordable', save.coins >= batCost);
  upgBat.classList.toggle('cant-afford', save.coins < batCost);

  $('lv-muscle').textContent = String(save.muscleLevel);
  $('tier-muscle').textContent = getMuscleTierName(save.muscleLevel);
  $('cost-muscle').textContent = formatNumber(muscleCost);
  renderDots('dots-muscle', save.muscleLevel);
  upgMuscle.classList.toggle('affordable', save.coins >= muscleCost);
  upgMuscle.classList.toggle('cant-afford', save.coins < muscleCost);

  $('lv-income').textContent = String(save.incomeLevel);
  $('mult-income').textContent = `×${getIncomeMultiplier(save.incomeLevel).toFixed(1)}`;
  $('cost-income').textContent = formatNumber(incomeCost);
  renderDots('dots-income', save.incomeLevel);
  upgIncome.classList.toggle('affordable', save.coins >= incomeCost);
  upgIncome.classList.toggle('cant-afford', save.coins < incomeCost);

  // Active powerups strip
  const activeIds = Object.keys(save.activePowerups).filter((k) => save.activePowerups[k]);
  powerupActiveDot.classList.toggle('hidden', activeIds.length === 0);
  activePowerupsStrip.innerHTML = '';
  for (const id of activeIds) {
    const def = POWERUPS.find((p) => p.id === id);
    if (!def) continue;
    const chip = document.createElement('div');
    chip.className = 'active-pu-chip';
    chip.textContent = `${def.emoji} ${def.name}`;
    activePowerupsStrip.appendChild(chip);
  }

  // Quest claimable badge
  const anyClaimable = save.missions.some((m) => m.progress >= m.target);
  questBadge.classList.toggle('hidden', !anyClaimable);
}

function handlePhaseChange(phase: GamePhase): void {
  const isIdle = phase === 'IDLE';
  tapStartPrompt.classList.toggle('hidden', !isIdle);
  upgradeDock.classList.toggle('hidden', !isIdle);
  leftButtons.classList.toggle('hidden', !isIdle);
  rightButtons.classList.toggle('hidden', !isIdle);
  // Hide active powerup chips during PITCHING / HITSTOP / RESULT so the at-bat view is 100% clear!
  activePowerupsStrip.classList.toggle('hidden', phase !== 'IDLE');

  timingHud.classList.toggle('hidden', phase !== 'PITCHING');
  flightHud.classList.toggle('hidden', phase !== 'FLYING');
  resultOverlay.classList.toggle('hidden', phase !== 'RESULT');
}

const game = new BaseballGame(canvas, save, {
  onPhaseChange: handlePhaseChange,
  onPitchUpdate: (progress, pitchLabel, isGolden) => {
    pitchTypeBadge.textContent = pitchLabel;
    pitchTypeBadge.classList.toggle('golden', isGolden);
    // Map pitchProgress [0..1.15] onto [0%..100%] so sweet spot 0.88 lands right inside the gold zone (~76.5%)
    const pct = Math.min(100, Math.max(0, (progress / 1.15) * 100));
    timingCursor.style.left = `${pct}%`;
  },
  onFlightUpdate: (dist, speedMph, zoneName, liveCoins, slamsLeft, canSlam) => {
    flightDistance.textContent = `${dist}m`;
    flightSpeed.textContent = `${speedMph} mph`;
    flightZone.textContent = zoneName;
    flightCoinsLive.textContent = `+${formatNumber(liveCoins)} 🪙`;
    slamBarFill.style.width = slamsLeft > 0 ? '100%' : '0%';
    slamPrompt.classList.toggle('ready', canSlam);
    slamPrompt.classList.toggle('hidden', slamsLeft <= 0);
    slamText.textContent = canSlam
      ? `⚡ TAP FOR POWER SLAM! (${slamsLeft})`
      : `⚡ FLY HIGH TO SLAM (${slamsLeft})`;
  },
  onCallout: showCallout,
  onRunComplete: (res) => {
    lastRunResult = res;
    bonusClaimed = false;
    resultNewRecord.classList.toggle('hidden', !res.isNewRecord);
    resultQuality.textContent =
      res.quality === 'PERFECT'
        ? '🔥 PERFECT CRUSH!'
        : res.quality === 'GREAT'
        ? '⚡ GREAT HIT!'
        : res.quality === 'GOOD'
        ? '👍 SOLID HIT!'
        : '⚾ BASE HIT!';
    resultDistNum.textContent = `${res.distance}m`;
    resultHeight.textContent = `${res.maxHeight}m`;
    resultBounces.textContent = String(res.bounces);
    resultBonuses.textContent = String(res.bonuses);
    resultCoins.textContent = `+${formatNumber(res.coinsEarned)}`;

    if (res.gemsEarned > 0) {
      resultGemLine.classList.remove('hidden');
      resultGems.textContent = `+${res.gemsEarned}`;
    } else {
      resultGemLine.classList.add('hidden');
    }

    btnBonus2x.disabled = false;
    btnBonus2x.innerHTML = `<span>⚡ CLAIM 2X COINS (+${formatNumber(res.coinsEarned)})</span>`;
    bumpPill(coinPill);
    if (res.gemsEarned > 0) bumpPill(gemPill);
  },
  onStateChanged: updateHUD,
});

// Canvas tap & keyboard Spacebar support!
canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (!modalBackdrop.classList.contains('hidden')) return;
  game.handlePrimaryTap();
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && modalBackdrop.classList.contains('hidden')) {
    e.preventDefault();
    if (game.phase === 'RESULT') {
      game.resetToIdle(true);
    } else {
      game.handlePrimaryTap();
    }
  }
});

window.addEventListener('resize', () => game.resize());

// ===== UPGRADE BUTTONS =====
function buyUpgrade(type: 'bat' | 'muscle' | 'income'): void {
  const level =
    type === 'bat' ? save.batLevel : type === 'muscle' ? save.muscleLevel : save.incomeLevel;
  const cost =
    type === 'income'
      ? getUpgradeCost(level, 35, 1.26)
      : getUpgradeCost(level, 30, 1.24);

  if (save.coins < cost) {
    sound.playMiss();
    showCallout('NEED MORE COINS!', '#f87171', false);
    return;
  }

  save.coins -= cost;
  if (type === 'bat') save.batLevel += 1;
  if (type === 'muscle') save.muscleLevel += 1;
  if (type === 'income') save.incomeLevel += 1;
  save.totalUpgrades += 1;

  for (const m of save.missions) {
    if (m.type === 'upgrades') m.progress = Math.min(m.target, m.progress + 1);
  }

  saveGame(save);
  sound.playUpgrade();
  game.refreshAppearance();
  updateHUD();
  bumpPill(coinPill);

  const label =
    type === 'bat'
      ? `BAT Lv.${save.batLevel}!`
      : type === 'muscle'
      ? `MUSCLE Lv.${save.muscleLevel}!`
      : `INCOME ×${getIncomeMultiplier(save.incomeLevel).toFixed(1)}!`;
  showCallout(label, '#4ade80', false);
}

upgBat.addEventListener('click', (e) => { e.stopPropagation(); buyUpgrade('bat'); });
upgMuscle.addEventListener('click', (e) => { e.stopPropagation(); buyUpgrade('muscle'); });
upgIncome.addEventListener('click', (e) => { e.stopPropagation(); buyUpgrade('income'); });

// ===== RESULT ACTIONS =====
btnBonus2x.addEventListener('click', () => {
  if (!lastRunResult || bonusClaimed) return;
  bonusClaimed = true;
  save.coins += lastRunResult.coinsEarned;
  save.totalCoinsEarned += lastRunResult.coinsEarned;
  saveGame(save);
  sound.playCoin();
  bumpPill(coinPill);
  resultCoins.textContent = `+${formatNumber(lastRunResult.coinsEarned * 2)}`;
  btnBonus2x.disabled = true;
  btnBonus2x.innerHTML = '<span>✓ 2X COINS CLAIMED!</span>';
  updateHUD();
});

btnContinue.addEventListener('click', () => {
  game.resetToIdle(true);
});

// ===== MODAL HELPERS =====
function openModal(panel: HTMLElement): void {
  [modalPowerups, modalShop, modalQuests, modalSettings].forEach((p) => p.classList.add('hidden'));
  panel.classList.remove('hidden');
  modalBackdrop.classList.remove('hidden');
}

function closeModals(): void {
  modalBackdrop.classList.add('hidden');
}

modalBackdrop.addEventListener('click', (e) => {
  if (e.target === modalBackdrop) closeModals();
});
document.querySelectorAll('[data-close]').forEach((btn) => btn.addEventListener('click', closeModals));

// ===== POWERUPS MODAL =====
function renderPowerupsModal(): void {
  powerupListEl.innerHTML = '';
  for (const pu of POWERUPS) {
    const isActive = !!save.activePowerups[pu.id];
    const canAfford = pu.currency === 'coins' ? save.coins >= pu.cost : save.gems >= pu.cost;
    const row = document.createElement('div');
    row.className = `powerup-row${isActive ? ' active' : ''}`;
    row.innerHTML = `
      <div class="pu-icon">${pu.emoji}</div>
      <div class="pu-info">
        <div class="pu-name">${pu.name}</div>
        <div class="pu-desc">${pu.desc}</div>
      </div>
      <button class="pu-btn${isActive ? ' active' : ''}" ${isActive || !canAfford ? 'disabled' : ''}>
        ${isActive ? 'ACTIVE ✓' : `${pu.currency === 'coins' ? '🪙' : '💎'} ${pu.cost}`}
      </button>
    `;
    const btn = row.querySelector('button')!;
    btn.addEventListener('click', () => {
      if (isActive || !canAfford) return;
      if (pu.currency === 'coins') save.coins -= pu.cost;
      else save.gems -= pu.cost;
      save.activePowerups[pu.id] = true;
      saveGame(save);
      sound.playUpgrade();
      updateHUD();
      renderPowerupsModal();
    });
    powerupListEl.appendChild(row);
  }
}

$('btn-powerups').addEventListener('click', () => {
  renderPowerupsModal();
  openModal(modalPowerups);
});

// ===== SHOP MODAL =====
function renderShopModal(): void {
  shopGridEl.innerHTML = '';
  const items = SHOP_ITEMS.filter((i) => i.category === activeShopTab);
  const equippedId =
    activeShopTab === 'bats'
      ? save.equippedBat
      : activeShopTab === 'helmets'
      ? save.equippedHelmet
      : activeShopTab === 'trails'
      ? save.equippedTrail
      : save.equippedSkin;

  for (const item of items) {
    const owned = save.ownedItems.includes(item.id);
    const equipped = equippedId === item.id;
    const canAfford = item.currency === 'coins' ? save.coins >= item.cost : save.gems >= item.cost;

    const card = document.createElement('div');
    card.className = `shop-card${equipped ? ' equipped' : ''}`;
    card.innerHTML = `
      <div class="shop-emoji">${item.emoji}</div>
      <div class="shop-name">${item.name}</div>
      <div class="shop-desc">${item.desc}</div>
      <button class="shop-action-btn${equipped ? ' equipped' : owned ? ' equip' : ''}" ${!owned && !canAfford ? 'disabled' : ''}>
        ${equipped ? 'EQUIPPED ✓' : owned ? 'EQUIP' : `${item.currency === 'coins' ? '🪙' : '💎'} ${formatNumber(item.cost)}`}
      </button>
    `;
    const btn = card.querySelector('button')!;
    btn.addEventListener('click', () => {
      if (equipped) return;
      if (!owned) {
        if (!canAfford) return;
        if (item.currency === 'coins') save.coins -= item.cost;
        else save.gems -= item.cost;
        save.ownedItems.push(item.id);
      }
      if (activeShopTab === 'bats') save.equippedBat = item.id;
      if (activeShopTab === 'helmets') save.equippedHelmet = item.id;
      if (activeShopTab === 'trails') save.equippedTrail = item.id;
      if (activeShopTab === 'skins') save.equippedSkin = item.id;
      saveGame(save);
      sound.playUpgrade();
      game.refreshAppearance();
      updateHUD();
      renderShopModal();
    });
    shopGridEl.appendChild(card);
  }
}

document.querySelectorAll('.shop-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.shop-tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    activeShopTab = (tab as HTMLElement).dataset.tab as 'bats' | 'helmets' | 'trails' | 'skins';
    renderShopModal();
  });
});

$('btn-shop').addEventListener('click', () => {
  renderShopModal();
  openModal(modalShop);
});

// ===== MISSIONS MODAL =====
function renderQuestsModal(): void {
  questListEl.innerHTML = '';
  save.missions.forEach((m, idx) => {
    const claimable = m.progress >= m.target;
    const pct = Math.min(100, Math.round((m.progress / m.target) * 100));
    const row = document.createElement('div');
    row.className = `quest-row${claimable ? ' claimable' : ''}`;
    row.innerHTML = `
      <div class="quest-info">
        <div class="quest-title">${m.title}</div>
        <div class="quest-bar"><div class="quest-bar-fill" style="width:${pct}%"></div></div>
        <div class="quest-prog-txt">${Math.min(m.progress, m.target)} / ${m.target} • Tier ${m.tier}</div>
      </div>
      <button class="quest-claim-btn" ${!claimable ? 'disabled' : ''}>
        ${claimable ? `CLAIM 💎${m.rewardGems}` : `💎 ${m.rewardGems}`}
      </button>
    `;
    const btn = row.querySelector('button')!;
    btn.addEventListener('click', () => {
      if (!claimable) return;
      save.gems += m.rewardGems;
      save.missions[idx] = advanceMission(m);
      saveGame(save);
      sound.playNewRecord();
      bumpPill(gemPill);
      updateHUD();
      renderQuestsModal();
    });
    questListEl.appendChild(row);
  });
}

$('btn-quests').addEventListener('click', () => {
  renderQuestsModal();
  openModal(modalQuests);
});

// ===== SETTINGS MODAL =====
$('btn-settings').addEventListener('click', () => {
  toggleSound.checked = save.soundEnabled;
  toggleHaptics.checked = save.hapticsEnabled;
  settingsStatsEl.innerHTML = `
    <div><strong>Best Distance:</strong> ${save.bestDistance}m</div>
    <div><strong>Total Swings:</strong> ${save.totalSwings}</div>
    <div><strong>Perfect Hits:</strong> ${save.totalPerfects}</div>
    <div><strong>Total Coins Earned:</strong> ${formatNumber(save.totalCoinsEarned)}</div>
  `;
  openModal(modalSettings);
});

toggleSound.addEventListener('change', () => {
  save.soundEnabled = toggleSound.checked;
  sound.enabled = save.soundEnabled;
  saveGame(save);
});

toggleHaptics.addEventListener('change', () => {
  save.hapticsEnabled = toggleHaptics.checked;
  sound.haptics = save.hapticsEnabled;
  saveGame(save);
});

$('btn-reset-save').addEventListener('click', () => {
  if (!confirm('Reset all coins, gems, upgrades, and best distance?')) return;
  const fresh = createDefaultSave();
  Object.assign(save, fresh);
  saveGame(save);
  game.refreshAppearance();
  game.resetToIdle(true);
  updateHUD();
  closeModals();
  showCallout('PROGRESS RESET', '#f87171', false);
});

// Initial render
updateHUD();
handlePhaseChange('IDLE');
