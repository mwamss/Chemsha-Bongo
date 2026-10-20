import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAudio } from '../../context/AudioContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { api } from '../../services/apiClient.js';
import { SpotifyPlayer } from './SpotifyPlayer.jsx';
import {
  getAllCategories,
  getAllQuestions,
  getPromptsByCategory,
  getRandomPrompt,
  getDailyPrompt,
  enrichPrompt,
  getCompanionPrompts,
} from '../../data/reflectionPrompts.js';

const getTimeOfDaySession = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Morning Reflection';
  if (hour >= 12 && hour < 17) return 'Afternoon Session';
  if (hour >= 17 && hour < 21) return 'Evening Contemplation';
  return 'Night Sanctuary';
};

export function BanjaScreen({ onNavigate }) {
  const { storage, settings, isAuthenticated, updateSettings } = useAuth();
  const { playClick } = useAudio();
  const { theme, setTheme, isDark, toggleTheme } = useTheme();

  // Mode & Arrival Prompt State
  const [showArrivalModal, setShowArrivalModal] = useState(true);
  const [banjaMode, setBanjaMode] = useState('guided'); // 'guided' | 'free'

  // Journal Entries State (Offline-first synced via Storage.js)
  const [entries, setEntries] = useState([]);
  const [currentEntryId, setCurrentEntryId] = useState(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sessionLabel, setSessionLabel] = useState(getTimeOfDaySession);
  const [isFavorite, setIsFavorite] = useState(false);
  const [dailyQuote, setDailyQuote] = useState(null);

  // Reflection Dataset & Navigation State
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(''); // '' means all categories
  const [currentDeckQuestions, setCurrentDeckQuestions] = useState([]);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [activePrompt, setActivePrompt] = useState(null);
  const [companionPrompts, setCompanionPrompts] = useState([]);
  const [isPromptLoading, setIsPromptLoading] = useState(false);

  // Audio & UI States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [zenMode, setZenMode] = useState(false);
  const [copyStatus, setCopyStatus] = useState('Share Prompt ↗');
  const [savedStatus, setSavedStatus] = useState('Saved to personal sanctuary');
  const [isVoiceNoteActive, setIsVoiceNoteActive] = useState(false);

  // Free Expression UI
  const [showAtmosphere, setShowAtmosphere] = useState(true);
  const [showPromptBanner, setShowPromptBanner] = useState(false);

  const textareaRef = useRef(null);

  // Load Categories & Daily Quote
  useEffect(() => {
    let isMounted = true;
    const localCategories = getAllCategories();
    setCategories(localCategories);

    if (api && api.getReflectionCategories) {
      api.getReflectionCategories()
        .then((cats) => {
          if (isMounted && Array.isArray(cats) && cats.length > 0) {
            setCategories(cats);
          }
        })
        .catch(() => {});
    }

    if (api && api.getDailyQuote) {
      api.getDailyQuote()
        .then((q) => {
          if (isMounted && q && q.quote) setDailyQuote(q);
        })
        .catch(() => {});
    }

    return () => { isMounted = false; };
  }, []);

  // Initialize Questions & Active Deck
  useEffect(() => {
    const list = selectedCategory ? getPromptsByCategory(selectedCategory) : getAllQuestions();
    setCurrentDeckQuestions(list);

    const initialRaw = selectedCategory ? list[0] : getDailyPrompt();
    const enriched = enrichPrompt(initialRaw || list[0]);
    setActivePrompt(enriched);
    setCurrentPromptIndex(0);

    if (enriched) {
      setCompanionPrompts(getCompanionPrompts(enriched.id, 3));
    }
  }, [selectedCategory]);

  // Load Entries from Storage
  useEffect(() => {
    if (storage) {
      const loaded = storage.getBanjaEntries();
      setEntries(loaded);
    }
  }, [storage]);

  // Auto-grow textarea
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(140, textareaRef.current.scrollHeight)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [body]);

  // Save current entry to Storage.js
  const saveCurrent = (newTitle = title, newBody = body, newFav = isFavorite) => {
    if (!storage) return;
    if (!newTitle.trim() && !newBody.trim() && !currentEntryId) {
      return;
    }

    const trimmed = (newBody || '').trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const now = new Date();
    const timeStr = `Today, ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const idToUse = currentEntryId || `banja-${Date.now()}`;
    const entryData = {
      id: idToUse,
      title: newTitle || (activePrompt ? activePrompt.question : 'Untitled Reflection'),
      body: newBody,
      session: sessionLabel,
      promptId: activePrompt?.id || null,
      promptCategory: activePrompt?.category || selectedCategory || 'Reflection',
      timestamp: timeStr,
      wordCount: words,
      isFavorite: newFav,
      hasVoiceNote: isVoiceNoteActive,
      updatedAt: Date.now()
    };

    const updatedList = storage.saveBanjaEntry(entryData);
    setEntries(updatedList);
    setCurrentEntryId(idToUse);
    setSavedStatus('Saved to personal sanctuary');
  };

  const handleTitleChange = (e) => {
    const val = e.target.value;
    setTitle(val);
    setSavedStatus('Saving quietly...');
    saveCurrent(val, body, isFavorite);
  };

  const handleBodyChange = (e) => {
    const val = e.target.value;
    setBody(val);
    setSavedStatus('Saving quietly...');
    saveCurrent(title, val, isFavorite);
  };

  // Sequential Navigation & Shuffle
  const handleNextInquiry = () => {
    if (currentDeckQuestions.length === 0) return;
    playClick();
    const nextIndex = (currentPromptIndex + 1) % currentDeckQuestions.length;
    setCurrentPromptIndex(nextIndex);
    const enriched = enrichPrompt(currentDeckQuestions[nextIndex]);
    setActivePrompt(enriched);
    setCompanionPrompts(getCompanionPrompts(enriched.id, 3));
  };

  const handlePrevInquiry = () => {
    if (currentDeckQuestions.length === 0) return;
    playClick();
    const prevIndex = (currentPromptIndex - 1 + currentDeckQuestions.length) % currentDeckQuestions.length;
    setCurrentPromptIndex(prevIndex);
    const enriched = enrichPrompt(currentDeckQuestions[prevIndex]);
    setActivePrompt(enriched);
    setCompanionPrompts(getCompanionPrompts(enriched.id, 3));
  };

  const handleShuffleInquiry = () => {
    if (currentDeckQuestions.length === 0) return;
    playClick();
    setIsPromptLoading(true);
    let randIndex = Math.floor(Math.random() * currentDeckQuestions.length);
    if (randIndex === currentPromptIndex && currentDeckQuestions.length > 1) {
      randIndex = (randIndex + 1) % currentDeckQuestions.length;
    }
    setCurrentPromptIndex(randIndex);
    const enriched = enrichPrompt(currentDeckQuestions[randIndex]);
    setActivePrompt(enriched);
    setCompanionPrompts(getCompanionPrompts(enriched.id, 3));
    setTimeout(() => setIsPromptLoading(false), 200);
  };

  // Focus a companion inquiry
  const handleSelectCompanion = (comp) => {
    playClick();
    setActivePrompt(comp);
    setCompanionPrompts(getCompanionPrompts(comp.id, 3));
    const idx = currentDeckQuestions.findIndex((q) => q.id === comp.id);
    if (idx >= 0) {
      setCurrentPromptIndex(idx);
    }
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  // Reset to fresh reflection
  const handleNewReflection = () => {
    playClick();
    setCurrentEntryId(null);
    setTitle('');
    setBody('');
    setIsVoiceNoteActive(false);
    setSessionLabel(getTimeOfDaySession());
    setIsFavorite(false);
    setSavedStatus('Ready to write');
    handleShuffleInquiry();
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Share / Copy Prompt & Reflection
  const handleSharePrompt = async () => {
    playClick();
    const promptText = activePrompt ? `“${activePrompt.question}”\n[${activePrompt.code}]\n\n` : '';
    const formatted = `${promptText}${title ? `${title}\n\n` : ''}${body.trim()}`;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(formatted);
      }
      setCopyStatus('Copied to clipboard!');
      setTimeout(() => setCopyStatus('Share Prompt ↗'), 2400);
    } catch {
      setCopyStatus('Copied!');
      setTimeout(() => setCopyStatus('Share Prompt ↗'), 2400);
    }
  };

  // Select entry from drawer
  const handleSelectDrawerEntry = (entry) => {
    playClick();
    setCurrentEntryId(entry.id);
    setTitle(entry.title || '');
    setBody(entry.body || '');
    setSessionLabel(entry.session || getTimeOfDaySession());
    setIsFavorite(!!entry.isFavorite);
    setIsVoiceNoteActive(!!entry.hasVoiceNote);
    setSavedStatus('Loaded reflection');
    setIsDrawerOpen(false);

    if (entry.promptId) {
      const allQ = getAllQuestions();
      const found = allQ.find((q) => q.id === entry.promptId);
      if (found) {
        const enriched = enrichPrompt(found);
        setActivePrompt(enriched);
        setCompanionPrompts(getCompanionPrompts(enriched.id, 3));
      }
    }
  };

  // Delete current entry
  const handleDeleteCurrent = () => {
    if (!currentEntryId) {
      setTitle('');
      setBody('');
      setSavedStatus('Ready to write');
      return;
    }
    if (window.confirm('Quietly clear this current reflection from your sanctuary?')) {
      playClick();
      const updated = storage.deleteBanjaEntry(currentEntryId);
      setEntries(updated);
      handleNewReflection();
    }
  };

  // Word metrics
  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;
  const readTime = Math.max(1, Math.round(wordCount / 180));

  // Dynamic Date string
  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  }).format(new Date());


  return (
    <div className={`relative min-h-screen font-body-md antialiased transition-colors duration-300 ${
      isDark ? 'bg-[#0a0f0d] text-[#dfe4e0]' : 'bg-surface text-on-surface'
    } ${zenMode ? (isDark ? 'bg-[#0a0f0d]' : 'bg-[#f4fbf7]') : ''}`}>
      {/* 1. Contemplative Check-In Arrival Modal (Mobile Adaptable & Dark Suite Harmonized) */}
      {showArrivalModal && (
        <div
          id="sanctuary-welcome-modal"
          className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 backdrop-blur-md transition-all duration-300 ${
            isDark ? 'bg-[#0a0f0d]/75' : 'bg-primary/30'
          }`}
        >
          <div className={`w-full max-w-3xl max-h-[92vh] overflow-y-auto backdrop-blur-xl rounded-3xl p-6 sm:p-9 relative space-y-5 sm:space-y-7 animate-in fade-in transition-all ${
            isDark
              ? 'bg-[#161e1b] border border-[#2a3832] shadow-[0_24px_60px_rgba(0,0,0,0.5)]'
              : 'bg-[#f8faf7] border border-[#d9e2dc] shadow-[0_28px_80px_rgba(16,30,26,0.22)]'
          }`}>
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className={`inline-flex items-center gap-1.5 text-[11px] sm:text-xs uppercase tracking-wider font-semibold ${
                  isDark ? 'text-[#528e7d]' : 'text-secondary'
                }`}>
                  <span className="material-symbols-outlined text-sm">spa</span>
                  <span>A moment for yourself</span>
                </div>
                <h2 className={`font-serif text-2xl sm:text-4xl font-medium tracking-tight ${
                  isDark ? 'text-[#f0f4f2]' : 'text-primary'
                }`}>
                  How would you like to begin?
                </h2>
                <p className={`max-w-2xl text-sm sm:text-base leading-relaxed ${
                  isDark ? 'text-[#8e9e97]' : 'text-on-surface-variant'
                }`}>
                  Choose a guided reflection or a quiet space to write freely. You can change direction at any time.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  playClick();
                  setShowArrivalModal(false);
                }}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                  isDark
                    ? 'text-[#8e9e97] hover:text-[#f0f4f2] hover:bg-[#1f2824]'
                    : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-low'
                }`}
                title="Close prompt"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Pathway Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option 1: Mindful Check-in (Guided Prompts) */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  playClick();
                  setBanjaMode('guided');
                  setShowArrivalModal(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    playClick();
                    setBanjaMode('guided');
                    setShowArrivalModal(false);
                  }
                }}
                className={`group p-5 sm:p-6 rounded-2xl active:scale-[0.99] transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4 ${
                  isDark
                    ? 'bg-[#1b2521] hover:bg-[#202d27] border border-[#2d3b35] hover:border-[#528e7d]/50 shadow-sm'
                    : 'bg-white/70 hover:bg-white border border-[#e0e7e2] hover:border-secondary/50 hover:shadow-md'
                }`}
              >
                <div className="space-y-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs ${
                    isDark
                      ? 'bg-[#161e1b] border border-[#2d3b35] text-[#528e7d]'
                      : 'bg-surface-container text-secondary'
                  }`}>
                    <span className="material-symbols-outlined text-xl">psychology_alt</span>
                  </div>
                  <h3 className={`font-serif text-base sm:text-lg font-semibold pt-0.5 flex items-center justify-between ${
                    isDark ? 'text-[#f0f4f2]' : 'text-primary'
                  }`}>
                    <span>Mindful Check-in</span>
                    <span className={`material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform ${
                      isDark ? 'text-[#528e7d]' : 'text-secondary'
                    }`}>
                      arrow_forward
                    </span>
                  </h3>
                  <p className={`text-xs leading-relaxed ${
                    isDark ? 'text-[#9bb0a5]' : 'text-on-surface-variant'
                  }`}>
                    Use a thoughtful question to notice what is present and what matters to you today.
                  </p>
                </div>
                <div className={`pt-2 flex items-center gap-1.5 text-xs font-semibold ${
                  isDark ? 'text-[#528e7d]' : 'text-secondary'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-[#528e7d]' : 'bg-secondary'}`}></span>
                  <span>160 Guided Prompts</span>
                </div>
              </div>

              {/* Option 2: Free Expression (Unstructured Writing) */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  playClick();
                  setBanjaMode('free');
                  setShowArrivalModal(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    playClick();
                    setBanjaMode('free');
                    setShowArrivalModal(false);
                  }
                }}
                className={`group p-5 sm:p-6 rounded-2xl active:scale-[0.99] transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4 ${
                  isDark
                    ? 'bg-[#1b2521] hover:bg-[#202d27] border border-[#2d3b35] hover:border-[#528e7d]/50 shadow-sm'
                    : 'bg-white/70 hover:bg-white border border-[#e0e7e2] hover:border-secondary/50 hover:shadow-md'
                }`}
              >
                <div className="space-y-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs ${
                    isDark
                      ? 'bg-[#161e1b] border border-[#2d3b35] text-[#528e7d]'
                      : 'bg-surface-container text-secondary'
                  }`}>
                    <span className="material-symbols-outlined text-xl">edit_note</span>
                  </div>
                  <h3 className={`font-serif text-base sm:text-lg font-semibold pt-0.5 flex items-center justify-between ${
                    isDark ? 'text-[#f0f4f2]' : 'text-primary'
                  }`}>
                    <span>Free Expression</span>
                    <span className={`material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform ${
                      isDark ? 'text-[#528e7d]' : 'text-secondary'
                    }`}>
                      arrow_forward
                    </span>
                  </h3>
                  <p className={`text-xs leading-relaxed ${
                    isDark ? 'text-[#9bb0a5]' : 'text-on-surface-variant'
                  }`}>
                    Write without a prompt and let your thoughts take shape at your own pace.
                  </p>
                </div>
                <div className={`pt-2 flex items-center gap-1.5 text-xs font-semibold ${
                  isDark ? 'text-[#528e7d]' : 'text-secondary'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-[#528e7d]' : 'bg-secondary'}`}></span>
                  <span>Unstructured Writing</span>
                </div>
              </div>
            </div>

            {/* Modal Bottom Status */}
            <div className={`pt-2 flex items-center justify-between text-xs border-t ${
              isDark ? 'border-[#2d3a35] text-[#72847d]' : 'border-outline-variant/30 text-on-surface-variant'
            }`}>
              <span className={`flex items-center gap-1.5 text-[11px] sm:text-xs ${
                isDark ? 'text-[#72847d]' : 'text-outline'
              }`}>
                <span className={`material-symbols-outlined text-sm ${isDark ? 'text-[#528e7d]' : 'text-secondary'}`}>nest_clock_farsight_analog</span>
                <span>A quiet space at your own pace</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  playClick();
                  setShowArrivalModal(false);
                }}
                className={`transition-colors font-medium py-1 px-2 text-xs cursor-pointer ${
                  isDark ? 'text-[#528e7d] hover:text-[#95d3c0] hover:underline' : 'hover:text-primary hover:underline text-secondary'
                }`}
              >
                Start without choosing →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Sanctuary Sub-Navigation Bar */}
      <header className={`sticky top-0 left-0 w-full z-40 backdrop-blur-md transition-colors ${
        isDark
          ? 'bg-[#0f1412]/90 border-b border-[#2d3a35] shadow-[0_1px_12px_rgba(0,0,0,0.5)]'
          : 'bg-surface-container-lowest/90 border-b border-outline-variant/30 shadow-[0_1px_6px_rgba(16,30,26,0.04)]'
      }`}>
        <div className="h-14 w-full mx-auto px-4 sm:px-6 lg:px-10 2xl:px-12 flex items-center justify-between gap-2">
          {/* Breadcrumb Left */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <button
              onClick={() => {
                playClick();
                if (onNavigate) onNavigate('home');
              }}
              className={`flex items-center gap-1 transition-colors text-xs font-medium py-1 px-2 rounded-lg cursor-pointer ${
                isDark
                  ? 'text-[#8e9e97] hover:text-[#e1e8e4] hover:bg-[#181d1b]'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
              }`}
              title="Return to Sanctuary"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span className="hidden sm:inline">Sanctuary</span>
            </button>
            <span className={`text-xs ${isDark ? 'text-[#404945]' : 'text-outline-variant'}`}>/</span>
            <div className="flex items-center gap-1.5">
              <span className={`material-symbols-outlined text-lg ${isDark ? 'text-[#95d3c0]' : 'text-secondary'}`}>auto_stories</span>
              <span className={`font-headline-md text-sm sm:text-base font-bold tracking-tight ${
                isDark ? 'text-[#f0f4f2]' : 'text-on-surface'
              }`}>
                Banja
              </span>
              <span className={`hidden xs:inline-block px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider font-semibold border ${
                isDark
                  ? 'bg-[#1c211f] text-[#8e9e97] border-[#2d3a35]'
                  : 'bg-surface-container text-on-surface-variant border-outline-variant/30'
              }`}>
                Studio
              </span>
            </div>
          </div>

          {/* Mode Switcher Tabs Center (Desktop/Tablet) */}
          <div className={`hidden md:flex items-center p-1 rounded-xl border shadow-2xs ${
            isDark ? 'bg-[#111614] border-[#2d3a35]' : 'bg-surface-container-low/70 border-outline-variant/30'
          }`}>
            <button
              type="button"
              onClick={() => {
                playClick();
                setBanjaMode('guided');
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                banjaMode === 'guided'
                  ? (isDark ? 'bg-[#1f2724] text-[#f0f4f2] font-semibold shadow-xs' : 'bg-surface-container-lowest text-primary font-semibold shadow-xs')
                  : (isDark ? 'text-[#8e9e97] hover:text-[#e1e8e4]' : 'text-on-surface-variant hover:text-primary')
              }`}
            >
              <span className={`material-symbols-outlined text-[16px] ${isDark ? 'text-[#95d3c0]' : 'text-secondary'}`}>explore</span>
              <span>Mindful Check-in</span>
            </button>
            <button
              type="button"
              onClick={() => {
                playClick();
                setBanjaMode('free');
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                banjaMode === 'free'
                  ? (isDark ? 'bg-[#1f2724] text-[#f0f4f2] font-semibold shadow-xs' : 'bg-surface-container-lowest text-primary font-semibold shadow-xs')
                  : (isDark ? 'text-[#8e9e97] hover:text-[#e1e8e4]' : 'text-on-surface-variant hover:text-primary')
              }`}
            >
              <span className={`material-symbols-outlined text-[16px] ${isDark ? 'text-[#95d3c0]' : 'text-secondary'}`}>edit_note</span>
              <span>Free Expression</span>
            </button>
          </div>

          {/* Quick Action Buttons Right */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Arrival Modal Toggle */}
            <button
              type="button"
              onClick={() => {
                playClick();
                setShowArrivalModal(true);
              }}
              className={`inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${
                isDark
                  ? 'bg-[#181d1b] border-[#2d3a35] text-[#8e9e97] hover:text-[#e1e8e4] hover:bg-[#1f2724]'
                  : 'bg-surface-container-low hover:bg-surface-container text-secondary border-outline-variant/30'
              }`}
              title="Arrival Mode Check-In"
            >
              <span className="material-symbols-outlined text-[16px]">spa</span>
              <span className="hidden sm:inline">Pathways</span>
            </button>

            {/* Spotify Player Panel Toggle (in Free Mode) */}
            {banjaMode === 'free' && (
              <button
                onClick={() => {
                  playClick();
                  setShowAtmosphere(!showAtmosphere);
                }}
                className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${
                  showAtmosphere
                    ? (isDark ? 'bg-[#204f43] text-[#bbeddc] border-[#2d3a35]' : 'bg-secondary-container text-primary border-secondary/30')
                    : (isDark ? 'bg-[#181d1b] text-[#8e9e97] border-[#2d3a35] hover:bg-[#1f2724]' : 'bg-surface-container-low text-on-surface-variant border-outline-variant/30 hover:bg-surface-container')
                }`}
                title={showAtmosphere ? 'Hide Spotify player' : 'Show Spotify player'}
              >
                <span className={`material-symbols-outlined text-[16px] ${isDark ? 'text-[#95d3c0]' : 'text-secondary'}`}>psychology_alt</span>
                <span>Spotify</span>
              </button>
            )}

            {/* Notebook Drawer Toggle */}
            <button
              onClick={() => {
                playClick();
                setIsDrawerOpen(true);
              }}
              className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${
                isDark
                  ? 'bg-[#181d1b] border-[#2d3a35] text-[#8e9e97] hover:text-[#e1e8e4] hover:bg-[#1f2724]'
                  : 'bg-surface-container-low hover:bg-surface-container text-on-surface border-outline-variant/30'
              }`}
              title="Open Notebook"
            >
              <span className={`material-symbols-outlined text-[17px] ${isDark ? 'text-[#95d3c0]' : 'text-secondary'}`}>menu_book</span>
              <span className="hidden sm:inline">Notebook</span>
              <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${
                isDark ? 'bg-[#204f43] text-[#95d3c0]' : 'bg-secondary-container text-secondary'
              }`}>
                {entries.length}
              </span>
            </button>

            {/* Zen Mode Toggle */}
            <button
              onClick={() => {
                playClick();
                setZenMode(!zenMode);
              }}
              className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl transition-colors cursor-pointer ${
                zenMode
                  ? (isDark ? 'bg-[#204f43] text-[#95d3c0] shadow-xs' : 'bg-secondary text-white shadow-xs')
                  : (isDark ? 'text-[#8e9e97] hover:text-[#e1e8e4] hover:bg-[#181d1b]' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low')
              }`}
              title={zenMode ? 'Exit Zen Mode' : 'Zen Focus Mode'}
            >
              <span className="material-symbols-outlined text-[18px]">
                {zenMode ? 'fullscreen_exit' : 'fit_screen'}
              </span>
            </button>

            {/* Theme Mode Toggle Button */}
            <button
              onClick={() => {
                playClick();
                toggleTheme();
              }}
              className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl transition-all cursor-pointer ${
                isDark
                  ? 'bg-[#181d1b] border border-[#2d3a35] text-[#95d3c0] hover:text-white hover:bg-[#1f2724]'
                  : 'bg-surface-container-low border border-outline-variant/30 text-secondary hover:text-primary hover:bg-surface-container'
              }`}
              title={isDark ? "Switch to Light Mode (Mint Alabaster)" : "Switch to Dark Mode (Obsidian Sanctuary)"}
              aria-label="Toggle theme mode"
            >
              <span className="material-symbols-outlined text-[18px]">
                {isDark ? 'light_mode' : 'dark_mode'}
              </span>
            </button>


          </div>
        </div>
      </header>

      {/* Mobile Sub-Navigation Segmented Control (< md) */}
      <div className={`md:hidden w-full px-3 py-2 backdrop-blur-md flex items-center justify-center sticky top-14 z-30 shadow-xs border-b ${
        isDark ? 'bg-[#0f1412]/95 border-[#2d3a35]' : 'bg-surface-container-lowest/95 border-outline-variant/25'
      }`}>
        <div className={`flex w-full max-w-xs items-center p-1 rounded-xl border shadow-2xs ${
          isDark ? 'bg-[#111614] border-[#2d3a35]' : 'bg-surface-container-low border-outline-variant/30'
        }`}>
          <button
            type="button"
            onClick={() => {
              playClick();
              setBanjaMode('guided');
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              banjaMode === 'guided'
                ? (isDark ? 'bg-[#1f2724] text-[#f0f4f2] shadow-xs' : 'bg-surface-container-lowest text-primary shadow-xs')
                : (isDark ? 'text-[#8e9e97]' : 'text-on-surface-variant')
            }`}
          >
            <span className={`material-symbols-outlined text-[16px] ${isDark ? 'text-[#95d3c0]' : 'text-secondary'}`}>explore</span>
            <span>Check-in</span>
          </button>
          <button
            type="button"
            onClick={() => {
              playClick();
              setBanjaMode('free');
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              banjaMode === 'free'
                ? (isDark ? 'bg-[#1f2724] text-[#f0f4f2] shadow-xs' : 'bg-surface-container-lowest text-primary shadow-xs')
                : (isDark ? 'text-[#8e9e97]' : 'text-on-surface-variant')
            }`}
          >
            <span className={`material-symbols-outlined text-[16px] ${isDark ? 'text-[#95d3c0]' : 'text-secondary'}`}>edit_note</span>
            <span>Free Write</span>
          </button>
        </div>
      </div>

      {/* 2. Main Body Viewport */}
      <main className="w-full mx-auto px-4 sm:px-6 lg:px-10 2xl:px-12 py-4 sm:py-8 flex flex-col items-center pb-28 sm:pb-24">
        {/* ========================================================================= */}
        {/* VIEW A: GUIDED INQUIRY & DEEP QUESTIONS (Stitch Screen 91d320b8)           */}
        {/* ========================================================================= */}
        {banjaMode === 'guided' && activePrompt && (
          <div className="flex flex-col w-full animate-in fade-in">
            {/* Atmospheric Scrim & Ambient Gradient Backdrop */}
            <div className="relative w-full overflow-hidden">
              <div className={`absolute -top-32 left-1/2 -translate-x-1/2 w-[880px] h-[340px] rounded-full blur-3xl pointer-events-none -z-10 ${
                isDark
                  ? 'bg-gradient-to-b from-[#204f43]/30 via-[#181d1b]/40 to-transparent'
                  : 'bg-gradient-to-b from-secondary-fixed/40 via-surface-container/30 to-transparent'
              }`}></div>

              {/* Sub-navigation & Zen Breadcrumb Context */}
              {!zenMode && (
                <div className="w-full mx-auto pb-3 sm:pb-4">
                  <div className={`flex flex-wrap items-center justify-between gap-2 sm:gap-3 text-[11px] sm:text-xs ${
                    isDark ? 'text-[#8e9e97]' : 'text-on-surface-variant'
                  }`}>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className={`material-symbols-outlined text-sm sm:text-base ${isDark ? 'text-[#95d3c0]' : 'text-secondary'}`}>spa</span>
                      <span className={`transition-colors cursor-pointer ${isDark ? 'hover:text-[#95d3c0]' : 'hover:text-primary'}`}>Sanctuary Chamber</span>
                      <span className={isDark ? 'text-[#404945]' : 'text-outline-variant'}>/</span>
                      <span className={`font-medium tracking-tight ${isDark ? 'text-[#95d3c0]' : 'text-primary'}`}>Guided Inquiry</span>
                    </div>
                    <div className={`flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs ${
                      isDark ? 'text-[#8e9e97]' : 'text-on-surface-variant'
                    }`}>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-medium ${
                        isDark ? 'bg-[#1c211f] border border-[#2d3a35] text-[#95d3c0]' : 'bg-surface-container-high/60 text-secondary'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-[#95d3c0]' : 'bg-secondary'}`}></span>
                        <span>Mindful Solitude</span>
                      </span>
                      <span className={`hidden sm:inline-block ${isDark ? 'text-[#404945]' : 'text-outline-variant'}`}>•</span>
                      <span className={`hidden sm:inline-block font-mono ${isDark ? 'text-[#72847d]' : 'text-outline'}`}>
                        Deck {String(activePrompt.id).padStart(2, '0')}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Mindful Greeting & Cognitive Orientation */}
              {!zenMode && (
                <section className="w-full mx-auto pt-1 sm:pt-2 pb-4 sm:pb-6">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 sm:gap-4">
                    <div className="space-y-1 max-w-2xl">
                      <div className={`inline-flex items-center gap-1.5 text-[11px] sm:text-xs uppercase tracking-wider font-semibold ${
                        isDark ? 'text-[#95d3c0]' : 'text-secondary'
                      }`}>
                        <span className="material-symbols-outlined text-sm">psychology_alt</span>
                        <span>Contemplative Encounter</span>
                      </div>
                      <h1 className={`font-serif text-xl sm:text-3xl font-semibold tracking-tight ${
                        isDark ? 'text-[#f0f4f2]' : 'text-primary'
                      }`}>
                        Sit with a question. Let the answer unfold.
                      </h1>
                      <p className={`text-xs sm:text-sm leading-relaxed ${
                        isDark ? 'text-[#8e9e97]' : 'text-on-surface-variant'
                      }`}>
                        Gentle inquiries for solitary contemplation or meaningful shared dialogue. Unhurried, attentive, and grounded in the present.
                      </p>
                    </div>

                    {/* Mode & Date Pill Cluster */}
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs flex items-center gap-1.5 border shadow-2xs ${
                        isDark
                          ? 'bg-[#181d1b] border-[#2d3a35] text-[#8e9e97]'
                          : 'bg-surface-container-lowest border-outline-variant/30 text-on-surface-variant'
                      }`}>
                        <span className={`material-symbols-outlined text-xs sm:text-sm ${isDark ? 'text-[#95d3c0]' : 'text-secondary'}`}>calendar_today</span>
                        <span>{todayFormatted}</span>
                      </span>

                      {/* Inquiry Deck Dropdown Selector */}
                      <div className="relative inline-flex items-center max-w-full">
                        <span className={`absolute left-2.5 sm:left-3 material-symbols-outlined text-xs sm:text-sm pointer-events-none ${
                          isDark ? 'text-[#95d3c0]' : 'text-secondary'
                        }`}>auto_stories</span>
                        <select
                          aria-label="Select Inquiry Deck Category"
                          value={selectedCategory}
                          onChange={(e) => {
                            playClick();
                            setSelectedCategory(e.target.value);
                          }}
                          className={`pl-7 sm:pl-8 pr-6 sm:pr-7 py-1 sm:py-1.5 rounded-full shadow-2xs text-[11px] sm:text-xs font-medium border appearance-none outline-none cursor-pointer max-w-[210px] xs:max-w-[260px] sm:max-w-none truncate ${
                            isDark
                              ? 'bg-[#181d1b] border-[#2d3a35] text-[#e1e8e4]'
                              : 'bg-surface-container-lowest border-outline-variant/30 text-primary'
                          }`}
                        >
                          <option value="">Inquiry Deck: All 14 Decks (160)</option>
                          {categories.map((c) => (
                            <option key={c.name} value={c.name}>
                              Deck: {c.name} ({c.count})
                            </option>
                          ))}
                        </select>
                        <span className={`absolute right-2 material-symbols-outlined text-xs pointer-events-none ${
                          isDark ? 'text-[#72847d]' : 'text-outline'
                        }`}>expand_more</span>
                      </div>

                      <span className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold flex items-center gap-1 border ${
                        isDark
                          ? 'bg-[#204f43] border-[#2d3a35] text-[#bbeddc]'
                          : 'bg-secondary-container/70 border-secondary/20 text-on-secondary-container'
                      }`}>
                        <span className="material-symbols-outlined text-xs sm:text-sm">edit_note</span>
                        <span>Reflective Journaling</span>
                      </span>
                    </div>
                  </div>
                </section>
              )}

              {/* Core Interactive Inquiry & Dialogue Surface (Central Sacred Vessel) */}
              <section className="w-full mx-auto pb-8 sm:pb-10">
                <article className={`rounded-2xl relative overflow-hidden transition-all duration-300 ${
                  isDark
                    ? 'bg-[#181d1b] rounded-xl shadow-2xl'
                    : 'bg-surface-container-lowest shadow-md'
                }`}>
                  <div className="p-4 sm:p-8 md:p-10 space-y-5 sm:space-y-6">
                    {/* Inquiry Selector & Navigation Controls */}
                    <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 pb-3 sm:pb-4 -mx-4 sm:-mx-8 md:-mx-10 px-4 sm:px-8 md:px-10 -mt-4 sm:-mt-8 md:-mt-10 pt-4 sm:pt-6 border-b ${
                      isDark
                        ? 'bg-[#141a17]/70 border-[#2d3a35]/60'
                        : 'bg-surface-container-low/40 border-outline-variant/20'
                    }`}>
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <span className={`px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs tracking-wider uppercase font-semibold ${
                          isDark
                            ? 'bg-[#1f2724] border border-[#2d3a35] text-[#95d3c0]'
                            : 'bg-surface-container text-primary'
                        }`}>
                          {activePrompt.code}
                        </span>
                        <span className={`text-[11px] sm:text-xs flex items-center gap-1 font-medium ${
                          isDark ? 'text-[#8e9e97]' : 'text-on-surface-variant'
                        }`}>
                          <span className={`material-symbols-outlined text-xs sm:text-sm ${isDark ? 'text-[#95d3c0]' : 'text-secondary'}`}>nest_clock_farsight_analog</span>
                          <span>{activePrompt.pauseMinutes} min pause</span>
                        </span>
                      </div>

                      {/* Sequential & Random Navigation Pill */}
                      <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto justify-between sm:justify-end">
                        <div className={`inline-flex items-center rounded-xl p-1 shadow-2xs border ${
                          isDark
                            ? 'bg-[#111614] border-[#2d3a35]'
                            : 'bg-surface-container-low border-outline-variant/25'
                        }`}>
                          <button
                            type="button"
                            onClick={handlePrevInquiry}
                            className={`px-2 sm:px-2.5 py-1 rounded-lg transition-colors text-xs flex items-center gap-1 cursor-pointer ${
                              isDark
                                ? 'text-[#8e9e97] hover:text-[#e1e8e4] hover:bg-[#1f2724]'
                                : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-lowest'
                            }`}
                            title="Previous Inquiry"
                          >
                            <span className="material-symbols-outlined text-sm">arrow_back</span>
                            <span className="inline font-medium text-[11px] sm:text-xs">Prev</span>
                          </button>
                          <span className={`px-2 sm:px-3 text-[11px] sm:text-xs font-medium font-mono ${
                            isDark ? 'text-[#8e9e97]' : 'text-on-surface-variant'
                          }`}>
                            {currentPromptIndex + 1} / {currentDeckQuestions.length}
                          </span>
                          <button
                            type="button"
                            onClick={handleNextInquiry}
                            className={`px-2 sm:px-2.5 py-1 rounded-lg transition-colors text-xs flex items-center gap-1 cursor-pointer ${
                              isDark
                                ? 'text-[#8e9e97] hover:text-[#e1e8e4] hover:bg-[#1f2724]'
                                : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-lowest'
                            }`}
                            title="Next Inquiry"
                          >
                            <span className="inline font-medium text-[11px] sm:text-xs">Next</span>
                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={handleShuffleInquiry}
                          disabled={isPromptLoading}
                          className={`px-2.5 sm:px-3 py-1.5 rounded-xl transition-colors text-xs flex items-center gap-1 shadow-2xs border cursor-pointer ${
                            isDark
                              ? 'bg-[#111614] border-[#2d3a35] text-[#8e9e97] hover:bg-[#1f2724] hover:text-[#e1e8e4]'
                              : 'bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant hover:text-primary border-outline-variant/25'
                          }`}
                          title="Shuffle prompt randomly"
                        >
                          <span className={`material-symbols-outlined text-sm sm:text-base ${isDark ? 'text-[#95d3c0]' : ''} ${isPromptLoading ? 'animate-spin' : ''}`}>shuffle</span>
                          <span className="font-medium text-[11px] sm:text-xs">Shuffle</span>
                        </button>
                      </div>
                    </div>

                    {/* The Featured Deep Question */}
                    <div className="space-y-4 pt-1">
                      <div className="space-y-2">
                        <p className={`text-[11px] sm:text-xs uppercase tracking-widest font-semibold flex items-center gap-1.5 ${
                          isDark ? 'text-[#95d3c0]' : 'text-secondary'
                        }`}>
                          <span className={`w-2 h-2 rounded-full animate-pulse ${isDark ? 'bg-[#95d3c0]' : 'bg-secondary'}`}></span>
                          <span>Primary Inquiry</span>
                        </p>
                        <h2 className={`font-serif text-xl sm:text-3xl md:text-4xl font-normal tracking-tight italic leading-snug sm:leading-relaxed text-balance ${
                          isDark ? 'text-[#f0f4f2]' : 'text-primary'
                        }`}>
                          “{activePrompt.question}”
                        </h2>
                      </div>

                      {/* Contextual Conversational Talking Points (Solo or Shared Dialogue) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 pt-1">
                        {/* Point 1: Somatic Resonance */}
                        <div className={`p-3.5 sm:p-4 rounded-xl flex flex-col justify-between ${
                          isDark
                            ? 'bg-[#141a17]'
                            : 'bg-surface-container-low'
                        }`}>
                          <div className="space-y-1">
                            <div className={`flex items-center gap-1.5 text-xs font-semibold ${
                              isDark ? 'text-[#95d3c0]' : 'text-secondary'
                            }`}>
                              <span className="material-symbols-outlined text-base">accessibility_new</span>
                              <span>{activePrompt.somaticPoint.title}</span>
                            </div>
                            <p className={`text-xs leading-relaxed ${
                              isDark ? 'text-[#8e9e97]' : 'text-on-surface-variant'
                            }`}>
                              {activePrompt.somaticPoint.text}
                            </p>
                          </div>
                          <div className={`mt-3 pt-2 border-t flex items-center gap-1.5 text-[11px] ${
                            isDark ? 'border-[#2d3a35]/60 text-[#72847d]' : 'border-outline-variant/15 text-on-surface-variant'
                          }`}>
                            <span className={`material-symbols-outlined text-xs ${isDark ? 'text-[#95d3c0]' : 'text-secondary'}`}>record_voice_over</span>
                            <span>{activePrompt.somaticPoint.instruction}</span>
                          </div>
                        </div>

                        {/* Point 2: Gentle Release */}
                        <div className={`p-3.5 sm:p-4 rounded-xl flex flex-col justify-between ${
                          isDark
                            ? 'bg-[#141a17]'
                            : 'bg-surface-container-low'
                        }`}>
                          <div className="space-y-1">
                            <div className={`flex items-center gap-1.5 text-xs font-semibold ${
                              isDark ? 'text-[#95d3c0]' : 'text-secondary'
                            }`}>
                              <span className="material-symbols-outlined text-base">lock_open_right</span>
                              <span>{activePrompt.releasePoint.title}</span>
                            </div>
                            <p className={`text-xs leading-relaxed ${
                              isDark ? 'text-[#8e9e97]' : 'text-on-surface-variant'
                            }`}>
                              {activePrompt.releasePoint.text}
                            </p>
                          </div>
                          <div className={`mt-3 pt-2 border-t flex items-center gap-1.5 text-[11px] ${
                            isDark ? 'border-[#2d3a35]/60 text-[#72847d]' : 'border-outline-variant/15 text-on-surface-variant'
                          }`}>
                            <span className={`material-symbols-outlined text-xs ${isDark ? 'text-[#95d3c0]' : 'text-secondary'}`}>question_answer</span>
                            <span>{activePrompt.releasePoint.instruction}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Meditative Divider */}
                    <div className="relative py-1 sm:py-2 flex items-center justify-center">
                      <div className="absolute inset-0 flex items-center">
                        <div className={`w-full h-px ${isDark ? 'bg-[#2d3a35]' : 'bg-outline-variant/30'}`}></div>
                      </div>
                      <div className={`relative px-3 flex items-center gap-1.5 text-xs ${
                        isDark ? 'bg-[#181d1b] text-[#8e9e97]' : 'bg-surface-container-lowest text-on-surface-variant'
                      }`}>
                        <span className={`material-symbols-outlined text-sm ${isDark ? 'text-[#95d3c0]' : 'text-secondary'}`}>filter_vintage</span>
                        <span className="font-medium">Your Sanctuary Response</span>
                      </div>
                    </div>

                    {/* Active Reflection Response Form */}
                    <div className="space-y-3 sm:space-y-4">
                      {/* Reflection Heading Field with Inline Soundscape Pill */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex-1 space-y-1">
                          <label htmlFor="reflection-title-input" className={`text-xs uppercase tracking-wider font-medium ${
                            isDark ? 'text-[#8e9e97]' : 'text-on-surface-variant'
                          }`}>
                            Reflection Heading
                          </label>
                          <input
                            id="reflection-title-input"
                            type="text"
                            value={title}
                            onChange={handleTitleChange}
                            placeholder="Unfolding thoughts on this inquiry..."
                          className={`w-full font-serif text-base sm:text-xl font-semibold px-3 py-2 rounded-xl focus:outline-none focus:ring-2 ${
                              isDark
                              ? 'bg-[#111614] text-[#f0f4f2] placeholder:text-[#65736c] focus:ring-[#95d3c0]'
                              : 'bg-surface-container-low/60 text-primary placeholder:text-outline-variant focus:ring-secondary/40'
                            }`}
                          />
                        </div>


                      </div>

                      {/* Contemplative Response Textarea */}
                      <div className="space-y-1">
                        <label htmlFor="reflection-body-textarea" className="sr-only">
                          Your Reflective Thoughts
                        </label>
                        <textarea
                          id="reflection-body-textarea"
                          ref={textareaRef}
                          value={body}
                          onChange={handleBodyChange}
                          placeholder="Write whatever arises without judgment. Let thoughts arrive as pebbles falling into clean water..."
                          rows={5}
                          className={`w-full min-h-[140px] sm:min-h-[180px] font-serif text-base sm:text-lg leading-relaxed p-3.5 sm:p-4 rounded-xl focus:outline-none focus:ring-2 resize-y ${
                            isDark
                              ? 'bg-[#111614] text-[#e1e8e4] placeholder:text-[#72847d] focus:ring-[#95d3c0]'
                              : 'bg-surface-container-low/50 text-on-surface placeholder:text-on-surface-variant/60 focus:ring-secondary/40'
                          }`}
                        />
                      </div>

                      {/* Reflection Metadata & Voice Note Indicator */}
                      <div className={`flex flex-col xs:flex-row xs:items-center justify-between gap-2 text-xs p-2.5 sm:p-3 rounded-xl ${
                        isDark
                          ? 'bg-[#141a17] text-[#8e9e97]'
                          : 'bg-surface-container-low/40 text-on-surface-variant'
                      }`}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`flex items-center gap-1 font-medium ${
                            isDark ? 'text-[#e1e8e4]' : 'text-primary'
                          }`}>
                            <span className={`material-symbols-outlined text-sm ${isDark ? 'text-[#95d3c0]' : 'text-secondary'}`}>format_align_left</span>
                            <span>{wordCount} words</span>
                          </span>
                          <span className={isDark ? 'text-[#404945]' : 'text-outline-variant'}>•</span>
                          <span>{readTime} min read</span>
                          <span className={isDark ? 'text-[#404945]' : 'text-outline-variant'}>•</span>
                          <span className={`font-medium flex items-center gap-1 ${
                            isDark ? 'text-[#95d3c0]' : 'text-secondary'
                          }`}>
                            <span className="material-symbols-outlined text-sm">cloud_done</span>
                            <span>{savedStatus}</span>
                          </span>
                        </div>

                        {/* Voice Note Attached / Record Pill */}
                        <div className="flex items-center gap-2 self-start xs:self-auto">
                          <button
                            type="button"
                            onClick={() => {
                              playClick();
                              setIsVoiceNoteActive(!isVoiceNoteActive);
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors shadow-2xs border ${
                              isDark
                                ? (isVoiceNoteActive
                                    ? 'bg-[#204f43] border-[#528e7d] text-[#bbeddc]'
                                    : 'bg-[#1f2724] border-[#2d3a35] text-[#e1e8e4] hover:bg-[#26312d]')
                                : (isVoiceNoteActive
                                    ? 'bg-secondary/15 text-primary border-secondary/40'
                                    : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant/30 hover:bg-surface-container')
                            }`}
                          >
                            <span className={`material-symbols-outlined text-sm ${isDark ? 'text-[#95d3c0]' : 'text-secondary'}`}>mic</span>
                            <span>{isVoiceNoteActive ? 'Voice note attached (02:14)' : 'Attach Voice Note'}</span>
                            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                              isDark ? 'bg-[#95d3c0] text-[#00382d]' : 'bg-secondary text-white'
                            }`}>
                              {isVoiceNoteActive ? '✓' : '+'}
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Action Ribbon (Mobile Grid Friendly) */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2">
                        <div className="grid grid-cols-1 xs:grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full sm:w-auto">
                          <button
                            type="button"
                            onClick={() => {
                              playClick();
                              saveCurrent(title, body, isFavorite);
                            }}
                            className={`min-h-[42px] px-4 py-2 rounded-xl active:scale-[0.98] transition-all duration-200 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md cursor-pointer ${
                              isDark
                                ? 'bg-[#95d3c0] text-[#00382d] hover:bg-[#b1efdb]'
                                : 'bg-primary-container text-surface-container-lowest hover:bg-primary'
                            }`}
                          >
                            <span className="material-symbols-outlined text-base">bookmark_add</span>
                            <span>Save to Notebook</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              playClick();
                              setIsVoiceNoteActive(!isVoiceNoteActive);
                            }}
                            className={`min-h-[42px] px-3.5 py-2 rounded-xl active:scale-[0.98] transition-colors text-xs font-medium flex items-center justify-center gap-1.5 shadow-2xs border cursor-pointer ${
                              isDark
                                ? 'bg-[#1f2724] border-[#2d3a35] hover:bg-[#26312d] text-[#e1e8e4]'
                                : 'bg-surface-container-low hover:bg-surface-container-high text-primary border-outline-variant/30'
                            }`}
                          >
                            <span className={`material-symbols-outlined text-base ${isDark ? 'text-[#95d3c0]' : 'text-secondary'}`}>mic_external_on</span>
                            <span>{isVoiceNoteActive ? 'Recorded Note' : 'Voice Dialogue'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleNewReflection}
                            className={`min-h-[42px] px-3.5 py-2 rounded-xl active:scale-[0.98] transition-colors text-xs font-medium flex items-center justify-center gap-1.5 shadow-2xs border cursor-pointer ${
                              isDark
                                ? 'bg-[#1f2724] border-[#2d3a35] hover:bg-[#26312d] text-[#8e9e97] hover:text-[#e1e8e4]'
                                : 'bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant hover:text-primary border-outline-variant/30'
                            }`}
                          >
                            <span className="material-symbols-outlined text-base">add</span>
                            <span>+ New Reflection</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-2 pt-1 sm:pt-0">
                          <button
                            type="button"
                            onClick={handleSharePrompt}
                            className={`w-full sm:w-auto min-h-[42px] px-3.5 py-2 rounded-xl active:scale-[0.98] transition-colors text-xs font-medium flex items-center justify-center gap-1.5 shadow-2xs border cursor-pointer ${
                              isDark
                                ? 'bg-[#141a17] border-[#2d3a35] hover:bg-[#1f2724] text-[#8e9e97] hover:text-[#e1e8e4]'
                                : 'bg-surface-container-lowest hover:bg-surface-container-low text-on-surface-variant hover:text-primary border-outline-variant/30'
                            }`}
                            title="Share or copy prompt"
                          >
                            <span className="material-symbols-outlined text-base">ios_share</span>
                            <span>{copyStatus}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              </section>

              {/* Secondary Companion Questions / Inquiry Carousel (Alternative Horizons) */}
              <section className="w-full mx-auto pb-8 sm:pb-10">
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-[11px] sm:text-xs uppercase tracking-wider font-semibold ${
                        isDark ? 'text-[#95d3c0]' : 'text-secondary'
                      }`}>
                        Alternative Horizons
                      </p>
                      <h3 className={`font-serif text-lg sm:text-2xl font-semibold ${
                        isDark ? 'text-[#f0f4f2]' : 'text-primary'
                      }`}>
                        Companion Inquiries for Today
                      </h3>
                    </div>
                    <span className={`text-[11px] sm:text-xs hidden sm:inline ${
                      isDark ? 'text-[#72847d]' : 'text-on-surface-variant'
                    }`}>
                      Tap any card to bring to primary focus
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                    {companionPrompts.map((comp) => (
                      <div
                        key={comp.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSelectCompanion(comp)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') handleSelectCompanion(comp);
                        }}
                        className={`p-4 sm:p-5 rounded-xl border active:scale-[0.98] transition-all duration-200 cursor-pointer flex flex-col justify-between group ${
                          isDark
                            ? 'bg-[#181d1b] border-[#2d3a35] shadow-sm hover:border-[#95d3c0]/40 hover:bg-[#1f2724]'
                            : 'bg-surface-container-lowest border-outline-variant/30 shadow-2xs hover:shadow-md hover:border-secondary/40'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                              isDark
                                ? 'bg-[#1f2724] border-[#2d3a35] text-[#95d3c0]'
                                : 'bg-surface-container text-secondary border-outline-variant/20'
                            }`}>
                              #{String(comp.id).padStart(3, '0')} · {comp.category}
                            </span>
                            <span className={`material-symbols-outlined text-base transition-transform group-hover:translate-x-1 ${
                              isDark ? 'text-[#8e9e97] group-hover:text-[#95d3c0]' : 'text-on-surface-variant group-hover:text-primary'
                            }`}>
                              arrow_forward
                            </span>
                          </div>
                          <h4 className={`font-serif text-base sm:text-lg italic font-medium ${
                            isDark ? 'text-[#f0f4f2]' : 'text-primary'
                          }`}>
                            “{comp.shortTitle}”
                          </h4>
                          <p className={`text-xs leading-relaxed line-clamp-3 ${
                            isDark ? 'text-[#8e9e97]' : 'text-on-surface-variant'
                          }`}>
                            {comp.question}
                          </p>
                        </div>
                        <div className={`mt-3.5 pt-2 border-t flex items-center justify-between text-xs ${
                          isDark ? 'border-[#2d3a35]/60 text-[#72847d]' : 'border-outline-variant/15 text-on-surface-variant'
                        }`}>
                          <span className={`font-medium text-[11px] ${isDark ? 'text-[#8e9e97]' : 'text-secondary'}`}>{comp.shortTitle}</span>
                          <span className={`flex items-center gap-1 font-medium text-[11px] ${
                            isDark ? 'text-[#95d3c0]' : 'text-secondary'
                          }`}>
                            <span className="material-symbols-outlined text-xs">schedule</span>
                            <span>{comp.pauseMinutes} min</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <SpotifyPlayer spotifyUri={settings.spotifyUri} isAuthenticated={isAuthenticated} onSave={(spotify_uri) => updateSettings({ spotify_uri })} />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW B: FREE EXPRESSION MANUSCRIPT SANCTUARY (Original Banja Chamber)      */}
        {/* ========================================================================= */}
        {banjaMode === 'free' && (
          <div className="w-full flex flex-col lg:flex-row items-center lg:items-start justify-between gap-6 animate-in fade-in">
            {/* Main Manuscript Column */}
            <div className="w-full min-w-0 flex-1 flex flex-col">
              {/* Editorial Sanctuary Header */}
              {!zenMode && (
                <header className="w-full flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div className="flex flex-col">
                    <div className={`inline-flex items-center gap-1.5 text-xs uppercase tracking-widest font-semibold mb-1 ${
                      isDark ? 'text-[#8E9E97]' : 'text-secondary'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${isDark ? 'bg-[#404945]' : 'bg-outline'}`}></span>
                      <span>Sanctuary Chamber</span>
                    </div>
                    <h1 className={`font-serif text-xl sm:text-3xl font-semibold tracking-tight ${
                      isDark ? 'text-[#F0F4F2]' : 'text-on-surface'
                    }`}>
                      Take a breath. You're here.
                    </h1>
                    <p className={`text-xs sm:text-sm mt-0.5 ${
                      isDark ? 'text-[#8E9E97]' : 'text-on-surface-variant'
                    }`}>
                      A quiet, open space for your thoughts.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs shadow-2xs ${
                      isDark
                        ? 'bg-[#181D1B] border-[#2D3A35] text-[#8E9E97]'
                        : 'bg-surface-container-lowest border-outline-variant/40 text-on-surface-variant'
                    }`}>
                      <span className={`material-symbols-outlined text-[14px] ${isDark ? 'text-[#95D3C0]' : 'text-secondary'}`}>calendar_today</span>
                      <span>{todayFormatted}</span>
                    </div>
                  </div>
                </header>
              )}

              {/* Main Manuscript Surface Card */}
              <div className={`w-full flex flex-col rounded-2xl border p-4 sm:p-8 relative overflow-hidden transition-all duration-300 ${
                isDark
                  ? 'bg-[#181D1B] border-[#2D3A35] shadow-[0_12px_40px_rgba(0,0,0,0.4)]'
                  : 'bg-surface-container-lowest border-outline-variant/40 shadow-[0_8px_30px_rgba(16,30,26,0.05)]'
              } ${
                zenMode
                  ? isDark
                    ? 'shadow-2xl border-[#95D3C0]/40 ring-1 ring-[#95D3C0]/20 my-2 sm:my-4'
                    : 'shadow-2xl border-secondary/30 ring-1 ring-secondary/20 my-2 sm:my-4'
                  : ''
              }`}>
                {/* Decorative Glow */}
                <div className={`absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl pointer-events-none ${
                  isDark ? 'bg-[#204F43]/20' : 'bg-secondary/5'
                }`}></div>

                {/* Manuscript Meta Strip */}
                <div className={`flex items-center justify-between pb-3 mb-4 border-b text-xs ${
                  isDark
                    ? 'border-[#2D3A35] text-[#8E9E97]'
                    : 'border-outline-variant/25 text-on-surface-variant'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded border font-medium text-[11px] ${
                      isDark
                        ? 'bg-[#141A17] border-[#2D3A35] text-[#95D3C0]'
                        : 'bg-surface-container-low border-outline-variant/30 text-secondary'
                    }`}>
                      <span className="material-symbols-outlined text-[13px]">history_edu</span>
                      <span>Sanctuary Journal</span>
                    </span>
                    <span className={`text-[11px] font-medium ${isDark ? 'text-[#8E9E97]' : 'text-on-surface-variant'}`}>
                      • {sessionLabel}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Toggle Inspire Prompt in Free Mode */}
                    <button
                      onClick={() => {
                        playClick();
                        setShowPromptBanner(!showPromptBanner);
                      }}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        showPromptBanner
                          ? isDark
                            ? 'bg-[#1F2724] text-[#95D3C0] font-semibold border border-[#95D3C0]/40'
                            : 'bg-secondary-container text-primary font-semibold border border-secondary/30'
                          : isDark
                            ? 'text-[#8E9E97] hover:bg-[#1F2724] hover:text-[#F0F4F2] border border-transparent'
                            : 'text-secondary hover:bg-secondary-container/20 border border-transparent'
                      }`}
                      title="Inspire reflection with a mindful prompt"
                    >
                      <span className="material-symbols-outlined text-[15px]">psychology</span>
                      <span>{showPromptBanner ? 'Prompts On' : 'Inspire'}</span>
                    </button>

                    <button
                      onClick={() => {
                        playClick();
                        setIsFavorite(!isFavorite);
                        saveCurrent(title, body, !isFavorite);
                      }}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        isFavorite
                          ? isDark ? 'text-amber-400 bg-amber-950/30' : 'text-amber-500 bg-amber-50'
                          : isDark ? 'text-[#8E9E97] hover:text-[#F0F4F2] hover:bg-[#1F2724]' : 'text-outline hover:text-on-surface hover:bg-surface-container-low'
                      }`}
                      title={isFavorite ? 'Favorited' : 'Bookmark Reflection'}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {isFavorite ? 'bookmark' : 'bookmark_border'}
                      </span>
                    </button>

                    <button
                      onClick={() => setZenMode(!zenMode)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        zenMode
                          ? isDark ? 'text-[#95D3C0] bg-[#1F2724]' : 'text-secondary bg-secondary/10'
                          : isDark ? 'text-[#8E9E97] hover:text-[#F0F4F2] hover:bg-[#1F2724]' : 'text-outline hover:text-on-surface hover:bg-surface-container-low'
                      }`}
                      title="Zen Focus Mode"
                    >
                      <span className="material-symbols-outlined text-[18px]">fit_screen</span>
                    </button>
                  </div>
                </div>

                {/* Optional Inspire Prompt Banner in Free Mode */}
                {showPromptBanner && activePrompt && (
                  <div className={`w-full mb-4 sm:mb-5 rounded-2xl border p-3.5 sm:p-4 text-xs transition-all shadow-2xs ${
                    isDark
                      ? 'bg-[#141A17] border-[#2D3A35]'
                      : 'bg-secondary-container/25 border-secondary/30'
                  }`}>
                    <div className={`flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b ${
                      isDark ? 'border-[#2D3A35]' : 'border-secondary/15'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className={`material-symbols-outlined text-[16px] ${isDark ? 'text-[#95D3C0]' : 'text-secondary'}`}>psychology</span>
                        <span className={`font-semibold uppercase tracking-wider text-[10px] ${isDark ? 'text-[#95D3C0]' : 'text-secondary'}`}>
                          {activePrompt.category}
                        </span>
                        <span className={`text-[10px] font-mono ${isDark ? 'text-[#8E9E97]' : 'text-outline'}`}>#{activePrompt.id}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={handleShuffleInquiry}
                          disabled={isPromptLoading}
                          className={`p-1 rounded-lg transition-colors cursor-pointer ${
                            isDark
                              ? 'text-[#95D3C0] hover:bg-[#1F2724]'
                              : 'text-secondary hover:bg-secondary/15'
                          }`}
                          title="Shuffle next prompt"
                        >
                          <span className={`material-symbols-outlined text-[16px] ${isPromptLoading ? 'animate-spin' : ''}`}>
                            shuffle
                          </span>
                        </button>
                        <button
                          onClick={() => setShowPromptBanner(false)}
                          className={`p-1 rounded-lg transition-colors cursor-pointer ${
                            isDark
                              ? 'text-[#8E9E97] hover:text-[#F0F4F2] hover:bg-[#1F2724]'
                              : 'text-outline hover:text-on-surface hover:bg-surface-container-low'
                          }`}
                          title="Dismiss prompt banner"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      </div>
                    </div>

                    <p className={`font-serif text-sm sm:text-base font-medium italic leading-relaxed my-2 ${
                      isDark ? 'text-[#F0F4F2]' : 'text-on-surface'
                    }`}>
                      “{activePrompt.question}”
                    </p>

                    <div className={`flex flex-wrap items-center gap-2 mt-2 pt-2 border-t ${
                      isDark ? 'border-[#2D3A35]' : 'border-secondary/15'
                    }`}>
                      <button
                        onClick={() => {
                          playClick();
                          setTitle(activePrompt.question);
                          saveCurrent(activePrompt.question, body, isFavorite);
                        }}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer shadow-2xs ${
                          isDark
                            ? 'bg-[#95D3C0] text-[#00382D] hover:bg-[#BBEDDC]'
                            : 'bg-secondary text-white hover:bg-primary'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[13px]">title</span>
                        <span>Use as Title</span>
                      </button>
                      <button
                        onClick={() => {
                          playClick();
                          const promptQuote = `> ${activePrompt.question}\n\n`;
                          const updated = body ? `${promptQuote}${body}` : promptQuote;
                          setBody(updated);
                          saveCurrent(title, updated, isFavorite);
                        }}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer shadow-2xs ${
                          isDark
                            ? 'bg-[#181D1B] hover:bg-[#1F2724] text-[#E1E8E4] border-[#2D3A35]'
                            : 'bg-surface-container-lowest hover:bg-surface-container text-on-surface border-outline-variant/30'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[13px]">post_add</span>
                        <span>Insert in Canvas</span>
                      </button>
                      <button
                        onClick={handleShuffleInquiry}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ml-auto ${
                          isDark
                            ? 'text-[#8E9E97] hover:text-[#95D3C0]'
                            : 'text-on-surface-variant hover:text-primary'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[13px]">casino</span>
                        <span>Next Prompt</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Manuscript Title Input */}
                <div className="w-full mb-3">
                  <input
                    type="text"
                    aria-label="Journal Title"
                    value={title}
                    onChange={handleTitleChange}
                    placeholder="Untitled Reflection..."
                    className={`w-full bg-transparent font-serif text-xl sm:text-3xl font-semibold tracking-tight outline-none focus:placeholder-transparent cursor-text transition-colors ${
                      isDark
                        ? 'text-[#F0F4F2] placeholder:text-[#8E9E97]/40'
                        : 'text-primary placeholder:text-outline/40'
                    }`}
                  />
                </div>

                {/* Manuscript Body Canvas */}
                <div className="w-full relative min-h-[200px] sm:min-h-[240px]">
                  <textarea
                    ref={textareaRef}
                    aria-label="Manuscript content"
                    value={body}
                    onChange={handleBodyChange}
                    placeholder="There is a particular kind of stillness that arrives when you write here... Let thoughts settle into sand."
                    spellCheck="false"
                    className={`w-full bg-transparent font-serif text-base sm:text-lg leading-relaxed outline-none resize-none overflow-hidden cursor-text tracking-normal ${
                      isDark
                        ? 'text-[#E1E8E4] placeholder:text-[#8E9E97]/40'
                        : 'text-on-surface placeholder:text-outline/40'
                    }`}
                  />
                </div>

                {/* Word Metrics & Save Status */}
                <div className={`mt-4 sm:mt-6 pt-3 border-t flex flex-wrap items-center justify-between gap-2 text-xs ${
                  isDark
                    ? 'border-[#2D3A35] text-[#8E9E97]'
                    : 'border-outline-variant/20 text-on-surface-variant'
                }`}>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className={`font-mono text-[11px] ${isDark ? 'text-[#8E9E97]' : 'text-on-surface-variant'}`}>
                      {wordCount} words • {readTime} min read
                    </span>
                    <span className={isDark ? 'text-[#404945]' : 'text-outline-variant'}>•</span>
                    <span className={`inline-flex items-center gap-1.5 text-[11px] ${isDark ? 'text-[#8E9E97]' : 'text-on-surface-variant'}`}>
                      <span className="w-2 h-2 rounded-full bg-[#1db954]"></span>
                      <span>{savedStatus}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-mono text-[11px] ${isDark ? 'text-[#72847D]' : 'text-outline'}`}>
                      Auto-saved locally
                    </span>
                  </div>
                </div>

                {/* Action Strip (Mobile Friendly) */}
                <div className="mt-4 flex flex-col xs:flex-row xs:items-center justify-between gap-2 pt-2">
                  <div className="grid grid-cols-2 xs:flex xs:items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        playClick();
                        setCurrentEntryId(null);
                        setTitle('');
                        setBody('');
                        setSavedStatus('Ready to write');
                        if (textareaRef.current) textareaRef.current.focus();
                      }}
                      className={`min-h-[40px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl active:scale-[0.98] text-xs font-semibold transition-colors shadow-2xs cursor-pointer ${
                        isDark
                          ? 'bg-[#95D3C0] text-[#00382D] hover:bg-[#BBEDDC]'
                          : 'bg-primary-container text-surface-container-lowest hover:bg-primary'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                      <span>New Entry</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSharePrompt}
                      className={`min-h-[40px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl active:scale-[0.98] border text-xs font-medium transition-colors shadow-2xs cursor-pointer ${
                        isDark
                          ? 'bg-[#1F2724] hover:bg-[#263A32] border-[#2D3A35] text-[#F0F4F2]'
                          : 'bg-surface-container hover:bg-surface-container-high border-outline-variant/30 text-on-surface'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">content_copy</span>
                      <span>{copyStatus}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-end gap-1.5 pt-1 xs:pt-0">
                    <button
                      type="button"
                      onClick={handleDeleteCurrent}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-outline hover:text-error hover:bg-error-container/40 transition-colors text-xs cursor-pointer"
                      title="Clear or delete this reflection"
                    >
                      <span className="material-symbols-outlined text-[15px]">delete</span>
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {showAtmosphere && !zenMode && (
              <aside className="w-full lg:w-[min(30vw,460px)] shrink-0 lg:sticky lg:top-20">
                <SpotifyPlayer spotifyUri={settings.spotifyUri} isAuthenticated={isAuthenticated} onSave={(spotify_uri) => updateSettings({ spotify_uri })} />
              </aside>
            )}
          </div>
        )}
      </main>

      {/* 3. Notebook History Drawer (Slide-over, Full Width on Mobile) */}
      {isDrawerOpen && (
        <div className={`fixed inset-0 z-50 overflow-hidden backdrop-blur-xs transition-opacity animate-in fade-in ${
          isDark ? 'bg-black/60' : 'bg-primary/20'
        }`}>
          <div className="absolute inset-0" onClick={() => setIsDrawerOpen(false)}></div>
          <div className="fixed inset-y-0 right-0 max-w-full flex">
            <div className={`w-screen max-w-full sm:max-w-md border-l shadow-2xl flex flex-col ${
              isDark
                ? 'bg-[#161E1B] border-[#2D3A35] text-[#F0F4F2]'
                : 'bg-surface-container-lowest border-outline-variant/40'
            }`}>
              {/* Drawer Header */}
              <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${
                isDark
                  ? 'bg-[#141A17] border-[#2D3A35]'
                  : 'bg-surface-container-low/40 border-outline-variant/30'
              }`}>
                <div className="flex items-center gap-2">
                  <span className={`material-symbols-outlined text-xl ${isDark ? 'text-[#95D3C0]' : 'text-secondary'}`}>menu_book</span>
                  <div>
                    <h3 className={`font-serif text-base sm:text-lg font-bold ${isDark ? 'text-[#F0F4F2]' : 'text-on-surface'}`}>Notebook Sanctuary</h3>
                    <p className={`text-[11px] ${isDark ? 'text-[#8E9E97]' : 'text-on-surface-variant'}`}>{entries.length} reflections preserved</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className={`w-9 h-9 rounded-lg transition-colors flex items-center justify-center cursor-pointer ${
                    isDark
                      ? 'text-[#8E9E97] hover:text-[#F0F4F2] hover:bg-[#1F2724]'
                      : 'text-outline hover:text-on-surface hover:bg-surface-container'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              {/* Drawer Entries List */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 sm:space-y-3">
                {entries.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <span className={`material-symbols-outlined text-4xl mb-2 ${isDark ? 'text-[#8E9E97]/40' : 'text-outline/40'}`}>auto_stories</span>
                    <p className={`text-sm font-medium ${isDark ? 'text-[#8E9E97]' : 'text-on-surface-variant'}`}>Your sanctuary notebook is quiet</p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-[#72847D]' : 'text-outline'}`}>Reflections written in Guided Check-in or Free Expression will be preserved here.</p>
                  </div>
                ) : (
                  entries.map((entry) => (
                    <div
                      key={entry.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectDrawerEntry(entry)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') handleSelectDrawerEntry(entry);
                      }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left active:scale-[0.99] ${
                        currentEntryId === entry.id
                          ? isDark
                            ? 'bg-[#1F2724] border-[#95D3C0]/50 shadow-2xs'
                            : 'bg-secondary-container/30 border-secondary/40 shadow-2xs'
                          : isDark
                            ? 'bg-[#181D1B] hover:bg-[#1F2724] border-[#2D3A35]'
                            : 'bg-surface-container-lowest hover:bg-surface-container-low border-outline-variant/30'
                      }`}
                    >
                      <div className={`flex items-center justify-between text-[11px] mb-1 ${
                        isDark ? 'text-[#8E9E97]' : 'text-on-surface-variant'
                      }`}>
                        <span className={`px-2 py-0.5 rounded font-medium ${
                          isDark
                            ? 'bg-[#141A17] text-[#95D3C0] border border-[#2D3A35]'
                            : 'bg-surface-container text-secondary'
                        }`}>
                          {entry.promptCategory || entry.session || 'Sanctuary Entry'}
                        </span>
                        <span>{entry.timestamp || 'Today'}</span>
                      </div>
                      <h4 className={`font-serif text-sm font-semibold truncate ${
                        isDark ? 'text-[#F0F4F2]' : 'text-primary'
                      }`}>
                        {entry.title || 'Untitled Reflection'}
                      </h4>
                      <p className={`text-xs line-clamp-2 mt-1 leading-relaxed ${
                        isDark ? 'text-[#8E9E97]' : 'text-on-surface-variant'
                      }`}>
                        {entry.body || '(Empty reflection)'}
                      </p>
                      <div className={`mt-2 flex items-center justify-between text-[10px] ${
                        isDark ? 'text-[#72847D]' : 'text-outline'
                      }`}>
                        <span>{entry.wordCount || 0} words</span>
                        {entry.isFavorite && (
                          <span className="material-symbols-outlined text-amber-400 text-[14px]">bookmark</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Drawer Footer */}
              <div className={`p-3.5 sm:p-4 border-t flex items-center justify-between text-xs ${
                isDark
                  ? 'border-[#2D3A35] bg-[#141A17]'
                  : 'border-outline-variant/30 bg-surface-container-low/40'
              }`}>
                <button
                  type="button"
                  onClick={() => {
                    handleNewReflection();
                    setIsDrawerOpen(false);
                  }}
                  className={`w-full min-h-[42px] py-2 rounded-xl font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer active:scale-[0.98] ${
                    isDark
                      ? 'bg-[#95D3C0] text-[#00382D] hover:bg-[#BBEDDC]'
                      : 'bg-primary-container text-surface-container-lowest hover:bg-primary'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">add</span>
                  <span>New Reflection</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BanjaScreen;
