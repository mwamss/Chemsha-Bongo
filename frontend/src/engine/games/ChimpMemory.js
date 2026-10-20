/**
 * ChimpMemory.js
 * Visual working-memory recall challenge inspired by the Kyoto University primate test.
 * Numbers appear on a grid, then vanish into blank tiles. Player recalls their locations in order.
 */

import { BaseGame } from './BaseGame.js';

export class ChimpMemoryGame extends BaseGame {
  constructor() {
    super({
      id: 'chimp-memory',
      title: 'Chimp Memory',
      subtitle: 'Working Memory Grid',
      category: 'memory',
      instructions: 'Remember the numbers, then click the blank tiles in ascending order (1, 2, 3...)!',
      controlsHint: 'Click or tap the tiles in sequence'
    });

    this.gridSize = 4; // 4x4 grid (16 tiles)
    this.currentNumCount = 4; // Starts at 4 numbers, increases on success
    this.nextExpectedNumber = 1;
    this.tileMap = new Map(); // tileIndex -> number
    this.isMasked = false;
    this.gridEl = null;
    this.infoEl = null;
    this.previewTimeout = null;
    this.trialLocked = false;
  }

  init(context) {
    super.init(context);
    this.currentNumCount = Math.max(3, Math.min(8, 3 + this.difficulty));
    this.renderLayout();
  }

  renderLayout() {
    this.container.innerHTML = `
      <div class="game-wrapper chimp-view">
        <div class="memory-hud-bar">
          <div class="memory-level-chip">
            <span class="material-symbols-outlined text-[15px]">psychology</span>
            <span>SEQUENCE: <strong id="sequence-len">${this.currentNumCount}</strong></span>
          </div>
          <span id="memory-instruction-hint" class="memory-status-hint" aria-live="polite">Memorize the positions...</span>
        </div>
        <div class="chimp-board-frame">
          <div id="chimp-grid" class="chimp-grid-board" role="group" aria-label="Memory number tiles"></div>
        </div>
      </div>
    `;

    this.gridEl = this.container.querySelector('#chimp-grid');
    this.infoEl = this.container.querySelector('#memory-instruction-hint');
  }

  start() {
    super.start();
    this.newTrial();
  }

  newTrial() {
    if (!this.isActive) return;

    if (this.previewTimeout) {
      clearTimeout(this.previewTimeout);
      this.previewTimeout = null;
    }

    this.nextExpectedNumber = 1;
    this.trialLocked = false;
    this.isMasked = false;
    this.tileMap.clear();

    const totalCells = this.gridSize * this.gridSize; // 16
    // Choose random unique indices for numbers 1..N
    const indices = [];
    while (indices.length < this.currentNumCount) {
      const rand = Math.floor(Math.random() * totalCells);
      if (!indices.includes(rand)) {
        indices.push(rand);
      }
    }

    indices.forEach((cellIdx, numIdx) => {
      this.tileMap.set(cellIdx, numIdx + 1);
    });

    this.renderGrid(false);
    this.updateHUD();

    // Auto-mask after preview duration (scales with count)
    const previewDuration = Math.max(900, 1500 - (this.difficulty * 100));
    this.previewTimeout = setTimeout(() => {
      this.maskGrid();
    }, previewDuration);
  }

  updateHUD() {
    const lenEl = this.container.querySelector('#sequence-len');
    if (lenEl) lenEl.textContent = this.currentNumCount;
    if (this.infoEl) {
      this.infoEl.textContent = this.isMasked
        ? `Click ${this.nextExpectedNumber} from memory!`
        : `Memorize the tiles! (${this.currentNumCount} numbers)`;
    }
  }

  renderGrid(masked) {
    this.gridEl.innerHTML = '';
    const totalCells = this.gridSize * this.gridSize;

    for (let i = 0; i < totalCells; i++) {
      const tile = document.createElement(this.tileMap.has(i) ? 'button' : 'div');
      tile.className = 'chimp-tile';
      tile.dataset.index = i;

      if (this.tileMap.has(i)) {
        const val = this.tileMap.get(i);
        tile.type = 'button';
        tile.classList.add('has-number');
        // Numbered tiles are inert during the memorization preview. They become
        // available only when the grid has actually been masked.
        tile.disabled = !masked;

        if (masked) {
          tile.classList.add('masked');
          tile.textContent = '';
        } else {
          tile.textContent = val;
        }
        tile.setAttribute('aria-label', masked ? `Tile ${i + 1}, hidden number` : `Tile ${i + 1}, number ${val}`);

        tile.addEventListener('click', (e) => this.handleTileClick(i, val, tile, e));
      } else {
        tile.classList.add('empty-cell');
      }

      this.gridEl.appendChild(tile);
    }
  }

  maskGrid() {
    if (!this.isActive || this.isMasked) return;
    this.isMasked = true;
    this.updateHUD();

    const tiles = this.gridEl.querySelectorAll('.chimp-tile.has-number');
    tiles.forEach(tile => {
      tile.classList.add('masked');
      tile.textContent = '';
      tile.disabled = false;
      tile.setAttribute('aria-label', `Tile ${Number(tile.dataset.index) + 1}, hidden number`);
    });
  }

  handleTileClick(index, value, tileEl, event) {
    if (!this.isActive || this.isPaused || this.trialLocked || !this.isMasked) return;

    // Already solved tile clicked
    if (tileEl.classList.contains('solved')) return;

    const coords = event ? { x: event.clientX, y: event.clientY } : null;

    if (value === this.nextExpectedNumber) {
      // Correct tile clicked!
      tileEl.classList.remove('masked');
      tileEl.classList.add('solved');
      tileEl.disabled = true;
      tileEl.textContent = value;
      tileEl.setAttribute('aria-label', `Tile ${index + 1}, number ${value}, found`);

      if (this.ctx && this.ctx.sound) {
        this.ctx.sound.playCorrect(this.nextExpectedNumber);
      }

      this.nextExpectedNumber++;
      this.updateHUD();

      // Check if trial complete
      if (this.nextExpectedNumber > this.currentNumCount) {
        this.trialLocked = true;
        // Full sequence solved!
        const points = this.currentNumCount * 40;
        this.awardScore(points, coords);

        if (this.currentNumCount < 9) {
          this.currentNumCount++;
        }

        setTimeout(() => this.newTrial(), 300);
      }
    } else {
      this.trialLocked = true;
      // Mistake!
      tileEl.classList.add('failed');
      tileEl.textContent = value;
      this.penalizeError();

      // Reveal all numbers to show the player
      const tiles = this.gridEl.querySelectorAll('.chimp-tile.has-number');
      tiles.forEach(t => {
        const idx = parseInt(t.dataset.index, 10);
        t.classList.remove('masked');
        t.textContent = this.tileMap.get(idx);
        t.setAttribute('aria-label', `Tile ${idx + 1}, number ${this.tileMap.get(idx)}`);
      });

      // Decrease difficulty slightly if above 3
      if (this.currentNumCount > 3) {
        this.currentNumCount--;
      }

      setTimeout(() => this.newTrial(), 800);
    }
  }

  cleanup() {
    if (this.previewTimeout) {
      clearTimeout(this.previewTimeout);
      this.previewTimeout = null;
    }
    super.cleanup();
  }
}
