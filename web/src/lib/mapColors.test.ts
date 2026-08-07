import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { mapPalette, type Theme } from './mapColors.ts';
import { HEAT_RAMP, heatTierIndex } from './heat.ts';

// The palette is a hand-maintained mirror of the CSS theme tokens (the canvas
// can't read CSS vars). These tests fail if the two drift apart, and pin the
// behaviour that bit us: heat grading must follow the theme, not lag a toggle
// behind — and it inverts between light and dark.

// Tests run from web/ (npm run test), so index.css is at src/index.css.
const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

/** Body of a top-level CSS rule (no nested braces in these blocks). */
function block(selector: string): string {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = css.match(new RegExp(`${esc}\\s*\\{([^}]*)\\}`));
  if (!m || m[1] === undefined)
    throw new Error(`CSS block not found: ${selector}`);
  return m[1];
}

function tokenIn(body: string, name: string): string {
  const m = body.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})`));
  if (!m || m[1] === undefined) throw new Error(`token --${name} not found`);
  return m[1].toLowerCase();
}

/** Relative luminance (WCAG) of a #rrggbb colour — 0 = black, 1 = white. */
function relLum(hex: string): number {
  const h = hex.replace('#', '');
  const chan = (i: number) => parseInt(h.slice(i, i + 2), 16) / 255;
  const lin = (c: number) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  return 0.2126 * lin(chan(0)) + 0.7152 * lin(chan(2)) + 0.0722 * lin(chan(4));
}

const BLOCKS: Record<Theme, string> = {
  light: block(':root'),
  dark: block("[data-theme='dark']"),
};

describe('MAP_PALETTE mirrors the index.css theme tokens', () => {
  for (const theme of ['light', 'dark'] as const) {
    it(`${theme} palette equals the CSS tokens`, () => {
      const body = BLOCKS[theme];
      expect(mapPalette(theme)).toEqual({
        heat: tokenIn(body, 'heat'),
        match: tokenIn(body, 'match'),
        text: tokenIn(body, 'text'),
        sel: tokenIn(body, 'sel'),
        marker: tokenIn(body, 'marker'),
        halo: tokenIn(body, 'bg'),
      });
    });
  }
});

/** Concrete red-ramp colour a segment with `count` overlapping routes gets. */
function heatColor(theme: Theme, count: number): string {
  return HEAT_RAMP[theme][heatTierIndex(count, theme)]!.color;
}

describe('HEAT_RAMP grading inverts between themes (Strava-style)', () => {
  it('light: busier corridors get DARKER (deep red for the hottest)', () => {
    expect(relLum(heatColor('light', 99))).toBeLessThan(
      relLum(heatColor('light', 1))
    );
  });

  it('dark: busier corridors get LIGHTER (bright amber for the hottest)', () => {
    expect(relLum(heatColor('dark', 99))).toBeGreaterThan(
      relLum(heatColor('dark', 1))
    );
  });

  it('the hottest tier is opposite luminance in each theme (the inversion)', () => {
    // Dark map's hottest is far lighter than the light map's hottest.
    expect(relLum(heatColor('dark', 99))).toBeGreaterThan(
      relLum(heatColor('light', 99))
    );
  });
});
