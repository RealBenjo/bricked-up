function resolveBoxCollision(ballRef, target) {
  if (!target.collider) return false;

  const collider = target.collider;
  const theta = target.rotation * (Math.PI / 180);
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);

  // Un-rotate ball position into the target's local space
  const dx = ballRef.position.x - target.position.x;
  const dy = ballRef.position.y - target.position.y;

  let localX = dx * cos + dy * sin;
  let localY = -dx * sin + dy * cos;

  const halfW = collider.width / 2;
  const halfH = collider.height / 2;
  
  // FIX: Radius is half the diameter!
  const radius = ballRef.diameter / 2; 

  // ====================
  //  INVERTED COLLISION
  // ====================
  if (collider.inverted) {
    let bounced = false;
    let localNormalX = 0;
    let localNormalY = 0;

    if (localX > halfW - radius) {
      localX = halfW - radius; localNormalX = -1; bounced = true;
    } else if (localX < -halfW + radius) {
      localX = -halfW + radius; localNormalX = 1; bounced = true;
    }

    if (localY > halfH - radius) {
      localY = halfH - radius; localNormalY = -1; bounced = true;
    } else if (localY < -halfH + radius) {
      localY = -halfH + radius; localNormalY = 1; bounced = true;
    }

    if (bounced) {
      ballRef.position.x = target.position.x + (localX * cos - localY * sin);
      ballRef.position.y = target.position.y + (localX * sin + localY * cos);

      const globalNormalX = localNormalX * cos - localNormalY * sin;
      const globalNormalY = localNormalX * sin + localNormalY * cos;

      const dot = (ballRef.direction.x * globalNormalX) + (ballRef.direction.y * globalNormalY);
      if (dot < 0) {
        ballRef.direction.x -= 2 * dot * globalNormalX;
        ballRef.direction.y -= 2 * dot * globalNormalY;
        ballRef.direction.normalize();
      }
      return true; // We collided and resolved
    }
    return false; // No collision
  }

  // ==========================================
  // STANDARD COLLISION
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

      if (target.healthComponent) {
        target.healthComponent.takeDamage(1);
      }
    }
    return true; // We collided and resolved
  }
  
  return false; // No collision
}

function checkCollision(ballRef = new Ball, target = new Node2D) {
  if (!target.collider) return false;

  const collider = target.collider;
  const theta = target.rotation * (Math.PI / 180);
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);

  // Un-rotate ball position into the target's local space
  const dx = ballRef.position.x - target.position.x;
  const dy = ballRef.position.y - target.position.y;

  const localX = dx * cos + dy * sin;
  const localY = -dx * sin + dy * cos;

  const halfW = collider.width / 2;
  const halfH = collider.height / 2;
  
  // FIX: Radius is half the diameter!
  const radius = ballRef.diameter / 2; 

  // ====================
  //  INVERTED COLLISION
  // ====================
  if (collider.inverted) {
    return (
      localX > halfW - radius ||
      localX < -halfW + radius ||
      localY > halfH - radius ||
      localY < -halfH + radius
    );
  }

  // ==========================================
  // STANDARD COLLISION
  // ==========================================
  const closestX = Math.max(-halfW, Math.min(localX, halfW));
  const closestY = Math.max(-halfH, Math.min(localY, halfH));

  const diffX = localX - closestX;
  const diffY = localY - closestY;
  const distanceSq = (diffX * diffX) + (diffY * diffY);

  return distanceSq < (radius * radius);
}

// these will be massive help when we get to redirecting deflection angles
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
function randomizeDir(direction = new Vector2, rangeDeg = 0) {
  var startDeg = dirToDeg(direction);

  return degToDir(startDeg + ((Math.random() - 0.5) * rangeDeg));
}