import React, { useState, useEffect } from 'react';
import { getAllGames } from '../../engine/games/registry.js';
import { api } from '../../services/apiClient.js';
import { useAudio } from '../../context/AudioContext.jsx';
import { ExerciseIcon } from '../icons/ExerciseIcon.jsx';

export function LeaderboardScreen() {
  const [activeTab, setActiveTab] = useState('blitz'); // 'blitz' or gameId
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const { playClick } = useAudio();
  const games = getAllGames();

  useEffect(() => {
    setLoading(true);
    if (activeTab === 'blitz') {
      api.getDailyBlitzLeaderboard()
        .then((data) => setEntries(data.entries || []))
        .catch(() => setEntries([]))
        .finally(() => setLoading(false));
    } else {
      api.getGameLeaderboard(activeTab)
        .then((data) => setEntries(data.entries || []))
        .catch(() => setEntries([]))
        .finally(() => setLoading(false));
    }
  }, [activeTab]);

  return (
    <div className="screen-layout flex flex-col gap-6 w-full mx-auto px-4 sm:px-6 lg:px-10 2xl:px-12 pt-6 pb-20 select-none">
      <div className="flex flex-col gap-1 border-b border-border-subtle/40 pb-4">
        <h1 className="font-headline-xl text-2xl sm:text-3xl font-extrabold text-on-surface">
          Global Leaderboards
        </h1>
        <p className="text-sm text-on-surface-variant">
          Verified player rankings for the Daily Blitz challenge and individual cognitive pillars.
        </p>
      </div>

      {/* ── TAB BAR ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => { playClick(); setActiveTab('blitz'); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'blitz'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-surface border border-border-subtle text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">bolt</span>
          <span>Daily Blitz</span>
        </button>

        {games.map((g) => (
          <button
            key={g.id}
            onClick={() => { playClick(); setActiveTab(g.id); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
              activeTab === g.id
                ? 'bg-primary text-white shadow-sm'
                : 'bg-surface border border-border-subtle text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            <ExerciseIcon name={g.icon} size={16} />
            <span>{g.title}</span>
          </button>
        ))}
      </div>

      {/* ── RANKINGS TABLE ────────────────────────────────────────────────── */}
      <div className="rounded-3xl bg-surface border border-border-subtle/50 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-outline">Loading verified scores...</div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-4xl text-outline">workspace_premium</span>
            <p className="text-sm font-semibold text-on-surface">No qualifying scores yet today.</p>
            <p className="text-xs text-on-surface-variant">Complete a session to claim the #1 rank!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-subtle/40 bg-surface-container/50 text-[11px] text-outline uppercase font-semibold">
                  <th className="py-4 px-6 w-16">Rank</th>
                  <th className="py-4 px-6">Player</th>
                  <th className="py-4 px-6 text-right">Score</th>
                  {activeTab === 'blitz' ? (
                    <th className="py-4 px-6 text-right">Rating</th>
                  ) : (
                    <th className="py-4 px-6 text-right">Best Streak</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/30 text-sm">
                {entries.map((entry) => (
                  <tr key={entry.rank} className="hover:bg-surface-container/20 transition-colors">
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                        entry.rank === 1 ? 'bg-amber-100 text-amber-800' :
                        entry.rank === 2 ? 'bg-slate-200 text-slate-700' :
                        entry.rank === 3 ? 'bg-amber-700/20 text-amber-900' :
                        'text-outline'
                      }`}>
                        {entry.rank}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-xs shrink-0"
                          style={{ backgroundColor: entry.avatar_color || '#1e3a34' }}
                        >
                          {(entry.surname || entry.username).charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-on-surface">{entry.surname || entry.username}</span>
                          <span className="text-[11px] text-outline">@{entry.username}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right font-headline-xl text-lg font-bold text-primary tabular-nums">
                      {entry.total_score ?? entry.score}
                    </td>
                    {activeTab === 'blitz' ? (
                      <td className="py-4 px-6 text-right">
                        <span className="px-2.5 py-1 rounded-full bg-surface-container text-xs font-semibold text-secondary">
                          {entry.rating}
                        </span>
                      </td>
                    ) : (
                      <td className="py-4 px-6 text-right font-semibold text-on-surface tabular-nums">
                        {entry.secondary_metric}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

