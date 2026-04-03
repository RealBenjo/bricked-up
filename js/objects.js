class Engine {
  constructor(canvasId, nodes = []) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");
    this.nodes = nodes;
    this.lastTime = performance.now();
    
    requestAnimationFrame((t) => this._loop(t));
  }

  _loop(timestamp) {
    const delta = (timestamp - this.lastTime) / 1000;
    const safeDelta = Math.min(delta, 0.1);
    this.lastTime = timestamp;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // filter out anything that isQueueFreed (aka removed from memory)
    this.nodes = this.nodes.filter(node => !node.isQueueFreed);
    // do the same thing but for the Global balls
    Globals.balls = Globals.balls.filter(node => !node.isQueueFreed);

    this.nodes.forEach(node => {
      if (node instanceof Ball) {
        node.process(safeDelta, this.nodes.filter(n => 
          n !== node && // filter self so it doesnt collide w/ itself
          n.collider && // has a collider
          !(n instanceof Item) && // no items
          !(n instanceof Ball) // no balls (might be unnecesary but better safe than sorry amirite)
        ));

      } else if (node.process) {
        node.process(safeDelta);
      }

      if (node.renderer && typeof node.renderer.draw === "function") {
        node.renderer.draw(this.ctx);
      }
    });

    requestAnimationFrame((t) => this._loop(t));
  }

  add(node) {
    this.nodes.push(node);
  }
}

class Vector2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  normalize() {
    var length =  Math.sqrt(this.x * this.x + this.y * this.y);

    // so we dont divide w/ 0
    if (length > 0) {

      // normalization happens here
      this.x /= length;
      this.y /= length;
    }

    return this;
  }

  // --- POLYMORPHIC IMMUTABLE MATH ---

  add(value = 0) {
    // Check if the value is another Vector2
    if (value instanceof Vector2) {
      return new Vector2(this.x + value.x, this.y + value.y);
    } 
    // Otherwise, assume it's a standard number
    return new Vector2(this.x + value, this.y + value);
  }

  multiply(value = 1) {
    if (value instanceof Vector2) {
      return new Vector2(this.x * value.x, this.y * value.y);
    }
    return new Vector2(this.x * value, this.y * value);
  }

  clone() {
    return new Vector2(this.x, this.y);
  }
}

class BoxCollider {
  constructor(width = 50, height = 50, inverted = false) {
    this.width = width;
    this.height = height;
    this.inverted = inverted;
  }
}

class HealthComponent {
  constructor(health = 100, onDeath) {
    this.health = health;
    this.onDeath = onDeath;
  }

  takeDamage(amount = 0) {
    this.health -= amount;

    if (this.health <= 0) {
      if (this.onDeath) this.onDeath();
    }
  }
}

class CanvasItem {
  constructor(owner, drawFunction) {
    this.owner = owner;
    this.visible = true;
    this.alpha = 1;
    this.color = "rgba(0,0,0,0)"; // Default color property
    this.drawFunction = drawFunction;
  }

  draw(ctx) {
    if (!this.visible || this.alpha <= 0) return;

    ctx.save();
    ctx.translate(this.owner.position.x, this.owner.position.y);
    ctx.rotate(this.owner.rotation * Math.PI / 180);
    ctx.globalAlpha = this.alpha;

    // Apply the color to BOTH fill and stroke so the callback can choose
    ctx.fillStyle = this.color;
    ctx.strokeStyle = this.color;

    if (this.drawFunction) {
      this.drawFunction(ctx);
    }

    ctx.restore();
  }
}

class Sprite2D {
  constructor(owner = this, imagePath = "", width = 0, height = 0) {
    this.owner = owner;
    this.width = width;
    this.height = height;
    
    this.texture = new Image();
    this.texture.src = imagePath;
  }

  draw(ctx) {
    if (!this.texture.complete) return;

    ctx.save();
    
    ctx.translate(this.owner.position.x, this.owner.position.y);
    ctx.rotate(this.owner.rotation * Math.PI / 180);

    ctx.drawImage(
      this.texture, 
      -this.width / 2, 
      -this.height / 2, 
      this.width, 
      this.height
    );

    ctx.restore();
  }
}

class Node {
  constructor() {
    this.isQueueFreed = false;
    this.ready();
  }

  ready() {
    // children run this code once and never again
  }

  process(delta) {
    // children put code here
  }

  queueFree() {
    this.isQueueFreed = true; 
  }
}

class Gravity {
  constructor(owner, gravityStrength = 980) {
    this.owner = owner;
    this.gravity = gravityStrength; 
  }

  process(delta) {
    if (!this.owner.velocity) return;

    this.owner.velocity.y += this.gravity * delta;
  }
}

class Node2D extends Node {
  constructor(position = new Vector2(0, 0), rotation = 0) {
    super();
    this.position = position;
    this._rotation = 0; // internal private variable
    this.rotation = rotation; 
    
    // Track the parent node so our global position math works seamlessly
    this.parent = null; 
  }

  // --- ROTATION GETTERS & SETTERS ---

  set rotation(value) {
    // standard math for degrees (0 to 360)
    this._rotation = ((value % 360) + 360) % 360;
  }

  get rotation() {
    return this._rotation;
  }

  // --- GLOBAL POSITION GETTERS & SETTERS ---

  get globalPosition() {
    // If this node is attached to a parent, its global position is relative to that parent
    if (this.parent) {
      return this.parent.toGlobal(this.position);
    }
    
    // If it has no parent, its local position IS its global position!
    return this.position.clone();
  }

  set globalPosition(newGlobalPos) {
    if (this.parent) {
      // If we have a parent, figure out our LOCAL position relative to it
      this.position = this.parent.toLocal(newGlobalPos);
    } else {
      // No parent? Set the local position directly
      this.position = newGlobalPos.clone();
    }
  }

  // --- MATH & COORDINATE CONVERSION ---

  getAngleTo(point) {
    const deltaX = point.x - this.position.x;
    const deltaY = point.y - this.position.y;
    
    const targetAngle = Math.atan2(deltaY, deltaX);
    const currentRotationRad = this.rotation * Math.PI / 180;

    return targetAngle - currentRotationRad;
  }

  toLocal(globalPoint) {
    // 1. Translate: Find the offset from this node's origin
    const dx = globalPoint.x - this.position.x;
    const dy = globalPoint.y - this.position.y;

    // 2. Rotate: Spin it BACKWARDS by this node's rotation
    const rad = -this.rotation * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    // Apply rotation math
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;

    return new Vector2(localX, localY);
  }

  toGlobal(localPoint) {
    // 1. Rotate: Spin the local point by this node's rotation
    const rad = this.rotation * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    // Apply rotation math
    const rotatedX = localPoint.x * cos - localPoint.y * sin;
    const rotatedY = localPoint.x * sin + localPoint.y * cos;

    // 2. Translate: Add the node's actual world position
    const globalX = rotatedX + this.position.x;
    const globalY = rotatedY + this.position.y;

    return new Vector2(globalX, globalY);
  }
}

class Item extends Node2D {
  // STATIC means this belongs to the class itself, not the instance.
  // We use objects {} instead of arrays [] so we can look them up by string name.
  static UPGRADES = {
    P_SPEED: { type: "speed", value: 100, imgPath: "images/items/debuffs/plus_speed.png"},
    M_SPEED: { type: "speed", value: -100, imgPath: "images/items/buffs/minus_speed.png" },
    P_WIDTH: { type: "width", value: 50, imgPath: "images/items/buffs/plus_size.png" },
    M_WIDTH: { type: "width", value: -50, imgPath: "images/items/debuffs/minus_size.png" },
    //P_FIREBALL: { type: "fireball", value: true },
    //M_FIREBALL: { type: "fireball", value: false },
    P_BALL: { type: "multiball", value: 1, imgPath: "images/items/default.png" }
  };

  constructor(
    position = new Vector2, 
    startDirection = new Vector2,
    startSpeed = 0, 
    itemUpgradeKey = "NONE",
    width = 30, 
    height = 20
  ) {
    super(position, 0);

    // Grab the specific upgrade data based on the string passed in
    this.upgradeData = Item.UPGRADES[itemUpgradeKey] || Item.UPGRADES.NONE;

    this.paddleRef = Globals.paddle;
    this.balls = Globals.balls;
    this.engineRef = Globals.engine;
    
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
      if (checkCollision(this, this.paddleRef)) {
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
        this.balls.forEach(ball => {
          ball.speed += data.value;
        });
        break;
      case "width":
        this.paddleRef.width += data.value;
        break;
      case "fireball":
        this.ballRefRef.isFireball = data.value;
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
          this.engineRef.add(newBall);
        }

        break;
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

class Entity2D extends Node2D {
  constructor(position = new Vector2(), rotation = 0) {
    super(position, rotation);
  }

  // might add some shit here i don't know.
  // leave it be for now
}

class Ball extends Node2D {
  constructor(position = new Vector2(), rotation = 0, startDirection = new Vector2(1, 0), speed = 0, diameter = 0) {
    super(position, rotation);

    this.direction = startDirection.normalize();
    this._minSpeed = 250;
    this._speed = speed;
    this.acceleration = 2.5;
    this.velocity = new Vector2();

    this.diameter = diameter;

    this.paddleRef = Globals.paddle;
    
    const visualScale = 1.0; 
    const spriteSize = diameter * visualScale;
    
    this.renderer = new Sprite2D(this, "images/ball/ball.png", spriteSize, spriteSize);
  }

  set speed(value) {
    this._speed = Math.max(value, this._minSpeed);
  }

  get speed() {
    return this._speed;
  }

  process(delta, colliders = []) {
    if (this.position.y > Globals.worldBorder.height - 100) {
      this.queueFree();
    }

    this.speed += this.acceleration * delta;

    this.direction.normalize();
    this.velocity = this.direction.multiply(this.speed * delta);

    const distanceThisFrame = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
    
    // --- THE OPTIMIZATION ---
    let steps;
    if (this.speed <= 200) {
      // SLOW LANE: Just do 1 normal physics step to save CPU
      steps = 1; 
    } else {
      // FAST LANE: Break it down into tiny steps so it doesn't tunnel through bricks
      const stepSize = this.diameter / 2;
      steps = Math.ceil(distanceThisFrame / stepSize) || 1;
    }

    const stepVelocity = this.velocity.multiply(1 / steps);

    for (let i = 0; i < steps; i++) {
      this.position = this.position.add(stepVelocity);
      
      colliders.forEach(collider => {
        const didHit = resolveBoxCollision(this, collider);
        
        if (didHit && collider === this.paddleRef) {
          const hitDistance = this.position.x - this.paddleRef.position.x;
          const maxDist = this.paddleRef.width / 2; 
          const normalizedHit = Math.max(-1, Math.min(1, hitDistance / maxDist));
          
          const angle = 80;
          const bounceAngle = -90 + (normalizedHit * angle);

          // 1. We change the direction to UP
          this.direction = degToDir(bounceAngle);
          
          // 2. CRITICAL FIX: Recalculate the velocity vector for the new direction!
          this.velocity = this.direction.multiply(this.speed * delta);
          
          // 3. Update the stepVelocity so the rest of the for-loop 
          // moves the ball UP and OUT of the paddle!
          stepVelocity.x = this.velocity.x / steps;
          stepVelocity.y = this.velocity.y / steps;
        }
      });
    }
  }
}

class Paddle extends Node2D {
  constructor(position = new Vector2(), rotation = 0, width = 100, height = 20, color = "black") {
    super(position, rotation);

    // 1. Set the internal variables first
    this._minWidth = 100;
    this._maxWidth = 600;

    this._width = width;
    this._height = height;

    this.targetX = position.x;

    // 2. Initialize the collider with the starting dimensions
    this.collider = new BoxCollider(this._width, this._height);
    
    this.renderer = new CanvasItem(this, ctx => {
      // 1. Tell the canvas to use the color we saved!
      ctx.fillStyle = this.renderer.color; 
      
      ctx.beginPath();
      ctx.rect(-this.width / 2, -this.height / 2, this.width, this.height);
      ctx.fill();
      ctx.closePath();
    });
    this.renderer.color = color;

    // mouse listener :D
    window.addEventListener("mousemove", (e) => this._updateMousePos(e));
  }

  // --- WIDTH SETTER & GETTER ---
  set width(value) {
    this._width = value;
    if (value < this._minWidth) this._width = this._minWidth;
    if (value > this._maxWidth) this._width = this._maxWidth;

    // Safely update the collider if it exists
    if (this.collider) {
      this.collider.width = this._width;
    }
  }

  get width() {
    return this._width;
  }

  // --- HEIGHT SETTER & GETTER ---
  set height(value) {
    this._height = value;
    if (this.collider) {
       this.collider.height = value;
    }
  }

  get height() {
    return this._height;
  }

  _updateMousePos(e) {
    if (!Globals.engine || !Globals.engine.canvas) return;
    const rect = Globals.engine.canvas.getBoundingClientRect();
    this.targetX = e.clientX - rect.left;
  }

  process(delta) {
    // 1. Move towards the target mouse position
    this.position.x += this.targetX - this.position.x;

    // 2. Clamp to the screen using our Globals object directly!
    if (Globals.engine && Globals.engine.canvas) {
      const halfWidth = this.width / 2;
      const canvasWidth = Globals.engine.canvas.width;
      
      if (this.position.x < halfWidth) {
        this.position.x = halfWidth;
      }
      if (this.position.x > canvasWidth - halfWidth) {
        this.position.x = canvasWidth - halfWidth;
      }
    }
  }
}

class Brick extends Entity2D {
  constructor(position = new Vector2(), rotation = 0, health = 1, width = 10, height = 10) {
    position.x -= width/2;
    position.y -= height/2;
    super(position, rotation);

    this.width = width;
    this.height = height;
    this.itemChance = 1.0; // 0.0 - 1.0
    this.collider = new BoxCollider(this.width, this.height);
    this.healthComponent = new HealthComponent(health, () => this.die());
    this.renderer = new CanvasItem(this, (ctx) => {
      ctx.beginPath();
      ctx.rect(-this.width / 2, -this.height / 2, this.width, this.height);
      ctx.fill();
      ctx.closePath();
    });
  }

  process() {
    this.renderer.color = "rgb(0,0," + this.healthComponent.health*70 + ")";
  }

  die() {
    if (Math.random() > this.itemChance) {
      this.queueFree();
      return;
    }

    // 1. Get an array of all the upgrade names (keys)
    // We filter out "NONE" so it doesn't randomly spawn a useless item
    const upgradeKeys = Object.keys(Item.UPGRADES).filter(key => key !== "NONE");
    
    // 2. Pick a random key from that array
    const randomKey = upgradeKeys[Math.floor(Math.random() * upgradeKeys.length)];

    const item = new Item(
      this.position.clone(),
      randomizeDir(new Vector2(0, -1), 90),
      400, 
      randomKey, // Pass the chosen string (e.g., "P_WIDTH")
      50,
      40,
      Globals.paddle,
      Globals.engine
    );
    
    item.gravityCalc.gravity = 500;

    Globals.engine.add(item);
    this.queueFree();
  }
}