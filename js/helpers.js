function resolveBoxCollision(mover, target) {
  if (!target.collider) return false;

  const collider = target.collider;
  const theta = target.rotation * (Math.PI / 180);
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);

  // Un-rotate mover position into the target's local space
  const dx = mover.position.x - target.position.x;
  const dy = mover.position.y - target.position.y;

  let localX = dx * cos + dy * sin;
  let localY = -dx * sin + dy * cos;

  const halfW = collider.width / 2;
  const halfH = collider.height / 2;
  
  // ==========================================
  // GENERALIZATION: Determine the Radius
  // ==========================================
  let radius = 0;
  if (mover.diameter !== undefined) {
    radius = mover.diameter / 2; // It's a Ball
  } else if (mover.collider) {
    // It's an Item (Box). Approximate its size as a circle for smooth bouncing.
    radius = Math.max(mover.collider.width, mover.collider.height) / 2;
  }

  // ====================
  //  INVERTED COLLISION (WORLD BOUNDARIES)
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
      mover.position.x = target.position.x + (localX * cos - localY * sin);
      mover.position.y = target.position.y + (localX * sin + localY * cos);

      const globalNormalX = localNormalX * cos - localNormalY * sin;
      const globalNormalY = localNormalX * sin + localNormalY * cos;

      // GENERALIZATION: Bounce the Velocity, not just Direction
      const dot = (mover.velocity.x * globalNormalX) + (mover.velocity.y * globalNormalY);
      if (dot < 0) {
        mover.velocity.x -= 2 * dot * globalNormalX;
        mover.velocity.y -= 2 * dot * globalNormalY;
        
        // Sync the Ball's direction vector if it has one
        if (mover.direction) {
          mover.direction.x = mover.velocity.x;
          mover.direction.y = mover.velocity.y;
          mover.direction.normalize();
        }
      }
      return true; 
    }
    return false;
  }

  // ==========================================
  // STANDARD COLLISION (PADDLE / BRICKS)
  // ==========================================
  const closestX = Math.max(-halfW, Math.min(localX, halfW));
  const closestY = Math.max(-halfH, Math.min(localY, halfH));

  const diffX = localX - closestX;
  const diffY = localY - closestY;
  const distanceSq = (diffX * diffX) + (diffY * diffY);

  if (distanceSq <= radius * radius) {
    const distance = Math.sqrt(distanceSq) || 0.0001;
    const penetration = radius - distance;

    const localNormalX = diffX / distance;
    const localNormalY = diffY / distance;

    const globalNormalX = localNormalX * cos - localNormalY * sin;
    const globalNormalY = localNormalX * sin + localNormalY * cos;

    mover.position.x += globalNormalX * penetration;
    mover.position.y += globalNormalY * penetration;

    const dot = (mover.velocity.x * globalNormalX) + (mover.velocity.y * globalNormalY);

    if (dot < 0) {
      mover.velocity.x -= 2 * dot * globalNormalX;
      mover.velocity.y -= 2 * dot * globalNormalY;
      
      if (mover.direction) {
        mover.direction.x = mover.velocity.x;
        mover.direction.y = mover.velocity.y;
        mover.direction.normalize();
      }

      if (mover instanceof Ball && target.healthComponent) {
        target.healthComponent.takeDamage(1);
      }
    }
    return true; 
  }
  
  return false; 
}

function checkCollision(mover, target) {
  if (!target.collider) return false;

  const collider = target.collider;
  const theta = target.rotation * (Math.PI / 180);
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);

  const dx = mover.position.x - target.position.x;
  const dy = mover.position.y - target.position.y;

  const localX = dx * cos + dy * sin;
  const localY = -dx * sin + dy * cos;

  const halfW = collider.width / 2;
  const halfH = collider.height / 2;
  
  let radius = 0;
  if (mover.diameter !== undefined) {
    radius = mover.diameter / 2;
  } else if (mover.collider) {
    radius = Math.max(mover.collider.width, mover.collider.height) / 2;
  }

  if (collider.inverted) {
    return (
      localX > halfW - radius ||
      localX < -halfW + radius ||
      localY > halfH - radius ||
      localY < -halfH + radius
    );
  }

  const closestX = Math.max(-halfW, Math.min(localX, halfW));
  const closestY = Math.max(-halfH, Math.min(localY, halfH));

  const diffX = localX - closestX;
  const diffY = localY - closestY;
  const distanceSq = (diffX * diffX) + (diffY * diffY);

  return distanceSq <= (radius * radius);
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