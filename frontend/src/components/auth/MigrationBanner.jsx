import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAudio } from '../../context/AudioContext.jsx';

export function MigrationBanner() {
  const { migrationPrompt, handleMigrate, dismissMigration, storage } = useAuth();
  const { playClick, playVictory } = useAudio();
  const [isMerging, setIsMerging] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!migrationPrompt) return null;

  const totals = storage.getTotals();

  const onMergeClick = async () => {
    playClick();
    setIsMerging(true);
    setErrorMsg('');
    try {
      await handleMigrate();
      playVictory();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to merge records.');
      setIsMerging(false);
    }
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 bg-surface rounded-2xl p-4 shadow-xl border border-secondary/40 flex flex-col gap-3 animate-bounce-once">
      <div className="flex items-start gap-3">
        <span className="material-symbols-outlined text-secondary text-2xl">sync_saved_locally</span>
        <div className="flex flex-col flex-1">
          <h4 className="text-xs font-bold text-on-surface">Merge Guest Game Data?</h4>
          <p className="text-[11px] text-on-surface-variant mt-0.5 leading-snug">
            We discovered {totals.gamesPlayed} local exercise sessions on this browser. Sync them into your permanent account?
          </p>
          {errorMsg && (
            <p className="text-[10px] text-red-500 font-semibold mt-1">{errorMsg}</p>
          )}
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button
          onClick={() => { playClick(); dismissMigration(); }}
          disabled={isMerging}
          className="px-3 py-1 text-xs font-semibold text-outline hover:text-on-surface transition-colors cursor-pointer disabled:opacity-50"
        >
          Not Now
        </button>
        <button
          onClick={onMergeClick}
          disabled={isMerging}
          className="btn btn-primary px-3 py-1 text-xs min-h-[30px] rounded-lg shadow-xs cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
        >
          {isMerging ? (
            <>
              <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
              <span>Merging...</span>
            </>
          ) : (
            <span>Merge Records</span>
          )}
        </button>
      </div>
    </div>
  );
}

