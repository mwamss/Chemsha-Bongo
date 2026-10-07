/**
 * ConfusingArrows.js
 * Spatial reasoning and directional inhibition reflex challenge.
 * Green Arrow -> Press where it points.
 * Red Arrow   -> Press the OPPOSITE direction!
 */

import { BaseGame } from './BaseGame.js';

const DIRECTIONS = [
  { id: 'UP', symbol: '↑', opposite: 'DOWN', key: 'ArrowUp', wasd: 'w' },
  { id: 'DOWN', symbol: '↓', opposite: 'UP', key: 'ArrowDown', wasd: 's' },
  { id: 'LEFT', symbol: '←', opposite: 'RIGHT', key: 'ArrowLeft', wasd: 'a' },
  { id: 'RIGHT', symbol: '→', opposite: 'LEFT', key: 'ArrowRight', wasd: 'd' }
];

export class ConfusingArrowsGame extends BaseGame {
  constructor() {
    super({
      id: 'confusing-arrows',
      title: 'Confusing Arrows',
      swahiliTitle: 'Mielekeo Yenye Mitego',
      category: 'reflex',
      instructions: 'GREEN: Tap where it points! RED: Tap the OPPOSITE direction!',
      controlsHint: 'Arrow Keys, WASD, or on-screen directional buttons'
    });

    this.currentDirection = null;
    this.isOpposite = false;
    this.correctTargetDirection = null;
    this.arrowDisplayEl = null;
    this.ruleReminderEl = null;
    this.questionStartTime = 0;
  }

  init(context) {
    super.init(context);
    this.renderLayout();
    this.bindControls();
  }

  renderLayout() {
    this.container.innerHTML = `
      <div class="game-wrapper arrows-view">
        <div class="arrow-rule-banner" id="arrow-rule-banner">
          <span class="rule-chip rule-normal">🟢 GREEN = SAME DIRECTION</span>
          <span class="rule-chip rule-reverse">🔴 RED = OPPOSITE DIRECTION</span>
        </div>

        <div class="arrow-arena">
          <div id="central-arrow" class="huge-arrow-symbol">↑</div>
        </div>

        <div class="dpad-container">
          <div class="dpad-row">
            <button class="dpad-btn" data-dir="UP" title="Up (W / ↑)">▲</button>
          </div>
          <div class="dpad-row dpad-middle">
            <button class="dpad-btn" data-dir="LEFT" title="Left (A / ←)">◀</button>
            <div class="dpad-core"></div>
            <button class="dpad-btn" data-dir="RIGHT" title="Right (D / →)">▶</button>
          </div>
          <div class="dpad-row">
            <button class="dpad-btn" data-dir="DOWN" title="Down (S / ↓)">▼</button>
          </div>
        </div>
      </div>
    `;

    this.arrowDisplayEl = this.container.querySelector('#central-arrow');
    this.ruleReminderEl = this.container.querySelector('#arrow-rule-banner');
  }

  bindControls() {
    // Keyboard listeners
    this.addListener(window, 'keydown', (e) => {
      if (!this.isActive || this.isPaused) return;

      const key = e.key;
      const lower = key.toLowerCase();

      let targetDir = null;
      if (key === 'ArrowUp' || lower === 'w') targetDir = 'UP';
      else if (key === 'ArrowDown' || lower === 's') targetDir = 'DOWN';
      else if (key === 'ArrowLeft' || lower === 'a') targetDir = 'LEFT';
      else if (key === 'ArrowRight' || lower === 'd') targetDir = 'RIGHT';

      if (targetDir) {
        e.preventDefault();
        this.handleDirectionInput(targetDir);
      }
    });

    // D-Pad buttons
    const buttons = this.container.querySelectorAll('.dpad-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const dir = btn.dataset.dir;
        this.handleDirectionInput(dir, e);
      });
    });
  }

  start() {
    super.start();
    this.nextArrow();
  }

  nextArrow() {
    if (!this.isActive) return;

    // Pick random direction
    const dirObj = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
    // 50% chance of standard (Green) vs opposite (Red)
    const isRed = Math.random() < 0.5;

    this.currentDirection = dirObj;
    this.isOpposite = isRed;
    this.correctTargetDirection = isRed ? dirObj.opposite : dirObj.id;

    // Update visuals
    this.arrowDisplayEl.textContent = dirObj.symbol;
    this.arrowDisplayEl.className = `huge-arrow-symbol ${isRed ? 'arrow-red' : 'arrow-green'}`;

    this.questionStartTime = performance.now();
  }

  handleDirectionInput(chosenDir, event) {
    if (!this.isActive || this.isPaused) return;

    const correct = chosenDir === this.correctTargetDirection;
    const coords = event ? { x: event.clientX, y: event.clientY } : null;

    if (correct) {
      const elapsed = performance.now() - this.questionStartTime;
      const speedBonus = elapsed < 800 ? 50 : 0;
      this.awardScore(100 + speedBonus, coords);
      this.nextArrow();
    } else {
      this.penalizeError();
      if (this.arrowDisplayEl) {
        this.arrowDisplayEl.classList.add('arrow-mistake');
        setTimeout(() => {
          if (this.arrowDisplayEl) this.arrowDisplayEl.classList.remove('arrow-mistake');
          this.nextArrow();
        }, 250);
      } else {
        this.nextArrow();
      }
    }
  }
}
