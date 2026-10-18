import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/apiClient.js';
import { StorageManager } from '../engine/core/Storage.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guestSurname, setGuestSurname] = useState('');
  const [storage] = useState(() => new StorageManager());
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [migrationPrompt, setMigrationPrompt] = useState(false);
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'syncing' | 'synced' | 'error'

  // Settings state (defaults to local storage, overwritten by user account when logged in)
  const [settings, setSettings] = useState(() => storage.getSettings());

  useEffect(() => {
    // 1. Load local guest surname & settings
    const localName = storage.getSurname();
    setGuestSurname(localName || 'Player');
    setSettings(storage.getSettings());

    // 2. Check server session
    api.getMe()
      .then((userData) => {
        if (userData) {
          setUser(userData);
          // Apply account settings
          setSettings({
            soundMuted: userData.sound_muted,
            hapticsEnabled: userData.haptics_enabled,
            ambientEnabled: userData.ambient_enabled,
          });
          storage.updateSettings({
            soundMuted: userData.sound_muted,
            hapticsEnabled: userData.haptics_enabled,
          });

          // Check if local guest data exists that can be merged
          const localTotals = storage.getTotals();
          if (localTotals.gamesPlayed > 0 && !storage.isMigrated()) {
            setMigrationPrompt(true);
          }
        }
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (usernameOrEmail, password) => {
    const res = await api.login(usernameOrEmail, password);
    const userData = await api.getMe();
    if (userData) {
      setUser(userData);
      setSettings({
        soundMuted: userData.sound_muted,
        hapticsEnabled: userData.haptics_enabled,
        ambientEnabled: userData.ambient_enabled,
      });
      storage.updateSettings({
        soundMuted: userData.sound_muted,
        hapticsEnabled: userData.haptics_enabled,
      });
    }
    setShowAuthModal(false);

    // Prompt for migration if local data exists and hasn't been merged
    const localTotals = storage.getTotals();
    if (localTotals.gamesPlayed > 0 && !storage.isMigrated()) {
      setMigrationPrompt(true);
    }
    return res;
  };

  const register = async ({ email, username, password, surname }) => {
    const effectiveSurname = surname || guestSurname || '';
    const res = await api.register({ email, username, password, surname: effectiveSurname });
    const userData = await api.getMe();
    if (userData) {
      setUser(userData);
      setSettings({
        soundMuted: userData.sound_muted,
        hapticsEnabled: userData.haptics_enabled,
        ambientEnabled: userData.ambient_enabled,
      });
    }
    setShowAuthModal(false);

    // Automatically trigger migration of guest data for new account
    const localData = storage.load();
    if (localData && localData.totals && localData.totals.gamesPlayed > 0) {
      try {
        await api.migrateLocalStorage(localData);
      } catch (e) {
        console.warn('Auto migration error:', e);
      }
    }
    return res;
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    setSettings(storage.getSettings());
  };

  const updateProfile = async ({ surname, display_name, avatar_color }) => {
    if (surname !== undefined) {
      const trimmed = surname.trim();
      storage.setSurname(trimmed);
      setGuestSurname(trimmed || 'Player');
    }

    if (user) {
      const res = await api.updateProfile({ surname, display_name, avatar_color });
      setUser((prev) => ({
        ...prev,
        surname: res.surname,
        display_name: res.display_name,
        avatar_color: res.avatar_color,
      }));
      return res;
    }
  };

  const updateSettings = async (partial) => {
    // 1. Update React state
    setSettings((prev) => {
      const updated = { ...prev };
      if (partial.sound_muted !== undefined) updated.soundMuted = partial.sound_muted;
      if (partial.haptics_enabled !== undefined) updated.hapticsEnabled = partial.haptics_enabled;
      if (partial.ambient_enabled !== undefined) updated.ambientEnabled = partial.ambient_enabled;
      return updated;
    });

    // 2. Update local storage fallback
    const localPartial = {};
    if (partial.sound_muted !== undefined) localPartial.soundMuted = partial.sound_muted;
    if (partial.haptics_enabled !== undefined) localPartial.hapticsEnabled = partial.haptics_enabled;
    storage.updateSettings(localPartial);

    // 3. Persist to backend if authenticated
    if (user) {
      try {
        await api.updateSettings(partial);
        setUser((prev) => ({
          ...prev,
          ...(partial.sound_muted !== undefined ? { sound_muted: partial.sound_muted } : {}),
          ...(partial.haptics_enabled !== undefined ? { haptics_enabled: partial.haptics_enabled } : {}),
          ...(partial.ambient_enabled !== undefined ? { ambient_enabled: partial.ambient_enabled } : {}),
        }));
      } catch (e) {
        console.warn('Failed to update account settings on server:', e);
      }
    }
  };

  const handleMigrate = async () => {
    setSyncStatus('syncing');
    const localData = storage.load();
    try {
      const res = await api.migrateLocalStorage(localData);
      storage.markMigrated();
      setSyncStatus('synced');
      setMigrationPrompt(false);

      // Refresh account details from backend to reflect newly merged high scores & stats
      const updatedUser = await api.getMe();
      if (updatedUser) {
        setUser(updatedUser);
      }

      setTimeout(() => setSyncStatus('idle'), 3000);
      return res;
    } catch (e) {
      console.warn('Migration error:', e);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
      throw e;
    }
  };

  const syncLocalData = handleMigrate;

  const dismissMigration = () => {
    setMigrationPrompt(false);
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    displayName: user ? (user.surname || user.username) : guestSurname,
    username: user ? user.username : 'guest',
    email: user ? user.email : '',
    avatarInitial: (user ? (user.surname || user.username) : guestSurname).charAt(0).toUpperCase() || 'P',
    avatarColor: user ? user.avatar_color : '#1e3a34',
    settings,
    storage,
    showAuthModal,
    setShowAuthModal,
    migrationPrompt,
    syncStatus,
    syncLocalData,
    handleMigrate,
    dismissMigration,
    login,
    register,
    logout,
    updateProfile,
    updateSettings,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
