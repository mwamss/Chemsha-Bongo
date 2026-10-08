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
    this.breathInterval = null;
    this.isBreathingInhaling = true;
    this.ambientPlaying = false;
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
    this.bindBottomNavEvents();

    // 6. Initial Screen Setup & Dynamic Content
    this.updateGreetingAndDate();
    this.updateHomeStatsPreview();
    this.screens.showScreen('home');

    // Prompt for surname on start if not already set
    if (!this.storage.getSurname()) {
      setTimeout(() => {
        this.openSurnameModal();
      }, 300);
    }
  }

  updateGreetingAndDate() {
    const salutationEl = document.getElementById('home-greeting-salutation');
    const surnameDisplayEl = document.getElementById('home-surname-display');
    const dateLabelEl = document.getElementById('home-date-label');
    const timePhaseEl = document.getElementById('home-time-phase');
    const now = new Date();
    const hour = now.getHours();

    let salutation = 'Good morning';
    let phase = 'Morning Focus';
    if (hour >= 12 && hour < 17) {
      salutation = 'Good afternoon';
      phase = 'Midday Clarity';
    } else if (hour >= 17) {
      salutation = 'Good evening';
      phase = 'Evening Reflection';
    }

    if (salutationEl) salutationEl.textContent = salutation;
    if (timePhaseEl) timePhaseEl.textContent = phase;

    const savedSurname = this.storage.getSurname();
    if (surnameDisplayEl) {
      surnameDisplayEl.textContent = savedSurname || 'Player';
      surnameDisplayEl.title = savedSurname 
        ? `Surname: ${savedSurname} (Click to edit)` 
        : 'Click to enter your surname';
    }

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const dayName = days[now.getDay()];
    const monthName = months[now.getMonth()];
    const dateNum = now.getDate();

    if (dateLabelEl) {
      dateLabelEl.textContent = `${dayName}, ${monthName} ${dateNum}`;
    }

    // Highlight current day in 7-day pebble habit tracker
    // Days index in UI: M (0), T (1), W (2), T (3), F (4), S (5), S (6)
    const jsDay = now.getDay();
    const uiDayIndex = jsDay === 0 ? 6 : jsDay - 1;
    const pebbleItems = document.querySelectorAll('.pebble-item');
    pebbleItems.forEach((item, idx) => {
      const dot = item.querySelector('.pebble-dot');
      const icon = item.querySelector('.material-symbols-outlined');
      const label = item.querySelector('span:last-child');
      if (!dot) return;

      if (idx === uiDayIndex) {
        // Today
        dot.className = 'w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-md ring-2 ring-primary/20 pebble-dot';
        if (icon) {
          icon.textContent = 'spa';
          icon.className = 'material-symbols-outlined text-secondary-fixed text-[18px]';
        }
        if (label) {
          label.className = 'font-label-sm text-label-sm text-primary font-bold';
        }
      } else if (idx < uiDayIndex) {
        // Earlier days
        dot.className = 'w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center shadow-sm pebble-dot';
        if (icon) {
          icon.textContent = 'eco';
          icon.className = 'material-symbols-outlined text-on-secondary-container text-[18px]';
        }
        if (label) {
          label.className = 'font-label-sm text-label-sm text-on-surface-variant font-medium';
        }
      } else {
        // Later days
        dot.className = 'w-10 h-10 rounded-full bg-surface-container flex items-center justify-center pebble-dot';
        if (icon) {
          icon.textContent = 'pause';
          icon.className = 'material-symbols-outlined text-outline text-[16px]';
        }
        if (label) {
          label.className = 'font-label-sm text-label-sm text-outline';
        }
      }
    });
  }

  toggleSound() {
    const isMuted = this.sound.toggleMute();
    this.storage.updateSettings({ soundMuted: isMuted });
    this.hud.setMuteState(isMuted);
  }

  toggleAmbientSound() {
    const ambientBtn = document.getElementById('ambient-play-toggle');
    if (!ambientBtn) return;

    this.ambientPlaying = !this.ambientPlaying;
    const icon = ambientBtn.querySelector('.material-symbols-outlined');
    if (icon) {
      icon.textContent = this.ambientPlaying ? 'pause' : 'play_arrow';
    }

    if (this.ambientPlaying) {
      ambientBtn.classList.add('bg-secondary', 'text-on-secondary');
      ambientBtn.classList.remove('bg-surface-container-lowest', 'text-on-surface');
      this.sound.playSingingBowl();
    } else {
      ambientBtn.classList.remove('bg-secondary', 'text-on-secondary');
      ambientBtn.classList.add('bg-surface-container-lowest', 'text-on-surface');
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
        this.openMindfulModal();
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

    const ambientBtn = document.getElementById('ambient-play-toggle');
    if (ambientBtn) {
      ambientBtn.addEventListener('click', () => {
        this.toggleAmbientSound();
      });
    }

    const editSurnameBtn = document.getElementById('edit-surname-btn');
    if (editSurnameBtn) {
      editSurnameBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.sound.playClick();
        this.openSurnameModal();
      });
    }

    const surnameDisplay = document.getElementById('home-surname-display');
    if (surnameDisplay) {
      surnameDisplay.addEventListener('click', () => {
        this.sound.playClick();
        this.openSurnameModal();
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
          this.updateGreetingAndDate();
          alert('Progress has been reset.');
        }
      });
    }

    // Surname Modal Events
    const surnameForm = document.getElementById('surname-form');
    if (surnameForm) {
      surnameForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('surname-input');
        const val = input ? input.value.trim() : '';
        if (val) {
          this.storage.setSurname(val);
          this.sound.playCorrect(1);
          this.updateGreetingAndDate();
          this.closeSurnameModal();
        }
      });
    }

    const surnameSkipBtn = document.getElementById('surname-skip-btn');
    if (surnameSkipBtn) {
      surnameSkipBtn.addEventListener('click', () => {
        this.sound.playClick();
        this.closeSurnameModal();
      });
    }

    // Mindful Breathing Modal Events
    const closeModalBtn = document.getElementById('close-modal-btn');
    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', () => {
        this.sound.playClick();
        this.closeMindfulModal();
      });
    }

    const proceedWorkoutBtn = document.getElementById('proceed-workout-btn');
    if (proceedWorkoutBtn) {
      proceedWorkoutBtn.addEventListener('click', () => {
        this.sound.playClick();
        this.closeMindfulModal();
        this.gameManager.startBlitzWorkout(3, 30);
      });
    }
  }

  bindBottomNavEvents() {
    const bottomNav = document.getElementById('app-bottom-nav');
    if (bottomNav) {
      const navLinks = bottomNav.querySelectorAll('a[data-path]');
      navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          this.sound.playClick();
          const path = link.getAttribute('data-path');
          if (path === 'today') {
            this.screens.showScreen('home');
          } else if (path === 'sanctuary') {
            this.renderGamePicker();
            this.screens.showScreen('select');
          } else if (path === 'insights') {
            this.openStatsModal();
          } else if (path === 'profile') {
            this.openSurnameModal();
          }
        });
      });
    }

    const headerProfileBtn = document.getElementById('header-profile-btn');
    if (headerProfileBtn) {
      headerProfileBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.sound.playClick();
        this.openSurnameModal();
      });
    }

    const headerBrandBtn = document.getElementById('header-brand-btn');
    if (headerBrandBtn) {
      headerBrandBtn.addEventListener('click', () => {
        this.sound.playClick();
        this.screens.showScreen('home');
      });
    }
  }

  openMindfulModal() {
    const modal = document.getElementById('mindful-modal');
    if (!modal) {
      this.gameManager.startBlitzWorkout(3, 30);
      return;
    }

    this.sound.playClick();
    modal.classList.remove('hidden');
    modal.classList.add('flex', 'active');
    modal.setAttribute('aria-hidden', 'false');

    this.isBreathingInhaling = true;
    this.runBreathCycle();
    if (this.breathInterval) clearInterval(this.breathInterval);
    this.breathInterval = setInterval(() => this.runBreathCycle(), 4000);
  }

  closeMindfulModal() {
    const modal = document.getElementById('mindful-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex', 'active');
      modal.setAttribute('aria-hidden', 'true');
    }
    if (this.breathInterval) {
      clearInterval(this.breathInterval);
      this.breathInterval = null;
    }
  }

  runBreathCycle() {
    const disk = document.getElementById('breath-disk');
    const phase = document.getElementById('breath-phase');
    if (!disk || !phase) return;

    if (this.isBreathingInhaling) {
      disk.classList.remove('scale-75');
      disk.classList.add('scale-125');
      phase.textContent = 'Inhale deeply';
    } else {
      disk.classList.remove('scale-125');
      disk.classList.add('scale-75');
      phase.textContent = 'Exhale softly';
    }
    this.isBreathingInhaling = !this.isBreathingInhaling;
  }

  openSurnameModal() {
    const modal = document.getElementById('surname-modal');
    const input = document.getElementById('surname-input');
    if (!modal) return;

    if (input) {
      input.value = this.storage.getSurname();
      setTimeout(() => input.focus(), 120);
    }
    modal.classList.add('active');
  }

  closeSurnameModal() {
    const modal = document.getElementById('surname-modal');
    if (modal) modal.classList.remove('active');
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
