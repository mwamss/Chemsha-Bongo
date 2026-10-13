/**
 * ColorClash.js
 * Mini-game testing attention inhibition and cognitive flexibility (Stroop Effect).
 * Players must choose the INK COLOR of the word, ignoring what the word actually spells!
 */

import { BaseGame } from './BaseGame.js';

const COLOR_PALETTE = [
  { name: 'RED', hex: '#ef4444' },
  { name: 'BLUE', hex: '#3b82f6' },
  { name: 'GREEN', hex: '#10b981' },
  { name: 'YELLOW', hex: '#facc15' },
  { name: 'PURPLE', hex: '#a855f7' },
  { name: 'ORANGE', hex: '#f97316' }
];

export class ColorClashGame extends BaseGame {
  constructor() {
    super({
      id: 'color-clash',
      title: 'Color Clash',
      subtitle: 'Inhibition Challenge',
      category: 'focus',
      instructions: 'Click the INK COLOR of the word — DO NOT read the text!',
      controlsHint: 'Tap buttons or press keys 1, 2, 3, 4'
    });

    this.currentQuestion = null;
    this.promptEl = null;
    this.buttonsContainer = null;
    this.questionStartTime = 0;
  }

  init(context) {
    super.init(context);
    this.renderLayout();
    this.bindKeyboard();
  }

  renderLayout() {
    this.container.innerHTML = `
      <div class="game-wrapper color-clash-view">
        <div class="game-prompt-card">
          <div class="prompt-hint-badge">WHAT IS THE INK COLOR?</div>
          <div id="stroop-word" class="stroop-display-word">READY</div>
        </div>
        <div id="color-options-grid" class="options-grid grid-2x2"></div>
      </div>
    `;

    this.promptEl = this.container.querySelector('#stroop-word');
    this.buttonsContainer = this.container.querySelector('#color-options-grid');
  }

  bindKeyboard() {
    this.addListener(window, 'keydown', (e) => {
      if (!this.isActive || this.isPaused) return;
      const keyMap = { '1': 0, '2': 1, '3': 2, '4': 3 };
      if (e.key in keyMap) {
        const buttons = this.buttonsContainer.querySelectorAll('.color-choice-btn');
        const index = keyMap[e.key];
        if (buttons[index]) {
          buttons[index].click();
        }
      }
    });
  }

  start() {
    super.start();
    this.nextQuestion();
  }

  nextQuestion() {
    if (!this.isActive) return;

    // Pick two different colors: one for text, one for ink
    const wordColorObj = COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
    let inkColorObj;
    do {
      inkColorObj = COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
    } while (inkColorObj.name === wordColorObj.name);

    // Pick 3 distractor colors plus the correct ink color
    const distractors = COLOR_PALETTE.filter(c => c.name !== inkColorObj.name);
    // Shuffle distractors
    for (let i = distractors.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [distractors[i], distractors[j]] = [distractors[j], distractors[i]];
    }

    const options = [inkColorObj, distractors[0], distractors[1], distractors[2]];
    // Shuffle options
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }

    this.currentQuestion = {
      wordText: wordColorObj.name,
      correctColor: inkColorObj,
      options: options
    };

    this.displayQuestion();
    this.questionStartTime = performance.now();
  }

  displayQuestion() {
    const q = this.currentQuestion;
    this.promptEl.textContent = q.wordText;
    this.promptEl.style.color = q.correctColor.hex;
    this.promptEl.style.textShadow = `0 0 20px ${q.correctColor.hex}44`;

    this.buttonsContainer.innerHTML = '';
    q.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'btn-choice color-choice-btn';
      btn.dataset.colorName = opt.name;
      btn.innerHTML = `
        <span class="btn-key-badge">${idx + 1}</span>
        <span class="color-dot" style="background-color: ${opt.hex}"></span>
        <span class="color-label">${opt.name}</span>
      `;

      btn.addEventListener('click', (e) => {
        this.handleAnswer(opt.name, e);
      });

      this.buttonsContainer.appendChild(btn);
    });
  }

  handleAnswer(chosenName, event) {
    if (!this.isActive || this.isPaused) return;

    const correct = chosenName === this.currentQuestion.correctColor.name;
    const clickCoords = event ? { x: event.clientX, y: event.clientY } : null;

    if (correct) {
      // Speed bonus if answered in under 1 second
      const timeTaken = performance.now() - this.questionStartTime;
      const speedBonus = timeTaken < 900 ? 50 : 0;
      this.awardScore(100 + speedBonus, clickCoords);
      this.nextQuestion();
    } else {
      this.penalizeError();
      // Highlight wrong button
      const clickedBtn = event ? event.currentTarget : null;
      if (clickedBtn) {
        clickedBtn.classList.add('btn-wrong');
      }
      // Quick flash before advancing
      setTimeout(() => {
        this.nextQuestion();
      }, 250);
    }
  }
}
