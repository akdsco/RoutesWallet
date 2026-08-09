import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Legend } from './Legend.tsx';

// The legend's look is verified by eye; the one bit of logic worth locking is
// which key-set it shows per mode — idle keys the heat gradient, search keys the
// matched-route + radius. renderToStaticMarkup needs no DOM lib (react-dom only).
describe('Legend', () => {
  it('idle mode keys the heat gradient, not the search keys', () => {
    const html = renderToStaticMarkup(
      <Legend searching={false} locked={false} theme="light" />
    );
    expect(html).toContain('1 → many rides');
    expect(html).toContain('selected');
    expect(html).not.toContain('matched route');
    expect(html).not.toContain('25 km radius');
  });

  it('search mode keys the matched route + radius, not the heat gradient', () => {
    const html = renderToStaticMarkup(
      <Legend searching locked={false} theme="light" />
    );
    expect(html).toContain('matched route');
    expect(html).toContain('25 km radius');
    expect(html).toContain('selected');
    expect(html).not.toContain('1 → many rides');
  });

  it('relabels the first key while a route is selected (§E)', () => {
    const idle = renderToStaticMarkup(
      <Legend searching={false} locked theme="light" />
    );
    expect(idle).toContain('all rides');
    expect(idle).not.toContain('1 → many rides');

    const searching = renderToStaticMarkup(
      <Legend searching locked theme="light" />
    );
    expect(searching).toContain('other matches');
    expect(searching).not.toContain('matched route');
  });
});
