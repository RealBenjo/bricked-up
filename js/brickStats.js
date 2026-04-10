class BrickStat {
  static Colors = {
    blue: "#205fff",
    green: "#20ff7d",
    red: "#ff2b2b",
    yellow: "#e4ff17",
    cyan: "#2bdfff",
    pink: "#f83aff",
    white: "#ffffff"
  }
  constructor(owner) {
    this.owner = owner;
  }

  onCollision() {
    
  }

  onDeath() {

  }
}

class NormalStat extends BrickStat {
  constructor(owner) {
    super(owner);
    if (this.owner.healthComponent) {
      this.owner.healthComponent.health = 1; 
    }
  }
}

class ExplosiveStat extends BrickStat {
  constructor(owner) {
    super(owner);

    if (this.owner.renderer) {
      this.owner.renderer.texture.src = "images/bricks/explosive_brick.png";
    }
  }

  onDeath() {
    Globals.audio.playSFX("brick_explode", 0.05);

    // 1. Calculate where the adjacent bricks SHOULD be based on width/height
    const width = this.owner.width;
    const height = this.owner.height;
    const pos = this.owner.position;

    // We only want Up, Down, Left, Right (no diagonals)
    const neighborPositions = [
      { x: pos.x, y: pos.y - height }, // Top
      { x: pos.x, y: pos.y + height }, // Bottom
      { x: pos.x - width, y: pos.y }, // Left
      { x: pos.x + width, y: pos.y }  // Right
    ];
    
    const allBricks = Globals.engine.nodes.flat().filter(n => n && n.isBrick && !n.isDead);

    // 3. Loop through our 4 target spots and see if a brick is sitting there
    neighborPositions.forEach(targetPos => {
      const neighbor = allBricks.find(b => 
        // We use Math.abs < 2 to allow for slight floating point inaccuracies 
        Math.abs(b.position.x - targetPos.x) < 2 && 
        Math.abs(b.position.y - targetPos.y) < 2
      );

      // 4. If we found a neighbor, blast it!
      if (neighbor && neighbor.healthComponent) {
        // By using takeDamage instead of queueFree(), 
        // if the neighbor is ALSO explosive, it will trigger a chain reaction!
        neighbor.healthComponent.takeDamage(999); 
      }
    });
  }
}

// here are all stats in a nice Dictionary :)
const StatRegistry = {
  "normal": NormalStat,
  "explosive": ExplosiveStat
};