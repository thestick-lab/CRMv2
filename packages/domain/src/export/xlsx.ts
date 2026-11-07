// The estimate as an Excel workbook with one sheet, "Estimation", laid out and styled like the
// Estimation tab of the fee estimate workbook: same columns (C to P, A and B hidden), fonts,
// colours, number format, frozen panes and landscape A4 print setup. Totals are live formulas.
import { LOGO_HEIGHT, LOGO_WIDTH, logoPng } from './logo';
import type { ClientSheet, SheetRow } from './sheet';
import { zip } from './zip';

const cents = (x: number) => Math.round(x * 100 + (x >= 0 ? 1e-6 : -1e-6)) / 100;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Column letters: C is the service, D to O the twelve months, P the total. */
const COL = (k: number) => String.fromCharCode(65 + k);
const LABEL = 'C';
const MONTH_COLS = Array.from({ length: 12 }, (_, k) => COL(3 + k));
const TOTAL = 'P';

/** Cell styles (indexes into cellXfs below). */
const S = {
  plain: 0,
  title: 1,
  prepared: 2,
  right: 3,
  rightBold: 4,
  redRule: 5,
  headLeft: 6,
  headMonth: 7,
  headTotal: 8,
  heading: 9,
  lineLabel: 10,
  num: 11,
  numBold: 12,
  subLabel: 13,
  subNum: 14,
  totLabel: 15,
  totNum: 16,
  avgLabel: 17,
  avgNum: 18,
  notesHead: 19,
  note: 20,
} as const;

const NUM_FMT = '#,##0.00_);\\(#,##0.00\\);\\-_)';

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="${esc(NUM_FMT)}"/></numFmts>
<fonts count="6">
<font><sz val="10"/><color rgb="FF1D1D1B"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="16"/><color rgb="FF1D1D1B"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="11"/><color rgb="FF1D1D1B"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="10"/><color rgb="FF1D1D1B"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>
<font><sz val="9"/><color rgb="FF404040"/><name val="Calibri"/><family val="2"/></font>
</fonts>
<fills count="5">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFF2F2F2"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF1D1D1B"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFD9D9D9"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="4">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left/><right/><top/><bottom style="medium"><color rgb="FFC5161D"/></bottom><diagonal/></border>
<border><left/><right/><top/><bottom style="thin"><color rgb="FFC5161D"/></bottom><diagonal/></border>
<border><left/><right/><top style="thin"><color rgb="FF1D1D1B"/></top><bottom/><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="21">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="right"/></xf>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="right"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>
<xf numFmtId="0" fontId="3" fillId="0" borderId="2" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment vertical="bottom"/></xf>
<xf numFmtId="0" fontId="3" fillId="0" borderId="2" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="bottom" wrapText="1"/></xf>
<xf numFmtId="0" fontId="3" fillId="0" borderId="2" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="bottom"/></xf>
<xf numFmtId="164" fontId="3" fillId="2" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="left" indent="1"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="164" fontId="3" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>
<xf numFmtId="0" fontId="3" fillId="0" borderId="3" xfId="0" applyFont="1" applyBorder="1"/>
<xf numFmtId="164" fontId="3" fillId="0" borderId="3" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>
<xf numFmtId="0" fontId="4" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
<xf numFmtId="164" fontId="4" fillId="3" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1"/>
<xf numFmtId="0" fontId="3" fillId="4" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
<xf numFmtId="164" fontId="3" fillId="4" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1"/>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="5" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

class Strings {
  list: string[] = [];
  index = new Map<string, number>();
  id(s: string): number {
    let k = this.index.get(s);
    if (k === undefined) {
      k = this.list.length;
      this.list.push(s);
      this.index.set(s, k);
    }
    return k;
  }
  xml(): string {
    const items = this.list.map((s) => `<si><t xml:space="preserve">${esc(s)}</t></si>`).join('');
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${this.list.length}" uniqueCount="${this.list.length}">${items}</sst>`;
  }
}

type Cell = string; // a <c> element

export function estimateXlsx(sheet: ClientSheet, createdOn = new Date()): Uint8Array {
  const strings = new Strings();
  const rows: { r: number; height?: number; cells: Cell[] }[] = [];
  const str = (ref: string, s: number, text: string): Cell => `<c r="${ref}" s="${s}" t="s"><v>${strings.id(text)}</v></c>`;
  const num = (ref: string, s: number, v: number): Cell => `<c r="${ref}" s="${s}"><v>${cents(v)}</v></c>`;
  const fx = (ref: string, s: number, f: string, v: number): Cell => `<c r="${ref}" s="${s}"><f>${esc(f)}</f><v>${cents(v)}</v></c>`;
  const blank = (ref: string, s: number): Cell => `<c r="${ref}" s="${s}"/>`;
  const span = (r: number, s: number) => [LABEL, ...MONTH_COLS, TOTAL].map((c) => blank(`${c}${r}`, s));

  // Rows 1 to 4 hold the logo; 6 to 8 the heading block; 9 the red rule; 10 the column headings.
  for (let r = 1; r <= 4; r++) rows.push({ r, height: 16.5, cells: [] });
  rows.push({ r: 6, height: 21, cells: [str('C6', S.title, sheet.title)] });
  rows.push({ r: 7, cells: [str('C7', S.prepared, sheet.preparedFor), str('P7', S.right, sheet.dateLabel)] });
  rows.push({ r: 8, cells: [str('C8', S.plain, sheet.periodLabel), str('P8', S.rightBold, sheet.amountsLabel)] });
  rows.push({ r: 9, cells: span(9, S.redRule) });
  rows.push({
    r: 10,
    height: 27.75,
    cells: [
      str('C10', S.headLeft, 'Service'),
      ...MONTH_COLS.map((c, k) => str(`${c}10`, S.headMonth, `${sheet.monthHeads[k][0]}\n${sheet.monthHeads[k][1]}`)),
      str('P10', S.headTotal, 'Total'),
    ],
  });

  let r = 11;
  let groupStart = 0;
  const subtotalRows: number[] = [];
  let totalRow = 0;
  let exclRow = 0;
  let vatRow = 0;
  let inclRow = 0;
  const sumRow = (row: number) => `SUM(D${row}:O${row})`;

  for (const row of sheet.rows) {
    const cells: Cell[] = [];
    const amounts = row.amounts ?? [];
    switch (row.kind) {
      case 'H':
        cells.push(str(`C${r}`, S.heading, row.label), ...MONTH_COLS.map((c) => blank(`${c}${r}`, S.heading)), blank(`P${r}`, S.heading));
        groupStart = r + 1;
        break;
      case 'L':
        cells.push(str(`C${r}`, S.lineLabel, row.label), ...MONTH_COLS.map((c, k) => num(`${c}${r}`, S.num, amounts[k])), fx(`P${r}`, S.numBold, sumRow(r), row.total ?? 0));
        break;
      case 'S':
        cells.push(
          str(`C${r}`, S.subLabel, row.label),
          ...MONTH_COLS.map((c, k) => fx(`${c}${r}`, S.subNum, `SUM(${c}${groupStart}:${c}${r - 1})`, amounts[k])),
          fx(`P${r}`, S.subNum, sumRow(r), row.total ?? 0),
        );
        subtotalRows.push(r);
        break;
      case 'T':
        cells.push(
          str(`C${r}`, S.totLabel, row.label),
          ...MONTH_COLS.map((c, k) => fx(`${c}${r}`, S.totNum, subtotalRows.map((s) => `${c}${s}`).join('+') || '0', amounts[k])),
          fx(`P${r}`, S.totNum, sumRow(r), row.total ?? 0),
        );
        totalRow = r;
        break;
      case 'KA':
        cells.push(str(`C${r}`, S.avgLabel, row.label), ...MONTH_COLS.map((c) => blank(`${c}${r}`, S.avgLabel)), fx(`P${r}`, S.avgNum, `P${totalRow}/12`, row.total ?? 0));
        break;
      case 'K':
        if (!exclRow) exclRow = r;
        else vatRow = r;
        cells.push(str(`C${r}`, S.plain, row.label), placeholder(r));
        break;
      case 'KT':
        inclRow = r;
        cells.push(str(`C${r}`, S.subLabel, row.label), ...MONTH_COLS.map((c) => blank(`${c}${r}`, S.subLabel)), placeholder(r));
        break;
      case 'B':
        break;
    }
    rows.push({ r, cells });
    r++;
  }

  // The annual figures: whichever total the sheet shows is a formula, the other side is its value.
  const incl = sheet.mode === 'incl';
  const k = sheet.rows.filter((x) => x.kind === 'K' || x.kind === 'KT').map((x) => x.total ?? 0);
  const [exclV, vatV, inclV] = k;
  const fill = new Map<number, Cell>();
  if (incl) {
    fill.set(inclRow, fx(`P${inclRow}`, S.subNum, `P${totalRow}`, inclV));
    fill.set(exclRow, num(`P${exclRow}`, S.num, exclV));
    fill.set(vatRow, fx(`P${vatRow}`, S.num, `P${inclRow}-P${exclRow}`, vatV));
  } else {
    fill.set(exclRow, fx(`P${exclRow}`, S.num, `P${totalRow}`, exclV));
    fill.set(vatRow, num(`P${vatRow}`, S.num, vatV));
    fill.set(inclRow, fx(`P${inclRow}`, S.subNum, `P${exclRow}+P${vatRow}`, inclV));
  }
  for (const row of rows) row.cells = row.cells.map((c) => (c.startsWith('<placeholder') ? fill.get(row.r)! : c));

  // Notes, each across C to P
  r += 1;
  rows.push({ r, cells: [str(`C${r}`, S.notesHead, 'Notes')] });
  const merges: string[] = [];
  for (const note of sheet.notes) {
    r++;
    const lines = Math.max(1, Math.ceil(note.length / 190));
    rows.push({ r, height: Math.max(25.5, 12.75 * lines + 2), cells: [str(`C${r}`, S.note, note), ...[...MONTH_COLS, TOTAL].map((c) => blank(`${c}${r}`, S.note))] });
    merges.push(`C${r}:P${r}`);
  }
  const lastRow = r;

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
<dimension ref="C1:P${lastRow}"/>
<sheetViews><sheetView showGridLines="0" tabSelected="1" workbookViewId="0"><pane xSplit="3" ySplit="10" topLeftCell="D11" activePane="bottomRight" state="frozen"/><selection pane="topRight" activeCell="D1" sqref="D1"/><selection pane="bottomLeft" activeCell="A11" sqref="A11"/><selection pane="bottomRight" activeCell="D11" sqref="D11"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="13.2"/>
<cols><col min="1" max="2" width="13" hidden="1" customWidth="1"/><col min="3" max="3" width="46" customWidth="1"/><col min="4" max="15" width="10.5546875" customWidth="1"/><col min="16" max="16" width="13" customWidth="1"/></cols>
<sheetData>${rows
    .map((row) => `<row r="${row.r}"${row.height ? ` ht="${row.height}" customHeight="1"` : ''}>${row.cells.join('')}</row>`)
    .join('')}</sheetData>
<mergeCells count="${merges.length}">${merges.map((m) => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>
<printOptions horizontalCentered="1"/>
<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>
<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="1"/>
<drawing r:id="rId1"/>
</worksheet>`;

  // The logo: 6.2 cm wide in the top-left corner, as on the Estimation tab.
  const cx = 2238120;
  const cy = Math.round((cx * LOGO_HEIGHT) / LOGO_WIDTH);
  const drawing = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<xdr:oneCellAnchor><xdr:from><xdr:col>2</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:ext cx="${cx}" cy="${cy}"/>
<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="2" name="FD on Call logo" descr="FD on Call"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr>
<xdr:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>
<xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic>
<xdr:clientData/></xdr:oneCellAnchor>
</xdr:wsDr>`;

  const stamp = createdOn.toISOString().replace(/\.\d{3}Z$/, 'Z');
  const title = `Fee estimate, ${sheet.preparedFor.replace(/^Prepared for: /, '')}`;
  const files = [
    {
      name: '[Content_Types].xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Default Extension="png" ContentType="image/png"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`,
    },
    {
      name: '_rels/.rels',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`,
    },
    {
      name: 'docProps/core.xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>${esc(title)}</dc:title><dc:creator>FD on Call</dc:creator><cp:lastModifiedBy>FD on Call</cp:lastModifiedBy>
<dcterms:created xsi:type="dcterms:W3CDTF">${stamp}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${stamp}</dcterms:modified>
</cp:coreProperties>`,
    },
    {
      name: 'docProps/app.xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>FD on Call practice system</Application><Company>FD on Call (Pty) Ltd</Company></Properties>`,
    },
    {
      name: 'xl/workbook.xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<bookViews><workbookView xWindow="0" yWindow="0" windowWidth="28800" windowHeight="15000"/></bookViews>
<sheets><sheet name="Estimation" sheetId="1" r:id="rId1"/></sheets>
<definedNames><definedName name="_xlnm.Print_Area" localSheetId="0">Estimation!$C$1:$P$${lastRow}</definedName></definedNames>
<calcPr calcId="191029" fullCalcOnLoad="1"/>
</workbook>`,
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`,
    },
    { name: 'xl/styles.xml', data: STYLES },
    { name: 'xl/worksheets/sheet1.xml', data: sheetXml },
    {
      name: 'xl/worksheets/_rels/sheet1.xml.rels',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>`,
    },
    { name: 'xl/drawings/drawing1.xml', data: drawing },
    {
      name: 'xl/drawings/_rels/drawing1.xml.rels',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/></Relationships>`,
    },
    { name: 'xl/media/image1.png', data: logoPng() },
    { name: 'xl/sharedStrings.xml', data: '' },
  ];
  // Shared strings last, once every cell has registered its text.
  files[files.length - 1].data = strings.xml();
  return zip(files, createdOn);
}

/** Marks the Total cell of an annual row, filled in once all the rows are known. */
function placeholder(r: number): string {
  return `<placeholder r="${r}"/>`;
}

export type { SheetRow };
