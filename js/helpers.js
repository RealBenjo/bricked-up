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