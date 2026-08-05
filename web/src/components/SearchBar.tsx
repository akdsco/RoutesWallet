import { useState, type FormEvent } from 'react';

type Props = {
  onSearch: (query: string) => void;
  onClear: () => void;
  status: string;
  busy: boolean;
};

export function SearchBar({ onSearch, onClear, status, busy }: Props) {
  const [q, setQ] = useState('');

  function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    if (trimmed) onSearch(trimmed);
  }

  return (
    <form className="searchbar" onSubmit={submit}>
      <input
        aria-label="Search routes near a place"
        placeholder="Routes near… e.g. Girona"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <button type="submit" disabled={busy}>
        Search
      </button>
      <button
        type="button"
        onClick={() => {
          setQ('');
          onClear();
        }}
      >
        Clear
      </button>
      {status && <span className="status">{status}</span>}
    </form>
  );
}
