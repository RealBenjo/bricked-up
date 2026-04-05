// Globals holds the references to every important object
const Globals = {
  engine: null,
  audio: null,
  paddle: null,
  input: null,
  worldBorder: null,
  balls: [], // <-- This must be an empty array, not null!
};


Globals.input = new InputManager();
Globals.engine = new Engine("canvas", []);
const Viewport = {
  w: Globals.engine.canvas.width,
  h: Globals.engine.canvas.height,
  centerPos: new Vector2(Globals.engine.canvas.width / 2, Globals.engine.canvas.height / 2)
};

const borderHeight = Viewport.h + 200;
const borderCenterY = borderHeight / 2;
const borderPos = new Vector2(Viewport.w / 2, borderCenterY);

Globals.audio = new AudioManager();

// load all SFX and name them
Globals.audio.preload("paddle_laser", "sounds/SFX/paddle/laser_shoot.wav");
Globals.audio.preload("paddle_death", "sounds/SFX/paddle/death.wav");

Globals.audio.preload("brick_death", "sounds/SFX/brick/death.wav");
Globals.audio.preload("brick_explode", "sounds/SFX/brick/explosion.wav");

Globals.audio.preload("ball_death", "sounds/SFX/ball/death.ogg");
Globals.audio.preload("ball_SO_collision", "sounds/SFX/ball/soft_collision.ogg");
Globals.audio.preload("ball_HA_collision", "sounds/SFX/ball/hard_collision.ogg");

Globals.worldBorder = new WorldBorder(borderPos, Viewport.w, borderHeight);
Globals.paddle = new Paddle(
  new Vector2(Viewport.w / 2, Viewport.h - 20),
  0, 100, 15, "green"
);
Globals.balls = [
  Object.assign(
    new Ball(Globals.paddle.position.clone(), 0, new Vector2(0, -1), 500, 20), 
    { isStuck: true }
  )
];

init();
function init() {
  const brickHeight = 20;
  var brickRows = 10;
  var brickCols = 20;

  for (var x = 1; x <= brickRows; x++) {
    for (var y = 1; y <= brickCols; y++) {
      const brickPos = new Vector2(Viewport.w / brickRows * x, brickHeight * y);

      Globals.engine.add(new Brick(
        brickPos, 0, Math.floor(Math.random() * 2 + 1), Viewport.w / brickRows, brickHeight
      ));
    }
  }

  // Now add them to the engine
  Globals.engine.add(Globals.worldBorder);
  Globals.engine.add(Globals.paddle);
  Globals.engine.add(Globals.balls[0]); // add the first and only ball at start
}