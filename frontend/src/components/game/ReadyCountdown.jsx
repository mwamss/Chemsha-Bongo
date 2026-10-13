import React, { useEffect, useState } from 'react';
import { useAudio } from '../../context/AudioContext.jsx';

export function ReadyCountdown({ meta, onFinished }) {
  const [count, setCount] = useState(3);
  const { sound } = useAudio();

  useEffect(() => {
    sound.playTick();

    const interval = setInterval(() => {
      setCount((prev) => {
        if (prev === 1) {
          clearInterval(interval);
          sound.playComboStreak();
          setTimeout(() => {
            onFinished();
          }, 350);
          return 'GO!';
        }
        sound.playTick();
        return prev - 1;
      });
    }, 900);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-surface/90 backdrop-blur-md select-none">
      <div className="flex flex-col items-center gap-6 animate-pulse">
        <span className="text-5xl">{meta?.icon || '🧠'}</span>
        <div className="text-center">
          <h2 className="font-headline-xl text-3xl font-bold text-on-surface mb-1">{meta?.title}</h2>
          <p className="text-sm text-secondary font-medium">{meta?.categoryLabel}</p>
        </div>
        <div className="w-24 h-24 rounded-full bg-secondary-container flex items-center justify-center shadow-lg border-2 border-secondary">
          <span className="font-headline-xl text-4xl font-extrabold text-on-secondary-container">
            {count}
          </span>
        </div>
        <p className="text-xs text-outline tracking-wider uppercase">Focus &amp; Breathe</p>
      </div>
    </div>
  );
}

