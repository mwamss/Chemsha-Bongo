/**
 * SoundSynth.js
 * Zero-dependency procedural sound synthesizer powered by the Web Audio API.
 * Produces crisp, retro-modern auditory feedback without downloading any audio files.
 */

export class SoundSynth {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.initialized = true;
      }
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
    }
  }

  ensureContext() {
    if (!this.initialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMuted(isMuted) {
    this.muted = !!isMuted;
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  // --- Core Tone Generator Helpers ---

  tone(frequency, type = 'sine', duration = 0.1, gainVal = 0.15) {
    if (this.muted || !this.ctx) return;
    this.ensureContext();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);

    gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  // --- Sound Effects ---

  playClick() {
    if (this.muted || !this.ctx) return;
    this.ensureContext();
    this.tone(800, 'sine', 0.04, 0.08);
  }

  playTick() {
    if (this.muted || !this.ctx) return;
    this.ensureContext();
    this.tone(1200, 'triangle', 0.03, 0.05);
  }

  playCountdown(isGo = false) {
    if (this.muted || !this.ctx) return;
    this.ensureContext();
    if (isGo) {
      // High energetic beep for GO!
      this.tone(880, 'triangle', 0.25, 0.2);
      setTimeout(() => this.tone(1174.66, 'sine', 0.3, 0.2), 60);
    } else {
      // 3, 2, 1 prep tone
      this.tone(440, 'triangle', 0.15, 0.15);
    }
  }

  playCorrect(streak = 1) {
    if (this.muted || !this.ctx) return;
    this.ensureContext();

    // Scale pitch up as streak increases (Pentatonic scale)
    const basePitches = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50]; // C5, D5, E5, G5, A5, C6
    const index = Math.min(streak - 1, basePitches.length - 1);
    const primary = basePitches[index >= 0 ? index : 0];
    const secondary = primary * 1.25; // Major third or overtone

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(primary, now);
    osc2.frequency.setValueAtTime(secondary, now);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.18);
    osc2.stop(now + 0.18);
  }

  playWrong() {
    if (this.muted || !this.ctx) return;
    this.ensureContext();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.22);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.22);
  }

  playComboStreak() {
    if (this.muted || !this.ctx) return;
    this.ensureContext();
    // A quick ascending triad fanfare for combo milestone (5x, 10x)
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.tone(freq, 'sine', 0.15, 0.15);
      }, idx * 60);
    });
  }

  playGameOver() {
    if (this.muted || !this.ctx) return;
    this.ensureContext();
    const notes = [659.25, 587.33, 523.25, 392.00];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.tone(freq, 'triangle', 0.25, 0.15);
      }, idx * 100);
    });
  }

  playVictory() {
    if (this.muted || !this.ctx) return;
    this.ensureContext();
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.tone(freq, 'sine', 0.3, 0.18);
      }, idx * 80);
    });
  }

  playSingingBowl() {
    if (this.muted || !this.ctx) return;
    this.ensureContext();
    const freqs = [216, 432, 648, 864];
    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      const amp = 0.09 / (idx + 1);
      gain.gain.setValueAtTime(amp, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 4.5);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 4.5);
    });
  }
}
