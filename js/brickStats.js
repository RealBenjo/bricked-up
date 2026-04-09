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
  constructor(owner, explosionRadius = 3) {
    super(owner); 
    this.explosionRadius = explosionRadius;
    // Example: Explosive bricks could always have 2 health!
    if (this.owner.healthComponent) {
      this.owner.healthComponent.health = 2; 
    }
  }
  onDeath() {
    console.log("boom");
  }
}

// here are all stats in a nice Dictionary :)
const StatRegistry = {
  "normal": NormalStat,
  "explosive": ExplosiveStat
};