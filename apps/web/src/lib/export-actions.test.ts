import { describe, expect, it } from 'vitest';
import { generateExcelQuoteBytes, generatePdfQuoteBytes } from './export-actions';
import { buildEstimateForClient } from '@/components/client-show/tabs/EstimateTab';
import { CLIENTS } from 'fdoncall-practice/data/seed';

describe('Client-side PDF and Excel export generation', () => {
  const muse = CLIENTS.find((c) => c.code === 'MUS-875')!;
  const est = buildEstimateForClient(muse, '2026-12');
  const asOf = '2026-11-07';

  it('generates valid client-side PDF quote bytes', async () => {
    const pdfBytes = await generatePdfQuoteBytes(muse, est, asOf);
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1000);

    // Verify PDF header magic bytes "%PDF" (0x25, 0x50, 0x44, 0x46)
    const header = String.fromCharCode(...pdfBytes.slice(0, 4));
    expect(header).toBe('%PDF');
  });

  it('generates valid client-side Excel (.xlsx) quote bytes', () => {
    const xlsxBytes = generateExcelQuoteBytes(muse, est, asOf);
    expect(xlsxBytes).toBeInstanceOf(Uint8Array);
    expect(xlsxBytes.length).toBeGreaterThan(1000);

    // Verify ZIP magic bytes "PK\x03\x04"
    expect(xlsxBytes[0]).toBe(0x50); // P
    expect(xlsxBytes[1]).toBe(0x4b); // K
    expect(xlsxBytes[2]).toBe(0x03);
    expect(xlsxBytes[3]).toBe(0x04);
  });
});
