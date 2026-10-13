import React from 'react';
import { useAudio } from '../../context/AudioContext.jsx';

export function BottomNav({ currentScreen, onNavigate }) {
  const { playClick } = useAudio();

  const navItems = [
    {
      id: 'home',
      label: 'Today',
      icon: 'spa',
    },
    {
      id: 'select',
      label: 'Games',
      icon: 'sports_esports',
    },
    {
      id: 'quotes',
      label: 'Quotes',
      icon: 'format_quote',
    },
    {
      id: 'leaderboard',
      label: 'Ranks',
      icon: 'leaderboard',
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: 'account_circle',
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-surface/90 backdrop-blur-xl border-t border-border-subtle/50 pb-safe md:hidden shadow-[0_-4px_20px_rgba(6,36,31,0.06)] select-none transition-all"
    >
      <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
        {navItems.map((item) => {
          const isActive = currentScreen === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                playClick();
                onNavigate(item.id);
              }}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 transition-all active:scale-90 cursor-pointer min-h-[48px] ${
                isActive
                  ? 'text-primary font-bold'
                  : 'text-on-surface-variant hover:text-on-surface font-medium'
              }`}
            >
              <div
                className={`w-12 h-7 rounded-full flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-secondary-container text-on-secondary-container shadow-2xs scale-105'
                    : 'bg-transparent text-inherit'
                }`}
              >
                <span
                  className="material-symbols-outlined text-[21px]"
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  {item.icon}
                </span>
              </div>
              <span className="text-[10px] tracking-tight mt-0.5 leading-none">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

