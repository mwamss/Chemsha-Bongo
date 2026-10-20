import React, { useState } from 'react';
import { BrandIcon } from '../BrandIcon.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAudio } from '../../context/AudioContext.jsx';
import { GoogleSignInButton } from './GoogleSignInButton.jsx';

export function AuthModal() {
  const { showAuthModal, setShowAuthModal, login, loginWithGoogle, register, migrationPrompt, handleMigrate, dismissMigration } = useAuth();
  const { playClick } = useAudio();

  const [tab, setTab] = useState('login'); // 'login' or 'register'
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [surname, setSurname] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!showAuthModal) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (tab === 'login') {
        await login(usernameOrEmail, password);
      } else {
        await register({ email, username, password, surname });
      }
      playClick();
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = async (credential) => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle(credential);
      playClick();
    } catch (err) {
      setError(err.message || 'Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-primary/30 dark:bg-black/70 backdrop-blur-sm select-none">
      <div className="w-full max-w-md bg-surface rounded-3xl p-6 sm:p-8 shadow-2xl border border-border-subtle relative flex flex-col gap-5">
        {/* Close Button */}
        <button
          onClick={() => setShowAuthModal(false)}
          className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-outline hover:bg-surface-container transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <BrandIcon className="w-12 h-12 mb-2" />
          <h3 className="font-headline-xl text-xl font-bold text-on-surface">
            {tab === 'login' ? 'Welcome Back' : 'Create Your Mindful Account'}
          </h3>
          <p className="text-xs text-on-surface-variant mt-1">
            Sync high scores, compete on leaderboards, and preserve streaks across devices.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex rounded-xl bg-surface-container p-1">
          <button
            type="button"
            onClick={() => { setTab('login'); setError(''); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              tab === 'login' ? 'bg-surface text-primary shadow-xs' : 'text-on-surface-variant'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setError(''); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              tab === 'register' ? 'bg-surface text-primary shadow-xs' : 'text-on-surface-variant'
            }`}
          >
            Register
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {tab === 'login' ? (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-outline">Username or Email</label>
                <input
                  type="text"
                  required
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl bg-surface-container/60 border border-border-subtle focus:bg-surface focus:outline-none focus:border-secondary text-sm"
                  placeholder="e.g. mindful_player"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-outline">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl bg-surface-container/60 border border-border-subtle focus:bg-surface focus:outline-none focus:border-secondary text-sm"
                  placeholder="••••••••"
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-outline">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl bg-surface-container/60 border border-border-subtle focus:bg-surface focus:outline-none focus:border-secondary text-sm"
                  placeholder="player@example.com"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-outline">Username</label>
                  <span className="text-[10px] text-outline">letters, numbers, _ or -</span>
                </div>
                <input
                  type="text"
                  required
                  pattern="^[a-zA-Z0-9_-]+$"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl bg-surface-container/60 border border-border-subtle focus:bg-surface focus:outline-none focus:border-secondary text-sm"
                  placeholder="choose_a_username"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-outline">Surname (Display Name)</label>
                <input
                  type="text"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl bg-surface-container/60 border border-border-subtle focus:bg-surface focus:outline-none focus:border-secondary text-sm"
                  placeholder="e.g. Mwamburi"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-outline">Password (min 10 characters)</label>
                <input
                  type="password"
                  required
                  minLength={10}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl bg-surface-container/60 border border-border-subtle focus:bg-surface focus:outline-none focus:border-secondary text-sm"
                  placeholder="••••••••"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full py-3 mt-2 rounded-xl text-sm font-semibold shadow-md disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Authenticating...' : tab === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="flex items-center gap-3 text-[10px] text-outline" aria-hidden="true">
          <span className="h-px flex-1 bg-border-subtle" />
          <span>OR CONTINUE WITH</span>
          <span className="h-px flex-1 bg-border-subtle" />
        </div>
        <GoogleSignInButton
          onCredential={handleGoogleCredential}
          onLoadError={setError}
        />

        {/* Security / Privacy notice */}
        <p className="text-[10px] text-center text-outline">
          Protected with an HttpOnly session cookie and CSRF checks. Your sign-in token is not stored in browser JavaScript storage.
        </p>
      </div>
    </div>
  );
}

