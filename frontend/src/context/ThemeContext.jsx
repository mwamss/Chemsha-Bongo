import React, { createContext, useContext, useState, useEffect } from 'react';
import { StorageManager } from '../engine/core/Storage.js';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      const saved = localStorage.getItem('chemsha_bongo_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      const sm = new StorageManager();
      const settings = sm.getSettings();
      if (settings?.theme === 'dark' || settings?.theme === 'light') {
        return settings.theme;
      }
    } catch (e) {
      // Fallback
    }
    // Default to 'dark' for the Obsidian Sanctuary suite
    return 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Set mobile browser theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#0a0f0d' : '#1e3a34');
    }

    try {
      localStorage.setItem('chemsha_bongo_theme', theme);
      const sm = new StorageManager();
      sm.updateSettings({ theme });
    } catch (e) {}
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setTheme = (newTheme) => {
    if (newTheme === 'dark' || newTheme === 'light') {
      setThemeState(newTheme);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

