/**
 * ScreenManager.js
 * Manages view transitions between Main Menu, Mode Selection, Countdown,
 * Active Game HUD, Round Summary, Blitz Final Results, and Statistics.
 */

export class ScreenManager {
  constructor(containerEl) {
    this.container = containerEl;
    this.currentScreen = null;
    this.screens = {};
    this.countdownInterval = null;
    this.countdownCallback = null;

    this.cacheScreens();
  }

  cacheScreens() {
    const screenElements = this.container.querySelectorAll('.screen-view');
    screenElements.forEach(el => {
      const name = el.dataset.screen;
      if (name) {
        this.screens[name] = el;
      }
    });
  }

  showScreen(screenName) {
    if (screenName !== 'countdown') {
      this.cancelCountdown();
    }

    Object.values(this.screens).forEach(el => {
      el.classList.remove('active');
      el.setAttribute('aria-hidden', 'true');
    });

    const target = this.screens[screenName];
    if (target) {
      target.classList.add('active');
      target.setAttribute('aria-hidden', 'false');
      this.currentScreen = screenName;
      window.scrollTo(0, 0);
    } else {
      console.warn(`Screen "${screenName}" not found in ScreenManager.`);
    }

    // Manage top header and bottom nav visibility
    const headerEl = document.getElementById('app-header');
    const navEl = document.getElementById('app-bottom-nav');
    const isNavigationVisible = screenName === 'home' || screenName === 'select';

    if (this.container) {
      this.container.classList.toggle('in-game', !isNavigationVisible);
    }

    if (headerEl) {
      headerEl.style.display = isNavigationVisible ? '' : 'none';
      const titleEl = document.getElementById('header-title');
      if (titleEl) {
        titleEl.textContent = screenName === 'select' ? 'Sanctuary' : 'Today';
      }
    }

    if (navEl) {
      navEl.style.display = isNavigationVisible ? '' : 'none';
      const navLinks = navEl.querySelectorAll('a[data-path]');
      navLinks.forEach(link => {
        const path = link.getAttribute('data-path');
        const isActive = (screenName === 'home' && path === 'today') || (screenName === 'select' && path === 'sanctuary');
        if (isActive) {
          link.setAttribute('aria-current', 'page');
          link.className = 'flex flex-col items-center justify-center gap-space-xs min-w-[44px] min-h-[44px] flex-1 py-space-xs transition-all active:scale-95 text-primary font-semibold [&>div]:bg-secondary-container [&>div]:text-on-secondary-container cursor-pointer';
        } else {
          link.removeAttribute('aria-current');
          link.className = 'flex flex-col items-center justify-center gap-space-xs min-w-[44px] min-h-[44px] flex-1 py-space-xs text-on-surface-variant hover:text-on-surface transition-all active:scale-95 cursor-pointer';
        }
      });
    }
  }

  showPauseOverlay(show = true) {
    const pauseEl = document.getElementById('pause-modal');
    if (pauseEl) {
      pauseEl.classList.toggle('active', show);
      pauseEl.setAttribute('aria-hidden', `${!show}`);
    }
  }

  cancelCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    this.countdownCallback = null;
    const numberEl = document.getElementById('countdown-number');
    if (numberEl) {
      numberEl.classList.remove('countdown-num-pulse', 'countdown-go');
    }
  }

  showReadyCountdown(gameMeta, onStartCallback, soundSynth) {
    // Cancel any already-running countdown first to avoid overlapping intervals
    this.cancelCountdown();

    this.showScreen('countdown');
    this.countdownCallback = onStartCallback;

    const titleEl = document.getElementById('countdown-game-title');
    const iconEl = document.getElementById('countdown-game-icon');
    const instructionEl = document.getElementById('countdown-instructions');
    const hintEl = document.getElementById('countdown-controls-hint');
    const numberEl = document.getElementById('countdown-number');

    if (titleEl) titleEl.textContent = gameMeta.subtitle ? `${gameMeta.title} • ${gameMeta.subtitle}` : gameMeta.title;
    if (iconEl) iconEl.textContent = gameMeta.icon || '🧠';
    if (instructionEl) instructionEl.textContent = gameMeta.instructions;
    if (hintEl) hintEl.textContent = gameMeta.controlsHint;

    let count = 3;
    if (numberEl) {
      numberEl.textContent = count;
      numberEl.className = 'countdown-num-pulse';
    }

    if (soundSynth) soundSynth.playCountdown(false);

    this.countdownInterval = setInterval(() => {
      // Guard: if screen changed away from countdown or countdown was cancelled, abort
      if (this.currentScreen !== 'countdown' || !this.countdownInterval) {
        this.cancelCountdown();
        return;
      }

      count--;
      if (count > 0) {
        if (numberEl) {
          numberEl.textContent = count;
          // Retrigger pulse animation
          numberEl.classList.remove('countdown-num-pulse');
          void numberEl.offsetWidth;
          numberEl.classList.add('countdown-num-pulse');
        }
        if (soundSynth) soundSynth.playCountdown(false);
      } else if (count === 0) {
        if (numberEl) {
          numberEl.textContent = 'GO!';
          numberEl.classList.add('countdown-go');
        }
        if (soundSynth) soundSynth.playCountdown(true);
      } else {
        const callbackToRun = this.countdownCallback;
        this.cancelCountdown();
        if (typeof callbackToRun === 'function') {
          callbackToRun();
        }
      }
    }, 900);
  }
}
