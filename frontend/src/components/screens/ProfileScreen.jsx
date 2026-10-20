import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAudio } from '../../context/AudioContext.jsx';
import { GoogleSignInButton } from '../auth/GoogleSignInButton.jsx';

const AVATAR_PALETTE = [
  { name: 'Forest Teal', hex: '#1e3a34' },
  { name: 'Eucalyptus', hex: '#356759' },
  { name: 'Warm Ochre', hex: '#e8b86d' },
  { name: 'Amethyst', hex: '#8b5cf6' },
  { name: 'Oceanic Blue', hex: '#3b82f6' },
  { name: 'Terracotta', hex: '#c86a58' },
];

const MAX_AVATAR_BYTES = 512 * 1024;

async function prepareAvatarImage(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Choose a JPEG, PNG, or WebP image.');
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.82));
  if (!blob) throw new Error('This image could not be prepared. Try another file.');
  if (blob.size > MAX_AVATAR_BYTES) {
    throw new Error('This image is still too large after resizing. Choose a smaller image.');
  }
  return new File([blob], 'profile-avatar.webp', { type: 'image/webp' });
}

export function ProfileScreen({ onNavigate }) {
  const {
    user,
    isAuthenticated,
    displayName,
    username,
    email,
    avatarInitial,
    avatarColor,
    avatarImage,
    updateProfile,
    uploadAvatar,
    removeAvatar,
    linkGoogleAccount,
    syncLocalData,
    syncStatus,
    logout,
    setShowAuthModal,
    storage,
  } = useAuth();

  const { playClick } = useAudio();

  const [inputSurname, setInputSurname] = useState(displayName);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState('');
  const [avatarError, setAvatarError] = useState('');
  const [pendingAvatarPreview, setPendingAvatarPreview] = useState(null);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleMessage, setGoogleMessage] = useState('');
  const [googleError, setGoogleError] = useState('');
  const avatarInputRef = useRef(null);

  useEffect(() => () => {
    if (pendingAvatarPreview) URL.revokeObjectURL(pendingAvatarPreview);
  }, [pendingAvatarPreview]);

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

  const handleAvatarFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const preview = URL.createObjectURL(file);
    setPendingAvatarPreview(preview);
    setAvatarMessage('');
    setAvatarError('');
    setAvatarBusy(true);
    try {
      const optimizedImage = await prepareAvatarImage(file);
      await uploadAvatar(optimizedImage);
      setAvatarMessage('Profile photo synced to your account.');
    } catch (error) {
      setAvatarError(error.message || 'Could not save this profile photo.');
    } finally {
      setPendingAvatarPreview(null);
      setAvatarBusy(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarBusy(true);
    setAvatarMessage('');
    setAvatarError('');
    try {
      await removeAvatar();
      setAvatarMessage('Profile photo removed from your account.');
    } catch (error) {
      setAvatarError(error.message || 'Could not remove this profile photo.');
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleLinkGoogle = async (credential) => {
    setGoogleBusy(true);
    setGoogleMessage('');
    setGoogleError('');
    try {
      await linkGoogleAccount(credential);
      setGoogleMessage('Google sign-in connected to this account.');
    } catch (error) {
      setGoogleError(error.message || 'Could not connect this Google account.');
    } finally {
      setGoogleBusy(false);
    }
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
    <div className="profile-screen screen-layout flex flex-col gap-8 w-full mx-auto px-4 sm:px-6 lg:px-10 2xl:px-12 pt-6 pb-20 select-none">
      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <div className="profile-page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle/40 pb-5">
        <div>
          <span className="text-xs uppercase tracking-widest text-secondary font-semibold">
            Account Profile
          </span>
          <h1 className="font-headline-xl text-2xl sm:text-3xl font-extrabold text-on-surface mt-1">
            Profile
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
        <button
          type="button"
          onClick={() => { playClick(); onNavigate?.('settings'); }}
          className="btn btn-secondary px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">settings</span>
          <span>Settings</span>
        </button>
      </div>

      {/* ── SUCCESS TOAST BANNER ─────────────────────────────────────────── */}
      {saveSuccessMsg && (
        <div className="profile-toast p-4 rounded-2xl bg-emerald-100/70 border border-emerald-300 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-bounce-once">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* ── ACCOUNT IDENTITY CARD ────────────────────────────────────────── */}
      <div className="profile-identity-card p-6 sm:p-8 rounded-3xl bg-surface border border-border-subtle/50 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          {/* Avatar with selected color */}
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center text-3xl font-extrabold text-white shadow-md transition-colors overflow-hidden"
            style={{ backgroundColor: avatarColor }}
          >
            {(pendingAvatarPreview || avatarImage) ? (
              <img
                src={pendingAvatarPreview || avatarImage}
                alt={`${displayName}'s profile`}
                className="w-full h-full object-cover"
              />
            ) : avatarInitial}
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
        <div className="profile-guest-card p-6 rounded-3xl bg-gradient-to-br from-surface-container/80 to-surface-container-high/60 border border-secondary/30 flex flex-col sm:flex-row items-center justify-between gap-4">
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
      <div className="profile-customization-card p-6 sm:p-8 rounded-3xl bg-surface border border-border-subtle/50 shadow-sm flex flex-col gap-6">
        <h3 className="font-headline-md text-lg font-bold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary">badge</span>
          <span>Profile Details</span>
        </h3>

        {isAuthenticated && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-surface-container/50 border border-border-subtle/40 p-4">
            <div>
              <p className="text-sm font-semibold text-on-surface">Google account</p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {user?.google_connected ? 'Google sign-in is connected to this account.' : 'Connect Google to sign in with your Google account.'}
              </p>
            </div>
            {user?.google_connected ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary">
                <span className="material-symbols-outlined text-base">check_circle</span>
                Connected
              </span>
            ) : googleBusy ? (
              <span className="text-xs text-secondary" role="status">Connecting Google…</span>
            ) : (
              <GoogleSignInButton
                onCredential={handleLinkGoogle}
                onLoadError={setGoogleError}
                buttonText="continue_with"
              />
            )}
            {(googleMessage || googleError) && (
              <p className={`text-xs basis-full ${googleError ? 'text-red-600 dark:text-red-400' : 'text-secondary'}`} role="status">
                {googleError || googleMessage}
              </p>
            )}
          </div>
        )}

        {/* Account synced profile image */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 border-b border-border-subtle/30 pb-5">
          {isAuthenticated ? (
            <>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarFile}
                className="sr-only"
                aria-label="Choose a profile photo"
              />
              <button
                type="button"
                onClick={() => { playClick(); avatarInputRef.current?.click(); }}
                disabled={avatarBusy}
                className="btn btn-secondary px-5 py-2.5 text-xs font-semibold rounded-xl cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">add_a_photo</span>
                {avatarBusy ? 'Saving photo…' : avatarImage ? 'Change profile photo' : 'Add profile photo'}
              </button>
              {avatarImage && (
                <button
                  type="button"
                  onClick={() => { playClick(); handleRemoveAvatar(); }}
                  disabled={avatarBusy}
                  className="text-xs font-semibold text-on-surface-variant hover:text-primary cursor-pointer disabled:opacity-50"
                >
                  Remove photo
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={() => { playClick(); setShowAuthModal(true); }}
              className="btn btn-secondary px-5 py-2.5 text-xs font-semibold rounded-xl cursor-pointer"
            >
              Sign in to sync a profile photo
            </button>
          )}
          <span className="text-[11px] text-on-surface-variant sm:ml-auto">
            JPEG, PNG, or WebP · resized to 512 × 512 max
          </span>
        </div>
        {(avatarMessage || avatarError) && (
          <p className={`text-xs ${avatarError ? 'text-red-600 dark:text-red-400' : 'text-secondary'}`} role="status">
            {avatarError || avatarMessage}
          </p>
        )}

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

      {/* ── DATA STORAGE & CLOUD BACKUP ──────────────────────────────────── */}
      <div className="profile-data-card p-6 sm:p-8 rounded-3xl bg-surface border border-border-subtle/50 shadow-sm flex flex-col gap-4">
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

