import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { api } from '../services/apiClient.js';
import { StorageManager } from '../engine/core/Storage.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [avatarImage, setAvatarImage] = useState(null);
  const avatarImageUrlRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [guestSurname, setGuestSurname] = useState('');
  const [storage] = useState(() => new StorageManager());
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [migrationPrompt, setMigrationPrompt] = useState(false);
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'syncing' | 'synced' | 'error'
  const [privateDataSyncStatus, setPrivateDataSyncStatus] = useState('idle'); // 'idle' | 'syncing' | 'synced' | 'error'
  const [storagePersistenceStatus, setStoragePersistenceStatus] = useState(() => storage.getPersistenceStatus());
  const privateSyncQueueRef = useRef(Promise.resolve());

  // Settings state (defaults to local storage, overwritten by user account when logged in)
  const [settings, setSettings] = useState(() => storage.getSettings());

  const replaceAvatarImage = (blob) => {
    if (avatarImageUrlRef.current) URL.revokeObjectURL(avatarImageUrlRef.current);
    const nextUrl = blob ? URL.createObjectURL(blob) : null;
    avatarImageUrlRef.current = nextUrl;
    setAvatarImage(nextUrl);
  };

  const loadAvatarImage = async (userData) => {
    if (!userData?.has_avatar) {
      replaceAvatarImage(null);
      return;
    }
    try {
      const image = await api.getAvatar();
      replaceAvatarImage(image);
    } catch (error) {
      console.warn('Could not load account profile image:', error.message);
    }
  };

  const syncPrivateDataNow = async () => {
    setPrivateDataSyncStatus('syncing');
    const sync = async () => {
      const remote = await api.syncPrivateData(storage.exportPrivateData());
      storage.mergePrivateData(remote);
    };
    const queuedSync = privateSyncQueueRef.current.then(sync, sync);
    privateSyncQueueRef.current = queuedSync.catch(() => {});
    try {
      await queuedSync;
      setPrivateDataSyncStatus('synced');
    } catch (error) {
      setPrivateDataSyncStatus('error');
      throw error;
    }
  };

  const applyAccount = async (userData) => {
    setUser(userData);
    await loadAvatarImage(userData);
    const accountSettings = {
      soundMuted: userData.sound_muted,
      hapticsEnabled: userData.haptics_enabled,
      ambientEnabled: userData.ambient_enabled,
      spotifyUri: userData.spotify_uri || '',
      privateSyncEnabled: Boolean(userData.private_sync_enabled),
    };
    setSettings(accountSettings);
    storage.updateSettings(accountSettings);
    if (accountSettings.privateSyncEnabled) {
      try {
        const privateData = await api.getPrivateData();
        storage.mergePrivateData(privateData);
        await syncPrivateDataNow();
      } catch (error) {
        setPrivateDataSyncStatus('error');
        console.warn('Could not sync private account data:', error.message);
      }
    } else {
      setPrivateDataSyncStatus('idle');
    }
  };

  useEffect(() => () => {
    if (avatarImageUrlRef.current) URL.revokeObjectURL(avatarImageUrlRef.current);
  }, []);

  useEffect(() => {
    const refreshStorageStatus = (event) => {
      setStoragePersistenceStatus(event.detail?.status || storage.getPersistenceStatus());
    };
    window.addEventListener('chemsha-storage-persistence', refreshStorageStatus);
    return () => window.removeEventListener('chemsha-storage-persistence', refreshStorageStatus);
  }, [storage]);

  useEffect(() => {
    if (!user || !settings.privateSyncEnabled) return undefined;
    let timer;
    let retryTimer;
    let retryAttempt = 0;
    let active = true;
    const retryDelays = [2000, 5000, 15000];
    const attemptSync = () => {
      syncPrivateDataNow()
        .then(() => { retryAttempt = 0; })
        .catch((error) => {
          console.warn('Private account sync failed:', error.message);
          if (active && retryAttempt < retryDelays.length) {
            retryTimer = setTimeout(attemptSync, retryDelays[retryAttempt]);
            retryAttempt += 1;
          }
        });
    };
    const sync = () => {
      clearTimeout(timer);
      clearTimeout(retryTimer);
      retryAttempt = 0;
      setPrivateDataSyncStatus('syncing');
      timer = setTimeout(attemptSync, 700);
    };
    window.addEventListener('chemsha-storage-update', sync);
    return () => {
      active = false;
      clearTimeout(timer);
      clearTimeout(retryTimer);
      window.removeEventListener('chemsha-storage-update', sync);
    };
  }, [user, settings.privateSyncEnabled, storage]);

  useEffect(() => {
    // 1. Load local guest surname & settings
    const localName = storage.getSurname();
    setGuestSurname(localName || 'Player');
    setSettings(storage.getSettings());

    // 2. Check server session
    api.getMe()
      .then(async (userData) => {
        if (userData) {
          await applyAccount(userData);

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
    if (userData) await applyAccount(userData);
    setShowAuthModal(false);

    // Prompt for migration if local data exists and hasn't been merged
    const localTotals = storage.getTotals();
    if (localTotals.gamesPlayed > 0 && !storage.isMigrated()) {
      setMigrationPrompt(true);
    }
    return res;
  };

  const loginWithGoogle = async (credential, profile = {}) => {
    const res = await api.loginWithGoogle(credential, profile);
    if (res.registration_required) return res;
    const userData = await api.getMe();
    if (userData) await applyAccount(userData);
    setShowAuthModal(false);

    const localTotals = storage.getTotals();
    if (localTotals.gamesPlayed > 0 && !storage.isMigrated()) {
      setMigrationPrompt(true);
    }
    return res;
  };

  const linkGoogleAccount = async (credential) => {
    await api.linkGoogleAccount(credential);
    setUser((prev) => prev ? ({ ...prev, google_connected: true }) : prev);
  };

  const register = async ({ email, username, password, surname }) => {
    const effectiveSurname = surname || guestSurname || '';
    const res = await api.register({ email, username, password, surname: effectiveSurname });
    const userData = await api.getMe();
    if (userData) await applyAccount(userData);
    setShowAuthModal(false);

    // Automatically trigger migration of guest data for new account
    const localData = storage.load();
    if (localData && localData.totals && localData.totals.gamesPlayed > 0) {
      try {
        await api.migrateLocalStorage(localData);
        storage.markMigrated();
      } catch (e) {
        console.warn('Auto migration error:', e);
      }
    }
    return res;
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    replaceAvatarImage(null);
    storage.updateSettings({ privateSyncEnabled: false });
    setSettings(storage.getSettings());
    setPrivateDataSyncStatus('idle');
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
        has_avatar: res.has_avatar,
      }));
      return res;
    }
  };

  const uploadAvatar = async (file) => {
    if (!user) throw new Error('Sign in to save a profile image to your account.');
    await api.uploadAvatar(file);
    const image = await api.getAvatar();
    replaceAvatarImage(image);
    setUser((prev) => ({ ...prev, has_avatar: true }));
  };

  const removeAvatar = async () => {
    if (!user) return;
    await api.deleteAvatar();
    replaceAvatarImage(null);
    setUser((prev) => ({ ...prev, has_avatar: false }));
  };

  const updateSettings = async (partial) => {
    // 1. Update React state
    setSettings((prev) => {
      const updated = { ...prev };
      if (partial.sound_muted !== undefined) updated.soundMuted = partial.sound_muted;
      if (partial.haptics_enabled !== undefined) updated.hapticsEnabled = partial.haptics_enabled;
      if (partial.ambient_enabled !== undefined) updated.ambientEnabled = partial.ambient_enabled;
      if (partial.spotify_uri !== undefined) updated.spotifyUri = partial.spotify_uri || '';
      if (partial.private_sync_enabled !== undefined) updated.privateSyncEnabled = partial.private_sync_enabled;
      return updated;
    });

    if (partial.private_sync_enabled !== undefined && !user) {
      setSettings((prev) => ({ ...prev, privateSyncEnabled: false }));
      throw new Error('Sign in to enable private account sync.');
    }

    // 2. Update local storage fallback
    const localPartial = {};
    if (partial.sound_muted !== undefined) localPartial.soundMuted = partial.sound_muted;
    if (partial.haptics_enabled !== undefined) localPartial.hapticsEnabled = partial.haptics_enabled;
    if (partial.spotify_uri !== undefined) localPartial.spotifyUri = partial.spotify_uri || '';
    if (partial.private_sync_enabled !== undefined) localPartial.privateSyncEnabled = partial.private_sync_enabled;
    storage.updateSettings(localPartial);

    // 3. Persist to backend if authenticated
    if (user) {
      let serverPreferenceSaved = false;
      try {
        await api.updateSettings(partial);
        serverPreferenceSaved = true;
        setUser((prev) => ({
          ...prev,
          ...(partial.sound_muted !== undefined ? { sound_muted: partial.sound_muted } : {}),
          ...(partial.haptics_enabled !== undefined ? { haptics_enabled: partial.haptics_enabled } : {}),
          ...(partial.ambient_enabled !== undefined ? { ambient_enabled: partial.ambient_enabled } : {}),
          ...(partial.spotify_uri !== undefined ? { spotify_uri: partial.spotify_uri || null } : {}),
          ...(partial.private_sync_enabled !== undefined ? { private_sync_enabled: partial.private_sync_enabled } : {}),
        }));
        if (partial.private_sync_enabled === true) {
          const remote = await api.getPrivateData();
          storage.mergePrivateData(remote);
          await syncPrivateDataNow();
        } else if (partial.private_sync_enabled === false) {
          await api.deletePrivateData();
          setPrivateDataSyncStatus('idle');
        }
      } catch (e) {
        console.warn('Failed to update account settings on server:', e);
        if (partial.private_sync_enabled !== undefined) {
          const persistedValue = serverPreferenceSaved
            ? partial.private_sync_enabled
            : Boolean(user.private_sync_enabled);
          setSettings((prev) => ({ ...prev, privateSyncEnabled: persistedValue }));
          storage.updateSettings({ privateSyncEnabled: persistedValue });
        }
        if (partial.spotify_uri !== undefined || partial.private_sync_enabled !== undefined) throw e;
      }
    }
  };

  const updateLocalSettings = (partial) => {
    storage.updateSettings(partial);
    setSettings({ ...storage.getSettings() });
  };

  const retryPrivateDataSync = async () => {
    if (!user || !settings.privateSyncEnabled) return;
    await syncPrivateDataNow();
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
    avatarImage,
    settings,
    storage,
    showAuthModal,
    setShowAuthModal,
    migrationPrompt,
    syncStatus,
    privateDataSyncStatus,
    retryPrivateDataSync,
    storagePersistenceStatus,
    syncLocalData,
    handleMigrate,
    dismissMigration,
    login,
    loginWithGoogle,
    linkGoogleAccount,
    register,
    logout,
    updateProfile,
    uploadAvatar,
    removeAvatar,
    updateSettings,
    updateLocalSettings,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
