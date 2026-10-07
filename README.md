# 🧠 Chemsha Bongo

> *A simple game that challenges the brain and increases dopamine. (in theory)*

**Chemsha Bongo** (*"Boil Your Brain"* in Swahili) is a sleek, fast-paced cognitive reflex and mental workout suite built with modern web technologies. Designed for quick 30–60 second mental resets, it features zero external dependencies, native Web Audio API sound synthesis, precision timers, combo streaks, and five challenging brain games.

---

## 🎮 Mini-Games

| Game | Category | Instructions | Controls |
| :--- | :--- | :--- | :--- |
| **🎨 Color Clash** *(Mgongano wa Rangi)* | **Attention & Inhibition** | Classic Stroop Effect: Click the **ink color** of the letters — do *not* read the text! | `1, 2, 3, 4` or Click/Tap |
| **🐵 Chimp Memory** *(Kumbukumbu ya Sokwe)* | **Working Memory** | Kyoto Primate Memory Test: Numbers flash briefly then turn blank. Click the tiles in ascending order (`1, 2, 3...`). | Click/Tap tiles |
| **⚡ Rapid Math** *(Hesabu Haraka)* | **Calculation** | Fast mental arithmetic: Solve equations and True/False questions before the clock expires. | `1, 2, 3, 4` or `T`/`F` / Click |
| **🧭 Confusing Arrows** *(Mielekeo Yenye Mitego)* | **Spatial Reflex** | If the arrow is **Green**, press where it points. If **Red**, press the **opposite direction**! | Arrow Keys, `WASD`, or D-Pad |
| **🧩 Pattern Sequence** *(Mfuatano wa Nambari)* | **Logic & Deduction** | Uncover the mathematical pattern in 4 numbers and deduce the missing fifth element (`?`). | `1, 2, 3, 4` or Click/Tap |

---

## ⚡ Game Modes

1. **Daily Blitz (`Mchakamchaka`)**:
   - 3 rapid mini-games chosen randomly, back-to-back (30s each).
   - Dynamic scoring with combo multipliers (`x1` up to `x4` hot streak).
   - Generates your overall **Brain Quotient (BQ)** rating:
     - 🧠 *Grandmaster (Bingwa Mkuu)*
     - ⚡ *Genius (Mwenye Kipaji)*
     - 🔥 *Sharpshooter (Hodari)*
     - 🎯 *Quick Thinker (Mchangamfu)*
     - 🎓 *Novice (Mwanafunzi)*

2. **Free Play (`Chagua Mchezo`)**:
   - Pick any mini-game individually to practice and beat your personal records.

3. **Stats & Records (`Kumbukumbu`)**:
   - Tracks games played, career accuracy %, highest streaks, and personal best scores locally via `localStorage`.

---

## 🔊 Audio & Visuals

- **100% Native Web Audio API**: No external `.mp3` downloads required; sounds are synthesized procedurally in real-time.
- **Particle & Confetti FX**: Smooth HTML5 Canvas particle bursts on combos and confetti celebrations on new high scores.
- **Dark-First Cyber-Clean UI**: Glassmorphic styling with high-contrast cues and responsive touch/keyboard navigation.

---

## 🚀 How to Run Locally

### Option 1: One-Click Windows Launch
Double-click `start.bat` in the project folder. It will start the local server and open your default browser automatically.

### Option 2: Python Command Line
Run the included python server:
```bash
python serve.py
```
Or run the standard HTTP server:
```bash
python -m http.server 8000
```
Then open `http://localhost:8000` in your web browser.

---

## 🌐 Deploy to GitHub Pages

1. Commit and push the code to your GitHub repository:
   ```bash
   git add .
   git commit -m "Build Chemsha Bongo cognitive suite"
   git push origin main
   ```
2. In your GitHub repository, go to **Settings** > **Pages**.
3. Under **Build and deployment** > **Source**, choose **Deploy from a branch** and select `main` branch / `root`.
4. Click **Save** — your game is live online!

---

## 📄 License
This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
