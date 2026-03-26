function normalize(x, y) {
  const Vector = {
    x: x,
    y: y
  };

  var ratio =  1.0 / Math.sqrt( Math.pow(Vector.x, 2) + Math.pow(Vector.y, 2) );

  if (typeof x != "number" || typeof y != "number") {
    return Vector;
  }

  // normalization happens here
  Vector.x *= ratio;
  Vector.y *= ratio;

  return Vector;
}

// these will be massive help when we get to randomizing deflection angles
function degToDir(degrees) {
  const Direction = {
    x: 0,
    y: 0
  }

  var radians = degrees * Math.PI / 180; // turns degrees to radians

  Direction.x = Math.cos(radians);
  Direction.y = Math.sin(radians);

  return Direction;
}
function radToDir(radians) {
  const Direction = {
    x: 0,
    y: 0
  }

  Direction.x = Math.cos(radians);
  Direction.y = Math.sin(radians);

  return Direction;
}
function dirToDeg(vecX, vecY) {
  var degrees = Math.atan2(vecY, vecX) * 180 / Math.PI;

  return degrees;
}
function dirToRad(vecX, vecY) {
  return Math.atan2(vecY, vecX);
}