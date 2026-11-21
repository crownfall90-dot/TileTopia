// Friends and inbox rules grant writes at individual entries. Keeping the index
// reads and all resulting removals in one deletion attempt makes the sweep retryable.
export async function accountDeletionPatch({uid, read, friendCode, usageDay, now = Date.now()}) {
  const [friends, inbox, savedCode] = await Promise.all([
    read('friends/' + uid), read('inbox/' + uid), read('fcodeOf/' + uid)
  ]);
  const patch = {};
  for (const node of ['profiles', 'presence', 'leaders', 'leaders_hex', 'logs', 'feedback', 'suggestions/names', 'playerNo', 'fcodeOf']) {
    patch[`${node}/${uid}`] = null;
  }
  for (const friend of Object.keys(friends || {})) {
    patch[`friends/${uid}/${friend}`] = null;
    patch[`friends/${friend}/${uid}`] = null;
  }
  for (const key of Object.keys(inbox || {})) patch[`inbox/${uid}/${key}`] = null;
  // Older installations stored their code only on the device. A stale or
  // reassigned code cannot be deleted under the current owner's credentials.
  for (const code of new Set([savedCode, friendCode])) {
    if (/^[A-Z0-9]{6}$/.test(code) && await read('fcodes/' + code) === uid) patch['fcodes/' + code] = null;
  }
  // Players can delete their own daily row but cannot list other players' usage.
  // Cover the published twelve-month retention period, including leap years.
  for (let offset = 0; offset <= 366; offset++) {
    const day = new Date(now - offset * 86400000).toISOString().slice(0, 10);
    patch[`usage/${day}/${uid}`] = null;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(usageDay)) patch[`usage/${usageDay}/${uid}`] = null;
  return patch;
}
