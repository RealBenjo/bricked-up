function resolveBoxCollision(mover, target) {
  if (!target.collider || !mover.collider) return false;

  const theta = target.rotation * (Math.PI / 180);
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);

  // Un-rotate mover position into the target's local space
  const dx = mover.position.x - target.position.x;
  const dy = mover.position.y - target.position.y;

  let localX = dx * cos + dy * sin;
  let localY = -dx * sin + dy * cos;

  // Combine the sizes of BOTH boxes (Minkowski Sum)
  const combinedHalfW = (target.collider.width / 2) + (mover.collider.width / 2);
  const combinedHalfH = (target.collider.height / 2) + (mover.collider.height / 2);

  // ====================
  //  INVERTED COLLISION (WORLD BOUNDARIES)
  // ====================
  if (target.collider.inverted) {
    let bounced = false;
    let localNormalX = 0;
    let localNormalY = 0;

    // Use subtraction here because we are trapped INSIDE the bounds
    const innerHalfW = (target.collider.width / 2) - (mover.collider.width / 2);
    const innerHalfH = (target.collider.height / 2) - (mover.collider.height / 2);

    if (localX > innerHalfW) {
      localX = innerHalfW; localNormalX = -1; bounced = true;
    } else if (localX < -innerHalfW) {
      localX = -innerHalfW; localNormalX = 1; bounced = true;
    }

    if (localY > innerHalfH) {
      localY = innerHalfH; localNormalY = -1; bounced = true;
    } else if (localY < -innerHalfH) {
      localY = -innerHalfH; localNormalY = 1; bounced = true;
    }

    if (bounced) {
      mover.position.x = target.position.x + (localX * cos - localY * sin);
      mover.position.y = target.position.y + (localX * sin + localY * cos);

      const globalNormalX = localNormalX * cos - localNormalY * sin;
      const globalNormalY = localNormalX * sin + localNormalY * cos;

      const dot = (mover.velocity.x * globalNormalX) + (mover.velocity.y * globalNormalY);
      if (dot < 0) {
        mover.velocity.x -= 2 * dot * globalNormalX;
        mover.velocity.y -= 2 * dot * globalNormalY;
        
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
  
  // If the center is within the combined half-widths, we have a Box intersection!
  if (Math.abs(localX) < combinedHalfW && Math.abs(localY) < combinedHalfH) {
    
    // Calculate how deep we are inside the box on both axes
    const penX = combinedHalfW - Math.abs(localX);
    const penY = combinedHalfH - Math.abs(localY);

    let localNormalX = 0;
    let localNormalY = 0;
    let penetration = 0;

    // Resolve on the axis with the LEAST penetration (shortest path out)
    if (penX < penY) {
      localNormalX = localX >= 0 ? 1 : -1; // Push left or right
      localNormalY = 0;
      penetration = penX;
    } else {
      localNormalX = 0;
      localNormalY = localY >= 0 ? 1 : -1; // Push up or down
      penetration = penY;
    }

    // Convert the local normal back to world space
    const globalNormalX = localNormalX * cos - localNormalY * sin;
    const globalNormalY = localNormalX * sin + localNormalY * cos;

    // Push the mover out of the wall
    mover.position.x += globalNormalX * penetration;
    mover.position.y += globalNormalY * penetration;

    // Bounce the velocity
    const dot = (mover.velocity.x * globalNormalX) + (mover.velocity.y * globalNormalY);

    if (dot < 0) {
      mover.velocity.x -= 2 * dot * globalNormalX;
      mover.velocity.y -= 2 * dot * globalNormalY;
      
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


function checkCollision(mover, target) {
  if (!target.collider || !mover.collider) return false;

  const theta = target.rotation * (Math.PI / 180);
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);

  const dx = mover.position.x - target.position.x;
  const dy = mover.position.y - target.position.y;

  const localX = dx * cos + dy * sin;
  const localY = -dx * sin + dy * cos;

  const combinedHalfW = (target.collider.width / 2) + (mover.collider.width / 2);
  const combinedHalfH = (target.collider.height / 2) + (mover.collider.height / 2);

  if (target.collider.inverted) {
    const innerHalfW = (target.collider.width / 2) - (mover.collider.width / 2);
    const innerHalfH = (target.collider.height / 2) - (mover.collider.height / 2);
    
    return (
      localX > innerHalfW ||
      localX < -innerHalfW ||
      localY > innerHalfH ||
      localY < -innerHalfH
    );
  }

  // Pure box overlap check
  return Math.abs(localX) < combinedHalfW && Math.abs(localY) < combinedHalfH;
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