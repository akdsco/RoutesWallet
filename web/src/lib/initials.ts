/** Two-letter initials: first letters of the first two words, else first two chars. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters =
    words.length >= 2
      ? words[0]![0]! + words[1]![0]!
      : (words[0] ?? '').slice(0, 2);
  return letters.toUpperCase();
}
