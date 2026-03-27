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

  clone() {
    return new Vector2(this.x, this.y);
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
  constructor(owner, color = "white", drawFunction) {
    this.owner = owner;
    this.color = color;
    this.visible = true;
    this.alpha = 1;
    this.drawFunction = drawFunction; // The specific shape logic
  }

  draw(ctx) {
    if (!this.visible || this.alpha <= 0) return;

    ctx.save();
    
    // Use the owner's transform
    ctx.translate(this.owner.position.x, this.owner.position.y);
    ctx.rotate(this.owner.rotation * Math.PI / 180);
    
    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.alpha;

    // Run the specific drawing logic passed in during construction
    if (this.drawFunction) {
      this.drawFunction(ctx);
    }

    ctx.restore();
  }
}

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
    this.lastTime = timestamp;
    const safeDelta = Math.min(delta, 0.1);

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Logic Phase
    this.nodes.forEach(node => {
      // We pass delta, the viewport dimensions, and the whole list of nodes as potential obstacles
      if (node instanceof Ball) {
        node.process(safeDelta, Viewport, this.nodes.filter(n => n !== node));
      } else {
        node.process(safeDelta);
      }
      if (node.renderer) {
        node.renderer.draw(this.ctx);
      }
    });

    requestAnimationFrame((t) => this._loop(t));
  }

  add(node) { this.nodes.push(node); }
}

class Node {
  process(delta) {
    // children put code here
  }
}

class Node2D extends Node {
  constructor(position = new Vector2(0, 0), rotation = 0) {
    super();
    this.position = position;
    this.rotation = rotation;
  }

  getAngleTo(point) {
    const deltaX = point.x - this.position.x;
    const deltaY = point.y - this.position.y;
    
    const targetAngle = Math.atan2(deltaY, deltaX);
    const currentRotationRad = this.rotation * Math.PI / 180;

    var relativeAngle = targetAngle - currentRotationRad;

    // to "remove excess rotations" or however you'd call it
    while (relativeAngle > Math.PI) relativeAngle -= 2 * Math.PI;
    while (relativeAngle < -Math.PI) relativeAngle += 2 * Math.PI;

    return relativeAngle;
  }
}

class Entity2D extends Node2D {
  constructor(position = new Vector2(), rotation = 0) {
    super(position, rotation);

    this.isDead = false;
  }

  die() {
    this.isDead = true; 
  }
}

class BoxCollider extends Node2D {
  constructor(position = new Vector2(), rotation = 0, width = 50, height = 50) {
    super(position, rotation);
    this.width = width;
    this.height = height;
  }
}

class Ball extends Node2D {
  constructor(position = new Vector2(), rotation = 0, startDirection = new Vector2(1, 0), speed = 0, diameter = 0) {
    super(position, rotation);

    this.direction = startDirection.normalize();
    this.speed = speed;
    this.velocity = new Vector2;
    this.diameter = diameter;
    
    this.renderer = new CanvasItem(this, "blue", (ctx) => {
      ctx.beginPath();
      ctx.arc(0, 0, this.diameter, 0, Math.PI * 2);
      ctx.fill();
      ctx.closePath();
    });
  }

  process(delta, viewport, colliders = []) {
    if (this.speed <= 0) return;

    // 1. Calculate total movement intended for this frame
    this.direction.normalize();
    this.velocity = this.direction.clone().multiply(this.speed * delta);

    // 2. Determine sub-steps (safe step is half the radius)
    const stepSize = this.diameter / 2;
    const steps = Math.ceil(this.speed / stepSize) || 1;

    // 3. Break velocity into tiny chunks
    const stepVelocity = this.velocity.clone().multiply(1 / steps);

    // 4. The Sub-stepping Loop
    for (let i = 0; i < steps; i++) {
      this.position.x += stepVelocity.x;
      this.position.y += stepVelocity.y;

      // Check Screen Bounds
      if (viewport) {
        resolveScreenBounds(this, viewport.w, viewport.h);
      }

      // Check Object Collisions
      colliders.forEach(obj => {
        resolveBoxCollision(this, obj);
      });
    }
  }
}

class Paddle extends Node2D {
  constructor(position = new Vector2(), rotation = 0, speed = 300, width = 100, height = 20, color = "black") {
    super(position, rotation);

    this.speed = speed;
    this.width = width;
    this.height = height;

    this.rightDown = false;
    this.leftDown = false;

    this.collider = new BoxCollider(position, rotation, this.width, this.height);
    this.renderer = new CanvasItem(this, color, (ctx) => {
      ctx.beginPath();
      ctx.rect(-this.width / 2, -this.height / 2, this.width, this.height);
      ctx.fill();
      ctx.closePath();
    });

    // Handle Input
    window.addEventListener("keydown", (e) => this._handleInput(e, true));
    window.addEventListener("keyup", (e) => this._handleInput(e, false));
  }

  _handleInput(e, isPressed) {
    if (e.key === "ArrowRight" || e.key === "d") this.rightDown = isPressed;
    if (e.key === "ArrowLeft" || e.key === "a") this.leftDown = isPressed;
  }

  process(delta, viewport) {
    if (this.rightDown) {
      this.position.x += this.speed * delta;
    } else if (this.leftDown) {
      this.position.x -= this.speed * delta;
    }

    // TODO: make this work lol
    if (viewport) {
      const halfWidth = this.width / 2;
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
  constructor(position = new Vector2(), rotation = 0, health = 1, width = 10, height = 10, color = "grey") {
    position.x -= width/2;
    position.y -= height/2;
    super(position, rotation);

    this.width = width;
    this.height = height;
    this.collider = new BoxCollider(position, rotation, this.width, this.height);
    this.healthComponent = new HealthComponent(health, () => this.die());
    this.renderer = new CanvasItem(this, color, (ctx) => {
      ctx.beginPath();
      ctx.rect(-this.width / 2, -this.height / 2, this.width, this.height);
      ctx.fill();
      ctx.closePath();
    });
  }
}