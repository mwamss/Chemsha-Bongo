# 🧠 Chemsha Bongo

> *A simple game that challenges the brain and increases dopamine. (in theory)*

**Chemsha Bongo** is a sleek, fast-paced cognitive reflex and mental workout suite built with modern web technologies. Designed for quick 30–60 second mental resets, it features zero external dependencies, native Web Audio API sound synthesis, precision timers, combo streaks, and five challenging brain games.

---

## 🎮 Mini-Games

| Game | Category | Instructions | Controls |
| :--- | :--- | :--- | :--- |
| **🎨 Color Clash** | **Attention & Inhibition** | Classic Stroop Effect: Click the **ink color** of the letters — do *not* read the text! | `1, 2, 3, 4` or Click/Tap |
| **🐵 Chimp Memory** | **Working Memory** | Kyoto Primate Memory Test: Numbers flash briefly then turn blank. Click the tiles in ascending order (`1, 2, 3...`). | Click/Tap tiles |
| **⚡ Rapid Math** | **Calculation** | Fast mental arithmetic: Solve equations and True/False questions before the clock expires. | `1, 2, 3, 4` or `T`/`F` / Click |
| **🧭 Confusing Arrows** | **Spatial Reflex** | If the arrow is **Green**, press where it points. If **Red**, press the **opposite direction**! | Arrow Keys, `WASD`, or D-Pad |
| **🧩 Pattern Sequence** | **Logic & Deduction** | Uncover the mathematical pattern in 4 numbers and deduce the missing fifth element (`?`). | `1, 2, 3, 4` or Click/Tap |

---

## ⚡ Game Modes

1. **Daily Blitz**:
   - 3 rapid mini-games chosen randomly, back-to-back (30s each).
   - Dynamic scoring with combo multipliers (`x1` up to `x4` hot streak).
   - Generates your overall **Brain Quotient (BQ)** rating:
     - 🧠 *Grandmaster*
     - ⚡ *Genius*
     - 🔥 *Sharpshooter*
     - 🎯 *Quick Thinker*
     - 🎓 *Novice*

2. **Free Play**:
   - Pick any mini-game individually to practice and beat your personal records.

3. **Stats & Records**:
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

## Connect Google Stitch MCP in VS Code

This repository includes a workspace MCP configuration at `.vscode/mcp.json`
for the official Google Stitch HTTP server. VS Code prompts for your API key
when the server starts; the key is not stored in this repository.

1. Revoke the API key shared in chat and create a replacement in Google Cloud
   Console.
2. Open this repository as a VS Code workspace.
3. Open Chat, select **Agent** mode, and open the tools/MCP menu.
4. Start or enable the `stitch` server.
5. Enter the replacement Stitch API key when VS Code prompts for it.
6. Confirm that Stitch tools appear in the available tools list.

For guided setup instead, run this from the project folder:

```bash
npx @_davideast/stitch-mcp init
```

Never commit an API key to `mcp.json`, `.env`, or source files.

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
