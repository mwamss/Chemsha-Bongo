import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAudio } from '../../context/AudioContext.jsx';

export function GentleRhythmTracker({ onLaunchBlitz }) {
  const { storage, isAuthenticated } = useAuth();
  const { playClick, sound } = useAudio();

  const totals = storage.getTotals();
  const calculatedActiveMinutes = Math.max(15, Math.round((totals.gamesPlayed * 0.5) + (totals.blitzWorkouts * 1.5)));
  const activeHours = Math.floor(calculatedActiveMinutes / 60);
  const activeMins = calculatedActiveMinutes % 60;
  const activeTimeStr = activeHours > 0 ? `${activeHours}h ${activeMins}m` : `${activeMins}m`;

  // Weekly tracker node states
  const [todayState, setTodayState] = useState('ready'); // 'ready' | 'focused' | 'rested'
  const [restDaysCount, setRestDaysCount] = useState(2);
  const [activeDaysCount, setActiveDaysCount] = useState(4);
  const [selectedDayInfo, setSelectedDayInfo] = useState(null);

  // Formatted date range for current week
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - ((today.getDay() + 6) % 7)); // Monday
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday

  const formatDateShort = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const weeklyFlowStr = `${formatDateShort(startOfWeek)} — ${formatDateShort(endOfWeek)}`;

  const handleCompleteToday = () => {
    playClick();
    if (todayState !== 'focused') {
      setTodayState('focused');
      setActiveDaysCount((prev) => Math.min(7, prev + 1));
      sound.playCorrect(5);
    }
    if (onLaunchBlitz) {
      onLaunchBlitz();
    }
  };

  const handleHonorRest = () => {
    playClick();
    if (todayState !== 'rested') {
      setTodayState('rested');
      setRestDaysCount((prev) => prev + 1);
      sound.playCorrect(3);
    }
  };

  const days = [
    { day: 'Mon', state: 'focused', duration: '25m', title: 'Monday: Focused session (25m)' },
    { day: 'Tue', state: 'focused', duration: '30m', title: 'Tuesday: Focused session (30m)' },
    { day: 'Wed', state: 'rested', duration: 'Honored', title: 'Wednesday: Mindful Rest Honored' },
    { day: 'Thu', state: 'focused', duration: '15m', title: 'Thursday: Focused session (15m)' },
    { day: 'Fri', state: 'focused', duration: '45m', title: 'Friday: Focused session (45m)' },
    { day: 'Sat', state: 'rested', duration: 'Honored', title: 'Saturday: Mindful Rest Honored' },
    {
      day: 'Sun',
      state: todayState === 'ready' ? 'today' : todayState,
      duration: todayState === 'focused' ? '20m' : todayState === 'rested' ? 'Honored' : 'Ready',
      title: todayState === 'ready' ? 'Sunday: Open for Mindful Practice' : todayState === 'focused' ? 'Sunday: Focused Practice Complete' : 'Sunday: Rest Day Honored'
    },
  ];

  return (
    <section className="space-y-4 select-none" data-purpose="gentle-rhythm-redesign">
      {/* ── HEADER LABEL ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
            Non-Punitive Habit Tracker
          </span>
          <span className="text-stone-300">•</span>
          <span className="text-xs text-outline">Cadence Model</span>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-surface-container text-secondary border border-border-subtle/60">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Rest is Progress</span>
        </span>
      </div>

      {/* ── MAIN ELEVATED CARD ────────────────────────────────────────────── */}
      <div className="bg-surface rounded-3xl border border-border-subtle p-6 sm:p-8 shadow-card relative overflow-hidden transition-all">
        {/* Soft Ambient Background Accent */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-gradient-to-br from-secondary/10 to-transparent blur-3xl pointer-events-none" />

        {/* Component Header Block */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-border-subtle/60">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-surface-container text-secondary border border-secondary/30 flex items-center justify-center shadow-xs">
                {/* Mindful Leaf/Wave Icon */}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
                  <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-on-surface tracking-tight font-headline-md">
                Gentle Rhythm
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
              A mindful cadence with zero penalties for resting. Practice whenever your spirit welcomes it.
            </p>
          </div>

          {/* Rest-Honoring Rhythm Badge */}
          <div className="self-start sm:self-auto flex items-center gap-2 bg-secondary-container/40 border border-secondary/30 rounded-full px-4 py-1.5 text-secondary shadow-xs">
            {/* Calming ember / spark */}
            <svg className="w-4 h-4 text-secondary" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2c.4 3.4 2.8 6 6 6-3.2 0-5.6 2.6-6 6-.4-3.4-2.8-6-6-6 3.2 0 5.6-2.6 6-6Z" />
              <path d="M17 15c.2 2 1.5 3.5 3.5 3.5-2 0-3.3 1.5-3.5 3.5-.2-2-1.5-3.5-3.5-3.5 2 0 3.3-1.5 3.5-3.5Z" opacity="0.6" />
            </svg>
            <span className="text-xs font-bold tracking-wide text-primary">
              {totals.highestOverallStreak > 0 ? `${totals.highestOverallStreak}-Day Mindful Rhythm` : '31-Day Mindful Rhythm'}
            </span>
          </div>
        </div>

        {/* ── 7-DAY MINDFUL CADENCE TRACKER GRID ────────────────────────────── */}
        <div className="py-7">
          <div className="flex items-center justify-between text-xs text-outline mb-5 font-medium px-1">
            <span>Weekly Flow: <strong className="text-on-surface font-semibold">{weeklyFlowStr}</strong></span>
            <span className="text-[11px] text-secondary bg-surface-container px-2.5 py-0.5 rounded-full border border-secondary/30">
              Harmonious flow • {activeDaysCount}/7 days
            </span>
          </div>

          {/* 7 Days Node Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-3 items-center" id="tracker-node-container">
            {days.map((item, idx) => {
              const isToday = item.day === 'Sun';

              return (
                <div
                  key={item.day}
                  onClick={() => setSelectedDayInfo(item.title)}
                  className="cadence-node flex flex-col items-center group cursor-pointer"
                  data-day={item.day}
                  data-state={item.state}
                >
                  {/* Day Label */}
                  <div className="flex items-center gap-0.5 sm:gap-1 mb-1 sm:mb-2">
                    <span className={`text-[10px] sm:text-xs ${isToday ? 'font-bold text-primary' : 'font-medium text-outline group-hover:text-on-surface transition-colors'}`}>
                      {item.day}
                    </span>
                    {isToday && <span className="w-1 h-1 rounded-full bg-primary" />}
                  </div>

                  {/* Node Button */}
                  {item.state === 'focused' && (
                    <button
                      className="w-8 h-8 min-[380px]:w-10 min-[380px]:h-10 sm:w-12 sm:h-12 rounded-full bg-[#356759] text-white flex items-center justify-center shadow-sm transition-transform duration-200 group-hover:scale-105 active:scale-95 relative"
                      title={item.title}
                    >
                      <svg className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </button>
                  )}

                  {item.state === 'rested' && (
                    <button
                      className="w-8 h-8 min-[380px]:w-10 min-[380px]:h-10 sm:w-12 sm:h-12 rounded-full bg-surface-container text-secondary border border-secondary/40 flex items-center justify-center shadow-sm transition-transform duration-200 group-hover:scale-105 active:scale-95 relative"
                      title={item.title}
                    >
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-secondary" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
                      </svg>
                    </button>
                  )}

                  {item.state === 'today' && (
                    <button
                      className="w-8 h-8 min-[380px]:w-10 min-[380px]:h-10 sm:w-12 sm:h-12 rounded-full bg-primary text-white flex items-center justify-center shadow-md ring-2 sm:ring-4 ring-primary/20 transition-transform duration-200 group-hover:scale-105 active:scale-95 relative"
                      title={item.title}
                    >
                      <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-secondary-fixed ring-2 ring-primary animate-pulse" />
                    </button>
                  )}

                  {/* Subtext Status */}
                  <span className={`mt-1.5 sm:mt-2 text-[9px] min-[380px]:text-[10px] sm:text-[11px] font-semibold text-center leading-tight ${
                    item.state === 'focused' ? 'text-secondary' :
                    item.state === 'rested' ? 'text-primary' :
                    'text-primary font-bold'
                  }`}>
                    {item.state === 'focused' ? 'Focused' : item.state === 'rested' ? 'Rested' : 'Today'}
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-outline font-normal">
                    {item.duration}
                  </span>
                </div>
              );
            })}
          </div>

          {selectedDayInfo && (
            <div className="mt-4 p-2.5 rounded-xl bg-surface-container/60 border border-border-subtle text-xs text-on-surface text-center animate-fade-in">
              {selectedDayInfo}
            </div>
          )}
        </div>

        {/* ── CONTEXTUAL SUMMARY STRIP & ACTIONS ────────────────────────────── */}
        <div className="pt-5 mt-2 border-t border-border-subtle/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-outline">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Cadence: <strong className="text-on-surface font-semibold">Harmonious</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-secondary-fixed-dim" />
              <span>Rest Days: <strong className="text-on-surface font-semibold">{restDaysCount} Honored</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-secondary" />
              <span>Active Time: <strong className="text-on-surface font-semibold">{activeTimeStr}</strong></span>
            </div>
          </div>

          {/* Quick Micro-Actions */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={handleCompleteToday}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
                todayState === 'focused'
                  ? 'bg-secondary text-white'
                  : 'bg-primary text-white hover:bg-primary/90'
              }`}
            >
              <span className="material-symbols-outlined text-[16px] mr-1">
                {todayState === 'focused' ? 'check' : 'play_arrow'}
              </span>
              <span>{todayState === 'focused' ? 'Completed Today ✓' : 'Complete Today'}</span>
            </button>

            <button
              onClick={handleHonorRest}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                todayState === 'rested'
                  ? 'bg-surface-container text-primary border-secondary font-bold'
                  : 'bg-surface-container/60 text-secondary hover:bg-surface-container border-border-subtle'
              }`}
            >
              <span className="material-symbols-outlined text-[16px] mr-1">self_improvement</span>
              <span>{todayState === 'rested' ? 'Rest Honored ✓' : 'Honor Rest Day'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── BEHAVIORAL ARCHITECTURE & STATE LOGIC MATRIX ──────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
        {/* State 1: Focused Day */}
        <div className="p-4 rounded-2xl bg-surface border border-border-subtle space-y-1.5 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-[#356759] inline-block" />
            <span className="text-xs font-bold text-on-surface">Focused Day</span>
          </div>
          <p className="text-[11px] text-on-surface-variant leading-relaxed">
            Represents deliberate practice (10m+). Soft forest sage badge with accessible checkmark.
          </p>
        </div>

        {/* State 2: Rest Honored */}
        <div className="p-4 rounded-2xl bg-surface-container/50 border border-secondary/30 space-y-1.5 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-surface-container border border-secondary/50 inline-block" />
            <span className="text-xs font-bold text-on-surface">Rest Honored</span>
          </div>
          <p className="text-[11px] text-on-surface-variant leading-relaxed">
            Protects the mindful rhythm. Zero streak penalties. Recognizes recharge as vital effort.
          </p>
        </div>

        {/* State 3: Today / Active */}
        <div className="p-4 rounded-2xl bg-surface border border-border-subtle space-y-1.5 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-primary inline-block" />
            <span className="text-xs font-bold text-on-surface">Today / Active</span>
          </div>
          <p className="text-[11px] text-on-surface-variant leading-relaxed">
            High-contrast forest slate target with a calm breathing indicator welcoming practice today.
          </p>
        </div>
      </div>
    </section>
  );
}

export function GentleRhythmSidebarWidget() {
  return (
    <div className="w-full bg-surface-container/70 rounded-2xl border border-border-subtle/50 p-3.5 space-y-3 shadow-xs">
      {/* Widget Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-surface text-secondary flex items-center justify-center border border-border-subtle">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" />
            </svg>
          </div>
          <div>
            <h4 className="text-xs font-bold text-on-surface">Gentle Rhythm</h4>
            <p className="text-[10px] text-outline">Zero-penalty habit track</p>
          </div>
        </div>
        <span className="text-[10px] font-bold text-secondary bg-surface px-2 py-0.5 rounded-full border border-border-subtle">
          31d
        </span>
      </div>

      {/* Compact Day Row */}
      <div className="flex items-center justify-between gap-1 pt-0.5">
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-outline mb-1 font-medium">M</span>
          <div className="w-7 h-7 rounded-full bg-[#356759] text-white flex items-center justify-center">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-outline mb-1 font-medium">T</span>
          <div className="w-7 h-7 rounded-full bg-[#356759] text-white flex items-center justify-center">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-outline mb-1 font-medium">W</span>
          <div className="w-7 h-7 rounded-full bg-surface-container text-secondary border border-secondary/40 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
          </div>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-outline mb-1 font-medium">T</span>
          <div className="w-7 h-7 rounded-full bg-[#356759] text-white flex items-center justify-center">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-outline mb-1 font-medium">F</span>
          <div className="w-7 h-7 rounded-full bg-[#356759] text-white flex items-center justify-center">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-outline mb-1 font-medium">S</span>
          <div className="w-7 h-7 rounded-full bg-surface-container text-secondary border border-secondary/40 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
          </div>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-primary font-bold mb-1">S</span>
          <div className="w-7 h-7 rounded-full bg-primary text-white ring-2 ring-primary/40 flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary-fixed animate-pulse" />
          </div>
        </div>
      </div>

      <div className="text-[11px] text-outline flex items-center justify-between pt-1 border-t border-border-subtle/50 font-medium">
        <span>Harmonious flow</span>
        <span className="text-secondary font-bold">5/7 days</span>
      </div>
    </div>
  );
}

