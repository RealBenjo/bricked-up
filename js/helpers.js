function resolveBoxCollision(ballRef, target) {
  if (!target.collider) return;

  const collider = target.collider;
  const theta = target.rotation * (Math.PI / 180);
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);

  // 2. Un-rotate ball position into the target's local space
  const dx = ballRef.position.x - target.position.x;
  const dy = ballRef.position.y - target.position.y;

  let localX = dx * cos + dy * sin;
  let localY = -dx * sin + dy * cos;

  const halfW = collider.width / 2;
  const halfH = collider.height / 2;
  const radius = ballRef.diameter;

  // ====================
  //  INVERTED COLLISION
  // ====================
  if (collider.inverted) {
    let bounced = false;
    let localNormalX = 0;
    let localNormalY = 0;

    // Constrain X (Left and Right internal walls)
    if (localX > halfW - radius) {
      localX = halfW - radius;
      localNormalX = -1; bounced = true;
    } else if (localX < -halfW + radius) {
      localX = -halfW + radius;
      localNormalX = 1; bounced = true;
    }

    // Constrain Y (Top and Bottom internal walls)
    if (localY > halfH - radius) {
      localY = halfH - radius;
      localNormalY = -1; bounced = true;
    } else if (localY < -halfH + radius) {
      localY = -halfH + radius;
      localNormalY = 1; bounced = true;
    }

    if (bounced) {
      // Snap position back to global space
      ballRef.position.x = target.position.x + (localX * cos - localY * sin);
      ballRef.position.y = target.position.y + (localX * sin + localY * cos);

      // Rotate normal back to global space
      const globalNormalX = localNormalX * cos - localNormalY * sin;
      const globalNormalY = localNormalX * sin + localNormalY * cos;

      // Bounce
      const dot = (ballRef.direction.x * globalNormalX) + (ballRef.direction.y * globalNormalY);
      if (dot < 0) {
        ballRef.direction.x -= 2 * dot * globalNormalX;
        ballRef.direction.y -= 2 * dot * globalNormalY;
        ballRef.direction.normalize();
      }
    }
    return; // Exit here so we don't run normal collision
  }

  // ==========================================
  // STANDARD COLLISION (BRICKS / PADDLE)
  // ==========================================
  const closestX = Math.max(-halfW, Math.min(localX, halfW));
  const closestY = Math.max(-halfH, Math.min(localY, halfH));

  const diffX = localX - closestX;
  const diffY = localY - closestY;
  const distanceSq = (diffX * diffX) + (diffY * diffY);

  if (distanceSq < radius * radius) {
    const distance = Math.sqrt(distanceSq) || 0.0001;
    const penetration = radius - distance;

    const localNormalX = diffX / distance;
    const localNormalY = diffY / distance;

    const globalNormalX = localNormalX * cos - localNormalY * sin;
    const globalNormalY = localNormalX * sin + localNormalY * cos;

    ballRef.position.x += globalNormalX * penetration;
    ballRef.position.y += globalNormalY * penetration;

    const dot = (ballRef.direction.x * globalNormalX) + (ballRef.direction.y * globalNormalY);

    if (dot < 0) {
      ballRef.direction.x -= 2 * dot * globalNormalX;
      ballRef.direction.y -= 2 * dot * globalNormalY;
      ballRef.direction.normalize();

      // Damage check
      if (target.healthComponent) {
        target.healthComponent.takeDamage(1);
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