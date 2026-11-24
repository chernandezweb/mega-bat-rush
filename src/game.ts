import * as THREE from 'three';
import {
  GameSave,
  getEquippedItem,
  getIncomeMultiplier,
  saveGame,
} from './state';
import { GameWorld } from './world';
import { sound } from './audio';

export type GamePhase = 'IDLE' | 'PITCHING' | 'HITSTOP' | 'FLYING' | 'RESULT';
export type HitQuality = 'PERFECT' | 'GREAT' | 'GOOD' | 'WEAK' | 'MISS';

export interface RunResult {
  distance: number;
  maxHeight: number;
  bounces: number;
  bonuses: number;
  quality: HitQuality;
  coinsEarned: number;
  gemsEarned: number;
  isNewRecord: boolean;
  wasGolden: boolean;
}

export interface GameCallbacks {
  onPhaseChange: (phase: GamePhase) => void;
  onPitchUpdate: (progress: number, pitchLabel: string, isGolden: boolean) => void;
  onFlightUpdate: (
    distance: number,
    speedMph: number,
    zoneName: string,
    liveCoins: number,
    slamsLeft: number,
    canSlam: boolean
  ) => void;
  onCallout: (text: string, color?: string, big?: boolean) => void;
  onRunComplete: (result: RunResult) => void;
  onStateChanged: () => void;
}

export class BaseballGame {
  public world: GameWorld;
  public save: GameSave;
  public phase: GamePhase = 'IDLE';

  private cb: GameCallbacks;
  private rafId = 0;
  private lastTime = 0;
  private elapsed = 0;

  // Pitching state
  private pitchTimer = 0;
  private windupDuration = 0.56;
  private pitchDuration = 0.9;
  private pitchProgress = 0;
  private pitchLabel = 'FASTBALL';
  private pitchIsGolden = false;
  private pitchCurve = 0;
  private pitchReleasePos = new THREE.Vector3(0.35, 1.85, -13.6);
  private releaseCaptured = false;
  private hasSwung = false;
  private swingAnimTimer = 0;

  // Hitstop & camera shake
  private hitstopTimer = 0;
  private shakeIntensity = 0;

  // Ball physics
  private ballPos = new THREE.Vector3();
  private ballVel = new THREE.Vector3();
  private maxRunSpeed = 30;
  private maxHeight = 0;
  private bounces = 0;
  private bonuses = 0;
  private boostHitsThisRun = 0;
  private bonusCoins = 0;
  private hitQuality: HitQuality = 'GOOD';
  private passedRecordThisRun = false;
  private slamsLeft = 1;
  private isSlamming = false;
  private runActivePowerups: Record<string, boolean> = {};

  // Camera smoothing
  private camPos = new THREE.Vector3(-0.15, 2.5, 4.55);
  private camLook = new THREE.Vector3(0.0, 1.45, -14);

  constructor(canvas: HTMLCanvasElement, save: GameSave, cb: GameCallbacks) {
    this.save = save;
    this.cb = cb;
    this.world = new GameWorld(canvas, save);
    sound.enabled = save.soundEnabled;
    sound.haptics = save.hapticsEnabled;

    this.resetToIdle(false);
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  public destroy(): void {
    cancelAnimationFrame(this.rafId);
  }

  public resize(): void {
    this.world.resize();
  }

  public refreshAppearance(): void {
    this.world.applyAppearance(this.save);
    this.world.updateBestFlag(this.save.bestDistance);
  }

  public handlePrimaryTap(): void {
    if (this.phase === 'IDLE') {
      this.startPitch();
    } else if (this.phase === 'PITCHING' && !this.hasSwung) {
      this.executeSwing();
    } else if (this.phase === 'FLYING') {
      this.tryPowerSlam();
    }
  }

  public resetToIdle(rebuildChunks = true): void {
    this.phase = 'IDLE';
    this.hasSwung = false;
    this.swingAnimTimer = 0;
    this.pitchTimer = 0;
    this.pitchProgress = 0;
    this.releaseCaptured = false;
    this.isSlamming = false;
    this.slamsLeft = 1;
    this.shakeIntensity = 0;

    this.world.ball.visible = false;
    this.world.ballShadow.visible = false;
    this.world.targetRing.visible = false;
    this.world.resetTrail();

    if (rebuildChunks) {
      this.world.clearChunks();
      this.world.ensureChunksAround(0, !!this.save.activePowerups.superbounce);
    }
    this.world.updateBestFlag(this.save.bestDistance);
    this.world.updateBiomeVisuals(0);

    this.camPos.set(-0.15, 2.5, 4.55);
    this.camLook.set(0.0, 1.45, -14);
    this.world.camera.fov = 56;
    this.world.camera.updateProjectionMatrix();

    this.poseBatterIdle(0);
    this.posePitcherIdle(0);

    this.cb.onPhaseChange('IDLE');
  }

  private startPitch(): void {
    this.phase = 'PITCHING';
    this.pitchTimer = 0;
    this.pitchProgress = 0;
    this.releaseCaptured = false;
    this.hasSwung = false;
    this.swingAnimTimer = 0;
    this.maxHeight = 0;
    this.bounces = 0;
    this.bonuses = 0;
    this.boostHitsThisRun = 0;
    this.bonusCoins = 0;
    this.passedRecordThisRun = false;
    this.isSlamming = false;

    this.runActivePowerups = { ...this.save.activePowerups };
    this.slamsLeft = this.runActivePowerups.superbounce ? 2 : 1;

    const isGolden =
      !!this.runActivePowerups.goldenpitch ||
      (this.save.totalSwings > 0 && (this.save.totalSwings + 1) % 5 === 0);
    this.pitchIsGolden = isGolden;

    if (isGolden) {
      this.pitchLabel = '✨ GOLDEN PITCH (2.5×)';
      this.pitchDuration = 0.94;
      this.pitchCurve = 0;
    } else if (this.save.totalSwings >= 3 && Math.random() < 0.35) {
      this.pitchLabel = '🌀 CURVEBALL';
      this.pitchDuration = 1.0;
      this.pitchCurve = (Math.random() > 0.5 ? 1 : -1) * 0.95;
    } else {
      this.pitchLabel = '🔥 FASTBALL';
      this.pitchDuration = Math.max(0.76, 0.92 - Math.min(0.12, this.save.batLevel * 0.003));
      this.pitchCurve = 0;
    }

    this.world.clearChunks();
    this.world.ensureChunksAround(0, !!this.runActivePowerups.superbounce);

    this.world.ball.visible = true;
    this.world.ballShadow.visible = true;
    this.world.targetRing.visible = true;

    const ballMat = this.world.ball.material as THREE.MeshStandardMaterial;
    ballMat.emissive.setHex(isGolden ? 0xf59e0b : 0x000000);
    ballMat.emissiveIntensity = isGolden ? 0.6 : 0;

    this.cb.onPhaseChange('PITCHING');
    this.cb.onPitchUpdate(0, this.pitchLabel, this.pitchIsGolden);
  }

  private executeSwing(): void {
    this.hasSwung = true;
    this.swingAnimTimer = 0.001;
    sound.playSwingWhoosh();

    const helmetItem = getEquippedItem(this.save, 'helmets');
    const batItem = getEquippedItem(this.save, 'bats');

    // Sweet spot centered at 0.88; scales with Bat level, Helmet perk, and Giant Sweet Spot powerup!
    const sweetMult =
      (1 + (helmetItem.sweetSpotBonus || 0)) * (this.runActivePowerups.sweetspot ? 1.85 : 1.0);
    const batSweetAdd = Math.min(0.045, (this.save.batLevel - 1) * 0.0025);
    const diff = Math.abs(this.pitchProgress - 0.88);

    if (this.pitchProgress < 0.35 || diff > 0.36) {
      this.handleMiss('TOO EARLY!');
      return;
    }

    let qualityMult = 0.68;
    let launchAngleDeg = 27;
    let color = '#4ade80';

    if (diff <= (0.06 + batSweetAdd * 0.4) * sweetMult) {
      this.hitQuality = 'PERFECT';
      qualityMult = 1.32;
      launchAngleDeg = 35;
      color = '#facc15';
      this.save.combo += 1;
      this.save.totalPerfects += 1;
      this.recordMissionProgress('perfects', 1);
      this.hitstopTimer = 0.085;
      this.shakeIntensity = 0.4;
      this.cb.onCallout(
        this.save.combo > 1 ? `PERFECT!! 🔥x${this.save.combo}` : 'PERFECT!!',
        '#facc15',
        true
      );
      this.world.triggerShockwave(this.ballPos, 0xfacc15);
      this.world.spawnBurst(this.ballPos, 0xfacc15, 24, 12);
    } else if (diff <= (0.135 + batSweetAdd * 0.75) * sweetMult) {
      this.hitQuality = 'GREAT';
      qualityMult = 1.06;
      launchAngleDeg = 31;
      color = '#38bdf8';
      this.hitstopTimer = 0.045;
      this.shakeIntensity = 0.22;
      this.cb.onCallout('GREAT HIT!', '#38bdf8', true);
      this.world.triggerShockwave(this.ballPos, 0x38bdf8);
      this.world.spawnBurst(this.ballPos, 0x38bdf8, 16, 9);
    } else if (diff <= (0.24 + batSweetAdd) * sweetMult) {
      this.hitQuality = 'GOOD';
      qualityMult = 0.84;
      launchAngleDeg = 26;
      color = '#4ade80';
      this.save.combo = 0;
      this.hitstopTimer = 0.02;
      this.shakeIntensity = 0.1;
      this.cb.onCallout('GOOD!', color, false);
      this.world.spawnBurst(this.ballPos, 0xffffff, 10, 7);
    } else {
      this.hitQuality = 'WEAK';
      qualityMult = 0.55;
      launchAngleDeg = 20;
      this.save.combo = 0;
      this.hitstopTimer = 0;
      this.shakeIntensity = 0.05;
      this.cb.onCallout(this.pitchProgress < 0.88 ? 'EARLY!' : 'LATE!', '#fb923c', false);
      this.world.spawnBurst(this.ballPos, 0xffffff, 8, 5);
    }

    sound.playBatCrack(this.hitQuality);

    // Consume powerups
    this.save.totalSwings += 1;
    this.save.activePowerups = {};
    saveGame(this.save);
    this.cb.onStateChanged();

    // Well-paced progression curve:
    // Lv 1 Bat + Lv 1 Muscle -> GOOD ~45m, GREAT ~65m, PERFECT ~90m!
    // Upgrading Bat, Muscle, Helmets, Bats & Powerups visibly pushes you to 150m -> 300m -> 600m -> 1200m+!
    const equipPower = 1 + (batItem.powerBonus || 0) + (helmetItem.powerBonus || 0);
    const upgradeFactor = 1 + (this.save.batLevel - 1) * 0.08 + (this.save.muscleLevel - 1) * 0.095;
    const comboBonus = 1 + Math.min(0.35, this.save.combo * 0.05);
    const fireballBonus = this.runActivePowerups.fireball ? 1.28 : 1.0;

    const launchSpeed =
      22.5 * Math.pow(upgradeFactor, 0.56) * qualityMult * equipPower * comboBonus * fireballBonus;
    this.maxRunSpeed = launchSpeed * 1.15;

    const angleRad = (launchAngleDeg * Math.PI) / 180;
    const timingBias = (this.pitchProgress - 0.88) * 3.0;
    this.ballVel.set(
      THREE.MathUtils.clamp(timingBias, -1.4, 1.4),
      Math.sin(angleRad) * launchSpeed,
      -Math.cos(angleRad) * launchSpeed
    );

    this.ballPos.set(0.05, 1.32, 0.1);
    this.world.ball.position.copy(this.ballPos);
    this.world.targetRing.visible = false;
    this.world.resetTrail();

    if (this.runActivePowerups.fireball) {
      const bm = this.world.ball.material as THREE.MeshStandardMaterial;
      bm.emissive.setHex(0xff4500);
      bm.emissiveIntensity = 0.9;
    }

    this.phase = this.hitstopTimer > 0 ? 'HITSTOP' : 'FLYING';
    this.cb.onPhaseChange(this.phase);
  }

  private handleMiss(label: string): void {
    this.hitQuality = 'MISS';
    this.save.combo = 0;
    this.world.targetRing.visible = false;
    sound.playMiss();
    this.cb.onCallout(label, '#ef4444', true);
    this.cb.onStateChanged();

    setTimeout(() => {
      if (this.phase === 'PITCHING') {
        this.resetToIdle(false);
      }
    }, 680);
  }

  private tryPowerSlam(): void {
    if (this.isSlamming || this.slamsLeft <= 0 || this.ballPos.y < 2.2) return;
    this.isSlamming = true;
    this.slamsLeft -= 1;
    this.ballVel.y = Math.min(this.ballVel.y, -22);
    sound.playSlam();
    this.cb.onCallout('⚡ POWER SLAM!', '#38bdf8', false);
    this.world.spawnBurst(this.ballPos, 0x38bdf8, 14, 8);
  }

  private recordMissionProgress(type: 'distance' | 'perfects' | 'upgrades' | 'bonuses', value: number): void {
    for (const m of this.save.missions) {
      if (m.type === type) {
        if (type === 'distance') {
          m.progress = Math.max(m.progress, value);
        } else {
          m.progress = Math.min(m.target, m.progress + value);
        }
      }
    }
  }

  private finishRun(): void {
    this.phase = 'RESULT';
    const distance = Math.max(1, Math.round(-this.ballPos.z));
    const isNewRecord = distance > this.save.bestDistance;

    if (isNewRecord) {
      this.save.bestDistance = distance;
      sound.playNewRecord();
    }

    const batItem = getEquippedItem(this.save, 'bats');
    const helmetItem = getEquippedItem(this.save, 'helmets');
    const gearCoinMult = 1 + (batItem.coinBonus || 0) + (helmetItem.coinBonus || 0);
    const incomeMult = getIncomeMultiplier(this.save.incomeLevel);
    const qualityBonus =
      this.hitQuality === 'PERFECT' ? 1.45 : this.hitQuality === 'GREAT' ? 1.18 : 1.0;
    const goldenMult = this.pitchIsGolden ? 2.5 : 1.0;

    const baseCoins = Math.round(distance * 0.65 * incomeMult * gearCoinMult * qualityBonus * goldenMult);
    const coinsEarned = Math.max(12, baseCoins + this.bonusCoins);

    let gemsEarned = 0;
    if (isNewRecord && distance >= 35) gemsEarned += 4;
    if (distance >= 200) gemsEarned += Math.floor(distance / 200) * 3;
    if (this.hitQuality === 'PERFECT' && this.save.combo >= 3) gemsEarned += 3;

    this.save.coins += coinsEarned;
    this.save.gems += gemsEarned;
    this.save.totalCoinsEarned += coinsEarned;
    this.recordMissionProgress('distance', distance);
    saveGame(this.save);

    this.cb.onPhaseChange('RESULT');
    this.cb.onStateChanged();
    this.cb.onRunComplete({
      distance,
      maxHeight: Math.round(this.maxHeight),
      bounces: this.bounces,
      bonuses: this.bonuses,
      quality: this.hitQuality,
      coinsEarned,
      gemsEarned,
      isNewRecord,
      wasGolden: this.pitchIsGolden,
    });
  }

  private loop = (now: number): void => {
    this.rafId = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.elapsed += dt;

    this.update(dt);
    this.world.render();
  };

  private update(dt: number): void {
    if (this.phase === 'IDLE') {
      this.poseBatterIdle(this.elapsed);
      this.posePitcherIdle(this.elapsed);
      this.world.camera.position.set(
        this.camPos.x + Math.sin(this.elapsed * 0.9) * 0.04,
        this.camPos.y + Math.sin(this.elapsed * 1.4) * 0.025,
        this.camPos.z
      );
      this.world.camera.lookAt(this.camLook);
      this.world.updateEffects(dt, this.elapsed, 0);
      return;
    }

    if (this.phase === 'PITCHING') {
      this.pitchTimer += dt;

      if (this.pitchTimer < this.windupDuration) {
        const w = this.pitchTimer / this.windupDuration;
        this.posePitcherWindup(w);
        this.poseBatterLoad(w * 0.6);
        // Ball stays right inside pitcher's throwing hand during windup!
        this.world.getPitcherHandWorldPos(this.ballPos);
        this.world.ball.position.copy(this.ballPos);
        this.world.ballShadow.position.set(this.ballPos.x, 0.04, this.ballPos.z);
        this.world.targetRing.scale.setScalar(2.35);
      } else {
        const flightTime = this.pitchTimer - this.windupDuration;
        if (!this.releaseCaptured) {
          this.releaseCaptured = true;
          this.posePitcherThrow(0.18);
          this.world.getPitcherHandWorldPos(this.pitchReleasePos);
          sound.playPitch();
        }
        this.pitchProgress = flightTime / this.pitchDuration;

        // Smooth pitching follow-through
        this.posePitcherThrow(Math.min(1, 0.18 + flightTime * 3.4));
        if (!this.hasSwung) {
          this.poseBatterLoad(Math.min(1, 0.6 + this.pitchProgress * 0.5));
        }

        // Interpolate ball from pitcher's actual release hand to the strike zone!
        const t = this.pitchProgress;
        const x = THREE.MathUtils.lerp(this.pitchReleasePos.x, 0.05, t) + Math.sin(t * Math.PI) * this.pitchCurve;
        const y = THREE.MathUtils.lerp(this.pitchReleasePos.y, 1.3, t) + Math.sin(Math.min(1, t) * Math.PI) * 0.42;
        const z = THREE.MathUtils.lerp(this.pitchReleasePos.z, 0.15, t);
        this.ballPos.set(x, y, z);
        this.world.ball.position.copy(this.ballPos);
        this.world.ball.rotation.x += dt * 18;
        this.world.ballShadow.position.set(this.ballPos.x, 0.04, this.ballPos.z);

        const ringScale = Math.max(0.55, 2.35 - (this.pitchProgress / 0.88) * 1.35);
        this.world.targetRing.scale.setScalar(ringScale);
        const ringMat = this.world.targetRing.material as THREE.MeshBasicMaterial;
        const distToSweet = Math.abs(this.pitchProgress - 0.88);
        if (distToSweet < 0.09) ringMat.color.setHex(0x4ade80);
        else if (distToSweet < 0.2) ringMat.color.setHex(0xfacc15);
        else ringMat.color.setHex(0xffffff);

        this.cb.onPitchUpdate(this.pitchProgress, this.pitchLabel, this.pitchIsGolden);

        if (this.pitchProgress > 1.18 && !this.hasSwung) {
          this.hasSwung = true;
          this.handleMiss('STRIKE! MISS');
        }
      }

      if (this.swingAnimTimer > 0) {
        this.swingAnimTimer += dt;
        this.poseBatterSwing(Math.min(1, this.swingAnimTimer / 0.26));
      }

      this.world.camera.position.copy(this.camPos);
      this.world.camera.lookAt(this.camLook);
      this.world.updateEffects(dt, this.elapsed, 0);
      return;
    }

    if (this.phase === 'HITSTOP') {
      this.hitstopTimer -= dt;
      this.swingAnimTimer += dt * 1.8;
      this.poseBatterSwing(Math.min(1, this.swingAnimTimer / 0.24));
      this.applyCameraShake();
      this.world.updateEffects(dt, this.elapsed, 0);
      if (this.hitstopTimer <= 0) {
        this.phase = 'FLYING';
        this.cb.onPhaseChange('FLYING');
      }
      return;
    }

    if (this.phase === 'FLYING') {
      if (this.swingAnimTimer < 0.45) {
        this.swingAnimTimer += dt;
        this.poseBatterSwing(Math.min(1, this.swingAnimTimer / 0.24));
      }

      const helmetItem = getEquippedItem(this.save, 'helmets');
      const glideFactor =
        (1 - (helmetItem.glideBonus || 0)) * (this.runActivePowerups.lowgrav ? 0.78 : 1.0);

      // Realistic gravity & air drag so every ball slows down naturally and comes to a clear stop!
      const gravity = this.isSlamming ? 42 : 24.5 * glideFactor;
      this.ballVel.y -= gravity * dt;
      this.ballVel.z *= Math.pow(0.89, dt); // real air resistance
      this.ballVel.x *= Math.pow(0.82, dt);

      if (Math.abs(this.ballPos.x) > 2.2) {
        this.ballVel.x -= Math.sign(this.ballPos.x) * 4.5 * dt;
      }

      this.ballPos.addScaledVector(this.ballVel, dt);
      this.maxHeight = Math.max(this.maxHeight, this.ballPos.y);

      // Ground bounce with clear energy loss per bounce!
      if (this.ballPos.y <= 0.22) {
        this.ballPos.y = 0.22;
        const impactVy = Math.abs(this.ballVel.y);
        if (impactVy > 2.4) {
          this.bounces += 1;
          const bounceUpgrade = Math.min(0.08, (this.save.incomeLevel - 1) * 0.004);
          const superBounceBonus = this.runActivePowerups.superbounce ? 0.12 : 0;
          const restitution = Math.min(0.66, 0.44 + bounceUpgrade + superBounceBonus);

          if (this.isSlamming) {
            // Tactical Power Slam bounce — capped so it's fun, never infinite!
            this.isSlamming = false;
            this.ballVel.y = Math.min(14, Math.max(8, impactVy * 0.52));
            this.ballVel.z = Math.max(-this.maxRunSpeed, this.ballVel.z - 4.2);
            this.shakeIntensity = 0.28;
            sound.playBoing();
            this.world.triggerShockwave(this.ballPos, 0x38bdf8);
            this.world.spawnBurst(this.ballPos, 0x38bdf8, 18, 9);
            this.cb.onCallout('SLAM BOUNCE!', '#38bdf8', false);
          } else {
            this.ballVel.y = impactVy * restitution;
            // Real ground friction on each bounce!
            this.ballVel.z *= this.runActivePowerups.superbounce ? 0.84 : 0.74;
            sound.playBounce(Math.min(1, impactVy / 20));
            this.world.spawnBurst(this.ballPos, 0xd1d5db, 5, 4);
          }
        } else {
          // Rolling smoothly to a full stop
          this.ballVel.y = 0;
          this.ballVel.z *= Math.pow(0.18, dt);
          this.isSlamming = false;
        }
      }

      // Check interactive props (capped additive boosts — NEVER infinite snowballing!)
      const props = this.world.getNearbyProps(this.ballPos.z);
      const magnetActive = !!this.runActivePowerups.magnet;
      for (const p of props) {
        const dx = this.ballPos.x - p.x;
        const dy = this.ballPos.y - p.y;
        const dz = this.ballPos.z - p.z;
        const distSq = dx * dx + dy * dy + dz * dz;

        if (magnetActive && p.type === 'ring' && distSq < 56) {
          p.x = THREE.MathUtils.lerp(p.x, this.ballPos.x, dt * 8);
          p.y = THREE.MathUtils.lerp(p.y, this.ballPos.y, dt * 8);
          p.mesh.position.set(p.x, p.y, p.z);
        }

        const hitRadius = p.radius + (p.type === 'ring' && magnetActive ? 1.2 : 0);
        if (distSq <= hitRadius * hitRadius) {
          p.triggered = true;
          this.bonuses += 1;
          this.save.totalBonuses += 1;
          this.recordMissionProgress('bonuses', 1);

          if (p.type === 'pad') {
            this.boostHitsThisRun += 1;
            const decay = Math.pow(0.7, this.boostHitsThisRun - 1);
            this.ballVel.y = Math.max(11 * decay, Math.min(15, Math.abs(this.ballVel.y) + 7 * decay));
            this.ballVel.z = Math.max(-this.maxRunSpeed, this.ballVel.z - 5.5 * decay);
            this.isSlamming = false;
            this.shakeIntensity = 0.22;
            sound.playBoing();
            this.world.triggerShockwave(this.ballPos, 0x06b6d4);
            this.world.spawnBurst(this.ballPos, 0x06b6d4, 16, 9);
            this.cb.onCallout('🚀 BOOST PAD!', '#22d3ee', false);
          } else if (p.type === 'barrel') {
            p.mesh.visible = false;
            this.boostHitsThisRun += 1;
            const decay = Math.pow(0.7, this.boostHitsThisRun - 1);
            this.ballVel.y = Math.max(11 * decay, Math.min(16, Math.abs(this.ballVel.y) + 8 * decay));
            this.ballVel.z = Math.max(-this.maxRunSpeed, this.ballVel.z - 7 * decay);
            this.isSlamming = false;
            this.shakeIntensity = 0.36;
            sound.playExplosion();
            this.world.triggerShockwave(this.ballPos, 0xf97316);
            this.world.spawnBurst(this.ballPos, 0xf97316, 22, 12);
            this.cb.onCallout('💥 BOOM BOOST!', '#fb923c', true);
          } else if (p.type === 'ring') {
            p.mesh.visible = false;
            const ringCoins = Math.round(
              (18 + this.save.incomeLevel * 10) * (magnetActive ? 2 : 1) * (this.pitchIsGolden ? 2 : 1)
            );
            this.bonusCoins += ringCoins;
            sound.playCoin();
            this.world.spawnBurst(this.ballPos, 0xfacc15, 14, 8);
            this.cb.onCallout(`+${ringCoins} 🪙`, '#facc15', false);
          }
        }
      }

      // Ball & shadow
      this.world.ball.position.copy(this.ballPos);
      this.world.ball.rotation.x -= dt * Math.abs(this.ballVel.z) * 0.9;
      this.world.ballShadow.position.set(this.ballPos.x, 0.04, this.ballPos.z);
      const shadowScale = Math.max(0.35, 1.15 - this.ballPos.y * 0.045);
      this.world.ballShadow.scale.setScalar(shadowScale);

      this.world.updateTrail(this.ballPos, this.save.equippedTrail === 'trail_rainbow', this.elapsed);
      this.world.ensureChunksAround(this.ballPos.z, !!this.runActivePowerups.superbounce);

      const dist = Math.max(0, Math.round(-this.ballPos.z));
      this.world.updateBiomeVisuals(dist);

      if (!this.passedRecordThisRun && this.save.bestDistance >= 20 && dist > this.save.bestDistance) {
        this.passedRecordThisRun = true;
        sound.playNewRecord();
        this.cb.onCallout('👑 NEW RECORD!!', '#facc15', true);
      }

      const speed = Math.abs(this.ballVel.z);
      const targetCam = new THREE.Vector3(
        this.ballPos.x * 0.45,
        Math.max(3.2, this.ballPos.y * 0.62 + 3.4),
        this.ballPos.z + 9.2 + Math.min(4.0, speed * 0.07)
      );
      this.camPos.lerp(targetCam, Math.min(1, dt * 6.5));
      const targetLook = new THREE.Vector3(
        this.ballPos.x * 0.6,
        Math.max(1.1, this.ballPos.y * 0.72),
        this.ballPos.z - 9
      );
      this.camLook.lerp(targetLook, Math.min(1, dt * 8));

      const targetFov = THREE.MathUtils.clamp(56 + speed * 0.22, 56, 70);
      this.world.camera.fov = THREE.MathUtils.lerp(this.world.camera.fov, targetFov, dt * 4);
      this.world.camera.updateProjectionMatrix();

      this.applyCameraShake();
      this.world.updateEffects(dt, this.elapsed, this.ballPos.z);

      const incomeMult = getIncomeMultiplier(this.save.incomeLevel);
      const liveCoins = Math.round(dist * 0.65 * incomeMult * (this.pitchIsGolden ? 2.5 : 1)) + this.bonusCoins;
      const biome = this.world.getBiomeInfo(dist);
      this.cb.onFlightUpdate(
        dist,
        Math.round(speed * 2.237),
        biome.name,
        liveCoins,
        this.slamsLeft,
        this.slamsLeft > 0 && this.ballPos.y >= 2.2 && !this.isSlamming
      );

      // Clean stop condition
      if (this.ballPos.y <= 0.25 && Math.abs(this.ballVel.z) < 1.8 && Math.abs(this.ballVel.y) < 0.6) {
        this.finishRun();
      }
      return;
    }

    // RESULT phase
    this.world.camera.position.lerp(
      new THREE.Vector3(this.ballPos.x + 2.8, 2.8, this.ballPos.z + 6.2),
      dt * 2.5
    );
    this.world.camera.lookAt(this.ballPos.x, 0.7, this.ballPos.z);
    this.world.updateEffects(dt, this.elapsed, this.ballPos.z);
  }

  private applyCameraShake(): void {
    if (this.shakeIntensity > 0.005) {
      const sx = (Math.random() - 0.5) * this.shakeIntensity;
      const sy = (Math.random() - 0.5) * this.shakeIntensity;
      this.world.camera.position.set(this.camPos.x + sx, this.camPos.y + sy, this.camPos.z);
      this.shakeIntensity *= 0.88;
    } else {
      this.world.camera.position.copy(this.camPos);
    }
    this.world.camera.lookAt(this.camLook);
  }

  // ===== REALISTIC ARTICULATED BASEBALL ANIMATIONS =====

  private poseBatterIdle(t: number): void {
    const b = this.world.batter;
    const waggle = Math.sin(t * 3.0) * 0.06;
    b.hips.position.y = 0.86 + Math.sin(t * 2.6) * 0.025;
    b.hips.rotation.set(0.08, 0, 0);
    b.torsoGroup.rotation.set(0.08, -0.18, 0);
    b.headGroup.rotation.set(0, 0.92, 0);

    b.leftLeg.hip.rotation.set(-0.22, 0, -0.18);
    b.leftLeg.knee.rotation.set(0.32, 0, 0);
    b.rightLeg.hip.rotation.set(-0.22, 0, 0.18);
    b.rightLeg.knee.rotation.set(0.32, 0, 0);

    // Righty batter: hands tucked near back (right, -X) shoulder, arms bent cleanly
    b.leftArm.shoulder.rotation.set(-0.95, 0.25, -0.45);
    b.leftArm.elbow.rotation.set(-1.3, 0, 0);
    b.rightArm.shoulder.rotation.set(-0.85, -0.55, 0.3);
    b.rightArm.elbow.rotation.set(-1.15, 0, 0);

    // Bat held behind righty batter's back shoulder, barrel angled UP and LEFT-BACK (clear of head!)
    if (b.swingPivot && b.batPivot) {
      b.swingPivot.rotation.set(0, 0, 0);
      b.batPivot.position.set(-0.28, 0.02, 0.24);
      b.batPivot.rotation.set(-0.95 + waggle, 0, 0.38);
    }
  }

  private poseBatterLoad(p: number): void {
    const b = this.world.batter;
    b.hips.position.y = 0.84;
    b.hips.rotation.set(0.1, -0.15 * p, 0);
    b.torsoGroup.rotation.set(0.1, -0.28 * p - 0.18, 0);
    b.headGroup.rotation.set(0, 1.02, 0);

    b.leftLeg.hip.rotation.set(-0.28 - 0.16 * p, 0, -0.2);
    b.leftLeg.knee.rotation.set(0.38 + 0.14 * p, 0, 0);
    b.rightLeg.hip.rotation.set(-0.25, 0, 0.2);
    b.rightLeg.knee.rotation.set(0.38, 0, 0);

    b.leftArm.shoulder.rotation.set(-1.02, 0.35 * p + 0.25, -0.5);
    b.leftArm.elbow.rotation.set(-1.35, 0, 0);
    b.rightArm.shoulder.rotation.set(-0.9, -0.62, 0.35);
    b.rightArm.elbow.rotation.set(-1.15, 0, 0);

    // Cock bat slightly further back behind shoulder ready to whip!
    if (b.swingPivot && b.batPivot) {
      b.swingPivot.rotation.set(0, -0.24 * p, 0);
      b.batPivot.position.set(-0.32, 0.05, 0.22);
      b.batPivot.rotation.set(-1.08 - 0.12 * p, 0, 0.48);
    }
  }

  private poseBatterSwing(p: number): void {
    const b = this.world.batter;
    const ease = 1 - Math.pow(1 - p, 3);
    const levelOut = Math.sin(Math.min(1, p * 1.15) * Math.PI);

    b.hips.position.y = 0.85;
    b.hips.rotation.set(0.06, THREE.MathUtils.lerp(-0.15, 0.85, ease), 0);
    b.torsoGroup.rotation.set(0.05, THREE.MathUtils.lerp(-0.46, 0.95, ease), 0);
    b.headGroup.rotation.set(0, THREE.MathUtils.lerp(1.02, -0.35, ease), 0);

    b.leftLeg.hip.rotation.set(-0.12, 0, -0.16);
    b.leftLeg.knee.rotation.set(0.15, 0, 0);
    b.rightLeg.hip.rotation.set(0.15 * ease, 0.45 * ease, 0.18);
    b.rightLeg.knee.rotation.set(0.35, 0, 0);

    b.leftArm.shoulder.rotation.set(
      THREE.MathUtils.lerp(-1.02, -1.45, ease),
      THREE.MathUtils.lerp(0.6, -0.85, ease),
      THREE.MathUtils.lerp(-0.5, 0.35, ease)
    );
    b.leftArm.elbow.rotation.set(THREE.MathUtils.lerp(-1.35, -0.35, levelOut), 0, 0);

    b.rightArm.shoulder.rotation.set(
      THREE.MathUtils.lerp(-0.9, -1.4, ease),
      THREE.MathUtils.lerp(-0.62, 0.75, ease),
      THREE.MathUtils.lerp(0.35, 0.5, ease)
    );
    b.rightArm.elbow.rotation.set(THREE.MathUtils.lerp(-1.15, -0.3, levelOut), 0, 0);

    // True righty horizontal swing: from back shoulder (-X) -> across plate (+Z) -> front follow-through (+X)!
    if (b.swingPivot && b.batPivot) {
      b.swingPivot.rotation.set(0.16 * levelOut, THREE.MathUtils.lerp(-0.24, 2.0, ease), 0);
      b.batPivot.position.set(
        THREE.MathUtils.lerp(-0.32, -0.1, levelOut),
        0.04,
        THREE.MathUtils.lerp(0.22, 0.4, levelOut)
      );
      b.batPivot.rotation.set(
        THREE.MathUtils.lerp(-1.15, 1.42, Math.min(1, p * 2.1)),
        0,
        THREE.MathUtils.lerp(0.48, -0.35, ease)
      );
    }
  }

  private posePitcherIdle(t: number): void {
    const p = this.world.pitcher;
    const breath = Math.sin(t * 2.6) * 0.02;
    p.hips.position.set(0, 0.88 + breath, 0);
    p.hips.rotation.set(0, 0, 0);
    p.torsoGroup.rotation.set(0.06, 0, 0);
    p.headGroup.rotation.set(0, 0, 0);

    p.leftLeg.hip.rotation.set(-0.08, 0, -0.1);
    p.leftLeg.knee.rotation.set(0.14, 0, 0);
    p.rightLeg.hip.rotation.set(-0.08, 0, 0.1);
    p.rightLeg.knee.rotation.set(0.14, 0, 0);

    // Both hands tucked together in glove at chest (classic baseball "set" position!)
    p.leftArm.shoulder.rotation.set(-0.75, 0.35, -0.15);
    p.leftArm.elbow.rotation.set(-1.25, 0, 0);
    p.rightArm.shoulder.rotation.set(-0.75, -0.35, 0.15);
    p.rightArm.elbow.rotation.set(-1.25, 0, 0);
  }

  private posePitcherWindup(w: number): void {
    const p = this.world.pitcher;
    // Phase 1 (0..0.6): High leg kick & turn sideways
    // Phase 2 (0.6..1.0): Cock throwing arm high & back behind head, begin stride!
    const kick = Math.sin(Math.min(1, w / 0.75) * Math.PI * 0.5);
    const cock = Math.max(0, (w - 0.35) / 0.65);

    p.hips.position.set(0, 0.88 - cock * 0.1, cock * 0.35);
    p.hips.rotation.set(0, -0.95 * kick, 0);
    p.torsoGroup.rotation.set(-0.18 * cock, -0.45 * cock, 0);
    // Keep eyes locked on batter!
    p.headGroup.rotation.set(0, 0.95 * kick + 0.35 * cock, 0);

    // High front (left) leg kick!
    p.leftLeg.hip.rotation.set(-1.55 * kick + cock * 0.35, 0, -0.1);
    p.leftLeg.knee.rotation.set(1.55 * kick - cock * 0.5, 0, 0);
    // Back leg loads on rubber
    p.rightLeg.hip.rotation.set(-0.18 * cock, 0, 0.12);
    p.rightLeg.knee.rotation.set(0.32 * cock, 0, 0);

    // Left glove arm points toward home plate!
    p.leftArm.shoulder.rotation.set(-1.15 * cock - 0.5, 0.5, -0.35 * cock);
    p.leftArm.elbow.rotation.set(-0.5 * (1 - cock), 0, 0);

    // Right throwing arm reaches WAY back & up behind head (super clear baseball throw!)
    p.rightArm.shoulder.rotation.set(
      THREE.MathUtils.lerp(-0.75, -2.75, cock),
      -0.3,
      THREE.MathUtils.lerp(0.15, 0.85, cock)
    );
    p.rightArm.elbow.rotation.set(THREE.MathUtils.lerp(-1.25, -0.95, cock), 0, 0);
  }

  private posePitcherThrow(t: number): void {
    const p = this.world.pitcher;
    const ease = 1 - Math.pow(1 - t, 3);

    // Lunge forward off mound & whip throwing arm over the top!
    p.hips.position.set(0, 0.78, THREE.MathUtils.lerp(0.35, 1.05, ease));
    p.hips.rotation.set(0.15 * ease, THREE.MathUtils.lerp(-0.95, 0.35, ease), 0);
    p.torsoGroup.rotation.set(THREE.MathUtils.lerp(-0.18, 0.45, ease), THREE.MathUtils.lerp(-0.45, 0.55, ease), 0);
    p.headGroup.rotation.set(-0.25 * ease, THREE.MathUtils.lerp(1.2, -0.65, ease), 0);

    // Front leg plants forward, back leg kicks up behind
    p.leftLeg.hip.rotation.set(THREE.MathUtils.lerp(-1.1, -0.55, ease), 0, -0.1);
    p.leftLeg.knee.rotation.set(THREE.MathUtils.lerp(0.9, 0.55, ease), 0, 0);
    p.rightLeg.hip.rotation.set(THREE.MathUtils.lerp(-0.1, 0.95, ease), 0, 0.15);
    p.rightLeg.knee.rotation.set(0.45, 0, 0);

    // Glove tucks into chest
    p.leftArm.shoulder.rotation.set(-0.7, 0.4, -0.45);
    p.leftArm.elbow.rotation.set(-1.35, 0, 0);

    // Right throwing arm whips from overhead (-2.75) all the way across body (+0.95)!
    p.rightArm.shoulder.rotation.set(
      THREE.MathUtils.lerp(-2.75, 0.85, ease),
      THREE.MathUtils.lerp(-0.3, -0.75, ease),
      THREE.MathUtils.lerp(0.85, -0.35, ease)
    );
    p.rightArm.elbow.rotation.set(THREE.MathUtils.lerp(-0.95, -0.35, ease), 0, 0);
  }
}
