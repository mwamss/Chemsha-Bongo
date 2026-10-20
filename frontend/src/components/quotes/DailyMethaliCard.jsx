import React, { useState, useEffect } from 'react';
import { api } from '../../services/apiClient.js';
import { useAudio } from '../../context/AudioContext.jsx';
import { getRandomPackageQuote, getDailyPackageQuote, PACKAGE_QUOTES } from '../../data/packageQuotes.js';

// Dynamically drawn initial quote from the inspirational-quotes library (no hardcoded text)
const getInitialQuoteState = () => {
  const daily = getDailyPackageQuote();
  return {
    quote: daily.text,
    primary_text: `“${daily.text}”`,
    secondary_text: null,
    author: daily.from || 'Anonymous',
    category: daily.category || 'COGNITIVE ANCHOR • INSPIRATIONAL WISDOM',
    collection: 'Inspirational Quotes Library',
    aphorism_number: daily.aphorism_number || '#1',
  };
};

export function DailyMethaliCard({ onNavigate }) {
  const { playClick, sound } = useAudio();
  const [currentQuote, setCurrentQuote] = useState(getInitialQuoteState);
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const fetchQuote = async (mode = 'daily') => {
    setIsLoading(true);
    const startTime = Date.now();
    try {
      const currentClean = (currentQuote.quote || currentQuote.primary_text || '').replace(/^[“"]|[”"]$/g, '').trim();
      let data = null;
      if (mode === 'daily') {
        data = await api.getDailyQuote();
      } else {
        data = await api.getRandomQuote(currentClean);
      }

      const returnedQuote = (data?.quote || data?.primary_text || '').replace(/^[“"]|[”"]$/g, '').trim();

      // If valid data returned and differs from current quote (or is daily initial load)
      if (data && returnedQuote && (mode === 'daily' || returnedQuote !== currentClean)) {
        setCurrentQuote({
          quote: data.quote || returnedQuote,
          primary_text: data.primary_text || `“${data.quote || returnedQuote}”`,
          secondary_text: data.secondary_text || null,
          author: data.author || 'Anonymous',
          category: data.category || 'COGNITIVE ANCHOR • ACTIVE INTELLECT',
          collection: data.collection || 'Inspirational Quotes Library',
          aphorism_number: data.aphorism_number || '#42',
        });
      } else {
        // Fallback to local 326 package quotes guaranteed different from current quote
        const fresh = getRandomPackageQuote(currentClean);
        const aphIdx = PACKAGE_QUOTES.findIndex((q) => q.text === fresh.text);
        setCurrentQuote({
          quote: fresh.text,
          primary_text: `“${fresh.text}”`,
          secondary_text: null,
          author: fresh.from || 'Anonymous',
          category: 'COGNITIVE ANCHOR • INSPIRATIONAL WISDOM',
          collection: 'Inspirational Quotes Library',
          aphorism_number: `#${aphIdx >= 0 ? aphIdx + 1 : Math.floor(Math.random() * 326) + 1}`,
        });
      }
    } catch {
      // Offline / Network fallback: Always select a fresh quote guaranteed different from current
      const currentClean = (currentQuote.quote || currentQuote.primary_text || '').replace(/^[“"]|[”"]$/g, '').trim();
      const fresh = getRandomPackageQuote(currentClean);
      const aphIdx = PACKAGE_QUOTES.findIndex((q) => q.text === fresh.text);
      setCurrentQuote({
        quote: fresh.text,
        primary_text: `“${fresh.text}”`,
        secondary_text: null,
        author: fresh.from || 'Anonymous',
        category: 'COGNITIVE ANCHOR • INSPIRATIONAL WISDOM',
        collection: 'Inspirational Quotes Library',
        aphorism_number: `#${aphIdx >= 0 ? aphIdx + 1 : Math.floor(Math.random() * 326) + 1}`,
      });
    } finally {
      // Guarantee smooth tactile spin animation feedback for at least 250ms
      const elapsed = Date.now() - startTime;
      if (elapsed < 250) {
        await new Promise((r) => setTimeout(r, 250 - elapsed));
      }
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuote('daily');
  }, []);

  const handleRefresh = () => {
    playClick();
    fetchQuote('random');
  };

  const handleCopy = async () => {
    playClick();
    const cleanQuote = (currentQuote.quote || currentQuote.primary_text || '').replace(/^[“"]|[”"]$/g, '').trim();
    const authorLine = currentQuote.author ? ` — ${currentQuote.author}` : '';
    const textToCopy = `“${cleanQuote}”${authorLine}\n${currentQuote.secondary_text || ''} (${currentQuote.collection} • ${currentQuote.aphorism_number})`.trim();
    try {
      await navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
      if (sound?.playCorrect) sound.playCorrect(3);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const rawQuote = currentQuote.quote || currentQuote.primary_text || '';
  const cleanQuote = rawQuote.replace(/^[“"]|[”"]$/g, '').trim();
  const formattedQuote = `“${cleanQuote}”`;

  return (
    <section
      aria-label="Daily Inspiration & Axiom"
      className="relative overflow-hidden rounded-[28px] bg-surface-subdued border border-border-subtle p-5 sm:p-6 shadow-sm transition-all"
    >
      {/* ── TOP HEADER ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pb-3.5">
        <div className="flex items-center gap-2">
          {/* Mindful sitting / meditation icon */}
          <span
            className="material-symbols-outlined text-primary text-[20px] select-none"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            self_improvement
          </span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
            Daily Inspiration &amp; Axiom
          </h3>
        </div>

        {/* Circular Refresh / Shuffle Arrow */}
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          aria-label="Draw another contemplation"
          className="w-8 h-8 rounded-full flex items-center justify-center text-secondary hover:text-primary hover:bg-surface-container active:scale-95 transition-all cursor-pointer"
          title="Draw another contemplation"
        >
          <span
            className={`material-symbols-outlined text-[19px] ${
              isLoading ? 'animate-spin' : ''
            }`}
          >
            refresh
          </span>
        </button>
      </div>

      {/* ── INNER ELEVATED WHITE CARD ──────────────────────────────────── */}
      <div className="bg-surface rounded-2xl p-5 sm:p-6 border border-border-subtle shadow-xs transition-opacity duration-300">
        <div className="flex items-start gap-3 sm:gap-4">
          {/* Circular Quote Glyph Badge "99" */}
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-surface-container text-primary font-serif font-black text-xs sm:text-sm flex items-center justify-center shrink-0 mt-0.5 select-none border border-border-subtle shadow-2xs">
            99
          </div>

          {/* Text Content Column */}
          <div className="flex flex-col min-w-0 flex-1">
            {/* Category / Cognitive Anchor Tag */}
            <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-secondary mb-1.5">
              {currentQuote.category || 'COGNITIVE ANCHOR • ACTIVE INTELLECT'}
            </div>

            {/* The Quote and Author Inline */}
            <blockquote
              className={`text-base sm:text-lg lg:text-xl font-serif font-bold text-on-surface leading-snug tracking-tight transition-opacity duration-200 ${
                isLoading ? 'opacity-40' : 'opacity-100'
              }`}
            >
              <span>{formattedQuote}</span>
              {currentQuote.author && (
                <span className="font-sans font-normal text-xs sm:text-sm lg:text-base text-on-surface-variant ml-2 inline-block whitespace-nowrap not-italic tracking-normal">
                  — {currentQuote.author}
                </span>
              )}
            </blockquote>

            {/* Secondary Insight Note */}
            {currentQuote.secondary_text && (
              <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed mt-2.5 font-normal">
                {currentQuote.secondary_text}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── FOOTER: COLLECTION & APHORISM TAG + MICRO-ACTIONS ───────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3.5 px-1 text-xs">
        <span className="font-semibold text-on-surface-variant">
          {currentQuote.collection || 'Inspirational Quotes Library'}
        </span>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-secondary hover:text-primary transition-colors cursor-pointer"
            title="Copy contemplation"
          >
            <span className="material-symbols-outlined text-[14px]">
              {isCopied ? 'check' : 'content_copy'}
            </span>
            <span>{isCopied ? 'Copied' : 'Copy'}</span>
          </button>

          {onNavigate && (
            <button
              onClick={() => { playClick(); onNavigate('quotes'); }}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline transition-colors cursor-pointer"
              title="Open dedicated Quotes & Sanctuary Library"
            >
              <span>Library</span>
              <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
            </button>
          )}

          <span className="font-bold text-primary">
            Quote {currentQuote.aphorism_number || '#42'}
          </span>
        </div>
      </div>
    </section>
  );
}
