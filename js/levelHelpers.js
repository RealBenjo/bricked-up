async function loadLevel(levelIndex) {
  // 1. WIPE THE OLD LEVEL
  Globals.engine.nodes.flat().forEach(node => {
    if (node.isBrick || node.isItem || node.isBall) {
      node.isQueueFreed = true;
    }
  });

  // 2. RESET THE PLAYER
  // Snap the ball back to the paddle
  Globals.paddle.width = 100;
  Globals.paddle.isMagnetic = false;

  Globals.balls[0] = new Ball(new Vector2, 0, new Vector2(0,-1));
  Globals.balls[0].isStuck = true;
  Globals.balls[0].stuckOffsetX = 0;
  
  // Add the ball to layer 3 so it draws over the bricks
  Globals.engine.add(Globals.balls[0], 3);

  try {
    const response = await fetch("levels/levels.json");
    const levelsData = await response.json();
    
    // Safety check in case you beat the last level
    if (levelIndex >= levelsData.length) {
      return;
    }

    const levelData = levelsData[levelIndex];

    // 4. BUILD THE NEW BRICKS
    const brickHeight = 20;
    const maxCols = 20; 
    const brickWidth = Viewport.w / maxCols;

    // create the bricks with appropriate data
    levelData.bricks.forEach(brickData => {
      const brickPos = new Vector2(brickWidth * brickData.col, brickHeight * brickData.row);

      // We pass brickData.color at the very end!
      Globals.engine.add(new Brick(
        brickPos, 0, 1, brickWidth, brickHeight, brickData.stat, brickData.color
      ));
    });

    // 5. UPDATE GAME MANAGER
    // Tell the GameManager how many bricks are in this new level
    Globals.gameManager.bricksCount = levelData.bricks.length;

  } catch (error) {
    console.error("Failed to load level data:", error);
  }
}