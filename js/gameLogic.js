// HTML elements
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// "objects" with important attributes
const Ball = {
  x: 200.0,
  y: 200.0,

  // DO NOT FORGET TO NORMALIZE THE DIRECTION
  dirX: 1.0,
  dirY: 5.0,
  speed: 500,

  // we calculate the velocity each frame based on direction and speed
  velX: 0.0,
  velY: 0.0,

  // diameter
  d: 10
};

const Viewport = {
  w: canvas.width,
  h: canvas.height
}

const Paddle = {
  x: Viewport.w / 2 - 75, // probably a useless line, we'll see
  speed: 300,
  h: 10,
  w: 75
}

var rightDown = false;
var leftDown = false;

var lastTime = 0;
var delta = 0;

function init() {
  
}

function draw(timestamp) {
   if (!lastTime) {
    lastTime = timestamp;
    requestAnimationFrame(draw);
    return;
  } 

  delta = (timestamp - lastTime) / 1000;
  lastTime = timestamp;


  // ball velocity normalization <3
  var normalVec = normalize(Ball.dirX, Ball.dirY);
  Ball.dirX = normalVec.x;
  Ball.dirY = normalVec.y;

  Ball.velX = Ball.dirX * Ball.speed;
  Ball.velY = Ball.dirY * Ball.speed;
  // end of ball velocity normalization


  ctx.clearRect(0, 0, Viewport.w, Viewport.h);

  ctx.beginPath();
  ctx.arc(Ball.x, Ball.y, Ball.d, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.fill();

  if (rightDown) Paddle.x += Paddle.speed * delta;
  else if (leftDown) Paddle.x -= Paddle.speed * delta;

  ctx.beginPath();
  ctx.rect(Paddle.x, Viewport.h - Paddle.h, Paddle.w, Paddle.h);
  ctx.closePath();
  ctx.fill();

  
  // Boundary collision with direction flipping and position correction
  if (Ball.x + (Ball.velX * delta) > Viewport.w - Ball.d) {
    Ball.dirX = -Math.abs(Ball.dirX);
    Ball.x = Viewport.w - Ball.d;
  } else if (Ball.x + (Ball.velX * delta) < Ball.d) {
    Ball.dirX = Math.abs(Ball.dirX);
    Ball.x = Ball.d;
  } else {
    Ball.x += Ball.velX * delta;
  }

  if (Ball.y + (Ball.velY * delta) > Viewport.h - Ball.d) {
    Ball.dirY = -Math.abs(Ball.dirY);
    Ball.y = Viewport.h - Ball.d;
  } else if (Ball.y + (Ball.velY * delta) < Ball.d) {
    Ball.dirY = Math.abs(Ball.dirY);
    Ball.y = Ball.d;
  } else {
    Ball.y += Ball.velY * delta;
  }

  requestAnimationFrame(draw); // this calls the draw function EVERY SINGLE frame
}

window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight" || e.key === "d") rightDown = true;
  if (e.key === "ArrowLeft" || e.key === "a") leftDown = true;
});

window.addEventListener("keyup", (e) => {
  if (e.key === "ArrowRight" || e.key === "d") rightDown = false;
  if (e.key === "ArrowLeft" || e.key === "a") leftDown = false;
});

init();
requestAnimationFrame(draw); // this calls the draw function EVERY SINGLE frame