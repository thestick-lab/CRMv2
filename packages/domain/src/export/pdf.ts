// The estimate as an A4 landscape PDF, drawn like the printed Estimation tab: logo, heading block,
// red rule, month columns, grouped lines with subtotals, the black total band, annual figures and notes.
// Like Excel's "fit to one page", a long estimate is scaled down to fit.
import { PDFDocument, StandardFonts, concatTransformationMatrix, popGraphicsState, pushGraphicsState, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { LOGO_HEIGHT, LOGO_WIDTH, logoPng } from './logo';
import { money, type ClientSheet } from './sheet';

const hex = (h: string) => rgb(parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255);
const INK = hex('1D1D1B');
const RED = hex('C5161D');
const NOTE = hex('404040');
const BAND = hex('F2F2F2');
const AVG = hex('D9D9D9');
const WHITE = rgb(1, 1, 1);

const PAGE_W = 841.89;
const PAGE_H = 595.28;
const MARGIN_X = 28.8; // 0.4 inch, as the workbook's print setup
const MARGIN_Y = 36; // 0.5 inch
const W = PAGE_W - 2 * MARGIN_X;
const LABEL_W = 206;
const TOTAL_W = 56;
const MONTH_W = (W - LABEL_W - TOTAL_W) / 12;
const ROW_H = 12.6;
const SIZE = 7.8;
const PAD = 3;

export async function estimatePdf(sheet: ClientSheet, createdOn = new Date()): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const title = `Fee estimate, ${sheet.preparedFor.replace(/^Prepared for: /, '')}`;
  doc.setTitle(title);
  doc.setAuthor('FD on Call');
  doc.setCreator('FD on Call practice system');
  doc.setProducer('FD on Call practice system');
  doc.setCreationDate(createdOn);
  doc.setModificationDate(createdOn);

  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const logo = await doc.embedPng(logoPng());
  const page = doc.addPage([PAGE_W, PAGE_H]);

  // Measure first: heading block, table and notes at full size.
  const logoW = 161;
  const logoH = (logoW * LOGO_HEIGHT) / LOGO_WIDTH;
  const headBlock = logoH + 14 + 18 + 13 + 13 + 8 + 24;
  const tableH = sheet.rows.length * ROW_H;
  const noteSize = 7;
  const noteLines = sheet.notes.map((n) => wrap(clean(n, regular), regular, noteSize, W));
  const notesH = 16 + 12 + noteLines.reduce((a, l) => a + l.length * 9 + 5, 0);
  const contentH = headBlock + tableH + notesH;
  const avail = PAGE_H - 2 * MARGIN_Y;
  const scale = Math.min(1, avail / contentH);

  // Draw in an unscaled coordinate system, scaled and centred on the page.
  page.pushOperators(pushGraphicsState());
  const tx = (PAGE_W - W * scale) / 2;
  const ty = PAGE_H - MARGIN_Y;
  page.pushOperators(concatTransformationMatrix(scale, 0, 0, scale, tx, ty));
  // From here, x runs 0..W and y runs downwards as negative numbers from the top margin.
  const d = new Drawer(page, regular, bold);

  let y = 0;
  page.drawImage(logo, { x: 0, y: y - logoH, width: logoW, height: logoH });
  y -= logoH + 14;
  d.text(sheet.title, 0, y - 13, 14, true);
  y -= 18;
  d.text(sheet.preparedFor, 0, y - 10, 9.2, true);
  d.textRight(sheet.dateLabel, W, y - 10, 8.2, false);
  y -= 13;
  d.text(sheet.periodLabel, 0, y - 10, 8.2, false);
  d.textRight(sheet.amountsLabel, W, y - 10, 8.2, true);
  y -= 13 + 8;
  d.line(0, y, W, y, 1.4, RED);

  // Column headings: month over year, right aligned
  const colX = (k: number) => LABEL_W + k * MONTH_W; // left edge of month column k
  const head = y - 24;
  d.text('Service', 0, head + 3, SIZE, true);
  sheet.monthHeads.forEach(([m, yr], k) => {
    const right = colX(k) + MONTH_W - PAD;
    d.textRight(m, right, head + 12, SIZE, true);
    d.textRight(yr, right, head + 3, SIZE, true);
  });
  d.textRight('Total', W - PAD, head + 3, SIZE, true);
  d.line(0, head, W, head, 0.6, RED);
  y = head;

  for (const row of sheet.rows) {
    const top = y;
    const bottom = y - ROW_H;
    const base = bottom + 3.6;
    const amounts = row.amounts ?? [];
    switch (row.kind) {
      case 'H':
        d.rect(0, bottom, W, ROW_H, BAND);
        d.text(row.label, PAD, base, SIZE, true);
        break;
      case 'L':
        d.text(d.fit(row.label, LABEL_W - 12, SIZE, false), 10, base, SIZE, false);
        amounts.forEach((a, k) => d.textRight(money(a), colX(k) + MONTH_W - PAD, base, SIZE, false));
        d.textRight(money(row.total ?? 0), W - PAD, base, SIZE, true);
        break;
      case 'S':
        d.line(0, top, W, top, 0.6, INK);
        d.text(row.label, PAD, base, SIZE, true);
        amounts.forEach((a, k) => d.textRight(money(a), colX(k) + MONTH_W - PAD, base, SIZE, true));
        d.textRight(money(row.total ?? 0), W - PAD, base, SIZE, true);
        break;
      case 'T':
        d.rect(0, bottom, W, ROW_H, INK);
        d.text(row.label, PAD, base, SIZE, true, WHITE);
        amounts.forEach((a, k) => d.textRight(money(a), colX(k) + MONTH_W - PAD, base, SIZE, true, WHITE));
        d.textRight(money(row.total ?? 0), W - PAD, base, SIZE, true, WHITE);
        break;
      case 'KA':
        d.rect(0, bottom, W, ROW_H, AVG);
        d.text(row.label, PAD, base, SIZE, true);
        d.textRight(money(row.total ?? 0), W - PAD, base, SIZE, true);
        break;
      case 'K':
        d.text(row.label, PAD, base, SIZE, false);
        d.textRight(money(row.total ?? 0), W - PAD, base, SIZE, false);
        break;
      case 'KT':
        d.line(0, top, W, top, 0.6, INK);
        d.text(row.label, PAD, base, SIZE, true);
        d.textRight(money(row.total ?? 0), W - PAD, base, SIZE, true);
        break;
      case 'B':
        break;
    }
    y = bottom;
  }

  y -= 16;
  d.text('Notes', 0, y - 8, 8, true);
  y -= 12;
  for (const lines of noteLines) {
    for (const l of lines) {
      y -= 9;
      d.text(l, 0, y, noteSize, false, NOTE, true);
    }
    y -= 5;
  }

  page.pushOperators(popGraphicsState());
  return doc.save();
}

/** Text drawing in the scaled frame, with Helvetica-safe characters. */
class Drawer {
  constructor(
    private page: PDFPage,
    private regular: PDFFont,
    private bold: PDFFont,
  ) {}
  font(isBold: boolean) {
    return isBold ? this.bold : this.regular;
  }
  text(s: string, x: number, y: number, size: number, isBold: boolean, color = INK, cleaned = false) {
    const f = this.font(isBold);
    this.page.drawText(cleaned ? s : clean(s, f), { x, y, size, font: f, color });
  }
  textRight(s: string, right: number, y: number, size: number, isBold: boolean, color = INK) {
    const f = this.font(isBold);
    const t = clean(s, f);
    this.page.drawText(t, { x: right - f.widthOfTextAtSize(t, size), y, size, font: f, color });
  }
  /** Shorten a label that would run into the first month column. */
  fit(s: string, width: number, size: number, isBold: boolean): string {
    const f = this.font(isBold);
    let t = clean(s, f);
    if (f.widthOfTextAtSize(t, size) <= width) return t;
    while (t.length > 1 && f.widthOfTextAtSize(`${t}…`, size) > width) t = t.slice(0, -1);
    return `${t.trimEnd()}…`;
  }
  rect(x: number, y: number, w: number, h: number, color: ReturnType<typeof rgb>) {
    this.page.drawRectangle({ x, y, width: w, height: h, color });
  }
  line(x1: number, y1: number, x2: number, y2: number, thickness: number, color: ReturnType<typeof rgb>) {
    this.page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness, color });
  }
}

/** Keep only characters the standard PDF fonts can show. */
function clean(s: string, f: PDFFont): string {
  const ok = new Set(f.getCharacterSet());
  const map: Record<string, string> = { '−': '-', ' ': ' ', ' ': ' ', ' ': ' ' };
  return [...s].map((ch) => (ok.has(ch.codePointAt(0)!) ? ch : map[ch] ?? '')).join('');
}

function wrap(s: string, f: PDFFont, size: number, width: number): string[] {
  const words = s.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (f.widthOfTextAtSize(next, size) > width && cur) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}
