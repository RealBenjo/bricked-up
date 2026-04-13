function resolveBoxCollision(mover, target) {
  if (!target.collider || !mover.collider) return false;

  const dx = mover.position.x - target.position.x;
  const dy = mover.position.y - target.position.y;

  // Combine the sizes of BOTH boxes (Minkowski Sum)
  const combinedHalfW = (target.collider.width / 2) + (mover.collider.width / 2);
  const combinedHalfH = (target.collider.height / 2) + (mover.collider.height / 2);

  // ====================
  //  INVERTED COLLISION (WORLD BOUNDARIES)
  // ====================
  if (target.collider.inverted) {
    let bounced = false;
    let normalX = 0;
    let normalY = 0;
    let newDx = dx;
    let newDy = dy;

    // Use subtraction here because we are trapped INSIDE the bounds
    const innerHalfW = (target.collider.width / 2) - (mover.collider.width / 2);
    const innerHalfH = (target.collider.height / 2) - (mover.collider.height / 2);

    if (dx > innerHalfW) {
      newDx = innerHalfW; normalX = -1; bounced = true;
    } else if (dx < -innerHalfW) {
      newDx = -innerHalfW; normalX = 1; bounced = true;
    }

    if (dy > innerHalfH) {
      newDy = innerHalfH; normalY = -1; bounced = true;
    } else if (dy < -innerHalfH) {
      newDy = -innerHalfH; normalY = 1; bounced = true;
    }

    if (bounced) {
      mover.position.x = target.position.x + newDx;
      mover.position.y = target.position.y + newDy;

      const dot = (mover.velocity.x * normalX) + (mover.velocity.y * normalY);
      if (dot < 0) {
        mover.velocity.x -= 2 * dot * normalX;
        mover.velocity.y -= 2 * dot * normalY;
        
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
  
  // Pure box overlap check
  if (Math.abs(dx) < combinedHalfW && Math.abs(dy) < combinedHalfH) {
    
    // Calculate how deep we are inside the box on both axes
    const penX = combinedHalfW - Math.abs(dx);
    const penY = combinedHalfH - Math.abs(dy);

    let normalX = 0;
    let normalY = 0;
    let penetration = 0;

    // Resolve on the axis with the LEAST penetration (shortest path out)
    if (penX < penY) {
      normalX = dx >= 0 ? 1 : -1; // Push left or right
      penetration = penX;
    } else {
      normalY = dy >= 0 ? 1 : -1; // Push up or down
      penetration = penY;
    }

    // Push the mover out of the wall
    mover.position.x += normalX * penetration;
    mover.position.y += normalY * penetration;

    // Bounce the velocity
    const dot = (mover.velocity.x * normalX) + (mover.velocity.y * normalY);

    if (dot < 0) {
      mover.velocity.x -= 2 * dot * normalX;
      mover.velocity.y -= 2 * dot * normalY;
      
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

  const dx = mover.position.x - target.position.x;
  const dy = mover.position.y - target.position.y;

  const combinedHalfW = (target.collider.width / 2) + (mover.collider.width / 2);
  const combinedHalfH = (target.collider.height / 2) + (mover.collider.height / 2);

  if (target.collider.inverted) {
    const innerHalfW = (target.collider.width / 2) - (mover.collider.width / 2);
    const innerHalfH = (target.collider.height / 2) - (mover.collider.height / 2);
    
    return (
      dx > innerHalfW ||
      dx < -innerHalfW ||
      dy > innerHalfH ||
      dy < -innerHalfH
    );
  }

  // Pure box overlap check
  return Math.abs(dx) < combinedHalfW && Math.abs(dy) < combinedHalfH;
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