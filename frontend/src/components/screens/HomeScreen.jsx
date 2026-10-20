import React, { useState, useEffect } from 'react';
import { getAllGames } from '../../engine/games/registry.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAudio } from '../../context/AudioContext.jsx';
import { api } from '../../services/apiClient.js';
import { GentleRhythmTracker } from '../rhythm/GentleRhythmTracker.jsx';
import { DailyMethaliCard } from '../quotes/DailyMethaliCard.jsx';

export function HomeScreen({ onLaunchGame, onLaunchBlitz, onNavigate }) {
  const { displayName, storage, isAuthenticated } = useAuth();
  const { playClick } = useAudio();
  const [totals, setTotals] = useState(() => storage.getTotals());
  const [isInhaling, setIsInhaling] = useState(true);

  const games = getAllGames();

  // Load account stats if authenticated, otherwise use local totals
  useEffect(() => {
    if (isAuthenticated) {
      api.getStatsSummary()
        .then((data) => {
          if (data) {
            setTotals({
              gamesPlayed: data.games_played,
              correctAnswers: data.correct_answers,
              wrongAnswers: data.wrong_answers,
              accuracy: data.accuracy,
              highestOverallStreak: data.highest_overall_streak,
              blitzWorkouts: data.blitz_workouts,
              bestBlitzScore: data.best_blitz_score,
              bestBlitzRating: data.best_blitz_rating,
            });
          }
        })
        .catch(() => setTotals(storage.getTotals()));
    } else {
      setTotals(storage.getTotals());
    }
  }, [isAuthenticated, storage]);

  // Mindful breathing cycle
  useEffect(() => {
    const timer = setInterval(() => {
      setIsInhaling((prev) => !prev);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-20 select-none">
      {/* ── GREETING & DATE BANNER ────────────────────────────────────────── */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-subtle/40 pb-5">
        <div>
          <span className="text-xs uppercase tracking-widest text-secondary font-semibold">
            {formattedDate} • Serene Sanctuary
          </span>
          <h1 className="font-headline-xl text-2xl sm:text-3xl font-extrabold text-on-surface mt-1">
            {getGreeting()}, <span className="text-primary">{displayName}</span>.
          </h1>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto px-3.5 py-1.5 rounded-full bg-surface-container border border-border-subtle/50 text-xs font-medium text-secondary">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>{isAuthenticated ? 'Cloud Synced Session Active' : 'Daily Mindful Session Ready'}</span>
        </div>
      </section>

      {/* ── HERO: DAILY BLITZ CHALLENGE CARD ─────────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1e3a34] via-[#244740] to-[#162e29] p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col max-w-lg">
            <div className="flex items-center gap-2 text-secondary-fixed dark:text-[#bce8d7] text-xs font-bold uppercase tracking-wider mb-2">
              <span className="material-symbols-outlined text-sm">bolt</span>
              <span>Official Daily Workout</span>
            </div>
            <h2 className="font-headline-xl text-2xl sm:text-3xl font-bold leading-tight tracking-tight">
              3-Round Daily Blitz
            </h2>
            <p className="text-sm text-white/85 mt-2 leading-relaxed font-light">
              Sharpen cognitive inhibition, spatial reflex, and arithmetic memory in an unhurried 90-second circuit. Compete on the daily leaderboard!
            </p>
            <div className="flex items-center gap-6 mt-5 text-xs text-white/75">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">timer</span>
                <span>90s Duration</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                <span>3 Micro-Games</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">workspace_premium</span>
                <span>Ranked</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={() => { playClick(); onLaunchBlitz(); }}
              className="btn px-7 py-3.5 bg-secondary-fixed text-primary dark:bg-[#d4ad70] dark:text-[#211707] font-bold text-sm rounded-2xl shadow-lg hover:bg-white dark:hover:bg-[#e5bf81] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">play_circle</span>
              <span>Start Daily Blitz</span>
            </button>
            <button
              onClick={() => { playClick(); onNavigate('leaderboard'); }}
              className="btn px-4 py-3.5 bg-white/10 hover:bg-white/20 text-white font-medium text-sm rounded-2xl border border-white/20 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">leaderboard</span>
              <span>Rankings</span>
            </button>
          </div>
        </div>

        {/* Ambient background decoration */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-secondary/20 blur-3xl pointer-events-none" />
      </section>

      {/* ── STITCH REDESIGN: GENTLE RHYTHM HERO CADENCE TRACKER ───────────── */}
      <GentleRhythmTracker onLaunchBlitz={onLaunchBlitz} />

      {/* ── DAILY METHALI & AXIOM QUOTES SECTION ────────────────────────── */}
      <DailyMethaliCard onNavigate={onNavigate} />

      {/* ── QUICK METRICS & BREATHING COMPANION ───────────────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Metric 1: Games Completed */}
        <div className="flex flex-col p-5 rounded-2xl bg-surface border border-border-subtle/50 shadow-sm">
          <span className="text-[11px] text-outline uppercase font-semibold">Total Sessions</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-headline-xl text-3xl font-extrabold text-primary tabular-nums">
              {totals.gamesPlayed}
            </span>
            <span className="text-xs text-on-surface-variant">exercises</span>
          </div>
          <span className="text-xs text-secondary mt-1">
            {isAuthenticated ? 'Permanently saved to account' : 'Saved in local browser'}
          </span>
        </div>

        {/* Metric 2: Accuracy */}
        <div className="flex flex-col p-5 rounded-2xl bg-surface border border-border-subtle/50 shadow-sm">
          <span className="text-[11px] text-outline uppercase font-semibold">Overall Accuracy</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-headline-xl text-3xl font-extrabold text-secondary tabular-nums">
              {totals.accuracy}%
            </span>
            <span className="text-xs text-on-surface-variant">precision</span>
          </div>
          <span className="text-xs text-outline mt-1">
            {totals.correctAnswers} correct / {totals.correctAnswers + totals.wrongAnswers} corrections
          </span>
        </div>

        {/* Mindful Breathing Companion */}
        <div className="flex items-center gap-4 p-5 rounded-2xl bg-surface border border-border-subtle/50 shadow-sm">
          <div className="relative w-16 h-16 rounded-full flex items-center justify-center bg-surface-container shrink-0 overflow-hidden">
            <div
              className={`w-12 h-12 rounded-full bg-secondary/30 transition-transform duration-1000 ease-in-out ${
                isInhaling ? 'scale-125 bg-secondary/50' : 'scale-75 bg-secondary/20'
              }`}
            />
            <span className="absolute text-[10px] font-bold text-secondary uppercase">
              {isInhaling ? 'In' : 'Out'}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-on-surface">Mindful Breath</span>
            <p className="text-xs text-on-surface-variant mt-0.5 leading-snug">
              Sync your breath with the circle to ground yourself before playing.
            </p>
          </div>
        </div>
      </section>

      {/* ── MINI-GAMES CAROUSEL ───────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-headline-md text-lg font-bold text-on-surface">Cognitive Pillars</h3>
            <p className="text-xs text-on-surface-variant">Target individual focus areas at your own pace</p>
          </div>
          <button
            onClick={() => { playClick(); onNavigate('select'); }}
            className="text-xs text-secondary hover:text-primary font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span>View All</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {games.map((g) => (
            <div
              key={g.id}
              className="flex flex-col justify-between p-5 rounded-2xl bg-surface border border-border-subtle/50 shadow-xs hover:shadow-md transition-all group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl p-2 rounded-xl bg-surface-container group-hover:scale-110 transition-transform">
                    {g.icon}
                  </span>
                  <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider">
                    {g.categoryLabel}
                  </span>
                </div>
                <h4 className="font-headline-md text-base font-bold text-on-surface">{g.title}</h4>
                <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed">{g.description}</p>
              </div>

              <div className="flex items-center justify-between pt-4 mt-4 border-t border-border-subtle/30">
                <span className="text-[11px] text-outline font-medium">30s Micro-Round</span>
                <button
                  onClick={() => { playClick(); onLaunchGame(g.id); }}
                  className="btn btn-secondary px-4 py-1.5 text-xs font-semibold rounded-xl group-hover:bg-primary group-hover:text-white transition-colors cursor-pointer"
                >
                  <span>Play</span>
                  <span className="material-symbols-outlined text-[14px]">play_arrow</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
