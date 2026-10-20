import React from 'react';
import { useAudio } from '../../context/AudioContext.jsx';
import { ExerciseIcon } from '../icons/ExerciseIcon.jsx';

export function RoundSummaryModal({
  stats,
  meta,
  isBlitz = false,
  blitzCurrentRound = 1,
  blitzTotalRounds = 3,
  blitzCumulativeScore = 0,
  nextGameMeta = null,
  onNext,
  onPlayAgain,
  onExit,
}) {
  const { playClick } = useAudio();
  const isLastBlitzRound = isBlitz && blitzCurrentRound >= blitzTotalRounds;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/40 dark:bg-black/70 backdrop-blur-sm select-none">
      <div className="w-full max-w-md bg-surface rounded-3xl p-6 sm:p-8 shadow-2xl border border-border-subtle flex flex-col items-center text-center animate-countPulse">
        {/* Blitz Badge or Celebration Icon */}
        {isBlitz ? (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-xs font-bold uppercase tracking-wider mb-3 shadow-2xs">
            <span className="material-symbols-outlined text-[15px]">bolt</span>
            <span>Daily Blitz • Round {blitzCurrentRound} of {blitzTotalRounds}</span>
          </div>
        ) : (
          <div className="w-16 h-16 rounded-xl bg-secondary-container flex items-center justify-center text-secondary mb-4">
            <ExerciseIcon name={stats?.isNewHigh ? 'award' : meta?.icon || 'schema'} size={32} />
          </div>
        )}

        {stats?.isNewHigh && !isBlitz && (
          <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-wider mb-2 shadow-xs">
            New Personal Best
          </span>
        )}

        <div className="flex items-center justify-center gap-2 mb-1">
          {isBlitz && <ExerciseIcon name={meta?.icon || 'sports_esports'} size={22} className="text-secondary" />}
          <h3 className="font-headline-xl text-2xl font-bold text-on-surface">
            {meta?.title} Complete
          </h3>
        </div>

        <p className="text-xs text-on-surface-variant mb-5">
          {isBlitz
            ? `Cumulative Blitz Score: ${blitzCumulativeScore.toLocaleString()} pts`
            : 'Serene exercise session recorded'}
        </p>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-3 gap-3 w-full mb-5">
          <div className="flex flex-col p-3 rounded-2xl bg-surface-container border border-border-subtle/40">
            <span className="text-[10px] text-outline uppercase font-semibold">Score</span>
            <span className="font-headline-xl text-xl font-bold text-primary mt-1 tabular-nums">
              {stats?.score ?? 0}
            </span>
          </div>

          <div className="flex flex-col p-3 rounded-2xl bg-surface-container border border-border-subtle/40">
            <span className="text-[10px] text-outline uppercase font-semibold">Accuracy</span>
            <span className="font-headline-xl text-xl font-bold text-secondary mt-1 tabular-nums">
              {stats?.accuracy ?? 100}%
            </span>
          </div>

          <div className="flex flex-col p-3 rounded-2xl bg-surface-container border border-border-subtle/40">
            <span className="text-[10px] text-outline uppercase font-semibold">Streak</span>
            <span className="font-headline-xl text-xl font-bold text-on-surface mt-1 tabular-nums">
              {stats?.maxStreak ?? 0}
            </span>
          </div>
        </div>

        {/* Next Game Preview Banner for Blitz */}
        {isBlitz && nextGameMeta && !isLastBlitzRound && (
          <div className="w-full mb-5 p-3 rounded-2xl bg-surface-container/60 border border-secondary/30 flex items-center justify-between text-left">
            <div className="flex items-center gap-2.5">
              <ExerciseIcon name={nextGameMeta.icon} size={22} className="text-secondary" />
              <div>
                <span className="text-[10px] text-secondary font-bold uppercase tracking-wider">Next Round</span>
                <h4 className="text-sm font-bold text-on-surface leading-tight">{nextGameMeta.title}</h4>
              </div>
            </div>
            <span className="text-xs font-semibold text-primary px-2.5 py-1 rounded-lg bg-surface border border-border-subtle">
              Round {blitzCurrentRound + 1}
            </span>
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-col w-full gap-2.5">
          {isBlitz ? (
            <button
              onClick={() => { playClick(); onNext(); }}
              className="btn btn-primary w-full py-3.5 text-sm font-bold rounded-2xl shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              <span>
                {isLastBlitzRound
                  ? 'View Final Blitz Rating'
                  : `Start Next Game (${nextGameMeta?.title || 'Round ' + (blitzCurrentRound + 1)})`}
              </span>
              <span className="material-symbols-outlined text-[18px]">
                {isLastBlitzRound ? 'emoji_events' : 'arrow_forward'}
              </span>
            </button>
          ) : (
            <button
              onClick={() => { playClick(); onPlayAgain(); }}
              className="btn btn-primary w-full py-3 text-sm font-semibold rounded-2xl shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">replay</span>
              <span>Play Again</span>
            </button>
          )}

          <button
            onClick={() => { playClick(); onExit(); }}
            className="btn btn-secondary w-full py-3 text-sm font-semibold rounded-2xl cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">home</span>
            <span>{isBlitz ? 'Exit Blitz to Sanctuary' : 'Back to Sanctuary'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
