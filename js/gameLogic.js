// HTML elements
/*const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");*/

const Viewport = {
  w: canvas.width,
  h: canvas.height
}

const ball = new Ball(new Vector2(150, 150), 0, new Vector2(1, 3), 2000, 10);
const paddlePos = new Vector2(Viewport.w / 2, Viewport.h - 20);
const paddle = new Paddle( paddlePos, 0, 300, 100, 15, "green");
const brick1 = new Brick(new Vector2(200, 200), 0, 1, 100, 20, "grey");
const brick2 = new Brick(new Vector2(450, 250), 45, 2, 100, 20, "grey");

// create a VERY important engine which runs the entire game!
const ENGINE = new Engine("canvas",
  [ball, paddle, brick1, brick2]
);



function init() {
  // something might come here one day
}