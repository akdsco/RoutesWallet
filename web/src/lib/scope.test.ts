import { describe, it, expect } from 'vitest';
import type { Route } from '../types.ts';
import { scopeRoutes } from './scope.ts';

const route = (id: string, owner?: string): Route =>
  ({ id, owner_strava_id: owner }) as Route;

const routes = [route('a', '9'), route('b', '42'), route('c'), route('d', '9')];

describe('scopeRoutes', () => {
  it('returns every route (unchanged) when no owner is scoped to', () => {
    expect(scopeRoutes(routes, null)).toBe(routes);
  });

  it("keeps only the given owner's routes when scoped to them", () => {
    expect(scopeRoutes(routes, '9').map((r) => r.id)).toEqual(['a', 'd']);
  });

  it('excludes routes with no owner when scoping to a member', () => {
    expect(scopeRoutes(routes, '42').map((r) => r.id)).toEqual(['b']);
    expect(scopeRoutes(routes, 'nobody')).toEqual([]);
  });
});
