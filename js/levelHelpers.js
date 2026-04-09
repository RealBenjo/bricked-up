async function loadLevel(levelIndex) {
  // 1. WIPE THE OLD LEVEL
  // Your engine will naturally delete anything with isQueueFreed = true on the next frame!
  Globals.engine.nodes.forEach(node => {
    if (node.isBrick || node.isItem) {
      node.isQueueFreed = true; 
    }
  });

  // 2. RESET THE PLAYER
  // Snap the ball back to the paddle
  Globals.balls[0].isStuck = true;
  Globals.balls[0].stuckOffsetX = 0;
  
  // (Optional) Reset paddle position to center here if you want

  // 3. FETCH THE JSON DATA
  try {
    const response = await fetch("levels/levels.json");
    const levelsData = await response.json();
    
    // Safety check in case you beat the last level
    if (levelIndex >= levelsData.length) {
      console.log("YOU BEAT THE WHOLE GAME!");
      return;
    }

    const levelData = levelsData[levelIndex];
    console.log(`Loading: ${levelData.name}`);

    // 4. BUILD THE NEW BRICKS
    const brickHeight = 20;
    const maxCols = 20; 
    const brickWidth = Viewport.w / maxCols;

    levelData.bricks.forEach(bData => {
      // Convert the grid col/row from JSON into actual screen X/Y pixels
      const brickPos = new Vector2(brickWidth * bData.col, brickHeight * bData.row);

      // (Optional) Here is where you would read bData.stat and attach your BrickStat classes!
      let statComponent = null;

      Globals.engine.add(new Brick(
        brickPos, 0, bData.health, brickWidth, brickHeight, statComponent
      ));
    });

    // 5. UPDATE GAME MANAGER
    // Tell the GameManager how many bricks are in this new level
    Globals.gameManager.bricksCount = levelData.bricks.length;

  } catch (error) {
    console.error("Failed to load level data:", error);
  }
}