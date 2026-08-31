import { describe, it, expect } from 'vitest';
import { missingConnectConfig } from './connect-config.ts';

const full = {
  STRAVA_CLIENT_ID: '136750',
  STRAVA_CLIENT_SECRET: 'secret',
  SESSION_SECRET: 'hmac-key',
};

describe('missingConnectConfig', () => {
  it('is empty when every required var is present', () => {
    expect(missingConnectConfig(full)).toEqual([]);
  });

  it('names each missing or blank var (permanent misconfig, surfaced distinctly)', () => {
    expect(missingConnectConfig({ ...full, STRAVA_CLIENT_SECRET: '' })).toEqual(
      ['STRAVA_CLIENT_SECRET']
    );
    expect(missingConnectConfig({ ...full, SESSION_SECRET: '   ' })).toEqual([
      'SESSION_SECRET',
    ]);
    expect(missingConnectConfig({})).toEqual([
      'STRAVA_CLIENT_ID',
      'STRAVA_CLIENT_SECRET',
      'SESSION_SECRET',
    ]);
  });
});
