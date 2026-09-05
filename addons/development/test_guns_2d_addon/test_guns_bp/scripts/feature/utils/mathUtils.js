export const MathUtils = {
  add(a, b) {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
  },
  subtract(a, b) {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  },
  scale(v, factor) {
    return { x: v.x * factor, y: v.y * factor, z: v.z * factor };
  },
  length(v) {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  },
  normalize(v) {
    const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (len < 1e-6) return { x: 0, y: 0, z: 0 };
    return { x: v.x / len, y: v.y / len, z: v.z / len };
  },
  distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
};
