import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  beginSpotifyAuthorization,
  clearSpotifySession,
  completeSpotifyAuthorization,
  getSpotifyAccessToken,
  getSpotifySession,
  hasSpotifyClientId,
  loadSpotifyPlaybackSdk,
  spotifyApi,
} from '../../services/spotifyClient.js';

const SPOTIFY_TYPES = 'playlist|album|track|artist|show|episode';

export function normalizeSpotifyUri(value) {
  const input = (value || '').trim();
  if (!input) return '';
  const uriMatch = input.match(new RegExp(`^spotify:(${SPOTIFY_TYPES}):([A-Za-z0-9]+)$`, 'i'));
  if (uriMatch) return `spotify:${uriMatch[1].toLowerCase()}:${uriMatch[2]}`;
  try {
    const url = new URL(input);
    if (url.protocol !== 'https:' || !['open.spotify.com', 'www.open.spotify.com'].includes(url.hostname)) return null;
    const pathMatch = url.pathname.match(new RegExp(`^/(?:intl-[a-z]{2}/)?(${SPOTIFY_TYPES})/([A-Za-z0-9]+)/?$`, 'i'));
    if (!pathMatch) return null;
    return `spotify:${pathMatch[1].toLowerCase()}:${pathMatch[2]}`;
  } catch {
    return null;
  }
}

function friendlyError(error) {
  const message = error?.message || 'Spotify could not complete that action.';
  if (/invalid token scopes|insufficient client scope|insufficient scope/i.test(message)) return 'Spotify playback permissions need refreshing. Reconnect Spotify and approve the requested access.';
  if (/account_error|premium/i.test(message)) return 'Spotify Premium is required for in-app playback. You can still open this selection in Spotify.';
  if (/allowlist|development mode|403/i.test(message)) return "Spotify blocked playback. Check that this account is in the app's Users Management allowlist and that the app owner has Premium.";
  return message;
}

function formatTime(ms = 0) {
  const seconds = Math.floor(Math.max(0, ms) / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function SpotifyPlayer({ spotifyUri = '', isAuthenticated, onSave }) {
  const [draft, setDraft] = useState(spotifyUri);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [connected, setConnected] = useState(Boolean(getSpotifySession()));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [playerState, setPlayerState] = useState(null);
  const [playbackState, setPlaybackState] = useState(null);
  const [volume, setVolume] = useState(70);
  const [seekPreview, setSeekPreview] = useState(null);
  const playerRef = useRef(null);
  const stateRef = useRef(null);

  useEffect(() => setDraft(spotifyUri), [spotifyUri]);
  useEffect(() => { stateRef.current = playerState; }, [playerState]);

  useEffect(() => {
    if (!connected) return undefined;
    let active = true;
    const syncPlayback = async () => {
      try {
        const state = await spotifyApi('/me/player');
        if (!active) return;
        setPlaybackState(state);
        if (state?.device?.volume_percent != null) setVolume(state.device.volume_percent);
      } catch (syncError) {
        if (active) setError(friendlyError(syncError));
      }
    };
    syncPlayback();
    const timer = window.setInterval(syncPlayback, 5_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [connected]);

  useEffect(() => {
    let active = true;
    completeSpotifyAuthorization()
      .then((session) => {
        if (active && session) {
          setConnected(true);
          setMessage('Spotify is connected. Choose a track or load your saved selection.');
        }
      })
      .catch((authError) => { if (active) setError(friendlyError(authError)); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!connected) return undefined;
    let disposed = false;
    let player;
    loadSpotifyPlaybackSdk()
      .then(() => {
        if (disposed) return;
        player = new window.Spotify.Player({
          name: 'Chemsha Bongo Sanctuary',
          volume: 0.7,
          getOAuthToken: (callback) => getSpotifyAccessToken().then(callback).catch((sdkError) => setError(friendlyError(sdkError))),
        });
        player.addListener('ready', ({ device_id }) => {
          if (!disposed) {
            setDeviceId(device_id);
            setMessage('Spotify player ready.');
          }
        });
        player.addListener('not_ready', () => { if (!disposed) setDeviceId(''); });
        player.addListener('player_state_changed', (state) => { if (!disposed) setPlayerState(state); });
        for (const eventName of ['initialization_error', 'authentication_error', 'account_error', 'playback_error']) {
          player.addListener(eventName, ({ message: detail }) => { if (!disposed) setError(friendlyError(new Error(detail))); });
        }
        player.addListener('autoplay_failed', () => {
          if (!disposed) setError('Your browser blocked automatic playback. Press Play once more to allow audio.');
        });
        player.connect().then((ok) => {
          if (!ok && !disposed) setError('Spotify could not start its web player in this browser.');
        });
        playerRef.current = player;
      })
      .catch((sdkError) => { if (!disposed) setError(friendlyError(sdkError)); });
    return () => {
      disposed = true;
      if (player) player.disconnect();
      if (playerRef.current === player) playerRef.current = null;
    };
  }, [connected]);

  const persistSelection = useCallback(async (uri) => {
    await onSave(uri);
    setDraft(uri);
  }, [onSave]);

  const playUri = useCallback(async (uri, save = false) => {
    // Activate audio while the click is still in the browser's user-gesture path.
    const activation = playerRef.current?.activateElement?.();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const normalized = normalizeSpotifyUri(uri);
      if (!normalized) throw new Error('Paste or choose a valid Spotify link.');
      if (activation) await activation;
      if (save) await persistSelection(normalized);
      if (!deviceId) throw new Error('Spotify is connected but the player is still starting. Try again in a moment.');
      const type = normalized.split(':')[1];
      const play = ['track', 'episode'].includes(type)
        ? { uris: [normalized] }
        : { context_uri: normalized };
      await spotifyApi(`/me/player/play?device_id=${encodeURIComponent(deviceId)}`, {
        method: 'PUT', body: JSON.stringify(play),
      });
      setMessage('Playing in Chemsha Bongo.');
    } catch (playError) {
      setError(friendlyError(playError));
      if (/premium|allowlist|Spotify account|403/i.test(playError.message || '')) {
        const normalized = normalizeSpotifyUri(uri);
        if (normalized) setMessage('You can open the saved selection in Spotify while in-app playback is unavailable.');
      }
    } finally { setBusy(false); }
  }, [deviceId, persistSelection]);

  const connect = async () => {
    setError('');
    setMessage('Redirecting to Spotify…');
    try { await beginSpotifyAuthorization(); }
    catch (connectError) { setError(friendlyError(connectError)); setMessage(''); }
  };

  const reconnect = async () => {
    playerRef.current?.disconnect();
    playerRef.current = null;
    clearSpotifySession();
    setConnected(false); setDeviceId(''); setPlaybackState(null); setPlayerState(null);
    setError(''); setMessage('Opening Spotify permissions…');
    try { await beginSpotifyAuthorization({ forceConsent: true }); }
    catch (connectError) { setError(friendlyError(connectError)); setMessage(''); }
  };

  const search = async (event) => {
    event.preventDefault();
    if (!query.trim()) return;
    setBusy(true); setError(''); setMessage('Searching Spotify…');
    try {
      const data = await spotifyApi(`/search?${new URLSearchParams({ q: query.trim(), type: 'track', limit: '6' })}`);
      setResults(data?.tracks?.items || []);
      setMessage(data?.tracks?.items?.length ? '' : 'No tracks found. Try another search.');
    } catch (searchError) { setError(friendlyError(searchError)); setMessage(''); }
    finally { setBusy(false); }
  };

  const runPlayerAction = async (action) => {
    const remoteDeviceId = playbackState?.device?.id;
    const externalDeviceActive = remoteDeviceId && remoteDeviceId !== deviceId;
    const targetDeviceId = remoteDeviceId || deviceId;
    const deviceParam = targetDeviceId ? `?device_id=${encodeURIComponent(targetDeviceId)}` : '';
    const remoteCommands = {
      togglePlay: async () => spotifyApi(playbackState?.is_playing ? `/me/player/pause${deviceParam}` : `/me/player/play${deviceParam}`, { method: 'PUT' }),
      nextTrack: async () => spotifyApi(`/me/player/next${deviceParam}`, { method: 'POST' }),
      previousTrack: async () => spotifyApi(`/me/player/previous${deviceParam}`, { method: 'POST' }),
    };
    try {
      setError('');
      if (externalDeviceActive) await remoteCommands[action]?.();
      else await playerRef.current?.[action]();
      window.setTimeout(() => spotifyApi('/me/player').then(setPlaybackState).catch(() => {}), 700);
    }
    catch (actionError) { setError(friendlyError(actionError)); }
  };

  const changeVolume = async (event) => {
    const next = Number(event.target.value);
    setVolume(next);
    try {
      const remoteDeviceId = playbackState?.device?.id;
      if (remoteDeviceId && remoteDeviceId !== deviceId) {
        await spotifyApi(`/me/player/volume?volume_percent=${next}&device_id=${encodeURIComponent(remoteDeviceId)}`, { method: 'PUT' });
      } else {
        await playerRef.current?.setVolume(next / 100);
      }
    } catch (volumeError) { setError(friendlyError(volumeError)); }
  };

  const seek = async (event) => {
    const remoteDeviceId = playbackState?.device?.id;
    const externalDeviceActive = remoteDeviceId && remoteDeviceId !== deviceId;
    const duration = externalDeviceActive ? (playbackState?.item?.duration_ms || 0) : (stateRef.current?.duration || playbackState?.item?.duration_ms || 0);
    const positionMs = duration * (Number(event.currentTarget.value) / 100);
    setSeekPreview(null);
    try {
      if (!duration) return;
      if (externalDeviceActive) {
        await spotifyApi(`/me/player/seek?position_ms=${Math.round(positionMs)}&device_id=${encodeURIComponent(remoteDeviceId)}`, { method: 'PUT' });
      } else {
        await playerRef.current?.seek(positionMs);
      }
    } catch (seekError) { setError(friendlyError(seekError)); }
  };

  const movePlaybackHere = async () => {
    const activate = playerRef.current?.activateElement?.();
    if (!deviceId) return;
    setBusy(true); setError(''); setMessage('Moving Spotify playback to this app…');
    try {
      if (activate) await activate;
      await spotifyApi('/me/player', { method: 'PUT', body: JSON.stringify({ device_ids: [deviceId], play: true }) });
      const state = await spotifyApi('/me/player');
      setPlaybackState(state);
      setMessage('Spotify is now playing in this app.');
    } catch (transferError) { setError(friendlyError(transferError)); setMessage(''); }
    finally { setBusy(false); }
  };

  const disconnect = () => {
    playerRef.current?.disconnect();
    playerRef.current = null;
    clearSpotifySession();
    setConnected(false); setDeviceId(''); setPlayerState(null); setResults([]);
    setMessage('Spotify disconnected.'); setError('');
  };

  const remoteDeviceId = playbackState?.device?.id;
  const useSdkState = Boolean(playerState && (!remoteDeviceId || remoteDeviceId === deviceId));
  const track = useSdkState ? playerState.track_window?.current_track : playbackState?.item;
  const trackImages = track?.album?.images || track?.images || [];
  const duration = useSdkState ? playerState.duration : (playbackState?.item?.duration_ms || 0);
  const position = useSdkState ? playerState.position : (playbackState?.progress_ms || 0);
  const progress = duration ? (position / duration) * 100 : 0;
  const isPlaying = useSdkState ? !playerState.paused : Boolean(playbackState?.is_playing);
  const externalDeviceActive = Boolean(remoteDeviceId && remoteDeviceId !== deviceId);

  return (
    <section className="mx-auto w-full max-w-3xl rounded-[22px] border border-[#1b2a23] bg-[#07100d] p-2 text-[#f3f7f4] shadow-[0_16px_48px_rgba(0,0,0,0.22)] sm:p-2.5">
      {!connected ? (
        <div className="rounded-[20px] border border-[#22352c] bg-[#102019] p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-[#123b28] text-[#1ed760]"><span className="material-symbols-outlined">graphic_eq</span></span>
            <div><h3 className="text-lg font-semibold">Connect Spotify</h3><p className="mt-1 text-sm text-[#b0beb6]">Your music, right here in Banja.</p></div>
          </div>
          <button type="button" disabled={!hasSpotifyClientId()} onClick={connect} className="inline-flex items-center gap-2 rounded-full bg-[#1ed760] px-5 py-2.5 text-sm font-semibold text-[#06200f] transition hover:bg-[#37e878] disabled:opacity-50">
            <span className="material-symbols-outlined text-lg">music_note</span>{hasSpotifyClientId() ? 'Connect Spotify' : 'Spotify setup needed'}
          </button>
          {!hasSpotifyClientId() && <p className="mt-3 text-[11px] text-[#9aa9a1]">Add your Spotify Client ID to <code>frontend/.env</code> to enable sign-in.</p>}
        </div>
      ) : (
        <>
          <div className="rounded-[20px] border border-[#1f3028] bg-[linear-gradient(135deg,#12231b_0%,#0d1913_100%)] p-3">
            <div className="flex items-center gap-3">
              {trackImages[1]?.url || trackImages[0]?.url ? (
                <img src={trackImages[1]?.url || trackImages[0]?.url} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover shadow-lg sm:h-16 sm:w-16" />
              ) : (
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-[#254132] bg-[#0b1710] text-[#1ed760] sm:h-16 sm:w-16"><span className="material-symbols-outlined text-3xl">music_note</span></div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="min-w-0 whitespace-normal break-words text-base font-bold leading-tight tracking-tight [overflow-wrap:anywhere] sm:text-lg">{track?.name || 'Ready when you are'}</h3>
                  {track?.name && <span className="material-symbols-outlined shrink-0 text-[17px] text-[#1ed760]" aria-label="Spotify track">verified</span>}
                </div>
                <p className="mt-0.5 whitespace-normal break-words text-xs leading-snug text-[#b0beb6] [overflow-wrap:anywhere] sm:text-sm">{track?.artists?.map((artist) => artist.name).join(', ') || (playbackState?.device?.name ? `Spotify • ${playbackState.device.name}` : 'Play from any of your Spotify devices')}</p>
              </div>
              <button type="button" onClick={() => setShowSearch((open) => !open)} aria-label={showSearch ? 'Close music search' : 'Search Spotify'} aria-expanded={showSearch} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#23412f] bg-[#0b2415] text-[#1ed760] transition hover:bg-[#123820]"><span className="material-symbols-outlined">{showSearch ? 'close' : 'graphic_eq'}</span></button>
            </div>

            <div className="mt-3">
              <input aria-label="Track progress" type="range" min="0" max="100" value={seekPreview ?? progress} onChange={(event) => setSeekPreview(Number(event.target.value))} onPointerUp={seek} onKeyUp={(event) => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) seek(event); }} className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#293a31] accent-[#1ed760] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#1ed760]" />
              <div className="mt-1 flex justify-between font-mono text-[11px] text-[#87948c]"><span>{formatTime(position)}</span><span>{formatTime(duration)}</span></div>
            </div>

            <div className="mt-2 flex items-center justify-center gap-3 sm:gap-6">
              <button type="button" onClick={() => runPlayerAction('previousTrack')} aria-label="Previous track" disabled={!deviceId && !remoteDeviceId} className="grid h-9 w-9 place-items-center text-[#a9b4ad] transition hover:text-white disabled:opacity-40"><span className="material-symbols-outlined">skip_previous</span></button>
              <button type="button" onClick={() => runPlayerAction('togglePlay')} aria-label={isPlaying ? 'Pause' : 'Play'} disabled={!deviceId && !remoteDeviceId} className="grid h-12 w-12 place-items-center rounded-full bg-[#1ed760] text-[#06140b] shadow-[0_0_28px_rgba(30,215,96,0.24)] transition hover:scale-105 hover:bg-[#3be879] disabled:opacity-45"><span className="material-symbols-outlined text-[28px]">{isPlaying ? 'pause' : 'play_arrow'}</span></button>
              <button type="button" onClick={() => runPlayerAction('nextTrack')} aria-label="Next track" disabled={!deviceId && !remoteDeviceId} className="grid h-9 w-9 place-items-center text-[#a9b4ad] transition hover:text-white disabled:opacity-40"><span className="material-symbols-outlined">skip_next</span></button>
              <label className="ml-1 flex items-center gap-2 text-[#a9b4ad]" aria-label="Volume"><span className="material-symbols-outlined text-xl">volume_up</span><input type="range" min="0" max="100" value={volume} onChange={changeVolume} className="w-[66px] cursor-pointer accent-[#1ed760] sm:w-[82px]" /></label>
            </div>
          </div>

          {showSearch && <div className="mt-3 rounded-[20px] border border-[#1f3028] bg-[#0c1711] p-3.5 sm:p-4">
            <form className="flex gap-2" onSubmit={search}>
              <label htmlFor="banja-spotify-search" className="sr-only">Search Spotify tracks</label>
              <input id="banja-spotify-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search songs or artists" className="min-w-0 flex-1 rounded-xl border border-[#283a30] bg-[#101e16] px-3.5 py-2.5 text-xs text-white placeholder:text-[#78867e] focus:border-[#1ed760] focus:outline-none" />
              <button type="submit" disabled={busy} className="rounded-xl bg-[#1ed760] px-4 text-xs font-semibold text-[#06200f] disabled:opacity-50">Search</button>
            </form>
            <form className="mt-2 flex gap-2" onSubmit={(event) => { event.preventDefault(); playUri(draft, true); }}>
              <label htmlFor="banja-spotify-link" className="sr-only">Spotify track, playlist, or album link</label>
              <input id="banja-spotify-link" type="text" value={draft} onChange={(event) => { setDraft(event.target.value); setError(''); }} placeholder="Or paste a Spotify link" className="min-w-0 flex-1 rounded-xl border border-[#283a30] bg-[#101e16] px-3.5 py-2.5 text-xs text-white placeholder:text-[#78867e] focus:border-[#1ed760] focus:outline-none" />
              <button type="submit" disabled={busy || !deviceId || !draft.trim()} className="rounded-xl border border-[#31543e] px-3.5 text-xs font-semibold text-[#1ed760] disabled:opacity-50">Play</button>
            </form>
            {results.length > 0 && <ul className="mt-3 divide-y divide-[#213128] overflow-hidden rounded-xl border border-[#24372c]" aria-label="Spotify search results">
              {results.map((item) => <li key={item.id} className="flex items-center gap-3 p-2.5">
                {item.album?.images?.[2]?.url && <img src={item.album.images[2].url} alt="" className="h-10 w-10 rounded-lg object-cover" />}
                <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-white">{item.name}</p><p className="truncate text-[11px] text-[#97a49b]">{item.artists?.map((artist) => artist.name).join(', ')}</p></div>
                <button type="button" disabled={busy || !deviceId} onClick={() => playUri(item.uri, true)} aria-label={`Play ${item.name}`} className="rounded-full p-2 text-[#1ed760] hover:bg-[#183020] disabled:opacity-50"><span className="material-symbols-outlined">play_arrow</span></button>
              </li>)}
            </ul>}
            {spotifyUri && <button type="button" disabled={busy || !deviceId} onClick={() => playUri(spotifyUri)} className="mt-3 text-[11px] text-[#1ed760] underline underline-offset-2 disabled:opacity-50">Play saved selection</button>}
            <div className="mt-3 flex items-center justify-between border-t border-[#213128] pt-3">
              <p className="text-[11px] text-[#9ba99f]">{isAuthenticated ? 'Selection synced to your account.' : 'Sign in to sync your saved selection.'}</p>
              <button type="button" onClick={disconnect} className="text-[11px] text-[#9ba99f] hover:text-white">Disconnect Spotify</button>
            </div>
          </div>}

          <div className="mt-2 flex min-h-11 flex-wrap items-center gap-x-2 gap-y-1 rounded-[16px] border border-[#1d2b23] bg-[#0d1711] px-3 py-2">
            <span className="material-symbols-outlined text-[17px] text-[#1ed760]">{playbackState?.device ? 'radio_button_checked' : 'graphic_eq'}</span>
            <p className="min-w-0 flex-1 basis-[150px] break-words text-sm leading-snug text-[#b0beb6]">{playbackState?.device ? <>Playing on <span className="font-semibold text-[#28df70]">{playbackState.device.name || 'Spotify device'}</span></> : deviceId ? <>Connected to <span className="font-semibold text-[#28df70]">Spotify</span> · no active playback</> : 'Connecting to Spotify player…'}</p>
            {externalDeviceActive && <button type="button" disabled={busy || !deviceId} onClick={movePlaybackHere} className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-sm font-semibold text-[#1ed760] transition hover:bg-[#183020] disabled:opacity-50">Play here <span className="material-symbols-outlined text-base">chevron_right</span></button>}
          </div>
        </>
      )}

      {(message || error) && <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-[11px] leading-snug" role="status"><p className={`min-w-0 flex-1 whitespace-normal break-words [overflow-wrap:anywhere] ${error ? 'text-red-400' : 'text-[#73d99a]'}`}>{error || message}</p>{/permissions need refreshing/i.test(error) && <button type="button" onClick={reconnect} className="shrink-0 rounded-full border border-[#31543e] px-2.5 py-1 font-semibold text-[#1ed760] hover:bg-[#183020]">Reconnect</button>}</div>}
    </section>
  );
}
