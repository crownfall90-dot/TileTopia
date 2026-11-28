// Google Sign-In helper functions (E-1.2)
// Pure helper functions and token decoders for Google Sign-In and Credential Manager.

/** Decode payload from JWT id_token handling UTF-8 characters without mojibake. */
export function jwtPayload(t) {
  try {
    const b = atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(b, c => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch (_) {
    return {};
  }
}

/** Extract email from JWT id_token. */
export function jwtEmail(t) {
  return jwtPayload(t).email || '';
}

/** Format POST body for Firebase Identity Toolkit signInWithIdp. */
export function googleIdpBody(idToken, session = null) {
  const body = {
    postBody: 'id_token=' + encodeURIComponent(idToken) + '&providerId=google.com',
    requestUri: 'http://localhost',
    returnIdpCredential: true,
    returnSecureToken: true,
  };
  if (session) body.idToken = session;
  return body;
}

export async function linkPasswordSession(credential, passwordSession, link, now = Date.now()) {
  const email = String(passwordSession.email || '').trim().toLowerCase();
  if (!credential.token || !email || email !== credential.email.trim().toLowerCase()
      || !passwordSession.localId || !passwordSession.idToken || now - credential.at > 45 * 60 * 1000) {
    throw new Error('GOOGLE_CONFIRMATION_EXPIRED');
  }
  const linked = await link(credential.token, passwordSession.idToken);
  if (!linked.idToken || linked.localId !== passwordSession.localId) throw new Error('GOOGLE_PROFILE_MISMATCH');
  return linked;
}

/** Classify Google Sign-In error codes. */
export function classifyGoogleError(err) {
  const msg = String(err && err.message ? err.message : err || '');
  if (/cancel/i.test(msg)) return 'canceled';
  if (/no.*credential/i.test(msg)) return 'no_credentials';
  if (/busy/i.test(msg)) return 'busy';
  return 'failed';
}
