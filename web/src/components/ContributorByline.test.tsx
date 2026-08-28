import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ContributorByline } from './ContributorByline.tsx';

describe('ContributorByline', () => {
  it('links the name to the athlete Strava profile when the id is usable', () => {
    render(
      <ContributorByline
        ownerName="Robbie de Santos"
        ownerStravaId="12955681"
      />
    );
    const link = screen.getByRole('link', {
      name: /view Robbie de Santos on strava/i,
    });
    expect(link).toHaveAttribute(
      'href',
      'https://www.strava.com/athletes/12955681'
    );
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('shows the name verbatim, keeping any club tag', () => {
    render(<ContributorByline ownerName="Arkadiusz | HV" ownerStravaId="1" />);
    expect(
      screen.getByRole('link', { name: /view Arkadiusz \| HV on strava/i })
    ).toHaveTextContent('Arkadiusz | HV');
  });

  it('degrades to plain text (no link) when the id is unusable', () => {
    render(<ContributorByline ownerName="Nicolas Laurent" ownerStravaId="x" />);
    expect(screen.getByText(/Nicolas Laurent/)).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('renders nothing when there is no owner name', () => {
    const { container } = render(
      <ContributorByline ownerStravaId="12955681" />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
