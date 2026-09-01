import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConnectStrava } from './ConnectStrava.tsx';
import type { SyncPhase } from '../lib/useConnect.ts';

const OUT = { signedIn: false } as const;
const IN = { signedIn: true, athleteId: 9, name: 'Jo' } as const;
const idle: SyncPhase = { kind: 'idle' };

describe('ConnectStrava — signed out', () => {
  it('offers a Connect CTA that starts the server-side OAuth flow', () => {
    render(<ConnectStrava session={OUT} sync={idle} banner={null} />);
    const link = screen.getByRole('link', { name: /connect with strava/i });
    expect(link).toHaveAttribute('href', '/connect/start');
    expect(screen.getByText(/only read your routes/i)).toBeVisible();
  });

  it.each([
    ['denied', /cancel/i],
    ['scope', /route access/i],
    ['error', /went wrong/i],
    ['unavailable', /temporarily unavailable/i],
  ] as const)('shows the %s banner from the callback', (banner, copy) => {
    render(<ConnectStrava session={OUT} sync={idle} banner={banner} />);
    expect(screen.getByRole('status')).toHaveTextContent(copy);
  });
});

describe('ConnectStrava — signed in', () => {
  it('renders nothing when idle (the avatar in the header is the whole UI)', () => {
    const { container } = render(
      <ConnectStrava session={IN} sync={idle} banner={null} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows progress while syncing', () => {
    render(
      <ConnectStrava session={IN} sync={{ kind: 'syncing' }} banner={null} />
    );
    expect(screen.getByRole('status')).toHaveTextContent(/sync/i);
  });

  it('names the added count on a completed sync', () => {
    render(
      <ConnectStrava
        session={IN}
        sync={{ kind: 'synced', added: 12, updated: 2 }}
        banner={null}
      />
    );
    expect(screen.getByRole('status')).toHaveTextContent(/12/);
  });

  it('reports an observable failure', () => {
    render(
      <ConnectStrava session={IN} sync={{ kind: 'failed' }} banner={null} />
    );
    expect(screen.getByRole('status')).toHaveTextContent(/couldn.t add/i);
  });
});
