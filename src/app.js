/**
 * app.js
 * Main application entry point for Chemsha Bongo.
 * Initializes all core subsystems, binds UI interactions, and renders game lists.
 */

import { SoundSynth } from './core/SoundSynth.js';
import { StorageManager } from './core/Storage.js';
import { FXManager } from './core/FX.js';
import { GameManager } from './core/GameManager.js';
import { ScreenManager } from './ui/ScreenManager.js';
import { HUD } from './ui/HUD.js';
import { getAllGames } from './games/registry.js';

class App {
  constructor() {
    this.sound = null;
    this.storage = null;
    this.fx = null;
    this.hud = null;
    this.screens = null;
    this.gameManager = null;
  }

  init() {
    // 1. Initialize Subsystems
    this.sound = new SoundSynth();
    this.storage = new StorageManager();

    const canvasEl = document.getElementById('fx-canvas');
    this.fx = new FXManager(canvasEl);

    // Apply saved sound settings
    const settings = this.storage.getSettings();
    this.sound.setMuted(settings.soundMuted);

    // 2. Initialize UI Managers
    const appContainer = document.querySelector('.app-container');
    this.screens = new ScreenManager(appContainer);

    const hudEl = document.getElementById('game-hud');
    this.hud = new HUD(
      hudEl,
      () => this.gameManager.togglePause(),
      () => this.toggleSound()
    );
    this.hud.setMuteState(this.sound.muted);

    // 3. Initialize Game Manager
    const gameBoardContainer = document.getElementById('active-game-board');
    this.gameManager = new GameManager({
      sound: this.sound,
      storage: this.storage,
      fx: this.fx,
      screens: this.screens,
      hud: this.hud,
      gameContainer: gameBoardContainer
    });

    // 4. Expose Global Pillar Launcher
    window.launchGameFromPillar = (gameId) => {
      this.sound.playClick();
      this.gameManager.startFreePlay(gameId, 30);
    };

    // 5. Bind Global and Screen Events
    this.bindGlobalEvents();
    this.bindHomeEvents();
    this.bindSelectEvents();
    this.bindModalEvents();

    // 6. Initial Screen Setup & Dynamic Content
    this.updateGreetingAndDate();
    this.updateHomeStatsPreview();
    this.screens.showScreen('home');
  }

  updateGreetingAndDate() {
    const greetingEl = document.getElementById('home-greeting-text');
    const dateLabelEl = document.getElementById('home-date-label');
    const now = new Date();
    const hour = now.getHours();

    let timeGreeting = 'Habari ya Leo, Amani';
    if (hour < 12) timeGreeting = 'Habari ya Asubuhi, Amani';
    else if (hour < 17) timeGreeting = 'Habari ya Mchana, Amani';
    else timeGreeting = 'Habari ya Jioni, Amani';

    if (greetingEl) greetingEl.textContent = timeGreeting;

    const daysSwahili = ['Jumapili', 'Jumatatu', 'Jumanne', 'Jumatano', 'Alhamisi', 'Ijumaa', 'Jumamosi'];
    const monthsSwahili = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ago', 'Sep', 'Okt', 'Nov', 'Des'];

    const dayName = daysSwahili[now.getDay()];
    const monthName = monthsSwahili[now.getMonth()];
    const dateNum = now.getDate();

    if (dateLabelEl) {
      dateLabelEl.textContent = `${dayName}, ${dateNum} ${monthName} • Calm Focus`;
    }

    // Highlight current day in 7-day pebble habit tracker
    // Days index in UI: M (0), T (1), W (2), T (3), F (4), S (5), S (6)
    const jsDay = now.getDay(); // 0 is Sunday, 1 is Monday ...
    const uiDayIndex = jsDay === 0 ? 6 : jsDay - 1;
    const pebbles = document.querySelectorAll('.pebble-dot');
    pebbles.forEach((p, idx) => {
      p.classList.remove('today');
      if (idx === uiDayIndex) {
        p.classList.add('today');
      }
    });
  }

  toggleSound() {
    const isMuted = this.sound.toggleMute();
    this.storage.updateSettings({ soundMuted: isMuted });
    this.hud.setMuteState(isMuted);

    const homeSoundBtn = document.getElementById('home-sound-btn');
    if (homeSoundBtn) {
      homeSoundBtn.textContent = isMuted ? '🔇 Sound: Off' : '🔊 Sound: On';
    }
  }

  bindGlobalEvents() {
    // Unlock Web Audio on first click/keypress
    const unlockAudio = () => {
      this.sound.ensureContext();
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('keydown', unlockAudio);

    // ESC or 'P' to pause
    window.addEventListener('keydown', (e) => {
      if ((e.key === 'Escape' || e.key.toLowerCase() === 'p') && this.screens.currentScreen === 'play') {
        this.gameManager.togglePause();
      }
    });
  }

  bindHomeEvents() {
    const blitzBtn = document.getElementById('start-blitz-btn');
    if (blitzBtn) {
      blitzBtn.addEventListener('click', () => {
        this.sound.playClick();
        this.gameManager.startBlitzWorkout(3, 30);
      });
    }

    const freePlayBtn = document.getElementById('browse-games-btn');
    if (freePlayBtn) {
      freePlayBtn.addEventListener('click', () => {
        this.sound.playClick();
        this.renderGamePicker();
        this.screens.showScreen('select');
      });
    }

    const statsBtn = document.getElementById('view-stats-btn');
    if (statsBtn) {
      statsBtn.addEventListener('click', () => {
        this.sound.playClick();
        this.openStatsModal();
      });
    }

    const homeSoundBtn = document.getElementById('home-sound-btn');
    if (homeSoundBtn) {
      homeSoundBtn.textContent = this.sound.muted ? '🔇 Sound: Off' : '🔊 Sound: On';
      homeSoundBtn.addEventListener('click', () => {
        this.toggleSound();
      });
    }
  }

  bindSelectEvents() {
    const backBtn = document.getElementById('back-to-home-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.sound.playClick();
        this.updateHomeStatsPreview();
        this.screens.showScreen('home');
      });
    }
  }

  bindModalEvents() {
    // Pause modal buttons
    const resumeBtn = document.getElementById('pause-resume-btn');
    if (resumeBtn) {
      resumeBtn.addEventListener('click', () => {
        this.sound.playClick();
        this.gameManager.togglePause();
      });
    }

    const pauseQuitBtn = document.getElementById('pause-quit-btn');
    if (pauseQuitBtn) {
      pauseQuitBtn.addEventListener('click', () => {
        this.sound.playClick();
        this.gameManager.quitToMenu();
        this.updateHomeStatsPreview();
      });
    }

    // Summary to Home
    const summaryHomeBtn = document.getElementById('summary-home-btn');
    if (summaryHomeBtn) {
      summaryHomeBtn.addEventListener('click', () => {
        this.sound.playClick();
        this.updateHomeStatsPreview();
        this.screens.showScreen('home');
      });
    }

    // Blitz final buttons
    const blitzAgainBtn = document.getElementById('blitz-again-btn');
    if (blitzAgainBtn) {
      blitzAgainBtn.addEventListener('click', () => {
        this.sound.playClick();
        this.gameManager.startBlitzWorkout(3, 30);
      });
    }

    const blitzHomeBtn = document.getElementById('blitz-home-btn');
    if (blitzHomeBtn) {
      blitzHomeBtn.addEventListener('click', () => {
        this.sound.playClick();
        this.updateHomeStatsPreview();
        this.screens.showScreen('home');
      });
    }

    // Stats modal close
    const closeStatsBtn = document.getElementById('close-stats-btn');
    if (closeStatsBtn) {
      closeStatsBtn.addEventListener('click', () => {
        this.sound.playClick();
        const modal = document.getElementById('stats-modal');
        if (modal) modal.classList.remove('active');
      });
    }

    // Stats reset button
    const resetDataBtn = document.getElementById('reset-stats-btn');
    if (resetDataBtn) {
      resetDataBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset all scores, streaks, and stats?')) {
          this.storage.resetAll();
          this.openStatsModal();
          this.updateHomeStatsPreview();
          alert('Progress has been reset.');
        }
      });
    }
  }

  renderGamePicker() {
    const listEl = document.getElementById('game-select-grid');
    if (!listEl) return;

    listEl.innerHTML = '';
    const games = getAllGames();

    games.forEach(g => {
      const bestScore = this.storage.getHighScore(g.id);
      const bestStreak = this.storage.getBestStreak(g.id);

      const card = document.createElement('div');
      card.className = 'game-select-card calm-card';
      card.innerHTML = `
        <div class="game-card-top">
          <span class="game-card-icon">${g.icon}</span>
          <span class="game-category-chip">${g.categoryLabel}</span>
        </div>
        <h4 style="font-family: var(--font-display);">${g.title}</h4>
        <p>${g.description}</p>
        <div class="game-card-stats">
          <span>Personal Best: <strong>${bestScore.toLocaleString()}</strong></span>
          <span>Max Streak: <strong>${bestStreak}x</strong></span>
        </div>
      `;

      card.addEventListener('click', () => {
        this.sound.playClick();
        this.gameManager.startFreePlay(g.id, 30);
      });

      listEl.appendChild(card);
    });
  }

  updateHomeStatsPreview() {
    const totals = this.storage.getTotals();
    const streakEl = document.getElementById('home-best-streak');
    const bqEl = document.getElementById('home-best-bq');
    const gamesEl = document.getElementById('home-total-games');

    if (streakEl) streakEl.textContent = totals.highestOverallStreak;
    if (bqEl) bqEl.textContent = totals.bestBlitzScore > 0 ? totals.bestBlitzScore.toLocaleString() : '—';
    if (gamesEl) gamesEl.textContent = totals.gamesPlayed;
  }

  openStatsModal() {
    const modal = document.getElementById('stats-modal');
    if (!modal) return;

    const totals = this.storage.getTotals();
    document.getElementById('stat-total-games').textContent = totals.gamesPlayed;
    document.getElementById('stat-accuracy').textContent = `${totals.accuracy}%`;
    document.getElementById('stat-max-streak').textContent = `${totals.highestOverallStreak}x`;
    document.getElementById('stat-blitz-best').textContent = totals.bestBlitzScore.toLocaleString();
    document.getElementById('stat-blitz-rating').textContent = totals.bestBlitzRating;

    // Per game breakdown
    const breakdownEl = document.getElementById('stat-games-breakdown');
    if (breakdownEl) {
      breakdownEl.innerHTML = '';
      const games = getAllGames();
      games.forEach(g => {
        const score = this.storage.getHighScore(g.id);
        const streak = this.storage.getBestStreak(g.id);
        const row = document.createElement('div');
        row.className = 'blitz-breakdown-row';
        row.innerHTML = `
          <span>${g.icon} <strong>${g.title}</strong></span>
          <span>Score: <strong>${score.toLocaleString()}</strong> | Streak: <strong>${streak}x</strong></span>
        `;
        breakdownEl.appendChild(row);
      });
    }

    modal.classList.add('active');
  }
}

// Bootstrap once DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
