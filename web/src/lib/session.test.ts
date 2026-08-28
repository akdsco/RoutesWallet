import { describe, it, expect } from 'vitest';
import { signSession, verifySession, type Session } from './session.ts';

const SECRET = 'test-secret-abc-123';
const SESSION: Session = { athleteId: 42, name: 'Ada Lovelace' };

describe('session cookie sign/verify', () => {
  it('round-trips the athlete id + name through a signed value', async () => {
    const value = await signSession(SESSION, SECRET);
    expect(value).toContain('.'); // payload.signature
    expect(await verifySession(value, SECRET)).toEqual(SESSION);
  });

  it('rejects a value signed for a different payload (tampered payload)', async () => {
    const a = await signSession({ athleteId: 1, name: 'A' }, SECRET);
    const b = await signSession({ athleteId: 2, name: 'B' }, SECRET);
    // payload from A, signature from B — the HMAC no longer matches.
    const forged = `${a.split('.')[0]}.${b.split('.')[1]}`;
    expect(await verifySession(forged, SECRET)).toBeNull();
  });

  it('rejects a garbled signature', async () => {
    const a = await signSession(SESSION, SECRET);
    expect(
      await verifySession(`${a.split('.')[0]}.deadbeef`, SECRET)
    ).toBeNull();
  });

  it('rejects a value signed with a different secret', async () => {
    const a = await signSession(SESSION, SECRET);
    expect(await verifySession(a, 'a-different-secret')).toBeNull();
  });

  it('rejects malformed input rather than throwing', async () => {
    expect(await verifySession('', SECRET)).toBeNull();
    expect(await verifySession('no-dot-here', SECRET)).toBeNull();
    expect(await verifySession('a.b.c', SECRET)).toBeNull();
  });
});
