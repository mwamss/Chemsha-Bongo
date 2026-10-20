import React, { useState, useEffect } from 'react';
import { getAllGames } from '../../engine/games/registry.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../services/apiClient.js';
import { ExerciseIcon } from '../icons/ExerciseIcon.jsx';

export function StatsScreen() {
  const { storage, isAuthenticated } = useAuth();
  const [totals, setTotals] = useState(() => storage.getTotals());
  const [serverStats, setServerStats] = useState(null);
  const games = getAllGames();

  useEffect(() => {
    if (isAuthenticated) {
      api.getStatsSummary()
        .then((data) => setServerStats(data))
        .catch(() => {});
    }
  }, [isAuthenticated]);

  const effectiveTotals = serverStats
    ? {
        gamesPlayed: serverStats.games_played,
        correctAnswers: serverStats.correct_answers,
        wrongAnswers: serverStats.wrong_answers,
        accuracy: serverStats.accuracy,
        highestOverallStreak: serverStats.highest_overall_streak,
        blitzWorkouts: serverStats.blitz_workouts,
        bestBlitzScore: serverStats.best_blitz_score,
        bestBlitzRating: serverStats.best_blitz_rating,
      }
    : totals;

  const exportBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(storage.load(), null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `chemsha_bongo_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="screen-layout flex flex-col gap-8 w-full mx-auto px-4 sm:px-6 lg:px-10 2xl:px-12 pt-6 pb-20 select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle/40 pb-4">
        <div>
          <h1 className="font-headline-xl text-2xl sm:text-3xl font-extrabold text-on-surface">
            Insights &amp; Stats Sheet
          </h1>
          <p className="text-sm text-on-surface-variant">
            Holistic metrics tracking cognitive stamina and mindfulness.
          </p>
        </div>
        <button
          onClick={exportBackup}
          className="btn btn-secondary px-4 py-2 text-xs font-semibold rounded-xl self-start sm:self-auto cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">download</span>
          <span>Download Backup .json</span>
        </button>
      </div>

      {/* ── HIGHLIGHT METRIC TILES ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex flex-col p-5 rounded-2xl bg-surface border border-border-subtle/50 shadow-sm">
          <span className="text-[10px] text-outline uppercase font-semibold">Total Sessions</span>
          <span className="font-headline-xl text-3xl font-extrabold text-primary mt-2 tabular-nums">
            {effectiveTotals.gamesPlayed}
          </span>
          <span className="text-xs text-secondary mt-1">Exercises completed</span>
        </div>

        <div className="flex flex-col p-5 rounded-2xl bg-surface border border-border-subtle/50 shadow-sm">
          <span className="text-[10px] text-outline uppercase font-semibold">Accuracy</span>
          <span className="font-headline-xl text-3xl font-extrabold text-secondary mt-2 tabular-nums">
            {effectiveTotals.accuracy}%
          </span>
          <span className="text-xs text-outline mt-1">{effectiveTotals.correctAnswers} / {effectiveTotals.correctAnswers + effectiveTotals.wrongAnswers} correct</span>
        </div>

        <div className="flex flex-col p-5 rounded-2xl bg-surface border border-border-subtle/50 shadow-sm">
          <span className="text-[10px] text-outline uppercase font-semibold">Highest Streak</span>
          <span className="font-headline-xl text-3xl font-extrabold text-on-surface mt-2 tabular-nums">
            {effectiveTotals.highestOverallStreak}
          </span>
          <span className="text-xs text-secondary mt-1">Consecutive combo</span>
        </div>

        <div className="flex flex-col p-5 rounded-2xl bg-surface border border-border-subtle/50 shadow-sm">
          <span className="text-[10px] text-outline uppercase font-semibold">Daily Blitz Best</span>
          <span className="font-headline-xl text-3xl font-extrabold text-primary mt-2 tabular-nums">
            {effectiveTotals.bestBlitzScore}
          </span>
          <span className="text-xs text-secondary font-semibold mt-1">
            {effectiveTotals.bestBlitzRating || 'Novice'}
          </span>
        </div>
      </div>

      {/* ── PER-PILLAR PERSONAL RECORDS TABLE ────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <h3 className="font-headline-md text-lg font-bold text-on-surface">Pillar Performance Summary</h3>
        <div className="overflow-x-auto rounded-3xl bg-surface border border-border-subtle/50 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-subtle/40 bg-surface-container/50 text-[11px] text-outline uppercase font-semibold">
                <th className="py-4 px-6">Exercise</th>
                <th className="py-4 px-6">Category</th>
                <th className="py-4 px-6">High Score</th>
                <th className="py-4 px-6">Max Streak</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/30 text-sm">
              {games.map((g) => {
                const pbScore = serverStats?.personal_bests?.[g.id]?.high_score ?? storage.getHighScore(g.id);
                const pbStreak = serverStats?.personal_bests?.[g.id]?.best_streak ?? storage.getBestStreak(g.id);
                const scoreVerified = serverStats?.personal_bests?.[g.id]?.is_verified;

                return (
                  <tr key={g.id} className="hover:bg-surface-container/30 transition-colors">
                    <td className="py-4 px-6 flex items-center gap-3">
                      <span className="text-secondary"><ExerciseIcon name={g.icon} size={22} /></span>
                      <span className="font-semibold text-on-surface">{g.title}</span>
                    </td>
                    <td className="py-4 px-6 text-secondary text-xs uppercase font-medium">
                      {g.categoryLabel}
                    </td>
                    <td className="py-4 px-6 font-bold text-primary tabular-nums">
                      <div>{pbScore}</div>
                      {serverStats?.personal_bests?.[g.id] && scoreVerified === false && (
                        <span className="text-[10px] font-medium text-outline">Imported · not ranked</span>
                      )}
                    </td>
                    <td className="py-4 px-6 font-medium text-on-surface tabular-nums">
                      {pbStreak}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

