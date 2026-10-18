import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAudio } from '../../context/AudioContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';

const AVATAR_PALETTE = [
  { name: 'Forest Teal', hex: '#1e3a34' },
  { name: 'Eucalyptus', hex: '#356759' },
  { name: 'Warm Ochre', hex: '#e8b86d' },
  { name: 'Amethyst', hex: '#8b5cf6' },
  { name: 'Oceanic Blue', hex: '#3b82f6' },
  { name: 'Terracotta', hex: '#c86a58' },
];

export function ProfileScreen() {
  const {
    user,
    isAuthenticated,
    displayName,
    username,
    email,
    avatarInitial,
    avatarColor,
    settings,
    updateProfile,
    updateSettings,
    syncLocalData,
    syncStatus,
    logout,
    setShowAuthModal,
    storage,
  } = useAuth();

  const { muted, toggleMute, ambientPlaying, toggleAmbient, playTestChime, playClick } = useAudio();
  const { theme, setTheme, isDark, toggleTheme } = useTheme();

  const [inputSurname, setInputSurname] = useState(displayName);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({ surname: inputSurname });
      setSaveSuccessMsg('Profile updated successfully!');
      setTimeout(() => setSaveSuccessMsg(''), 3000);
    } catch (err) {
      console.warn('Profile save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectColor = async (hex) => {
    playClick();
    await updateProfile({ avatar_color: hex });
  };

  const exportBackup = () => {
    playClick();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(storage.load(), null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `chemsha_bongo_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleManualSync = async () => {
    playClick();
    try {
      await syncLocalData();
      setSaveSuccessMsg('Local data synced to your account!');
      setTimeout(() => setSaveSuccessMsg(''), 3000);
    } catch (err) {
      // Handled by syncStatus
    }
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-4xl mx-auto px-4 sm:px-6 pt-6 pb-20 select-none">
      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle/40 pb-5">
        <div>
          <span className="text-xs uppercase tracking-widest text-secondary font-semibold">
            Account Management &amp; Settings
          </span>
          <h1 className="font-headline-xl text-2xl sm:text-3xl font-extrabold text-on-surface mt-1">
            Personal Sanctuary
          </h1>
        </div>

        {/* Cloud Status Badge */}
        <div className={`flex items-center gap-2 self-start sm:self-auto px-4 py-2 rounded-2xl border text-xs font-semibold ${
          isAuthenticated
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-surface-container text-outline border-border-subtle'
        }`}>
          <span className={`w-2.5 h-2.5 rounded-full ${isAuthenticated ? 'bg-emerald-500 animate-pulse' : 'bg-outline'}`} />
          <span>{isAuthenticated ? 'Cloud Synced Account' : 'Guest Account (Local Only)'}</span>
        </div>
      </div>

      {/* ── SUCCESS TOAST BANNER ─────────────────────────────────────────── */}
      {saveSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-100/70 border border-emerald-300 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-bounce-once">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* ── ACCOUNT IDENTITY CARD ────────────────────────────────────────── */}
      <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-border-subtle/50 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          {/* Avatar with selected color */}
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center text-3xl font-extrabold text-white shadow-md transition-colors"
            style={{ backgroundColor: avatarColor }}
          >
            {avatarInitial}
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="font-headline-xl text-xl sm:text-2xl font-bold text-on-surface">
                {displayName}
              </h2>
              {isAuthenticated && (
                <span className="material-symbols-outlined text-secondary text-[20px]" title="Verified Account">
                  verified
                </span>
              )}
            </div>
            <span className="text-xs text-outline font-medium">
              {isAuthenticated ? `@${username} • ${email}` : 'Playing as Guest'}
            </span>
            <span className="text-xs text-secondary font-semibold mt-1">
              {isAuthenticated ? 'Verified Mindful Tier' : 'Scores saved in local browser only'}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div>
          {isAuthenticated ? (
            <button
              onClick={() => { playClick(); logout(); }}
              className="btn btn-secondary px-5 py-2.5 text-xs font-semibold rounded-xl text-red-600 hover:bg-red-50 border-red-200 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              onClick={() => { playClick(); setShowAuthModal(true); }}
              className="btn btn-primary px-6 py-2.5 text-xs font-bold rounded-xl shadow-md cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">login</span>
              <span>Sign In / Register</span>
            </button>
          )}
        </div>
      </div>

      {/* ── GUEST BENEFIT PROMPT (IF NOT LOGGED IN) ───────────────────────── */}
      {!isAuthenticated && (
        <div className="p-6 rounded-3xl bg-gradient-to-br from-surface-container/80 to-surface-container-high/60 border border-secondary/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-4xl">☁️</span>
            <div>
              <h3 className="font-headline-md text-sm font-bold text-on-surface">
                Enable Cloud Storage &amp; Leaderboards
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Create a free account to permanently sync high scores, preserve streaks, and join official Daily Blitz rankings across all your devices.
              </p>
            </div>
          </div>
          <button
            onClick={() => { playClick(); setShowAuthModal(true); }}
            className="btn btn-primary px-6 py-2 text-xs font-bold rounded-xl shrink-0 cursor-pointer"
          >
            Create Account
          </button>
        </div>
      )}

      {/* ── PROFILE CUSTOMIZATION ────────────────────────────────────────── */}
      <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-border-subtle/50 shadow-sm flex flex-col gap-6">
        <h3 className="font-headline-md text-lg font-bold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary">badge</span>
          <span>Profile Details</span>
        </h3>

        <form onSubmit={handleSaveProfile} className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex flex-col gap-1.5 flex-1 w-full">
            <label className="text-xs font-bold text-outline uppercase tracking-wider">
              Surname / Display Name
            </label>
            <input
              type="text"
              required
              value={inputSurname}
              onChange={(e) => setInputSurname(e.target.value)}
              className="px-4 py-3 rounded-2xl bg-surface-container/60 border border-border-subtle focus:bg-surface focus:outline-none focus:border-secondary text-sm font-semibold text-on-surface"
              placeholder="e.g. Mwamburi"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary px-7 py-3 text-xs font-bold rounded-2xl cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Name'}
          </button>
        </form>

        {/* Mindful Avatar Color Picker */}
        <div className="flex flex-col gap-2.5 pt-4 border-t border-border-subtle/30">
          <label className="text-xs font-bold text-outline uppercase tracking-wider">
            Mindful Avatar Hue
          </label>
          <div className="flex flex-wrap gap-3">
            {AVATAR_PALETTE.map((c) => (
              <button
                key={c.hex}
                type="button"
                onClick={() => handleSelectColor(c.hex)}
                className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all cursor-pointer shadow-xs ${
                  avatarColor === c.hex ? 'ring-4 ring-secondary/40 scale-110 shadow-sm' : 'hover:scale-105'
                }`}
                style={{ backgroundColor: c.hex }}
                title={c.name}
              >
                {avatarColor === c.hex && (
                  <span className="material-symbols-outlined text-white text-[18px]">check</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── VISUAL THEME & SANCTUARY ATMOSPHERE ──────────────────────────── */}
      <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-border-subtle/50 shadow-sm flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-col">
            <h3 className="font-headline-md text-lg font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">palette</span>
              <span>Visual Theme &amp; Sanctuary Atmosphere</span>
            </h3>
            <span className="text-xs text-on-surface-variant mt-0.5">
              Toggle between the bright Mint Alabaster palette and the contemplative Obsidian Sanctuary dark suite.
            </span>
          </div>

          <button
            type="button"
            onClick={() => { playClick(); toggleTheme(); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 self-start sm:self-auto shadow-xs ${
              isDark ? 'bg-[#181d1b] text-[#95d3c0] border border-[#2d3a35]' : 'bg-secondary text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {isDark ? 'light_mode' : 'dark_mode'}
            </span>
            <span>{isDark ? 'Switch to Light' : 'Switch to Dark'}</span>
          </button>
        </div>

        {/* Theme Cards Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Card 1: Light Theme (Mint Alabaster) */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => { playClick(); setTheme('light'); }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { playClick(); setTheme('light'); } }}
            className={`p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
              !isDark
                ? 'border-secondary bg-surface-container/60 shadow-sm ring-2 ring-secondary/20'
                : 'border-border-subtle bg-surface hover:border-secondary/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-secondary border border-border-subtle shadow-xs">
                  <span className="material-symbols-outlined text-[18px]">light_mode</span>
                </span>
                <span className="font-bold text-sm text-on-surface">Mint Alabaster</span>
              </div>
              {!isDark && (
                <span className="px-2 py-0.5 rounded-full bg-secondary text-white text-[10px] font-bold uppercase tracking-wider">
                  Active
                </span>
              )}
            </div>

            {/* Visual Swatch Preview */}
            <div className="rounded-xl p-3 bg-[#f8f9f5] border border-[#dde2d8] flex items-center justify-between text-xs">
              <div className="space-y-1">
                <span className="block text-[10px] uppercase font-bold text-[#356759]">Light Sanctuary</span>
                <span className="font-serif text-[#101e1a] font-medium text-xs">“Let the answer unfold”</span>
              </div>
              <div className="flex gap-1.5">
                <span className="w-4 h-4 rounded-full bg-[#1e3a34] border border-[#dde2d8]"></span>
                <span className="w-4 h-4 rounded-full bg-[#356759]"></span>
                <span className="w-4 h-4 rounded-full bg-[#edfdf5] border border-[#dde2d8]"></span>
              </div>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              Airy, crisp daylight atmosphere with high legibility and calming mint hues.
            </p>
          </div>

          {/* Card 2: Dark Theme (Obsidian Sanctuary) */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => { playClick(); setTheme('dark'); }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { playClick(); setTheme('dark'); } }}
            className={`p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
              isDark
                ? 'border-[#528e7d] bg-[#181d1b] shadow-md ring-2 ring-[#528e7d]/30'
                : 'border-border-subtle bg-surface hover:border-secondary/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-[#0a0f0d] flex items-center justify-center text-[#95d3c0] border border-[#2d3a35] shadow-xs">
                  <span className="material-symbols-outlined text-[18px]">dark_mode</span>
                </span>
                <span className="font-bold text-sm text-[#f0f4f2]">Obsidian Sanctuary</span>
              </div>
              {isDark && (
                <span className="px-2 py-0.5 rounded-full bg-[#528e7d] text-[#0a0f0d] text-[10px] font-bold uppercase tracking-wider">
                  Active
                </span>
              )}
            </div>

            {/* Visual Swatch Preview */}
            <div className="rounded-xl p-3 bg-[#0a0f0d] border border-[#2d3a35] flex items-center justify-between text-xs">
              <div className="space-y-1">
                <span className="block text-[10px] uppercase font-bold text-[#95d3c0]">Deep Reflection</span>
                <span className="font-serif text-[#f0f4f2] font-medium text-xs">“Holding onto what serves”</span>
              </div>
              <div className="flex gap-1.5">
                <span className="w-4 h-4 rounded-full bg-[#0a0f0d] border border-[#2d3a35]"></span>
                <span className="w-4 h-4 rounded-full bg-[#181d1b] border border-[#2d3a35]"></span>
                <span className="w-4 h-4 rounded-full bg-[#95d3c0]"></span>
              </div>
            </div>

            <p className="text-xs text-[#8e9e97] leading-relaxed">
              Quiet slate-forest cards on deep obsidian (#0A0F0D) with eucalyptus accents and alabaster serif text.
            </p>
          </div>
        </div>
      </div>

      {/* ── AUDIO & SENSORY PREFERENCES ──────────────────────────────────── */}
      <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-border-subtle/50 shadow-sm flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h3 className="font-headline-md text-lg font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">tune</span>
            <span>Sensory &amp; Audio Settings</span>
          </h3>
          <button
            type="button"
            onClick={playTestChime}
            className="btn btn-secondary px-3.5 py-1.5 text-xs font-semibold rounded-xl cursor-pointer flex items-center gap-1.5"
            title="Preview Sound Chime"
          >
            <span className="material-symbols-outlined text-[16px] text-secondary">music_note</span>
            <span>Test Chime</span>
          </button>
        </div>

        <div className="divide-y divide-border-subtle/30">
          {/* Sound Mute Toggle */}
          <div className="py-4 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-on-surface">Game Sound Effects</span>
              <span className="text-xs text-on-surface-variant">Procedural audio chimes for correct answers, combos, and timer ticks.</span>
            </div>
            <button
              onClick={toggleMute}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                !muted ? 'bg-secondary text-white shadow-xs' : 'bg-surface-container text-outline'
              }`}
            >
              {!muted ? 'Enabled' : 'Muted'}
            </button>
          </div>

          {/* Ambient Drone Toggle */}
          <div className="py-4 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-on-surface">Meditative Ambient Sound</span>
              <span className="text-xs text-on-surface-variant">Generative alpha-wave drone for relaxed mental focus.</span>
            </div>
            <button
              onClick={toggleAmbient}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                ambientPlaying ? 'bg-secondary text-white shadow-xs' : 'bg-surface-container text-outline'
              }`}
            >
              {ambientPlaying ? 'Playing' : 'Off'}
            </button>
          </div>

          {/* Haptics Toggle */}
          <div className="py-4 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-on-surface">Haptic Vibration Feedback</span>
              <span className="text-xs text-on-surface-variant">Gentle device pulse on answers and error notifications (mobile supported).</span>
            </div>
            <button
              onClick={() => {
                const nextHaptics = !settings.hapticsEnabled;
                updateSettings({ haptics_enabled: nextHaptics });
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                settings.hapticsEnabled ? 'bg-secondary text-white shadow-xs' : 'bg-surface-container text-outline'
              }`}
            >
              {settings.hapticsEnabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        </div>
      </div>

      {/* ── DATA STORAGE & CLOUD BACKUP ──────────────────────────────────── */}
      <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-border-subtle/50 shadow-sm flex flex-col gap-4">
        <h3 className="font-headline-md text-lg font-bold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary">cloud_sync</span>
          <span>Data Storage &amp; Backups</span>
        </h3>
        <p className="text-xs text-on-surface-variant leading-relaxed">
          Your game statistics are always cached locally on this browser. When signed in, results are verified and safely synchronized to PostgreSQL.
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          {isAuthenticated && (
            <button
              onClick={handleManualSync}
              disabled={syncStatus === 'syncing'}
              className="btn btn-primary px-5 py-2.5 text-xs font-bold rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">sync</span>
              <span>
                {syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'synced' ? '✓ Synced!' : 'Sync Local Data to Account'}
              </span>
            </button>
          )}

          <button
            onClick={exportBackup}
            className="btn btn-secondary px-5 py-2.5 text-xs font-semibold rounded-xl cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>Download Data (.json)</span>
          </button>
        </div>
      </div>
    </div>
  );
}

