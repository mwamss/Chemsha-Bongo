/**
 * apiClient.js
 * Centralized HTTP client communicating with the Chemsha Bongo FastAPI backend.
 * Uses both Bearer tokens (via localStorage for resilient cross-device / mobile session persistence)
 * and HttpOnly cookies with CSRF header injection as a dual-layer strategy.
 */

const API_BASE = '/api/v1';
const TOKEN_KEY = 'chemsha_auth_token';
const CSRF_KEY = 'chemsha_csrf_token';

class ApiClient {
  constructor() {
    this.authToken = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
    this.csrfToken = typeof window !== 'undefined' ? localStorage.getItem(CSRF_KEY) : null;
    this.currentUser = null;
  }

  setAuthToken(token) {
    this.authToken = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    }
  }

  setCsrfToken(token) {
    this.csrfToken = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem(CSRF_KEY, token);
      } else {
        localStorage.removeItem(CSRF_KEY);
      }
    }
  }

  clearTokens() {
    this.authToken = null;
    this.csrfToken = null;
    this.currentUser = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(CSRF_KEY);
    }
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const { responseType, ...requestOptions } = options;
    const isFormData = typeof FormData !== 'undefined' && requestOptions.body instanceof FormData;
    const headers = {
      ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(requestOptions.headers || {}),
    };

    // Attach Bearer token for cross-origin and mobile resilience
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    // Attach CSRF token on state-changing requests if present
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes((options.method || 'GET').toUpperCase())) {
      if (this.csrfToken) {
        headers['X-CSRF-Token'] = this.csrfToken;
      }
    }

    const config = {
      ...requestOptions,
      headers,
      credentials: 'include', // Essential for sending/receiving HttpOnly cookies
    };

    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        let errorMsg = `Request failed with status ${response.status}`;
        if (typeof data.detail === 'string') {
          errorMsg = data.detail;
        } else if (Array.isArray(data.detail) && data.detail.length > 0) {
          errorMsg = data.detail.map((err) => err.msg || JSON.stringify(err)).join(', ');
        }
        throw new Error(errorMsg);
      }

      if (responseType === 'blob') return response.blob();
      if (response.status === 204) return null;
      const data = await response.json().catch(() => ({}));
      return data;
    } catch (err) {
      console.warn(`API Error [${options.method || 'GET'} ${endpoint}]:`, err.message);
      throw err;
    }
  }

  // --- Auth & Session ---

  async register({ email, username, password, surname }) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, username, password, surname }),
    });
    if (data.access_token) this.setAuthToken(data.access_token);
    if (data.csrf_token) this.setCsrfToken(data.csrf_token);
    this.currentUser = data;
    return data;
  }

  async login(username_or_email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username_or_email, password }),
    });
    if (data.access_token) this.setAuthToken(data.access_token);
    if (data.csrf_token) this.setCsrfToken(data.csrf_token);
    this.currentUser = data;
    return data;
  }

  async loginWithGoogle(credential) {
    const data = await this.request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    });
    if (data.access_token) this.setAuthToken(data.access_token);
    if (data.csrf_token) this.setCsrfToken(data.csrf_token);
    this.currentUser = data;
    return data;
  }

  async linkGoogleAccount(credential) {
    return this.request('/auth/google/link', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    });
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch (e) {
      console.warn('Backend logout notification skipped:', e);
    }
    this.clearTokens();
  }

  async getMe() {
    try {
      const data = await this.request('/auth/me');
      if (data.csrf_token) this.setCsrfToken(data.csrf_token);
      this.currentUser = data;
      return data;
    } catch (err) {
      if (err.message && (err.message.includes('401') || err.message.toLowerCase().includes('authentication required'))) {
        this.clearTokens();
      }
      this.currentUser = null;
      return null;
    }
  }

  // --- Profile & Preferences ---

  async updateProfile({ surname, display_name, avatar_color }) {
    return this.request('/users/profile', {
      method: 'PATCH',
      body: JSON.stringify({ surname, display_name, avatar_color }),
    });
  }

  async uploadAvatar(file) {
    const body = new FormData();
    body.append('file', file);
    return this.request('/users/profile/avatar', { method: 'PUT', body });
  }

  async getAvatar() {
    return this.request('/users/profile/avatar', { responseType: 'blob' });
  }

  async deleteAvatar() {
    return this.request('/users/profile/avatar', { method: 'DELETE' });
  }

  async updateSettings({ sound_muted, haptics_enabled, ambient_enabled, spotify_uri }) {
    return this.request('/users/settings', {
      method: 'PATCH',
      body: JSON.stringify({ sound_muted, haptics_enabled, ambient_enabled, spotify_uri }),
    });
  }

  // --- Game Engine Data ---

  async getGames() {
    return this.request('/games');
  }

  async recordGameSession(sessionPayload) {
    return this.request('/sessions/game', {
      method: 'POST',
      body: JSON.stringify(sessionPayload),
    });
  }

  async recordDailyBlitz(blitzPayload) {
    return this.request('/sessions/blitz', {
      method: 'POST',
      body: JSON.stringify(blitzPayload),
    });
  }

  async getStatsSummary() {
    return this.request('/statistics/summary');
  }

  async getGameLeaderboard(gameId) {
    return this.request(`/leaderboard/game/${gameId}`);
  }

  async getDailyBlitzLeaderboard(challengeDate = null) {
    const query = challengeDate ? `?challenge_date=${challengeDate}` : '';
    return this.request(`/leaderboard/blitz${query}`);
  }

  async migrateLocalStorage(localStorageData) {
    return this.request('/sync/migrate-local', {
      method: 'POST',
      body: JSON.stringify(localStorageData),
    });
  }

  // --- Inspirational Quotes ---

  async getRandomQuote(exclude = '') {
    const params = new URLSearchParams({ _t: Date.now() });
    if (exclude) params.append('exclude', exclude);
    return this.request(`/quotes/random?${params.toString()}`);
  }

  async getDailyQuote() {
    return this.request('/quotes/daily');
  }

  async getAllAphorisms() {
    return this.request('/quotes/all');
  }

  // --- Reflection & Mental Check-In Questions ---

  async getReflectionMetadata() {
    return this.request('/reflections/metadata');
  }

  async getReflectionCategories() {
    return this.request('/reflections/categories');
  }

  async getDailyReflection() {
    return this.request('/reflections/daily');
  }

  async getRandomReflection(category = null, excludeId = null) {
    const params = new URLSearchParams({ _t: Date.now() });
    if (category) params.append('category', category);
    if (excludeId !== null) params.append('exclude_id', excludeId);
    return this.request(`/reflections/random?${params.toString()}`);
  }

  async getAllReflections(category = null) {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/reflections/all${queryString}`);
  }
}

export const api = new ApiClient();

