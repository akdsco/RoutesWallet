import { useEffect, useMemo, useState } from 'react';
import { RouteMap } from './components/RouteMap.tsx';
import { SearchBar } from './components/SearchBar.tsx';
import { loadRoutes } from './lib/routes-data.ts';
import { geocode } from './lib/geocode.ts';
import { routesNear } from './lib/search.ts';
import { openLabel } from './lib/links.ts';
import type { Route } from './types.ts';

const RADIUS_KM = 25;

export function App() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [matches, setMatches] = useState<Route[] | null>(null);
  const [searchPoint, setSearchPoint] = useState<[number, number] | null>(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadRoutes()
      .then(setRoutes)
      .catch((e) => setStatus(String(e)));
  }, []);

  async function onSearch(query: string) {
    setBusy(true);
    setStatus('Searching…');
    try {
      const point = await geocode(query);
      if (!point) {
        setStatus(`Couldn't find "${query}".`);
        return;
      }
      const near = routesNear(point, routes, RADIUS_KM);
      setSearchPoint(point);
      setMatches(near);
      setStatus(
        near.length
          ? `${near.length} route${near.length > 1 ? 's' : ''} within ${RADIUS_KM} km of "${query}".`
          : `No routes within ${RADIUS_KM} km of "${query}" yet.`
      );
    } catch {
      setStatus('Search failed — check your connection.');
    } finally {
      setBusy(false);
    }
  }

  function onClear() {
    setMatches(null);
    setSearchPoint(null);
    setStatus('');
  }

  const shown = matches ?? routes;
  const highlightIds = useMemo(
    () => new Set(matches ? matches.map((r) => r.id) : []),
    [matches]
  );

  return (
    <div className="app">
      <header>
        <h1>RoutesWallet</h1>
        <SearchBar
          onSearch={onSearch}
          onClear={onClear}
          status={status}
          busy={busy}
        />
      </header>

      <RouteMap
        routes={routes}
        highlightIds={highlightIds}
        searchPoint={searchPoint}
      />

      <aside className="list">
        {shown.map((r) => (
          <a
            key={r.id}
            className="card"
            href={r.link}
            target="_blank"
            rel="noopener"
          >
            <span
              className={`badge ${r.source === 'HV-signed' ? 'hv' : 'third'}`}
            >
              {r.source}
            </span>
            <strong>{r.name}</strong>
            <span className="dist">{r.distance_km} km</span>
            <span className="open">{openLabel(r.link)}</span>
          </a>
        ))}
      </aside>
    </div>
  );
}
