import { describe, it, expect } from 'vitest';
import {
  SESSION_COOKIE,
  SYNC_COOKIE,
  buildSessionCookie,
  buildSyncCookie,
  clearSessionCookie,
  clearSyncCookie,
  readSession,
  readSyncId,
} from './session-cookie.ts';

const SECRET = 'cookie-secret-xyz';

/** The `name=value` a browser would echo back from a Set-Cookie string. */
function asRequestCookie(setCookie: string): string {
  return setCookie.split(';')[0]!;
}

describe('readSession', () => {
  it('returns the signed-in athlete for a valid session cookie', async () => {
    const setCookie = await buildSessionCookie(
      { athleteId: 7, name: 'Jo Rider' },
      SECRET
    );
    const header = `other=1; ${asRequestCookie(setCookie)}; foo=bar`;
    expect(await readSession(header, SECRET)).toEqual({
      signedIn: true,
      athleteId: 7,
      name: 'Jo Rider',
    });
  });

  it('reports signed-out when there is no cookie header at all', async () => {
    expect(await readSession(null, SECRET)).toEqual({ signedIn: false });
  });

  it('reports signed-out for a tampered / wrong-secret session cookie', async () => {
    const setCookie = await buildSessionCookie(
      { athleteId: 7, name: 'Jo' },
      SECRET
    );
    const header = asRequestCookie(setCookie);
    expect(await readSession(header, 'a-different-secret')).toEqual({
      signedIn: false,
    });
  });
});

describe('buildSessionCookie', () => {
  it('sets a HttpOnly, Secure, SameSite=Lax, Path=/ cookie with a long max-age', async () => {
    const setCookie = await buildSessionCookie(
      { athleteId: 1, name: 'A' },
      SECRET
    );
    expect(setCookie.startsWith(`${SESSION_COOKIE}=`)).toBe(true);
    expect(setCookie).toMatch(/HttpOnly/);
    expect(setCookie).toMatch(/Secure/);
    expect(setCookie).toMatch(/SameSite=Lax/);
    expect(setCookie).toMatch(/Path=\//);
    expect(setCookie).toMatch(/Max-Age=\d{6,}/); // days, not seconds
  });
});

describe('clearSessionCookie', () => {
  it('expires the session cookie immediately', () => {
    const setCookie = clearSessionCookie();
    expect(setCookie.startsWith(`${SESSION_COOKIE}=`)).toBe(true);
    expect(setCookie).toMatch(/Max-Age=0/);
    expect(setCookie).toMatch(/HttpOnly/);
  });
});

describe('sync-handle cookie', () => {
  it('round-trips an opaque sync id as a short-lived HttpOnly cookie', () => {
    const setCookie = buildSyncCookie('handle-123');
    expect(setCookie.startsWith(`${SYNC_COOKIE}=handle-123`)).toBe(true);
    expect(setCookie).toMatch(/HttpOnly/);
    expect(setCookie).toMatch(/SameSite=Lax/);
    expect(setCookie).toMatch(/Max-Age=[1-9]\d{0,3}(?!\d)/); // short (<= a few min)
    expect(readSyncId(asRequestCookie(setCookie))).toBe('handle-123');
  });

  it('reads no sync id when the cookie is absent', () => {
    expect(readSyncId('other=1')).toBeNull();
    expect(readSyncId(null)).toBeNull();
  });

  it('clears the sync cookie immediately', () => {
    const setCookie = clearSyncCookie();
    expect(setCookie.startsWith(`${SYNC_COOKIE}=`)).toBe(true);
    expect(setCookie).toMatch(/Max-Age=0/);
  });
});
