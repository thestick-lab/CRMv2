// Writes sample exports for checking: bun scripts/sample-exports.ts <outdir>
import { computeEstimate, suggestedMonths, type EstimateInput } from '../src/domain/estimate';
import { xeroPlanFee } from '../src/domain/pricing';
import { clientSheet } from '../src/export/sheet';
import { estimateXlsx } from '../src/export/xlsx';
import { estimatePdf } from '../src/export/pdf';

const out = process.argv[2] ?? '.';
const input: EstimateInput = {
  startMonth: '2026-11',
  entityType: 'Company',
  yearEndMonth: 2,
  vatCategory: 'B',
  turnover: 4_000_000,
  payroll: true,
  employeeCount: 8,
  provisionalTaxpayer: false,
  directors: 2,
  rate: 625,
  marchIncreasePct: 6,
  irp6Payable: true,
  selected: { DIR_ITR12: true, DIR_IRP6: true, BO: true, REVIEW: true },
  hours: { BOOKKEEPING: 4, PAYROLL: 0.75, MGMT: 0, AFS: 16, REVIEW: 4 },
  months: suggestedMonths({ entityType: 'Company', yearEndMonth: 2 }),
  recharges: { XERO: xeroPlanFee('Starter'), SIMPLEPAY: 235.5 },
};
const est = computeEstimate(input);
const when = new Date('2026-10-29T10:00:00Z');
for (const mode of ['incl', 'excl'] as const) {
  const sheet = clientSheet(est, { clientName: 'Nova Engineering (Pty) Ltd', asOf: '2026-10-29', mode, vatCategory: 'B', marchIncreasePct: 6 });
  await Bun.write(`${out}/${sheet.fileName}.xlsx`, estimateXlsx(sheet, when));
  await Bun.write(`${out}/${sheet.fileName}.pdf`, await estimatePdf(sheet, when));
  console.log(sheet.fileName, sheet.rows.length, 'rows');
}
// A long one: every service ticked
const all = computeEstimate({ ...input, selected: { ...input.selected, MGMT: true, COIDA: true, ITREG: true, CIPC_REG: true }, hours: { ...input.hours, MGMT: 3 } });
const big = clientSheet(all, { clientName: 'Everything Ticked Trading (Pty) Ltd', asOf: '2026-10-29', mode: 'incl', vatCategory: 'B', marchIncreasePct: 6 });
await Bun.write(`${out}/long.pdf`, await estimatePdf(big, when));
await Bun.write(`${out}/long.xlsx`, estimateXlsx(big, when));
