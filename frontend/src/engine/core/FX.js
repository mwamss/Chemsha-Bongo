/**
 * FX.js
 * Visual effects engine: lightweight canvas confetti, burst particles,
 * floating score indicators, and haptic feedback.
 */

export class FXManager {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement ? canvasElement.getContext('2d') : null;
    this.particles = [];
    this.animating = false;
    this.rafId = null;

    if (this.canvas) {
      this.resize();
      window.addEventListener('resize', () => this.resize());
    }
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  vibrate(pattern = [20]) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // Ignored
      }
    }
  }

  screenShake(target = document.body) {
    if (!target) return;
    target.classList.remove('screen-shake');
    // Force reflow
    void target.offsetWidth;
    target.classList.add('screen-shake');
    setTimeout(() => {
      target.classList.remove('screen-shake');
    }, 400);
  }

  showFloatingText(text, x, y, type = 'normal') {
    const el = document.createElement('div');
    el.className = `floating-score floating-${type}`;
    el.textContent = text;

    // Center or use provided coords
    const posX = x !== undefined ? x : window.innerWidth / 2;
    const posY = y !== undefined ? y : window.innerHeight / 2 - 40;

    el.style.left = `${posX}px`;
    el.style.top = `${posY}px`;

    document.body.appendChild(el);

    setTimeout(() => {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    }, 900);
  }

  // --- Canvas Particle Bursts ---

  burst(x, y, count = 25, colors = ['#06b6d4', '#3b82f6', '#10b981', '#f59e0b', '#ec4899']) {
    if (!this.ctx) return;
    const originX = x !== undefined ? x : window.innerWidth / 2;
    const originY = y !== undefined ? y : window.innerHeight / 2;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 2;
      this.particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        radius: Math.random() * 4 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: Math.random() * 0.03 + 0.015,
        gravity: 0.18
      });
    }

    if (!this.animating) {
      this.startLoop();
    }
  }

  confetti(duration = 2000) {
    if (!this.ctx) return;
    const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];
    const startTime = performance.now();

    const spawnConfetti = () => {
      if (performance.now() - startTime > duration) return;

      for (let i = 0; i < 5; i++) {
        this.particles.push({
          x: Math.random() * window.innerWidth,
          y: -10,
          vx: (Math.random() - 0.5) * 3,
          vy: Math.random() * 3 + 2,
          radius: Math.random() * 6 + 3,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 1,
          decay: 0.005,
          gravity: 0.05,
          rotation: Math.random() * 360,
          rotSpeed: (Math.random() - 0.5) * 10
        });
      }

      requestAnimationFrame(spawnConfetti);
    };

    spawnConfetti();
    if (!this.animating) {
      this.startLoop();
    }
  }

  startLoop() {
    this.animating = true;
    this.loop();
  }

  loop = () => {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, p.alpha);
      this.ctx.fillStyle = p.color;

      if (p.rotation !== undefined) {
        p.rotation += p.rotSpeed;
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate((p.rotation * Math.PI) / 180);
        this.ctx.fillRect(-p.radius, -p.radius, p.radius * 2, p.radius);
      } else {
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.restore();
    }

    if (this.particles.length > 0) {
      this.rafId = requestAnimationFrame(this.loop);
    } else {
      this.animating = false;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  };
}
