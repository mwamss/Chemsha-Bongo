import React, { useState, useEffect } from 'react';
import { api } from '../../services/apiClient.js';
import { useAudio } from '../../context/AudioContext.jsx';
import { DailyMethaliCard } from '../quotes/DailyMethaliCard.jsx';

export function QuotesScreen({ onNavigate }) {
  const { playClick, sound } = useAudio();
  const [aphorisms, setAphorisms] = useState([]);
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    api.getAllAphorisms()
      .then((data) => {
        if (data && data.length) {
          setAphorisms(data);
        }
      })
      .catch(() => {
        // Fallback list
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleCopy = async (item, idx) => {
    playClick();
    const authorLine = item.author ? ` — ${item.author}` : '';
    const textToCopy = `${item.primary_text}${authorLine}\n${item.secondary_text || ''} (${item.collection} • ${item.aphorism_number})`.trim();
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedId(idx);
      if (sound?.playCorrect) sound.playCorrect(3);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setCopiedId(idx);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const categories = [
    'ALL',
    'ACTIVE INTELLECT',
    'RESILIENCE & GROWTH',
    'ATTENTION PACING',
    'PURPOSE & ACTION',
    'INNER CALM',
    'INSPIRATIONAL WISDOM',
  ];

  const filteredAphorisms = aphorisms.filter((item) => {
    const matchesCategory =
      filterCategory === 'ALL' ||
      item.category?.toLowerCase().includes(filterCategory.toLowerCase());
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      item.primary_text?.toLowerCase().includes(q) ||
      item.quote?.toLowerCase().includes(q) ||
      item.secondary_text?.toLowerCase().includes(q) ||
      item.category?.toLowerCase().includes(q) ||
      item.author?.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="screen-layout flex flex-col gap-8 w-full mx-auto px-4 sm:px-6 lg:px-10 2xl:px-12 pt-6 pb-20 select-none">
      {/* ── TOP HEADER & BREADCRUMB ──────────────────────────────────────── */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle/40 pb-5">
        <div>
          <button
            onClick={() => { playClick(); onNavigate('home'); }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary hover:text-primary mb-2 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Back to Sanctuary</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-secondary" />
            <h1 className="font-headline-xl text-2xl sm:text-3xl font-extrabold text-on-surface">
              Daily Wisdom &amp; Axiom Sanctuary
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-1 max-w-2xl leading-relaxed">
            Timeless reflections illuminated through modern cognitive neuroscience. Contemplations to cultivate neural plasticity, mental fortitude, and mindful clarity.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto px-3.5 py-1.5 rounded-full bg-surface-container border border-border-subtle/50 text-xs font-medium text-secondary">
          <span className="material-symbols-outlined text-[16px]">menu_book</span>
          <span>{aphorisms.length || 326} Curated Quotes</span>
        </div>
      </section>

      {/* ── FEATURED CENTERPIECE: HERO CARD ─────────────────────────────── */}
      <section className="w-full mx-auto">
        <DailyMethaliCard />
      </section>

      {/* ── FILTER TABS & SEARCH BAR ─────────────────────────────────────── */}
      <section className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => { playClick(); setFilterCategory(cat); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                filterCategory === cat
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {cat === 'ALL' ? 'All Collections' : cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search quotes, authors, or themes..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-surface-container border border-border-subtle/60 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </section>

      {/* ── FULL APHORISM COLLECTION GRID ────────────────────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredAphorisms.map((item, idx) => {
          const isCopied = copiedId === idx;
          return (
            <div
              key={idx}
              className="flex flex-col justify-between p-5 rounded-2xl bg-surface border border-border-subtle/50 shadow-xs hover:shadow-sm transition-all group"
            >
              <div>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-surface-container text-secondary font-serif font-black text-xs flex items-center justify-center shrink-0 mt-0.5 select-none border border-border-subtle">
                    99
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                        {item.category}
                      </span>
                      <span className="text-[11px] font-bold text-primary">
                        {item.aphorism_number}
                      </span>
                    </div>

                    <blockquote className="text-base font-serif font-bold text-on-surface leading-snug tracking-tight">
                      <span>{item.primary_text?.startsWith('“') ? item.primary_text : `“${item.primary_text}”`}</span>
                      {item.author && (
                        <span className="font-sans font-normal text-xs text-outline ml-2 inline-block not-italic">
                          — {item.author}
                        </span>
                      )}
                    </blockquote>

                    {item.secondary_text && (
                      <p className="text-xs text-on-surface-variant leading-relaxed mt-2 font-normal">
                        {item.secondary_text}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 mt-4 border-t border-border-subtle/30 text-xs">
                <span className="text-[11px] font-medium text-outline">
                  {item.collection}
                </span>

                <button
                  onClick={() => handleCopy(item, idx)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-secondary hover:text-primary transition-colors cursor-pointer"
                  title="Copy contemplation"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {isCopied ? 'check' : 'content_copy'}
                  </span>
                  <span>{isCopied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
