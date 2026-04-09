// --- THE BASE CLASS ---
class BrickStat {
  constructor(owner, spritePath = "") {
    this.owner = owner; 
    this.spritePath = spritePath;
  }

  onCollision(ball) {
    // same concept as Node
  }

  onDeath() {
    // same concept as Node
  }
}

// --- EXPLOSIVE STAT ---
class ExplosiveStat extends BrickStat {
  constructor(owner, explosionRadius = 3) {
    // Call the parent constructor and pass a specific sprite!
    super(owner, "write something here fr"); 
    
    this.explosionRadius = explosionRadius;
  }

  onDeath() {
    console.log("boom");
  }
}