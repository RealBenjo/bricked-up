// Globals holds the references to every important object
const Globals = {
  engine: null,
  gameManager: null,
  audio: null,
  paddle: null,
  input: null,
  worldBorder: null,
  balls: [], // <-- This must be an empty array, not null!
};

Globals.engine = new Engine("canvas");
Globals.input = new InputManager();

const Viewport = {
  w: Globals.engine.canvas.width,
  h: Globals.engine.canvas.height,
  centerPos: new Vector2(Globals.engine.canvas.width / 2, Globals.engine.canvas.height / 2)
};

// place the world border 200px down so the balls and items and shi can disappear before being removed from memory
const borderHeight = Viewport.h + 200;
const borderCenterY = borderHeight / 2;
const borderPos = new Vector2(Viewport.w / 2, borderCenterY);

Globals.audio = new AudioManager();

Globals.worldBorder = new WorldBorder(borderPos, Viewport.w, borderHeight);
Globals.paddle = new Paddle(
  new Vector2(Viewport.w / 2, Viewport.h - 20),
  0, 100, 15
);

loadAudio();
init();
function init() {
  Globals.engine.add(Globals.worldBorder);
  Globals.engine.add(Globals.paddle, 3);
  
  Globals.gameManager = new GameManager();
  Globals.engine.add(Globals.gameManager);

  loadLevel(0); 
}

function loadAudio() {
  // load all SFX and name them
  Globals.audio.preload("paddle_laser", "sounds/SFX/paddle/laser_shoot.ogg"); // not currently used
  Globals.audio.preload("paddle_magnet", "sounds/SFX/paddle/magnet.ogg"); // not currently used

  Globals.audio.preload("brick_death", "sounds/SFX/brick/death.ogg");
  Globals.audio.preload("brick_explode", "sounds/SFX/brick/explosion.ogg");

  Globals.audio.preload("ball_death", "sounds/SFX/ball/death.ogg");
  Globals.audio.preload("ball_SO_collision", "sounds/SFX/ball/soft_collision.ogg");

  // will add specific sound effects for specific items
  Globals.audio.preload("item_buff", "sounds/SFX/item/buff.ogg");
  Globals.audio.preload("item_debuff", "sounds/SFX/item/debuff.ogg");

  Globals.audio.preload("level_cleared", "sounds/SFX/game/level_cleared.ogg");
  Globals.audio.preload("game_over", "sounds/SFX/game/game_over.ogg");
}