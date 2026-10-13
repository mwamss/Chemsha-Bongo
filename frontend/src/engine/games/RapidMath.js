/**
 * RapidMath.js
 * High-speed mental calculation challenge.
 * Mixes fast arithmetic multiple-choice and True/False equations under pressure.
 */

import { BaseGame } from './BaseGame.js';

export class RapidMathGame extends BaseGame {
  constructor() {
    super({
      id: 'rapid-math',
      title: 'Rapid Math',
      subtitle: 'Mental Arithmetic',
      category: 'math',
      instructions: 'Solve the equation as fast as you can! Beat the ticking clock.',
      controlsHint: 'Tap options or press keys 1, 2, 3, 4'
    });

    this.currentProblem = null;
    this.problemEl = null;
    this.optionsContainer = null;
    this.problemStartTime = 0;
  }

  init(context) {
    super.init(context);
    this.renderLayout();
    this.bindKeyboard();
  }

  renderLayout() {
    this.container.innerHTML = `
      <div class="game-wrapper math-view">
        <div class="game-prompt-card math-card">
          <div class="prompt-hint-badge" id="math-type-badge">QUICK CALCULATION</div>
          <div id="math-equation" class="equation-display">...</div>
        </div>
        <div id="math-options-grid" class="options-grid grid-2x2"></div>
      </div>
    `;

    this.problemEl = this.container.querySelector('#math-equation');
    this.optionsContainer = this.container.querySelector('#math-options-grid');
  }

  bindKeyboard() {
    this.addListener(window, 'keydown', (e) => {
      if (!this.isActive || this.isPaused) return;

      const numKeys = { '1': 0, '2': 1, '3': 2, '4': 3 };
      if (e.key in numKeys) {
        const buttons = this.optionsContainer.querySelectorAll('.math-choice-btn');
        const idx = numKeys[e.key];
        if (buttons[idx]) buttons[idx].click();
      }

      // Also support T / F or Y / N for True/False questions
      if (this.currentProblem && this.currentProblem.isTrueFalse) {
        if (e.key.toLowerCase() === 't' || e.key === 'ArrowLeft') {
          const btnTrue = this.optionsContainer.querySelector('[data-val="true"]');
          if (btnTrue) btnTrue.click();
        } else if (e.key.toLowerCase() === 'f' || e.key === 'ArrowRight') {
          const btnFalse = this.optionsContainer.querySelector('[data-val="false"]');
          if (btnFalse) btnFalse.click();
        }
      }
    });
  }

  start() {
    super.start();
    this.nextProblem();
  }

  nextProblem() {
    if (!this.isActive) return;

    // 40% chance of True/False, 60% chance of Multiple Choice
    const isTrueFalse = Math.random() < 0.4;
    this.currentProblem = isTrueFalse
      ? this.generateTrueFalseProblem()
      : this.generateMultipleChoiceProblem();

    this.displayProblem();
    this.problemStartTime = performance.now();
  }

  generateMultipleChoiceProblem() {
    const ops = ['+', '-', '*'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let a, b, answer;

    if (op === '+') {
      a = Math.floor(Math.random() * 40) + 10;
      b = Math.floor(Math.random() * 40) + 5;
      answer = a + b;
    } else if (op === '-') {
      a = Math.floor(Math.random() * 50) + 20;
      b = Math.floor(Math.random() * (a - 5)) + 5;
      answer = a - b;
    } else {
      // Multiplication
      a = Math.floor(Math.random() * 11) + 2;
      b = Math.floor(Math.random() * 11) + 2;
      answer = a * b;
    }

    const symbol = op === '*' ? '×' : op;
    const equationText = `${a} ${symbol} ${b} = ?`;

    // Generate 3 clever distractors
    const distractors = new Set();
    const offsets = [-10, -2, -1, 1, 2, 10];
    while (distractors.size < 3) {
      const offset = offsets[Math.floor(Math.random() * offsets.length)];
      const candidate = answer + offset;
      if (candidate > 0 && candidate !== answer) {
        distractors.add(candidate);
      }
    }

    const options = [answer, ...Array.from(distractors)];
    // Shuffle options
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }

    return {
      isTrueFalse: false,
      text: equationText,
      correctValue: answer,
      options: options.map(opt => ({ label: `${opt}`, val: opt }))
    };
  }

  generateTrueFalseProblem() {
    const ops = ['+', '-', '*'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let a, b, actualAnswer;

    if (op === '+') {
      a = Math.floor(Math.random() * 35) + 10;
      b = Math.floor(Math.random() * 35) + 10;
      actualAnswer = a + b;
    } else if (op === '-') {
      a = Math.floor(Math.random() * 60) + 20;
      b = Math.floor(Math.random() * 30) + 5;
      actualAnswer = a - b;
    } else {
      a = Math.floor(Math.random() * 9) + 3;
      b = Math.floor(Math.random() * 9) + 3;
      actualAnswer = a * b;
    }

    const isCorrectEquation = Math.random() < 0.5;
    let displayedResult = actualAnswer;
    if (!isCorrectEquation) {
      const offset = (Math.random() < 0.5 ? 1 : -1) * (Math.random() < 0.5 ? 10 : 2);
      displayedResult = actualAnswer + offset;
    }

    const symbol = op === '*' ? '×' : op;
    const equationText = `${a} ${symbol} ${b} = ${displayedResult}`;

    return {
      isTrueFalse: true,
      text: equationText,
      correctValue: isCorrectEquation,
      options: [
        { label: '✓ TRUE', val: true, style: 'btn-tf-true' },
        { label: '✗ FALSE', val: false, style: 'btn-tf-false' }
      ]
    };
  }

  displayProblem() {
    const q = this.currentProblem;
    const badge = this.container.querySelector('#math-type-badge');
    if (badge) {
      badge.textContent = q.isTrueFalse ? 'IS THIS EQUATION ACCURATE?' : 'SOLVE THE EQUATION';
    }

    this.problemEl.textContent = q.text;
    this.optionsContainer.innerHTML = '';
    this.optionsContainer.className = q.isTrueFalse ? 'options-grid grid-1x2' : 'options-grid grid-2x2';

    q.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = `btn-choice math-choice-btn ${opt.style || ''}`;
      btn.dataset.val = `${opt.val}`;
      btn.innerHTML = `
        <span class="btn-key-badge">${idx + 1}</span>
        <span class="math-opt-label">${opt.label}</span>
      `;

      btn.addEventListener('click', (e) => {
        this.handleAnswer(opt.val, e);
      });

      this.optionsContainer.appendChild(btn);
    });
  }

  handleAnswer(chosenVal, event) {
    if (!this.isActive || this.isPaused) return;

    const isMatch = chosenVal === this.currentProblem.correctValue;
    const coords = event ? { x: event.clientX, y: event.clientY } : null;

    if (isMatch) {
      const elapsed = performance.now() - this.problemStartTime;
      const speedBonus = elapsed < 1200 ? 50 : 0;
      this.awardScore(100 + speedBonus, coords);
      this.nextProblem();
    } else {
      this.penalizeError();
      const clickedBtn = event ? event.currentTarget : null;
      if (clickedBtn) {
        clickedBtn.classList.add('btn-wrong');
      }
      setTimeout(() => {
        this.nextProblem();
      }, 250);
    }
  }
}
