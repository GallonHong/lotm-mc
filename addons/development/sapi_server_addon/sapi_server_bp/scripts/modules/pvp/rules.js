// Pure rules: no Minecraft imports, exercised by Node tests.
export const PVP_CONFIG = Object.freeze({
 dimension: 'minecraft:overworld', offset: { x: 100000, y: 192, z: 100000 },
 bounds: { minX: 100096, maxX: 100319, minY: 128, maxY: 319, minZ: 100096, maxZ: 100383 },
 combat: { minX: 100098, maxX: 100317, minY: 212, maxY: 304, minZ: 100098, maxZ: 100381 },
 blue: { x: 100209.57, y: 232, z: 100262.77 }, red: { x: 100223.71, y: 232, z: 100148.30 },
 points: [
  { id: 'A', x: 100196.93, y: 246, z: 100176.59 },
  { id: 'B', x: 100247.28, y: 237, z: 100214.73 },
  { id: 'C', x: 100164.71, y: 232, z: 100238.68 }
 ],
 captureRadius: 5, verticalTolerance: 2, captureSeconds: 8, targetScore: 500,
 durationSeconds: 720, countdownSeconds: 15, respawnSeconds: 5, protectionSeconds: 4,
 minimumPlayers: 2, maximumPlayers: 16, minTeamSize: 1, maxTeamSize: 8,
 // No economic reward is silently introduced. Configure after balance approval.
 rewardWin: 0, rewardLoss: 0,
 vault: { x: 100336, y: -60, z: 100112, slots: 32 }
});
export function inBounds(p, b = PVP_CONFIG.bounds) {
 return !!p && p.x >= b.minX && p.x <= b.maxX && p.y >= b.minY && p.y <= b.maxY && p.z >= b.minZ && p.z <= b.maxZ;
}
export function onPoint(p, point) {
 return Math.abs(p.y - point.y) <= PVP_CONFIG.verticalTolerance && Math.hypot(p.x - point.x, p.z - point.z) <= PVP_CONFIG.captureRadius;
}
export function marker(matchId) { return `PVP_MATCH:${matchId}`; }
export function stepPoint(point, red, blue) {
 const next = { ...point, contested: red > 0 && blue > 0 };
 if (next.contested) return next;
 const team = red > 0 ? 'red' : blue > 0 ? 'blue' : null;
 if (!team || team === next.owner) { next.progress = 0; next.capturing = null; return next; }
 if (next.capturing !== team) { next.capturing = team; next.progress = 0; }
 next.progress += 1;
 if (next.progress >= PVP_CONFIG.captureSeconds) { next.owner = team; next.progress = 0; next.capturing = null; }
 return next;
}
export function teamFor(redCount, blueCount) { return redCount <= blueCount ? 'red' : 'blue'; }
export function shouldRecover(phase) { return !['QUEUED', 'RESTORED', 'CANCELLED'].includes(phase); }

/** Absolute compass heading; Bedrock +X is east and +Z is south. */
export function navigationLine(position, point) {
 const dx=point.x-position.x,dz=point.z-position.z,dy=point.y-position.y;
 const distance=Math.round(Math.hypot(dx,dz));
 const directions=['北','东北','东','东南','南','西南','西','西北'];
 const bearing=(Math.atan2(dx,-dz)*180/Math.PI+360)%360;
 const heading=distance<=1?'脚下':directions[Math.round(bearing/45)%8];
 const elevation=Math.abs(dy)<2?'同层':`${dy>0?'↑上':'↓下'} ${Math.round(Math.abs(dy))}格`;
 return `${point.id}据点 · ${heading} ${distance}格 · ${elevation}`;
}
