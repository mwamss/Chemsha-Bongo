import React, { useState, useEffect } from 'react';
import { getAllGames } from '../../engine/games/registry.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../services/apiClient.js';
import { ExerciseIcon } from '../icons/ExerciseIcon.jsx';

export function StatsScreen() {
  const { storage, isAuthenticated } = useAuth();
  const [totals, setTotals] = useState(() => storage.getTotals());
  const [serverStats, setServerStats] = useState(null);
  const [history, setHistory] = useState(() => storage.getSessionHistory());
  const [wellbeing, setWellbeing] = useState(() => storage.getWellbeingCheckins());
  const games = getAllGames();

  useEffect(() => {
    if (isAuthenticated) {
      api.getStatsSummary()
        .then((data) => setServerStats(data))
        .catch(() => {});
      api.getSessionHistory(30).then(setHistory).catch(() => setHistory(storage.getSessionHistory()));
    } else {
      setServerStats(null);
      setHistory(storage.getSessionHistory());
    }
  }, [isAuthenticated, storage]);

  useEffect(() => {
    const refresh = () => {
      setTotals(storage.getTotals());
      setWellbeing(storage.getWellbeingCheckins());
      if (!isAuthenticated) setHistory(storage.getSessionHistory());
    };
    window.addEventListener('chemsha-storage-update', refresh);
    window.addEventListener('chemsha-private-data-merged', refresh);
    return () => {
      window.removeEventListener('chemsha-storage-update', refresh);
      window.removeEventListener('chemsha-private-data-merged', refresh);
    };
  }, [storage, isAuthenticated]);

  const week = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - offset));
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const sessions = history.filter((session) => {
      const played = new Date(session.playedAt);
      return `${played.getFullYear()}-${played.getMonth()}-${played.getDate()}` === key;
    });
    return { date, count: sessions.length, seconds: sessions.reduce((sum, session) => sum + (session.durationSec || 0), 0) };
  });
  const maxSessions = Math.max(1, ...week.map((day) => day.count));
  const weeklyMinutes = Math.round(week.reduce((sum, day) => sum + day.seconds, 0) / 60);
  const moodLabels = { calm: 'Calm', okay: 'Okay', tense: 'Tense', low: 'Low', energized: 'Energized' };

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

  const sessionCount = Number(effectiveTotals.gamesPlayed) || 0;
  const sessionMilestones = [1, 10, 25, 50, 100, 250, 500];
  const earnedMilestones = sessionMilestones.filter((milestone) => sessionCount >= milestone);
  const nextMilestone = sessionMilestones.find((milestone) => sessionCount < milestone) || Math.ceil((sessionCount + 1) / 250) * 250;
  const milestoneStart = sessionMilestones[sessionMilestones.indexOf(nextMilestone) - 1] || 0;
  const sessionProgress = Math.min(100, Math.round(((sessionCount - milestoneStart) / Math.max(1, nextMilestone - milestoneStart)) * 100));
  const answerCount = (Number(effectiveTotals.correctAnswers) || 0) + (Number(effectiveTotals.wrongAnswers) || 0);
  const gameIdsPlayed = new Set(history.map((session) => session.gameId));
  const achievements = [
    { title: 'First session', detail: 'Complete your first exercise.', icon: 'play_circle', earned: sessionCount >= 1 },
    { title: 'Practice rhythm', detail: 'Complete 10 exercise sessions.', icon: 'calendar_month', earned: sessionCount >= 10 },
    { title: 'Dedicated practice', detail: 'Complete 50 exercise sessions.', icon: 'workspace_premium', earned: sessionCount >= 50 },
    { title: 'Steady focus', detail: 'Reach 80% accuracy across at least 20 answers.', icon: 'center_focus_strong', earned: answerCount >= 20 && effectiveTotals.accuracy >= 80 },
    { title: 'Pillar explorer', detail: 'Try every exercise at least once.', icon: 'explore', earned: games.every((game) => gameIdsPlayed.has(game.id)) },
    { title: 'Long combo', detail: 'Reach a streak of 10 or more.', icon: 'bolt', earned: effectiveTotals.highestOverallStreak >= 10 },
  ];

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
            {effectiveTotals.accuracy == null ? '—' : `${effectiveTotals.accuracy}%`}
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

      <section className="rounded-2xl bg-surface border border-border-subtle/50 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h2 className="font-headline-md text-lg font-bold text-on-surface">Milestones</h2>
            <p className="text-sm text-on-surface-variant">Small markers of practice. Your progress is personal.</p>
          </div>
          <p className="text-xs font-semibold text-secondary">{Math.max(0, nextMilestone - sessionCount)} sessions to {nextMilestone}</p>
        </div>
        <div className="mt-4 h-2 rounded-full bg-surface-container overflow-hidden" role="progressbar" aria-label="Progress to next session milestone" aria-valuemin={0} aria-valuemax={100} aria-valuenow={sessionProgress}>
          <div className="h-full rounded-full bg-secondary transition-[width]" style={{ width: `${sessionProgress}%` }} />
        </div>
        <p className="mt-2 text-[11px] text-outline">{sessionCount} sessions completed · {earnedMilestones.length} session milestones earned</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-5">
          {achievements.map((achievement) => (
            <div key={achievement.title} className={`flex items-start gap-3 p-3.5 rounded-xl border ${achievement.earned ? 'bg-secondary/10 border-secondary/30' : 'bg-surface-container/50 border-border-subtle opacity-75'}`}>
              <span className={`material-symbols-outlined text-xl ${achievement.earned ? 'text-secondary' : 'text-outline'}`} aria-hidden="true">{achievement.icon}</span>
              <div>
                <h3 className="text-sm font-semibold text-on-surface">{achievement.title}{achievement.earned ? ' · Earned' : ''}</h3>
                <p className="text-xs text-on-surface-variant mt-0.5">{achievement.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-surface border border-border-subtle/50 p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
          <div>
            <h2 className="font-headline-md text-lg font-bold text-on-surface">Practice progress</h2>
            <p className="text-sm text-on-surface-variant">Your completed sessions over the last 7 days</p>
          </div>
          <p className="text-sm text-secondary font-semibold">{weeklyMinutes} min this week</p>
        </div>
        <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end min-h-36" role="img" aria-label={`Seven day practice chart. ${week.reduce((sum, day) => sum + day.count, 0)} sessions and ${weeklyMinutes} minutes this week.`}>
          {week.map((day) => (
            <div key={day.date.toISOString()} className="flex flex-col items-center gap-2 min-w-0">
              <span className="text-xs text-on-surface-variant tabular-nums">{day.count || ''}</span>
              <div className="w-full h-24 flex items-end rounded-md bg-surface-container overflow-hidden">
                <div className="w-full bg-secondary rounded-t-sm transition-[height]" style={{ height: `${day.count ? Math.max(10, day.count / maxSessions * 100) : 3}%`, opacity: day.count ? 1 : 0.18 }} />
              </div>
              <span className="text-[11px] text-outline">{day.date.toLocaleDateString(undefined, { weekday: 'short' })}</span>
            </div>
          ))}
        </div>
        {!history.length && <p className="mt-4 text-sm text-on-surface-variant">Finish a game round to start building your progress history.</p>}
      </section>

      <section className="rounded-2xl bg-surface border border-border-subtle/50 p-5 sm:p-6">
        <div className="mb-4">
          <h2 className="font-headline-md text-lg font-bold text-on-surface">Wellbeing check-ins</h2>
          <p className="text-sm text-on-surface-variant">A private record of the moods you chose to note. No score or judgment.</p>
        </div>
        <div className="grid grid-cols-7 gap-2 sm:gap-3">
          {week.map((day) => {
            const dateKey = `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, '0')}-${String(day.date.getDate()).padStart(2, '0')}`;
            const mood = wellbeing[dateKey]?.mood;
            return <div key={`mood-${dateKey}`} className="min-w-0 rounded-lg bg-surface-container/70 p-2 text-center">
              <p className="text-[11px] text-outline">{day.date.toLocaleDateString(undefined, { weekday: 'short' })}</p>
              <p className="mt-1 text-xs font-medium text-on-surface truncate" title={moodLabels[mood] || 'No check-in'}>{moodLabels[mood] || '—'}</p>
            </div>;
          })}
        </div>
      </section>

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

