// Profile cloud synchronization helpers (E-1.3)
// Encodes, decodes, and merges profile payloads stored at /profiles/{uid}.

/** Serializes local wallet and seat settings into the database profile payload. */
export function encodeProfilePayload(wallet, setupSeats = null, timestamp = Date.now(), history = null) {
  const payload = {
    w: JSON.stringify(wallet),
    t: timestamp,
  };
  if (setupSeats && setupSeats[0]) {
    payload.s = JSON.stringify({
      name: setupSeats[0].name,
      col: setupSeats[0].col,
    });
  }
  if (Array.isArray(history) && history.length) {
    payload.h = JSON.stringify(history.slice(0, 30));
  }
  return payload;
}

/** Parses profile payload from database into wallet and seat object. */
export function decodeProfilePayload(data) {
  if (!data || !data.w) return null;
  try {
    const wallet = JSON.parse(data.w);
    const seats = data.s ? JSON.parse(data.s) : null;
    let history = null;
    if (data.h) {
      try { history = JSON.parse(data.h); } catch (_) {}
    }
    return {
      wallet,
      seats,
      history: Array.isArray(history) ? history : null,
      timestamp: data.t || 0,
    };
  } catch (_) {
    return null;
  }
}

/** Merge two match histories, deduplicating by match ID and sorting newest first. */
export function mergeHistory(local = [], remote = [], limit = 50) {
  const map = new Map();
  const valid = x => x && typeof x === 'object' && typeof x.id === 'string' && Array.isArray(x.players);
  for (const row of (Array.isArray(remote) ? remote : [])) {
    if (valid(row)) map.set(row.id, row);
  }
  for (const row of (Array.isArray(local) ? local : [])) {
    if (valid(row)) {
      const existing = map.get(row.id);
      if (!existing || (row.final && !existing.final) || (row.at || 0) >= (existing.at || 0)) {
        map.set(row.id, row);
      }
    }
  }
  return Array.from(map.values())
    .sort((a, b) => (b.at || 0) - (a.at || 0))
    .slice(0, limit);
}

/** Merge two wallet states resolving conflicts in gold, quests, and unlocked cosmetics. */
export function mergeWallets(local = {}, remote = {}) {
  const merged = Object.assign({}, local, remote);
  // Gold: keep the maximum to avoid accidental rollbacks
  merged.gold = Math.max(local.gold || 0, remote.gold || 0);
  // Promos: union of redeemed promos
  merged.promos = Array.from(new Set([...(local.promos || []), ...(remote.promos || [])]));
  // Frames & cosmetics
  merged.owned = Array.from(new Set([...(local.owned || ['classic']), ...(remote.owned || ['classic'])]));
  merged.frames = Array.from(new Set([...(local.frames || []), ...(remote.frames || [])]));
  return merged;
}
