import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAudio } from '../../context/AudioContext.jsx';

function useRhythmProgress(storage) {
  const [progress, setProgress] = useState(() => storage.getRhythmWeek());

  useEffect(() => {
    const refresh = () => setProgress(storage.getRhythmWeek());
    window.addEventListener('chemsha:rhythm-update', refresh);
    return () => window.removeEventListener('chemsha:rhythm-update', refresh);
  }, [storage]);

  return [progress, () => setProgress(storage.getRhythmWeek())];
}

function formatDuration(seconds) {
  if (!seconds) return '0s';
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (!minutes) return `${remainder}s`;
  return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
}

function formatWeekRange(start, end) {
  const format = (date) => date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${format(start)} – ${format(end)}`;
}

function DayMark({ state, compact = false }) {
  if (state === 'focused') {
    return (
      <svg className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
        <path d="m5 12 4 4L19 6" />
      </svg>
    );
  }
  if (state === 'rested') return <span className="text-[10px] font-semibold" aria-hidden="true">R</span>;
  return <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50" aria-hidden="true" />;
}

export function GentleRhythmTracker({ onLaunchBlitz }) {
  const { storage } = useAuth();
  const { playClick, sound } = useAudio();
  const [progress, refresh] = useRhythmProgress(storage);
  const [selectedDayInfo, setSelectedDayInfo] = useState('');
  const days = progress.days;
  const weekRange = formatWeekRange(progress.weekStart, progress.weekEnd);

  const handleStartSession = () => {
    playClick();
    onLaunchBlitz?.();
  };

  const handleToggleRest = () => {
    playClick();
    const isResting = storage.toggleRhythmRest(progress.todayKey);
    refresh();
    if (isResting) sound.playCorrect(3);
  };

  const rhythmLabel = progress.currentStreak
    ? `${progress.currentStreak}-day rhythm`
    : 'Rhythm starts with a session';

  return (
    <section className="space-y-4 select-none" data-purpose="gentle-rhythm-tracker">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Gentle Rhythm</span>
          <span className="text-stone-300">•</span>
          <span className="text-xs text-outline">Weekly progress</span>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-surface-container text-secondary border border-border-subtle/60">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
          <span>Rest is progress</span>
        </span>
      </div>

      <div className="bg-surface rounded-3xl border border-border-subtle p-5 sm:p-8 shadow-card relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-gradient-to-br from-secondary/10 to-transparent blur-3xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-border-subtle/60">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-surface-container text-secondary border border-secondary/30 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
                  <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-on-surface tracking-tight font-headline-md">Gentle Rhythm</h3>
            </div>
            <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
              Completed game sessions and rest days you choose to record, stored by date.
            </p>
          </div>
          <div className="self-start sm:self-auto inline-flex items-center gap-2 bg-secondary-container/40 border border-secondary/30 rounded-full px-4 py-1.5 text-secondary">
            <span className="text-xs font-bold tracking-wide text-primary">{rhythmLabel}</span>
          </div>
        </div>

        <div className="relative py-6 sm:py-7">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-outline mb-5 font-medium">
            <span>Week of <strong className="text-on-surface font-semibold">{weekRange}</strong></span>
            <span className="text-[11px] text-secondary bg-surface-container px-2.5 py-1 rounded-full border border-secondary/30">
              {progress.weekActiveDays}/7 practice days
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-3 items-start" aria-label="This week's practice and rest record">
            {days.map((item) => {
              const isToday = item.dateKey === progress.todayKey;
              const markClasses = item.state === 'focused'
                ? 'bg-[#356759] text-white'
                : item.state === 'rested'
                  ? 'bg-surface-container text-secondary border border-secondary/50'
                  : isToday
                    ? 'bg-primary text-white ring-2 ring-primary/20'
                    : 'bg-transparent text-outline border border-border-subtle';
              const labelClasses = item.state === 'focused'
                ? 'text-secondary'
                : item.state === 'rested'
                  ? 'text-secondary'
                  : isToday
                    ? 'text-primary font-bold'
                    : 'text-outline';

              return (
                <button
                  type="button"
                  key={item.dateKey}
                  onClick={() => setSelectedDayInfo(item.title)}
                  className="cadence-node flex min-w-0 flex-col items-center text-center cursor-pointer rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                  aria-label={item.title}
                  title={item.title}
                >
                  <span className={`text-[10px] sm:text-xs mb-1.5 font-medium ${labelClasses}`}>
                    {item.day}
                  </span>
                  <span className={`w-8 h-8 min-[380px]:w-10 min-[380px]:h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${markClasses}`}>
                    <DayMark state={item.state} />
                  </span>
                  <span className={`mt-1.5 text-[9px] min-[380px]:text-[10px] sm:text-[11px] font-semibold leading-tight ${labelClasses}`}>
                    {item.state === 'focused' ? 'Practice' : item.state === 'rested' ? 'Rested' : isToday ? 'Today' : '—'}
                  </span>
                  <span className="mt-0.5 text-[9px] sm:text-[10px] text-outline font-normal">
                    {item.duration || '\u00a0'}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedDayInfo && (
            <div className="mt-4 p-2.5 rounded-xl bg-surface-container/60 border border-border-subtle text-xs text-on-surface text-center" role="status">
              {selectedDayInfo}
            </div>
          )}
        </div>

        <div className="pt-5 border-t border-border-subtle/70 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-outline">
            <span>Practice: <strong className="text-on-surface">{progress.weekActiveDays} days</strong></span>
            <span>Rest recorded: <strong className="text-on-surface">{progress.weekRestDays} days</strong></span>
            <span>Time in games: <strong className="text-on-surface">{formatDuration(progress.weekFocusSeconds)}</strong></span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch gap-2 w-full lg:w-auto">
            <button
              type="button"
              onClick={handleStartSession}
              className="inline-flex items-center justify-center gap-1 px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-white hover:bg-primary/90 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">play_arrow</span>
              <span>{progress.todayHasPractice ? 'Practice again' : 'Start a session'}</span>
            </button>
            <button
              type="button"
              onClick={handleToggleRest}
              disabled={progress.todayHasPractice}
              className="inline-flex items-center justify-center gap-1 px-4 py-2 rounded-lg text-xs font-semibold border border-border-subtle text-secondary hover:bg-surface-container disabled:opacity-55 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title={progress.todayHasPractice ? 'A completed session is already recorded today.' : undefined}
            >
              <span className="material-symbols-outlined text-[16px]">self_improvement</span>
              <span>{progress.todayHasPractice ? 'Practice recorded today' : progress.todayRestHonored ? 'Remove rest record' : 'Record a rest day'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
        <div className="p-4 rounded-xl bg-surface border border-border-subtle space-y-1.5">
          <h4 className="text-xs font-bold text-on-surface">Practice day</h4>
          <p className="text-[11px] text-on-surface-variant leading-relaxed">Recorded when you finish a game round. The session count and game duration come from play.</p>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-border-subtle space-y-1.5">
          <h4 className="text-xs font-bold text-on-surface">Rest day</h4>
          <p className="text-[11px] text-on-surface-variant leading-relaxed">Record a rest day yourself. It keeps your rhythm without adding a practice session.</p>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-border-subtle space-y-1.5">
          <h4 className="text-xs font-bold text-on-surface">No activity</h4>
          <p className="text-[11px] text-on-surface-variant leading-relaxed">Unmarked days stay empty; the tracker never fills in past progress for you.</p>
        </div>
      </div>
    </section>
  );
}

export function GentleRhythmSidebarWidget() {
  const { storage } = useAuth();
  const [progress] = useRhythmProgress(storage);

  return (
    <div className="w-full bg-surface-container/70 rounded-xl border border-border-subtle p-3.5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-surface text-secondary flex items-center justify-center border border-border-subtle" aria-hidden="true">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" />
              <path d="m15 9-2 5-5 2 2-5 5-2Z" />
            </svg>
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-on-surface">Gentle Rhythm</h4>
            <p className="text-[10px] text-outline">This week's activity</p>
          </div>
        </div>
        <span className="text-[10px] font-bold text-secondary bg-surface px-2 py-0.5 rounded-full border border-border-subtle whitespace-nowrap">
          {progress.currentStreak}d streak
        </span>
      </div>

      <div className="flex items-center justify-between gap-1 pt-0.5" aria-label="This week's recorded activity">
        {progress.days.map((day) => {
          const isToday = day.dateKey === progress.todayKey;
          const stateClass = day.state === 'focused'
            ? 'bg-[#356759] text-white'
            : day.state === 'rested'
              ? 'bg-surface-container text-secondary border border-secondary/40'
              : isToday
                ? 'bg-primary text-white ring-2 ring-primary/30'
                : 'bg-transparent text-outline border border-border-subtle';
          return (
            <div key={day.dateKey} className="flex flex-col items-center min-w-0" title={day.title}>
              <span className={`text-[10px] mb-1 font-medium ${isToday ? 'text-primary font-bold' : 'text-outline'}`}>
                {day.day.slice(0, 1)}
              </span>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center ${stateClass}`}>
                <DayMark state={day.state} compact />
              </span>
            </div>
          );
        })}
      </div>

      <div className="text-[11px] text-outline flex items-center justify-between pt-1 border-t border-border-subtle/50 font-medium">
        <span>Practice this week</span>
        <span className="text-secondary font-bold">{progress.weekActiveDays}/7 days</span>
      </div>
    </div>
  );
}
