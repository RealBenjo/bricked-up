// Collision Function: Handles screen edges
function resolveScreenBounds(ballRef, viewportW, viewportH) {
  const radius = ballRef.diameter; // Your diameter property acts as radius

  // X-Axis bounds (Left and Right walls)
  if (ballRef.position.x > viewportW - radius) {
    ballRef.direction.x = -Math.abs(ballRef.direction.x);
    ballRef.position.x = viewportW - radius; // Snap to edge
  } else if (ballRef.position.x < radius) {
    ballRef.direction.x = Math.abs(ballRef.direction.x);
    ballRef.position.x = radius; // Snap to edge
  }

  // Y-Axis bounds (Top and Bottom walls)
  if (ballRef.position.y > viewportH - radius) {
    ballRef.direction.y = -Math.abs(ballRef.direction.y);
    ballRef.position.y = viewportH - radius; // Snap to edge
  } else if (ballRef.position.y < radius) {
    ballRef.direction.y = Math.abs(ballRef.direction.y);
    ballRef.position.y = radius; // Snap to edge
  }
}

function resolveBoxCollision(ballRef, boxCollider) {
  const theta = boxCollider.rotation * (Math.PI / 180);
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);

  // 1. Get relative position
  const dx = ballRef.position.x - boxCollider.position.x;
  const dy = ballRef.position.y - boxCollider.position.y;

  // 2. Un-rotate ball position into the box's local coordinate system
  const localX = dx * cos + dy * sin;
  const localY = -dx * sin + dy * cos;

  const halfW = boxCollider.width / 2;
  const halfH = boxCollider.height / 2;
  
  // 3. Find closest point on box to ball
  const closestX = Math.max(-halfW, Math.min(localX, halfW));
  const closestY = Math.max(-halfH, Math.min(localY, halfH));

  const diffX = localX - closestX;
  const diffY = localY - closestY;
  const distanceSq = (diffX * diffX) + (diffY * diffY);
  const radius = ballRef.diameter; 

  // 4. Collision Detection
  if (distanceSq < radius * radius) {
    const distance = Math.sqrt(distanceSq) || 0.0001; // Avoid div by zero
    const penetration = radius - distance;

    // Normal in local space
    const localNormalX = diffX / distance;
    const localNormalY = diffY / distance;

    // Rotate normal back to global space
    const globalNormalX = localNormalX * cos - localNormalY * sin;
    const globalNormalY = localNormalX * sin + localNormalY * cos;

    // 5. Position Correction: Push ball out of the collider
    ballRef.position.x += globalNormalX * penetration;
    ballRef.position.y += globalNormalY * penetration;

    // 6. Velocity Reflection: Bounce!
    const dot = (ballRef.direction.x * globalNormalX) + (ballRef.direction.y * globalNormalY);

    // Only bounce if the ball is moving into the face (dot < 0)
    if (dot < 0) {
      ballRef.direction.x -= 2 * dot * globalNormalX;
      ballRef.direction.y -= 2 * dot * globalNormalY;
      ballRef.direction.normalize();

      // If this is a Brick, we should deal damage here
      if (boxCollider instanceof Brick) {
        var damage = 1;
        boxCollider.healthComponent.takeDamage(damage);
      }
    }
  }
}

// these will be massive help when we get to randomizing deflection angles
function degToDir(degrees = 0) {
  const DIRECTION = new Vector2();

  var radians = degrees * Math.PI / 180;

  DIRECTION.x = Math.cos(radians);
  DIRECTION.y = Math.sin(radians);

  return DIRECTION;
}
function radToDir(radians = 0) {
  const DIRECTION = new Vector2();

  DIRECTION.x = Math.cos(radians);
  DIRECTION.y = Math.sin(radians);

  return DIRECTION;
}
function dirToDeg(direction = new Vector2(1, 0)) {
  return Math.atan2(direction.y, direction.x) * 180 / Math.PI;
}
function dirToRad(direction = new Vector2(1, 0)) {
  return Math.atan2(direction.y, direction.x);
}