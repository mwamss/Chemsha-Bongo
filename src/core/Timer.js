/**
 * Timer.js
 * Sub-millisecond precision countdown timer using requestAnimationFrame
 * and performance.now() to prevent tab-throttling jitter.
 */

export class PrecisionTimer {
  constructor() {
    this.durationMs = 0;
    this.remainingMs = 0;
    this.startTime = null;
    this.rafId = null;
    this.isRunning = false;
    this.isPaused = false;
    this.lastSecond = null;

    // Callbacks
    this.onTick = null;       // (remainingMs, percent, totalMs)
    this.onSecond = null;     // (secondsRemaining)
    this.onComplete = null;   // ()
  }

  start(seconds, callbacks = {}) {
    this.stop();

    this.durationMs = seconds * 1000;
    this.remainingMs = this.durationMs;
    this.lastSecond = Math.ceil(seconds);

    this.onTick = callbacks.onTick || null;
    this.onSecond = callbacks.onSecond || null;
    this.onComplete = callbacks.onComplete || null;

    this.isRunning = true;
    this.isPaused = false;
    this.startTime = performance.now();

    this.loop();
  }

  loop = () => {
    if (!this.isRunning || this.isPaused) return;

    const now = performance.now();
    const elapsed = now - this.startTime;
    this.remainingMs = Math.max(0, this.durationMs - elapsed);

    const percent = Math.max(0, Math.min(100, (this.remainingMs / this.durationMs) * 100));
    const currentSecond = Math.ceil(this.remainingMs / 1000);

    if (this.onTick) {
      this.onTick(this.remainingMs, percent, this.durationMs);
    }

    if (currentSecond !== this.lastSecond) {
      this.lastSecond = currentSecond;
      if (this.onSecond) {
        this.onSecond(currentSecond);
      }
    }

    if (this.remainingMs <= 0) {
      this.stop();
      if (this.onComplete) {
        this.onComplete();
      }
      return;
    }

    this.rafId = requestAnimationFrame(this.loop);
  };

  pause() {
    if (!this.isRunning || this.isPaused) return;
    this.isPaused = true;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  resume() {
    if (!this.isRunning || !this.isPaused) return;
    this.isPaused = false;
    // Recalibrate start time to preserve remaining duration
    this.startTime = performance.now() - (this.durationMs - this.remainingMs);
    this.rafId = requestAnimationFrame(this.loop);
  }

  stop() {
    this.isRunning = false;
    this.isPaused = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.startTime = null;
  }

  addTime(seconds) {
    if (!this.isRunning) return;
    const addMs = seconds * 1000;
    this.durationMs += addMs;
    this.remainingMs += addMs;
  }

  getFormattedTime() {
    const totalSec = Math.max(0, Math.ceil(this.remainingMs / 1000));
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
}
