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

    this.nodes.forEach(node => {
      if (node instanceof Ball) {
        node.process(safeDelta, this.nodes.filter(n => 
          n !== node && // filter self so it doesnt collide w/ itself
          n.collider && // has a collider
          !(n instanceof Item) // no items
        ));

      } else if (node.process) {
        node.process(safeDelta, Viewport);
      }

      if (node.renderer && typeof node.renderer.draw === "function") {
        node.renderer.draw(this.ctx);
      }
    });

    requestAnimationFrame((t) => this._loop(t));
  }

  add(node) { this.nodes.push(node); }
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

  multiply(multiplier = 1) {
    this.x *= multiplier;
    this.y *= multiplier;

    return this; // for chaining: vector.normalize().multiply(100) ...
  }
  add(adder = 1) {
    this.x += adder;
    this.y += adder;

    return this;
  }

  multVector(vector = new Vector2) {
    this.x *= vector.x;
    this.y *= vector.y;

    return this;
  }
  addVector(vector = new Vector2) {
    this.x += vector.x;
    this.y += vector.y;

    return this;
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
    M_WIDTH: { type: "width", value: -50, imgPath: "images/items/debuffs/minus_size.png" }/*,
    P_FIREBALL: { type: "fireball", value: true },
    M_FIREBALL: { type: "fireball", value: false },
    P_BALL: { type: "multiball", value: null },
    NONE: { type: "none", value: null }*/
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
    this.ballRef = Globals.ball;
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
      this.position.addVector(stepVelocity);
      
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
      case "speed":
        this.ballRef.speed += data.value;
        break;
      case "width":
        this.paddleRef.width += data.value;
        this.paddleRef.collider.width += data.value;
        break;
      case "fireball":
        this.paddleRef.isFireball = data.value;
        break;
      case "multiball":
        // e.g., this.engineRef.add(new Ball(...))
        break;
      case "none":
      default:
        // Do nothing
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
    this.speed = speed;
    this.acceleration = 2.5;
    this.velocity = new Vector2();
    this.diameter = diameter;
    this.paddleRef = Globals.paddle;
    
    const visualScale = 1.0; 
    const spriteSize = diameter * visualScale;
    
    this.renderer = new Sprite2D(this, "images/ball/ball.png", spriteSize, spriteSize);
  }

  process(delta, colliders = []) {
    if (this.position.y > Globals.worldBorder.height - 100) {
      this.queueFree();
    }

    this.speed += this.acceleration * delta;
    
    if (this.speed <= 200) return;

    this.direction.normalize();
    this.velocity = this.direction.clone().multiply(this.speed * delta);

    const distanceThisFrame = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
    const stepSize = this.diameter / 2;
    const steps = Math.ceil(distanceThisFrame / stepSize) || 1;
    const stepVelocity = this.velocity.clone().multiply(1 / steps);

    for (let i = 0; i < steps; i++) {
      this.position.addVector(stepVelocity);
      
      colliders.forEach(collider => {
        const didHit = resolveBoxCollision(this, collider);
        
        if (didHit && collider === this.paddleRef) {
          // 1. Find how far from the paddle's center the ball hit
          // (This assumes paddleRef.position.x is the exact CENTER of your paddle)
          const hitDistance = this.position.x - this.paddleRef.position.x;
          
          // 2. Convert that to a percentage ranging from -1.0 to 1.0
          // (Assuming your paddle has a 'width' property)
          const maxDist = this.paddleRef.width / 2; 
          const normalizedHit = Math.max(-1, Math.min(1, hitDistance / maxDist));

          // 3. Map that percentage to an angle. 
          // x = -1 (left edge)   -> -180 degrees (Left)
          // x =  0 (center)      -> -90 degrees  (Straight Up)
          // x =  1 (right edge)  -> 0 degrees    (Right)
          const angle = 80;
          const bounceAngle = -90 + (normalizedHit * angle);

          // 4. Apply the new direction using your helper function
          this.direction = degToDir(bounceAngle);
        }
      });
    }
  }
}

class Paddle extends Node2D {
  constructor(position = new Vector2(), rotation = 0, width = 100, height = 20, color = "black") {
    super(position, rotation);

    this.width = width;
    this.height = height;

    this.targetX = position.x;

    this.collider = new BoxCollider(this.width, this.height);
    this.renderer = new CanvasItem(this, ctx => {
      ctx.beginPath();
      ctx.rect(-this.width / 2, -this.height / 2, this.width, this.height);
      ctx.fill();
      ctx.closePath();
    });
    this.renderer.color = color;

    // mouse listener :D
    window.addEventListener("mousemove", (e) => this._updateMousePos(e));
  }

  _updateMousePos(e) {
    const rect = Globals.engine.canvas.getBoundingClientRect();
    this.targetX = e.clientX - rect.left;
  }

  process(delta, viewport) {
    this.position.x += this.targetX - this.position.x;

    if (viewport) {
      const halfWidth = this.width / 2;
      
      // Math.min/max "clamping" logic
      if (this.position.x < halfWidth) {
        this.position.x = halfWidth;
      }
      if (this.position.x > viewport.w - halfWidth) {
        this.position.x = viewport.w - halfWidth;
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
      this.position.clone(), // Always clone vectors so you don't link positions!
      randomizeDir(new Vector2(0, -1), 90),
      400, 
      randomKey, // Pass the chosen string (e.g., "P_WIDTH")
      40,
      30,
      Globals.paddle,
      Globals.engine
    );
    
    item.gravityCalc.gravity = 500;

    Globals.engine.add(item);
    this.queueFree();
  }
}