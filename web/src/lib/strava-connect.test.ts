import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildAuthorizeUrl,
  hasContributed,
  markContributed,
  readConnectStatus,
} from './strava-connect.ts';

describe('buildAuthorizeUrl', () => {
  it('builds the Strava authorize URL with the callback redirect + route scope', () => {
    const url = new URL(buildAuthorizeUrl('CID', 'https://routeswallet.app'));
    expect(url.origin + url.pathname).toBe(
      'https://www.strava.com/oauth/authorize'
    );
    expect(url.searchParams.get('client_id')).toBe('CID');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('redirect_uri')).toBe(
      'https://routeswallet.app/connect/callback'
    );
    expect(url.searchParams.get('scope')).toBe('read,activity:read_all');
  });
});

describe('contributed flag', () => {
  beforeEach(() => window.localStorage.clear());

  it('round-trips the browser-level "already contributed" flag', () => {
    expect(hasContributed()).toBe(false);
    markContributed();
    expect(hasContributed()).toBe(true);
  });
});

describe('readConnectStatus', () => {
  it('parses connect=ok with an added count', () => {
    expect(readConnectStatus('?connect=ok&added=7')).toEqual({
      state: 'ok',
      added: 7,
    });
  });

  it('parses the failure states', () => {
    expect(readConnectStatus('?connect=denied')).toEqual({ state: 'denied' });
    expect(readConnectStatus('?connect=scope')).toEqual({ state: 'scope' });
    expect(readConnectStatus('?connect=error')).toEqual({ state: 'error' });
  });

  it('is null when there is no connect param, and ignores unknown values', () => {
    expect(readConnectStatus('')).toBeNull();
    expect(readConnectStatus('?connect=weird')).toBeNull();
  });
});
