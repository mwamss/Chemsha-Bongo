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
  sessionHistory: [],
  wellbeingCheckins: {},
  banjaTombstones: {},
  settings: {
    soundMuted: false,
    hapticsEnabled: true,
    theme: 'dark',
    difficulty: 2,
    reminderEnabled: false,
    reminderTime: '18:00',
    spotifyUri: '',
    privateSyncEnabled: false
  },
  isMigrated: false,
  banjaEntries: []
};

export class StorageManager {
  constructor() {
    this.memoryStore = null;
    this.persistenceStatus = 'checking';
    this.data = this.load();
  }

  getPersistenceStatus() {
    return this.persistenceStatus;
  }

  notifyPersistenceStatus() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('chemsha-storage-persistence', {
        detail: { status: this.persistenceStatus },
      }));
    }
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
        this.persistenceStatus = 'persistent';
        this.notifyPersistenceStatus();
        if (raw) {
          const parsed = JSON.parse(raw);
          const data = {
            ...DEFAULT_DATA,
            ...parsed,
            profile: { ...DEFAULT_DATA.profile, ...(parsed.profile || {}) },
            settings: { ...DEFAULT_DATA.settings, ...(parsed.settings || {}) },
            totals: { ...DEFAULT_DATA.totals, ...(parsed.totals || {}) },
            blitzStats: { ...DEFAULT_DATA.blitzStats, ...(parsed.blitzStats || {}) },
            highScores: { ...DEFAULT_DATA.highScores, ...(parsed.highScores || {}) },
            bestStreaks: { ...DEFAULT_DATA.bestStreaks, ...(parsed.bestStreaks || {}) },
            dailyRhythm: { ...(parsed.dailyRhythm || {}) },
            sessionHistory: Array.isArray(parsed.sessionHistory) ? parsed.sessionHistory : [],
            wellbeingCheckins: { ...(parsed.wellbeingCheckins || {}) },
            banjaTombstones: { ...(parsed.banjaTombstones || {}) },
            isMigrated: !!parsed.isMigrated,
            banjaEntries: Array.isArray(parsed.banjaEntries) ? parsed.banjaEntries : []
          };
          this.memoryStore = JSON.parse(JSON.stringify(data));
          return data;
        }
      } catch (err) {
        this.persistenceStatus = 'error';
        this.notifyPersistenceStatus();
        console.warn('Failed to parse localStorage data:', err);
      }
    } else {
      this.persistenceStatus = 'memory-only';
      this.notifyPersistenceStatus();
    }
    return JSON.parse(JSON.stringify(this.memoryStore || DEFAULT_DATA));
  }

  save(notifySync = true) {
    // Keep the in-memory copy current even when browser storage is blocked or full.
    this.memoryStore = JSON.parse(JSON.stringify(this.data));
    if (this.isAvailable()) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        this.persistenceStatus = 'persistent';
      } catch (err) {
        this.persistenceStatus = 'error';
        console.warn('Failed to write to localStorage:', err);
      }
    } else {
      this.persistenceStatus = 'memory-only';
    }
    this.notifyPersistenceStatus();
    if (notifySync && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('chemsha-storage-update'));
    }
  }

  // --- High Score / Record Methods ---

  getHighScore(gameId) {
    return this.data.highScores[gameId] || 0;
  }

  getBestStreak(gameId) {
    return this.data.bestStreaks[gameId] || 0;
  }

  getSessionHistory() {
    return Array.isArray(this.data.sessionHistory) ? this.data.sessionHistory : [];
  }

  getWellbeingCheckins() {
    return this.data.wellbeingCheckins || {};
  }

  saveWellbeingCheckin(dateKey, mood) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !['calm', 'okay', 'tense', 'low', 'energized'].includes(mood)) return this.getWellbeingCheckins();
    this.data.wellbeingCheckins = this.data.wellbeingCheckins || {};
    this.data.wellbeingCheckins[dateKey] = { mood, updatedAt: Date.now() };
    this.data.wellbeingCheckins = Object.fromEntries(Object.entries(this.data.wellbeingCheckins).sort(([a], [b]) => b.localeCompare(a)).slice(0, 365));
    this.save();
    return this.data.wellbeingCheckins;
  }

  getPracticeRecommendation(games, historyOverride = null) {
    const history = Array.isArray(historyOverride) ? historyOverride : this.getSessionHistory();
    const gameStats = games.map((game) => {
      const sessions = history.filter((session) => session.gameId === game.id);
      const recent = sessions.slice(0, 10);
      const answers = recent.reduce((sum, session) => sum + session.correctCount + session.wrongCount, 0);
      const correct = recent.reduce((sum, session) => sum + session.correctCount, 0);
      return { game, sessions: sessions.length, accuracy: answers ? Math.round((correct / answers) * 100) : null };
    });
    const withEnoughData = gameStats.filter((item) => item.accuracy !== null && item.sessions >= 3);
    if (withEnoughData.length) {
      withEnoughData.sort((a, b) => a.accuracy - b.accuracy || a.sessions - b.sessions);
      return { ...withEnoughData[0], reason: `Recent accuracy is ${withEnoughData[0].accuracy}%` };
    }
    gameStats.sort((a, b) => a.sessions - b.sessions || a.game.title.localeCompare(b.game.title));
    return { ...gameStats[0], reason: gameStats[0]?.sessions ? 'A useful area to revisit' : 'A good place to begin' };
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

    this.data.sessionHistory = this.data.sessionHistory || [];
    this.data.sessionHistory.unshift({
      id: `game-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      gameId,
      score,
      maxStreak: streak,
      correctCount,
      wrongCount,
      durationSec: Math.max(0, Number(durationSec) || 0),
      playedAt: Date.now(),
    });
    this.data.sessionHistory = this.data.sessionHistory.slice(0, 365);

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
    const accuracy = totalAns > 0 ? Math.round((correctAnswers / totalAns) * 100) : null;
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
    if (this.data.banjaTombstones) delete this.data.banjaTombstones[entry.id];
    if (index >= 0) {
      this.data.banjaEntries[index] = {
        ...this.data.banjaEntries[index],
        ...entry,
        createdAt: this.data.banjaEntries[index].createdAt || entry.createdAt || Date.now(),
        updatedAt: Date.now(),
      };
    } else {
      const now = Date.now();
      this.data.banjaEntries.unshift({ ...entry, createdAt: entry.createdAt || now, updatedAt: now });
    }
    this.save();
    return this.data.banjaEntries;
  }

  deleteBanjaEntry(id) {
    if (!this.data.banjaEntries) return [];
    this.data.banjaTombstones = this.data.banjaTombstones || {};
    this.data.banjaTombstones[id] = Date.now();
    this.data.banjaEntries = this.data.banjaEntries.filter(e => e.id !== id);
    this.save();
    return this.data.banjaEntries;
  }

  exportPrivateData() {
    const allEntries = this.getBanjaEntries();
    const tombstones = { ...(this.data.banjaTombstones || {}) };
    for (const entry of allEntries) {
      if (entry.localOnly) tombstones[entry.id] = Math.max(tombstones[entry.id] || 0, Number(entry.updatedAt) || Date.now());
    }
    return {
      banjaEntries: allEntries.filter((entry) => !entry.localOnly),
      banjaTombstones: tombstones,
      dailyRhythm: { ...this.data.dailyRhythm },
      wellbeingCheckins: { ...this.getWellbeingCheckins() },
    };
  }

  mergePrivateData(remote = {}) {
    this.data.banjaTombstones = this.data.banjaTombstones || {};
    for (const [id, timestamp] of Object.entries(remote.banjaTombstones || {})) {
      this.data.banjaTombstones[id] = Math.max(this.data.banjaTombstones[id] || 0, Number(timestamp) || 0);
    }

    const entries = new Map(this.getBanjaEntries().map((entry) => [entry.id, entry]));
    for (const entry of remote.banjaEntries || []) {
      const deletedAt = this.data.banjaTombstones[entry.id] || 0;
      if (deletedAt >= (Number(entry.updatedAt) || 0)) {
        entries.delete(entry.id);
        continue;
      }
      const local = entries.get(entry.id);
      if (!local || (Number(entry.updatedAt) || 0) >= (Number(local.updatedAt) || 0)) entries.set(entry.id, entry);
    }
    this.data.banjaEntries = [...entries.values()].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    for (const [dateKey, remoteDay] of Object.entries(remote.dailyRhythm || {})) {
      const localDay = this.data.dailyRhythm[dateKey] || {};
      const focusSessions = Math.max(Number(localDay.focusSessions) || 0, Number(remoteDay.focusSessions) || 0);
      this.data.dailyRhythm[dateKey] = {
        focusSessions,
        focusSeconds: Math.max(Number(localDay.focusSeconds) || 0, Number(remoteDay.focusSeconds) || 0),
        restHonored: !focusSessions && Boolean(localDay.restHonored || remoteDay.restHonored),
        updatedAt: Math.max(Number(localDay.updatedAt) || 0, Number(remoteDay.updatedAt) || 0),
      };
    }
    this.data.wellbeingCheckins = this.data.wellbeingCheckins || {};
    for (const [dateKey, remoteCheckin] of Object.entries(remote.wellbeingCheckins || {})) {
      const local = this.data.wellbeingCheckins[dateKey];
      if (!local || (Number(remoteCheckin.updatedAt) || 0) > (Number(local.updatedAt) || 0)) this.data.wellbeingCheckins[dateKey] = remoteCheckin;
    }
    this.save(false);
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('chemsha-private-data-merged'));
    this.notifyRhythmUpdate();
  }

  resetAll() {
    this.data = JSON.parse(JSON.stringify(DEFAULT_DATA));
    this.save();
  }
}
