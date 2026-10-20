const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || '';
export const SPOTIFY_REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI || `${window.location.origin}/`;

const TOKEN_KEY = 'chemsha_spotify_session';
const VERIFIER_KEY = 'chemsha_spotify_pkce_verifier';
const STATE_KEY = 'chemsha_spotify_oauth_state';
const SCOPES = [
  'streaming',
  'user-read-playback-state',
  'user-modify-playback-state',
].join(' ');

function randomUrlSafeString(byteLength = 64) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function createCodeChallenge(verifier) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const bytes = new Uint8Array(digest);
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function readSession() {
  try {
    return JSON.parse(sessionStorage.getItem(TOKEN_KEY) || 'null');
  } catch {
    return null;
  }
}

function writeSession(tokens) {
  sessionStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
  return tokens;
}

export function hasSpotifyClientId() {
  return Boolean(CLIENT_ID);
}

export function getSpotifySession() {
  return readSession();
}

export function clearSpotifySession() {
  sessionStorage.removeItem(TOKEN_KEY);
}

export async function beginSpotifyAuthorization({ forceConsent = false } = {}) {
  if (!CLIENT_ID) throw new Error('Add VITE_SPOTIFY_CLIENT_ID to frontend/.env and restart the app.');

  const verifier = randomUrlSafeString();
  const state = randomUrlSafeString(24);
  sessionStorage.setItem(VERIFIER_KEY, verifier);
  sessionStorage.setItem(STATE_KEY, state);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: SPOTIFY_REDIRECT_URI,
    scope: SCOPES,
    state,
    code_challenge_method: 'S256',
    code_challenge: await createCodeChallenge(verifier),
  });
  if (forceConsent) params.set('show_dialog', 'true');
  window.location.assign(`https://accounts.spotify.com/authorize?${params}`);
}

async function exchangeToken(body) {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...body, client_id: CLIENT_ID }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error_description || result.error || 'Spotify could not authorize this account.');
  }
  return result;
}

export async function completeSpotifyAuthorization() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const returnedState = params.get('state');
  const authError = params.get('error');
  if (!code && !authError) return null;

  const expectedState = sessionStorage.getItem(STATE_KEY);
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  sessionStorage.removeItem(STATE_KEY);
  sessionStorage.removeItem(VERIFIER_KEY);
  window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.hash}`);

  if (authError) throw new Error(`Spotify authorization ${authError.replaceAll('_', ' ')}.`);
  if (!expectedState || returnedState !== expectedState || !verifier) {
    throw new Error('Spotify sign-in state did not match. Please connect again.');
  }

  const result = await exchangeToken({
    grant_type: 'authorization_code',
    code,
    redirect_uri: SPOTIFY_REDIRECT_URI,
    code_verifier: verifier,
  });
  return writeSession({
    accessToken: result.access_token,
    refreshToken: result.refresh_token,
    expiresAt: Date.now() + (result.expires_in * 1000),
    scope: result.scope || '',
  });
}

export async function getSpotifyAccessToken({ forceRefresh = false } = {}) {
  const session = readSession();
  if (!session) return null;
  if (!forceRefresh && session.accessToken && session.expiresAt > Date.now() + 60_000) return session.accessToken;
  if (!session.refreshToken) {
    clearSpotifySession();
    return null;
  }

  try {
    const result = await exchangeToken({
      grant_type: 'refresh_token',
      refresh_token: session.refreshToken,
    });
    writeSession({
      accessToken: result.access_token,
      refreshToken: result.refresh_token || session.refreshToken,
      expiresAt: Date.now() + (result.expires_in * 1000),
      scope: result.scope || session.scope || '',
    });
    return result.access_token;
  } catch (error) {
    clearSpotifySession();
    throw error;
  }
}

export async function spotifyApi(path, options = {}) {
  let accessToken = await getSpotifyAccessToken();
  if (!accessToken) throw new Error('Connect your Spotify account to use playback.');

  const makeRequest = (token) => fetch(`https://api.spotify.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });

  let response = await makeRequest(accessToken);
  if (response.status === 401) {
    accessToken = await getSpotifyAccessToken({ forceRefresh: true });
    if (accessToken) response = await makeRequest(accessToken);
    else throw new Error('Your Spotify session expired. Connect Spotify again.');
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    if (response.status === 403) {
      throw new Error("Spotify blocked this request (403). Confirm your account is in the app's Users Management allowlist and the app owner has Premium.");
    }
    if (response.status === 429) throw new Error('Spotify is receiving too many requests. Wait a moment and try again.');
    throw new Error(data.error?.message || `Spotify request failed (${response.status}).`);
  }
  if (response.status === 204) return null;
  return response.json().catch(() => null);
}

export function loadSpotifyPlaybackSdk() {
  if (window.Spotify?.Player) return Promise.resolve();
  if (window.__chemshaSpotifySdkPromise) return window.__chemshaSpotifySdkPromise;

  window.__chemshaSpotifySdkPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-spotify-playback-sdk]');
    const script = existing || document.createElement('script');
    const timeout = window.setTimeout(() => reject(new Error('Spotify playback could not load. Check the connection or browser content blockers.')), 15_000);
    const ready = () => {
      window.clearTimeout(timeout);
      resolve();
    };
    const failed = () => {
      window.clearTimeout(timeout);
      reject(new Error('Spotify playback could not load. Check the connection or browser content blockers.'));
      window.__chemshaSpotifySdkPromise = null;
    };

    window.onSpotifyWebPlaybackSDKReady = ready;
    if (existing) {
      existing.addEventListener('load', () => {
        if (window.Spotify?.Player) ready();
      }, { once: true });
    }
    script.addEventListener('error', failed, { once: true });
    if (!existing) {
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;
      script.dataset.spotifyPlaybackSdk = 'true';
      document.head.appendChild(script);
    }
  });
  return window.__chemshaSpotifySdkPromise;
}
