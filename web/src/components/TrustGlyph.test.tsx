import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrustGlyph } from './TrustGlyph.tsx';

describe('TrustGlyph — trust as a shape beside the name (§H)', () => {
  it('names the trust tier for assistive tech', () => {
    render(<TrustGlyph source="club-verified" />);
    expect(
      screen.getByRole('img', { name: /club-verified route/i })
    ).toBeInTheDocument();
  });

  it('carries a tick only for verified (plain ring for member)', () => {
    const { container, rerender } = render(
      <TrustGlyph source="club-verified" />
    );
    expect(container.querySelector('path')).toBeInTheDocument(); // the tick
    rerender(<TrustGlyph source="club-member" />);
    expect(container.querySelector('path')).not.toBeInTheDocument();
  });

  it('dashes the ring for a third-party (untrusted) source — shape, not colour', () => {
    const { container } = render(<TrustGlyph source="third-party" />);
    expect(container.querySelector('circle')).toHaveAttribute(
      'stroke-dasharray'
    );
  });
});
