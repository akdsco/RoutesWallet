import { describe, it, expect } from 'vitest';
import { escapeHtml, safeHref } from './sanitize.ts';

describe('escapeHtml', () => {
  it('neutralises HTML-significant characters', () => {
    expect(escapeHtml('<img src=x onerror=alert(1)>')).toBe(
      '&lt;img src=x onerror=alert(1)&gt;'
    );
    expect(escapeHtml(`a & b "c" 'd'`)).toBe(
      'a &amp; b &quot;c&quot; &#39;d&#39;'
    );
  });
  it('leaves plain text untouched', () => {
    expect(escapeHtml('The Hub Cafe')).toBe('The Hub Cafe');
  });
});

describe('safeHref', () => {
  it('allows http(s) links unchanged', () => {
    expect(safeHref('https://www.strava.com/routes/123')).toBe(
      'https://www.strava.com/routes/123'
    );
    expect(safeHref('http://ridewithgps.com/x')).toBe(
      'http://ridewithgps.com/x'
    );
    expect(safeHref('HTTPS://X')).toBe('HTTPS://X');
  });
  it('blocks javascript: and data: URLs', () => {
    expect(safeHref('javascript:alert(document.domain)')).toBe('#');
    expect(safeHref('  javascript:alert(1)')).toBe('#');
    expect(safeHref('data:text/html,<script>alert(1)</script>')).toBe('#');
    expect(safeHref('vbscript:msgbox(1)')).toBe('#');
  });
  it('returns # for a malformed absolute URL (throws)', () => {
    expect(safeHref('http://')).toBe('#');
  });
});
