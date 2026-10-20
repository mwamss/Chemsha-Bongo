import React, { useState } from 'react';
import { Header } from './components/layout/Header.jsx';
import { Sidebar } from './components/layout/Sidebar.jsx';
import { BottomNav } from './components/layout/BottomNav.jsx';
import { HomeScreen } from './components/screens/HomeScreen.jsx';
import { SelectScreen } from './components/screens/SelectScreen.jsx';
import { StatsScreen } from './components/screens/StatsScreen.jsx';
import { LeaderboardScreen } from './components/screens/LeaderboardScreen.jsx';
import { ProfileScreen } from './components/screens/ProfileScreen.jsx';
import { SettingsScreen } from './components/screens/SettingsScreen.jsx';
import { QuotesScreen } from './components/screens/QuotesScreen.jsx';
import { BanjaScreen } from './components/screens/BanjaScreen.jsx';
import { ReadyCountdown } from './components/game/ReadyCountdown.jsx';
import { GameViewport } from './components/game/GameViewport.jsx';
import { RoundSummaryModal } from './components/game/RoundSummaryModal.jsx';
import { AuthModal } from './components/auth/AuthModal.jsx';
import { ExerciseIcon } from './components/icons/ExerciseIcon.jsx';
import { MigrationBanner } from './components/auth/MigrationBanner.jsx';
import { getGameById, getRandomBlitzGames } from './engine/games/registry.js';
import { useAuth } from './context/AuthContext.jsx';
import { useAudio } from './context/AudioContext.jsx';
import { api } from './services/apiClient.js';

export function App() {
  // Spotify returns to the app root after OAuth. Restore Banja before its
  // player mounts so it can exchange the authorization code and start the SDK.
  const [currentScreen, setCurrentScreen] = useState(() => {
    const spotifyCallback = new URLSearchParams(window.location.search);
    return spotifyCallback.has('code') || spotifyCallback.has('error') ? 'banja' : 'home';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Active game orchestration state
  const [gamePlayState, setGamePlayState] = useState(null); // null | 'countdown' | 'playing' | 'summary' | 'blitz-final'
  const [activeGameId, setActiveGameId] = useState(null);
  const [roundStats, setRoundStats] = useState(null);

  // Blitz mode tracking
  const [blitzMode, setBlitzMode] = useState(false);
  const [blitzPlaylist, setBlitzPlaylist] = useState([]);
  const [blitzCurrentIndex, setBlitzCurrentIndex] = useState(0);
  const [blitzTotalScore, setBlitzTotalScore] = useState(0);
  const [blitzRoundsStats, setBlitzRoundsStats] = useState([]);
  const [blitzFinalData, setBlitzFinalData] = useState(null);

  const { storage, isAuthenticated } = useAuth();
  const { sound, fx, playClick } = useAudio();

  // --- Free Play Initiation ---
  const launchFreePlay = (gameId) => {
    setBlitzMode(false);
    setActiveGameId(gameId);
    setGamePlayState('countdown');
  };

  // --- Daily Blitz Initiation ---
  const launchBlitzWorkout = () => {
    const playlist = getRandomBlitzGames(3);
    setBlitzMode(true);
    setBlitzPlaylist(playlist);
    setBlitzCurrentIndex(0);
    setBlitzTotalScore(0);
    setBlitzRoundsStats([]);
    setBlitzFinalData(null);

    setActiveGameId(playlist[0].id);
    setGamePlayState('countdown');
  };

  const handleCountdownFinished = () => {
    setGamePlayState('playing');
  };

  const restartCurrentRound = () => {
    setGamePlayState('countdown');
  };

  const handleRoundComplete = (stats) => {
    setRoundStats(stats);

    if (blitzMode) {
      const nextTotal = blitzTotalScore + stats.score;
      setBlitzTotalScore(nextTotal);

      const roundRecord = {
        game_id: activeGameId,
        round_order: blitzCurrentIndex + 1,
        score: stats.score,
        accuracy_pct: stats.accuracy,
        max_streak: stats.maxStreak,
      };

      const updatedRounds = [...blitzRoundsStats, roundRecord];
      setBlitzRoundsStats(updatedRounds);
    }

    setGamePlayState('summary');
  };

  const finishBlitzWorkout = async (totalScore, rounds) => {
    let rating = 'Novice';
    if (totalScore >= 4500) rating = 'Grandmaster';
    else if (totalScore >= 3500) rating = 'Genius';
    else if (totalScore >= 2500) rating = 'Sharpshooter';
    else if (totalScore >= 1500) rating = 'Quick Thinker';

    sound.playVictory();
    if (fx) fx.confetti(3500);

    const isNewBlitzHigh = storage.recordBlitzResult(totalScore, rating);

    // Submit to backend if authenticated
    if (isAuthenticated) {
      try {
        await api.recordDailyBlitz({
          total_score: totalScore,
          rating,
          duration_sec: 90,
          client_session_id: `blitz-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          rounds,
        });
      } catch (err) {
        console.warn('Backend blitz recording failed:', err);
      }
    }

    setBlitzFinalData({
      totalScore,
      rating,
      isNewBlitzHigh,
      rounds,
    });
    setGamePlayState('blitz-final');
  };

  const advanceBlitzNextGame = () => {
    const nextIndex = blitzCurrentIndex + 1;
    if (nextIndex >= blitzPlaylist.length) {
      // All blitz rounds complete! Transition to final summary
      finishBlitzWorkout(blitzTotalScore, blitzRoundsStats);
    } else {
      setBlitzCurrentIndex(nextIndex);
      setActiveGameId(blitzPlaylist[nextIndex].id);
      setGamePlayState('countdown');
    }
  };

  const exitGameToScreen = (screen = 'home') => {
    setGamePlayState(null);
    setBlitzMode(false);
    setCurrentScreen(screen);
  };

  const activeMeta = activeGameId ? getGameById(activeGameId) : null;

  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface">
      {/* Fixed Header */}
      <Header
        onOpenSidebar={() => setIsSidebarOpen(true)}
        onNavigate={(screen) => exitGameToScreen(screen)}
      />

      {/* Slide-in Sidebar Drawer */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentScreen={currentScreen}
        onNavigate={(screen) => exitGameToScreen(screen)}
      />

      {/* Main Content Area */}
      <main className="flex-1 pt-16 pb-16 md:pb-4 flex flex-col">
        {gamePlayState === 'countdown' && activeMeta && (
          <ReadyCountdown
            key={`countdown-${activeGameId}-${blitzCurrentIndex}`}
            meta={activeMeta}
            onFinished={handleCountdownFinished}
          />
        )}

        {gamePlayState === 'playing' && activeGameId && (
          <GameViewport
            key={`viewport-${activeGameId}-${blitzCurrentIndex}`}
            gameId={activeGameId}
            mode={blitzMode ? 'blitz' : 'free-play'}
            durationSec={30}
            onRoundComplete={handleRoundComplete}
            onExit={() => exitGameToScreen('home')}
            onRestart={restartCurrentRound}
          />
        )}

        {gamePlayState === 'summary' && roundStats && activeMeta && (
          <RoundSummaryModal
            stats={roundStats}
            meta={activeMeta}
            isBlitz={blitzMode}
            blitzCurrentRound={blitzCurrentIndex + 1}
            blitzTotalRounds={blitzPlaylist.length || 3}
            blitzCumulativeScore={blitzTotalScore}
            nextGameMeta={blitzPlaylist[blitzCurrentIndex + 1] || null}
            onNext={advanceBlitzNextGame}
            onPlayAgain={() => launchFreePlay(activeGameId)}
            onExit={() => exitGameToScreen('home')}
          />
        )}

        {gamePlayState === 'blitz-final' && blitzFinalData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/40 dark:bg-black/70 backdrop-blur-sm select-none">
            <div className="w-full max-w-md bg-surface rounded-3xl p-6 sm:p-8 shadow-2xl border border-border-subtle flex flex-col items-center text-center">
              <ExerciseIcon name="award" size={40} className="text-tertiary mb-2" />
              <h3 className="font-headline-xl text-2xl font-bold text-on-surface">
                Daily Blitz Complete!
              </h3>
              <span className="text-base font-bold text-secondary mt-1">
                Rating: {blitzFinalData.rating}
              </span>

              <div className="flex flex-col items-center my-6 p-4 rounded-2xl bg-surface-container w-full">
                <span className="text-xs uppercase text-outline font-semibold">Total Workout Score</span>
                <span className="font-headline-xl text-4xl font-extrabold text-primary mt-1 tabular-nums">
                  {blitzFinalData.totalScore.toLocaleString()}
                </span>
                {blitzFinalData.isNewBlitzHigh && (
                  <span className="mt-2 px-3 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold uppercase">
                    New Blitz High Score
                  </span>
                )}
              </div>

              <div className="flex flex-col w-full gap-2.5">
                <button
                  onClick={() => { playClick(); exitGameToScreen('leaderboard'); }}
                  className="btn btn-primary w-full py-3 text-sm font-semibold rounded-2xl cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">leaderboard</span>
                  <span>View Blitz Leaderboard</span>
                </button>
                <button
                  onClick={() => { playClick(); exitGameToScreen('home'); }}
                  className="btn btn-secondary w-full py-3 text-sm font-semibold rounded-2xl cursor-pointer"
                >
                  <span>Back to Sanctuary</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {!gamePlayState && (
          <>
            {currentScreen === 'home' && (
              <HomeScreen
                onLaunchGame={launchFreePlay}
                onLaunchBlitz={launchBlitzWorkout}
                onNavigate={setCurrentScreen}
              />
            )}

            {currentScreen === 'select' && (
              <SelectScreen
                onLaunchGame={launchFreePlay}
              />
            )}

            {currentScreen === 'stats' && (
              <StatsScreen />
            )}

            {currentScreen === 'leaderboard' && (
              <LeaderboardScreen />
            )}

            {currentScreen === 'profile' && (
              <ProfileScreen onNavigate={setCurrentScreen} />
            )}

            {currentScreen === 'settings' && (
              <SettingsScreen />
            )}

            {currentScreen === 'quotes' && (
              <QuotesScreen onNavigate={setCurrentScreen} />
            )}

            {currentScreen === 'banja' && (
              <BanjaScreen onNavigate={setCurrentScreen} />
            )}
          </>
        )}
      </main>

      {/* Mobile Sticky Bottom Navigation (Hidden during active gameplay and Banja sanctuary) */}
      {(!gamePlayState || (gamePlayState !== 'playing' && gamePlayState !== 'countdown')) && currentScreen !== 'banja' && (
        <BottomNav
          currentScreen={currentScreen}
          onNavigate={(screen) => exitGameToScreen(screen)}
        />
      )}

      {/* Non-intrusive Guest Migration Banner */}
      <MigrationBanner />

      {/* Global Authentication Modal */}
      <AuthModal />
    </div>
  );
}
