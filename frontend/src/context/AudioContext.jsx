import React, { createContext, useContext, useState, useEffect } from 'react';
import { SoundSynth } from '../engine/core/SoundSynth.js';
import { FXManager } from '../engine/core/FX.js';
import { useAuth } from './AuthContext.jsx';

const AudioContext = createContext(null);

export function AudioProvider({ children }) {
  const { settings, updateSettings } = useAuth();
  const [sound] = useState(() => new SoundSynth());
  const [fx, setFx] = useState(null);
  const [muted, setMuted] = useState(false);
  const [ambientPlaying, setAmbientPlaying] = useState(false);

  // Bind Canvas element for FXManager on mount
  useEffect(() => {
    const canvas = document.getElementById('fx-canvas');
    if (canvas) {
      setFx(new FXManager(canvas));
    }
  }, []);

  // Sync with account settings whenever settings change
  useEffect(() => {
    if (settings) {
      if (typeof settings.soundMuted === 'boolean') {
        sound.setMuted(settings.soundMuted);
        setMuted(settings.soundMuted);
      }
      if (typeof settings.ambientEnabled === 'boolean') {
        if (settings.ambientEnabled && !ambientPlaying) {
          sound.playAmbientMeditation();
          setAmbientPlaying(true);
        } else if (!settings.ambientEnabled && ambientPlaying) {
          sound.stopAmbientMeditation();
          setAmbientPlaying(false);
        }
      }
    }
  }, [settings]);

  const toggleMute = () => {
    const nextMuted = sound.toggleMute();
    setMuted(nextMuted);
    updateSettings({ sound_muted: nextMuted });
    return nextMuted;
  };

  const toggleAmbient = () => {
    const nextAmbient = !ambientPlaying;
    // Start/resume the AudioContext in this user gesture so the first toggle is audible.
    sound.ensureContext();
    if (nextAmbient) {
      sound.playAmbientMeditation();
    } else {
      sound.stopAmbientMeditation();
    }
    setAmbientPlaying(nextAmbient);
    updateSettings({ ambient_enabled: nextAmbient });
    return nextAmbient;
  };

  const playClick = () => sound.playClick();

  const playTestChime = () => {
    sound.playCorrect(5);
  };

  return (
    <AudioContext.Provider value={{
      sound,
      fx,
      muted,
      toggleMute,
      ambientPlaying,
      toggleAmbient,
      playClick,
      playTestChime
    }}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  return useContext(AudioContext);
}
