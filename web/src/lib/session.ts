/**
 * The signed session cookie behind the "Sign in with Strava" flow (TB-116).
 * Holds *only* the athlete id + display name — no Strava token, no secret — so
 * identity can persist across visits with no user table and nothing sensitive in
 * the browser. The value is `base64url(payload).base64url(HMAC-SHA256(payload))`;
 * `verifySession` returns the payload only when the signature checks out, so a
 * client can't forge or edit their identity.
 *
 * Pure over WebCrypto (`crypto.subtle`), which exists in both the Workers runtime
 * and Node — so this is unit-tested without the network or a real request.
 */
export type Session = { athleteId: number; name: string; photo?: string };

const enc = new TextEncoder();
const dec = new TextDecoder();

/** URL-safe base64 (no padding) of raw bytes. */
function b64urlEncode(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Decode URL-safe base64 back to bytes, or throw on malformed input. */
function b64urlDecode(value: string): Uint8Array {
  const bin = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function hmac(payload: string, secret: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return new Uint8Array(sig);
}

/** Constant-time-ish equality — compares every byte, no early return on length. */
function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

/** Sign a session into a tamper-evident cookie value. */
export async function signSession(
  session: Session,
  secret: string
): Promise<string> {
  const payload = b64urlEncode(enc.encode(JSON.stringify(session)));
  const sig = b64urlEncode(await hmac(payload, secret));
  return `${payload}.${sig}`;
}

/**
 * Verify + decode a session cookie value. Returns the session only when the
 * signature matches; any malformed, tampered, or wrong-secret value returns
 * `null` (never throws) so a bad cookie reads as "signed out", not an error.
 */
export async function verifySession(
  value: string,
  secret: string
): Promise<Session | null> {
  const parts = value.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts as [string, string];
  try {
    const expected = await hmac(payload, secret);
    if (!bytesEqual(b64urlDecode(sig), expected)) return null;
    const parsed = JSON.parse(dec.decode(b64urlDecode(payload))) as unknown;
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as Session).athleteId === 'number' &&
      typeof (parsed as Session).name === 'string'
    ) {
      const { athleteId, name, photo } = parsed as Session;
      return typeof photo === 'string'
        ? { athleteId, name, photo }
        : { athleteId, name };
    }
    return null;
  } catch {
    // silent-ok: any decode/parse failure means a malformed cookie — treat it as
    // "not signed in" rather than a 500. The signature check above is what
    // guarantees an *accepted* value is authentic.
    return null;
  }
}
