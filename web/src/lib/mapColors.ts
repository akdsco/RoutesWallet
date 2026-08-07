/**
 * Concrete colours for the canvas- and JS-drawn map layers (heat corridors,
 * matched/active route lines, search marker), keyed by theme.
 *
 * Why not read the CSS tokens? Two reasons:
 *   1. The heat layer draws on a <canvas>, which can't reference CSS var()s.
 *   2. Reading getComputedStyle(document.documentElement) inside the draw effect
 *      RACES next-themes' data-theme write — on a toggle the effect runs with the
 *      theme prop already flipped but the DOM attribute not yet updated, so the
 *      layer gets the PREVIOUS theme's colours (one toggle behind, looking
 *      inverted). Resolving from the `theme` prop through this table is immune.
 *
 * This table MUST mirror the --heat / --match / --text / --sel / --marker / --bg
 * tokens in index.css — mapColors.test.ts fails if they drift apart.
 */
export type Theme = 'light' | 'dark';

export type MapPalette = {
  heat: string; // faint corridors (low overlap)
  match: string; // busier corridors / matched lines
  text: string; // hottest corridors (max overlap)
  sel: string; // selected / active route
  marker: string; // search marker + radius
  halo: string; // line halo — the page background (--bg)
};

export const MAP_PALETTE: Record<Theme, MapPalette> = {
  light: {
    heat: '#5d6e7b',
    match: '#33414d',
    text: '#12171a',
    sel: '#1f6feb',
    marker: '#b4451f',
    halo: '#f2f4f5',
  },
  dark: {
    heat: '#8fa3b0',
    match: '#c6d1d8',
    text: '#e9eef1',
    sel: '#4d9bff',
    marker: '#e8794e',
    halo: '#0b0e10',
  },
};

export function mapPalette(theme: Theme): MapPalette {
  return MAP_PALETTE[theme];
}
