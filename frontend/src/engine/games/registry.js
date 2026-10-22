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
    icon: 'palette',
    categoryLabel: 'Attention & Focus',
    description: 'Inhibit your impulse! Select the ink color of the word without reading it.',
    instructions: 'Choose the color of the ink, ignoring the word itself.',
    controlsHint: 'Use 1–4 or select a color',
    GameClass: ColorClashGame,
    colorAccent: '#ef4444'
  },
  {
    id: 'chimp-memory',
    title: 'Chimp Memory',
    subtitle: 'Working Memory Grid',
    category: 'memory',
    icon: 'memory',
    categoryLabel: 'Working Memory',
    description: 'Flash-memorize numbers 1..N and recall their positions in ascending order.',
    instructions: 'Remember each numbered tile. After they disappear, select the hidden locations in ascending order.',
    controlsHint: 'Select the tiles in sequence',
    GameClass: ChimpMemoryGame,
    colorAccent: '#10b981'
  },
  {
    id: 'rapid-math',
    title: 'Rapid Math',
    subtitle: 'Mental Arithmetic',
    category: 'math',
    icon: 'calculate',
    categoryLabel: 'Mental Calculation',
    description: 'Race against time to solve rapid equations and True/False questions.',
    instructions: 'Solve each equation or judge whether the displayed statement is true.',
    controlsHint: 'Use 1–4; use T/F for true-or-false questions',
    GameClass: RapidMathGame,
    colorAccent: '#3b82f6'
  },
  {
    id: 'confusing-arrows',
    title: 'Confusing Arrows',
    subtitle: 'Spatial Direction Reflex',
    category: 'reflex',
    icon: 'explore',
    categoryLabel: 'Spatial Reflexes',
    description: 'Match green arrows, but flip your instincts when you see red!',
    instructions: 'For green arrows, follow the direction. For red arrows, choose the opposite direction.',
    controlsHint: 'Arrow keys, WASD, or directional controls',
    GameClass: ConfusingArrowsGame,
    colorAccent: '#f59e0b'
  },
  {
    id: 'number-sequence',
    title: 'Pattern Sequence',
    subtitle: 'Pattern Deduction',
    category: 'logic',
    icon: 'schema',
    categoryLabel: 'Logic & Induction',
    description: 'Crack the mathematical pattern and deduce the missing number.',
    instructions: 'Find the rule connecting the sequence, then choose the next number.',
    controlsHint: 'Use 1–4 or select an answer',
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
