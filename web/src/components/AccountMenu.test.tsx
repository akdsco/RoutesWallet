import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountMenu } from './AccountMenu.tsx';

function setup(over: Partial<Parameters<typeof AccountMenu>[0]> = {}) {
  const props = {
    name: 'Jo Rider',
    theme: 'system' as const,
    onSetTheme: vi.fn(),
    onOpenSettings: vi.fn(),
    onSignOut: vi.fn(),
    ...over,
  };
  render(<AccountMenu {...props} />);
  return props;
}

describe('AccountMenu', () => {
  it('labels the avatar button by the account name', () => {
    setup();
    expect(
      screen.getByRole('button', { name: /account, jo rider/i })
    ).toBeVisible();
  });

  it('opens to identity, Settings, Sign out and a three-way Appearance control', async () => {
    setup({ theme: 'dark' });
    await userEvent.click(screen.getByRole('button', { name: /account/i }));

    const menu = screen.getByRole('menu', { name: /account/i });
    expect(menu).toHaveTextContent(/strava connected/i);
    expect(screen.getByRole('menuitem', { name: /settings/i })).toBeVisible();
    expect(screen.getByRole('menuitem', { name: /sign out/i })).toBeVisible();
    // Appearance reflects the current choice as the pressed option.
    expect(screen.getByRole('button', { name: /dark/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'System' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('reports a theme change (menu stays open) and Settings (menu closes)', async () => {
    const props = setup();
    await userEvent.click(screen.getByRole('button', { name: /account/i }));

    // A theme choice does not close the menu.
    await userEvent.click(screen.getByRole('button', { name: 'System' }));
    expect(props.onSetTheme).toHaveBeenCalledWith('system');
    expect(screen.getByRole('menu')).toBeVisible();

    // A menuitem does close it.
    await userEvent.click(screen.getByRole('menuitem', { name: /settings/i }));
    expect(props.onOpenSettings).toHaveBeenCalled();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('reports Sign out', async () => {
    const props = setup();
    await userEvent.click(screen.getByRole('button', { name: /account/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: /sign out/i }));
    expect(props.onSignOut).toHaveBeenCalled();
  });

  it('closes on Escape', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: /account/i }));
    expect(screen.getByRole('menu')).toBeVisible();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
