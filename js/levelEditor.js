class LevelEditor {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    this.maxCols = 20;
    this.brickWidth = this.canvas.width / this.maxCols;
    this.brickHeight = 20;

    // =========================
    // PAINTING BOUNDARIES (0-indexed)
    // =========================
    // 3rd row = index 2
    this.minAllowedRow = 2; 
    // 27th row = index 26
    this.maxAllowedRow = 26; 
    
    this.bricks = [];

    this.currentColorIndex = 0;
    this.colors = Object.keys(BrickStat.Colors);
    
    this.currentStatIndex = 0;
    this.stats = Object.keys(StatRegistry);
    
    this.isActive = false;
    this.animationFrameId = null;

    // Mouse state
    this.isMouseDown = false;
    this.mouseButton = null;
    this.lastCol = null;
    this.lastRow = null;

    // Bindings
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.preventContextMenu = (e) => e.preventDefault();

    this.fullJsonData = null;
    this.currentLevelIndex = 0;
  }

  start() {
    this.isActive = true;

    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('contextmenu', this.preventContextMenu);
    window.addEventListener('keydown', this.onKeyDown);

    // Fetch the existing levels when the editor starts
    this.loadLevels();

    this.render();
  }

  stop() {
    this.isActive = false;

    cancelAnimationFrame(this.animationFrameId);

    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    this.canvas.removeEventListener('contextmenu', this.preventContextMenu);
    window.removeEventListener('keydown', this.onKeyDown);

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // =========================
  // LEVEL LOADING & SWITCHING
  // ========================= 
  
  async loadLevels() {
    try {
      const response = await fetch('levels/levels.json');
      if (!response.ok) throw new Error("Could not find levels/levels.json");
      
      this.fullJsonData = await response.json();
      this.loadCurrentLevelFromMemory();
      
    } catch (error) {
      console.error("Failed to load levels.json. Are you running a local web server?", error);
    }
  }

  loadCurrentLevelFromMemory() {
    if (!this.fullJsonData) return;

    // Check if the JSON is an array of levels, or a single level object
    const levelToLoad = Array.isArray(this.fullJsonData) 
      ? this.fullJsonData[this.currentLevelIndex] 
      : this.fullJsonData;

    if (levelToLoad && levelToLoad.bricks) {
      // Convert the 1-indexed coordinates back to 0-indexed for the editor
      this.bricks = levelToLoad.bricks.map(b => ({
        col: b.col - 1,
        row: b.row - 1,
        stat: b.stat,
        color: b.color
      }));
      console.log(`Successfully loaded data for Level ${this.currentLevelIndex + 1}!`);
    } else {
      this.bricks = []; // Clear board if level is empty
    }
  }

  switchLevel(delta) {
    if (!this.fullJsonData || !Array.isArray(this.fullJsonData)) {
      console.warn("Multiple levels not loaded. Cannot switch.");
      return;
    }

    // 1. Save current work to memory so it isn't lost when switching
    this.saveCurrentLevelToMemory();

    // 2. Safely increment/decrement the level index (wrapping around)
    const numLevels = this.fullJsonData.length;
    this.currentLevelIndex = (this.currentLevelIndex + delta + numLevels) % numLevels;

    // 3. Load the new level
    this.loadCurrentLevelFromMemory();
  }

  saveCurrentLevelToMemory() {
    if (!this.fullJsonData) return;

    const sortedBricks = [...this.bricks].sort((a, b) => {
      if (a.row === b.row) return a.col - b.col;
      return a.row - b.row;
    });

    const exportedBricks = sortedBricks.map(b => {
      const brick = {
        col: b.col + 1,
        row: b.row + 1,
        stat: b.stat
      };
      if (b.color) brick.color = b.color;
      return brick;
    });

    if (Array.isArray(this.fullJsonData)) {
      this.fullJsonData[this.currentLevelIndex].bricks = exportedBricks;
    } else {
      this.fullJsonData.bricks = exportedBricks;
    }
  }

  // =========================
  // INPUT
  // =========================

  onMouseDown(e) {
    if (!this.isActive) return;

    this.isMouseDown = true;
    this.mouseButton = e.button;

    const { col, row } = this.getCellFromMouse(e);

    this.lastCol = col;
    this.lastRow = row;

    this.paintCell(col, row);
  }

  onMouseMove(e) {
    if (!this.isActive || !this.isMouseDown) return;

    const { col, row } = this.getCellFromMouse(e);

    // interpolate between last cell and current
    this.paintLine(this.lastCol, this.lastRow, col, row);

    this.lastCol = col;
    this.lastRow = row;
  }

  onMouseUp() {
    this.isMouseDown = false;
    this.mouseButton = null;
    this.lastCol = null;
    this.lastRow = null;
  }

  getCellFromMouse(e) {
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    return {
      col: Math.floor(mouseX / this.brickWidth),
      row: Math.floor(mouseY / this.brickHeight)
    };
  }

  // =========================
  // PAINTING
  // =========================

  paintCell(col, row) {
    // Prevent painting or erasing outside the defined row boundaries
    if (row < this.minAllowedRow || row > this.maxAllowedRow) {
      return; 
    }

    if (this.mouseButton === 0) {
      const existingIndex = this.bricks.findIndex(b => b.col === col && b.row === row);
      
      const newBrick = {
        col,
        row,
        stat: this.stats[this.currentStatIndex],
        color: this.colors[this.currentColorIndex]
      };

      if (existingIndex !== -1) {
        this.bricks[existingIndex] = newBrick;
      } else {
        this.bricks.push(newBrick);
      }
    } else if (this.mouseButton === 2) {
      this.removeBrick(col, row);
    }
  }

  paintLine(x0, y0, x1, y1) {
    let dx = Math.abs(x1 - x0);
    let dy = Math.abs(y1 - y0);
    let sx = x0 < x1 ? 1 : -1;
    let sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      this.paintCell(x0, y0);
      if (x0 === x1 && y0 === y1) break;

      let e2 = 2 * err;

      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }

      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  removeBrick(col, row) {
    this.bricks = this.bricks.filter(b => b.col !== col || b.row !== row);
  }

  // =========================
  // KEYBOARD
  // =========================

  onKeyDown(e) {
    if (!this.isActive) return;

    // Stat Switch
    if (e.key.toLowerCase() === 'q') {
      this.currentStatIndex = (this.currentStatIndex - 1 + this.stats.length) % this.stats.length;
    } else if (e.key.toLowerCase() === 'e') {
      this.currentStatIndex = (this.currentStatIndex + 1) % this.stats.length;
    }

    // Color Switch
    if (e.key.toLowerCase() === 'a' || e.key === 'ArrowLeft') {
      this.currentColorIndex = (this.currentColorIndex - 1 + this.colors.length) % this.colors.length;
    } else if (e.key.toLowerCase() === 'd' || e.key === 'ArrowRight') {
      this.currentColorIndex = (this.currentColorIndex + 1) % this.colors.length;
    }

    // Level Switch
    if (e.key.toLowerCase() === 'y') {
      this.switchLevel(-1); // Previous Level
    } else if (e.key.toLowerCase() === 'c') {
      this.switchLevel(1);  // Next Level
    }

    // Export
    if (e.key === 'Enter') {
      this.exportLevel();
    }
  }

  // =========================
  // EXPORT
  // =========================

  exportLevel() {
    // Force a save to the JSON object before formatting it
    this.saveCurrentLevelToMemory();

    let finalOutput;

    if (this.fullJsonData) {
      finalOutput = JSON.stringify(this.fullJsonData, null, 2);
    } else {
      // Fallback if no file was loaded and we created from scratch
      const singleLevel = {
        name: "Custom Editor Level",
        bricks: this.bricks.map(b => ({ col: b.col + 1, row: b.row + 1, stat: b.stat, color: b.color }))
      };
      finalOutput = JSON.stringify(singleLevel, null, 2);
    }

    // Post-process the JSON string to compress the brick objects onto a single line
    finalOutput = finalOutput.replace(/\{\s*"col":[\s\S]*?\}/g, (match) => {
      return match.replace(/\s+/g, ' ');
    });

    console.log(finalOutput);

    navigator.clipboard.writeText(finalOutput).then(() => {
      alert("Copied entire JSON to clipboard! Ready to paste into levels.json.");
    });
  }

  // =========================
  // RENDER
  // =========================

  render() {
    if (!this.isActive) return;

    this.ctx.fillStyle = "#111";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw restricted zones visually (Red tint)
    this.ctx.fillStyle = "rgba(255, 0, 0, 0.1)";
    
    // Top restricted area
    if (this.minAllowedRow > 0) {
      this.ctx.fillRect(0, 0, this.canvas.width, this.minAllowedRow * this.brickHeight);
    }
    
    // Bottom restricted area
    const bottomStartY = (this.maxAllowedRow + 1) * this.brickHeight;
    if (bottomStartY < this.canvas.height) {
      this.ctx.fillRect(0, bottomStartY, this.canvas.width, this.canvas.height - bottomStartY);
    }

    // Grid
    this.ctx.strokeStyle = "#333";
    this.ctx.beginPath();

    for (let x = 0; x <= this.canvas.width; x += this.brickWidth) {
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
    }

    for (let y = 0; y <= this.canvas.height; y += this.brickHeight) {
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
    }

    this.ctx.stroke();

    // Bricks
    this.bricks.forEach(b => {
      const color = BrickStat.Colors[b.color] || "white";
      this.ctx.fillStyle = color;

      const x = b.col * this.brickWidth;
      const y = b.row * this.brickHeight;

      this.ctx.fillRect(x, y, this.brickWidth, this.brickHeight);
      this.ctx.strokeStyle = "white";
      this.ctx.strokeRect(x, y, this.brickWidth, this.brickHeight);
    });

    this.drawUI();

    this.animationFrameId = requestAnimationFrame(() => this.render());
  }

  drawUI() {
    this.ctx.fillStyle = "rgba(0,0,0,0.8)";
    this.ctx.fillRect(0, this.canvas.height - 60, this.canvas.width, 60);

    this.ctx.fillStyle = "white";
    this.ctx.font = "16px monospace";

    this.ctx.fillText(`[Drag LMB]: Paint   [Drag RMB]: Erase   [Enter]: Export   [Y/C]: Switch Level`, 20, this.canvas.height - 35);

    const currColor = this.colors[this.currentColorIndex];
    const currStat = this.stats[this.currentStatIndex];

    this.ctx.fillText(`Color: `, 20, this.canvas.height - 15);
    this.ctx.fillStyle = BrickStat.Colors[currColor] || "white";
    this.ctx.fillText(currColor, 80, this.canvas.height - 15);

    this.ctx.fillStyle = "white";
    this.ctx.fillText(`Stat: ${currStat}`, 200, this.canvas.height - 15);

    // Display the current level number (1-indexed for readability)
    if (Array.isArray(this.fullJsonData)) {
      this.ctx.fillText(`Level: ${this.currentLevelIndex + 1}/${this.fullJsonData.length}`, 360, this.canvas.height - 15);
    }
  }
}