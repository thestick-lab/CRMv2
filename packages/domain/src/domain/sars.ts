import type { ISODate } from './dates';

/**
 * SARS filing season deadlines by tax year (the year of assessment ending in February).
 * Announced each year by SARS; add the new season when it is published.
 */
export interface FilingSeason {
  taxYear: number;
  nonProvisional: ISODate;
  provisional: ISODate;
  trusts: ISODate;
  source: string;
  sourceUrl: string;
}

export const FILING_SEASONS: FilingSeason[] = [
  {
    taxYear: 2025,
    nonProvisional: '2025-10-20',
    provisional: '2026-01-19',
    trusts: '2026-01-19',
    source: 'SARS, Filing season 2025 dates (trusts taken as the provisional deadline)',
    sourceUrl: 'https://www.sars.gov.za/latest-news/filing-season-2025-dates/',
  },
  {
    taxYear: 2026,
    nonProvisional: '2026-10-23',
    provisional: '2027-01-22',
    trusts: '2027-01-22',
    source: 'SARS, Changes for filing season 2026',
    sourceUrl: 'https://www.sars.gov.za/latest-news/changes-for-filing-season-2026/',
  },
];

export function filingSeason(taxYear: number): FilingSeason | undefined {
  return FILING_SEASONS.find((s) => s.taxYear === taxYear);
}

export const FIRST_LOADED_SEASON = Math.min(...FILING_SEASONS.map((s) => s.taxYear));
