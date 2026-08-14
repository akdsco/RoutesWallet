import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BottomSheet } from './BottomSheet.tsx';
import { DETAIL_PX, type Snap } from '../lib/sheet.ts';

const SEL: Snap[] = ['detail', 'mid', 'full'];

function renderSheet(props: Partial<Parameters<typeof BottomSheet>[0]> = {}) {
  return render(
    <BottomSheet
      snap="detail"
      snaps={SEL}
      vh={800}
      onSnapChange={() => {}}
      {...props}
    >
      <div>content</div>
    </BottomSheet>
  );
}

describe('BottomSheet — content-fit detail snap (§H)', () => {
  it('rests the detail snap at the content-fit height when detailPx is given', () => {
    renderSheet({ detailPx: 300 });
    // rests at translateY(vh − detailPx) = 800 − 300 = 500
    expect(screen.getByRole('dialog').style.transform).toBe(
      'translateY(500px)'
    );
  });

  it('falls back to the fixed detail height when detailPx is absent', () => {
    renderSheet();
    expect(screen.getByRole('dialog').style.transform).toBe(
      `translateY(${800 - DETAIL_PX}px)`
    );
  });
});
