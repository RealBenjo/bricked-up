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
    node.ready();
  }
}

class InputManager {
  constructor() {
    this.mousePosition = new Vector2(0, 0);

    // Sets are perfect for inputs! They only store unique values.
    this._keysDown = new Set();
    this._buttonsDown = new Set();

    this._setupListeners();
  }

  _setupListeners() {
    // --- KEYBOARD ---
    window.addEventListener("keydown", (e) => this._keysDown.add(e.code));
    window.addEventListener("keyup", (e) => this._keysDown.delete(e.code));

    // --- MOUSE ---
    const mouseEvents = ["mousemove", "mousedown", "mouseup", "contextmenu"];
    mouseEvents.forEach(type => {
      window.addEventListener(type, (e) => this._handleMouseEvent(e));
    });
  }

  _handleMouseEvent(e) {
    // Optional: Stop the right-click menu from popping up over your game
    if (e.type === "contextmenu") e.preventDefault();

    // 1. Update Mouse Position (Relative to canvas)
    if (Globals.engine && Globals.engine.canvas) {
      const rect = Globals.engine.canvas.getBoundingClientRect();
      this.mousePosition.x = e.clientX - rect.left;
      this.mousePosition.y = e.clientY - rect.top;
    }

    // 2. Update Mouse Buttons (0 = Left, 1 = Middle, 2 = Right)
    if (e.type === "mousedown") this._buttonsDown.add(e.button);
    if (e.type === "mouseup") this._buttonsDown.delete(e.button);
  }

  // ==========================================
  // --- GODOT-STYLE PUBLIC API ---
  // ==========================================

  isKeyDown(keyCode) {
    // Example: Input.isKeyDown("Space") or Input.isKeyDown("KeyW")
    return this._keysDown.has(keyCode);
  }

  isMouseButtonDown(buttonCode) {
    // Example: Input.isMouseButtonDown(0) for Left Click
    return this._buttonsDown.has(buttonCode);
  }

  getMousePos() {
    // Returns a clone so other scripts don't accidentally modify the true position
    return this.mousePosition.clone();
  }
}

class Vector2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  normalize() {
    var length = Math.sqrt(this.x * this.x + this.y * this.y);

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

class AudioManager {
  constructor() {
    this.cache = {};
    
    // Our Audio Buses! Volumes go from 0.0 (mute) to 1.0 (max)
    this.buses = {
      master: 1.0,
      music: 1.0,
      sfx: 1.0
    };
  }

  preload(name, path) {
    const audio = new Audio(path);
    audio.preload = "none"; 
    this.cache[name] = audio;
  }

  getSound(name) {
    if (!this.cache[name]) {
      console.warn(`Audio Manager: Sound '${name}' was not preloaded!`);
      return null;
    }
    return this.cache[name];
  }

  // --- NEW: Audio Bus Controls ---

  // Changes the volume of a specific bus
  setBusVolume(busName, volume) {
    if (this.buses[busName] !== undefined) {
      this.buses[busName] = Math.max(0, Math.min(1, volume)); // Clamp between 0 and 1
    } else {
      console.warn(`Audio Manager: Bus '${busName}' does not exist!`);
    }
  }

  // Calculates the true volume by multiplying the category volume by the master volume
  getBusVolume(busName) {
    const busVol = this.buses[busName] !== undefined ? this.buses[busName] : 1.0;
    return busVol * this.buses.master;
  }

  // --- NEW: Fire-and-forget sound effect player ---
  playSFX(soundName, volume = 1.0, bus = "sfx") {
    const baseAudio = this.getSound(soundName);
    if (!baseAudio) return;

    // Calculate final volume
    const finalVolume = Math.max(0, Math.min(1, volume)) * this.getBusVolume(bus);

    // Clone and play immediately, no nodes required!
    const soundClone = baseAudio.cloneNode();
    soundClone.volume = finalVolume;
    soundClone.play().catch(e => console.warn("Browser blocked audio!", e));
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

class Node {
  constructor() {
    this.isQueueFreed = false;
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

class AudioStreamPlayer extends Node {
  constructor(soundName, volume = 1.0, loop = false, bus = "sfx") {
    super(); 
    
    this.soundName = soundName;
    this.baseVolume = Math.max(0, Math.min(1, volume));
    this.loop = loop;
    this.bus = bus; // The bus system is back!
    
    this.baseAudio = Globals.audio.getSound(soundName);
  }

  play() {
    // Failsafe so it doesn't crash if a sound isn't loaded yet
    if (!this.baseAudio) {
        console.warn(`AudioStreamPlayer: Can't find '${this.soundName}'.`);
        return; 
    }

    // Multiply base volume by your global bus volume
    const busVolume = Globals.audio.getBusVolume ? Globals.audio.getBusVolume(this.bus) : 1.0;
    const finalVolume = this.baseVolume * busVolume;

    if (this.loop) {
      this.baseAudio.loop = true;
      this.baseAudio.volume = finalVolume;
      this.baseAudio.play().catch(e => {
         if (e.name !== 'AbortError') console.warn("Browser blocked audio:", e);
      });
      return;
    }

    // THE BEAUTIFUL CLONE NODE: Overlapping sounds without stuttering!
    const soundClone = this.baseAudio.cloneNode();
    soundClone.volume = finalVolume;
    soundClone.play().catch(e => {
        if (e.name !== 'AbortError') console.warn("Browser blocked audio:", e);
    });
  }

  stop() {
    if (this.baseAudio) {
      this.baseAudio.pause();
      this.baseAudio.currentTime = 0;
    }
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

class AnimatedSprite2D extends Node2D {
  constructor(owner = this, imagePath = "", frameWidth = 0, frameHeight = 0, hFrames = 1, vFrames = 1) {
    super(new Vector2(0, 0), 0);

    this.owner = owner;
    this.frameWidth = frameWidth;
    this.frameHeight = frameHeight;
    this.hFrames = hFrames;
    this.vFrames = vFrames;
    
    this.positionOffset = new Vector2(0, 0);
    this.widthOffset = 0;
    this.heightOffset = 0;

    this.texture = new Image();
    this.texture.src = imagePath;

    this.animations = {};
    this.currentAnimation = null;
    this.currentFrameIndex = 0;
    
    this.isPlaying = false;
    this.timer = 0;
  }

  addAnimation(name, frameIndices, fps = 10, loop = true) {
    this.animations[name] = { frames: frameIndices, fps: fps, loop: loop };
  }

  play(name) {
    if (this.currentAnimation === name && this.isPlaying) return;
    this.currentAnimation = name;
    this.currentFrameIndex = 0;
    this.timer = 0;
    this.isPlaying = true;
  }

  process(delta) {
    if (!this.isPlaying || !this.currentAnimation) return;

    const anim = this.animations[this.currentAnimation];
    const timePerFrame = 1 / anim.fps;

    this.timer += delta; 

    if (this.timer >= timePerFrame) {
      this.timer -= timePerFrame;
      this.currentFrameIndex++;

      if (this.currentFrameIndex >= anim.frames.length) {
        if (anim.loop) {
          this.currentFrameIndex = 0;
        } else {
          this.currentFrameIndex = anim.frames.length - 1;
          this.isPlaying = false;
        }
      }
    }
  }

  draw(ctx) {
    if (!this.texture.complete || !this.currentAnimation) return;

    const anim = this.animations[this.currentAnimation];
    const actualFrame = anim.frames[this.currentFrameIndex];

    const col = actualFrame % this.hFrames;
    const row = Math.floor(actualFrame / this.hFrames);

    const sourceX = col * this.frameWidth;
    const sourceY = row * this.frameHeight;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const drawX = Math.round(this.owner.position.x);
    const drawY = Math.round(this.owner.position.y);

    ctx.translate(drawX, drawY);
    ctx.rotate(this.owner.rotation * Math.PI / 180);

    const finalWidth = this.owner.width + this.widthOffset;
    const finalHeight = this.owner.height + this.heightOffset;
    const destX = Math.round(-finalWidth / 2 + this.positionOffset.x);
    const destY = Math.round(-finalHeight / 2 + this.positionOffset.y);

    ctx.drawImage(
      this.texture,
      sourceX, sourceY, this.frameWidth, this.frameHeight, 
      destX, destY, finalWidth, finalHeight                
    );

    ctx.restore();
  }
}

class Entity2D extends Node2D {
  constructor(position = new Vector2(), rotation = 0) {
    super(position, rotation);
  }

  // might add some shit here i don't know.
  // leave it be for now
}

class AudioStreamPlayer2D extends Node2D {
  constructor(position, soundName, maxDistance = 600, volume = 1.0, bus = "sfx") {
    super(position, 0); 
    
    this.soundName = soundName;
    this.baseVolume = Math.max(0, Math.min(1, volume));
    this.maxDistance = maxDistance; 
    this.bus = bus; 
    
    this.baseAudio = Globals.audio.getSound(soundName);
  }

  play() {
    if (!this.baseAudio) return;

    // Calculate spatial distance from the paddle
    const listenerPos = Globals.paddle ? Globals.paddle.globalPosition : new Vector2(0, 0);
    const dx = listenerPos.x - this.globalPosition.x;
    const dy = listenerPos.y - this.globalPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Fade out as it gets further away
    let spatialMultiplier = 1.0 - (distance / this.maxDistance);
    spatialMultiplier = Math.max(0, Math.min(1, spatialMultiplier)); 

    // Calculate final volume (Base * Distance * Bus)
    const busVolume = Globals.audio.getBusVolume ? Globals.audio.getBusVolume(this.bus) : 1.0;
    const finalVolume = this.baseVolume * spatialMultiplier * busVolume;

    // Only play if it's loud enough to be heard
    if (finalVolume > 0.01) {
      // OVERLAPPING 2D SOUNDS!
      const soundClone = this.baseAudio.cloneNode();
      soundClone.volume = finalVolume;
      soundClone.play().catch(e => {
          if (e.name !== 'AbortError') console.warn("Browser blocked audio:", e);
      });
    }
  }
}