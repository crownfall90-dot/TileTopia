// Firebase over REST (TASK-008-5): the player's session (anonymous or signed in) and the Realtime Database paths.
// Same requests, same localStorage key ('fbAuth') and the same session shape as before the move out of game.html,
// so players stay signed in after the update. fetch and storage are passed in, so tests run without a network.

import {accountDeletionPatch} from './account-deletion.js';

/**
 * @param {{apiKey: string, dbUrl: string, storage: Storage, fetch: typeof fetch, onChange?: (a: object|null) => void}} o
 */
export function createFirebase({apiKey, dbUrl, storage, fetch, onChange}) {
  let auth = null;
  let sessionVersion = 0;
  let pendingToken = null;
  let deleting = false;
  const set = a => { auth = a; sessionVersion++; if (onChange) onChange(auth); };
  const save = () => { try { storage.setItem('fbAuth', JSON.stringify(auth)); } catch (_) {} };
  /** The saved session, read from storage the first time it is needed. */
  function load() {
    if (!auth) try { const a = JSON.parse(storage.getItem('fbAuth')); if (a) set(a); } catch (_) {}
    return auth;
  }
  /** Keep a session from an Identity Toolkit answer (sign-in, sign-up, Google). */
  function keep(j, email) {
    set({idToken: j.idToken, refreshToken: j.refreshToken, uid: j.localId, exp: Date.now() + (+j.expiresIn || 3600) * 1000, email});
    save();
  }
  function clear() {
    try { storage.removeItem('fbAuth'); } catch (_) {}
    set(null);
  }
  /** A valid ID token: the saved one, a refreshed one, or (for a guest) a new anonymous account. */
  function token() {
    if (deleting) return Promise.reject(new Error('account deletion in progress'));
    return acquireToken();
  }

  function acquireToken() {
    const session = load();
    if (session && session.exp > Date.now() + 60000) return Promise.resolve(session.idToken);
    if (pendingToken?.version === sessionVersion) return pendingToken.promise;

    const version = sessionVersion;
    const promise = renewToken(session, version).finally(() => {
      if (pendingToken?.promise === promise) pendingToken = null;
    });
    pendingToken = {version, promise};
    return promise;
  }

  async function renewToken(session, version) {
    let j = null;
    if (session?.refreshToken) {
      const r = await fetch('https://securetoken.googleapis.com/v1/token?key=' + apiKey, {method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'}, body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(session.refreshToken)});
      if (r.ok) { const t = await r.json(); j = {idToken: t.id_token, refreshToken: t.refresh_token, expiresIn: t.expires_in, localId: t.user_id}; }
      else if (r.status !== 400 && r.status !== 401) throw new Error('auth ' + r.status);
    }
    // A request from a prior session cannot start a guest sign-up or update the current player.
    if (version !== sessionVersion) throw new Error('auth changed');
    if (!j && (session?.email || (deleting && session?.uid))) throw new Error('auth expired');
    if (!j) {
      const r = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + apiKey, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: '{"returnSecureToken":true}'});
      if (!r.ok) throw new Error('auth ' + r.status);
      j = await r.json();
      if (version !== sessionVersion) throw new Error('auth changed');
    }
    keep(j, session && session.email);
    return j.idToken;
  }
  /** One Identity Toolkit call (accounts:signInWithPassword, signUp, signInWithIdp, update…); throws its error body. */
  async function idt(method, body) {
    const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:${method}?key=${apiKey}`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
    const j = await r.json().catch(() => ({})); if (!r.ok) throw j; return j;
  }
  const url = async path => `${dbUrl}/${path}.json?auth=${await token()}`;
  async function get(path) { const r = await fetch(await url(path)); if (!r.ok) throw new Error(r.status === 401 ? 'rules' : 'get ' + r.status); return r.json(); }
  async function put(path, v) { const r = await fetch(await url(path), {method: 'PUT', body: JSON.stringify(v)}); if (!r.ok) throw new Error('put ' + r.status); }
  async function del(path) { try { await fetch(await url(path), {method: 'DELETE'}); } catch (_) {} }
  async function deleteAccount({friendCode, usageDay}) {
    if (deleting) throw new Error('account deletion in progress');
    deleting = true;
    try {
      // A fresh offline player may have local data and no Firebase identity.
      // If guest sign-up is in progress, finish it before checking for that case.
      const initialUid = load()?.uid;
      if (pendingToken) await pendingToken.promise;
      const uid = load()?.uid;
      if (initialUid && initialUid !== uid) throw new Error('auth changed');
      if (!uid) return;
      const idToken = await acquireToken();
      const samePlayer = () => { if (auth?.uid !== uid) throw new Error('auth changed'); };
      samePlayer();
      const endpoint = path => `${dbUrl}/${path}.json?auth=${encodeURIComponent(idToken)}`;
      const read = async path => {
        const response = await fetch(endpoint(path));
        if (!response.ok) throw new Error('delete lookup ' + response.status);
        return response.json();
      };
      const patch = await accountDeletionPatch({uid, read, friendCode, usageDay});
      samePlayer();
      const result = await fetch(endpoint(''), {method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(patch)});
      if (!result.ok) throw new Error('delete data ' + result.status);
      samePlayer();
      await idt('delete', {idToken});
      samePlayer();
      clear();
    } finally { deleting = false; }
  }
  return {load, keep, clear, token, idt, url, get, put, del, deleteAccount, session: () => auth};
}
