class LevelEditor {
  // Define how special stats look in the Editor
  static STAT_EDITOR_CONFIG = {
    explosive: { label: "TNT", editorColor: "#ff5500" }
  };
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
      console.warn("Failed to load levels.json. Starting with a blank canvas.");
      this.fullJsonData = [];
      this.createNewLevel(); 
    }
  }

  loadCurrentLevelFromMemory() {
    if (!this.fullJsonData) return;

    const levelToLoad = Array.isArray(this.fullJsonData) 
      ? this.fullJsonData[this.currentLevelIndex] 
      : this.fullJsonData;

    if (levelToLoad && levelToLoad.bricks) {
      this.bricks = levelToLoad.bricks.map(b => ({
        col: b.col - 1,
        row: b.row - 1,
        stat: b.stat,
        color: b.color
      }));
    } else {
      this.bricks = [];
    }
  }

  switchLevel(delta) {
    if (!this.fullJsonData || (!Array.isArray(this.fullJsonData) && this.fullJsonData.length <= 1)) {
      console.warn("Multiple levels not available. Cannot switch.");
      return;
    }

    this.saveCurrentLevelToMemory();

    const numLevels = this.fullJsonData.length;
    this.currentLevelIndex = (this.currentLevelIndex + delta + numLevels) % numLevels;

    this.loadCurrentLevelFromMemory();
  }

  createNewLevel() {
    this.saveCurrentLevelToMemory();

    if (!this.fullJsonData) {
      this.fullJsonData = [];
    } else if (!Array.isArray(this.fullJsonData)) {
      this.fullJsonData = [this.fullJsonData];
    }

    const newLevel = {
      name: `Level ${this.fullJsonData.length + 1}`,
      bricks: []
    };

    this.fullJsonData.push(newLevel);
    this.currentLevelIndex = this.fullJsonData.length - 1;
    this.bricks = [];
    console.log(`Created new level! You are now on Level ${this.currentLevelIndex + 1}`);
  }

  isBrickInBounds(brick) {
    return brick.col >= 0 && 
           brick.col < this.maxCols && 
           brick.row >= this.minAllowedRow && 
           brick.row <= this.maxAllowedRow;
  }

  saveCurrentLevelToMemory() {
    if (!this.fullJsonData) return;

    const validBricks = this.bricks.filter(b => this.isBrickInBounds(b));

    const sortedBricks = [...validBricks].sort((a, b) => {
      if (a.row === b.row) return a.col - b.col;
      return a.row - b.row;
    });

    const exportedBricks = sortedBricks.map(b => {
      const brick = {
        col: b.col + 1,
        row: b.row + 1,
        stat: b.stat
      };
      
      // Strict check: only output color if it's normal
      if (b.stat === "normal" && b.color) {
        brick.color = b.color;
      }
      return brick;
    });

    if (Array.isArray(this.fullJsonData)) {
      if (this.fullJsonData[this.currentLevelIndex]) {
        this.fullJsonData[this.currentLevelIndex].bricks = exportedBricks;
      }
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
  // PAINTING & MOVING
  // =========================

  paintCell(col, row) {
    if (row < this.minAllowedRow || row > this.maxAllowedRow || col < 0 || col >= this.maxCols) {
      return; 
    }

    if (this.mouseButton === 0) {
      const existingIndex = this.bricks.findIndex(b => b.col === col && b.row === row);
      const currentStat = this.stats[this.currentStatIndex];
      
      const newBrick = {
        col,
        row,
        stat: currentStat
      };

      // ONLY assign color if it's a normal brick
      if (currentStat === "normal") {
        newBrick.color = this.colors[this.currentColorIndex];
      }

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

  moveLevel(dCol, dRow) {
    this.bricks.forEach(b => {
      b.col += dCol;
      b.row += dRow;
    });
  }

  // =========================
  // KEYBOARD
  // =========================

  onKeyDown(e) {
    if (!this.isActive) return;

    // Prevent default scrolling for arrow keys
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
    }

    // Move level with Arrow Keys
    if (e.key === 'ArrowUp') this.moveLevel(0, -1);
    if (e.key === 'ArrowDown') this.moveLevel(0, 1);
    if (e.key === 'ArrowLeft') this.moveLevel(-1, 0);
    if (e.key === 'ArrowRight') this.moveLevel(1, 0);

    // Stat Switch
    if (e.key.toLowerCase() === 'q') {
      this.currentStatIndex = (this.currentStatIndex - 1 + this.stats.length) % this.stats.length;
    } else if (e.key.toLowerCase() === 'e') {
      this.currentStatIndex = (this.currentStatIndex + 1) % this.stats.length;
    }

    // Color Switch (Removed Arrow keys from here)
    if (e.key.toLowerCase() === 'a') {
      this.currentColorIndex = (this.currentColorIndex - 1 + this.colors.length) % this.colors.length;
    } else if (e.key.toLowerCase() === 'd') {
      this.currentColorIndex = (this.currentColorIndex + 1) % this.colors.length;
    }

    // Level Switch
    if (e.key.toLowerCase() === 'y') {
      this.switchLevel(-1); 
    } else if (e.key.toLowerCase() === 'c') {
      this.switchLevel(1);  
    }

    // New Level
    if (e.key.toLowerCase() === 'n') {
      this.createNewLevel();
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
    this.saveCurrentLevelToMemory();

    let finalOutput;

    if (this.fullJsonData) {
      finalOutput = JSON.stringify(this.fullJsonData, null, 2);
    } else {
      // Filter here just in case fallback is triggered directly
      const validBricks = this.bricks.filter(b => this.isBrickInBounds(b));
      const singleLevel = {
        name: "Custom Editor Level",
        bricks: validBricks.map(b => ({ col: b.col + 1, row: b.row + 1, stat: b.stat, color: b.color }))
      };
      finalOutput = JSON.stringify(singleLevel, null, 2);
    }

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
    
    if (this.minAllowedRow > 0) {
      this.ctx.fillRect(0, 0, this.canvas.width, this.minAllowedRow * this.brickHeight);
    }
    
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
    // Bricks
    this.bricks.forEach(b => {
      const x = b.col * this.brickWidth;
      const y = b.row * this.brickHeight;

      let drawColor = "#333"; 
      let label = "";

      // Determine color and label based on stat
      if (b.stat === "normal") {
        drawColor = BrickStat.Colors[b.color] || "white";
      } else {
        const config = LevelEditor.STAT_EDITOR_CONFIG[b.stat];
        
        // Fallback just in case you add a stat but forget to add it to the config
        drawColor = config ? config.editorColor : "#ff00ff"; 
        label = config ? config.label : b.stat.substring(0, 3).toUpperCase();
      }

      if (!this.isBrickInBounds(b)) {
        // Hollowed out style
        this.ctx.strokeStyle = drawColor;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x + 2, y + 2, this.brickWidth - 4, this.brickHeight - 4);
        this.ctx.lineWidth = 1; 
      } else {
        // Normal filled style
        this.ctx.fillStyle = drawColor;
        this.ctx.fillRect(x, y, this.brickWidth, this.brickHeight);
        this.ctx.strokeStyle = "white";
        this.ctx.strokeRect(x, y, this.brickWidth, this.brickHeight);

        // Draw custom text for special stats
        if (label) {
          this.ctx.fillStyle = "white";
          this.ctx.font = "bold 10px monospace";
          this.ctx.textAlign = "center";
          this.ctx.textBaseline = "middle";
          
          // Add a tiny drop shadow to text so it's readable on bright editorColors
          this.ctx.shadowColor = "black";
          this.ctx.shadowBlur = 2;
          
          this.ctx.fillText(label, x + (this.brickWidth / 2), y + (this.brickHeight / 2));
          
          // Reset shadow so it doesn't mess up the rest of the UI
          this.ctx.shadowBlur = 0; 
        }
      }
    });
    
    // Reset alignment before drawing UI so the bottom text doesn't break
    this.ctx.textAlign = "left";
    this.ctx.textBaseline = "alphabetic";

    this.drawUI();

    this.animationFrameId = requestAnimationFrame(() => this.render());
  }

  drawUI() {
    this.ctx.fillStyle = "rgba(0,0,0,0.8)";
    this.ctx.fillRect(0, this.canvas.height - 60, this.canvas.width, 60);

    this.ctx.fillStyle = "white";
    this.ctx.font = "14px monospace"; 

    this.ctx.fillText(`[Drag]: Paint/Erase  [Arrows]: Move Level  [Y/C]: Switch  [N]: New  [Enter]: Export`, 20, this.canvas.height - 35);

    const currColor = this.colors[this.currentColorIndex];
    const currStat = this.stats[this.currentStatIndex];

    this.ctx.fillText(`Color: `, 20, this.canvas.height - 15);
    this.ctx.fillStyle = BrickStat.Colors[currColor] || "white";
    this.ctx.fillText(currColor, 75, this.canvas.height - 15);

    this.ctx.fillStyle = "white";
    this.ctx.fillText(`Stat: ${currStat}`, 190, this.canvas.height - 15);

    if (Array.isArray(this.fullJsonData)) {
      this.ctx.fillText(`Level: ${this.currentLevelIndex + 1}/${this.fullJsonData.length}`, 360, this.canvas.height - 15);
    }
  }
}