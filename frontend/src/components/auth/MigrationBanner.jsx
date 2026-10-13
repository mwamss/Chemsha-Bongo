import React from 'react';
import { useAuth } from '../../context/AuthContext.jsx';

export function MigrationBanner() {
  const { migrationPrompt, handleMigrate, dismissMigration, storage } = useAuth();

  if (!migrationPrompt) return null;

  const totals = storage.getTotals();

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 bg-surface rounded-2xl p-4 shadow-xl border border-secondary/40 flex flex-col gap-3 animate-bounce-once">
      <div className="flex items-start gap-3">
        <span className="material-symbols-outlined text-secondary text-2xl">sync_saved_locally</span>
        <div className="flex flex-col">
          <h4 className="text-xs font-bold text-on-surface">Merge Guest Game Data?</h4>
          <p className="text-[11px] text-on-surface-variant mt-0.5 leading-snug">
            We discovered {totals.gamesPlayed} local exercise sessions on this browser. Sync them into your permanent account?
          </p>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button
          onClick={dismissMigration}
          className="px-3 py-1 text-xs font-semibold text-outline hover:text-on-surface transition-colors cursor-pointer"
        >
          Not Now
        </button>
        <button
          onClick={handleMigrate}
          className="btn btn-primary px-3 py-1 text-xs min-h-[30px] rounded-lg shadow-xs cursor-pointer"
        >
          Merge Records
        </button>
      </div>
    </div>
  );
}

