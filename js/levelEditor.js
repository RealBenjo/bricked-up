class LevelEditor {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    this.maxCols = 20;
    this.brickWidth = this.canvas.width / this.maxCols;
    this.brickHeight = 20;
    
    this.bricks = [];

    this.currentColorIndex = 0;
    this.colors = Object.keys(BrickStat.Colors);
    
    this.currentStatIndex = 0;
    this.stats = Object.keys(StatRegistry);
    
    this.isActive = false;
    this.animationFrameId = null;

    // NEW: mouse state
    this.isMouseDown = false;
    this.mouseButton = null;
    this.lastCol = null;
    this.lastRow = null;

    // bind
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.preventContextMenu = (e) => e.preventDefault();
  }

  start() {
    this.isActive = true;

    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('contextmenu', this.preventContextMenu);
    window.addEventListener('keydown', this.onKeyDown);

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
    if (this.mouseButton === 0) {
      // Find if a brick already exists at this location
      const existingIndex = this.bricks.findIndex(b => b.col === col && b.row === row);
      
      const newBrick = {
        col,
        row,
        stat: this.stats[this.currentStatIndex],
        color: this.colors[this.currentColorIndex]
      };

      if (existingIndex !== -1) {
        // Overwrite the existing brick with current settings
        this.bricks[existingIndex] = newBrick;
      } else {
        // Place a brand new brick
        this.bricks.push(newBrick);
      }
    } else if (this.mouseButton === 2) {
      this.removeBrick(col, row);
    }
  }

  // Bresenham-style line (no gaps when dragging fast)
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

    if (e.key.toLowerCase() === 'q') {
      this.currentStatIndex = (this.currentStatIndex - 1 + this.stats.length) % this.stats.length;
    } else if (e.key.toLowerCase() === 'e') {
      this.currentStatIndex = (this.currentStatIndex + 1) % this.stats.length;
    }

    if (e.key.toLowerCase() === 'a' || e.key === 'ArrowLeft') {
      this.currentColorIndex = (this.currentColorIndex - 1 + this.colors.length) % this.colors.length;
    } else if (e.key.toLowerCase() === 'd' || e.key === 'ArrowRight') {
      this.currentColorIndex = (this.currentColorIndex + 1) % this.colors.length;
    }

    if (e.key === 'Enter') {
      this.exportLevel();
    }
  }

  // =========================
  // EXPORT
  // =========================

  exportLevel() {
    const sortedBricks = [...this.bricks].sort((a, b) => {
      if (a.row === b.row) return a.col - b.col;
      return a.row - b.row;
    });

    let jsonString = `{\n  "name": "Custom Editor Level",\n  "bricks": [\n`;

    // Added +1 to col and row for the JSON export
    const brickStrings = sortedBricks.map(b => 
      `    { "col": ${b.col + 1}, "row": ${b.row + 1}, "stat": "${b.stat}", "color": "${b.color}" }`
    );

    jsonString += brickStrings.join(",\n");
    jsonString += `\n  ]\n}`;

    console.log(jsonString);

    navigator.clipboard.writeText(jsonString).then(() => {
      alert("Copied to clipboard!");
    });
  }

  // =========================
  // RENDER
  // =========================

  render() {
    if (!this.isActive) return;

    this.ctx.fillStyle = "#111";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // grid
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

    // bricks
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

    this.ctx.fillText(`[Drag LMB]: Paint   [Drag RMB]: Erase   [Enter]: Export`, 20, this.canvas.height - 35);

    const currColor = this.colors[this.currentColorIndex];
    const currStat = this.stats[this.currentStatIndex];

    this.ctx.fillText(`Color: `, 20, this.canvas.height - 15);
    this.ctx.fillStyle = BrickStat.Colors[currColor] || "white";
    this.ctx.fillText(currColor, 80, this.canvas.height - 15);

    this.ctx.fillStyle = "white";
    this.ctx.fillText(`Stat: ${currStat}`, 200, this.canvas.height - 15);
  }
}