const Viewport = {
  w: canvas.width,
  h: canvas.height,
  centerPos: new Vector2(canvas.width / 2, canvas.height / 2)
}

// Calculate the new dimensions
const borderHeight = Viewport.h + 200;
const borderCenterY = borderHeight / 2;

// Create the position vector
const borderPos = new Vector2(Viewport.w / 2, borderCenterY);

// Initialize the border
const worldBorder = new WorldBorder(borderPos, Viewport.w, borderHeight);
const paddle = new Paddle(
  new Vector2(Viewport.w / 2, Viewport.h - 20), 
  0, 100, 15, "green");
const ball = new Ball(new Vector2(150, 450), 0, new Vector2(1, 3), 500, 20, paddle);
/*
// this is how to give an object a custom function
// AFTER initialization and declaration
brick2.process = function process(delta) {
  this.rotation += 25 * delta;
}
*/

// create a VERY important engine which runs the entire game!
const engine = new Engine("canvas", []);


init();
function init() {
  const brickHeight = 20;
  var brickRows = 10;
  var brickCols = 20;
  
  for (var x = 1; x <= brickRows; x++) {
    for (var y = 1; y <= brickCols; y++) {
      const brickPos = new Vector2(Viewport.w / brickRows * x, brickHeight * y);

      engine.add(new Brick(
        brickPos, 0, Math.floor(Math.random() * 1 + 1), Viewport.w / brickRows, brickHeight
      ));
    }
  }
  
  engine.add(worldBorder);
  engine.add(ball);
  engine.add(paddle);
}