# 🎮 Bricked UP

A modern breakout/brick breaker game built with vanilla JavaScript and HTML5 Canvas. Control your paddle with your mouse to destroy all bricks and progress through increasingly challenging levels.

## 🎯 Features

- **Classic Breakout Gameplay** — Navigate a paddle to bounce balls and destroy bricks
- **Multiple Levels** — Progressively challenging level designs
- **Leaderboard** — Track high scores and names with browser-based local storage
- **Level Editor** — Create and test your own custom levels
- **Sound Effects** — Audio feedback for collisions, brick destruction, and game events
- **Smooth Physics** — Delta-time based physics system with collision detection
- **Responsive Canvas** — 1000×700px game viewport with visual polish
- **Info & Tutorials** — In-game help system to learn the controls

## 🚀 Getting Started

### Prerequisites
No build tools or installations needed! This is a vanilla JavaScript project that runs directly in any modern web browser.

## 🎮 How to Play

- **Move Paddle** — Move your mouse horizontally to control the paddle
- **Bounce Balls** — Hit balls with the paddle to break bricks
- **Destroy Bricks** — Clear all bricks on a level to advance
- **Collect Items** — Bouncing balls may trigger power-ups or debuffs
- **View Info** — Click the ℹ️ icon for tutorials and controls
- **Check Leaderboard** — Click the 📊 icon to see high scores
- **Custom Levels** — Click the ✏️ icon to create and test your own levels

## 📁 Project Structure

```
bricked-up/
├── index.html              # Main HTML entry point
├── css/
│   ├── style.css          # Core game styling
│   └── classes.css        # Component classes
├── js/
│   ├── gameEngine.js      # Core render loop and node management
│   ├── gameLogic.js       # Game initialization and level loading
│   ├── gameObjects.js     # Game entity classes (Paddle, Ball, Brick, etc.)
│   ├── gameManager.js     # Game state and flow management
│   ├── brickStats.js      # Brick statistics and scoring
│   ├── helpers.js         # Utility functions
│   ├── levelHelpers.js    # Level management utilities
│   ├── htmlHelpers.js     # UI modals and interactions
│   ├── levelEditor.js     # Custom level editor
│   └── swals.js           # SweetAlert2 modal configurations
├── levels/
│   └── levels.json        # Pre-designed levels
├── images/
│   ├── icon/              # App icon and favicon
│   └── site images/       # UI icons (info, leaderboard, editor)
├── sounds/
│   └── SFX/               # Audio effects for gameplay
└── LICENSE                # MIT License

```

## 🏗️ Architecture

### Core Systems

**Engine** (`gameEngine.js`)
- Manages the render loop using `requestAnimationFrame`
- Maintains a 5-layer z-index system for game objects
- Handles delta-time based physics updates
- Clears and redraws canvas each frame

**Input Manager** (`gameLogic.js` / Game Objects)
- Mouse tracking for paddle control
- Keyboard input handling (if applicable)

**Physics & Collision**
- Vector2-based position and velocity system
- Collision detection between balls, bricks, paddle, and world borders
- Delta-time independent frame updates (safeDelta clamped to 0.1s)

**Game Objects**
- **Paddle** — Player-controlled entity, always on top layer
- **Ball** — Physics-based projectile with collision response
- **Brick** — Destructible objects with health/type system
- **Item** — Power-ups or debuffs dropped by bricks
- **WorldBorder** — Invisible boundaries and lose condition

### Persistent Data
- **Leaderboard** — Stored in browser `localStorage` with score and player name
- **Levels** — Defined in `levels.json`, loaded at runtime
- **Audio** — Preloaded on startup via `AudioManager`

## 🛠️ Development

### Adding a New Level
1. Open `levels/levels.json`
2. Add a new level object with brick layout
3. Reload the game to access it

### Customizing Game Rules
- Physics parameters (speed, bounce, gravity) — Edit in `gameObjects.js`
- Brick health/damage — Modify in `brickStats.js`
- Canvas size — Update `Viewport` in `gameLogic.js` and HTML canvas dimensions

### Adding Sound Effects
1. Place audio file in `sounds/SFX/`
2. Preload in `loadAudio()` function in `gameLogic.js`
3. Trigger with `Globals.audio.play("sound_name")`

## 📊 Credits

Credits are embedded in the top-left corner of the game screen. Click to view.

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

## 🎨 Stack

- **Frontend** — Vanilla JavaScript (ES6+), HTML5 Canvas, CSS3
- **Audio** — Web Audio API
- **Data Persistence** — Browser localStorage
- **UI Framework** — SweetAlert2 (for modals)

---

Built with 🧡 by [Benjamin Ipavec](https://github.com/RealBenjo)
