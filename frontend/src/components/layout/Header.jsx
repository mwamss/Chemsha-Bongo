import React from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAudio } from '../../context/AudioContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';

export function Header({ onOpenSidebar, onNavigate }) {
  const { displayName, avatarInitial, avatarColor, avatarImage, isAuthenticated, setShowAuthModal } = useAuth();
  const { muted, toggleMute, playClick } = useAudio();
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="fixed top-0 w-full z-50 bg-surface/85 backdrop-blur-xl pt-safe shadow-[0_1px_8px_rgba(0,0,0,0.03)] border-b border-border-subtle/30">
      <div className="h-16 px-4 md:px-8 flex items-center justify-between w-full max-w-6xl mx-auto">
        {/* Left: Brand & Sidebar Trigger */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => { playClick(); onOpenSidebar(); }}
            className="flex items-center gap-2 p-1.5 -ml-1.5 rounded-xl hover:bg-surface-container/60 transition-all cursor-pointer group"
            title="Open Menu"
          >
            <img
              src="/assets/chemsha-bongo-logo.png"
              alt="Chemsha Bongo Logo"
              className="w-8 h-8 object-contain drop-shadow-sm group-hover:scale-105 transition-transform"
            />
            <div className="flex flex-col text-left">
              <span className="font-headline-md text-base font-bold text-on-surface leading-tight tracking-tight">
                Chemsha Bongo
              </span>
              <span className="text-[10px] text-secondary font-medium tracking-wide uppercase">
                Mindful Brain Suite
              </span>
            </div>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          {/* Theme Mode Toggle (Obsidian Dark / Mint Light) */}
          <button
            onClick={() => { playClick(); toggleTheme(); }}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-all cursor-pointer"
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
            className="w-10 h-10 rounded-xl flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-all cursor-pointer"
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
              title={`Account & Settings (${displayName})`}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white shadow-sm overflow-hidden"
                style={{ backgroundColor: avatarColor }}
              >
                {avatarImage ? <img src={avatarImage} alt="" className="w-full h-full object-cover" /> : avatarInitial}
              </div>
            </button>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="btn btn-secondary px-3.5 py-1.5 min-h-[38px] text-xs font-semibold rounded-xl cursor-pointer"
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
