/**
 * HUD.js
 * Heads-Up Display manager for real-time round stats:
 * precision timer bar, current score, streak multiplier badge, and pause controls.
 */

export class HUD {
  constructor(hudElement, onPauseClick, onMuteClick) {
    this.el = hudElement;
    this.onPauseClick = onPauseClick;
    this.onMuteClick = onMuteClick;

    this.scoreValEl = null;
    this.streakValEl = null;
    this.timerBarEl = null;
    this.timerTextEl = null;
    this.titleEl = null;
    this.categoryEl = null;
    this.muteBtn = null;
    this.pauseBtn = null;

    this.displayedScore = 0;
    this.scoreAnimId = null;

    this.init();
  }

  init() {
    this.el.innerHTML = `
      <div class="hud-top-bar">
        <div class="hud-game-info">
          <span id="hud-category-tag" class="hud-tag">FOCUS</span>
          <h2 id="hud-game-title" class="hud-title">Color Clash</h2>
        </div>

        <div class="hud-stats-group">
          <div class="hud-stat-box score-stat">
            <span class="hud-label">SCORE</span>
            <span id="hud-score-value" class="hud-num">0</span>
          </div>

          <div class="hud-stat-box streak-stat">
            <span class="hud-label">STREAK</span>
            <div class="streak-value-wrapper">
              <span class="streak-flame">🔥</span>
              <span id="hud-streak-value" class="hud-num">0</span>
              <span id="hud-multiplier-badge" class="hud-multiplier">x1</span>
            </div>
          </div>
        </div>

        <div class="hud-actions-group">
          <button id="hud-mute-btn" class="hud-icon-btn" title="Toggle Sound">🔊</button>
          <button id="hud-pause-btn" class="hud-icon-btn" title="Pause Game">⏸</button>
        </div>
      </div>

      <div class="hud-timer-track">
        <div id="hud-timer-bar" class="hud-timer-fill"></div>
        <div id="hud-timer-text" class="hud-timer-time">30.0s</div>
      </div>
    `;

    this.scoreValEl = this.el.querySelector('#hud-score-value');
    this.streakValEl = this.el.querySelector('#hud-streak-value');
    this.multiplierEl = this.el.querySelector('#hud-multiplier-badge');
    this.timerBarEl = this.el.querySelector('#hud-timer-bar');
    this.timerTextEl = this.el.querySelector('#hud-timer-text');
    this.titleEl = this.el.querySelector('#hud-game-title');
    this.categoryEl = this.el.querySelector('#hud-category-tag');
    this.muteBtn = this.el.querySelector('#hud-mute-btn');
    this.pauseBtn = this.el.querySelector('#hud-pause-btn');

    if (this.pauseBtn && this.onPauseClick) {
      this.pauseBtn.addEventListener('click', () => this.onPauseClick());
    }
    if (this.muteBtn && this.onMuteClick) {
      this.muteBtn.addEventListener('click', () => this.onMuteClick());
    }
  }

  setGameInfo(title, categoryName) {
    if (this.titleEl) this.titleEl.textContent = title;
    if (this.categoryEl) this.categoryEl.textContent = categoryName.toUpperCase();
  }

  setMuteState(isMuted) {
    if (this.muteBtn) {
      this.muteBtn.textContent = isMuted ? '🔇' : '🔊';
      this.muteBtn.classList.toggle('muted', isMuted);
    }
  }

  setPauseState(isPaused) {
    if (this.pauseBtn) {
      this.pauseBtn.textContent = isPaused ? '▶' : '⏸';
    }
  }

  updateScore(targetScore) {
    if (!this.scoreValEl) return;

    if (this.scoreAnimId) cancelAnimationFrame(this.scoreAnimId);

    const startVal = this.displayedScore;
    const diff = targetScore - startVal;
    const duration = 250;
    const startTime = performance.now();

    const animate = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      this.displayedScore = Math.floor(startVal + diff * progress);
      this.scoreValEl.textContent = this.displayedScore.toLocaleString();

      if (progress < 1) {
        this.scoreAnimId = requestAnimationFrame(animate);
      } else {
        this.displayedScore = targetScore;
        this.scoreValEl.textContent = targetScore.toLocaleString();
      }
    };

    this.scoreAnimId = requestAnimationFrame(animate);
  }

  updateStreak(streak, multiplier = 1) {
    if (this.streakValEl) this.streakValEl.textContent = streak;
    if (this.multiplierEl) {
      this.multiplierEl.textContent = `x${multiplier}`;
      this.multiplierEl.className = `hud-multiplier ${multiplier > 2 ? 'hot-streak' : ''}`;
    }

    const streakBox = this.el.querySelector('.streak-stat');
    if (streakBox) {
      streakBox.classList.toggle('active-streak', streak >= 3);
    }
  }

  updateTimer(remainingMs, percentRemaining) {
    if (this.timerBarEl) {
      this.timerBarEl.style.width = `${percentRemaining}%`;

      if (percentRemaining < 20) {
        this.timerBarEl.style.backgroundColor = '#ef4444';
        this.timerBarEl.classList.add('timer-panic');
      } else if (percentRemaining < 45) {
        this.timerBarEl.style.backgroundColor = '#f59e0b';
        this.timerBarEl.classList.remove('timer-panic');
      } else {
        this.timerBarEl.style.backgroundColor = '#06b6d4';
        this.timerBarEl.classList.remove('timer-panic');
      }
    }

    if (this.timerTextEl) {
      const sec = (remainingMs / 1000).toFixed(1);
      this.timerTextEl.textContent = `${sec}s`;
    }
  }

  reset() {
    this.displayedScore = 0;
    if (this.scoreValEl) this.scoreValEl.textContent = '0';
    if (this.streakValEl) this.streakValEl.textContent = '0';
    if (this.multiplierEl) {
      this.multiplierEl.textContent = 'x1';
      this.multiplierEl.className = 'hud-multiplier';
    }
    if (this.timerBarEl) {
      this.timerBarEl.style.width = '100%';
      this.timerBarEl.style.backgroundColor = '#06b6d4';
      this.timerBarEl.classList.remove('timer-panic');
    }
    if (this.timerTextEl) this.timerTextEl.textContent = '30.0s';
  }
}
