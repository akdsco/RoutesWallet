import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Avatar } from './Avatar.tsx';

describe('Avatar', () => {
  it('shows the photo when there is one', () => {
    // The photo is decorative (alt=""), so query the element, not a11y role.
    const { container } = render(
      <Avatar name="Jo Rider" photo="https://cdn/jo.jpg" />
    );
    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      'https://cdn/jo.jpg'
    );
  });
  it('shows initials (no image) when there is no photo', () => {
    render(<Avatar name="Jo Rider" />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('JR')).toBeInTheDocument();
  });
});
