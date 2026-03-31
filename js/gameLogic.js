const Viewport = {
  w: canvas.width,
  h: canvas.height,
  centerPos: new Vector2(canvas.width / 2, canvas.height / 2)
}

const worldBorder = new WorldBorder(Viewport.centerPos, Viewport.w, Viewport.h, "black");
const paddlePos = new Vector2(Viewport.w / 2, Viewport.h - 20);
const paddle = new Paddle(paddlePos, 0, 100, 15, "green");
const ball1 = new Ball(new Vector2(150, 450), 0, new Vector2(1, 3), 500, 20, paddle);
const item = new Item(new Vector2(250, 450), new Vector2(-2, -4), 200, "item", "images/items/default.png");
//const ball2 = new Ball(new Vector2(250, 450), 0, new Vector2(1, 3), 500, 20, paddle);
/*
// this is how to give an object a custom function
// AFTER initialization and declaration
brick2.process = function process(delta) {
  this.rotation += 25 * delta;
}
*/

// create a VERY important engine which runs the entire game!
const ENGINE = new Engine("canvas", []);


init();
function init() {
  const brickHeight = 20;
  var brickRows = 10;
  var brickCols = 20;
  
  for (var x = 1; x <= brickRows; x++) {
    for (var y = 1; y <= brickCols; y++) {
      const brickPos = new Vector2(Viewport.w / brickRows * x, brickHeight * y);

      ENGINE.add(new Brick(
        brickPos, 0, Math.floor(Math.random() * 3 + 1), Viewport.w / brickRows, brickHeight
      ));
    }
  }

  ENGINE.add(worldBorder);
  ENGINE.add(ball1);
  ENGINE.add(paddle);
  ENGINE.add(item);
}