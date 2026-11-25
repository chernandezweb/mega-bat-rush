/**
 * Studio-grade procedural Web Audio SFX engine for Mega Bat Rush.
 * Uses a master DynamicsCompressor, synthesized stadium Convolution Reverb,
 * multi-layered acoustic transients, filtered noise bursts, and warm FM bells/marimba
 * so every hit, bounce, coin, and crowd swell sounds punchy and modern.
 */
class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private musicDuckBus: GainNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private reverbSend: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private musicTimer: number | null = null;
  private musicStep = 0;
  private musicMode: 'IDLE' | 'BOSS' | 'FLYING' = 'IDLE';

  public enabled = true;
  public musicEnabled = true;
  public haptics = true;

  private ensureContext(): AudioContext | null {
    if (!this.enabled && !this.musicEnabled) return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();

      // Master bus with soft limiter/compressor
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -10;
      comp.knee.value = 12;
      comp.ratio.value = 6;
      comp.attack.value = 0.003;
      comp.release.value = 0.14;

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.85;
      this.masterGain.connect(comp);
      comp.connect(this.ctx.destination);

      // Dedicated SFX & Music -> MusicDuck buses (per audio-design skill!)
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = 1.0;
      this.sfxBus.connect(this.masterGain);

      this.musicDuckBus = this.ctx.createGain();
      this.musicDuckBus.gain.value = 1.0;
      this.musicDuckBus.connect(this.masterGain);

      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = this.musicEnabled ? 0.22 : 0.0;
      this.musicBus.connect(this.musicDuckBus);

      // Synthesized stadium/park impulse response for spatial depth
      const irLen = Math.floor(this.ctx.sampleRate * 0.65);
      const irBuf = this.ctx.createBuffer(2, irLen, this.ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = irBuf.getChannelData(ch);
        for (let i = 0; i < irLen; i++) {
          const decay = Math.pow(1 - i / irLen, 2.8);
          d[i] = (Math.random() * 2 - 1) * decay * 0.45;
        }
      }
      this.reverbNode = this.ctx.createConvolver();
      this.reverbNode.buffer = irBuf;

      this.reverbSend = this.ctx.createGain();
      this.reverbSend.gain.value = 0.24;
      this.reverbSend.connect(this.reverbNode);
      this.reverbNode.connect(this.sfxBus);

      // Shared 1.2s pink-ish noise buffer
      const nLen = Math.floor(this.ctx.sampleRate * 1.2);
      this.noiseBuffer = this.ctx.createBuffer(1, nLen, this.ctx.sampleRate);
      const nd = this.noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < nLen; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.997 * b0 + white * 0.029;
        b1 = 0.985 * b1 + white * 0.032;
        b2 = 0.95 * b2 + white * 0.048;
        nd[i] = (b0 + b1 + b2 + white * 0.18) * 1.5;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    this.startMusicLoop();
    return this.ctx;
  }

  public setMusicEnabled(on: boolean): void {
    this.musicEnabled = on;
    if (this.musicBus && this.ctx) {
      this.musicBus.gain.setTargetAtTime(on ? 0.22 : 0.0, this.ctx.currentTime, 0.08);
    }
  }

  public setMusicMode(mode: 'IDLE' | 'BOSS' | 'FLYING'): void {
    this.musicMode = mode;
  }

  public duckMusic(durationSec = 0.45): void {
    if (!this.ctx || !this.musicDuckBus) return;
    const now = this.ctx.currentTime;
    this.musicDuckBus.gain.cancelScheduledValues(now);
    this.musicDuckBus.gain.setTargetAtTime(0.28, now, 0.015);
    this.musicDuckBus.gain.setTargetAtTime(1.0, now + durationSec, 0.18);
  }

  private startMusicLoop(): void {
    if (this.musicTimer !== null) return;
    // 124 BPM eighth-note groove (~242ms per step)
    this.musicTimer = window.setInterval(() => {
      if (!this.ctx || !this.musicEnabled || !this.musicBus || this.ctx.state !== 'running') return;
      const now = this.ctx.currentTime;
      const step = this.musicStep % 16;
      this.musicStep += 1;

      // Kick drum on 0, 4, 8, 12 (more driving during BOSS & FLYING)
      if (step % 4 === 0 || (this.musicMode === 'BOSS' && step === 14)) {
        const k = this.ctx.createOscillator();
        const kg = this.ctx.createGain();
        k.type = 'sine';
        k.frequency.setValueAtTime(120, now);
        k.frequency.exponentialRampToValueAtTime(42, now + 0.1);
        kg.gain.setValueAtTime(0.45, now);
        kg.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        k.connect(kg).connect(this.musicBus);
        k.start(now);
        k.stop(now + 0.13);
      }

      // Crisp off-beat hi-hat during FLYING & BOSS
      if ((this.musicMode !== 'IDLE' && step % 2 === 1) && this.noiseBuffer) {
        const h = this.ctx.createBufferSource();
        h.buffer = this.noiseBuffer;
        const hp = this.ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 6500;
        const hg = this.ctx.createGain();
        hg.gain.setValueAtTime(0.11, now);
        hg.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
        h.connect(hp).connect(hg).connect(this.musicBus);
        h.start(now, Math.random() * 0.4, 0.05);
      }

      // Warm upbeat stadium bassline (C - G - Am - F in IDLE/FLYING; tense minor in BOSS)
      const bassNotes =
        this.musicMode === 'BOSS'
          ? [130.81, 0, 130.81, 155.56, 174.61, 0, 155.56, 146.83]
          : [130.81, 0, 196.0, 0, 220.0, 0, 174.61, 196.0];
      const note = bassNotes[Math.floor(step / 2) % bassNotes.length];
      if (note > 0 && step % 2 === 0) {
        const b = this.ctx.createOscillator();
        const lp = this.ctx.createBiquadFilter();
        const bg = this.ctx.createGain();
        b.type = 'triangle';
        b.frequency.setValueAtTime(note, now);
        lp.type = 'lowpass';
        lp.frequency.value = this.musicMode === 'FLYING' ? 950 : 620;
        bg.gain.setValueAtTime(0.24, now);
        bg.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        b.connect(lp).connect(bg).connect(this.musicBus);
        b.start(now);
        b.stop(now + 0.22);
      }
    }, 240);
  }

  private out(): AudioNode {
    return this.sfxBus!;
  }

  private jitter(base: number, pct = 0.05): number {
    return base * (1 + (Math.random() * 2 - 1) * pct);
  }

  private playBellNote(
    ctx: AudioContext,
    freq: number,
    startTime: number,
    duration: number,
    volume: number,
    reverbAmt = 0.35
  ): void {
    // Warm FM bell / marimba synthesis (sounds like modern mobile games!)
    const carrier = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const modGain = ctx.createGain();
    const env = ctx.createGain();

    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(freq, startTime);

    mod.type = 'sine';
    mod.frequency.setValueAtTime(freq * 2.0, startTime);
    modGain.gain.setValueAtTime(freq * 0.85, startTime);
    modGain.gain.exponentialRampToValueAtTime(0.01, startTime + duration * 0.45);

    env.gain.setValueAtTime(0.001, startTime);
    env.gain.linearRampToValueAtTime(volume, startTime + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0008, startTime + duration);

    mod.connect(modGain).connect(carrier.frequency);
    carrier.connect(env);
    env.connect(this.out());
    if (this.reverbSend && reverbAmt > 0) {
      const send = ctx.createGain();
      send.gain.value = reverbAmt;
      env.connect(send).connect(this.reverbSend);
    }

    carrier.start(startTime);
    mod.start(startTime);
    carrier.stop(startTime + duration + 0.02);
    mod.stop(startTime + duration + 0.02);
  }

  public vibrate(pattern: number | number[]): void {
    if (!this.haptics) return;
    try {
      if (navigator.vibrate) navigator.vibrate(pattern);
    } catch {
      // ignore
    }
  }

  public playPitch(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;

    // Crisp leather-in-air pitch zip (filtered noise, no cheap beep!)
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 2.4;
    filter.frequency.setValueAtTime(950, now);
    filter.frequency.exponentialRampToValueAtTime(2400, now + 0.09);
    filter.frequency.exponentialRampToValueAtTime(600, now + 0.22);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.32, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    src.connect(filter).connect(gain).connect(this.out());
    src.start(now, Math.random() * 0.4, 0.24);
  }

  public playSwingWhoosh(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;

    // Heavy wooden bat air-cut whoosh
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.6;
    filter.frequency.setValueAtTime(320, now);
    filter.frequency.exponentialRampToValueAtTime(1650, now + 0.11);
    filter.frequency.exponentialRampToValueAtTime(420, now + 0.2);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.55, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.21);

    src.connect(filter).connect(gain).connect(this.out());
    src.start(now, Math.random() * 0.4, 0.22);
  }

  public playBatCrack(quality: 'PERFECT' | 'GREAT' | 'GOOD' | 'WEAK'): void {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;
    if (quality === 'PERFECT' || quality === 'GREAT') this.duckMusic(0.55);
    const now = ctx.currentTime;

    // Layer 1: Ultra-crisp wooden impact transient (dual formant resonance like real ash bat!)
    const formants =
      quality === 'PERFECT'
        ? [1180, 2450]
        : quality === 'GREAT'
        ? [1050, 2100]
        : quality === 'GOOD'
        ? [880, 1700]
        : [620, 1200];

    for (const freq of formants) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = freq;
      bp.Q.value = 3.2;

      const g = ctx.createGain();
      const peak = quality === 'PERFECT' ? 1.1 : quality === 'GREAT' ? 0.85 : 0.6;
      g.gain.setValueAtTime(peak, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

      src.connect(bp).connect(g).connect(this.out());
      if (this.reverbSend) g.connect(this.reverbSend);
      src.start(now, 0, 0.09);
    }

    // Layer 2: Solid low-end ball compression thump
    const thump = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(quality === 'PERFECT' ? 210 : 165, now);
    thump.frequency.exponentialRampToValueAtTime(48, now + 0.11);
    thumpGain.gain.setValueAtTime(quality === 'PERFECT' ? 0.72 : 0.45, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    thump.connect(thumpGain).connect(this.out());
    thump.start(now);
    thump.stop(now + 0.13);

    // Layer 3: Stadium crowd roar swell + bright triumph chime on GREAT / PERFECT!
    if (quality === 'PERFECT' || quality === 'GREAT') {
      const crowd = ctx.createBufferSource();
      crowd.buffer = this.noiseBuffer;
      const cf = ctx.createBiquadFilter();
      cf.type = 'bandpass';
      cf.frequency.setValueAtTime(750, now + 0.06);
      cf.frequency.linearRampToValueAtTime(1250, now + 0.45);
      cf.Q.value = 0.85;

      const cg = ctx.createGain();
      cg.gain.setValueAtTime(0.001, now + 0.04);
      cg.gain.linearRampToValueAtTime(quality === 'PERFECT' ? 0.28 : 0.15, now + 0.22);
      cg.gain.exponentialRampToValueAtTime(0.001, now + 1.05);

      crowd.connect(cf).connect(cg).connect(this.out());
      if (this.reverbSend) cg.connect(this.reverbSend);
      crowd.start(now + 0.04, 0, 1.05);
    }

    if (quality === 'PERFECT') {
      [587.33, 880, 1174.66].forEach((f, idx) => {
        this.playBellNote(ctx, f, now + 0.03 + idx * 0.045, 0.36, 0.14, 0.5);
      });
      this.vibrate([30, 18, 55]);
    } else if (quality === 'GREAT') {
      this.playBellNote(ctx, 659.25, now + 0.03, 0.24, 0.11, 0.3);
      this.vibrate(25);
    } else {
      this.vibrate(12);
    }
  }

  public playBounce(intensity = 1): void {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;
    const clamped = Math.min(1, Math.max(0.15, intensity));

    // Soft turf/concrete ball thud with micro pitch & volume variation (kills machine-gun repeat!)
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(this.jitter(125 + 55 * clamped, 0.06), now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.085);
    g.gain.setValueAtTime(this.jitter(0.32 * clamped, 0.1), now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.095);
    osc.connect(g).connect(this.out());
    osc.start(now);
    osc.stop(now + 0.1);

    const n = ctx.createBufferSource();
    n.buffer = this.noiseBuffer;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 650 + 500 * clamped;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.18 * clamped, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
    n.connect(lp).connect(ng).connect(this.out());
    n.start(now, Math.random() * 0.5, 0.05);
  }

  public playBoing(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Punchy sci-fi jump pad launch (layered sub + warm upward harmonic whoosh)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.18);
    gain.gain.setValueAtTime(0.36, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain).connect(this.out());
    if (this.reverbSend) gain.connect(this.reverbSend);
    osc.start(now);
    osc.stop(now + 0.23);

    this.playBellNote(ctx, 783.99, now + 0.02, 0.24, 0.15, 0.45);
    this.vibrate(22);
  }

  public playExplosion(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;

    // Deep cinematic sub-drop + filtered debris crackle
    const sub = ctx.createOscillator();
    const sg = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(115, now);
    sub.frequency.exponentialRampToValueAtTime(28, now + 0.34);
    sg.gain.setValueAtTime(0.65, now);
    sg.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
    sub.connect(sg).connect(this.out());
    sub.start(now);
    sub.stop(now + 0.38);

    const n = ctx.createBufferSource();
    n.buffer = this.noiseBuffer;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(900, now);
    lp.frequency.exponentialRampToValueAtTime(110, now + 0.38);
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.6, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    n.connect(lp).connect(ng).connect(this.out());
    if (this.reverbSend) ng.connect(this.reverbSend);
    n.start(now, 0, 0.42);
    this.vibrate([38, 18, 35]);
  }

  public playCoin(): void {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Crisp glossy double-chime bell with subtle pitch variation
    this.playBellNote(ctx, this.jitter(1174.66, 0.04), now, 0.18, 0.16, 0.35);
    this.playBellNote(ctx, this.jitter(1567.98, 0.04), now + 0.055, 0.26, 0.18, 0.45);
  }

  public playUpgrade(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Snappy ascending marimba chord
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      this.playBellNote(ctx, f, now + i * 0.042, 0.22, 0.16, 0.35);
    });
    this.vibrate(15);
  }

  public playNewRecord(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Celebratory stadium fanfare arpeggio
    [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((f, i) => {
      this.playBellNote(ctx, f, now + i * 0.065, 0.4, 0.18, 0.55);
    });
    this.vibrate([25, 25, 50]);
  }

  public playSlam(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;

    // Meteor dive whoosh
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1400, now);
    bp.frequency.exponentialRampToValueAtTime(240, now + 0.22);
    bp.Q.value = 1.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.45, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    src.connect(bp).connect(g).connect(this.out());
    src.start(now, 0, 0.25);

    const sub = ctx.createOscillator();
    const sg = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(240, now);
    sub.frequency.exponentialRampToValueAtTime(65, now + 0.2);
    sg.gain.setValueAtTime(0.28, now);
    sg.gain.exponentialRampToValueAtTime(0.001, now + 0.21);
    sub.connect(sg).connect(this.out());
    sub.start(now);
    sub.stop(now + 0.22);
    this.vibrate(18);
  }

  public playMiss(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Soft muted descending woodblock/marimba (clean, never grating)
    this.playBellNote(ctx, 293.66, now, 0.14, 0.15, 0.15);
    this.playBellNote(ctx, 220.0, now + 0.09, 0.2, 0.15, 0.2);
  }

  public playHorn(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Warm filtered dual-tone NYC taxi honk ("beep-beep!")
    [0, 0.14].forEach((offset) => {
      [415.3, 523.25].forEach((freq) => {
        const osc = ctx.createOscillator();
        const lp = ctx.createBiquadFilter();
        const g = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + offset);
        lp.type = 'lowpass';
        lp.frequency.value = 1350;
        g.gain.setValueAtTime(0.001, now + offset);
        g.gain.linearRampToValueAtTime(0.09, now + offset + 0.015);
        g.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.11);
        osc.connect(lp).connect(g).connect(this.out());
        if (this.reverbSend) g.connect(this.reverbSend);
        osc.start(now + offset);
        osc.stop(now + offset + 0.12);
      });
    });
    this.vibrate(22);
  }

  public playWallSmash(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.playExplosion();
    // Sparkling glass/wood shatter chimes + triumphant chord
    [1318.5, 1760, 2093, 2637].forEach((f, i) => {
      this.playBellNote(ctx, f, now + 0.04 + i * 0.035, 0.25, 0.12, 0.6);
    });
    this.playNewRecord();
    this.vibrate([50, 25, 75]);
  }

  public playChestOpen(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98].forEach((f, i) => {
      this.playBellNote(ctx, f, now + i * 0.055, 0.42, 0.17, 0.55);
    });
    this.vibrate([20, 20, 45]);
  }
}

export const sound = new SoundEngine();
