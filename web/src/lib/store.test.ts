import { describe, it, expect, vi } from 'vitest';
import type { Feature, LineString } from 'geojson';
import {
  readAllFeatures,
  upsertFeatures,
  buildSeedSql,
  type D1Like,
  type D1PreparedLike,
} from './store.ts';

type F = Feature<LineString, Record<string, unknown> & { id: string }>;

const feat = (id: string, owner?: string, name = id): F => ({
  type: 'Feature',
  properties: { id, name, owner_strava_id: owner },
  geometry: {
    type: 'LineString',
    coordinates: [
      [0, 0],
      [1, 1],
    ],
  },
});

/** A tiny in-memory stand-in for D1 that models upsert-by-id + select. */
class FakeD1 implements D1Like {
  rows = new Map<string, { owner: string | null; feature: string }>();
  prepare(sql: string): D1PreparedLike {
    return this.stmt(sql, []);
  }
  private stmt(sql: string, args: unknown[]): D1PreparedLike {
    const db = this;
    return {
      bind: (...v: unknown[]) => db.stmt(sql, v),
      run: async () => {
        if (/^INSERT/i.test(sql)) {
          const [id, owner, feature] = args as [string, string | null, string];
          db.rows.set(id, { owner, feature });
        }
        return {};
      },
      all: async () => ({
        results: [...db.rows.values()].map((r) => ({ feature: r.feature })),
      }),
    } as D1PreparedLike;
  }
}

describe('store: upsertFeatures / readAllFeatures', () => {
  it('writes features and reads them back as a FeatureCollection', async () => {
    const db = new FakeD1();
    const n = await upsertFeatures(db, [feat('a'), feat('b')]);
    expect(n).toBe(2);
    const fc = await readAllFeatures(db);
    expect(fc.type).toBe('FeatureCollection');
    expect(
      fc.features.map((f) => (f.properties as { id: string }).id).sort()
    ).toEqual(['a', 'b']);
  });

  it('upserts on id_str — re-submitting the same route replaces, never duplicates', async () => {
    const db = new FakeD1();
    await upsertFeatures(db, [feat('x', '7', 'Old name')]);
    await upsertFeatures(db, [feat('x', '7', 'New name')]);
    const fc = await readAllFeatures(db);
    expect(fc.features).toHaveLength(1);
    expect((fc.features[0]!.properties as { name: string }).name).toBe(
      'New name'
    );
  });

  it('skips a feature with no usable id rather than writing a junk row', async () => {
    const db = new FakeD1();
    const bad = { ...feat('') };
    const n = await upsertFeatures(db, [bad, feat('ok')]);
    expect(n).toBe(1);
    expect((await readAllFeatures(db)).features).toHaveLength(1);
  });

  it('skips an unparseable stored row without blanking the whole pool', async () => {
    const db = new FakeD1();
    db.rows.set('good', { owner: null, feature: JSON.stringify(feat('good')) });
    db.rows.set('bad', { owner: null, feature: '{ not json' });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fc = await readAllFeatures(db);
    expect(fc.features.map((f) => (f.properties as { id: string }).id)).toEqual(
      ['good']
    );
    expect(spy).toHaveBeenCalled(); // the skip is observable, not silent
    spy.mockRestore();
  });
});

describe('store: buildSeedSql', () => {
  it('emits one INSERT OR REPLACE per feature, escaping quotes safely', async () => {
    const sql = buildSeedSql([feat('a'), feat('b')]);
    expect(sql.match(/INSERT OR REPLACE INTO routes/g)).toHaveLength(2);
    // A single quote in the JSON must be doubled so it can't break the statement.
    const withQuote = buildSeedSql([feat('id', undefined, "O'Brien")]);
    expect(withQuote).toContain("O''Brien");
    expect(withQuote).not.toContain("O'Brien"); // the raw, unescaped form is gone
  });
});
