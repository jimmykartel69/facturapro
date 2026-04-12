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
  doc: PDFDocument;
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
// CONSTANTS — PREMIUM PALETTE
// ═══════════════════════════════════════════════════════════════

const C = {
  primary: '#0f172a',
  accent: '#3b82f6',
  accentBg: '#eff6ff',
  accentBorder: '#bfdbfe',
  white: '#ffffff',
  bgLight: '#f8fafc',
  bgStripe: '#f1f5f9',
  text: '#1e293b',
  textSec: '#475569',
  textMuted: '#94a3b8',
  border: '#e2e8f0',
  green: '#16a34a',
};

const PW = 595.28; // A4 width
const PH = 841.89; // A4 height
const MG = 45; // margin
const CW = PW - 2 * MG; // content width
const CONTENT_BOTTOM = FOOTER_Y - 12;
const FOOTER_Y = PH - 38;

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function s(t: string | null | undefined): string {
  return t && t.trim() ? String(t).trim() : '';
}

function st(doc: PDFDocument, t: string | null | undefined, x: number, y: number, opts?: Record<string, unknown>): void {
  const v = s(t);
  if (v) doc.text(v, x, y, opts);
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
  return l.includes('auto-entrepreneur') || l.includes('auto entrepreneur') || l.includes('micro-entreprise') || l.includes('micro entreprise');
}

function fmtIban(i: string): string {
  return i.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
}

function rowHeight(doc: PDFDocument, desc: string, colW: number): number {
  doc.font('Helvetica').fontSize(8.5);
  const h = doc.heightOfString(desc || ' ', { width: colW - 10 });
  return Math.max(24, h + 12);
}

// ═══════════════════════════════════════════════════════════════
// PAGE MANAGEMENT
// ═══════════════════════════════════════════════════════════════

function drawFooter(ctx: Ctx): void {
  const { doc, pageNum, company } = ctx;
  const savedY = doc.y;

  doc.moveTo(MG, FOOTER_Y - 8).lineTo(PW - MG, FOOTER_Y - 8)
    .strokeColor(C.border).lineWidth(0.5).stroke();

  doc.font('Helvetica').fontSize(6).fillColor(C.textMuted);
  const cn = s(company.companyName) || [s(company.firstName), s(company.name)].join(' ').trim();
  st(doc, cn, MG, FOOTER_Y - 2, { width: CW * 0.35 });

  if (ctx.ae) {
    doc.font('Helvetica-Oblique').fontSize(6).fillColor(C.textMuted);
    doc.text('TVA non applicable, art. 293 B du CGI', PW / 2 - 90, FOOTER_Y - 2, { width: 180, align: 'center' });
  }

  doc.font('Helvetica').fontSize(6).fillColor(C.textMuted);
  doc.text(`Page ${ctx.pageNum}`, PW - MG - 50, FOOTER_Y - 2, { width: 50, align: 'right' });

  doc.y = savedY;
}

function doNewPage(ctx: Ctx): void {
  drawFooter(ctx);
  ctx.doc.addPage();
  ctx.pageNum++;
  ctx.y = MG;

  // Mini header on subsequent pages
  ctx.doc.rect(0, 0, PW, 3).fill(C.accent);
  const lbl = ctx.docType === 'devis' ? 'DEVIS' : 'FACTURE';
  ctx.doc.font('Helvetica-Bold').fontSize(7).fillColor(C.primary);
  ctx.doc.text(`${lbl} n\u00B0 ${ctx.docNumber}`, MG, 12, { width: CW * 0.5 });
}

function ensureSpace(ctx: Ctx, need: number, isTable = false): void {
  if (ctx.y + need > CONTENT_BOTTOM) {
    doNewPage(ctx);

    if (isTable) {
      const cols = getColWidths(ctx.ae);
      drawTableHeader(ctx, cols);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// SECTION — ACCENT BAR
// ═══════════════════════════════════════════════════════════════

function drawAccentBar(ctx: Ctx): void {
  ctx.doc.rect(0, 0, PW, 3).fill(C.accent);
}

// ═══════════════════════════════════════════════════════════════
// SECTION — HEADER
// ═══════════════════════════════════════════════════════════════

function drawHeader(ctx: Ctx): void {
  const { doc, company } = ctx;
  const lx = MG;
  const rx = MG + CW * 0.5;
  const rw = CW * 0.5;
  let ly = 18;

  // --- Left side: logo + company info ---

  if (s(company.logoBase64) && s(company.logoMimeType)) {
    try {
      const buf = Buffer.from(company.logoBase64!, 'base64');
      if (buf.length > 0) {
        doc.image(buf, lx, ly, { fit: [70, 35] });
        ly += 40;
      }
    } catch { /* skip */ }
  }

  const cName = s(company.companyName) || [s(company.firstName), s(company.name)].join(' ').trim() || 'Mon entreprise';
  doc.font('Helvetica-Bold').fontSize(15).fillColor(C.primary);
  doc.text(cName, lx, ly);
  ly += 19;

  // Legal form — discreet line
  if (s(company.legalForm)) {
    doc.font('Helvetica').fontSize(7.5).fillColor(C.textSec);
    doc.text(s(company.legalForm)!, lx, ly);
    ly += 11;
  }

  // Company details
  doc.font('Helvetica').fontSize(7).fillColor(C.textSec);
  const lines: string[] = [];
  if (s(company.address)) lines.push(s(company.address)!);
  if (s(company.addressComplement)) lines.push(s(company.addressComplement)!);
  const city = [s(company.postalCode), s(company.city)].join(' ').trim();
  if (city) lines.push(city);
  if (s(company.phone)) lines.push(`Tel : ${s(company.phone)}`);
  if (s(company.professionalEmail)) lines.push(s(company.professionalEmail)!);
  if (s(company.siret)) lines.push(`SIRET : ${s(company.siret)}`);
  // NO capital social

  for (const line of lines) {
    doc.text(line, lx, ly);
    ly += 10;
  }

  // --- Right side: document info ---

  const label = ctx.docType === 'devis' ? 'DEVIS' : 'FACTURE';
  let ry = 18;

  doc.font('Helvetica-Bold').fontSize(30).fillColor(C.primary);
  doc.text(label, rx, ry, { width: rw, align: 'right' });
  ry += 36;

  doc.font('Helvetica-Bold').fontSize(11).fillColor(C.text);
  const numLbl = ctx.docType === 'devis' ? 'N\u00B0 de devis' : 'N\u00B0 de facture';
  doc.text(`${numLbl} :  ${ctx.docNumber}`, rx, ry, { width: rw, align: 'right' });
  ry += 16;

  doc.font('Helvetica').fontSize(9).fillColor(C.textSec);
  doc.text(`Date : ${fmtDate(ctx.issueDate)}`, rx, ry, { width: rw, align: 'right' });
  ry += 13;

  if (ctx.extraDate) {
    const eLbl = ctx.docType === 'devis' ? 'Validite jusqu\u2019au' : 'Echeance';
    doc.text(`${eLbl} : ${fmtDate(ctx.extraDate)}`, rx, ry, { width: rw, align: 'right' });
    ry += 13;
  }

  if (s(ctx.devisNumber)) {
    doc.text(`Ref. devis : ${s(ctx.devisNumber)}`, rx, ry, { width: rw, align: 'right' });
    ry += 13;
  }

  ctx.y = Math.max(ly, ry) + 8;
}

// ═══════════════════════════════════════════════════════════════
// SECTION — CLIENT CARD
// ═══════════════════════════════════════════════════════════════

function drawClientCard(ctx: Ctx): void {
  const { doc, client } = ctx;
  const x = MG;

  // Count lines to calculate card height
  const infoLines: string[] = [];
  const cname = s(client.company) || s(client.name) || 'Client';
  infoLines.push(cname);
  if (s(client.company) && s(client.name)) infoLines.push(s(client.name)!);
  if (s(client.address)) infoLines.push(s(client.address)!);
  if (s(client.addressComplement)) infoLines.push(s(client.addressComplement)!);
  const ccity = [s(client.postalCode), s(client.city)].join(' ').trim();
  if (ccity) infoLines.push(ccity);
  if (s(client.siret)) infoLines.push(`SIRET : ${s(client.siret)}`);
  if (s(client.email)) infoLines.push(s(client.email)!);
  if (s(client.phone)) infoLines.push(`Tel : ${s(client.phone)}`);

  const labelH = 18;
  const lineH = 11;
  const pad = 12;
  const cardH = labelH + infoLines.length * lineH + pad * 2;

  ensureSpace(ctx, cardH + 10);

  const y = ctx.y;

  // Background
  doc.roundedRect(x, y, CW, cardH, 4).fill(C.bgLight);
  doc.roundedRect(x, y, CW, cardH, 4).strokeColor(C.border).lineWidth(0.5).stroke();

  // Label
  doc.font('Helvetica-Bold').fontSize(7).fillColor(C.accent);
  doc.text('CLIENT', x + pad, y + pad);

  // Info
  doc.font('Helvetica').fontSize(8).fillColor(C.text);
  let ty = y + pad + labelH;
  for (const line of infoLines) {
    doc.text(line, x + pad, ty, { width: CW - pad * 2 });
    ty += lineH;
  }

  ctx.y = y + cardH + 12;
}

// ═══════════════════════════════════════════════════════════════
// SECTION — TABLE
// ═══════════════════════════════════════════════════════════════

function getColWidths(ae: boolean) {
  if (ae) {
    return {
      desc: CW * 0.52,
      qty: CW * 0.10,
      pu: CW * 0.19,
      total: CW * 0.19,
    };
  }
  return {
    desc: CW * 0.40,
    qty: CW * 0.10,
    pu: CW * 0.15,
    tva: CW * 0.10,
    total: CW * 0.25,
  };
}

function drawTableHeader(ctx: Ctx, cols: ReturnType<typeof getColWidths>): void {
  const { doc } = ctx;
  const x = MG;
  const h = 24;

  doc.roundedRect(x, ctx.y, CW, h, 3).fill(C.primary);

  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.white);
  let cx = x;
  doc.text('Description', cx + 6, ctx.y + 7, { width: cols.desc - 10 });
  cx += cols.desc;
  doc.text('Qte', cx + 4, ctx.y + 7, { width: cols.qty - 8, align: 'center' });
  cx += cols.qty;
  doc.text('P.U. HT', cx + 4, ctx.y + 7, { width: cols.pu - 8, align: 'right' });
  cx += cols.pu;
  if (!ctx.ae && cols.tva) {
    doc.text('TVA', cx + 4, ctx.y + 7, { width: cols.tva - 8, align: 'center' });
    cx += cols.tva;
  }
  doc.text('Total HT', cx + 4, ctx.y + 7, { width: cols.total - 10, align: 'right' });

  ctx.y += h;
}

function drawTableRow(ctx: Ctx, item: DevisItem | InvoiceItem, cols: ReturnType<typeof getColWidths>, idx: number): void {
  const { doc } = ctx;
  const desigText = item.designation || '';
  const descText = item.description || '';
  const combinedText = desigText + (desigText && descText ? '\n' : '') + descText;
const rh = rowHeight(doc, combinedText, cols.desc);

// 🔥 important
ensureSpace(ctx, rh, true);

  // Alternating stripe
  if (idx % 2 === 1) {
    doc.rect(MG, ctx.y, CW, rh).fill(C.bgStripe);
  }

  // Bottom line
  doc.moveTo(MG, ctx.y + rh - 0.5).lineTo(MG + CW, ctx.y + rh - 0.5)
    .strokeColor(C.border).lineWidth(0.3).stroke();

  const pad = 6;
  let cx = MG;

  // Description column: designation (bold) + description (normal)
  const textX = cx + pad;
  const textW = cols.desc - pad * 2;
  if (desigText) {
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.text);
    doc.text(desigText, textX, ctx.y + 6, { width: textW });
  }
  if (descText) {
    const desigHeight = desigText ? doc.heightOfString(desigText, { width: textW }) : 0;
    doc.font('Helvetica').fontSize(7.5).fillColor(C.textSec);
    doc.text(descText, textX, ctx.y + 6 + desigHeight + 1, { width: textW });
  }
  cx += cols.desc;

  doc.text(String(item.quantity ?? 0), cx + pad, ctx.y + 6, { width: cols.qty - pad * 2, align: 'center' });
  cx += cols.qty;

  doc.text(fmtCur(item.unitPrice), cx + pad, ctx.y + 6, { width: cols.pu - pad * 2, align: 'right' });
  cx += cols.pu;

  if (!ctx.ae && cols.tva) {
    doc.text(`${item.tvaRate || 0}%`, cx + pad, ctx.y + 6, { width: cols.tva - pad * 2, align: 'center' });
    cx += cols.tva;
  }

  const q = Number(item.quantity || 0);
  const pu = Number(item.unitPrice || 0);
  const lineTotal = q * pu;
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.text);
  doc.text(fmtCur(lineTotal), cx + pad, ctx.y + 6, { width: cols.total - pad * 2, align: 'right' });

  ctx.y += rh;
}

function drawItemsTable(ctx: Ctx): void {
  const cols = getColWidths(ctx.ae);

  ensureSpace(ctx, 30);
  drawTableHeader(ctx, cols);

  for (let i = 0; i < ctx.items.length; i++) {
    drawTableRow(ctx, ctx.items[i], cols, i);
  }

  ctx.y += 8;
}

// ═══════════════════════════════════════════════════════════════
// SECTION — TOTALS
// ═══════════════════════════════════════════════════════════════

function drawTotals(ctx: Ctx): void {
  const { doc } = ctx;
  ensureSpace(ctx, 130);

  const totalW = CW * 0.42;
  const lblW = totalW * 0.58;
  const valW = totalW * 0.42;
  const sx = MG + CW - totalW;

  // Separator
  doc.moveTo(sx, ctx.y).lineTo(sx + totalW, ctx.y)
    .strokeColor(C.border).lineWidth(0.5).stroke();
  ctx.y += 10;

const totalHt = ctx.items.reduce((a, i) => a + (i.quantity || 0) * (i.unitPrice || 0), 0);

  // TVA details
// 🔥 recalcul TVA APRES remise
const tvaMap = new Map<number, number>();

if (!ctx.ae) {
  ctx.items.forEach((i) => {
    const lineHt = (i.quantity || 0) * (i.unitPrice || 0);

    // 🔥 appliquer remise proportionnelle
    const lineHtAfterDiscount = lineHt * (netHt / totalHt);

    const tva = lineHtAfterDiscount * ((i.tvaRate || 0) / 100);

    tvaMap.set(i.tvaRate || 0, (tvaMap.get(i.tvaRate || 0) || 0) + tva);
  });
}
  const totalTva = Array.from(tvaMap.values()).reduce((a, v) => a + v, 0);


let discount = 0;
if (ctx.globalDiscount > 0) {
  discount = totalHt * (ctx.globalDiscount / 100);
}
  const netHt = totalHt - discount;
  const totalTtc = netHt + totalTva;

  // Total HT
  doc.font('Helvetica').fontSize(9).fillColor(C.textSec);
  doc.text('Total HT', sx, ctx.y, { width: lblW, align: 'right' });
  doc.font('Helvetica').fontSize(9).fillColor(C.text);
  doc.text(fmtCur(totalHt), sx + lblW, ctx.y, { width: valW, align: 'right' });
  ctx.y += 17;

  // Discount
  if (ctx.globalDiscount > 0) {
    doc.font('Helvetica').fontSize(9).fillColor(C.textSec);
    doc.text(`Remise (${ctx.globalDiscount}%)`, sx, ctx.y, { width: lblW, align: 'right' });
    doc.font('Helvetica').fontSize(9).fillColor(C.text);
    doc.text(`- ${fmtCur(discount)}`, sx + lblW, ctx.y, { width: valW, align: 'right' });
    ctx.y += 17;
  }

  // TVA lines
  tvaMap.forEach((amt, rate) => {
    doc.font('Helvetica').fontSize(9).fillColor(C.textSec);
    doc.text(`TVA ${rate}%`, sx, ctx.y, { width: lblW, align: 'right' });
    doc.font('Helvetica').fontSize(9).fillColor(C.text);
    doc.text(fmtCur(amt), sx + lblW, ctx.y, { width: valW, align: 'right' });
    ctx.y += 17;
  });

  // AE mention
  if (ctx.ae) {
    doc.font('Helvetica-Oblique').fontSize(7.5).fillColor(C.textMuted);
    doc.text('TVA non applicable, art. 293 B du CGI', sx, ctx.y, { width: totalW, align: 'right' });
    ctx.y += 15;
  }

  // Separator before total
  ctx.y += 2;
  doc.moveTo(sx, ctx.y).lineTo(sx + totalW, ctx.y)
    .strokeColor(C.primary).lineWidth(1).stroke();
  ctx.y += 10;

  // TOTAL TTC — highlighted
  const totalBoxH = 28;
  doc.roundedRect(sx - 4, ctx.y - 4, totalW + 8, totalBoxH, 4).fill(C.accentBg);
  doc.roundedRect(sx - 4, ctx.y - 4, totalW + 8, totalBoxH, 4)
    .strokeColor(C.accentBorder).lineWidth(0.5).stroke();

  doc.font('Helvetica-Bold').fontSize(12).fillColor(C.accent);
  doc.text('TOTAL TTC', sx, ctx.y + 2, { width: lblW, align: 'right' });
  doc.font('Helvetica-Bold').fontSize(16).fillColor(C.primary);
  doc.text(fmtCur(totalTtc), sx + lblW, ctx.y, { width: valW, align: 'right' });
  ctx.y += totalBoxH + 12;

  // Notes
  if (s(ctx.company.customNotes)) {
    ensureSpace(ctx, 40);
    doc.moveTo(MG, ctx.y).lineTo(MG + CW, ctx.y).strokeColor(C.border).lineWidth(0.3).stroke();
    ctx.y += 6;
    doc.font('Helvetica-Oblique').fontSize(7).fillColor(C.textSec);
    doc.text(s(ctx.company.customNotes)!, MG, ctx.y, { width: CW });
    ctx.y += 30;
  }
}

// ═══════════════════════════════════════════════════════════════
// SECTION — IBAN BLOCK
// ═══════════════════════════════════════════════════════════════

function drawIbanBlock(ctx: Ctx): void {
  const { doc, company } = ctx;

  if (!s(company.iban)) return;

  ensureSpace(ctx, 90);

  const x = MG;
  const w = CW;
  const h = 72;

  // Background + border
  doc.roundedRect(x, ctx.y, w, h, 6).fill(C.accentBg);
  doc.roundedRect(x, ctx.y, w, h, 6)
    .strokeColor(C.accentBorder).lineWidth(1).stroke();

  const y = ctx.y;

  // Title
  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.accent);
  doc.text('VIREMENT BANCAIRE', x + 16, y + 12, { width: w - 32 });

  // IBAN — monospace feel
  doc.font('Courier').fontSize(9).fillColor(C.primary);
  doc.text(fmtIban(s(company.iban)!), x + 16, y + 28, { width: w - 32 });

  // BIC + holder
  doc.font('Helvetica').fontSize(8).fillColor(C.textSec);
  let bicLine = '';
  if (s(company.bic)) bicLine = `BIC : ${s(company.bic)}`;
  if (s(company.bankName)) bicLine += (bicLine ? '   |   ' : '') + s(company.bankName)!;
  if (bicLine) doc.text(bicLine, x + 16, y + 42, { width: w - 32 });

  if (s(company.accountHolder)) {
    doc.text(`Titulaire : ${s(company.accountHolder)}`, x + 16, y + 54, { width: w - 32 });
  }

  ctx.y += h + 14;
}

// ═══════════════════════════════════════════════════════════════
// SECTION — CONDITIONS
// ═══════════════════════════════════════════════════════════════

function drawConditions(ctx: Ctx): void {
  const { doc, company } = ctx;
  const { docType } = ctx;

  ensureSpace(ctx, 100);

  // Title
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.primary);
  doc.text(docType === 'devis' ? 'CONDITIONS' : 'CONDITIONS DE PAIEMENT', MG, ctx.y);
  ctx.y += 4;
  doc.moveTo(MG, ctx.y).lineTo(MG + CW, ctx.y).strokeColor(C.border).lineWidth(0.3).stroke();
  ctx.y += 8;

  doc.font('Helvetica').fontSize(7.5).fillColor(C.textSec);
  const terms = s(company.paymentTerms) || '30 jours';

  if (docType === 'devis') {
    // Validity
    doc.text(`Ce devis est valable 30 jours a compter de sa date d\u2019emission.`, MG, ctx.y, { width: CW });
    ctx.y += 12;
    doc.text(`Paiement a ${terms} de la reception de la facture.`, MG, ctx.y, { width: CW });
    ctx.y += 12;
    if (s(company.earlyDiscount) && s(company.earlyDiscountDays)) {
      doc.text(
        `Escompte de ${s(company.earlyDiscount)}% accordé pour paiement sous ${s(company.earlyDiscountDays)} jours.`,
        MG, ctx.y, { width: CW },
      );
      ctx.y += 12;
    }
  } else {
    // Invoice
    doc.text(`Paiement a ${terms} de la reception de la facture.`, MG, ctx.y, { width: CW });
    ctx.y += 12;

    // Late penalties
    const rate = company.latePenaltyRate || 3;
    if (ctx.ae) {
      doc.font('Helvetica-Oblique').fontSize(7).fillColor(C.textMuted);
      doc.text(
        `En cas de retard de paiement, indemnité forfaitaire pour frais de recouvrement de 40\u2026 (art. D441-5 du Code de Commerce).`,
        MG, ctx.y, { width: CW },
      );
      ctx.y += 12;
    } else {
      doc.text(
        `En cas de retard, pénalité de ${rate}% plus indemnité forfaitaire de 40\u2026 (art. D441-5 du Code de Commerce).`,
        MG, ctx.y, { width: CW },
      );
      ctx.y += 12;
    }

    if (s(company.earlyDiscount) && s(company.earlyDiscountDays)) {
      doc.font('Helvetica').fontSize(7.5).fillColor(C.textSec);
      doc.text(
        `Escompte de ${s(company.earlyDiscount)}% accordé pour paiement sous ${s(company.earlyDiscountDays)} jours.`,
        MG, ctx.y, { width: CW },
      );
      ctx.y += 12;
    }
  }

  ctx.y += 8;
}

// ═══════════════════════════════════════════════════════════════
// SECTION — SIGNATURE (devis only)
// ═══════════════════════════════════════════════════════════════

function drawSignature(ctx: Ctx): void {
  if (ctx.docType !== 'devis') return;

  const { doc } = ctx;
  ensureSpace(ctx, 100);

  const x = MG;
  const w = CW;
  const h = 80;

  // Dashed border
  doc.roundedRect(x, ctx.y, w, h, 4)
    .dash(3, { space: 3 })
    .strokeColor(C.textMuted)
    .lineWidth(0.8)
    .stroke();
  doc.undash();

  const y = ctx.y;

  // Title
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.primary);
  doc.text('BON POUR ACCORD', x + 14, y + 10, { width: w - 28 });

  // Description
  doc.font('Helvetica-Oblique').fontSize(7).fillColor(C.textSec);
  doc.text(
    'Je soussigné(e) reconnais avoir pris connaissance des presentes conditions et accepte le contenu de ce devis.',
    x + 14, y + 24, { width: w - 28 },
  );

  // Date line
  const lineY = y + 50;
  doc.font('Helvetica').fontSize(7).fillColor(C.textMuted);
  doc.text('Date', x + 14, lineY - 8);
  doc.moveTo(x + 14, lineY + 2).lineTo(x + w * 0.35, lineY + 2)
    .strokeColor(C.textMuted).lineWidth(0.5).stroke();

  // Signature line
  doc.text('Signature et cachet', x + w * 0.55, lineY - 8);
  doc.moveTo(x + w * 0.55, lineY + 2).lineTo(x + w - 14, lineY + 2)
    .strokeColor(C.textMuted).lineWidth(0.5).stroke();

  ctx.y += h + 14;
}

// ═══════════════════════════════════════════════════════════════
// MAIN BUILDERS
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
      // First page
      doc.addPage();

      const ctx: Ctx = {
        doc,
        y: MG,
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

      drawAccentBar(ctx);
      drawHeader(ctx);

      // Thin separator after header
      ctx.y += 2;
      doc.moveTo(MG, ctx.y).lineTo(MG + CW, ctx.y)
        .strokeColor(C.border).lineWidth(0.5).stroke();
      ctx.y += 12;

      drawClientCard(ctx);
      drawItemsTable(ctx);
      drawTotals(ctx);
      drawIbanBlock(ctx);
      drawConditions(ctx);
      drawSignature(ctx);

      // Footer on last page
      drawFooter(ctx);

      // 🔥 sécurité : toujours finir proprement
      doc.flushPages();
      doc.end();
    } catch (err) {
      doc.destroy();
      reject(err);
    }
  });
}

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
