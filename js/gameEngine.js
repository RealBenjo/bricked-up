class Engine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");
    
    // NEW: Our toggle flag for pausing the engine
    this.isRunning = true; 
    
    // Initialize a 2D array with 5 empty layers
    this.nodes = [[], [], [], [], []]; 
    
    this.lastTime = performance.now();

    requestAnimationFrame((t) => this._loop(t));
  }

  _loop(timestamp) {
    // NEW: If the engine is paused, just wait for the next frame and skip everything else.
    if (!this.isRunning) {
      this.lastTime = timestamp; // Keep time updated so things don't teleport when unpaused
      requestAnimationFrame((t) => this._loop(t));
      return;
    }

    const delta = (timestamp - this.lastTime) / 1000;
    const safeDelta = Math.min(delta, 0.1);
    this.lastTime = timestamp;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Filter out isQueueFreed from ALL layers
    for (let z = 0; z < this.nodes.length; z++) {
      if (this.nodes[z]) {
        this.nodes[z] = this.nodes[z].filter(node => !node.isQueueFreed);
      }
    }
    
    Globals.balls = Globals.balls.filter(node => !node.isQueueFreed);

    // Flatten the 2D array into a 1D array just for collision checks
    const allActiveNodes = this.nodes.flat();

    // Loop through layers from bottom (0) to top
    for (let z = 0; z < this.nodes.length; z++) {
      if (!this.nodes[z]) continue; // Skip if layer doesn't exist

      this.nodes[z].forEach(node => {
        if (node instanceof Ball) {
          // Pass the FLATTENED array to the ball so it can hit anything on any layer
          node.process(safeDelta, allActiveNodes.filter(n =>
            n !== node && // filter self so it doesnt collide w/ itself
            n.collider && // has a collider
            !(n instanceof Item) && // no items
            !(n instanceof Ball) // no balls 
          ));

        } else if (node.process) {
          node.process(safeDelta);
        }

        if (node.renderer && typeof node.renderer.draw === "function") {
          node.renderer.draw(this.ctx);
        }
      });
    }

    requestAnimationFrame((t) => this._loop(t));
  }

  add(node, zIndex = 0) {
    // Safety check: if you pass a zIndex higher than we have layers, create the layer
    if (!this.nodes[zIndex]) {
      this.nodes[zIndex] = [];
    }
    
    this.nodes[zIndex].push(node);
    
    if (typeof node.ready === "function") {
      node.ready();
    }
  }
}

class InputManager {
  constructor() {
    // Pass the canvas in, or fall back to Globals if it's already initialized
    this.canvas = Globals.engine.canvas; 
    
    this.mousePosition = new Vector2(0, 0);

    this._keysDown = new Set();
    this._buttonsDown = new Set();

    this._setupListeners();
  }

  _setupListeners() {
    if (!this.canvas) {
      console.error("InputManager: I need a canvas to attach to!");
      return;
    }

    // 1. CRITICAL: Make the canvas focusable so it can hear keyboard events
    this.canvas.setAttribute("tabindex", "0");
    
    // Optional: Remove the default browser highlight ring when clicked
    this.canvas.style.outline = "none";

    // 2. Auto-focus the canvas when the player clicks it so keys work immediately
    this.canvas.addEventListener("mousedown", () => this.canvas.focus());

    // --- KEYBOARD (Canvas Only) ---
    this.canvas.addEventListener("keydown", (e) => {
      this._keysDown.add(e.code);
      
      // Prevent default browser scrolling when playing the game
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        e.preventDefault();
      }
    });
    
    this.canvas.addEventListener("keyup", (e) => this._keysDown.delete(e.code));

    // Safety: If they click off the game, clear inputs so keys don't get "stuck"
    this.canvas.addEventListener("blur", () => this._keysDown.clear());

    // --- MOUSE (Canvas Only) ---
    const mouseEvents = ["mousemove", "mousedown", "mouseup", "contextmenu"];
    mouseEvents.forEach(type => {
      this.canvas.addEventListener(type, (e) => this._handleMouseEvent(e));
    });

    // Safety: If the mouse leaves the canvas, clear buttons so clicks don't get "stuck"
    this.canvas.addEventListener("mouseleave", () => this._buttonsDown.clear());
  }

  _handleMouseEvent(e) {
    if (e.type === "contextmenu") e.preventDefault();

    const rect = this.canvas.getBoundingClientRect();
    this.mousePosition.x = e.clientX - rect.left;
    this.mousePosition.y = e.clientY - rect.top;

    if (e.type === "mousedown") this._buttonsDown.add(e.button);
    if (e.type === "mouseup") this._buttonsDown.delete(e.button);
  }

  isKeyDown(keyCode) {
    return this._keysDown.has(keyCode);
  }

  isMouseButtonDown(buttonCode) {
    return this._buttonsDown.has(buttonCode);
  }

  getMousePos() {
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
  constructor(health = 100, onDeath, onHealthChanged) {
    // signals
    this.onDeath = onDeath;
    this.healthChanged = onHealthChanged;
    
    this._health = health;
  }

  takeDamage(amount = 0) {
    this.health -= amount;

    if (this.health <= 0) {
      if (this.onDeath) this.onDeath();
    }
  }

  set health(value) {
    this._health = value;
    if (this.healthChanged) this.healthChanged();
  }
  get health() {
    return this._health;
  }
}

class CanvasItem {
  constructor(owner, drawFunction = null) {
    this.owner = owner;
    this.visible = true;
    this.alpha = 1;
    
    // Godot uses white (#ffffff) as the default "un-tinted" state
    this.modulate = "#ffffff"; 
    
    this.drawFunction = drawFunction;
  }

  draw(ctx) {
    if (!this.visible || this.alpha <= 0) return;

    ctx.save();
    ctx.translate(this.owner.position.x, this.owner.position.y);
    ctx.rotate(this.owner.rotation * Math.PI / 180);
    ctx.globalAlpha = this.alpha;

    // Automatically apply modulate for raw shape drawing
    ctx.fillStyle = this.modulate;
    ctx.strokeStyle = this.modulate;

    if (this.drawFunction) {
      // Pass the item itself so the callback can grab the modulate value
      this.drawFunction(ctx, this);
    }

    ctx.restore();
  }
}

class Sprite2D extends CanvasItem {
  constructor(owner, imagePath = "", width = 0, height = 0) {
    super(owner); // Sets up modulate, alpha, visible from CanvasItem
    this.width = width;
    this.height = height;

    this.texture = new Image();
    this.texture.src = imagePath;

    // Godot-style tinting cache
    this.tintedCache = null;
    this._lastModulate = this.modulate;

    this.texture.onload = () => {
      this.updateTintCache();
    };

    // CanvasItem will call this automatically with translation/rotation already applied!
    this.drawFunction = (ctx) => {
      if (!this.texture.complete) return;

      // Update the tint cache only if the color changed
      if (this.modulate !== this._lastModulate) {
        this.updateTintCache();
        this._lastModulate = this.modulate;
      }

      // 1. DISABLE ANTI-ALIASING ON THE MAIN CANVAS
      ctx.imageSmoothingEnabled = false;

      const renderSource = this.tintedCache || this.texture;

      ctx.drawImage(
        renderSource,
        -this.width / 2,
        -this.height / 2,
        this.width,
        this.height
      );
    };
  }

  updateTintCache() {
    // If no tint, clear the cache to save memory
    if (this.modulate === "#ffffff" || this.modulate === "white") {
      this.tintedCache = null;
      return;
    }

    const offscreen = document.createElement("canvas");
    offscreen.width = this.texture.width || this.width;
    offscreen.height = this.texture.height || this.height;
    const oCtx = offscreen.getContext("2d");

    // 2. DISABLE ANTI-ALIASING ON THE HIDDEN TINT CACHE
    oCtx.imageSmoothingEnabled = false;

    oCtx.drawImage(this.texture, 0, 0, offscreen.width, offscreen.height);
    oCtx.globalCompositeOperation = "multiply";
    oCtx.fillStyle = this.modulate;
    oCtx.fillRect(0, 0, offscreen.width, offscreen.height);
    oCtx.globalCompositeOperation = "destination-in";
    oCtx.drawImage(this.texture, 0, 0, offscreen.width, offscreen.height);

    this.tintedCache = offscreen;
  }
}

class AnimatedSprite2D extends CanvasItem {
  constructor(owner, imagePath = "", frameWidth = 0, frameHeight = 0, hFrames = 1, vFrames = 1) {
    super(owner); // Now correctly extends CanvasItem instead of Node2D!

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

    // Godot-style tinting cache
    this.tintedCache = null;
    this._lastModulate = this.modulate;

    this.texture.onload = () => {
      this.updateTintCache();
    };

    // CanvasItem will call this automatically with translation/rotation already applied!
    this.drawFunction = (ctx) => {
      if (!this.texture.complete || !this.currentAnimation) return;

      if (this.modulate !== this._lastModulate) {
        this.updateTintCache();
        this._lastModulate = this.modulate;
      }

      const anim = this.animations[this.currentAnimation];
      const actualFrame = anim.frames[this.currentFrameIndex];

      const col = actualFrame % this.hFrames;
      const row = Math.floor(actualFrame / this.hFrames);

      const sourceX = col * this.frameWidth;
      const sourceY = row * this.frameHeight;

      ctx.imageSmoothingEnabled = false;

      const finalWidth = this.owner.width + this.widthOffset;
      const finalHeight = this.owner.height + this.heightOffset;
      
      // We don't need to translate/rotate manually anymore! Just apply offsets to the draw position.
      const destX = Math.round(-finalWidth / 2 + this.positionOffset.x);
      const destY = Math.round(-finalHeight / 2 + this.positionOffset.y);

      const renderSource = this.tintedCache || this.texture;

      ctx.drawImage(
        renderSource,
        sourceX, sourceY, this.frameWidth, this.frameHeight, 
        destX, destY, finalWidth, finalHeight                
      );
    };
  }

  // Same logic as Sprite2D - we tint the entire spritesheet at once
  updateTintCache() {
    if (this.modulate === "#ffffff" || this.modulate === "white") {
      this.tintedCache = null;
      return;
    }

    const offscreen = document.createElement("canvas");
    offscreen.width = this.texture.width;
    offscreen.height = this.texture.height;
    const oCtx = offscreen.getContext("2d");

    oCtx.drawImage(this.texture, 0, 0, offscreen.width, offscreen.height);
    oCtx.globalCompositeOperation = "multiply";
    oCtx.fillStyle = this.modulate;
    oCtx.fillRect(0, 0, offscreen.width, offscreen.height);
    oCtx.globalCompositeOperation = "destination-in";
    oCtx.drawImage(this.texture, 0, 0, offscreen.width, offscreen.height);

    this.tintedCache = offscreen;
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
    audio.preload = "auto"; 
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

  playSFX(soundName, volume = 1.0, bus = "sfx") {
    const baseAudio = this.getSound(soundName);
    if (!baseAudio) return;

    // Calculate final volume
    const finalVolume = Math.max(0, Math.min(1, volume)) * this.getBusVolume(bus);

    // THE FIX: Stop cloning! Make a fresh object using the cached source URL.
    const soundInstance = new Audio(baseAudio.src);
    soundInstance.volume = finalVolume; // The browser will actually respect this now!
    
    soundInstance.play().catch(e => {
        if (e.name !== 'AbortError') console.warn("Browser blocked audio!", e);
    });
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