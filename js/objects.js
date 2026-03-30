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

    // 1. THE GRIM REAPER: Filter out anything that isDead
    this.nodes = this.nodes.filter(node => !node.isDead);

    // 2. Logic & Render Phase
    this.nodes.forEach(node => {
      // Physics / Logic
      if (node instanceof Ball) {
        // Pass everything EXCEPT the ball as colliders
        node.process(safeDelta, this.nodes.filter(n => n !== node));
      } else if (node instanceof Paddle) {
        node.process(safeDelta, Viewport);
      } else if (node.process) {
        node.process(safeDelta);
      }

      // Rendering
      if (node.renderer) {
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

class WorldBorder extends Node2D {
  constructor(position = new Vector2(), width = 800, height = 600, color = "red") {
    super(position, 0);
    
    this.collider = new BoxCollider(width, height, true);
    this.renderer = new CanvasItem(this, (ctx) => {
      ctx.beginPath();
      ctx.lineWidth = 5;
      ctx.rect(-width / 2, -height / 2, width, height);
      ctx.stroke();
      ctx.closePath();
    });

    // You can change it anytime!
    this.renderer.color = color;
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

class Ball extends Node2D {
  constructor(position = new Vector2(), rotation = 0, startDirection = new Vector2(1, 0), speed = 0, diameter = 0) {
    super(position, rotation);

    this.direction = startDirection.normalize();
    this.speed = speed;
    this.velocity = new Vector2;
    this.diameter = diameter;
    
    this.renderer = new CanvasItem(this, (ctx) => {
      ctx.beginPath();
      ctx.arc(0, 0, this.diameter, 0, Math.PI * 2);
      ctx.fill();
      ctx.closePath();
    });
    this.renderer.color = "black";
  }

  process(delta, colliders = []) {
    if (this.speed <= 0) return;

    // 1. Calculate total movement intended for this frame
    this.direction.normalize();
    this.velocity = this.direction.clone().multiply(this.speed * delta);

    // Calculate the actual distance moving THIS FRAME
    const distanceThisFrame = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);

    // 2. Determine sub-steps based on DISTANCE, not raw speed
    const stepSize = this.diameter / 2;
    const steps = Math.ceil(distanceThisFrame / stepSize) || 1;

    // 3. Break velocity into tiny chunks
    const stepVelocity = this.velocity.clone().multiply(1 / steps);

    // 4. The Sub-stepping Loop
    for (let i = 0; i < steps; i++) {
      this.position.x += stepVelocity.x;
      this.position.y += stepVelocity.y;

      // We remove resolveScreenBounds completely!
      
      // Check Object Collisions (including our new World Border)
      colliders.forEach(obj => {
        resolveBoxCollision(this, obj);
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
    this.renderer = new CanvasItem(this, (ctx) => {
      ctx.beginPath();
      ctx.rect(-this.width / 2, -this.height / 2, this.width, this.height);
      ctx.fill();
      ctx.closePath();
    });
    this.renderer.color = color;

    // Direct Mouse Listener
    window.addEventListener("mousemove", (e) => this._updateMousePos(e));
  }

  _updateMousePos(e) {
    const rect = ENGINE.canvas.getBoundingClientRect();
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
    this.collider = new BoxCollider(this.width, this.height);
    this.healthComponent = new HealthComponent(health, () => this.die());
    this.renderer = new CanvasItem(this, (ctx) => {
      ctx.beginPath();
      ctx.rect(-this.width / 2, -this.height / 2, this.width, this.height);
      ctx.fill();
      ctx.closePath();
    });
    this.renderer.color = "rgb(" + Math.random()*256 + "," + Math.random()*256 + "," + Math.random()*256 + ")";
  }
}