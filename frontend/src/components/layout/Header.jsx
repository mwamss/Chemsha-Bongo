import React from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAudio } from '../../context/AudioContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { BrandIcon } from '../BrandIcon.jsx';

export function Header({ onOpenSidebar, onNavigate }) {
  const { displayName, avatarInitial, avatarColor, avatarImage, isAuthenticated, setShowAuthModal } = useAuth();
  const { muted, toggleMute, playClick } = useAudio();
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="suite-header fixed top-0 w-full z-50 bg-surface/95 backdrop-blur-xl pt-safe border-b border-border-subtle">
      <div className="h-16 px-3 min-[400px]:px-4 sm:px-6 lg:px-10 2xl:px-12 flex items-center justify-between gap-1 w-full mx-auto">
        {/* Left: Brand & Sidebar Trigger */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => { playClick(); onOpenSidebar(); }}
            className="flex items-center gap-1.5 min-[400px]:gap-2.5 p-1 -ml-1 min-w-0 rounded-lg hover:bg-surface-container/60 transition-colors cursor-pointer group"
            title="Open Menu"
          >
            <BrandIcon className="w-9 h-9 min-[400px]:w-11 min-[400px]:h-11 shrink-0" />
            <div className="flex min-w-0 flex-col text-left">
              <span className="font-headline-md text-[14px] min-[400px]:text-[17px] font-bold text-on-surface leading-tight tracking-tight whitespace-nowrap">
                Chemsha Bongo
              </span>
              <span className="hidden min-[360px]:block text-[9px] min-[400px]:text-[10px] text-secondary font-semibold tracking-[0.07em] min-[400px]:tracking-[0.09em] uppercase whitespace-nowrap">
                Mindful Brain Suite
              </span>
            </div>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex shrink-0 items-center gap-0.5 min-[400px]:gap-2.5">
          {/* Theme Mode Toggle (Obsidian Dark / Mint Light) */}
          <button
            onClick={() => { playClick(); toggleTheme(); }}
            className="header-icon-button w-8 h-8 min-[400px]:w-10 min-[400px]:h-10 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
            title={isDark ? "Switch to Light Mode (Mint Alabaster)" : "Switch to Dark Mode (Obsidian Sanctuary)"}
            aria-label="Toggle theme mode"
          >
            <span className="material-symbols-outlined text-[20px]">
              {isDark ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

          {/* Audio Mute Toggle */}
          <button
            onClick={toggleMute}
            className="header-icon-button w-8 h-8 min-[400px]:w-10 min-[400px]:h-10 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
            title={muted ? "Unmute Sound" : "Mute Sound"}
          >
            <span className="material-symbols-outlined text-[20px]">
              {muted ? 'volume_off' : 'volume_up'}
            </span>
          </button>

          {/* Profile Avatar / Login Button */}
          {isAuthenticated ? (
            <button
              onClick={() => { playClick(); onNavigate('profile'); }}
              className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-secondary/40 transition-all cursor-pointer"
              title={`Profile (${displayName})`}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white overflow-hidden"
                style={{ backgroundColor: avatarColor }}
              >
                {avatarImage ? <img src={avatarImage} alt="" className="w-full h-full object-cover" /> : avatarInitial}
              </div>
            </button>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
            aria-label="Sign in"
            title="Sign in"
              className="btn btn-secondary px-2 min-[400px]:px-3.5 py-1 min-[400px]:py-1.5 min-h-[34px] min-[400px]:min-h-[38px] text-[11px] min-[400px]:text-xs font-semibold rounded-lg cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">login</span>
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
