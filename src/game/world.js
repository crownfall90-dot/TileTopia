// src/game/world.js
// DOM world coordinate projections, feature positions, and wall calculations

export const V = [[0, -1], [1, 0], [0, 1], [-1, 0]];
export const DX = [0, 1, 0, -1];
export const DY = [-1, 0, 1, 0];

/**
 * Calculates relative position [x, y] inside a tile (0.5..-0.5) for placing a meeple
 */
export function groupPos(t, g) {
  if (!g) return [0, 0];
  if (g.kind === 'f') return [0.24, 0.18];
  if (g.kind === 'c') {
    if (g.edges.length === 1) {
      const [x, y] = V[g.edges[0]];
      return [x * 0.3, y * 0.3];
    }
    let sx = 0, sy = 0;
    g.edges.forEach(d => {
      sx += V[d][0];
      sy += V[d][1];
    });
    return [sx * 0.16 + 0.06, sy * 0.16 + 0.08];
  }
  const a = V[g.edges[0]];
  if (g.edges.length === 2) {
    const b = V[g.edges[1]];
    return [(a[0] * 0.4225 + b[0] * 0.1225) * 0.5, (a[1] * 0.4225 + b[1] * 0.1225) * 0.5];
  }
  return [a[0] * 0.3, a[1] * 0.3];
}

/**
 * Computes wall face visibility and waterfall state for 4 sides of a tile
 */
export function calcWallVisibility(t, hasNeighbor, edgeAt) {
  const result = [];
  for (let d = 0; d < 4; d++) {
    const nx = t.x + DX[d], ny = t.y + DY[d];
    const hidden = hasNeighbor(nx, ny);
    const edge = edgeAt(t, d);
    const fall = !hidden && edge === 'w';
    result.push({d, hidden, fall});
  }
  return result;
}

