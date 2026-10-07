/**
 * GameManager.js
 * Central controller coordinating game modes, round scoring, streaks,
 * precision timer ticks, audio events, and screen transitions.
 */

import { PrecisionTimer } from './Timer.js';
import { getGameById, getRandomBlitzGames, getAllGames } from '../games/registry.js';

export const MODES = {
  FREE_PLAY: 'free-play',
  BLITZ: 'blitz'
};

export class GameManager {
  constructor({ sound, storage, fx, screens, hud, gameContainer }) {
    this.sound = sound;
    this.storage = storage;
    this.fx = fx;
    this.screens = screens;
    this.hud = hud;
    this.gameContainer = gameContainer;

    this.timer = new PrecisionTimer();
    this.activeGameInstance = null;
    this.activeGameMeta = null;

    // Mode orchestration
    this.currentMode = MODES.FREE_PLAY;
    this.blitzPlaylist = [];
    this.blitzCurrentIndex = 0;
    this.blitzTotalScore = 0;
    this.blitzRoundsStats = [];

    // Round metrics
    this.roundScore = 0;
    this.roundStreak = 0;
    this.roundMaxStreak = 0;
    this.roundCorrect = 0;
    this.roundWrong = 0;
    this.roundDurationSec = 30;
  }

  getMultiplier() {
    if (this.roundStreak >= 10) return 4;
    if (this.roundStreak >= 6) return 3;
    if (this.roundStreak >= 3) return 2;
    return 1;
  }

  // --- Starting Game Modes ---

  startFreePlay(gameId, durationSec = 30) {
    const meta = getGameById(gameId);
    if (!meta) return;

    this.currentMode = MODES.FREE_PLAY;
    this.activeGameMeta = meta;
    this.roundDurationSec = durationSec;

    this.screens.showReadyCountdown(meta, () => {
      this.launchRound(meta, durationSec);
    }, this.sound);
  }

  startBlitzWorkout(gameCount = 3, roundDurationSec = 30) {
    this.currentMode = MODES.BLITZ;
    this.blitzPlaylist = getRandomBlitzGames(gameCount);
    this.blitzCurrentIndex = 0;
    this.blitzTotalScore = 0;
    this.blitzRoundsStats = [];
    this.roundDurationSec = roundDurationSec;

    this.advanceBlitz();
  }

  advanceBlitz() {
    if (this.blitzCurrentIndex >= this.blitzPlaylist.length) {
      this.finishBlitzWorkout();
      return;
    }

    const currentMeta = this.blitzPlaylist[this.blitzCurrentIndex];
    this.activeGameMeta = currentMeta;

    this.screens.showReadyCountdown(currentMeta, () => {
      this.launchRound(currentMeta, this.roundDurationSec);
    }, this.sound);
  }

  // --- Round Execution ---

  launchRound(gameMeta, durationSec) {
    // Reset metrics
    this.roundScore = 0;
    this.roundStreak = 0;
    this.roundMaxStreak = 0;
    this.roundCorrect = 0;
    this.roundWrong = 0;

    this.hud.reset();
    this.hud.setGameInfo(gameMeta.title, gameMeta.categoryLabel);
    this.screens.showScreen('play');

    // Instantiate game
    if (this.activeGameInstance) {
      this.activeGameInstance.cleanup();
    }

    const GameClass = gameMeta.GameClass;
    this.activeGameInstance = new GameClass();

    this.activeGameInstance.init({
      container: this.gameContainer,
      sound: this.sound,
      fx: this.fx,
      difficulty: 2,
      onScore: (basePoints, coords) => this.handleScore(basePoints, coords),
      onError: () => this.handleError()
    });

    this.activeGameInstance.start();

    // Start precision timer
    this.timer.start(durationSec, {
      onTick: (remainingMs, percentRemaining) => {
        this.hud.updateTimer(remainingMs, percentRemaining);
      },
      onSecond: (secRemaining) => {
        if (secRemaining <= 5 && secRemaining > 0) {
          this.sound.playTick();
        }
      },
      onComplete: () => {
        this.completeRound();
      }
    });
  }

  handleScore(basePoints = 100, coords = null) {
    this.roundStreak++;
    this.roundCorrect++;
    if (this.roundStreak > this.roundMaxStreak) {
      this.roundMaxStreak = this.roundStreak;
    }

    const multiplier = this.getMultiplier();
    const finalPoints = basePoints * multiplier;
    this.roundScore += finalPoints;

    this.hud.updateScore(this.roundScore);
    this.hud.updateStreak(this.roundStreak, multiplier);

    // Audio & Visual feedback
    if (this.roundStreak === 5 || this.roundStreak === 10) {
      this.sound.playComboStreak();
      this.fx.showFloatingText(`COMBO ${multiplier}x! 🔥`, coords ? coords.x : undefined, coords ? coords.y : undefined, 'streak');
      this.fx.burst(coords ? coords.x : undefined, coords ? coords.y : undefined, 30);
    } else {
      this.sound.playCorrect(this.roundStreak);
      const text = multiplier > 1 ? `+${finalPoints} (x${multiplier})` : `+${finalPoints}`;
      this.fx.showFloatingText(text, coords ? coords.x : undefined, coords ? coords.y : undefined, 'normal');
    }
  }

  handleError() {
    this.roundStreak = 0;
    this.roundWrong++;

    this.hud.updateStreak(0, 1);
    this.sound.playWrong();
    this.fx.screenShake(document.body);
    this.fx.vibrate([40]);
  }

  // --- Round Completion & Summary ---

  completeRound() {
    if (this.activeGameInstance) {
      this.activeGameInstance.cleanup();
      this.activeGameInstance = null;
    }

    const { isNewHigh, isNewStreak } = this.storage.recordGameResult(
      this.activeGameMeta.id,
      this.roundScore,
      this.roundMaxStreak,
      this.roundCorrect,
      this.roundWrong
    );

    const totalAns = this.roundCorrect + this.roundWrong;
    const accuracy = totalAns > 0 ? Math.round((this.roundCorrect / totalAns) * 100) : 0;

    if (this.currentMode === MODES.BLITZ) {
      this.blitzTotalScore += this.roundScore;
      this.blitzRoundsStats.push({
        meta: this.activeGameMeta,
        score: this.roundScore,
        accuracy,
        maxStreak: this.roundMaxStreak
      });

      this.blitzCurrentIndex++;
      this.showRoundSummary(isNewHigh, accuracy, true);
    } else {
      this.showRoundSummary(isNewHigh, accuracy, false);
    }
  }

  showRoundSummary(isNewHigh, accuracy, isPartOfBlitz) {
    this.sound.playGameOver();
    if (isNewHigh) {
      this.fx.confetti(2500);
    }

    this.screens.showScreen('round-summary');

    // Populate DOM summary
    const titleEl = document.getElementById('summary-game-title');
    const scoreEl = document.getElementById('summary-score');
    const newHighBadge = document.getElementById('summary-new-high');
    const accuracyEl = document.getElementById('summary-accuracy');
    const correctEl = document.getElementById('summary-correct');
    const streakEl = document.getElementById('summary-streak');
    const nextBtn = document.getElementById('summary-action-btn');

    if (titleEl) titleEl.textContent = this.activeGameMeta.title;
    if (scoreEl) scoreEl.textContent = this.roundScore.toLocaleString();
    if (newHighBadge) newHighBadge.style.display = isNewHigh ? 'inline-block' : 'none';
    if (accuracyEl) accuracyEl.textContent = `${accuracy}%`;
    if (correctEl) correctEl.textContent = `${this.roundCorrect} / ${this.roundCorrect + this.roundWrong}`;
    if (streakEl) streakEl.textContent = `${this.roundMaxStreak}x`;

    if (nextBtn) {
      if (isPartOfBlitz) {
        const remaining = this.blitzPlaylist.length - this.blitzCurrentIndex;
        nextBtn.textContent = remaining > 0 ? `Next Game (${remaining} left) →` : 'See Final Blitz Rating 🏆';
        nextBtn.onclick = () => this.advanceBlitz();
      } else {
        nextBtn.textContent = 'Play Again ↻';
        nextBtn.onclick = () => this.startFreePlay(this.activeGameMeta.id, this.roundDurationSec);
      }
    }
  }

  // --- Final Blitz Workout Screen ---

  finishBlitzWorkout() {
    this.sound.playVictory();
    this.fx.confetti(3500);

    // Compute Brain Rating based on total score
    let rating = 'Novice';
    let badgeColor = '#94a3b8';
    if (this.blitzTotalScore >= 4500) {
      rating = '🧠 Grandmaster';
      badgeColor = '#eab308';
    } else if (this.blitzTotalScore >= 3500) {
      rating = '⚡ Genius';
      badgeColor = '#8b5cf6';
    } else if (this.blitzTotalScore >= 2500) {
      rating = '🔥 Sharpshooter';
      badgeColor = '#06b6d4';
    } else if (this.blitzTotalScore >= 1500) {
      rating = '🎯 Quick Thinker';
      badgeColor = '#10b981';
    }

    const isNewBlitzHigh = this.storage.recordBlitzResult(this.blitzTotalScore, rating);
    this.screens.showScreen('blitz-final');

    const totalScoreEl = document.getElementById('blitz-final-score');
    const ratingEl = document.getElementById('blitz-final-rating');
    const newHighEl = document.getElementById('blitz-new-high-badge');
    const roundsListEl = document.getElementById('blitz-rounds-breakdown');

    if (totalScoreEl) totalScoreEl.textContent = this.blitzTotalScore.toLocaleString();
    if (ratingEl) {
      ratingEl.textContent = rating;
      ratingEl.style.color = badgeColor;
    }
    if (newHighEl) newHighEl.style.display = isNewBlitzHigh ? 'inline-block' : 'none';

    if (roundsListEl) {
      roundsListEl.innerHTML = '';
      this.blitzRoundsStats.forEach((r, idx) => {
        const row = document.createElement('div');
        row.className = 'blitz-breakdown-row';
        row.innerHTML = `
          <span class="breakdown-game-name">${r.meta.icon} Round ${idx + 1}: ${r.meta.title}</span>
          <span class="breakdown-stats">
            <span class="breakdown-acc">${r.accuracy}% acc</span>
            <span class="breakdown-score">+${r.score.toLocaleString()}</span>
          </span>
        `;
        roundsListEl.appendChild(row);
      });
    }
  }

  // --- Pause & Resume ---

  togglePause() {
    if (!this.timer.isRunning) return;

    if (this.timer.isPaused) {
      this.timer.resume();
      if (this.activeGameInstance) this.activeGameInstance.resume();
      this.hud.setPauseState(false);
      this.screens.showPauseOverlay(false);
    } else {
      this.timer.pause();
      if (this.activeGameInstance) this.activeGameInstance.pause();
      this.hud.setPauseState(true);
      this.screens.showPauseOverlay(true);
    }
  }

  quitToMenu() {
    this.timer.stop();
    if (this.activeGameInstance) {
      this.activeGameInstance.cleanup();
      this.activeGameInstance = null;
    }
    this.screens.showPauseOverlay(false);
    this.screens.showScreen('home');
  }
}
