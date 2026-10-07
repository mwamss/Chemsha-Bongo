/**
 * BaseGame.js
 * Pluggable base class for all mini-games in Chemsha Bongo.
 * Enforces standard lifecycle methods and handles automatic listener cleanup.
 */

export class BaseGame {
  constructor(metadata = {}) {
    this.id = metadata.id || 'unnamed-game';
    this.title = metadata.title || 'Untitled Game';
    this.swahiliTitle = metadata.swahiliTitle || '';
    this.category = metadata.category || 'focus'; // focus | memory | math | reflex | logic
    this.instructions = metadata.instructions || '';
    this.controlsHint = metadata.controlsHint || 'Click or tap options';

    // Injected context
    this.ctx = null;
    this.container = null;
    this.isActive = false;
    this.isPaused = false;
    this.registeredListeners = [];
  }

  /**
   * Initializes the game with the coordinator context
   * @param {Object} context
   * @param {HTMLElement} context.container - DOM container for the game
   * @param {Object} context.sound - SoundSynth instance
   * @param {Object} context.fx - FXManager instance
   * @param {number} context.difficulty - Difficulty level (1 to 5)
   * @param {Function} context.onScore - (points, coords) => void
   * @param {Function} context.onError - () => void
   */
  init(context) {
    this.ctx = context;
    this.container = context.container;
    this.difficulty = context.difficulty || 1;
    this.registeredListeners = [];
  }

  /**
   * Called when round begins
   */
  start() {
    this.isActive = true;
    this.isPaused = false;
  }

  /**
   * Pause gameplay (e.g. user pauses timer)
   */
  pause() {
    this.isPaused = true;
  }

  /**
   * Resume gameplay
   */
  resume() {
    this.isPaused = false;
  }

  /**
   * Helper to register event listeners that are auto-removed on cleanup
   */
  addListener(target, type, listener, options) {
    target.addEventListener(type, listener, options);
    this.registeredListeners.push({ target, type, listener, options });
  }

  /**
   * Clean up DOM and listeners
   */
  cleanup() {
    this.isActive = false;
    this.isPaused = false;

    // Remove all registered listeners
    for (const item of this.registeredListeners) {
      item.target.removeEventListener(item.type, item.listener, item.options);
    }
    this.registeredListeners = [];

    // Empty game container
    if (this.container) {
      this.container.innerHTML = '';
    }
  }

  /**
   * Triggers a score award
   */
  awardScore(points = 100, coords = null) {
    if (!this.isActive || this.isPaused) return;
    if (this.ctx && this.ctx.onScore) {
      this.ctx.onScore(points, coords);
    }
  }

  /**
   * Triggers an error penalty
   */
  penalizeError() {
    if (!this.isActive || this.isPaused) return;
    if (this.ctx && this.ctx.onError) {
      this.ctx.onError();
    }
  }
}
