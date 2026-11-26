import './styles.css';
import {
  advanceMission,
  createDefaultSave,
  formatNumber,
  GameSave,
  GEAR_SETS,
  getActiveGearSet,
  getBatTierName,
  getCurrentLeague,
  getIncomeMultiplier,
  getMaxPowerupSlots,
  getMuscleTierName,
  getNextLeague,
  getPowerupCost,
  getUpgradeCost,
  getWallCoinMultiplier,
  loadSave,
  parseRivalFromURL,
  POWERUPS,
  saveGame,
  SHOP_ITEMS,
  WALLS,
} from './state';
import { BaseballGame, GamePhase, RunResult } from './game';
import { sound } from './audio';
import { Lang, setLang, t } from './i18n';
import { fetchLeaderboard, submitLeaderboardScore } from './leaderboard';
import { LEAGUES } from './state';

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;

const save: GameSave = loadSave();
setLang(save.lang || 'en');
const rival = parseRivalFromURL();

// DOM elements
const canvas = $<HTMLCanvasElement>('game-canvas');
const coinCount = $('coin-count');
const gemCount = $('gem-count');
const coinPill = $('coin-pill');
const gemPill = $('gem-pill');
const bestDistanceEl = $('best-distance');
const comboPill = $('combo-pill');
const statusPillsRow = $('status-pills-row');
const leagueChip = $('league-chip');
const bossChip = $('boss-chip');
const rivalBanner = $('rival-banner');

const tapStartPrompt = $('tap-start-prompt');
const timingHud = $('timing-hud');
const pitchTypeBadge = $('pitch-type-badge');
const timingCursor = $('timing-cursor');

const flightHud = $('flight-hud');
const flightDistance = $('flight-distance');
const flightSpeed = $('flight-speed');
const flightZone = $('flight-zone');
const flightCoinsLive = $('flight-coins-live');

const calloutLayer = $('callout-layer');
const upgradeDock = $('upgrade-dock');
const leftButtons = $('left-buttons');
const rightButtons = $('right-buttons');
const activePowerupsStrip = $('active-powerups-strip');
const powerupActiveDot = $('powerup-active-dot');
const questBadge = $('quest-badge');
const leagueBadge = $('league-badge');

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
const resultMilestones = $('result-milestones');
const resultCoins = $('result-coins');
const resultGemLine = $('result-gem-line');
const resultGems = $('result-gems');
const btnOpenChest = $<HTMLButtonElement>('btn-open-chest');
const chestLootEl = $('chest-loot');
const chestOverlay = $('chest-overlay');
const chestFlash = $('chest-flash');
const chestConfettiLayer = $('chest-confetti-layer');
const chestRarityTag = $('chest-rarity-tag');
const chestBoxWrap = $('chest-box-wrap');
const chest3d = $('chest-3d');
const chestImg = $<HTMLImageElement>('chest-img');
const chestTapHint = $('chest-tap-hint');
const chestCardsRow = $('chest-cards-row');
const btnChestClaim = $<HTMLButtonElement>('btn-chest-claim');
const multReelWrap = $('mult-reel-wrap');
const multReelNeedle = $('mult-reel-needle');
const btnBonus2x = $<HTMLButtonElement>('btn-bonus-2x');
const btnShare = $<HTMLButtonElement>('btn-share');
const btnContinue = $<HTMLButtonElement>('btn-continue');

// Modals
const modalBackdrop = $('modal-backdrop');
const modalPowerups = $('modal-powerups');
const modalShop = $('modal-shop');
const modalLeague = $('modal-league');
const modalLeaderboard = $('modal-leaderboard');
const modalQuests = $('modal-quests');
const modalSettings = $('modal-settings');
const lbNameInput = $<HTMLInputElement>('lb-name-input');
const lbSaveBtn = $<HTMLButtonElement>('lb-save-btn');
const lbRefreshBtn = $<HTMLButtonElement>('lb-refresh-btn');
const lbYourRank = $('lb-your-rank');
const lbList = $('lb-list');
const powerupListEl = $('powerup-list');
const setBonusBarEl = $('set-bonus-bar');
const shopGridEl = $('shop-grid');
const leagueContentEl = $('league-content');
const questListEl = $('quest-list');
const settingsStatsEl = $('settings-stats');
const inputPlayerName = $<HTMLInputElement>('input-player-name');
const selectLang = $<HTMLSelectElement>('select-lang');
const toggleSound = $<HTMLInputElement>('toggle-sound');
const toggleMusic = $<HTMLInputElement>('toggle-music');
const toggleHaptics = $<HTMLInputElement>('toggle-haptics');

function applyStaticLabels(): void {
  const qs = (sel: string) => document.querySelector(sel) as HTMLElement | null;
  const set = (sel: string, val: string) => { const el = qs(sel); if (el) el.textContent = val; };

  set('.tap-start-text', t('tapStart'));
  set('.tap-sub-text', t('tapSub'));
  set('.timing-label', t('tapSwing'));
  set('.powerup-btn .side-tag', t('boost'));
  set('.ranks-btn .side-tag', t('ranksTag'));
  set('.league-btn .side-tag', t('league'));
  set('#modal-leaderboard h2', t('leaderboardTitle'));
  set('#lb-save-btn', t('saveNameSync'));
  set('#upg-bat .card-title', t('bat'));
  set('#upg-muscle .card-title', t('muscle'));
  set('#upg-income .card-title', t('income'));
  set('#result-new-record', t('newRecord'));
  set('#btn-share', t('challenge'));
  set('#btn-continue', t('nextAtBat'));
  set('#btn-chest-claim', t('awesomeClaim'));
  set('#modal-powerups h2', t('powerupsTitle'));
  set('#modal-shop h2', t('shopTitle'));
  set('#modal-league h2', t('leagueTitle'));
  set('#modal-quests h2', t('missionsTitle'));
  set('#modal-quests .modal-desc', t('missionsDesc'));
  set('#modal-settings h2', t('settingsTitle'));
  set('.shop-tab[data-tab="bats"]', t('tabBats'));
  set('.shop-tab[data-tab="helmets"]', t('tabHelmets'));
  set('.shop-tab[data-tab="trails"]', t('tabTrails'));
  set('.shop-tab[data-tab="skins"]', t('tabBatter'));
  set('#btn-reset-save', t('resetProgress'));

  const statLabels = document.querySelectorAll('.result-stat .r-label');
  if (statLabels[0]) statLabels[0].textContent = t('maxHeight');
  if (statLabels[1]) statLabels[1].textContent = t('bounces');
  if (statLabels[2]) statLabels[2].textContent = t('bonusHits');

  const recordSpan = qs('#record-badge > span:nth-child(2)');
  if (recordSpan) {
    recordSpan.innerHTML = `${t('best')} <strong id="best-distance">${save.bestDistance}m</strong>`;
  }
}

let activeShopTab: 'bats' | 'helmets' | 'trails' | 'skins' = 'bats';
let lastRunResult: RunResult | null = null;
let bonusClaimed = false;
let chestsRemaining = 0;

// 5x Multiplier Reel animation state
let reelRaf = 0;
let reelPos = 50; // 0..100
let reelDir = 1;

function startMultiplierReel(): void {
  cancelAnimationFrame(reelRaf);
  reelPos = 10;
  reelDir = 1;
  let last = performance.now();
  const tick = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!bonusClaimed && !resultOverlay.classList.contains('hidden')) {
      reelPos += reelDir * dt * 225;
      if (reelPos >= 98) { reelPos = 98; reelDir = -1; }
      if (reelPos <= 2) { reelPos = 2; reelDir = 1; }
      multReelNeedle.style.left = `${reelPos}%`;
      reelRaf = requestAnimationFrame(tick);
    }
  };
  reelRaf = requestAnimationFrame(tick);
}

function getReelMultiplier(pos: number): number {
  if (pos >= 44.5 && pos <= 55.5) return 3.0;
  if (pos >= 23.5 && pos <= 76.5) return 1.5;
  return 1.2;
}

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
  setTimeout(() => el.remove(), 1120);
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
  const bestEl = document.getElementById('best-distance');
  if (bestEl) bestEl.textContent = `${save.bestDistance}m`;

  if (save.combo >= 2) {
    comboPill.classList.remove('hidden');
    comboPill.textContent = `🔥 x${save.combo}`;
  } else {
    comboPill.classList.add('hidden');
  }

  // League & Boss countdown pills
  const league = getCurrentLeague(save);
  const nextLeague = getNextLeague(save);
  leagueChip.textContent = `${league.emoji} ${league.name}`;
  const canPromote = !!nextLeague && save.bestDistance >= nextLeague.reqDistance;
  leagueBadge.classList.toggle('hidden', !canPromote);

  const swingsToBoss = game ? game.getSwingsUntilBoss() : 4;
  if (swingsToBoss === 0) {
    bossChip.textContent = t('bossReady');
    bossChip.classList.add('ready');
  } else {
    bossChip.textContent = `${t('bossIn')} ${swingsToBoss}`;
    bossChip.classList.remove('ready');
  }

  // Rival challenge banner
  if (rival) {
    rivalBanner.classList.remove('hidden');
    rivalBanner.textContent = rival.beaten
      ? `🏆 BEAT ${rival.name.toUpperCase()} (${rival.distance}m)!`
      : `🚩 BEAT ${rival.name.toUpperCase()}: ${rival.distance}m`;
  } else {
    rivalBanner.classList.add('hidden');
  }

  // Upgrade cards
  const batCost = getUpgradeCost(save.batLevel, 35, 1.34);
  const muscleCost = getUpgradeCost(save.muscleLevel, 35, 1.34);
  const incomeCost = getUpgradeCost(save.incomeLevel, 40, 1.36);

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
  const totalCoinMult = getIncomeMultiplier(save.incomeLevel) * league.coinMult * getWallCoinMultiplier(save);
  $('mult-income').textContent = `×${totalCoinMult.toFixed(1)}`;
  $('cost-income').textContent = formatNumber(incomeCost);
  renderDots('dots-income', save.incomeLevel);
  upgIncome.classList.toggle('affordable', save.coins >= incomeCost);
  upgIncome.classList.toggle('cant-afford', save.coins < incomeCost);

  // Active powerups strip + active gear set chip
  const activeIds = Object.keys(save.activePowerups).filter((k) => save.activePowerups[k]);
  powerupActiveDot.classList.toggle('hidden', activeIds.length === 0);
  activePowerupsStrip.innerHTML = '';
  const activeSet = getActiveGearSet(save);
  if (activeSet) {
    const chip = document.createElement('div');
    chip.className = 'active-pu-chip';
    chip.textContent = `${activeSet.emoji} ${activeSet.name}`;
    activePowerupsStrip.appendChild(chip);
  }
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
  statusPillsRow.classList.toggle('hidden', !isIdle);
  activePowerupsStrip.classList.toggle('hidden', !isIdle);

  timingHud.classList.toggle('hidden', phase !== 'PITCHING');
  flightHud.classList.toggle('hidden', phase !== 'FLYING');
  resultOverlay.classList.toggle('hidden', phase !== 'RESULT');
  if (phase !== 'RESULT') cancelAnimationFrame(reelRaf);
}

const game = new BaseballGame(canvas, save, rival, {
  onPhaseChange: handlePhaseChange,
  onPitchUpdate: (progress, pitchLabel, isGolden) => {
    pitchTypeBadge.textContent = pitchLabel;
    pitchTypeBadge.classList.toggle('golden', isGolden);
    const pct = Math.min(100, Math.max(0, (progress / 1.15) * 100));
    timingCursor.style.left = `${pct}%`;
  },
  onFlightUpdate: (dist, speedMph, zoneName, liveCoins) => {
    flightDistance.textContent = `${dist}m`;
    flightSpeed.textContent = `${speedMph} mph`;
    flightZone.textContent = zoneName;
    flightCoinsLive.textContent = `+${formatNumber(liveCoins)} 🪙`;
  },
  onCallout: showCallout,
  onRunComplete: (res) => {
    lastRunResult = res;
    bonusClaimed = false;
    chestsRemaining = res.chestsWon;

    resultNewRecord.classList.toggle('hidden', !res.isNewRecord);
    resultQuality.textContent =
      res.quality === 'PERFECT'
        ? t('perfectCrush')
        : res.quality === 'GREAT'
        ? t('greatHit')
        : res.quality === 'GOOD'
        ? t('solidHit')
        : t('baseHit');
    resultDistNum.textContent = `${res.distance}m`;
    resultHeight.textContent = `${res.maxHeight}m`;
    resultBounces.textContent = String(res.bounces);
    resultBonuses.textContent = String(res.bonuses);
    resultCoins.textContent = `+${formatNumber(res.coinsEarned)}`;

    // Milestone badges
    const tags: string[] = [];
    if (res.wallBrokenName) tags.push(`💥 UNLOCKED ${res.wallBrokenName}!`);
    if (res.bossBeaten) tags.push(`⚔️ BEAT ${res.bossBeaten.name}`);
    if (res.rivalBeatenName) tags.push(`🏆 BEAT ${res.rivalBeatenName.toUpperCase()}!`);
    if (tags.length) {
      resultMilestones.innerHTML = tags.map((t) => `<span class="milestone-tag">${t}</span>`).join('');
      resultMilestones.classList.remove('hidden');
    } else {
      resultMilestones.classList.add('hidden');
    }

    if (res.gemsEarned > 0) {
      resultGemLine.classList.remove('hidden');
      resultGems.textContent = `+${res.gemsEarned}`;
    } else {
      resultGemLine.classList.add('hidden');
    }

    // Mystery Chest button
    chestLootEl.classList.add('hidden');
    chestLootEl.textContent = '';
    if (chestsRemaining > 0) {
      btnOpenChest.classList.remove('hidden');
      btnOpenChest.textContent =
        chestsRemaining > 1 ? `🎁 OPEN MYSTERY CHEST (${chestsRemaining})` : '🎁 OPEN MYSTERY CHEST!';
    } else {
      btnOpenChest.classList.add('hidden');
    }

    // 3x Multiplier Reel
    multReelWrap.classList.remove('hidden');
    btnBonus2x.disabled = false;
    btnBonus2x.innerHTML = `<span>${t('stopReel')}</span>`;
    startMultiplierReel();

    bumpPill(coinPill);
    if (res.gemsEarned > 0) bumpPill(gemPill);

    // Auto-submit to global leaderboard whenever a new personal best is set!
    if (res.isNewRecord && save.bestDistance >= 10) {
      submitLeaderboardScore(save).catch(() => {});
    }
  },
  onStateChanged: updateHUD,
});

// ===== MOBILE-PROOF TOUCH & DRAG STEERING + TAP CONTROLS =====
let ptrActive = false;
let activePointerId: number | null = null;
let ptrStartX = 0;

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (!modalBackdrop.classList.contains('hidden')) return;
  if (game.phase === 'FLYING') {
    ptrActive = true;
    activePointerId = e.pointerId;
    ptrStartX = e.clientX;
    try { canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  } else {
    game.handlePrimaryTap();
  }
});

canvas.addEventListener('pointermove', (e) => {
  if (!ptrActive || game.phase !== 'FLYING') return;
  if (activePointerId !== null && e.pointerId !== activePointerId) return;
  e.preventDefault();
  const dx = e.clientX - ptrStartX;
  // Responsive thumb steering: 45px swipe reaches full steer!
  game.setSteer(dx / 45);
});

const endDrag = (e?: PointerEvent) => {
  if (!ptrActive) return;
  if (e && activePointerId !== null && e.pointerId !== activePointerId) return;
  ptrActive = false;
  activePointerId = null;
  game.setSteer(0);
};

canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
window.addEventListener('pointerup', endDrag);

// Explicit touchmove prevention on iOS Safari / Android Chrome so the browser never steals horizontal swipes!
canvas.addEventListener(
  'touchmove',
  (e) => {
    if (game.phase === 'FLYING' && e.touches.length > 0) {
      e.preventDefault();
      if (!ptrActive) {
        ptrActive = true;
        ptrStartX = e.touches[0].clientX;
      }
      const dx = e.touches[0].clientX - ptrStartX;
      game.setSteer(dx / 45);
    }
  },
  { passive: false }
);

canvas.addEventListener('touchend', () => {
  ptrActive = false;
  activePointerId = null;
  game.setSteer(0);
});

// Desktop keyboard support
window.addEventListener('keydown', (e) => {
  if (!modalBackdrop.classList.contains('hidden')) return;
  if (e.code === 'Space') {
    e.preventDefault();
    if (game.phase === 'RESULT') game.resetToIdle(true);
    else game.handlePrimaryTap();
  } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
    game.setSteer(-1);
  } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
    game.setSteer(1);
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'ArrowRight' || e.code === 'KeyD') {
    game.setSteer(0);
  }
});

window.addEventListener('resize', () => game.resize());

// ===== UPGRADE BUTTONS =====
function buyUpgrade(type: 'bat' | 'muscle' | 'income'): void {
  const level =
    type === 'bat' ? save.batLevel : type === 'muscle' ? save.muscleLevel : save.incomeLevel;
  const cost =
    type === 'income' ? getUpgradeCost(level, 40, 1.36) : getUpgradeCost(level, 35, 1.34);

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
      : `INCOME Lv.${save.incomeLevel}!`;
  showCallout(label, '#4ade80', false);
}

upgBat.addEventListener('click', (e) => { e.stopPropagation(); buyUpgrade('bat'); });
upgMuscle.addEventListener('click', (e) => { e.stopPropagation(); buyUpgrade('muscle'); });
upgIncome.addEventListener('click', (e) => { e.stopPropagation(); buyUpgrade('income'); });

// ===== RESULT ACTIONS (5X REEL, MYSTERY CHEST, SHARE CHALLENGE) =====
btnBonus2x.addEventListener('click', () => {
  if (!lastRunResult || bonusClaimed) return;
  bonusClaimed = true;
  cancelAnimationFrame(reelRaf);

  const mult = getReelMultiplier(reelPos);
  const extraCoins = Math.round(lastRunResult.coinsEarned * (mult - 1));
  save.coins += extraCoins;
  save.totalCoinsEarned += extraCoins;
  saveGame(save);

  if (mult >= 3) sound.playNewRecord();
  else sound.playCoin();

  bumpPill(coinPill);
  resultCoins.textContent = `+${formatNumber(lastRunResult.coinsEarned + extraCoins)}`;
  btnBonus2x.disabled = true;
  btnBonus2x.innerHTML = `<span>${mult >= 3 ? '🔥 JACKPOT' : '✓'} ${mult}× CLAIMED! (+${formatNumber(extraCoins)})</span>`;
  updateHUD();
});

// ===== INTERACTIVE 3-TAP MYSTERY CHEST CEREMONY =====
let chestTapsLeft = 3;
let chestOpened = false;

function spawnChestConfetti(): void {
  chestConfettiLayer.innerHTML = '';
  const colors = ['#facc15', '#38bdf8', '#f472b6', '#4ade80', '#fb923c', '#ffffff'];
  for (let i = 0; i < 34; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    const angle = Math.random() * Math.PI * 2;
    const dist = 90 + Math.random() * 190;
    piece.style.background = colors[i % colors.length];
    piece.style.setProperty('--tx', `${Math.cos(angle) * dist}px`);
    piece.style.setProperty('--ty', `${Math.sin(angle) * dist - 40}px`);
    piece.style.setProperty('--rot', `${Math.round(Math.random() * 720 - 360)}deg`);
    chestConfettiLayer.appendChild(piece);
  }
}

function openChestCeremony(): void {
  chestTapsLeft = 3;
  chestOpened = false;
  chestImg.src = './icons/chest-closed.jpg';
  chest3d.classList.remove('opened', 'wobble', 'charge-1', 'charge-2');
  chestFlash.classList.remove('boom');
  chestCardsRow.classList.add('hidden');
  chestCardsRow.innerHTML = '';
  btnChestClaim.classList.add('hidden');
  chestConfettiLayer.innerHTML = '';
  chestRarityTag.textContent = '✨ MYSTERY CHEST ✨';
  chestTapHint.classList.remove('hidden');
  chestTapHint.textContent = t('tap3Chest');
  chestOverlay.classList.remove('hidden');
}

chestBoxWrap.addEventListener('click', () => {
  if (chestOpened) return;
  chestTapsLeft -= 1;

  chest3d.classList.remove('wobble');
  void chest3d.offsetWidth;
  chest3d.classList.add('wobble');

  if (chestTapsLeft > 0) {
    sound.playUpgrade();
    if (chestTapsLeft === 2) {
      chest3d.classList.add('charge-1');
      chestTapHint.textContent = t('tap2Chest');
    } else {
      chest3d.classList.add('charge-2');
      chestTapHint.textContent = t('tap1Chest');
    }
    return;
  }

  // BOOM! Flash burst + swap to bursting-open 3D chest + confetti + 3 reward cards!
  chestOpened = true;
  chest3d.classList.remove('charge-1', 'charge-2', 'wobble');
  chestImg.src = './icons/chest-open.jpg';
  chest3d.classList.add('opened');
  chestFlash.classList.remove('boom');
  void chestFlash.offsetWidth;
  chestFlash.classList.add('boom');
  chestTapHint.classList.add('hidden');
  spawnChestConfetti();
  sound.playChestOpen();

  const league = getCurrentLeague(save);
  const gemMult = league.tier >= 3 ? 1.5 : 1;
  const bonusCoins = Math.round((65 + save.batLevel * 18) * league.coinMult);
  const bonusGems = Math.round((4 + Math.floor(Math.random() * 4)) * gemMult);
  save.coins += bonusCoins;
  save.gems += bonusGems;

  // Card 3: 22% chance for a FREE unowned Shop Gear item, otherwise a FREE activated Powerup!
  const unowned = SHOP_ITEMS.filter((i) => !save.ownedItems.includes(i.id));
  let card3Emoji = '🔥';
  let card3Val = 'Fireball';
  let card3Label = 'FREE POWERUP';
  let isLegendary = false;

  if (unowned.length > 0 && Math.random() < 0.22) {
    const gift = unowned[Math.floor(Math.random() * Math.min(5, unowned.length))];
    save.ownedItems.push(gift.id);
    card3Emoji = gift.emoji;
    card3Val = gift.name;
    card3Label = 'NEW GEAR!';
    isLegendary = true;
  } else {
    const freePu = POWERUPS[Math.floor(Math.random() * POWERUPS.length)];
    save.activePowerups[freePu.id] = true;
    card3Emoji = freePu.emoji;
    card3Val = freePu.name;
    card3Label = 'ACTIVE BOOST';
  }

  chestRarityTag.textContent = isLegendary ? '🌟 LEGENDARY DROP!! 🌟' : '🎉 EPIC LOOT!! 🎉';

  chestCardsRow.innerHTML = `
    <div class="loot-card" style="animation-delay:0.05s">
      <div class="loot-emoji">🪙</div>
      <div class="loot-val">+${formatNumber(bonusCoins)}</div>
      <div class="loot-label">Coins</div>
    </div>
    <div class="loot-card" style="animation-delay:0.18s">
      <div class="loot-emoji">💎</div>
      <div class="loot-val">+${bonusGems}</div>
      <div class="loot-label">Gems</div>
    </div>
    <div class="loot-card epic" style="animation-delay:0.32s">
      <div class="loot-emoji">${card3Emoji}</div>
      <div class="loot-val">${card3Val}</div>
      <div class="loot-label">${card3Label}</div>
    </div>
  `;
  chestCardsRow.classList.remove('hidden');
  btnChestClaim.classList.remove('hidden');

  saveGame(save);
  bumpPill(coinPill);
  bumpPill(gemPill);
  updateHUD();
});

btnChestClaim.addEventListener('click', () => {
  chestOverlay.classList.add('hidden');
  if (chestsRemaining > 0) {
    btnOpenChest.textContent = `🎁 OPEN NEXT CHEST (${chestsRemaining})`;
  } else {
    btnOpenChest.classList.add('hidden');
  }
});

btnOpenChest.addEventListener('click', () => {
  if (chestsRemaining <= 0) return;
  chestsRemaining -= 1;
  openChestCeremony();
});

btnShare.addEventListener('click', async () => {
  const dist = Math.max(save.bestDistance, lastRunResult?.distance || 0);
  const name = encodeURIComponent(save.playerName || 'Slugger');
  const baseUrl = `${window.location.origin}${window.location.pathname}`;
  const shareUrl = `${baseUrl}?rival=${name}&dist=${dist}`;
  const shareText = `⚾ I crushed a ${dist}m home run in MEGA BAT RUSH! Can you beat my 3D flag?`;

  try {
    if (navigator.share) {
      await navigator.share({ title: 'Mega Bat Rush Challenge', text: shareText, url: shareUrl });
      return;
    }
  } catch {
    // fallback to clipboard
  }

  try {
    await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
    btnShare.textContent = '✓ LINK COPIED!';
    setTimeout(() => { btnShare.textContent = '⚔️ CHALLENGE'; }, 1800);
  } catch {
    prompt('Copy your friend challenge link:', shareUrl);
  }
});

btnContinue.addEventListener('click', () => {
  cancelAnimationFrame(reelRaf);
  game.resetToIdle(true);
});

// ===== MODAL HELPERS =====
function openModal(panel: HTMLElement): void {
  [modalPowerups, modalShop, modalLeague, modalLeaderboard, modalQuests, modalSettings].forEach((p) =>
    p.classList.add('hidden')
  );
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

// ===== POWERUPS MODAL (LOADOUT CAP + SCALED PRICING + COOLDOWNS) =====
function renderPowerupsModal(): void {
  const maxSlots = getMaxPowerupSlots(save);
  const activeCount = Object.keys(save.activePowerups).filter((k) => save.activePowerups[k]).length;
  const slotsFull = activeCount >= maxSlots;

  const descEl = modalPowerups.querySelector('.modal-desc');
  if (descEl) {
    descEl.innerHTML =
      `Active Loadout: <strong>${activeCount} / ${maxSlots}</strong>` +
      (maxSlots < 2 ? ' • <em>Unlock 2nd slot at Major League!</em>' : ' • <em>2-Slot Pro Loadout</em>');
  }

  powerupListEl.innerHTML = '';
  for (const pu of POWERUPS) {
    const isActive = !!save.activePowerups[pu.id];
    const cd = save.powerupCooldowns[pu.id] || 0;
    const cost = getPowerupCost(pu, save);
    const canAfford = pu.currency === 'coins' ? save.coins >= cost : save.gems >= cost;
    const disabled = isActive || cd > 0 || slotsFull || !canAfford;

    const btnText = isActive
      ? 'ACTIVE ✓'
      : cd > 0
      ? `⏳ ${cd} SWINGS`
      : slotsFull
      ? 'SLOT FULL'
      : `${pu.currency === 'coins' ? '🪙' : '💎'} ${formatNumber(cost)}`;

    const row = document.createElement('div');
    row.className = `powerup-row${isActive ? ' active' : ''}`;
    row.innerHTML = `
      <div class="pu-icon">${pu.emoji}</div>
      <div class="pu-info">
        <div class="pu-name">${pu.name}</div>
        <div class="pu-desc">${pu.desc} (${pu.cooldownSwings}-swing CD)</div>
      </div>
      <button class="pu-btn${isActive ? ' active' : ''}" ${disabled ? 'disabled' : ''}>
        ${btnText}
      </button>
    `;
    const btn = row.querySelector('button')!;
    btn.addEventListener('click', () => {
      if (disabled) return;
      if (pu.currency === 'coins') save.coins -= cost;
      else save.gems -= cost;
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

// ===== SHOP MODAL (WITH SET BONUSES) =====
function renderShopModal(): void {
  const activeSet = getActiveGearSet(save);
  if (activeSet) {
    setBonusBarEl.className = 'set-bonus-bar active';
    setBonusBarEl.textContent = `✨ ACTIVE SET — ${activeSet.emoji} ${activeSet.name}: ${activeSet.desc}`;
  } else {
    setBonusBarEl.className = 'set-bonus-bar';
    setBonusBarEl.innerHTML =
      `<strong>Set Bonuses:</strong> ` +
      GEAR_SETS.map((s) => `${s.emoji} ${s.name}`).join(' • ') +
      `<br/>Match Helmet + Bat + Trail to activate!`;
  }

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

// ===== LEAGUE PRESTIGE MODAL =====
function renderLeagueModal(): void {
  const cur = getCurrentLeague(save);
  const next = getNextLeague(save);
  const brokenCount = save.brokenWalls.length;

  let html = `
    <div class="league-card current">
      <div class="league-title">${cur.emoji} ${cur.name}</div>
      <div class="league-sub">
        <strong>Permanent Multipliers:</strong> ${cur.coinMult}× Coins • ${Math.round((cur.powerMult - 1) * 100)}% Power<br/>
        <strong>Walls Smashed:</strong> ${brokenCount} / ${WALLS.length} (+${Math.round((getWallCoinMultiplier(save) - 1) * 100)}% Coins)<br/>
        ${cur.relicDesc}
      </div>
    </div>
  `;

  if (next) {
    const unlocked = save.bestDistance >= next.reqDistance;
    html += `
      <div class="league-card">
        <div class="league-title">NEXT: ${next.emoji} ${next.name}</div>
        <div class="league-sub">
          Requires Best Distance: <strong>${next.reqDistance}m</strong> (You: ${save.bestDistance}m)<br/>
          Unlocks: <strong>${next.coinMult}× Coins</strong> & <strong>+${Math.round((next.powerMult - 1) * 100)}% Power</strong><br/>
          ${next.relicDesc}<br/><br/>
          <em>Resets Bat/Muscle/Income levels & coins. Keeps ALL Bats, Helmets, Trails, Skins, Gems & Broken Walls!</em>
        </div>
        <button class="btn-promote" id="btn-do-promote" ${!unlocked ? 'disabled' : ''}>
          ${unlocked ? `🏆 PROMOTE TO ${next.name.toUpperCase()}!` : `REACH ${next.reqDistance}m TO PROMOTE`}
        </button>
      </div>
    `;
  } else {
    html += `<div class="league-card"><div class="league-title">👑 MAX LEAGUE REACHED!</div><div class="league-sub">You are a true Hall of Fame legend!</div></div>`;
  }

  leagueContentEl.innerHTML = html;
  const promoteBtn = document.getElementById('btn-do-promote');
  if (promoteBtn) {
    promoteBtn.addEventListener('click', () => {
      if (!next || save.bestDistance < next.reqDistance) return;
      save.leagueTier += 1;
      save.batLevel = 1;
      save.muscleLevel = 1;
      save.incomeLevel = 1;
      save.coins = 60;
      save.gems += 25;
      saveGame(save);
      sound.playChestOpen();
      game.refreshAppearance();
      updateHUD();
      renderLeagueModal();
      showCallout(`🏆 ${next.name.toUpperCase()}!!`, '#facc15', true);
    });
  }
}

$('btn-league').addEventListener('click', () => {
  renderLeagueModal();
  openModal(modalLeague);
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

// ===== GLOBAL LEADERBOARD MODAL =====
async function renderLeaderboardModal(forceSubmit = false): Promise<void> {
  lbNameInput.value = save.playerName || 'Slugger';
  lbList.innerHTML = `<div class="lb-empty">${t('loadingRanks')}</div>`;
  lbYourRank.textContent = `${t('yourRank')}: ...`;

  try {
    let data = forceSubmit && save.bestDistance >= 1 ? await submitLeaderboardScore(save) : null;
    if (!data) {
      // Also auto-sync if player has a record!
      if (save.bestDistance >= 10) {
        data = await submitLeaderboardScore(save);
      }
      if (!data) data = await fetchLeaderboard(save.playerId);
    }

    lbYourRank.textContent = data.yourRank
      ? `${t('yourRank')}: #${data.yourRank} / ${data.totalPlayers} (${save.bestDistance}m)`
      : `${t('yourRank')}: — (${save.bestDistance}m)`;

    if (!data.entries.length) {
      lbList.innerHTML = `<div class="lb-empty">${t('noScoresYet')}</div>`;
      return;
    }

    lbList.innerHTML = data.entries
      .map((entry, idx) => {
        const rank = idx + 1;
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
        const leagueEmoji = (LEAGUES[entry.leagueTier] || LEAGUES[0]).emoji;
        const isMe = entry.playerId === save.playerId;
        const cls = `lb-row${isMe ? ' me' : ''}${rank === 1 ? ' top1' : ''}`;
        return `
          <div class="${cls}">
            <div class="lb-rank">${medal}</div>
            <div class="lb-name">${leagueEmoji} ${entry.name}${isMe ? ' (YOU)' : ''}</div>
            <div class="lb-dist">${entry.distance}m</div>
          </div>
        `;
      })
      .join('');
  } catch {
    lbYourRank.textContent = `${t('yourRank')}: —`;
    lbList.innerHTML = `<div class="lb-empty">${t('offlineRanks')}</div>`;
  }
}

$('btn-leaderboard').addEventListener('click', () => {
  openModal(modalLeaderboard);
  renderLeaderboardModal(false);
});

lbSaveBtn.addEventListener('click', () => {
  save.playerName = lbNameInput.value.trim().slice(0, 14) || 'Slugger';
  saveGame(save);
  sound.playUpgrade();
  renderLeaderboardModal(true);
});

lbRefreshBtn.addEventListener('click', () => {
  renderLeaderboardModal(false);
});

// ===== SETTINGS MODAL =====
$('btn-settings').addEventListener('click', () => {
  inputPlayerName.value = save.playerName || 'Slugger';
  selectLang.value = save.lang || 'en';
  toggleSound.checked = save.soundEnabled;
  toggleMusic.checked = save.musicEnabled;
  toggleHaptics.checked = save.hapticsEnabled;
  settingsStatsEl.innerHTML = `
    <div><strong>Best Distance:</strong> ${save.bestDistance}m</div>
    <div><strong>League:</strong> ${getCurrentLeague(save).emoji} ${getCurrentLeague(save).name}</div>
    <div><strong>Bosses Defeated:</strong> ${save.bossDefeats}</div>
    <div><strong>Walls Smashed:</strong> ${save.brokenWalls.length} / ${WALLS.length}</div>
    <div><strong>Total Swings:</strong> ${save.totalSwings} (${save.totalPerfects} Perfects)</div>
  `;
  openModal(modalSettings);
});

inputPlayerName.addEventListener('change', () => {
  save.playerName = inputPlayerName.value.trim().slice(0, 14) || 'Slugger';
  saveGame(save);
});

selectLang.addEventListener('change', () => {
  save.lang = (selectLang.value === 'es' ? 'es' : 'en') as Lang;
  setLang(save.lang);
  saveGame(save);
  applyStaticLabels();
  updateHUD();
});

toggleSound.addEventListener('change', () => {
  save.soundEnabled = toggleSound.checked;
  sound.enabled = save.soundEnabled;
  saveGame(save);
});

toggleMusic.addEventListener('change', () => {
  save.musicEnabled = toggleMusic.checked;
  sound.setMusicEnabled(save.musicEnabled);
  saveGame(save);
});

toggleHaptics.addEventListener('change', () => {
  save.hapticsEnabled = toggleHaptics.checked;
  sound.haptics = save.hapticsEnabled;
  saveGame(save);
});

$('btn-reset-save').addEventListener('click', () => {
  if (!confirm('Reset all coins, gems, upgrades, leagues, and best distance?')) return;
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
applyStaticLabels();
updateHUD();
handlePhaseChange('IDLE');

// ===== PWA SERVICE WORKER & INSTALL PROMPT =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

let deferredInstallPrompt: (Event & { prompt: () => Promise<void> }) | null = null;
const btnInstallPwa = document.getElementById('btn-install-pwa') as HTMLButtonElement | null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e as Event & { prompt: () => Promise<void> };
  if (btnInstallPwa) btnInstallPwa.classList.remove('hidden');
});

if (btnInstallPwa) {
  btnInstallPwa.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    await deferredInstallPrompt.prompt();
    deferredInstallPrompt = null;
    btnInstallPwa.classList.add('hidden');
  });
}
