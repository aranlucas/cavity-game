// Collision bounds include the physical chair, trolley, cabinets, and waiting bench.
const obstacles = [
  [-0.95, 0.95, -2.6, 1],
  [1, 2.25, -2, -0.6],
  [-1.72, -0.93, -1.62, -0.82],
  [-4.8, -3.65, -3.8, 0.4],
  [-4.1, -1.3, 2.75, 4],
];

export function canStand(x: number, z: number) {
  return (
    x > -4.4 &&
    x < 4.4 &&
    z > -3.5 &&
    z < 4.6 &&
    !obstacles.some(
      ([a, b, c, d]) => x > a! - 0.18 && x < b! + 0.18 && z > c! - 0.18 && z < d! + 0.18,
    )
  );
}

export function walk(
  x: number,
  z: number,
  yaw: number,
  forward: number,
  right: number,
  dt: number,
) {
  const speed = (Math.max(0, Math.min(dt, 0.05)) * 2.1) / (Math.hypot(forward, right) || 1);
  const dx = (-Math.sin(yaw) * forward + Math.cos(yaw) * right) * speed;
  const dz = (-Math.cos(yaw) * forward - Math.sin(yaw) * right) * speed;

  if (canStand(x + dx, z)) x += dx;

  if (canStand(x, z + dz)) z += dz;

  return { x, z };
}
