import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConnectStrava } from './ConnectStrava.tsx';

const OUT = { signedIn: false } as const;
const IN = { signedIn: true, athleteId: 9, name: 'Jo' } as const;

describe('ConnectStrava', () => {
  it('offers a Connect CTA that starts the server-side OAuth flow', () => {
    render(<ConnectStrava session={OUT} banner={null} />);
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
    render(<ConnectStrava session={OUT} banner={banner} />);
    expect(screen.getByRole('status')).toHaveTextContent(copy);
  });

  it('renders nothing when signed in (avatar + panel own that UI)', () => {
    const { container } = render(<ConnectStrava session={IN} banner={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
