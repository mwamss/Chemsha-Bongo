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
      className="suite-bottom-nav fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-xl border-t border-border-subtle pb-safe md:hidden select-none"
    >
      <div className="flex items-center justify-around h-[4.25rem] max-w-xl mx-auto px-2">
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
                className={`w-12 h-8 rounded-full flex items-center justify-center transition-colors ${
                  isActive
                    ? 'bg-[#1e3a34] text-[#e8f2ed]'
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
              <span className="text-[10px] tracking-tight mt-1 leading-none">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

