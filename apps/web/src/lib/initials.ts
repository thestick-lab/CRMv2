/* ---------------------------------------------------------------------------
 * Avatar initials, one implementation for every chip in the app.
 * ------------------------------------------------------------------------- */

/**
 * First letters of up to two letter-bearing words: `Muse 1399 → M`,
 * `A & L Contracting → AL`. A name with no letters renders the em dash.
 */
export function initialsFor(name: string): string {
  const words = name
    .split(/\s+/)
    .map((word) => word.replace(/[^A-Za-z]/g, ''))
    .filter((word) => word.length > 0);
  if (words.length === 0) return '—';
  return words
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join('');
}
