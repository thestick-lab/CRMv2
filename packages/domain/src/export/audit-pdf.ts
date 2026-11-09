// Read-only practice records exported as a printable A4 landscape table: the
// governance audit log uses it, and any future register can reuse the same
// pagination, hairline rows and FD on Call masthead.
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { LOGO_HEIGHT, LOGO_WIDTH, logoPng } from './logo';

const hex = (h: string) => rgb(parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255);
const INK = hex('1D1D1B');
const RED = hex('C5161D');
const NOTE = hex('595959');
const BAND = hex('F2F2F2');
const HAIRLINE = hex('D9D9D9');

const PAGE_W = 841.89;
const PAGE_H = 595.28;
const MARGIN = 36;
const CONTENT_W = PAGE_W - 2 * MARGIN;
const HEADER_H = 58;
const COL_HEAD_H = 18;
const ROW_H = 15;
const SIZE = 7.8;

export interface AuditPdfColumn {
  label: string;
  /** Relative width; the columns are scaled to the page together. */
  width: number;
  /** Draw with Courier, for reference numbers and timestamps. */
  mono?: boolean;
}

export interface AuditPdfTable {
  title: string;
  subtitle: string;
  columns: AuditPdfColumn[];
  /** One string per cell; long values are shortened to the column. */
  rows: string[][];
}

/**
 * Render a table as a printable PDF, repeating the masthead and column
 * headings on every page and stamping page numbers at the foot.
 */
export async function auditLogPdf(table: AuditPdfTable, createdOn = new Date()): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(table.title);
  doc.setAuthor('FD on Call');
  doc.setCreator('FD on Call practice system');
  doc.setProducer('FD on Call practice system');
  doc.setCreationDate(createdOn);
  doc.setModificationDate(createdOn);

  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const mono = await doc.embedFont(StandardFonts.Courier);
  const logo = await doc.embedPng(logoPng());

  // Normalise the declared widths onto the printable width.
  const declared = table.columns.reduce((sum, column) => sum + column.width, 0) || 1;
  const widths = table.columns.map((column) => (column.width / declared) * CONTENT_W);
  const lefts = widths.map((_, index) => MARGIN + widths.slice(0, index).reduce((a, w) => a + w, 0));

  const rowsPerPage = Math.max(1, Math.floor((PAGE_H - MARGIN - MARGIN - HEADER_H - COL_HEAD_H - 20) / ROW_H));
  const pageCount = Math.max(1, Math.ceil(table.rows.length / rowsPerPage));
  const pages: PDFPage[] = [];

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
    const page = doc.addPage([PAGE_W, PAGE_H]);
    pages.push(page);
    let y = PAGE_H - MARGIN;

    const logoW = 96;
    const logoH = (logoW * LOGO_HEIGHT) / LOGO_WIDTH;
    page.drawImage(logo, { x: MARGIN, y: y - logoH, width: logoW, height: logoH });

    const textX = MARGIN + logoW + 20;
    page.drawText(clean(table.title, bold), {
      x: textX,
      y: y - 16,
      size: 15,
      font: bold,
      color: INK,
    });
    page.drawText(clean(table.subtitle, regular), {
      x: textX,
      y: y - 30,
      size: 8,
      font: regular,
      color: NOTE,
    });
    page.drawText(clean(`Generated ${createdOn.toISOString().slice(0, 10)} · FD on Call`, regular), {
      x: textX,
      y: y - 41,
      size: 7.2,
      font: regular,
      color: NOTE,
    });

    y -= logoH + 14;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 1.2, color: RED });
    y -= COL_HEAD_H;

    page.drawRectangle({ x: MARGIN, y, width: CONTENT_W, height: COL_HEAD_H, color: BAND });
    table.columns.forEach((column, index) => {
      page.drawText(clean(column.label.toUpperCase(), bold), {
        x: lefts[index] + 4,
        y: y + 6,
        size: 6.8,
        font: bold,
        color: NOTE,
      });
    });

    const slice = table.rows.slice(pageIndex * rowsPerPage, (pageIndex + 1) * rowsPerPage);
    slice.forEach((row, rowIndex) => {
      const rowTop = y - rowIndex * ROW_H;
      const baseline = rowTop - ROW_H + 4.6;
      const zebra = rowIndex % 2 === 1;
      if (zebra) {
        page.drawRectangle({
          x: MARGIN,
          y: rowTop - ROW_H,
          width: CONTENT_W,
          height: ROW_H,
          color: hex('FAFAF9'),
        });
      }
      table.columns.forEach((column, index) => {
        const value = row[index] ?? '';
        if (!value) return;
        const font = column.mono ? mono : regular;
        const text = fit(value, font, SIZE, widths[index] - 8);
        page.drawText(text, { x: lefts[index] + 4, y: baseline, size: SIZE, font, color: INK });
      });
      page.drawLine({
        start: { x: MARGIN, y: rowTop - ROW_H },
        end: { x: PAGE_W - MARGIN, y: rowTop - ROW_H },
        thickness: 0.4,
        color: HAIRLINE,
      });
    });
  }

  pages.forEach((page, index) => {
    page.drawText(clean(table.title, regular), {
      x: MARGIN,
      y: MARGIN - 18,
      size: 7,
      font: regular,
      color: NOTE,
    });
    const label = `Page ${index + 1} of ${pages.length}`;
    page.drawText(label, {
      x: PAGE_W - MARGIN - regular.widthOfTextAtSize(label, 7),
      y: MARGIN - 18,
      size: 7,
      font: regular,
      color: NOTE,
    });
  });

  return doc.save();
}

/** Keep only characters the standard PDF fonts can show. */
function clean(s: string, font: PDFFont): string {
  const ok = new Set(font.getCharacterSet());
  const map: Record<string, string> = { '−': '-', '–': '-', '—': '-', '’': "'", '‘': "'", '“': '"', '”': '"', '·': '-', ' ': ' ' };
  return [...s].map((ch) => (ok.has(ch.codePointAt(0)!) ? ch : map[ch] ?? '')).join('');
}

function fit(s: string, font: PDFFont, size: number, width: number): string {
  const text = clean(s, font);
  if (font.widthOfTextAtSize(text, size) <= width) return text;
  let cut = text;
  while (cut.length > 1 && font.widthOfTextAtSize(`${cut}...`, size) > width) cut = cut.slice(0, -1);
  return `${cut.trimEnd()}...`;
}
