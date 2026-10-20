import React from 'react';
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
  const { settings, updateSettings } = useAuth();
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
    </div>
  );
}
