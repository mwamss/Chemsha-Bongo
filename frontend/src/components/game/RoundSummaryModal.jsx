import React from 'react';
import { useAudio } from '../../context/AudioContext.jsx';

export function RoundSummaryModal({
  stats,
  meta,
  onPlayAgain,
  onExit,
}) {
  const { playClick } = useAudio();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm select-none">
      <div className="w-full max-w-md bg-surface rounded-3xl p-6 sm:p-8 shadow-2xl border border-border-subtle flex flex-col items-center text-center animate-countPulse">
        {/* Celebration / Icon */}
        <div className="w-16 h-16 rounded-2xl bg-secondary-container flex items-center justify-center text-3xl mb-4 shadow-sm">
          {stats.isNewHigh ? '🏆' : meta?.icon || '✨'}
        </div>

        {stats.isNewHigh && (
          <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-wider mb-2 shadow-xs">
            🎉 New Personal Best!
          </span>
        )}

        <h3 className="font-headline-xl text-2xl font-bold text-on-surface mb-1">
          {meta?.title} Complete
        </h3>
        <p className="text-xs text-on-surface-variant mb-6">Serene exercise session recorded</p>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-3 gap-3 w-full mb-6">
          <div className="flex flex-col p-3 rounded-2xl bg-surface-container border border-border-subtle/40">
            <span className="text-[10px] text-outline uppercase font-semibold">Score</span>
            <span className="font-headline-xl text-xl font-bold text-primary mt-1 tabular-nums">
              {stats.score}
            </span>
          </div>

          <div className="flex flex-col p-3 rounded-2xl bg-surface-container border border-border-subtle/40">
            <span className="text-[10px] text-outline uppercase font-semibold">Accuracy</span>
            <span className="font-headline-xl text-xl font-bold text-secondary mt-1 tabular-nums">
              {stats.accuracy}%
            </span>
          </div>

          <div className="flex flex-col p-3 rounded-2xl bg-surface-container border border-border-subtle/40">
            <span className="text-[10px] text-outline uppercase font-semibold">Streak</span>
            <span className="font-headline-xl text-xl font-bold text-on-surface mt-1 tabular-nums">
              {stats.maxStreak}
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col w-full gap-2.5">
          <button
            onClick={() => { playClick(); onPlayAgain(); }}
            className="btn btn-primary w-full py-3 text-sm font-semibold rounded-2xl shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">replay</span>
            <span>Play Again</span>
          </button>
          <button
            onClick={() => { playClick(); onExit(); }}
            className="btn btn-secondary w-full py-3 text-sm font-semibold rounded-2xl"
          >
            <span className="material-symbols-outlined text-[18px]">home</span>
            <span>Back to Sanctuary</span>
          </button>
        </div>
      </div>
    </div>
  );
}

