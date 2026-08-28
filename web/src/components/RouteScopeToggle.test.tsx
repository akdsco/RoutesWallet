import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouteScopeToggle } from './RouteScopeToggle.tsx';

describe('RouteScopeToggle', () => {
  it('reflects the current scope as the pressed option', () => {
    render(<RouteScopeToggle value="mine" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /my routes/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: /all routes/i })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('reports the chosen scope on click', async () => {
    const onChange = vi.fn();
    render(<RouteScopeToggle value="all" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /my routes/i }));
    expect(onChange).toHaveBeenCalledWith('mine');
  });
});
