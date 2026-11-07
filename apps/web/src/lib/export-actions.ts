import type { Client } from 'fdoncall-practice/domain/types';
import type { Estimate } from 'fdoncall-practice/domain/estimate';
import { clientSheet } from 'fdoncall-practice/export/sheet';
import { estimatePdf } from 'fdoncall-practice/export/pdf';
import { estimateXlsx } from 'fdoncall-practice/export/xlsx';
import { offerDownload } from 'fdoncall-practice/ui/download';

export function getClientSheet(client: Client, est: Estimate, asOf: string) {
  return clientSheet(est, {
    clientName: client.name,
    asOf,
    mode: 'excl',
    vatCategory: client.vatCategory,
    marchIncreasePct: 6,
  });
}

export async function generatePdfQuoteBytes(
  client: Client,
  est: Estimate,
  asOf: string
): Promise<Uint8Array> {
  const sheet = getClientSheet(client, est, asOf);
  return await estimatePdf(sheet);
}

export function generateExcelQuoteBytes(
  client: Client,
  est: Estimate,
  asOf: string
): Uint8Array {
  const sheet = getClientSheet(client, est, asOf);
  return estimateXlsx(sheet);
}

export async function downloadPdfQuote(
  client: Client,
  est: Estimate,
  asOf: string
): Promise<void> {
  const sheet = getClientSheet(client, est, asOf);
  const bytes = await estimatePdf(sheet);
  await offerDownload(`${sheet.fileName}.pdf`, bytes, 'application/pdf');
}

export async function downloadExcelQuote(
  client: Client,
  est: Estimate,
  asOf: string
): Promise<void> {
  const sheet = getClientSheet(client, est, asOf);
  const bytes = estimateXlsx(sheet);
  await offerDownload(
    `${sheet.fileName}.xlsx`,
    bytes,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
}
