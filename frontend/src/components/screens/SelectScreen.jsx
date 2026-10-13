import React from 'react';
import { getAllGames } from '../../engine/games/registry.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAudio } from '../../context/AudioContext.jsx';

export function SelectScreen({ onLaunchGame }) {
  const { storage } = useAuth();
  const { playClick } = useAudio();
  const games = getAllGames();

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-20 select-none">
      <div className="flex flex-col gap-1 border-b border-border-subtle/40 pb-4">
        <h1 className="font-headline-xl text-2xl sm:text-3xl font-extrabold text-on-surface">
          Exercise Directory
        </h1>
        <p className="text-sm text-on-surface-variant">
          Select an exercise below to build focus, reflexes, and working memory.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {games.map((g) => {
          const pbScore = storage.getHighScore(g.id);
          const pbStreak = storage.getBestStreak(g.id);

          return (
            <div
              key={g.id}
              className="flex flex-col justify-between p-6 rounded-3xl bg-surface border border-border-subtle/50 shadow-sm hover:shadow-md transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl p-2.5 rounded-2xl bg-surface-container">
                      {g.icon}
                    </span>
                    <div>
                      <h3 className="font-headline-md text-lg font-bold text-on-surface">{g.title}</h3>
                      <span className="text-xs text-secondary font-medium">{g.subtitle}</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-surface-container text-xs font-semibold text-secondary uppercase tracking-wider">
                    {g.categoryLabel}
                  </span>
                </div>

                <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">
                  {g.description}
                </p>

                {/* Personal best badges */}
                <div className="flex items-center gap-4 mt-4 text-xs text-outline font-medium">
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-amber-500">trophy</span>
                    <span>Best Score: <strong className="text-on-surface">{pbScore}</strong></span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-secondary">local_fire_department</span>
                    <span>Best Streak: <strong className="text-on-surface">{pbStreak}</strong></span>
                  </div>
                </div>
              </div>

              <div className="pt-5 mt-5 border-t border-border-subtle/30 flex items-center justify-between">
                <span className="text-xs text-outline">Duration: 30 seconds</span>
                <button
                  onClick={() => { playClick(); onLaunchGame(g.id); }}
                  className="btn btn-primary px-6 py-2.5 text-xs font-bold rounded-xl cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                  <span>Start Exercise</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

