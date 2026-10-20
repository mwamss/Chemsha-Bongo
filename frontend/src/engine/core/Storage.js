/**
 * Storage.js
 * Manages player statistics, personal bests, blitz rankings, and user preferences
 * safely in localStorage with in-memory fallback.
 */

const STORAGE_KEY = 'chemsha_bongo_data_v1';

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftLocalDate(date, days) {
  const shifted = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  shifted.setDate(shifted.getDate() + days);
  return shifted;
}

function dateKeyToDate(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

function dayHasRhythm(rhythmDay) {
  return Boolean(rhythmDay?.focusSessions || rhythmDay?.restHonored);
}

const DEFAULT_DATA = {
  profile: {
    surname: ''
  },
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
  dailyRhythm: {},
  settings: {
    soundMuted: false,
    hapticsEnabled: true,
    theme: 'dark',
    spotifyUri: ''
  },
  isMigrated: false,
  banjaEntries: []
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
            profile: { ...DEFAULT_DATA.profile, ...(parsed.profile || {}) },
            settings: { ...DEFAULT_DATA.settings, ...(parsed.settings || {}) },
            totals: { ...DEFAULT_DATA.totals, ...(parsed.totals || {}) },
            blitzStats: { ...DEFAULT_DATA.blitzStats, ...(parsed.blitzStats || {}) },
            highScores: { ...DEFAULT_DATA.highScores, ...(parsed.highScores || {}) },
            bestStreaks: { ...DEFAULT_DATA.bestStreaks, ...(parsed.bestStreaks || {}) },
            dailyRhythm: { ...(parsed.dailyRhythm || {}) },
            isMigrated: !!parsed.isMigrated,
            banjaEntries: Array.isArray(parsed.banjaEntries) ? parsed.banjaEntries : []
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

  recordGameResult(gameId, score, streak, correctCount = 0, wrongCount = 0, durationSec = 30) {
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

    const todayKey = localDateKey();
    const todayRhythm = this.data.dailyRhythm[todayKey] || { focusSessions: 0, focusSeconds: 0, restHonored: false };
    todayRhythm.focusSessions += 1;
    todayRhythm.focusSeconds += Math.max(0, Number(durationSec) || 0);
    todayRhythm.updatedAt = Date.now();
    this.data.dailyRhythm[todayKey] = todayRhythm;

    this.save();
    this.notifyRhythmUpdate();
    return { isNewHigh, isNewStreak };
  }

  toggleRhythmRest(dateKey = localDateKey()) {
    const rhythmDay = this.data.dailyRhythm[dateKey] || { focusSessions: 0, focusSeconds: 0, restHonored: false };
    if (rhythmDay.focusSessions > 0) return false;
    rhythmDay.restHonored = !rhythmDay.restHonored;
    rhythmDay.updatedAt = Date.now();
    this.data.dailyRhythm[dateKey] = rhythmDay;
    this.save();
    this.notifyRhythmUpdate();
    return rhythmDay.restHonored;
  }

  getRhythmWeek(referenceDate = new Date()) {
    const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate(), 12);
    const todayKey = localDateKey(today);
    const mondayOffset = (today.getDay() + 6) % 7;
    const weekStart = shiftLocalDate(today, -mondayOffset);
    const weekDays = Array.from({ length: 7 }, (_, index) => {
      const date = shiftLocalDate(weekStart, index);
      const dateKey = localDateKey(date);
      const record = this.data.dailyRhythm[dateKey] || {};
      const hasPractice = Number(record.focusSessions) > 0;
      const restHonored = Boolean(record.restHonored);
      const state = hasPractice ? 'focused' : restHonored ? 'rested' : dateKey === todayKey ? 'today' : 'empty';
      const dateLabel = date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
      const duration = Number(record.focusSeconds) > 0
        ? (record.focusSeconds < 60 ? `${record.focusSeconds}s` : `${Math.floor(record.focusSeconds / 60)}m`)
        : restHonored ? 'Rest' : '';
      return {
        dateKey,
        date,
        day: date.toLocaleDateString(undefined, { weekday: 'short' }),
        state,
        focusSessions: Number(record.focusSessions) || 0,
        focusSeconds: Number(record.focusSeconds) || 0,
        restHonored,
        duration,
        title: hasPractice
          ? `${dateLabel}: ${record.focusSessions} completed ${record.focusSessions === 1 ? 'session' : 'sessions'} · ${duration} practice`
          : restHonored
            ? `${dateLabel}: Rest honored`
            : dateKey === todayKey
              ? `${dateLabel}: No practice recorded yet`
              : `${dateLabel}: No activity recorded`,
      };
    });

    const todayRecord = this.data.dailyRhythm[todayKey] || {};
    const weekActiveDays = weekDays.filter((day) => day.focusSessions > 0).length;
    const weekRestDays = weekDays.filter((day) => day.restHonored && !day.focusSessions).length;
    const weekFocusSeconds = weekDays.reduce((sum, day) => sum + day.focusSeconds, 0);
    const recordedDates = Object.entries(this.data.dailyRhythm)
      .filter(([, record]) => dayHasRhythm(record))
      .map(([key]) => key)
      .sort();

    let bestStreak = 0;
    let runningStreak = 0;
    let previousDate = null;
    for (const key of recordedDates) {
      const date = dateKeyToDate(key);
      runningStreak = previousDate && (date - previousDate) / 86400000 === 1 ? runningStreak + 1 : 1;
      bestStreak = Math.max(bestStreak, runningStreak);
      previousDate = date;
    }

    let streakCursor = todayKey;
    if (!dayHasRhythm(this.data.dailyRhythm[streakCursor])) {
      streakCursor = localDateKey(shiftLocalDate(today, -1));
    }
    let currentStreak = 0;
    while (dayHasRhythm(this.data.dailyRhythm[streakCursor])) {
      currentStreak += 1;
      streakCursor = localDateKey(shiftLocalDate(dateKeyToDate(streakCursor), -1));
    }

    return {
      days: weekDays,
      todayKey,
      todayHasPractice: Number(todayRecord.focusSessions) > 0,
      todayRestHonored: Boolean(todayRecord.restHonored),
      currentStreak,
      bestStreak,
      weekActiveDays,
      weekRestDays,
      weekFocusSeconds,
      weekRecordedDays: weekActiveDays + weekRestDays,
      weekStart,
      weekEnd: shiftLocalDate(weekStart, 6),
    };
  }

  notifyRhythmUpdate() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('chemsha:rhythm-update'));
    }
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

  // --- Player Profile Methods ---

  getSurname() {
    return (this.data.profile && this.data.profile.surname) ? this.data.profile.surname.trim() : '';
  }

  setSurname(name) {
    if (!this.data.profile) this.data.profile = {};
    this.data.profile.surname = (name || '').trim();
    this.save();
    return this.data.profile.surname;
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

  isMigrated() {
    return !!this.data.isMigrated;
  }

  markMigrated() {
    this.data.isMigrated = true;
    this.save();
  }

  // --- Banja Sanctuary Journal Entries ---

  getBanjaEntries() {
    if (!this.data.banjaEntries || !Array.isArray(this.data.banjaEntries)) {
      this.data.banjaEntries = [];
      this.save();
    } else {
      // Purge any lingering template mock seed entries
      const cleaned = this.data.banjaEntries.filter(e => !e.id || !e.id.startsWith('banja-seed-'));
      if (cleaned.length !== this.data.banjaEntries.length) {
        this.data.banjaEntries = cleaned;
        this.save();
      }
    }
    return this.data.banjaEntries;
  }

  saveBanjaEntry(entry) {
    if (!this.data.banjaEntries) {
      this.getBanjaEntries();
    }
    const index = this.data.banjaEntries.findIndex(e => e.id === entry.id);
    if (index >= 0) {
      this.data.banjaEntries[index] = { ...this.data.banjaEntries[index], ...entry, updatedAt: Date.now() };
    } else {
      this.data.banjaEntries.unshift({ ...entry, updatedAt: Date.now() });
    }
    this.save();
    return this.data.banjaEntries;
  }

  deleteBanjaEntry(id) {
    if (!this.data.banjaEntries) return [];
    this.data.banjaEntries = this.data.banjaEntries.filter(e => e.id !== id);
    this.save();
    return this.data.banjaEntries;
  }

  resetAll() {
    this.data = JSON.parse(JSON.stringify(DEFAULT_DATA));
    this.save();
  }
}
