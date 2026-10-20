import React, { useEffect, useState } from 'react';

const SPOTIFY_TYPES = 'playlist|album|track|artist|show|episode';

export function normalizeSpotifyUri(value) {
  const input = (value || '').trim();
  if (!input) return '';

  const uriMatch = input.match(new RegExp(`^spotify:(${SPOTIFY_TYPES}):([A-Za-z0-9]+)$`, 'i'));
  if (uriMatch) return `spotify:${uriMatch[1].toLowerCase()}:${uriMatch[2]}`;

  try {
    const url = new URL(input);
    if (url.protocol !== 'https:' || url.hostname !== 'open.spotify.com') return null;
    const pathMatch = url.pathname.match(new RegExp(`^/(?:intl-[a-z]{2}/)?(${SPOTIFY_TYPES})/([A-Za-z0-9]+)/?$`, 'i'));
    if (!pathMatch) return null;
    return `spotify:${pathMatch[1].toLowerCase()}:${pathMatch[2]}`;
  } catch {
    return null;
  }
}

function getEmbedDetails(uri) {
  const match = (uri || '').match(new RegExp(`^spotify:(${SPOTIFY_TYPES}):([A-Za-z0-9]+)$`, 'i'));
  if (!match) return null;
  const type = match[1].toLowerCase();
  return {
    type,
    height: ['track', 'episode'].includes(type) ? 152 : 352,
    src: `https://open.spotify.com/embed/${type}/${match[2]}?utm_source=generator`,
  };
}

export function SpotifyPlayer({ spotifyUri = '', isAuthenticated, onSave }) {
  const [draft, setDraft] = useState(spotifyUri);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const embed = getEmbedDetails(spotifyUri);

  useEffect(() => {
    setDraft(spotifyUri);
  }, [spotifyUri]);

  const saveLink = async (nextValue) => {
    const normalized = normalizeSpotifyUri(nextValue);
    if (normalized === null) {
      setError('Paste a Spotify playlist, album, track, artist, show, or episode link.');
      setMessage('');
      return;
    }

    setBusy(true);
    setError('');
    setMessage('');
    try {
      await onSave(normalized);
      setDraft(normalized);
      setMessage(isAuthenticated ? 'Saved to your account.' : 'Saved in this browser.');
    } catch (saveError) {
      setError(saveError.message || 'Could not sync this Spotify link. It is saved in this browser.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="w-full rounded-2xl border border-border-subtle/50 bg-surface p-4 sm:p-5 shadow-sm">
      <div className="flex items-start gap-3 mb-4">
        <span className="material-symbols-outlined text-2xl text-[#1db954]" aria-hidden="true">headphones</span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-on-surface">Your Spotify listening space</h3>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Add a playlist or track you want to listen to while you reflect.
          </p>
        </div>
      </div>

      <form
        className="flex flex-col sm:flex-row gap-2 mb-3"
        onSubmit={(event) => { event.preventDefault(); saveLink(draft); }}
      >
        <label htmlFor="banja-spotify-link" className="sr-only">Spotify link</label>
        <input
          id="banja-spotify-link"
          type="text"
          value={draft}
          onChange={(event) => { setDraft(event.target.value); setError(''); setMessage(''); }}
          placeholder="Paste a Spotify playlist or track link"
          className="min-w-0 flex-1 rounded-xl border border-border-subtle bg-surface-container/60 px-3.5 py-2.5 text-xs text-on-surface placeholder:text-outline focus:border-secondary focus:bg-surface focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy}
          className="btn btn-primary px-4 py-2.5 text-xs font-semibold rounded-xl disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Load Spotify'}
        </button>
        {spotifyUri && (
          <button
            type="button"
            disabled={busy}
            onClick={() => { setDraft(''); saveLink(''); }}
            className="btn btn-secondary px-4 py-2.5 text-xs font-semibold rounded-xl disabled:opacity-50"
          >
            Clear
          </button>
        )}
      </form>

      {(message || error) && (
        <p className={`text-[11px] mb-3 ${error ? 'text-red-600 dark:text-red-400' : 'text-secondary'}`} role="status">
          {error || message}
        </p>
      )}

      {embed ? (
        <iframe
          key={spotifyUri}
          title={`Spotify ${embed.type} player`}
          src={embed.src}
          width="100%"
          height={embed.height}
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          className="block w-full rounded-xl"
        />
      ) : (
        <div className="min-h-28 rounded-xl border border-dashed border-border-subtle/70 bg-surface-container/30 flex items-center justify-center px-5 text-center">
          <p className="text-xs text-on-surface-variant">Your Spotify player will appear here after you add a link.</p>
        </div>
      )}

      <p className="text-[10px] text-outline mt-3">
        {isAuthenticated ? 'This Spotify selection follows your account.' : 'Sign in to sync this selection with your account.'}
      </p>
    </section>
  );
}
