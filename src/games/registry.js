/**
 * registry.js
 * Central catalog of all registered mini-games in Chemsha Bongo.
 */

import { ColorClashGame } from './ColorClash.js';
import { ChimpMemoryGame } from './ChimpMemory.js';
import { RapidMathGame } from './RapidMath.js';
import { ConfusingArrowsGame } from './ConfusingArrows.js';
import { NumberSequenceGame } from './NumberSequence.js';

export const GAME_CATALOG = [
  {
    id: 'color-clash',
    title: 'Color Clash',
    subtitle: 'Inhibition Challenge',
    category: 'focus',
    icon: '🎨',
    categoryLabel: 'Attention & Focus',
    description: 'Inhibit your impulse! Select the ink color of the word without reading it.',
    GameClass: ColorClashGame,
    colorAccent: '#ef4444'
  },
  {
    id: 'chimp-memory',
    title: 'Chimp Memory',
    subtitle: 'Working Memory Grid',
    category: 'memory',
    icon: '🐵',
    categoryLabel: 'Working Memory',
    description: 'Flash-memorize numbers 1..N and recall their positions in ascending order.',
    GameClass: ChimpMemoryGame,
    colorAccent: '#10b981'
  },
  {
    id: 'rapid-math',
    title: 'Rapid Math',
    subtitle: 'Mental Arithmetic',
    category: 'math',
    icon: '⚡',
    categoryLabel: 'Mental Calculation',
    description: 'Race against time to solve rapid equations and True/False questions.',
    GameClass: RapidMathGame,
    colorAccent: '#3b82f6'
  },
  {
    id: 'confusing-arrows',
    title: 'Confusing Arrows',
    subtitle: 'Spatial Direction Reflex',
    category: 'reflex',
    icon: '🧭',
    categoryLabel: 'Spatial Reflexes',
    description: 'Match green arrows, but flip your instincts when you see red!',
    GameClass: ConfusingArrowsGame,
    colorAccent: '#f59e0b'
  },
  {
    id: 'number-sequence',
    title: 'Pattern Sequence',
    subtitle: 'Pattern Deduction',
    category: 'logic',
    icon: '🧩',
    categoryLabel: 'Logic & Induction',
    description: 'Crack the mathematical pattern and deduce the missing number.',
    GameClass: NumberSequenceGame,
    colorAccent: '#8b5cf6'
  }
];

export function getAllGames() {
  return GAME_CATALOG;
}

export function getGameById(id) {
  return GAME_CATALOG.find(g => g.id === id) || null;
}

export function getRandomBlitzGames(count = 3) {
  const shuffled = [...GAME_CATALOG].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
