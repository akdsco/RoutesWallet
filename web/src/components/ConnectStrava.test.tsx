import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConnectStrava } from './ConnectStrava.tsx';

function setUrl(search: string) {
  window.history.replaceState({}, '', `/${search}`);
}

describe('ConnectStrava', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setUrl('');
    vi.stubEnv('VITE_STRAVA_CLIENT_ID', 'CID123');
  });
  afterEach(() => vi.unstubAllEnvs());

  it('renders a Strava authorize link with the callback redirect + route scope', () => {
    render(<ConnectStrava />);
    const link = screen.getByRole('link');
    const url = new URL(link.getAttribute('href')!);
    expect(url.origin + url.pathname).toBe(
      'https://www.strava.com/oauth/authorize'
    );
    expect(url.searchParams.get('client_id')).toBe('CID123');
    expect(url.searchParams.get('scope')).toBe('read,activity:read_all');
    expect(url.searchParams.get('redirect_uri')).toContain('/connect/callback');
  });

  it('renders nothing when the client id is not configured', () => {
    vi.stubEnv('VITE_STRAVA_CLIENT_ID', '');
    const { container } = render(<ConnectStrava />);
    expect(container).toBeEmptyDOMElement();
  });

  it('relabels the CTA once this browser has already contributed', () => {
    render(<ConnectStrava />);
    expect(screen.getByRole('link')).toHaveTextContent(/connect strava/i);
    // A prior successful connect leaves the browser flag set.
    window.localStorage.setItem('rw:strava-contributed', '1');
    screen.getByRole('link'); // sanity: still one link
    render(<ConnectStrava />);
    expect(screen.getAllByRole('link').at(-1)).toHaveTextContent(
      /add more from strava/i
    );
  });

  it('shows a success status and sets the contributed flag on connect=ok', () => {
    setUrl('?connect=ok&added=4');
    render(<ConnectStrava />);
    expect(screen.getByRole('status')).toHaveTextContent(/club pool/i);
    expect(window.localStorage.getItem('rw:strava-contributed')).toBe('1');
  });

  it('shows a failure status without marking contributed on connect=error', () => {
    setUrl('?connect=error');
    render(<ConnectStrava />);
    expect(screen.getByRole('status')).toHaveTextContent(/went wrong/i);
    expect(window.localStorage.getItem('rw:strava-contributed')).toBeNull();
  });
});
