// 1. Create an empty object to hold all our important references
const Globals = {};

// 2. Setup the engine and viewport
Globals.engine = new Engine("canvas", []);

const Viewport = {
  w: Globals.engine.canvas.width,
  h: Globals.engine.canvas.height,
  centerPos: new Vector2(Globals.engine.canvas.width / 2, Globals.engine.canvas.height / 2)
};

const borderHeight = Viewport.h + 200;
const borderCenterY = borderHeight / 2;
const borderPos = new Vector2(Viewport.w / 2, borderCenterY);

// 3. Add entities to Globals ONE BY ONE in the correct order
Globals.worldBorder = new WorldBorder(borderPos, Viewport.w, borderHeight);

// Paddle goes in BEFORE the ball
Globals.paddle = new Paddle(
  new Vector2(Viewport.w / 2, Viewport.h - 20), 
  0, 100, 15, "green"
);

// Ball goes in AFTER the paddle, so the paddle is ready to be referenced!
Globals.ball = new Ball(new Vector2(150, 450), 0, new Vector2(1, 3), 500, 20);

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
  Globals.engine.add(Globals.ball);
}