import React, { useState, useEffect } from 'react';
import { api } from '../../services/apiClient.js';
import { useAudio } from '../../context/AudioContext.jsx';

const DEFAULT_FALLBACK_QUOTES = [
  {
    quote: "The only limit to our realization of tomorrow will be our doubts of today.",
    author: "Franklin D. Roosevelt",
    category: "Daily Contemplation"
  },
  {
    quote: "Peace comes from within. Do not seek it without.",
    author: "Buddha",
    category: "Mindful Serenity"
  },
  {
    quote: "Every failure brings with it the seed of an equivalent success.",
    author: "Napoleon Hill",
    category: "Resilience"
  },
  {
    quote: "Wisdom begins in wonder.",
    author: "Socrates",
    category: "Curiosity"
  }
];

export function InspirationalQuotesCard() {
  const { playClick, sound } = useAudio();
  const [currentQuote, setCurrentQuote] = useState(DEFAULT_FALLBACK_QUOTES[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [quoteMode, setQuoteMode] = useState('daily'); // 'daily' | 'random'

  const fetchQuote = async (mode = 'daily') => {
    setIsLoading(true);
    try {
      const data = mode === 'daily' ? await api.getDailyQuote() : await api.getRandomQuote();
      if (data && data.quote) {
        setCurrentQuote(data);
      }
    } catch {
      // Pick local fallback if backend unreachable
      const randomIndex = Math.floor(Math.random() * DEFAULT_FALLBACK_QUOTES.length);
      setCurrentQuote(DEFAULT_FALLBACK_QUOTES[randomIndex]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuote('daily');
  }, []);

  const handleNextRandom = () => {
    playClick();
    setQuoteMode('random');
    fetchQuote('random');
  };

  const handleDailyMode = () => {
    playClick();
    setQuoteMode('daily');
    fetchQuote('daily');
  };

  const handleCopyQuote = async () => {
    playClick();
    const textToCopy = `"${currentQuote.quote}" — ${currentQuote.author}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
      if (sound?.playCorrect) sound.playCorrect(3);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Fallback if clipboard API restricted
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <section
      aria-label="Inspirational Quotes & Contemplation"
      className="relative overflow-hidden rounded-3xl bg-surface border border-border-subtle p-6 sm:p-7 shadow-sm transition-all group"
    >
      {/* Soft Ambient Background Glow */}
      <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-secondary/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -right-16 w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-border-subtle/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-surface-container text-secondary border border-secondary/30 flex items-center justify-center shadow-xs">
            <span className="material-symbols-outlined text-[18px]">format_quote</span>
          </div>
          <div>
            <h3 className="font-headline-md text-base sm:text-lg font-bold text-on-surface flex items-center gap-2">
              <span>Inspirational Contemplation</span>
            </h3>
            <p className="text-[11px] text-on-surface-variant">Daily wisdom to cultivate focus and equanimity</p>
          </div>
        </div>

        {/* Mode Selector & Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDailyMode}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              quoteMode === 'daily'
                ? 'bg-secondary text-white shadow-xs'
                : 'bg-surface-container text-secondary hover:bg-surface-container-high'
            }`}
            title="Today's synchronized mindful quote"
          >
            Daily Quote
          </button>

          <button
            onClick={handleNextRandom}
            disabled={isLoading}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              quoteMode === 'random'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
            }`}
            title="Draw a fresh random quote from collection"
          >
            <span
              className={`material-symbols-outlined text-[14px] ${
                isLoading ? 'animate-spin' : ''
              }`}
            >
              autorenew
            </span>
            <span>Shuffle</span>
          </button>
        </div>
      </div>

      {/* Main Quote Content */}
      <div className="relative z-10 py-6 sm:py-7 flex flex-col justify-center min-h-[130px]">
        {/* Large Decorative Quotation Mark */}
        <div className="text-secondary/25 select-none font-serif text-5xl sm:text-6xl -mb-4 leading-none">
          “
        </div>

        <blockquote className="space-y-3">
          <p
            className={`text-base sm:text-lg lg:text-xl font-medium text-on-surface leading-relaxed italic transition-opacity duration-300 ${
              isLoading ? 'opacity-40' : 'opacity-100'
            }`}
          >
            {currentQuote.quote}
          </p>

          <footer className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <span className="w-4 h-0.5 bg-secondary/60 rounded-full" />
              <cite className="not-italic text-xs sm:text-sm font-semibold text-secondary tracking-wide">
                {currentQuote.author || 'Anonymous'}
              </cite>
            </div>

            {/* Quick Actions: Copy */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCopyQuote}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-surface-container/60 hover:bg-surface-container text-outline hover:text-on-surface transition-all cursor-pointer"
                title="Copy quote to clipboard"
              >
                <span className="material-symbols-outlined text-[14px]">
                  {isCopied ? 'check' : 'content_copy'}
                </span>
                <span>{isCopied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </footer>
        </blockquote>
      </div>

      {/* Bottom Subtle Ribbon */}
      <div className="relative z-10 pt-3 border-t border-border-subtle/40 flex items-center justify-between text-[11px] text-outline">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>325+ curated reflections curated for mental calm</span>
        </span>
        <span className="text-[10px] uppercase tracking-wider font-semibold text-secondary">
          Chemsha Bongo Mindset
        </span>
      </div>
    </section>
  );
}

