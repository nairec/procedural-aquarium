export const vec = (x = 0, y = 0) => ({ x, y })
export const add = (a, b) => vec(a.x + b.x, a.y + b.y)
export const sub = (a, b) => vec(a.x - b.x, a.y - b.y)
export const heading = (v) => Math.atan2(v.y, v.x)
export const fromAngle = (a) => vec(Math.cos(a), Math.sin(a))
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
export function setMag(v, n) {
  const len = Math.hypot(v.x, v.y) || 1
  return vec((v.x / len) * n, (v.y / len) * n)
}

export function constraintAngle(angle_1, angle_2, constraint) {
    const diff = angleDiff(angle_1, angle_2)
    if (diff > constraint) return simplifyAngle(angle_2 + constraint)
    if (diff < -constraint) return simplifyAngle(angle_2 - constraint)
    return simplifyAngle(angle_1)
  }

export function angleDiff(a, b) {
  return simplifyAngle(a - b)
}

export function relativeAngleDiff(angle, anchor) {
  angle = simplifyAngle(angle + Math.PI - anchor);
  anchor = Math.PI;

  return anchor - angle;
}

export function rotateToward(current, target, maxDelta) {
  const diff = angleDiff(target, current)
  if (Math.abs(diff) <= maxDelta) return simplifyAngle(target)
  return simplifyAngle(current + Math.sign(diff) * maxDelta)
}

function simplifyAngle(angle) {
    while (angle > Math.PI) {
        angle -= 2 * Math.PI;
    }
    while (angle < -Math.PI) {
        angle += 2 * Math.PI;
    }
    return angle;
}

export function wrapPos(position, bounds) {
  const w = bounds.width;
  const h = bounds.height;
  return vec(
    ((position.x % w) + w) % w,
    ((position.y % h) + h) % h,
  );
}

export function getWrapOffsets(x, y, bounds, margin) {
  const { width: w, height: h } = bounds;
  const xs = [0];
  const ys = [0];
  if (x < margin) xs.push(w);
  if (x > w - margin) xs.push(-w);
  if (y < margin) ys.push(h);
  if (y > h - margin) ys.push(-h);

  const offsets = [];
  for (const ox of xs) {
    for (const oy of ys) {
      offsets.push(vec(ox, oy));
    }
  }
  return offsets;
}

export function drawWrapped(ctx, bounds, anchor, margin, drawFn) {
  for (const offset of getWrapOffsets(anchor.x, anchor.y, bounds, margin)) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, bounds.width, bounds.height);
    ctx.clip();
    ctx.translate(offset.x, offset.y);
    drawFn();
    ctx.restore();
  }
}

export function toroidalDelta(from, to, bounds) {
  const w = bounds.width;
  const h = bounds.height;
  let dx = to.x - from.x;
  let dy = to.y - from.y;
  if (dx >  w / 2) dx -= w;
  if (dx < -w / 2) dx += w;
  if (dy >  h / 2) dy -= h;
  if (dy < -h / 2) dy += h;
  return vec(dx, dy);
}

export function toroidalDist(from, to, bounds) {
  const d = toroidalDelta(from, to, bounds);
  return Math.hypot(d.x, d.y);
}

export function randomFishColors(role) {
  const hue = role === 'prey'
  ? 180 + Math.random() * 80
  : Math.random() * 60;

  const saturation = 55 + Math.random() * 25;  
  const bodyLightness = 32 + Math.random() * 14;
  const finLightness = bodyLightness + 22 + Math.random() * 10;

  return {
    body: `hsl(${hue}, ${saturation}%, ${bodyLightness}%)`,
    fin: `hsl(${hue}, ${saturation}%, ${finLightness}%)`,
  };
}