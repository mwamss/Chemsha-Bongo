import React, { useEffect, useRef, useState } from 'react';
import { PrecisionTimer } from '../../engine/core/Timer.js';
import { getGameById } from '../../engine/games/registry.js';
import { ExerciseIcon } from '../icons/ExerciseIcon.jsx';
import { api } from '../../services/apiClient.js';
import { useAudio } from '../../context/AudioContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const RESULT_BUFFER_MS = 1750;

export function GameViewport({
  gameId,
  mode = 'free-play',
  durationSec = 30,
  difficulty = 2,
  onRoundComplete,
  onExit,
  onRestart,
}) {
  const { sound, fx } = useAudio();
  const { storage, isAuthenticated } = useAuth();

  const containerRef = useRef(null);
  const timerRef = useRef(new PrecisionTimer());
  const gameInstanceRef = useRef(null);
  const roundGenerationRef = useRef(0);

  // In-game HUD state (updated on game ticks / events)
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [secondsRemaining, setSecondsRemaining] = useState(durationSec);
  const [timerPercent, setTimerPercent] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const [isRoundEnding, setIsRoundEnding] = useState(false);

  // Internal metrics
  const metricsRef = useRef({
    score: 0,
    streak: 0,
    maxStreak: 0,
    correctCount: 0,
    wrongCount: 0,
    isRoundActive: false,
    clientSessionId: `csess-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
  });

  const getMultiplier = (currentStreak) => {
    if (currentStreak >= 10) return 4;
    if (currentStreak >= 6) return 3;
    if (currentStreak >= 3) return 2;
    return 1;
  };

  const handleScore = (basePoints = 100, coords = null) => {
    const m = metricsRef.current;
    if (!m.isRoundActive) return;

    m.streak += 1;
    m.correctCount += 1;
    if (m.streak > m.maxStreak) {
      m.maxStreak = m.streak;
    }

    const mult = getMultiplier(m.streak);
    const earnedPoints = basePoints * mult;
    m.score += earnedPoints;

    setScore(m.score);
    setStreak(m.streak);
    setMultiplier(mult);

    // Audio & Particle FX
    if (m.streak === 5 || m.streak === 10) {
      sound.playComboStreak();
      if (fx) {
        fx.showFloatingText(`COMBO ${mult}x`, coords ? coords.x : undefined, coords ? coords.y : undefined, 'streak');
        fx.burst(coords ? coords.x : undefined, coords ? coords.y : undefined, 30);
      }
    } else {
      sound.playCorrect(m.streak);
      if (fx) {
        const text = mult > 1 ? `+${earnedPoints} (${mult}x)` : `+${earnedPoints}`;
        fx.showFloatingText(text, coords ? coords.x : undefined, coords ? coords.y : undefined, 'normal');
      }
    }
  };

  const handleError = () => {
    const m = metricsRef.current;
    if (!m.isRoundActive) return;

    m.streak = 0;
    m.wrongCount += 1;

    setStreak(0);
    setMultiplier(1);

    sound.playWrong();
    if (fx) {
      fx.screenShake(document.body);
      fx.vibrate([40]);
    }
  };

  const completeRound = async () => {
    const m = metricsRef.current;
    if (!m.isRoundActive) return;
    const completionStartedAt = Date.now();
    const completionGeneration = roundGenerationRef.current;
    m.isRoundActive = false;
    setIsRoundEnding(true);

    timerRef.current.stop();

    if (gameInstanceRef.current) {
      gameInstanceRef.current.cleanup();
      gameInstanceRef.current = null;
    }

    sound.playGameOver();

    const totalAns = m.correctCount + m.wrongCount;
    const accuracy = totalAns > 0 ? Math.round((m.correctCount / totalAns) * 100) : null;

    // 1. Record in local Storage fallback
    const localResult = storage.recordGameResult(
      gameId,
      m.score,
      m.maxStreak,
      m.correctCount,
      m.wrongCount,
      durationSec
    );

    let isNewHigh = localResult.isNewHigh;
    let isNewStreak = localResult.isNewStreak;

    // 2. Submit to backend if authenticated
    if (isAuthenticated) {
      try {
        const backendRes = await api.recordGameSession({
          game_id: gameId,
          mode,
          score: m.score,
          max_streak: m.maxStreak,
          correct_count: m.correctCount,
          wrong_count: m.wrongCount,
          duration_sec: durationSec,
          client_session_id: m.clientSessionId,
        });
        isNewHigh = backendRes.is_new_high_score;
        isNewStreak = backendRes.is_new_best_streak;
      } catch (err) {
        console.warn('Failed to record session with backend:', err);
      }
    }

    const remainingBufferMs = RESULT_BUFFER_MS - (Date.now() - completionStartedAt);
    if (remainingBufferMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, remainingBufferMs));
    }

    // Ignore a pending result if this game viewport was exited or restarted.
    if (roundGenerationRef.current !== completionGeneration) return;

    if (isNewHigh && fx) {
      fx.confetti(2500);
    }

    onRoundComplete({
      score: m.score,
      accuracy,
      maxStreak: m.maxStreak,
      correctCount: m.correctCount,
      wrongCount: m.wrongCount,
      isNewHigh,
      isNewStreak,
    });
  };

  const togglePause = () => {
    const m = metricsRef.current;
    if (!m.isRoundActive) return;

    if (isPaused) {
      timerRef.current.resume();
      setIsPaused(false);
    } else {
      timerRef.current.pause();
      setIsPaused(true);
    }
  };

  useEffect(() => {
    const meta = getGameById(gameId);
    if (!meta || !containerRef.current) return;
    const roundGeneration = roundGenerationRef.current + 1;
    roundGenerationRef.current = roundGeneration;

    // Reset metrics
    metricsRef.current = {
      score: 0,
      streak: 0,
      maxStreak: 0,
      correctCount: 0,
      wrongCount: 0,
      isRoundActive: true,
      clientSessionId: `csess-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    };

    setScore(0);
    setStreak(0);
    setMultiplier(1);
    setSecondsRemaining(durationSec);
    setTimerPercent(100);
    setIsPaused(false);
    setIsRoundEnding(false);

    // Mount game instance directly to DOM
    const GameClass = meta.GameClass;
    const instance = new GameClass();
    gameInstanceRef.current = instance;

    instance.init({
      container: containerRef.current,
      sound,
      fx,
      difficulty,
      onScore: (basePoints, coords) => handleScore(basePoints, coords),
      onError: () => handleError(),
    });

    instance.start();

    // Start monotonic timer
    timerRef.current.start(durationSec, {
      onTick: (msRemaining, percent) => {
        setSecondsRemaining(Math.ceil(msRemaining / 1000));
        setTimerPercent(percent);
      },
      onSecond: (sec) => {
        if (sec <= 5 && sec > 0) {
          sound.playTick();
        }
      },
      onComplete: () => {
        completeRound();
      },
    });

    return () => {
      if (roundGenerationRef.current === roundGeneration) {
        roundGenerationRef.current += 1;
      }
      timerRef.current.stop();
      if (gameInstanceRef.current) {
        gameInstanceRef.current.cleanup();
        gameInstanceRef.current = null;
      }
      metricsRef.current.isRoundActive = false;
    };
  }, [gameId, durationSec, difficulty]);

  const meta = getGameById(gameId);

  return (
    <div className="relative w-full max-w-2xl mx-auto flex flex-col items-center select-none pt-4 pb-12 px-4">
      {/* --- HUD HEADER --- */}
      <div className="w-full flex flex-col gap-3 mb-6 bg-surface-container/60 backdrop-blur-md rounded-2xl p-4 border border-border-subtle/40 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ExerciseIcon name={meta?.icon || 'sports_esports'} size={24} className="text-secondary" />
            <div>
              <h2 className="font-headline-md text-base text-on-surface font-semibold leading-tight">{meta?.title}</h2>
              <span className="font-label-sm text-xs text-secondary">{meta?.categoryLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Multiplier Badge */}
            <div className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
              multiplier > 1 ? 'bg-secondary text-white scale-110 shadow-sm' : 'bg-surface text-outline'
            }`}>
              {multiplier}x
            </div>

            {/* Score */}
            <div className="flex flex-col items-end">
              <span className="font-label-sm text-[10px] text-outline uppercase tracking-wider">Score</span>
              <span className="font-headline-xl text-xl text-primary font-bold tabular-nums">{score}</span>
            </div>

            {/* Pause Toggle */}
            <button
              onClick={togglePause}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-on-surface-variant hover:bg-surface transition-colors cursor-pointer"
              title={isPaused ? "Resume" : "Pause"}
            >
              <span className="material-symbols-outlined text-[20px]">
                {isPaused ? 'play_arrow' : 'pause'}
              </span>
            </button>
          </div>
        </div>

        {/* Precision Progress Bar */}
        <div className="w-full flex items-center gap-3">
          <div className="flex-1 h-2 bg-surface-container-high rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-100 rounded-full ${
                secondsRemaining <= 5 ? 'bg-red-500 animate-pulse' : 'bg-secondary'
              }`}
              style={{ width: `${timerPercent}%` }}
            />
          </div>
          <span className={`font-mono text-sm font-semibold tabular-nums w-8 text-right ${
            secondsRemaining <= 5 ? 'text-red-500 font-bold' : 'text-on-surface'
          }`}>
            {secondsRemaining}s
          </span>
        </div>
      </div>

      {/* --- NATIVE GAME CONTAINER --- */}
      <div className="relative w-full min-h-[380px] sm:min-h-[420px] max-w-md flex flex-col items-center justify-center bg-surface rounded-3xl p-4 sm:p-6 border border-border-subtle/50 shadow-md">
        <div
          ref={containerRef}
          id="active-game-board"
          className="w-full flex-1 flex flex-col items-center justify-center relative"
        />

        {/* Pause Overlay */}
        {isPaused && (
          <div className="absolute inset-0 bg-surface/90 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center gap-4 z-50">
            <span className="material-symbols-outlined text-4xl text-secondary">pause_circle</span>
            <h3 className="font-headline-md text-xl font-bold text-on-surface">Game Paused</h3>
            <p className="text-sm text-on-surface-variant">Take a mindful breath before continuing.</p>
            <div className="game-pause-actions flex gap-3 mt-2">
              <button onClick={togglePause} className="btn btn-primary px-6">
                Resume
              </button>
              <button onClick={onRestart} className="btn btn-secondary px-6">
                <span className="material-symbols-outlined text-[18px] mr-1">restart_alt</span>
                Restart
              </button>
              <button onClick={onExit} className="btn btn-secondary px-6">
                Exit
              </button>
            </div>
          </div>
        )}

        {/* Give players a short pause before revealing the score summary. */}
        {isRoundEnding && (
          <div
            className="absolute inset-0 bg-surface/95 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center gap-3 z-50"
            role="status"
            aria-live="polite"
          >
            <span className="material-symbols-outlined text-4xl text-secondary animate-pulse">self_improvement</span>
            <h3 className="font-headline-md text-xl font-bold text-on-surface">Round complete</h3>
            <p className="text-sm text-on-surface-variant">Take a breath. Your results are on their way.</p>
          </div>
        )}
      </div>
    </div>
  );
}

