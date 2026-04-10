class GameManager extends Node {
  constructor() {
    super(); 
    this.ballsCount = Globals.balls.length;
    this.bricksCount;
    this.playerHealth = 3;
    this.currentLevelIndex = 0;
  }

  // "event" receivers

  onBrickDestroyed() {
    this.bricksCount--;
    
    if (this.bricksCount <= 0) {
      // level cleared
      // TODO: play sfx here
      
      this.currentLevelIndex++;
      loadLevel(this.currentLevelIndex);
    }
  }

  onBallLost() {
    // this now gets an accurate count of balls
    this.ballsCount = Globals.balls.length-1;
    
    // Lose life condition!
    if (this.ballsCount <= 0) {
      this.playerHealth--;
      // TODO: show the player health

      Globals.balls = [
        Object.assign(
          new Ball(Globals.paddle.position.clone(), 0, new Vector2(0, -1), 500, 20),
          { isStuck: true }
        )
      ];
      Globals.engine.add(Globals.balls[0], 3);
      
      if (this.playerHealth <= 0) {
        this.playerHealth = 3;
        Globals.audio.playSFX("game_over", 0.2);
        loadLevel(0);
      }
    }
  }

  onBallAdded() {
    this.ballsCount++;
  }

  process(delta) {
    
  }
}

class Item extends Node2D {
  // !!! make sure that in the final release there are NO default.png around !!!
  static LOOT_POOLS = {
    commonBuffs: ["P_SPEED", "P_WIDTH"],
    commonDebuffs: ["M_SPEED", "M_WIDTH"],
    megaBuffs: ["P_MAGNETIC", "P_BALL"]
  };

  static UPGRADES = {
    P_SPEED: { type: "speed", value: 200, imgPath: "images/items/debuffs/plus_speed.png"},
    M_SPEED: { type: "speed", value: -200, imgPath: "images/items/buffs/minus_speed.png" },
    P_WIDTH: { type: "width", value: 100, imgPath: "images/items/buffs/plus_size.png" },
    M_WIDTH: { type: "width", value: -100, imgPath: "images/items/debuffs/minus_size.png" },
    P_MAGNETIC: { type: "magnet", value: true, imgPath: "images/items/buffs/plus_magnet.png" },
    //P_FIREBALL: { type: "fireball", value: true },
    //M_FIREBALL: { type: "fireball", value: false },
    P_BALL: { type: "multiball", value: 1, imgPath: "images/items/buffs/plus_ball.png" }
  };

  constructor(
    position = new Vector2,
    startDirection = new Vector2,
    startSpeed = 0, 
    itemUpgradeKey = "P_SPEED",
    width = 30, 
    height = 20
  ) {
    super(position, 0);
    this.isItem = true; // nametag

    // Grab the specific upgrade data based on the string passed in
    this.upgradeData = Item.UPGRADES[itemUpgradeKey];
    
    this.velocity = startDirection.clone().normalize().multiply(startSpeed);
    this.gravityCalc = new Gravity(this);

    this.collider = new BoxCollider(width, height);
    this.renderer = new Sprite2D(this, this.upgradeData.imgPath, width, height);
  }

  process(delta) {
    this.gravityCalc.process(delta);

    if (this.position.y > Globals.worldBorder.height - 100) {
      this.queueFree();
    }

    const distanceThisFrame = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2) * delta;
    const stepSize = this.collider.height / 2; 
    const steps = Math.ceil(distanceThisFrame / stepSize) || 1;
    const stepVelocity = this.velocity.clone().multiply(delta / steps);

    for (let i = 0; i < steps; i++) {
      this.position = this.position.add(stepVelocity);
      
      resolveBoxCollision(this, Globals.worldBorder);
      
      // Check for paddle collection!
      if (checkCollision(this, Globals.paddle)) {
        this.applyUpgrade(); // Handle the logic in a separate clean function
        this.queueFree();
        return; 
      }
    }
  }

  // This routes the upgrade data to the actual game logic
  applyUpgrade() {
    const data = this.upgradeData;
    
    switch (data.type) {
      case "speed": // applies the speed gain to all balls
        Globals.balls.forEach(ball => {
          ball.speed += data.value;
        });

        if (data.value > 0) Globals.audio.playSFX("item_debuff", 1.0);
        else Globals.audio.playSFX("item_buff", 0.1);

        break;

      case "width":
        Globals.paddle.width += data.value;

        if (data.value < 0) Globals.audio.playSFX("item_debuff", 1.0);
        else Globals.audio.playSFX("item_buff", 0.1);

        break;

      case "fireball":
        this.ballRefRef.isFireball = data.value;

        if (data.value == false) Globals.audio.playSFX("item_debuff", 1.0);
        else Globals.audio.playSFX("item_buff", 0.1);

        break;

      case "multiball":
        for (let i = 0; i < data.value; i++) {
          const newBall = new Ball(
            Globals.balls[0].position.clone(), 0,
            randomizeDir(Globals.balls[0].direction, 90),
            Globals.balls[0].speed,
            Globals.balls[0].diameter
          )

          Globals.balls.push(newBall);
          Globals.engine.add(newBall);

          Globals.audio.playSFX("item_buff", 0.1);
        }

        break;
      case "magnet":
        Globals.paddle.isMagnetic = data.value;

        Globals.audio.playSFX("item_buff", 0.1);
    }
  }
}

class WorldBorder extends Node2D {
  constructor(position = new Vector2(), width = 800, height = 600) {
    super(position, 0);
    this.width = width;
    this.height = height;
    
    this.collider = new BoxCollider(width, height, true);
  }
}

class Ball extends Node2D {
  constructor(position = new Vector2(), rotation = 0, startDirection = new Vector2(1, 0), speed = 500, diameter = 20) {
    super(position, rotation);
    this.isBall = true;

    this.direction = startDirection.normalize();
    this._minSpeed = 250;
    this._speed = speed;
    this.acceleration = 10;
    this.velocity = new Vector2();

    this.isStuck = false;
    this.stuckOffsetX = 0;

    this.diameter = diameter;    
    this.collider = new BoxCollider(diameter, diameter);
    this.renderer = new Sprite2D(this, "images/ball/ball.png", this.diameter, this.diameter);
  }

  set speed(value) {
    this._speed = Math.max(value, this._minSpeed);
  }

  get speed() {
    return this._speed;
  }

  process(delta, colliders = []) {
    if (this.position.y > Globals.worldBorder.height - 180) {
      Globals.audio.playSFX("ball_death", 0.2);
      Globals.gameManager.onBallLost();
      
      this.queueFree();
    }

    // --- NEW STICKY LOGIC ---
    if (this.isStuck) {
      this.position.x = Globals.paddle.position.x + this.stuckOffsetX;
      // push the ball pixel perfect upwards
      this.position.y = Globals.paddle.position.y - (Globals.paddle.height / 2) - (this.diameter / 2);


      // wait for player's command to launch the ball
      if (Globals.input.isMouseButtonDown(0) || Globals.input.isKeyDown("Space")) {
        this.isStuck = false;
        
        const maxDist = Globals.paddle.width / 2; 
        const normalizedHit = Math.max(-1, Math.min(1, this.stuckOffsetX / maxDist));
        this.direction = degToDir(-90 + (normalizedHit * 80));
      }
      
      return; 
    }
    // ------------------------

    this.speed += this.acceleration * delta;

    this.direction.normalize();
    this.velocity = this.direction.multiply(this.speed * delta);

    const distanceThisFrame = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
    
    // --- OPTIMIZATION ---
    let steps;
    if (this.speed <= 200) {
      steps = 1; 
    } else {
      const stepSize = Math.max(this.diameter / 2, 1); 
      steps = Math.ceil(distanceThisFrame / stepSize) || 1;
    }

    const stepVelocity = this.velocity.multiply(1 / steps);

    for (let i = 0; i < steps; i++) {
      this.position = this.position.add(stepVelocity);
      
      for (const collider of colliders) {
        const didHit = resolveBoxCollision(this, collider);
        
        if (didHit) {
          Globals.audio.playSFX("ball_SO_collision", 0.05);
          
          stepVelocity.x = this.velocity.x / steps;
          stepVelocity.y = this.velocity.y / steps;

          if (collider.isBrick && collider.healthComponent) {
            collider.healthComponent.takeDamage(1);

          } else if (collider === Globals.paddle) {          
            if (Globals.paddle.isMagnetic) {
              this.isStuck = true;
              this.stuckOffsetX = this.position.x - Globals.paddle.position.x;
              break;
            }

            const hitDistance = this.position.x - Globals.paddle.position.x;
            const maxDist = Globals.paddle.width / 2; 
            const normalizedHit = Math.max(-1, Math.min(1, hitDistance / maxDist));
            
            const angle = 80; // allowed angle from the normal of the paddle
            const bounceAngle = -90 + (normalizedHit * angle);

            this.direction = degToDir(bounceAngle);
            this.velocity = this.direction.multiply(this.speed * delta);
          }
        }
      }

      if (this.isStuck) {
        break; 
      }
    }
  }
}

class Paddle extends Node2D {
  constructor(position = new Vector2(), rotation = 0, width = 100, height = 20) {
    super(position, rotation);

    this._minWidth = 100;
    this._maxWidth = 600;
    this._width = width;
    this._height = height;

    this.isMagnetic = false;

    this.targetX = position.x;

    this.collider = new BoxCollider(this._width - 10, this._height);  
    this.renderer = new AnimatedSprite2D(this, "images/paddle/paddle_sheet.png", 73, 29, 4, 4);
    this.renderer.addAnimation("magnetLaser", [0,4,8,12], 10, true);
    this.renderer.addAnimation("laser", [1,5,9,13], 10, true);
    this.renderer.addAnimation("magnet", [2,6,10,14], 10, true);
    this.renderer.addAnimation("normal", [3,7,11,15], 10, true);
    this.renderer.positionOffset = new Vector2(0, -10);
    this.renderer.heightOffset = 20;

    this.renderer.play("normal");
  }


  set width(value) {
    this._width = value;
    if (value < this._minWidth) this._width = this._minWidth;
    if (value > this._maxWidth) this._width = this._maxWidth;

    // update the collider if it exists
    if (this.collider) {
      this.collider.width = this._width;
    }
  }

  get width() {
    return this._width;
  }

  set height(value) {
    this._height = value;
    if (this.collider) {
       this.collider.height = value;
    }
  }

  get height() {
    return this._height;
  }


  process(delta) {
    // --- code from here is ass -------------------
    var isBallStuck = false;

    Globals.balls.forEach(ball => {
      if (ball.isStuck) {
        isBallStuck = true;
      }
    });

    if (isBallStuck) {
      this.renderer.play("magnet");
    } else if (!isBallStuck) {
      this.renderer.play("normal");
    }
    // --- code to here is ass ---------------------

    this.targetX = Globals.input.mousePosition.x;

    this.position.x += this.targetX - this.position.x;

    const halfWidth = this.width / 2;
    const canvasWidth = Globals.engine.canvas.width;
    
    if (this.position.x < halfWidth) this.position.x = halfWidth;
    if (this.position.x > canvasWidth - halfWidth) this.position.x = canvasWidth - halfWidth;
  
    // runs the renderer's process
    if (this.renderer && this.renderer.process) {
      this.renderer.process(delta);
    }
  }
}

class Brick extends Entity2D {
  constructor(position = new Vector2(), rotation = 0, health = 1, width = 10, height = 10, statType = "normal", color = "white") {

    position = position.add(new Vector2(-width/2, -height/2));
    super(position, rotation);
    this.isBrick = true; 
    
    this.width = width;
    this.height = height;
    this.itemChance = 0.2; 
    
    // Save the color string from the JSON to the brick
    this.baseColor = color;
    
    this.renderer = new Sprite2D(this, "images/bricks/basic_brick.png", this.width, this.height);
    this.collider = new BoxCollider(this.width, this.height);
    
    this.healthComponent = new HealthComponent(
      health,
      () => this.die(),
      () => this.checkColor()
    );

    if (statType && StatRegistry[statType]) {
      this.stat = new StatRegistry[statType](this);
    } else {
      this.stat = new NormalStat(this); 
    }
  }

  ready() {
    this.checkColor();
  }

  checkColor() {
    // if there is a typo in the JSON, it defaults to white.
    const actualColor = BrickStat.Colors[this.baseColor] || "white";
    
    this.renderer.modulate = actualColor;
  }

  die() {
    if (Math.random() > this.itemChance) {
      this.dieAndUpdate();
      return;
    }

    const rarity = {
      common: 0.65,
      rare: 0.95,
      epic: 0.95
    };

    const rng = Math.random();    
    let selectedPool;

    if (rng <= rarity.common) {
      selectedPool = Item.LOOT_POOLS.commonDebuffs;
      
    } else if (rng <= rarity.rare) {
      selectedPool = Item.LOOT_POOLS.commonBuffs;

    } else {
      selectedPool = Item.LOOT_POOLS.megaBuffs;

    }

    // random key from the pool we chose
    const randomKey = selectedPool[Math.floor(Math.random() * selectedPool.length)];

    const item = new Item(
      this.position.clone(),
      randomizeDir(new Vector2(0, -1), 90),
      400, 
      randomKey,
      50,
      40,
      Globals.paddle,
      Globals.engine
    );
    
    item.gravityCalc.gravity = 500;

    Globals.engine.add(item);
    Globals.audio.playSFX("brick_death", 0.15);

    this.dieAndUpdate();
  }

  dieAndUpdate() {
    Globals.gameManager.onBrickDestroyed(); 
    this.queueFree();
  }
}