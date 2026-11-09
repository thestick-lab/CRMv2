/* ---------------------------------------------------------------------------
 * Avatar initials — two named conventions, one implementation each.
 *
 * People and companies do not shorten the same way: a person called `Erik`
 * reads `ER` (the practice's established two-letter person avatar everywhere
 * from the topbar to deadline cards), while a company tile takes the initial
 * letters of its words (`Muse 1399 → M`, `A & L Contracting → AL`). Call sites
 * pick the convention by what the chip represents — never by guessing from the
 * string.
 * ------------------------------------------------------------------------- */

/** Person avatar: a single name yields its first two letters, otherwise the
 *  first letter of up to two words (`Erik → ER`, `Erik van Wyk → EV`). */
export function personInitials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 0) return '—';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words
    .slice(0, 2)
    .map((word) => word[0]!)
    .join('')
    .toUpperCase();
}

/** Entity avatar: first letters of up to two letter-bearing words, so a name
 *  with digits or ampersands still reads (`Muse 1399 → M`, `A & L Contracting → AL`). */
export function entityInitials(name: string): string {
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
