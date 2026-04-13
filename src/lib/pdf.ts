import PDFDocument from 'pdfkit';
import type { Devis, DevisItem, Client, Invoice, InvoiceItem } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface CompanyInfo {
  companyName?: string | null;
  name: string;
  firstName: string;
  address?: string | null;
  addressComplement?: string | null;
  postalCode?: string | null;
  city?: string | null;
  phone?: string | null;
  professionalEmail?: string | null;
  siret?: string | null;
  tvaNumber?: string | null;
  rcsNumber?: string | null;
  legalForm?: string | null;
  socialCapital?: string | null;
  logoBase64?: string | null;
  logoMimeType?: string | null;
  iban?: string | null;
  bic?: string | null;
  bankName?: string | null;
  accountHolder?: string | null;
  paymentTerms?: string;
  latePenaltyRate?: number;
  earlyDiscount?: number | null;
  earlyDiscountDays?: number | null;
  customNotes?: string;
  directorName?: string | null;
  directorTitle?: string | null;
}

interface Ctx {
  doc: PDFKit.PDFDocument;
  y: number;
  pageNum: number;
  company: CompanyInfo;
  client: Client;
  ae: boolean;
  docType: 'devis' | 'invoice';
  docNumber: string;
  issueDate: Date;
  extraDate?: Date;
  devisNumber?: string | null;
  items: (DevisItem | InvoiceItem)[];
  globalDiscount: number;
}

// ═══════════════════════════════════════════════════════════════
// DESIGN SYSTEM — Finance Luxe palette (aligned with globals.css)
// ═══════════════════════════════════════════════════════════════

const P = {
  // Core
  navy:        '#0c1330',   // --fg / dark primary
  navyMid:     '#111d4a',   // mid-dark for panels
  navyLight:   '#1e2d5a',   // lighter navy surfaces

  // Brand indigo
  brand:       '#1a3cff',
  brandDark:   '#1230d6',
  brandSoft:   '#dce5ff',   // light tinted bg
  brandBorder: '#b3c4ff',

  // Gold accent
  gold:        '#c8973a',
  goldLight:   '#fdf3e0',
  goldBorder:  '#e8c98a',

  // Grays
  white:       '#ffffff',
  bg:          '#f4f6fb',
  bgStripe:    '#eef1f8',
  surface:     '#ffffff',

  // Text
  text:        '#0c1330',
  textSec:     '#374166',
  textMuted:   '#6b7499',
  textHint:    '#9ba3c4',

  // Borders
  border:      '#dce3f0',
  borderMid:   '#c4cfea',

  // Semantic
  paid:        '#0f7b55',
  paidBg:      '#e6f7f2',
};

// ═══════════════════════════════════════════════════════════════
// LAYOUT CONSTANTS
// ═══════════════════════════════════════════════════════════════

const PW           = 595.28;   // A4 width pts
const PH           = 841.89;   // A4 height pts
const MG           = 44;       // page margin
const CW           = PW - 2 * MG;   // content width
const FOOTER_H     = 32;
const FOOTER_Y     = PH - FOOTER_H;
const CONTENT_BTOM = FOOTER_Y - 14;
const HEADER_BAND  = 5;        // top accent bar height

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function s(t: string | null | undefined): string {
  return t && String(t).trim() ? String(t).trim() : '';
}

function fmtCur(a: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(a);
}

function fmtDate(d: Date): string {
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }).format(d);
}

function isAE(lf?: string | null): boolean {
  if (!lf) return false;
  const l = lf.toLowerCase();
  return (
    l.includes('auto-entrepreneur') ||
    l.includes('auto entrepreneur') ||
    l.includes('micro-entreprise') ||
    l.includes('micro entreprise')
  );
}

function fmtIban(i: string): string {
  return i.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
}

/** Height of a table row given its description content */
function rowHeight(doc: PDFKit.PDFDocument, text: string, colW: number): number {
  doc.font('Helvetica').fontSize(8.5);
  const h = doc.heightOfString(text || ' ', { width: colW - 12 });
  return Math.max(26, h + 16);
}

/** Pixel-perfect text width measure */
function tw(doc: PDFKit.PDFDocument, text: string, font = 'Helvetica', size = 8.5): number {
  doc.font(font).fontSize(size);
  return doc.widthOfString(text);
}

/** Draw text only when non-empty */
function st(
  doc: PDFKit.PDFDocument,
  text: string | null | undefined,
  x: number,
  y: number,
  opts?: Record<string, unknown>,
): void {
  const v = s(text);
  if (v) doc.text(v, x, y, opts);
}

/** Draw a horizontal rule */
function hr(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  color = P.border,
  lw = 0.4,
): void {
  doc.moveTo(x, y).lineTo(x + w, y).strokeColor(color).lineWidth(lw).stroke();
}

/** Rounded rect helper */
function rRect(
  doc: PDFKit.PDFDocument,
  x: number, y: number, w: number, h: number,
  r: number,
  fill?: string,
  stroke?: string,
  lw = 0.5,
): void {
  if (fill) {
    doc.roundedRect(x, y, w, h, r).fill(fill);
  }
  if (stroke) {
    doc.roundedRect(x, y, w, h, r).strokeColor(stroke).lineWidth(lw).stroke();
  }
}

// ═══════════════════════════════════════════════════════════════
// COLUMN LAYOUT
// ═══════════════════════════════════════════════════════════════

interface ColLayout {
  desc:  { x: number; w: number };
  qty:   { x: number; w: number };
  pu:    { x: number; w: number };
  tva?:  { x: number; w: number };
  total: { x: number; w: number };
}

function getColLayout(ae: boolean): ColLayout {
  let cx = MG;
  const descW  = ae ? CW * 0.50 : CW * 0.40;
  const qtyW   = CW * 0.09;
  const puW    = ae ? CW * 0.22 : CW * 0.16;
  const tvaW   = ae ? 0         : CW * 0.11;
  const totalW = CW - descW - qtyW - puW - tvaW;

  const descX = cx; cx += descW;
  const qtyX  = cx; cx += qtyW;
  const puX   = cx; cx += puW;
  const tvaX  = cx; cx += tvaW;
  const totX  = cx;

  const layout: ColLayout = {
    desc:  { x: descX, w: descW },
    qty:   { x: qtyX,  w: qtyW  },
    pu:    { x: puX,   w: puW   },
    total: { x: totX,  w: totalW },
  };

  if (!ae && tvaW > 0) {
    layout.tva = { x: tvaX, w: tvaW };
  }

  return layout;
}

// ═══════════════════════════════════════════════════════════════
// PAGE MANAGEMENT
// ═══════════════════════════════════════════════════════════════

function drawFooter(ctx: Ctx): void {
  const { doc, company, pageNum } = ctx;

  // Thin gold top-border for footer zone
  doc.moveTo(MG, FOOTER_Y - 1).lineTo(PW - MG, FOOTER_Y - 1)
    .strokeColor(P.gold).lineWidth(0.8).stroke();

  // Background strip
  doc.rect(0, FOOTER_Y, PW, FOOTER_H).fill(P.navy);

  const fy = FOOTER_Y + 10;

  // Company name left
  const cName = s(company.companyName) || [s(company.firstName), s(company.name)].join(' ').trim();
  doc.font('Helvetica-Bold').fontSize(6.5).fillColor(P.white);
  st(doc, cName, MG, fy);

  // SIRET center
  if (s(company.siret)) {
    doc.font('Helvetica').fontSize(6).fillColor(P.textHint);
    doc.text(`SIRET : ${s(company.siret)}`, PW / 2 - 60, fy, { width: 120, align: 'center' });
  } else if (ctx.ae) {
    doc.font('Helvetica-Oblique').fontSize(6).fillColor(P.textHint);
    doc.text('TVA non applicable — art. 293 B du CGI', PW / 2 - 90, fy, { width: 180, align: 'center' });
  }

  // Page number right — gold dot prefix
  const pageLabel = `${pageNum}`;
  doc.font('Helvetica-Bold').fontSize(7).fillColor(P.gold);
  doc.text(pageLabel, PW - MG - 24, fy - 0.5, { width: 24, align: 'right' });
}

function doNewPage(ctx: Ctx): void {
  drawFooter(ctx);
  ctx.doc.addPage();
  ctx.pageNum++;
  ctx.y = MG;

  // Top accent bar
  drawAccentBar(ctx);

  // Mini continuation header
  const lbl = ctx.docType === 'devis' ? 'DEVIS' : 'FACTURE';
  ctx.doc.font('Helvetica').fontSize(7).fillColor(P.textMuted);
  ctx.doc.text(`${lbl}  ·  ${ctx.docNumber}  ·  suite`, MG, HEADER_BAND + 9, { width: CW });
  ctx.y = HEADER_BAND + 22;
}

function ensureSpace(ctx: Ctx, need: number, tableMode = false): void {
  if (ctx.y + need > CONTENT_BTOM) {
    doNewPage(ctx);
    if (tableMode) drawTableHeader(ctx, getColLayout(ctx.ae));
  }
}

// ═══════════════════════════════════════════════════════════════
// ACCENT BAR (top of every page)
// ═══════════════════════════════════════════════════════════════

function drawAccentBar(ctx: Ctx): void {
  const { doc } = ctx;
  // Navy base
  doc.rect(0, 0, PW, HEADER_BAND).fill(P.navy);
  // Gold right cap — 80 pts wide
  doc.rect(PW - 80, 0, 80, HEADER_BAND).fill(P.gold);
}

// ═══════════════════════════════════════════════════════════════
// SECTION — HEADER (split panel design)
// ═══════════════════════════════════════════════════════════════

function drawHeader(ctx: Ctx): void {
  const { doc, company } = ctx;

  // ── Dimensions ──
  const leftPanelW  = CW * 0.52;
  const rightPanelW = CW - leftPanelW - 10; // 10pt gutter
  const lx = MG;
  const rx = MG + leftPanelW + 10;

  // Estimate left content height to size the panel
  const leftLines: string[] = [];
  if (s(company.legalForm)) leftLines.push('');      // legalForm line
  if (s(company.address)) leftLines.push('');
  if (s(company.addressComplement)) leftLines.push('');
  const cityLine = [s(company.postalCode), s(company.city)].join(' ').trim();
  if (cityLine) leftLines.push('');
  if (s(company.phone)) leftLines.push('');
  if (s(company.professionalEmail)) leftLines.push('');
  if (s(company.siret)) leftLines.push('');
  if (s(company.tvaNumber)) leftLines.push('');
  if (s(company.rcsNumber)) leftLines.push('');

  const panelH = Math.max(
    90,
    HEADER_BAND + 10 + 20 + 14 + leftLines.length * 10 + 14,
  );

  const startY = HEADER_BAND + 8;

  // ── Left company panel (subtle tinted bg) ──
  rRect(doc, lx, startY, leftPanelW, panelH, 6, P.bg);
  rRect(doc, lx, startY, leftPanelW, panelH, 6, undefined, P.border, 0.5);
  // Brand accent left stripe
  doc.roundedRect(lx, startY, 3, panelH, 2).fill(P.brand);

  let ly = startY + 14;
  const lxIn = lx + 14;
  const lwIn = leftPanelW - 28;

  // Logo
  if (s(company.logoBase64) && s(company.logoMimeType)) {
    try {
      const buf = Buffer.from(company.logoBase64!, 'base64');
      if (buf.length > 0) {
        doc.image(buf, lxIn, ly, { fit: [60, 30] });
        ly += 36;
      }
    } catch { /* skip */ }
  }

  // Company name
  const cName = s(company.companyName) || [s(company.firstName), s(company.name)].join(' ').trim() || 'Mon entreprise';
  doc.font('Helvetica-Bold').fontSize(13).fillColor(P.navy);
  doc.text(cName, lxIn, ly, { width: lwIn });
  ly += doc.currentLineHeight() + 4;

  // Legal form tag
  if (s(company.legalForm)) {
    const lfText = s(company.legalForm)!;
    const lfW = tw(doc, lfText, 'Helvetica', 7) + 10;
    rRect(doc, lxIn, ly, lfW, 14, 3, P.brandSoft);
    doc.font('Helvetica').fontSize(7).fillColor(P.brand);
    doc.text(lfText, lxIn + 5, ly + 3.5, { width: lfW - 10 });
    ly += 20;
  }

  // Address & contacts
  doc.font('Helvetica').fontSize(7.5).fillColor(P.textSec);

  const detailLines: string[] = [];
  if (s(company.address)) detailLines.push(s(company.address)!);
  if (s(company.addressComplement)) detailLines.push(s(company.addressComplement)!);
  if (cityLine) detailLines.push(cityLine);

  // Divider before contacts
  if (detailLines.length) {
    for (const line of detailLines) {
      doc.text(line, lxIn, ly, { width: lwIn });
      ly += 10;
    }
    ly += 4;
  }

  // Contacts — icon prefix simulation via unicode
  doc.font('Helvetica').fontSize(7).fillColor(P.textMuted);
  if (s(company.phone)) {
    doc.text(`☎  ${s(company.phone)}`, lxIn, ly, { width: lwIn });
    ly += 10;
  }
  if (s(company.professionalEmail)) {
    doc.text(`✉  ${s(company.professionalEmail)}`, lxIn, ly, { width: lwIn });
    ly += 10;
  }

  // Legal IDs — subtle muted color
  doc.font('Helvetica').fontSize(6.5).fillColor(P.textHint);
  if (s(company.siret)) {
    doc.text(`SIRET : ${s(company.siret)}`, lxIn, ly, { width: lwIn });
    ly += 9;
  }
  if (s(company.tvaNumber)) {
    doc.text(`N° TVA : ${s(company.tvaNumber)}`, lxIn, ly, { width: lwIn });
    ly += 9;
  }
  if (s(company.rcsNumber)) {
    doc.text(`RCS : ${s(company.rcsNumber)}`, lxIn, ly, { width: lwIn });
    ly += 9;
  }

  // ── Right : doc type badge + meta ──
  let ry = startY;

  // Document type large badge (pill)
  const isDevis   = ctx.docType === 'devis';
  const labelText = isDevis ? 'DEVIS' : 'FACTURE';
  const badgeColor = isDevis ? P.gold : P.brand;
  const badgeBg    = isDevis ? P.goldLight : P.brandSoft;

  // Large type badge
  const badgeH = 36;
  rRect(doc, rx, ry, rightPanelW, badgeH, 6, badgeBg);
  rRect(doc, rx, ry, rightPanelW, badgeH, 6, undefined, isDevis ? P.goldBorder : P.brandBorder, 0.6);
  doc.font('Helvetica-Bold').fontSize(17).fillColor(badgeColor);
  doc.text(labelText, rx, ry + (badgeH - 17) / 2 + 1, { width: rightPanelW, align: 'center' });
  ry += badgeH + 12;

  // Number — prominent
  const numLabel = isDevis ? 'N° de devis' : 'N° de facture';
  doc.font('Helvetica').fontSize(7.5).fillColor(P.textMuted);
  doc.text(numLabel, rx, ry, { width: rightPanelW, align: 'right' });
  ry += 11;

  doc.font('Helvetica-Bold').fontSize(12).fillColor(P.navy);
  doc.text(ctx.docNumber, rx, ry, { width: rightPanelW, align: 'right' });
  ry += 18;

  // Divider
  hr(doc, rx, ry, rightPanelW, P.border, 0.4);
  ry += 9;

  // Meta rows (date, échéance, ref devis)
  const metaRows: Array<[string, string]> = [
    ['Émis le', fmtDate(ctx.issueDate)],
  ];
  if (ctx.extraDate) {
    const eLabel = isDevis ? 'Valable jusqu'au' : 'Échéance';
    metaRows.push([eLabel, fmtDate(ctx.extraDate)]);
  }
  if (s(ctx.devisNumber)) {
    metaRows.push(['Réf. devis', s(ctx.devisNumber)!]);
  }

  for (const [lbl, val] of metaRows) {
    doc.font('Helvetica').fontSize(7.5).fillColor(P.textMuted);
    doc.text(lbl, rx, ry, { width: rightPanelW * 0.46, align: 'left' });
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(P.text);
    doc.text(val, rx + rightPanelW * 0.46, ry, { width: rightPanelW * 0.54, align: 'right' });
    ry += 14;
  }

  ctx.y = Math.max(startY + panelH, ry) + 14;
}

// ═══════════════════════════════════════════════════════════════
// SECTION — CLIENT CARD (left accent stripe design)
// ═══════════════════════════════════════════════════════════════

function drawClientCard(ctx: Ctx): void {
  const { doc, client } = ctx;

  const lines: Array<{ text: string; bold?: boolean }> = [];
  const cname = s(client.company) || s(client.name) || 'Client';
  lines.push({ text: cname, bold: true });
  if (s(client.company) && s(client.name)) lines.push({ text: s(client.name)! });
  if (s(client.address)) lines.push({ text: s(client.address)! });
  if (s(client.addressComplement)) lines.push({ text: s(client.addressComplement)! });
  const ccity = [s(client.postalCode), s(client.city)].join(' ').trim();
  if (ccity) lines.push({ text: ccity });
  if (s(client.siret)) lines.push({ text: `SIRET : ${s(client.siret)}` });
  if (s(client.email)) lines.push({ text: s(client.email)! });
  if (s(client.phone)) lines.push({ text: `Tél : ${s(client.phone)}` });

  const pad    = 12;
  const labelH = 16;
  const lineH  = 11;
  const cardH  = labelH + lines.length * lineH + pad * 2;

  ensureSpace(ctx, cardH + 12);

  const x = MG;
  const y = ctx.y;

  // Card background
  rRect(doc, x, y, CW, cardH, 5, P.bg);
  rRect(doc, x, y, CW, cardH, 5, undefined, P.border, 0.5);

  // Left accent stripe (gold for client — warm, distinct from brand blue)
  doc.roundedRect(x, y, 3.5, cardH, 2).fill(P.gold);

  // "DESTINATAIRE" label
  doc.font('Helvetica-Bold').fontSize(6.5).fillColor(P.textMuted);
  doc.text('DESTINATAIRE', x + pad + 4, y + pad);

  // Content
  let ty = y + pad + labelH;
  for (const line of lines) {
    if (line.bold) {
      doc.font('Helvetica-Bold').fontSize(9).fillColor(P.navy);
    } else {
      doc.font('Helvetica').fontSize(8).fillColor(P.textSec);
    }
    doc.text(line.text, x + pad + 4, ty, { width: CW - pad * 2 - 4 });
    ty += lineH;
  }

  ctx.y = y + cardH + 14;
}

// ═══════════════════════════════════════════════════════════════
// SECTION — ITEMS TABLE
// ═══════════════════════════════════════════════════════════════

function drawTableHeader(ctx: Ctx, layout: ColLayout): void {
  const { doc } = ctx;
  const h = 26;
  const x = MG;

  // Navy header background
  rRect(doc, x, ctx.y, CW, h, 4, P.navy);

  // Gold right accent on header
  doc.rect(x + CW - 3, ctx.y, 3, h).fill(P.gold);
  doc.roundedRect(x + CW - 3, ctx.y, 3, h, 2).fill(P.gold);

  const textY = ctx.y + 8;
  doc.font('Helvetica-Bold').fontSize(7).fillColor(P.white);

  doc.text('Désignation / Description', layout.desc.x + 10, textY, { width: layout.desc.w - 14 });

  const qtyLabel = 'Qté';
  const qtyLabelW = tw(doc, qtyLabel, 'Helvetica-Bold', 7);
  doc.text(qtyLabel, layout.qty.x + (layout.qty.w - qtyLabelW) / 2, textY);

  const puLabel = 'P.U. HT';
  const puLabelW = tw(doc, puLabel, 'Helvetica-Bold', 7);
  doc.text(puLabel, layout.pu.x + layout.pu.w - puLabelW - 6, textY);

  if (!ctx.ae && layout.tva) {
    const tvaLabel = 'TVA';
    const tvaLabelW = tw(doc, tvaLabel, 'Helvetica-Bold', 7);
    doc.text(tvaLabel, layout.tva.x + (layout.tva.w - tvaLabelW) / 2, textY);
  }

  const totLabel = 'Total HT';
  const totLabelW = tw(doc, totLabel, 'Helvetica-Bold', 7);
  doc.text(totLabel, layout.total.x + layout.total.w - totLabelW - 6, textY);

  ctx.y += h;
}

function drawTableRow(
  ctx: Ctx,
  item: DevisItem | InvoiceItem,
  layout: ColLayout,
  idx: number,
): void {
  const { doc } = ctx;

  const desig = s(item.designation);
  const desc  = s(item.description);
  const combined = desig + (desig && desc ? '\n' : '') + desc;
  const rh = rowHeight(doc, combined, layout.desc.w);

  ensureSpace(ctx, rh, true);

  const ry = ctx.y;

  // Alternating stripe — very subtle
  if (idx % 2 === 1) {
    doc.rect(MG, ry, CW, rh).fill(P.bgStripe);
  }

  // Bottom separator
  hr(doc, MG, ry + rh - 0.5, CW, P.border, 0.3);

  const pad = 6;
  const textY = ry + 8;

  // ── Description column ──
  const descX = layout.desc.x + pad + 4;
  const descW = layout.desc.w - pad * 2 - 4;

  if (desig) {
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(P.navy);
    doc.text(desig, descX, textY, { width: descW });
  }
  if (desc) {
    const desigH = desig
      ? (doc.font('Helvetica-Bold').fontSize(8.5), doc.heightOfString(desig, { width: descW }) + 3)
      : 0;
    doc.font('Helvetica').fontSize(7.5).fillColor(P.textMuted);
    doc.text(desc, descX, textY + desigH, { width: descW });
  }

  // ── Qty — centered ──
  const qtyStr = String(item.quantity ?? 0);
  const qtyW   = tw(doc, qtyStr, 'Helvetica', 8.5);
  doc.font('Helvetica').fontSize(8.5).fillColor(P.textSec);
  doc.text(qtyStr, layout.qty.x + (layout.qty.w - qtyW) / 2, textY);

  // ── P.U. — right aligned ──
  const puStr = fmtCur(Number(item.unitPrice ?? 0));
  const puW   = tw(doc, puStr, 'Helvetica', 8.5);
  doc.font('Helvetica').fontSize(8.5).fillColor(P.textSec);
  doc.text(puStr, layout.pu.x + layout.pu.w - puW - pad, textY);

  // ── TVA — centered ──
  if (!ctx.ae && layout.tva) {
    const tvaStr = `${item.tvaRate ?? 0} %`;
    const tvaW   = tw(doc, tvaStr, 'Helvetica', 8);
    doc.font('Helvetica').fontSize(8).fillColor(P.textMuted);
    doc.text(tvaStr, layout.tva.x + (layout.tva.w - tvaW) / 2, textY);
  }

  // ── Total HT — right aligned, bold, navy ──
  const lineTotal = Number(item.quantity ?? 0) * Number(item.unitPrice ?? 0);
  const totalStr  = fmtCur(lineTotal);
  const totalW    = tw(doc, totalStr, 'Helvetica-Bold', 9);
  doc.font('Helvetica-Bold').fontSize(9).fillColor(P.navy);
  doc.text(totalStr, layout.total.x + layout.total.w - totalW - pad, textY);

  ctx.y += rh;
}

function drawItemsTable(ctx: Ctx): void {
  const layout = getColLayout(ctx.ae);

  ensureSpace(ctx, 40);

  // Section label above table
  doc_sectionLabel(ctx, 'PRESTATIONS & ARTICLES');

  drawTableHeader(ctx, layout);

  for (let i = 0; i < ctx.items.length; i++) {
    drawTableRow(ctx, ctx.items[i], layout, i);
  }

  // Close table with a bottom border accent
  hr(ctx.doc, MG, ctx.y, CW, P.brand, 1.2);
  ctx.y += 12;
}

// ═══════════════════════════════════════════════════════════════
// SHARED — Section label helper
// ═══════════════════════════════════════════════════════════════

function doc_sectionLabel(ctx: Ctx, label: string): void {
  ctx.doc.font('Helvetica-Bold').fontSize(6.5).fillColor(P.textHint);
  ctx.doc.text(label, MG, ctx.y, { width: CW, characterSpacing: 0.8 });
  ctx.y += 11;
}

// ═══════════════════════════════════════════════════════════════
// SECTION — TOTALS (premium hierarchy)
// ═══════════════════════════════════════════════════════════════

function drawTotals(ctx: Ctx): void {
  const { doc } = ctx;

  // ── Compute amounts ──
  const totalHT = ctx.items.reduce((a, i) => a + (i.quantity ?? 0) * (i.unitPrice ?? 0), 0);
  const discount = ctx.globalDiscount > 0 ? totalHT * (ctx.globalDiscount / 100) : 0;
  const netHT    = totalHT - discount;

  const tvaMap = new Map<number, number>();
  if (!ctx.ae) {
    ctx.items.forEach((i) => {
      const lineHT    = (i.quantity ?? 0) * (i.unitPrice ?? 0);
      const ratio     = totalHT > 0 ? netHT / totalHT : 1;
      const tvaAmt    = lineHT * ratio * ((i.tvaRate ?? 0) / 100);
      tvaMap.set(i.tvaRate ?? 0, (tvaMap.get(i.tvaRate ?? 0) ?? 0) + tvaAmt);
    });
  }
  const totalTVA = Array.from(tvaMap.values()).reduce((a, v) => a + v, 0);
  const totalTTC = netHT + totalTVA;

  // ── Layout ──
  const totW  = CW * 0.44;
  const lblW  = totW * 0.56;
  const valW  = totW * 0.44;
  const sx    = MG + CW - totW;

  ensureSpace(ctx, 160);

  // Notes area (if any) — LEFT of totals zone
  if (s(ctx.company.customNotes)) {
    const notesW = CW - totW - 20;
    doc.font('Helvetica-Oblique').fontSize(7.5).fillColor(P.textMuted);
    doc.text(s(ctx.company.customNotes)!, MG, ctx.y + 4, { width: notesW });
  }

  // Top separator
  hr(doc, sx - 2, ctx.y, totW + 2, P.border, 0.5);
  ctx.y += 12;

  // Utility: draw a summary row
  const summaryRow = (
    label: string,
    value: string,
    opts: { bold?: boolean; accent?: boolean; muted?: boolean } = {},
  ): void => {
    const lblFont = opts.bold ? 'Helvetica-Bold' : 'Helvetica';
    const valFont = opts.bold ? 'Helvetica-Bold' : 'Helvetica';
    const lblColor = opts.accent ? P.brand : opts.muted ? P.textMuted : P.textSec;
    const valColor = opts.accent ? P.brand : opts.bold ? P.navy : P.text;

    doc.font(lblFont).fontSize(8.5).fillColor(lblColor);
    doc.text(label, sx, ctx.y, { width: lblW, align: 'right' });
    doc.font(valFont).fontSize(8.5).fillColor(valColor);
    doc.text(value, sx + lblW, ctx.y, { width: valW, align: 'right' });
    ctx.y += 16;
  };

  // Total HT
  summaryRow('Total HT', fmtCur(totalHT));

  // Discount
  if (discount > 0) {
    summaryRow(`Remise (${ctx.globalDiscount} %)`, `− ${fmtCur(discount)}`, { accent: true });
    summaryRow('Net HT', fmtCur(netHT), { bold: true });
  }

  // TVA lines
  if (!ctx.ae) {
    const sortedRates = Array.from(tvaMap.keys()).sort((a, b) => a - b);
    for (const rate of sortedRates) {
      summaryRow(`TVA ${rate} %`, fmtCur(tvaMap.get(rate)!), { muted: true });
    }
  } else {
    doc.font('Helvetica-Oblique').fontSize(6.5).fillColor(P.textHint);
    doc.text('TVA non applicable — art. 293 B du CGI', sx, ctx.y, { width: totW, align: 'right' });
    ctx.y += 12;
  }

  // ── Grand total box (gold premium) ──
  ctx.y += 6;
  hr(doc, sx - 2, ctx.y, totW + 2, P.navyLight, 1);
  ctx.y += 8;

  const ttcH = 36;
  rRect(doc, sx - 8, ctx.y - 6, totW + 16, ttcH, 6, P.navy);
  // Gold left accent inside box
  doc.roundedRect(sx - 8, ctx.y - 6, 4, ttcH, 2).fill(P.gold);

  // "TOTAL TTC" label
  doc.font('Helvetica-Bold').fontSize(8).fillColor(P.gold);
  doc.text('TOTAL TTC', sx, ctx.y + 3, { width: lblW, align: 'right' });

  // Amount — large, white
  doc.font('Helvetica-Bold').fontSize(18).fillColor(P.white);
  doc.text(fmtCur(totalTTC), sx + lblW, ctx.y - 1, { width: valW, align: 'right' });

  ctx.y += ttcH + 10;
}

// ═══════════════════════════════════════════════════════════════
// SECTION — IBAN BLOCK (premium bank card look)
// ═══════════════════════════════════════════════════════════════

function drawIbanBlock(ctx: Ctx): void {
  const { doc, company } = ctx;
  if (!s(company.iban)) return;

  ensureSpace(ctx, 100);

  const x  = MG;
  const w  = CW;
  const h  = 78;
  const y  = ctx.y;
  const pad = 16;

  // Dark navy card
  rRect(doc, x, y, w, h, 8, P.navy);
  // Subtle gold top stripe
  doc.roundedRect(x, y, w, 3, 4).fill(P.gold);

  // Heading
  doc.font('Helvetica-Bold').fontSize(8).fillColor(P.gold);
  doc.text('COORDONNÉES BANCAIRES — VIREMENT', x + pad, y + 16, { width: w - pad * 2 });

  // IBAN — monospace, white, prominent
  doc.font('Courier-Bold').fontSize(11).fillColor(P.white);
  doc.text(fmtIban(s(company.iban)!), x + pad, y + 32, { width: w - pad * 2 });

  // BIC + bank + holder — hint color
  doc.font('Helvetica').fontSize(7.5).fillColor(P.textHint);
  const parts: string[] = [];
  if (s(company.bic))           parts.push(`BIC : ${s(company.bic)}`);
  if (s(company.bankName))      parts.push(s(company.bankName)!);
  if (s(company.accountHolder)) parts.push(`Titulaire : ${s(company.accountHolder)}`);
  if (parts.length) {
    doc.text(parts.join('   ·   '), x + pad, y + 52, { width: w - pad * 2 });
  }

  ctx.y += h + 16;
}

// ═══════════════════════════════════════════════════════════════
// SECTION — CONDITIONS DE PAIEMENT
// ═══════════════════════════════════════════════════════════════

function drawConditions(ctx: Ctx): void {
  const { doc, company } = ctx;
  const isDevis = ctx.docType === 'devis';
  const terms   = s(company.paymentTerms) || '30 jours';

  ensureSpace(ctx, 100);

  doc_sectionLabel(ctx, isDevis ? 'CONDITIONS DU DEVIS' : 'CONDITIONS DE PAIEMENT');

  // Left-accent container
  const x   = MG;
  const padX = 12;
  const padY = 10;

  // Collect condition lines first to size box
  const condLines: Array<{ text: string; italic?: boolean }> = [];

  if (isDevis) {
    condLines.push({ text: `Ce devis est valable 30 jours à compter de sa date d'émission.` });
    condLines.push({ text: `Paiement à ${terms} de la réception de la facture.` });
    if (s(company.earlyDiscount) && s(company.earlyDiscountDays)) {
      condLines.push({
        text: `Escompte de ${company.earlyDiscount} % accordé pour paiement sous ${company.earlyDiscountDays} jours.`,
      });
    }
  } else {
    condLines.push({ text: `Paiement à ${terms} de la réception de la facture.` });
    const rate = company.latePenaltyRate ?? 3;
    if (ctx.ae) {
      condLines.push({
        text: `En cas de retard, indemnité forfaitaire pour frais de recouvrement de 40 € (art. D441-5 du Code de Commerce).`,
        italic: true,
      });
    } else {
      condLines.push({
        text: `En cas de retard, pénalité de ${rate} % + indemnité forfaitaire de 40 € (art. D441-5 du Code de Commerce).`,
        italic: true,
      });
    }
    if (s(company.earlyDiscount) && s(company.earlyDiscountDays)) {
      condLines.push({
        text: `Escompte de ${company.earlyDiscount} % accordé pour paiement sous ${company.earlyDiscountDays} jours.`,
      });
    }
  }

  const lineH = 11;
  const boxH  = padY * 2 + condLines.length * lineH;

  rRect(doc, x, ctx.y, CW, boxH, 4, P.bg);
  rRect(doc, x, ctx.y, CW, boxH, 4, undefined, P.border, 0.4);
  doc.roundedRect(x, ctx.y, 3, boxH, 2).fill(P.brand);

  let cy = ctx.y + padY;
  for (const line of condLines) {
    if (line.italic) {
      doc.font('Helvetica-Oblique').fontSize(7.5).fillColor(P.textMuted);
    } else {
      doc.font('Helvetica').fontSize(7.5).fillColor(P.textSec);
    }
    doc.text(line.text, x + padX + 4, cy, { width: CW - padX * 2 - 4 });
    cy += lineH;
  }

  ctx.y += boxH + 14;
}

// ═══════════════════════════════════════════════════════════════
// SECTION — SIGNATURE (devis only)
// ═══════════════════════════════════════════════════════════════

function drawSignature(ctx: Ctx): void {
  if (ctx.docType !== 'devis') return;

  const { doc } = ctx;
  ensureSpace(ctx, 110);

  doc_sectionLabel(ctx, 'BON POUR ACCORD');

  const x  = MG;
  const w  = CW;
  const h  = 88;
  const y  = ctx.y;
  const pad = 16;

  // Outer container — dashed premium border
  doc.roundedRect(x, y, w, h, 6)
    .dash(4, { space: 3 })
    .strokeColor(P.brandBorder)
    .lineWidth(1)
    .stroke();
  doc.undash();

  // Subtle brand tint inside
  rRect(doc, x, y, w, h, 6, P.brandSoft);
  // Redraw dashed on top (fill clears stroke)
  doc.roundedRect(x, y, w, h, 6)
    .dash(4, { space: 3 })
    .strokeColor(P.brandBorder)
    .lineWidth(1)
    .stroke();
  doc.undash();

  // Instruction text
  doc.font('Helvetica-Oblique').fontSize(7.5).fillColor(P.textSec);
  doc.text(
    'Je soussigné(e) reconnais avoir pris connaissance des présentes conditions et accepte le contenu de ce devis.',
    x + pad, y + pad + 4, { width: w - pad * 2 },
  );

  // Lines for date and signature
  const lineY = y + h - 24;

  const lineCol = P.borderMid;

  // Date
  doc.font('Helvetica').fontSize(7).fillColor(P.textMuted);
  doc.text('Date', x + pad, lineY - 10);
  hr(doc, x + pad, lineY, w * 0.30, lineCol, 0.6);

  // Lieu
  doc.text('Lieu', x + w * 0.36, lineY - 10);
  hr(doc, x + w * 0.36, lineY, w * 0.20, lineCol, 0.6);

  // Signature
  doc.text('Signature et cachet', x + w * 0.62, lineY - 10);
  hr(doc, x + w * 0.62, lineY, w * 0.34 - pad, lineCol, 0.6);

  ctx.y += h + 16;
}

// ═══════════════════════════════════════════════════════════════
// MAIN BUILDER
// ═══════════════════════════════════════════════════════════════

function buildDocument(
  company: CompanyInfo,
  client: Client,
  items: (DevisItem | InvoiceItem)[],
  globalDiscount: number,
  docType: 'devis' | 'invoice',
  docNumber: string,
  issueDate: Date,
  extraDate?: Date,
  devisNumber?: string | null,
): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: false });

  return new Promise((resolve, reject) => {
    const buffers: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    try {
      doc.addPage();

      const ctx: Ctx = {
        doc,
        y: HEADER_BAND + 6,
        pageNum: 1,
        company,
        client,
        ae: isAE(company.legalForm),
        docType,
        docNumber,
        issueDate,
        extraDate,
        devisNumber,
        items,
        globalDiscount: globalDiscount || 0,
      };

      // Page 1 structure
      drawAccentBar(ctx);
      drawHeader(ctx);
      hr(ctx.doc, MG, ctx.y, CW, P.border, 0.4);
      ctx.y += 14;
      drawClientCard(ctx);
      drawItemsTable(ctx);
      drawTotals(ctx);
      ctx.y += 8;
      drawIbanBlock(ctx);
      drawConditions(ctx);
      drawSignature(ctx);

      // Footer on last page
      drawFooter(ctx);

      doc.flushPages();
      doc.end();
    } catch (err) {
      doc.destroy();
      reject(err);
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════

export async function generateDevisPDF(
  devis: Devis & { client: Client; items: DevisItem[] },
  user: CompanyInfo,
): Promise<Buffer> {
  return buildDocument(
    user,
    devis.client,
    devis.items,
    devis.globalDiscount || 0,
    'devis',
    devis.number,
    new Date(devis.issueDate),
    new Date(devis.validUntil),
  );
}

export async function generateInvoicePDF(
  invoice: Invoice & { client: Client; items: InvoiceItem[]; devis?: { number: string } | null },
  user: CompanyInfo,
): Promise<Buffer> {
  return buildDocument(
    user,
    invoice.client,
    invoice.items,
    invoice.globalDiscount || 0,
    'invoice',
    invoice.number,
    new Date(invoice.issueDate),
    new Date(invoice.dueDate),
    invoice.devis?.number,
  );
}
