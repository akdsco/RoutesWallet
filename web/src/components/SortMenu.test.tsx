import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SortMenu } from './SortMenu.tsx';

function open(props: Partial<Parameters<typeof SortMenu>[0]> = {}) {
  const onPick = vi.fn();
  render(
    <SortMenu
      value="name-az"
      hasSearch={false}
      hasElevation={true}
      onPick={onPick}
      {...props}
    />
  );
  return { onPick };
}

describe('SortMenu', () => {
  it('the trigger is a menu button that reflects the current sort', () => {
    open();
    const trigger = screen.getByRole('button', { name: /sort:/i });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens a radio menu with the active option checked', async () => {
    const user = userEvent.setup();
    open({ value: 'distance-asc' });
    await user.click(screen.getByRole('button', { name: /sort:/i }));
    const menu = screen.getByRole('menu', { name: /sort routes/i });
    const checked = within(menu).getByRole('menuitemradio', { checked: true });
    expect(checked).toHaveTextContent(/distance, short/i);
  });

  it('disables Nearest first with a hint when there is no search', async () => {
    const user = userEvent.setup();
    const { onPick } = open({ hasSearch: false });
    await user.click(screen.getByRole('button', { name: /sort:/i }));
    const nearest = screen.getByRole('menuitemradio', {
      name: /nearest first/i,
    });
    expect(nearest).toHaveAttribute('aria-disabled', 'true');
    expect(nearest).toHaveTextContent(/needs a place/i);
    await user.click(nearest);
    expect(onPick).not.toHaveBeenCalled();
  });

  it('enables Nearest first when a search is active', async () => {
    const user = userEvent.setup();
    const { onPick } = open({ hasSearch: true });
    await user.click(screen.getByRole('button', { name: /sort:/i }));
    await user.click(
      screen.getByRole('menuitemradio', { name: /nearest first/i })
    );
    expect(onPick).toHaveBeenCalledWith('nearest');
  });

  it('arrow-nav skips the disabled Nearest option', async () => {
    const user = userEvent.setup();
    open({ hasSearch: false, value: 'distance-asc' });
    await user.click(screen.getByRole('button', { name: /sort:/i }));
    // focus opens on the active option (Distance ↑, index 1); ArrowUp must wrap
    // PAST the disabled Nearest (index 0) to the last option, never onto it.
    await user.keyboard('{ArrowUp}');
    expect(document.activeElement).toHaveTextContent(/hilliest/i);
  });

  it('Esc closes the menu and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    open();
    const trigger = screen.getByRole('button', { name: /sort:/i });
    await user.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
  });

  it('picking an option reports its key', async () => {
    const user = userEvent.setup();
    const { onPick } = open();
    await user.click(screen.getByRole('button', { name: /sort:/i }));
    await user.click(
      screen.getByRole('menuitemradio', { name: /distance, long/i })
    );
    expect(onPick).toHaveBeenCalledWith('distance-desc');
  });
});
