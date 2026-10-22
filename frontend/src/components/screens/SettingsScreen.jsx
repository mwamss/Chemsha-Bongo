import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAudio } from '../../context/AudioContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';

function PreferenceRow({ title, description, value, onChange, activeLabel = 'Enabled', inactiveLabel = 'Disabled' }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 border-b border-border-subtle/30 last:border-b-0">
      <div>
        <p className="text-sm font-semibold text-on-surface">{title}</p>
        <p className="text-xs text-on-surface-variant mt-1">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={onChange}
        className={`shrink-0 min-w-24 px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
          value ? 'bg-secondary text-white' : 'bg-surface-container text-on-surface-variant'
        }`}
      >
        {value ? activeLabel : inactiveLabel}
      </button>
    </div>
  );
}

export function SettingsScreen() {
  const { settings, updateSettings, updateLocalSettings, isAuthenticated, setShowAuthModal, privateDataSyncStatus, retryPrivateDataSync, storagePersistenceStatus } = useAuth();
  const [privateSyncError, setPrivateSyncError] = useState('');
  const [reminderMessage, setReminderMessage] = useState('');
  const { muted, toggleMute, ambientPlaying, toggleAmbient, playTestChime, playClick } = useAudio();
  const { isDark, setTheme, toggleTheme } = useTheme();

  return (
    <div className="screen-layout w-full mx-auto px-4 sm:px-6 lg:px-10 2xl:px-12 pt-6 pb-20 flex flex-col gap-8">
      <header className="border-b border-border-subtle/40 pb-5">
        <span className="text-xs uppercase tracking-widest text-secondary font-semibold">Preferences</span>
        <h1 className="font-headline-xl text-2xl sm:text-3xl font-extrabold text-on-surface mt-1">Settings</h1>
        <p className="text-sm text-on-surface-variant mt-2">Adjust the appearance, sound, and sensory feedback for your sessions.</p>
      </header>

      <section className="p-6 sm:p-8 rounded-3xl bg-surface border border-border-subtle/50 flex flex-col gap-5">
        <div>
          <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">palette</span> Appearance
          </h2>
          <p className="text-xs text-on-surface-variant mt-1">Choose the color theme used throughout Chemsha Bongo.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            aria-pressed={!isDark}
            onClick={() => { playClick(); setTheme('light'); }}
            className={`p-4 rounded-2xl border text-left transition-colors cursor-pointer ${!isDark ? 'border-secondary bg-surface-container/60' : 'border-border-subtle hover:border-secondary/50'}`}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="font-semibold text-sm text-on-surface">Mint Alabaster</span>
              <span className="material-symbols-outlined text-secondary">light_mode</span>
            </span>
            <span className="block text-xs text-on-surface-variant mt-1">A bright, calm palette for daytime use.</span>
            {!isDark && <span className="block text-[10px] uppercase tracking-wider text-secondary font-bold mt-3">Current theme</span>}
          </button>
          <button
            type="button"
            aria-pressed={isDark}
            onClick={() => { playClick(); setTheme('dark'); }}
            className={`p-4 rounded-2xl border text-left transition-colors cursor-pointer ${isDark ? 'border-secondary bg-surface-container/60' : 'border-border-subtle hover:border-secondary/50'}`}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="font-semibold text-sm text-on-surface">Obsidian Sanctuary</span>
              <span className="material-symbols-outlined text-secondary">dark_mode</span>
            </span>
            <span className="block text-xs text-on-surface-variant mt-1">A dark forest palette for low-light sessions.</span>
            {isDark && <span className="block text-[10px] uppercase tracking-wider text-secondary font-bold mt-3">Current theme</span>}
          </button>
        </div>
        <button
          type="button"
          onClick={() => { playClick(); toggleTheme(); }}
          className="self-start px-4 py-2 rounded-xl border border-border-subtle text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
        >Switch to {isDark ? 'light' : 'dark'} theme</button>
      </section>

      <section className="p-6 sm:p-8 rounded-3xl bg-surface border border-border-subtle/50">
        <div className="border-b border-border-subtle/30 pb-3">
          <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">sports_esports</span> Practice
          </h2>
          <p className="text-xs text-on-surface-variant mt-1">Set a comfortable challenge level and optional practice reminder.</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 border-b border-border-subtle/30">
          <div>
            <p className="text-sm font-semibold text-on-surface">Game difficulty</p>
            <p className="text-xs text-on-surface-variant mt-1">Adjusts game challenge. You can change this at any time.</p>
          </div>
          <select
            aria-label="Game difficulty"
            value={settings?.difficulty ?? 2}
            onChange={(event) => updateLocalSettings({ difficulty: Number(event.target.value) })}
            className="min-w-40 rounded-xl border border-border-subtle bg-surface-container px-3 py-2 text-sm text-on-surface"
          >
            <option value="1">Gentle · 1</option>
            <option value="2">Steady · 2</option>
            <option value="3">Focused · 3</option>
            <option value="4">Demanding · 4</option>
            <option value="5">Advanced · 5</option>
          </select>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4">
          <div>
            <p className="text-sm font-semibold text-on-surface">Daily practice reminder</p>
            <p className="text-xs text-on-surface-variant mt-1">A private browser notification at your chosen time while the app is open.</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="time"
              aria-label="Practice reminder time"
              value={settings?.reminderTime || '18:00'}
              onChange={(event) => updateLocalSettings({ reminderTime: event.target.value })}
              className="rounded-xl border border-border-subtle bg-surface-container px-3 py-2 text-sm text-on-surface"
            />
            <button
              type="button"
              role="switch"
              aria-checked={Boolean(settings?.reminderEnabled)}
              onClick={async () => {
                setReminderMessage('');
                if (settings?.reminderEnabled) {
                  updateLocalSettings({ reminderEnabled: false });
                  return;
                }
                if (!('Notification' in window)) {
                  setReminderMessage('This browser does not support notifications.');
                  return;
                }
                const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
                if (permission !== 'granted') {
                  setReminderMessage('Allow notifications in your browser to turn reminders on.');
                  return;
                }
                updateLocalSettings({ reminderEnabled: true });
                setReminderMessage('Reminder enabled for this browser. The app needs to stay open.');
              }}
              className={`min-w-24 rounded-xl px-4 py-2 text-xs font-semibold ${settings?.reminderEnabled ? 'bg-secondary text-white' : 'bg-surface-container text-on-surface-variant'}`}
            >{settings?.reminderEnabled ? 'On' : 'Off'}</button>
          </div>
        </div>
        {reminderMessage && <p role="status" className="text-xs text-on-surface-variant">{reminderMessage}</p>}
      </section>

      <section className="p-6 sm:p-8 rounded-3xl bg-surface border border-border-subtle/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle/30 pb-4">
          <div>
            <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">tune</span> Audio &amp; accessibility
            </h2>
            <p className="text-xs text-on-surface-variant mt-1">Control game sounds and optional sensory feedback.</p>
          </div>
          <button type="button" onClick={() => { playClick(); playTestChime(); }} className="btn btn-secondary px-3.5 py-2 text-xs font-semibold rounded-xl cursor-pointer flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">music_note</span> Test sound
          </button>
        </div>

        <PreferenceRow
          title="Game sound effects"
          description="Audio cues for answers, combos, and timer ticks."
          value={!muted}
          onChange={() => { playClick(); toggleMute(); }}
          activeLabel="On"
          inactiveLabel="Muted"
        />
        <PreferenceRow
          title="Sanctuary ambient sound"
          description="A gentle background drone during quiet moments."
          value={ambientPlaying}
          onChange={() => { playClick(); toggleAmbient(); }}
          activeLabel="Playing"
          inactiveLabel="Off"
        />
        <PreferenceRow
          title="Haptic feedback"
          description="A brief device vibration for answers and errors, where supported."
          value={Boolean(settings?.hapticsEnabled)}
          onChange={() => { playClick(); updateSettings({ haptics_enabled: !settings?.hapticsEnabled }); }}
        />
      </section>

      <section className="p-6 sm:p-8 rounded-3xl bg-surface border border-border-subtle/50">
        <div className="border-b border-border-subtle/30 pb-3">
          <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">sync</span> Account data
          </h2>
          <p className="text-xs text-on-surface-variant mt-1">Private reflections and rhythm history stay on this device unless you enable account sync.</p>
        </div>
        {isAuthenticated ? (
          <>
            <PreferenceRow
              title="Sync private reflections and rhythm"
              description="When enabled, your journal and progress are stored in your account and merged across devices. Turning it off deletes the account copy but keeps this device's copy."
              value={Boolean(settings?.privateSyncEnabled)}
              onChange={async () => {
                setPrivateSyncError('');
                try {
                  await updateSettings({ private_sync_enabled: !settings?.privateSyncEnabled });
                } catch (error) {
                  setPrivateSyncError(error.message || 'Private data sync could not be updated.');
                }
              }}
              activeLabel="On"
              inactiveLabel="Off"
            />
            {privateSyncError && <p role="alert" className="text-xs text-red-500 mt-2">{privateSyncError}</p>}
            {settings?.privateSyncEnabled && (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs" aria-live="polite">
                <p className={privateDataSyncStatus === 'error' ? 'text-red-600 dark:text-red-400' : 'text-on-surface-variant'}>
                  {privateDataSyncStatus === 'syncing' ? 'Syncing private data…'
                    : privateDataSyncStatus === 'synced' ? 'Private data is synced to this account.'
                      : privateDataSyncStatus === 'error' ? 'Sync failed. Your local data is still available.'
                        : 'Waiting for the next change to sync.'}
                </p>
                {privateDataSyncStatus === 'error' && (
                  <button type="button" onClick={() => retryPrivateDataSync().catch(() => {})} className="font-semibold text-secondary underline underline-offset-2">
                    Retry
                  </button>
                )}
              </div>
            )}
            {storagePersistenceStatus !== 'persistent' && (
              <p role="alert" className="text-xs text-amber-700 dark:text-amber-300 mt-2">
                {storagePersistenceStatus === 'memory-only'
                  ? 'Browser storage is unavailable. Your unsynced data will be lost when this tab closes.'
                  : storagePersistenceStatus === 'error'
                    ? 'Browser storage could not be read or written. Keep account sync enabled and download a backup.'
                    : 'Checking browser storage…'}
              </p>
            )}
          </>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4">
            <p className="text-xs text-on-surface-variant">Sign in to sync private reflections and rhythm history between devices.</p>
            <button type="button" onClick={() => setShowAuthModal(true)} className="btn btn-secondary px-4 py-2 rounded-xl text-xs font-semibold">Sign in</button>
          </div>
        )}
      </section>
    </div>
  );
}
