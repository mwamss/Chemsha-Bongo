/**
 * apiClient.js
 * Centralized HTTP client communicating with the Chemsha Bongo FastAPI backend.
 * Uses credentials: 'include' for HttpOnly cookie authentication and automatic CSRF header injection.
 */

const API_BASE = '/api/v1';

class ApiClient {
  constructor() {
    this.csrfToken = null;
    this.currentUser = null;
  }

  setCsrfToken(token) {
    this.csrfToken = token;
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    // Attach CSRF token on state-changing requests if present
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes((options.method || 'GET').toUpperCase())) {
      if (this.csrfToken) {
        headers['X-CSRF-Token'] = this.csrfToken;
      }
    }

    const config = {
      ...options,
      headers,
      credentials: 'include', // Essential for sending/receiving HttpOnly cookies
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = data.detail || `Request failed with status ${response.status}`;
        throw new Error(errorMsg);
      }

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
    if (data.csrf_token) this.setCsrfToken(data.csrf_token);
    this.currentUser = data;
    return data;
  }

  async login(username_or_email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username_or_email, password }),
    });
    if (data.csrf_token) this.setCsrfToken(data.csrf_token);
    this.currentUser = data;
    return data;
  }

  async logout() {
    await this.request('/auth/logout', { method: 'POST' });
    this.csrfToken = null;
    this.currentUser = null;
  }

  async getMe() {
    try {
      const data = await this.request('/auth/me');
      if (data.csrf_token) this.setCsrfToken(data.csrf_token);
      this.currentUser = data;
      return data;
    } catch (err) {
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

  async updateSettings({ sound_muted, haptics_enabled, ambient_enabled }) {
    return this.request('/users/settings', {
      method: 'PATCH',
      body: JSON.stringify({ sound_muted, haptics_enabled, ambient_enabled }),
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
}

export const api = new ApiClient();

