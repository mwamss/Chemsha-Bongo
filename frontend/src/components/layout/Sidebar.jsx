import React from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAudio } from '../../context/AudioContext.jsx';
import { GentleRhythmSidebarWidget } from '../rhythm/GentleRhythmTracker.jsx';

export function Sidebar({ isOpen, onClose, currentScreen, onNavigate }) {
  const { displayName, avatarInitial, avatarColor, avatarImage, isAuthenticated, logout, setShowAuthModal } = useAuth();
  const { playClick, ambientPlaying, toggleAmbient } = useAudio();

  if (!isOpen) return null;

  const handleNav = (screen) => {
    playClick();
    onNavigate(screen);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-[60] bg-primary/20 dark:bg-black/65 backdrop-blur-[2px] transition-opacity"
        aria-hidden="true"
      />

      {/* Slide-in Drawer */}
      <aside className="fixed top-0 left-0 h-full w-72 z-[70] flex flex-col bg-surface border-r border-border-subtle/40 shadow-2xl pt-safe transition-transform duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-border-subtle/30 shrink-0">
          <div className="flex items-center gap-2.5">
            <img src="/assets/chemsha-bongo-logo.png" alt="Chemsha Bongo" className="h-7 w-7 object-contain" />
            <span className="font-headline-md text-base text-on-surface font-bold">Menu</span>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
            aria-label="Close menu"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex flex-col flex-1 overflow-y-auto px-4 py-5 gap-5">
          {/* Profile Card */}
          <section className="flex flex-col gap-1">
            <button
              onClick={() => handleNav('profile')}
              className="flex items-center gap-3 p-3 rounded-2xl bg-surface-container border border-border-subtle/40 hover:bg-surface-container-high transition-colors text-left cursor-pointer group"
              title="Open Account & Settings"
            >
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-base text-white shadow-sm shrink-0 group-hover:scale-105 transition-transform overflow-hidden"
                style={{ backgroundColor: avatarColor }}
              >
                {avatarImage ? <img src={avatarImage} alt="" className="w-full h-full object-cover" /> : avatarInitial}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-headline-md text-sm text-on-surface font-semibold truncate group-hover:text-primary">
                  {displayName}
                </span>
                <span className="text-[11px] text-secondary uppercase tracking-wider font-medium">
                  {isAuthenticated ? 'Cloud Synced' : 'Guest Account'}
                </span>
              </div>
              <span className="material-symbols-outlined text-outline text-[18px]">chevron_right</span>
            </button>
          </section>

          {/* Gentle Rhythm Sidebar Widget (Section 2 from Stitch Redesign) */}
          <section className="flex flex-col gap-1">
            <GentleRhythmSidebarWidget />
          </section>

          {/* Navigation */}
          <section className="flex flex-col gap-1">
            <p className="text-[10px] text-outline uppercase tracking-widest px-1 mb-1 font-semibold">Navigate</p>
            <nav className="flex flex-col gap-1">
              <button
                onClick={() => handleNav('home')}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                  currentScreen === 'home'
                    ? 'bg-secondary text-white font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">spa</span>
                <span className="text-sm">Today</span>
              </button>

              <button
                onClick={() => handleNav('select')}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                  currentScreen === 'select'
                    ? 'bg-secondary text-white font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">grid_view</span>
                <span className="text-sm">Exercises</span>
              </button>

              <button
                onClick={() => handleNav('stats')}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                  currentScreen === 'stats'
                    ? 'bg-secondary text-white font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">water_drop</span>
                <span className="text-sm">Insights &amp; Stats</span>
              </button>

              <button
                onClick={() => handleNav('leaderboard')}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                  currentScreen === 'leaderboard'
                    ? 'bg-secondary text-white font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">leaderboard</span>
                <span className="text-sm">Leaderboards</span>
              </button>

              <button
                onClick={() => handleNav('quotes')}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                  currentScreen === 'quotes'
                    ? 'bg-secondary text-white font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">format_quote</span>
                <span className="text-sm">Wisdom &amp; Quotes</span>
              </button>

              <button
                onClick={() => handleNav('banja')}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                  currentScreen === 'banja'
                    ? 'bg-secondary text-white font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">auto_stories</span>
                <div className="flex flex-col leading-tight">
                  <span className="text-sm">Banja</span>
                  <span className={`text-[10px] ${currentScreen === 'banja' ? 'text-white/80' : 'text-outline'} font-normal`}>Writing Sanctuary</span>
                </div>
              </button>

              <button
                onClick={() => handleNav('profile')}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                  currentScreen === 'profile'
                    ? 'bg-secondary text-white font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">tune</span>
                <span className="text-sm">Account &amp; Settings</span>
              </button>
            </nav>
          </section>

          {/* Calming Ambient Sound Toggle */}
          <section className="flex flex-col gap-1">
            <p className="text-[10px] text-outline uppercase tracking-widest px-1 mb-1 font-semibold">Sanctuary</p>
            <button
              onClick={toggleAmbient}
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-surface-container/50 border border-border-subtle/30 hover:bg-surface-container text-left transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[20px] text-secondary">self_improvement</span>
                <span className="text-sm font-medium text-on-surface">Ambient Drone</span>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                ambientPlaying ? 'bg-secondary text-white' : 'bg-surface text-outline'
              }`}>
                {ambientPlaying ? 'Active' : 'Off'}
              </span>
            </button>
          </section>
        </div>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-border-subtle/30 flex flex-col gap-2 shrink-0">
          <button
            onClick={() => handleNav('profile')}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all text-left text-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px] text-secondary">manage_accounts</span>
            <span>Profile &amp; Settings</span>
          </button>

          {/* Auth Action */}
          {isAuthenticated ? (
            <button
              onClick={() => { logout(); onClose(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 transition-all text-left text-sm font-medium cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              onClick={() => { setShowAuthModal(true); onClose(); }}
              className="btn btn-primary w-full text-xs py-2 min-h-[38px] cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">login</span>
              <span>Sign In / Create Account</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
