/**
 * NumberSequence.js
 * Inductive logic & pattern recognition game.
 * Identifies mathematical rules in sequences to find the missing number.
 */

import { BaseGame } from './BaseGame.js';

export class NumberSequenceGame extends BaseGame {
  constructor() {
    super({
      id: 'number-sequence',
      title: 'Pattern Sequence',
      swahiliTitle: 'Mfuatano wa Nambari',
      category: 'logic',
      instructions: 'Find the hidden rule and select the next number in the sequence!',
      controlsHint: 'Tap options or press keys 1, 2, 3, 4'
    });

    this.currentSequence = null;
    this.sequenceDisplayEl = null;
    this.optionsGridEl = null;
    this.questionStartTime = 0;
  }

  init(context) {
    super.init(context);
    this.renderLayout();
    this.bindKeyboard();
  }

  renderLayout() {
    this.container.innerHTML = `
      <div class="game-wrapper sequence-view">
        <div class="game-prompt-card sequence-card">
          <div class="prompt-hint-badge">FIND THE NEXT NUMBER</div>
          <div id="sequence-chips-container" class="sequence-chips-row"></div>
        </div>
        <div id="sequence-options-grid" class="options-grid grid-2x2"></div>
      </div>
    `;

    this.sequenceDisplayEl = this.container.querySelector('#sequence-chips-container');
    this.optionsGridEl = this.container.querySelector('#sequence-options-grid');
  }

  bindKeyboard() {
    this.addListener(window, 'keydown', (e) => {
      if (!this.isActive || this.isPaused) return;
      const numKeys = { '1': 0, '2': 1, '3': 2, '4': 3 };
      if (e.key in numKeys) {
        const buttons = this.optionsGridEl.querySelectorAll('.seq-choice-btn');
        const idx = numKeys[e.key];
        if (buttons[idx]) buttons[idx].click();
      }
    });
  }

  start() {
    super.start();
    this.nextSequence();
  }

  nextSequence() {
    if (!this.isActive) return;

    this.currentSequence = this.generatePattern();
    this.displaySequence();
    this.questionStartTime = performance.now();
  }

  generatePattern() {
    const patternTypes = ['linear-add', 'linear-sub', 'multiply', 'squares', 'alternating'];
    const chosen = patternTypes[Math.floor(Math.random() * patternTypes.length)];

    let seq = [];
    let nextVal = 0;

    if (chosen === 'linear-add') {
      const step = Math.floor(Math.random() * 7) + 2; // +2 to +8
      const start = Math.floor(Math.random() * 20) + 1;
      seq = [start, start + step, start + step * 2, start + step * 3];
      nextVal = start + step * 4;
    } else if (chosen === 'linear-sub') {
      const step = Math.floor(Math.random() * 6) + 3; // -3 to -8
      const start = 40 + Math.floor(Math.random() * 30);
      seq = [start, start - step, start - step * 2, start - step * 3];
      nextVal = start - step * 4;
    } else if (chosen === 'multiply') {
      const factor = 2; // Doubling
      const start = Math.floor(Math.random() * 6) + 2;
      seq = [start, start * factor, start * factor * 2, start * factor * 4];
      nextVal = start * factor * 8;
    } else if (chosen === 'squares') {
      const startN = Math.floor(Math.random() * 4) + 1;
      seq = [startN * startN, (startN + 1) * (startN + 1), (startN + 2) * (startN + 2), (startN + 3) * (startN + 3)];
      nextVal = (startN + 4) * (startN + 4);
    } else {
      // Alternating +A then -B
      const add = Math.floor(Math.random() * 5) + 4;
      const sub = Math.floor(Math.random() * 3) + 1;
      let val = Math.floor(Math.random() * 15) + 5;
      seq = [val];
      for (let i = 0; i < 3; i++) {
        val = (i % 2 === 0) ? val + add : val - sub;
        seq.push(val);
      }
      nextVal = (seq.length % 2 === 1) ? val + add : val - sub;
    }

    // Generate distractors
    const distractors = new Set();
    const offsets = [-4, -2, -1, 1, 2, 4, 10];
    while (distractors.size < 3) {
      const off = offsets[Math.floor(Math.random() * offsets.length)];
      const candidate = nextVal + off;
      if (candidate !== nextVal) {
        distractors.add(candidate);
      }
    }

    const options = [nextVal, ...Array.from(distractors)];
    // Shuffle options
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }

    return {
      sequence: seq,
      correctVal: nextVal,
      options: options
    };
  }

  displaySequence() {
    const q = this.currentSequence;
    this.sequenceDisplayEl.innerHTML = '';

    // Render sequence numbers
    q.sequence.forEach(num => {
      const chip = document.createElement('div');
      chip.className = 'sequence-chip';
      chip.textContent = num;
      this.sequenceDisplayEl.appendChild(chip);
    });

    // Render target "?" chip
    const questionChip = document.createElement('div');
    questionChip.className = 'sequence-chip sequence-chip-target';
    questionChip.textContent = '?';
    this.sequenceDisplayEl.appendChild(questionChip);

    // Render Options
    this.optionsGridEl.innerHTML = '';
    q.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'btn-choice seq-choice-btn';
      btn.dataset.val = opt;
      btn.innerHTML = `
        <span class="btn-key-badge">${idx + 1}</span>
        <span class="seq-val-text">${opt}</span>
      `;

      btn.addEventListener('click', (e) => this.handleAnswer(opt, e));
      this.optionsGridEl.appendChild(btn);
    });
  }

  handleAnswer(chosenVal, event) {
    if (!this.isActive || this.isPaused) return;

    const correct = chosenVal === this.currentSequence.correctVal;
    const coords = event ? { x: event.clientX, y: event.clientY } : null;

    if (correct) {
      const elapsed = performance.now() - this.questionStartTime;
      const speedBonus = elapsed < 1500 ? 50 : 0;
      this.awardScore(100 + speedBonus, coords);
      this.nextSequence();
    } else {
      this.penalizeError();
      const clickedBtn = event ? event.currentTarget : null;
      if (clickedBtn) clickedBtn.classList.add('btn-wrong');
      setTimeout(() => {
        this.nextSequence();
      }, 250);
    }
  }
}
