/**
 * Storage.js
 * Manages player statistics, personal bests, blitz rankings, and user preferences
 * safely in localStorage with in-memory fallback.
 */

const STORAGE_KEY = 'chemsha_bongo_data_v1';

const DEFAULT_DATA = {
  highScores: {},       // { [gameId]: score }
  bestStreaks: {},      // { [gameId]: streak }
  blitzStats: {
    bestScore: 0,
    bestRating: 'Novice',
    workoutsCompleted: 0
  },
  totals: {
    gamesPlayed: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    highestOverallStreak: 0
  },
  settings: {
    soundMuted: false,
    hapticsEnabled: true
  }
};

export class StorageManager {
  constructor() {
    this.memoryStore = null;
    this.data = this.load();
  }

  isAvailable() {
    try {
      const testKey = '__test__storage__';
      window.localStorage.setItem(testKey, testKey);
      window.localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  load() {
    if (this.isAvailable()) {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          return {
            ...DEFAULT_DATA,
            ...parsed,
            settings: { ...DEFAULT_DATA.settings, ...(parsed.settings || {}) },
            totals: { ...DEFAULT_DATA.totals, ...(parsed.totals || {}) },
            blitzStats: { ...DEFAULT_DATA.blitzStats, ...(parsed.blitzStats || {}) },
            highScores: { ...DEFAULT_DATA.highScores, ...(parsed.highScores || {}) },
            bestStreaks: { ...DEFAULT_DATA.bestStreaks, ...(parsed.bestStreaks || {}) }
          };
        }
      } catch (err) {
        console.warn('Failed to parse localStorage data:', err);
      }
    }
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }

  save() {
    if (this.isAvailable()) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      } catch (err) {
        console.warn('Failed to write to localStorage:', err);
      }
    }
  }

  // --- High Score / Record Methods ---

  getHighScore(gameId) {
    return this.data.highScores[gameId] || 0;
  }

  getBestStreak(gameId) {
    return this.data.bestStreaks[gameId] || 0;
  }

  recordGameResult(gameId, score, streak, correctCount = 0, wrongCount = 0) {
    let isNewHigh = false;
    let isNewStreak = false;

    if (!this.data.highScores[gameId] || score > this.data.highScores[gameId]) {
      this.data.highScores[gameId] = score;
      isNewHigh = true;
    }

    if (!this.data.bestStreaks[gameId] || streak > this.data.bestStreaks[gameId]) {
      this.data.bestStreaks[gameId] = streak;
      isNewStreak = true;
    }

    if (streak > this.data.totals.highestOverallStreak) {
      this.data.totals.highestOverallStreak = streak;
    }

    this.data.totals.gamesPlayed += 1;
    this.data.totals.correctAnswers += correctCount;
    this.data.totals.wrongAnswers += wrongCount;

    this.save();
    return { isNewHigh, isNewStreak };
  }

  recordBlitzResult(totalScore, rating) {
    let isNewBlitzHigh = false;
    if (totalScore > this.data.blitzStats.bestScore) {
      this.data.blitzStats.bestScore = totalScore;
      this.data.blitzStats.bestRating = rating;
      isNewBlitzHigh = true;
    }
    this.data.blitzStats.workoutsCompleted += 1;
    this.save();
    return isNewBlitzHigh;
  }

  // --- Settings ---

  getSettings() {
    return this.data.settings;
  }

  updateSettings(partial) {
    this.data.settings = { ...this.data.settings, ...partial };
    this.save();
  }

  getTotals() {
    const { gamesPlayed, correctAnswers, wrongAnswers, highestOverallStreak } = this.data.totals;
    const totalAns = correctAnswers + wrongAnswers;
    const accuracy = totalAns > 0 ? Math.round((correctAnswers / totalAns) * 100) : 100;
    return {
      gamesPlayed,
      correctAnswers,
      wrongAnswers,
      accuracy,
      highestOverallStreak,
      blitzWorkouts: this.data.blitzStats.workoutsCompleted,
      bestBlitzScore: this.data.blitzStats.bestScore,
      bestBlitzRating: this.data.blitzStats.bestRating
    };
  }

  resetAll() {
    this.data = JSON.parse(JSON.stringify(DEFAULT_DATA));
    this.save();
  }
}
