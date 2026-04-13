import PDFDocument from 'pdfkit';
import type { Client, Devis, DevisItem, Invoice, InvoiceItem } from '@prisma/client';

type DocType = 'devis' | 'invoice';
type BillingItem = DevisItem | InvoiceItem;

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
  website?: string | null;
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

interface TotalsBreakdown {
  grossHt: number;
  discountRate: number;
  discountAmount: number;
  netHt: number;
  vatByRate: Array<{ rate: number; amount: number }>;
  totalVat: number;
  totalTtc: number;
}

interface Ctx {
  doc: PDFDocument;
  y: number;
  pageNum: number;
  company: CompanyInfo;
  client: Client;
  ae: boolean;
  docType: DocType;
  docNumber: string;
  issueDate: Date;
  extraDate?: Date;
  devisNumber?: string | null;
  items: BillingItem[];
  globalDiscount: number;
  documentNotes?: string | null;
  totals: TotalsBreakdown;
}

interface ColWidths {
  desc: number;
  qty: number;
  unit: number;
  pu: number;
  tva?: number;
  total: number;
}

interface CgvSection {
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

const C = {
  primary: '#0f172a',
  accent: '#2563eb',
  accentSoft: '#dbeafe',
  accentBorder: '#93c5fd',
  white: '#ffffff',
  bgLight: '#f8fafc',
  bgStripe: '#f1f5f9',
  text: '#1e293b',
  textSec: '#475569',
  textMuted: '#94a3b8',
  border: '#dbe3ef',
  success: '#16a34a',
};

const NEOVOLT_CGV_SECTIONS: CgvSection[] = [
  {
    title: '1. Objet',
    paragraphs: [
      "Les présentes Conditions Générales de Vente (CGV) définissent les modalités d'intervention de la société NeoVolt, spécialisée en travaux d'électricité générale, auprès de ses clients professionnels et particuliers.",
      'Toute signature de devis implique l’acceptation sans réserve des présentes CGV.',
    ],
  },
  {
    title: '2. Devis et commande',
    paragraphs: ['Les devis émis par NeoVolt sont valables pour une durée de 30 jours à compter de leur date d’émission.'],
    bullets: [
      'signature du devis avec la mention « Bon pour accord »',
      "versement de l'acompte prévu",
    ],
  },
  {
    title: '3. Modalités de paiement',
    paragraphs: [
      'Un acompte de 30 % est exigible à la signature du devis pour toute prestation supérieure à 500 €.',
      'Le solde est payable à réception de la facture, par virement bancaire, sans escompte.',
      'Aucun escompte ne sera accordé pour paiement anticipé.',
    ],
  },
  {
    title: '4. Retard de paiement',
    paragraphs: [
      'Tout retard de paiement entraînera, de plein droit et sans mise en demeure préalable :',
      "conformément à l'article L441-10 du Code de commerce.",
      "NeoVolt se réserve le droit de suspendre toute intervention en cours en cas de non-paiement.",
    ],
    bullets: [
      'l’application de pénalités calculées sur la base du taux directeur de la Banque Centrale Européenne majoré de 10 points',
      'une indemnité forfaitaire de 40 € pour frais de recouvrement',
    ],
  },
  {
    title: "5. Délais d'intervention",
    paragraphs: ['Les délais d’intervention sont donnés à titre indicatif.'],
    bullets: [
      'indisponibilité des matériaux',
      'conditions climatiques',
      'contraintes techniques imprévues',
      'retard imputable au client',
    ],
  },
  {
    title: '6. Exécution des travaux',
    paragraphs: [
      'Les travaux sont réalisés conformément au devis accepté.',
      "Toute modification demandée en cours de prestation fera l'objet d'un devis complémentaire.",
      "Le client s'engage à :",
    ],
    bullets: [
      "garantir l'accès au chantier",
      'fournir un environnement sécurisé',
      'signaler toute contrainte technique connue',
    ],
  },
  {
    title: '7. Réserve de propriété',
    paragraphs: ['Les équipements, matériels et installations fournis restent la propriété de NeoVolt jusqu’au paiement intégral de la facture.'],
  },
  {
    title: '8. Responsabilité',
    paragraphs: [
      "NeoVolt est tenu à une obligation de moyens dans l'exécution de ses prestations.",
      'La responsabilité de NeoVolt ne pourra être engagée en cas de :',
    ],
    bullets: [
      'mauvaise utilisation des installations',
      "intervention d'un tiers",
      "défaut non détectable lors de l'intervention",
    ],
  },
  {
    title: '9. Garanties',
    paragraphs: ['Les prestations bénéficient des garanties légales en vigueur :'],
    bullets: [
      'garantie de parfait achèvement',
      'garantie biennale',
      'garantie décennale (si applicable)',
    ],
  },
  {
    title: '10. Annulation',
    paragraphs: ['Toute annulation de commande après signature pourra entraîner la facturation :'],
    bullets: [
      "de l'acompte versé (conservé)",
      'des frais engagés (matériel, déplacement, main-d’œuvre)',
    ],
  },
  {
    title: '11. Litiges et juridiction compétente',
    paragraphs: ['Tout litige relatif à l’exécution des prestations sera soumis aux tribunaux compétents du ressort du siège social de NeoVolt, sauf disposition légale contraire.'],
  },
  {
    title: '12. Droit applicable',
    paragraphs: ['Les présentes CGV sont soumises au droit français.'],
  },
  {
    title: "13. Clause d'arrêt immédiat chantier",
    paragraphs: ['NeoVolt se réserve le droit d’interrompre immédiatement les travaux en cas de défaut de paiement ou de non-respect des conditions contractuelles, sans que cela n’engage sa responsabilité.'],
  },
  {
    title: '14. Clause de réception chantier',
    paragraphs: ['Les travaux sont réputés réceptionnés sans réserve si aucune contestation écrite n’est formulée dans un délai de 48 heures après intervention.'],
  },
  {
    title: '15. Clause matériaux / hausse prix',
    paragraphs: ['En cas de variation significative du coût des matériaux, NeoVolt se réserve le droit d’ajuster les tarifs après information du client.'],
  },
];

const PW = 595.28;
const PH = 841.89;
const MG = 45;
const CW = PW - 2 * MG;
const FOOTER_Y = PH - 38;
const CONTENT_BOTTOM = FOOTER_Y - 12;

function clean(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function toNum(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function fmtCur(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
}

function fmtDate(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function fmtQty(value: number): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 }).format(value);
}

function fmtPercent(value: number): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(value);
}

function isAE(legalForm?: string | null): boolean {
  const lf = clean(legalForm).toLowerCase();
  if (!lf) return false;
  return (
    lf.includes('auto-entrepreneur') ||
    lf.includes('auto entrepreneur') ||
    lf.includes('micro-entreprise') ||
    lf.includes('micro entreprise')
  );
}

function fmtIban(iban: string): string {
  return iban.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
}

function measureText(
  doc: PDFDocument,
  text: string,
  width: number,
  font: 'Helvetica' | 'Helvetica-Bold' | 'Helvetica-Oblique' = 'Helvetica',
  size = 8,
): number {
  doc.font(font).fontSize(size);
  return doc.heightOfString(text || ' ', { width });
}

function companyDisplayName(company: CompanyInfo): string {
  const companyName = clean(company.companyName);
  if (companyName) return companyName;
  const person = `${clean(company.firstName)} ${clean(company.name)}`.trim();
  return person || 'Mon entreprise';
}

function companyAddressLine(company: CompanyInfo): string {
  return [clean(company.postalCode), clean(company.city)].filter(Boolean).join(' ');
}

function clientName(client: Client): string {
  return clean(client.company) || clean(client.name) || 'Client';
}

function clientAddressLine(client: Client): string {
  return [clean(client.postalCode), clean(client.city)].filter(Boolean).join(' ');
}

function computeTotals(items: BillingItem[], globalDiscount: number, ae: boolean): TotalsBreakdown {
  const grossHt = items.reduce((sum, item) => sum + toNum(item.quantity) * toNum(item.unitPrice), 0);
  const discountRate = clamp(toNum(globalDiscount), 0, 100);
  const discountAmount = grossHt * (discountRate / 100);
  const netHt = Math.max(0, grossHt - discountAmount);

  const vatMap = new Map<number, number>();
  if (!ae) {
    const ratio = grossHt > 0 ? netHt / grossHt : 1;

    for (const item of items) {
      const lineGross = toNum(item.quantity) * toNum(item.unitPrice);
      const lineNet = lineGross * ratio;
      const rate = Math.max(0, toNum(item.tvaRate));
      if (rate <= 0 || lineNet <= 0) continue;
      const lineVat = lineNet * (rate / 100);
      vatMap.set(rate, (vatMap.get(rate) ?? 0) + lineVat);
    }
  }

  const vatByRate = Array.from(vatMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([rate, amount]) => ({ rate, amount }));

  const totalVat = vatByRate.reduce((sum, line) => sum + line.amount, 0);
  const totalTtc = netHt + totalVat;

  return {
    grossHt,
    discountRate,
    discountAmount,
    netHt,
    vatByRate,
    totalVat,
    totalTtc,
  };
}

function rowHeight(doc: PDFDocument, designation: string, description: string, width: number): number {
  let h = 10;
  if (designation) h += measureText(doc, designation, width, 'Helvetica-Bold', 8.3);
  if (description) h += measureText(doc, description, width, 'Helvetica', 7.3) + 1;
  return Math.max(30, h + 8);
}

function drawAccentBar(ctx: Ctx): void {
  ctx.doc.rect(0, 0, PW, 4).fill(C.accent);
  ctx.doc.rect(0, 4, PW, 1).fill(C.accentSoft);
}

function drawFooter(ctx: Ctx): void {
  const { doc, pageNum, company } = ctx;
  const savedY = doc.y;

  doc
    .moveTo(MG, FOOTER_Y - 8)
    .lineTo(PW - MG, FOOTER_Y - 8)
    .strokeColor(C.border)
    .lineWidth(0.5)
    .stroke();

  doc.font('Helvetica').fontSize(6).fillColor(C.textMuted);
  doc.text(companyDisplayName(company), MG, FOOTER_Y - 2, { width: CW * 0.25 });

  const legalParts: string[] = [];
  if (clean(company.siret)) legalParts.push(`SIRET ${clean(company.siret)}`);
  if (clean(company.rcsNumber)) legalParts.push(`RCS ${clean(company.rcsNumber)}`);
  if (ctx.ae) {
    legalParts.push('TVA non applicable - art. 293 B CGI');
  } else if (clean(company.tvaNumber)) {
    legalParts.push(`TVA intracom ${clean(company.tvaNumber)}`);
  }
  if (clean(company.website)) legalParts.push(clean(company.website));
  doc.text(legalParts.join(' | '), MG + CW * 0.25, FOOTER_Y - 2, {
    width: CW * 0.5,
    align: 'center',
  });

  doc.text(`Page ${pageNum}`, PW - MG - 50, FOOTER_Y - 2, { width: 50, align: 'right' });
  doc.y = savedY;
}

function doNewPage(ctx: Ctx): void {
  drawFooter(ctx);
  ctx.doc.addPage();
  ctx.pageNum += 1;
  ctx.y = MG;

  drawAccentBar(ctx);
  const label = ctx.docType === 'devis' ? 'DEVIS' : 'FACTURE';
  ctx.doc.font('Helvetica-Bold').fontSize(8).fillColor(C.primary);
  ctx.doc.text(`${label} N° ${ctx.docNumber}`, MG, 13, { width: CW * 0.6 });
  ctx.doc.font('Helvetica').fontSize(7).fillColor(C.textSec);
  ctx.doc.text(`Date d'émission : ${fmtDate(ctx.issueDate)}`, MG + CW * 0.4, 13, {
    width: CW * 0.6,
    align: 'right',
  });
  ctx.y = 34;
}

function ensureSpace(ctx: Ctx, needed: number, tableMode = false): void {
  if (ctx.y + needed <= CONTENT_BOTTOM) return;

  doNewPage(ctx);
  if (tableMode) drawTableHeader(ctx, getColWidths(ctx.ae));
}

function drawHeader(ctx: Ctx): void {
  const { doc, company } = ctx;
  const lx = MG;
  const leftW = CW * 0.56;
  const gap = 14;
  const rx = lx + leftW + gap;
  const rw = CW - leftW - gap;
  let ly = 18;

  if (clean(company.logoBase64) && clean(company.logoMimeType)) {
    try {
      const buffer = Buffer.from(clean(company.logoBase64), 'base64');
      if (buffer.length > 0) {
        doc.image(buffer, lx, ly, { fit: [74, 40] });
        ly += 44;
      }
    } catch {
      // Ignore corrupted logos and continue PDF rendering.
    }
  }

  const name = companyDisplayName(company);
  const nameHeight = measureText(doc, name, leftW, 'Helvetica-Bold', 16);
  doc.font('Helvetica-Bold').fontSize(16).fillColor(C.primary).text(name, lx, ly, { width: leftW });
  ly += nameHeight + 4;

  const identityLines: string[] = [];
  if (clean(company.address)) identityLines.push(clean(company.address));
  if (clean(company.addressComplement)) identityLines.push(clean(company.addressComplement));
  if (companyAddressLine(company)) identityLines.push(companyAddressLine(company));

  const contact = [clean(company.phone), clean(company.professionalEmail), clean(company.website)]
    .filter(Boolean)
    .join(' | ');
  if (contact) identityLines.push(contact);

  const legal = [clean(company.siret) ? `SIRET ${clean(company.siret)}` : '', clean(company.rcsNumber) ? `RCS ${clean(company.rcsNumber)}` : '']
    .filter(Boolean)
    .join(' | ');
  if (legal) identityLines.push(legal);

  if (ctx.ae) {
    identityLines.push('TVA non applicable - article 293 B du CGI');
  } else if (clean(company.tvaNumber)) {
    identityLines.push(`TVA intracommunautaire : ${clean(company.tvaNumber)}`);
  }

  doc.font('Helvetica').fontSize(7.3).fillColor(C.textSec);
  for (const line of identityLines) {
    const lineHeight = measureText(doc, line, leftW, 'Helvetica', 7.3);
    doc.text(line, lx, ly, { width: leftW });
    ly += lineHeight + 2;
  }

  const cardY = 18;
  const cardPad = 11;
  const label = ctx.docType === 'devis' ? 'DEVIS' : 'FACTURE';
  const rows: Array<{ key: string; value: string }> = [
    { key: 'Numéro', value: ctx.docNumber },
    { key: "Date d'émission", value: fmtDate(ctx.issueDate) },
  ];

  if (ctx.extraDate) {
    rows.push({
      key: ctx.docType === 'devis' ? 'Validité' : 'Échéance',
      value: fmtDate(ctx.extraDate),
    });
  }

  if (clean(ctx.devisNumber)) {
    rows.push({ key: 'Réf. devis', value: clean(ctx.devisNumber) });
  }

  const cardH = 28 + rows.length * 16 + cardPad;
  doc.roundedRect(rx, cardY, rw, cardH, 8).fill(C.bgLight);
  doc.roundedRect(rx, cardY, rw, cardH, 8).strokeColor(C.accentBorder).lineWidth(0.8).stroke();

  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.accent).text(label, rx + cardPad, cardY + 10, { width: rw - cardPad * 2 });

  let rowY = cardY + 26;
  for (const row of rows) {
    doc.font('Helvetica').fontSize(7.4).fillColor(C.textSec).text(row.key, rx + cardPad, rowY, { width: rw * 0.42 });
    doc.font('Helvetica-Bold').fontSize(8.3).fillColor(C.primary).text(row.value, rx + rw * 0.36, rowY, {
      width: rw * 0.64 - cardPad,
      align: 'right',
    });
    rowY += 16;
  }

  ctx.y = Math.max(ly, cardY + cardH) + 12;
}

function drawClientCard(ctx: Ctx): void {
  const { doc, company, client } = ctx;
  const x = MG;
  const w = CW;
  const split = x + w * 0.67;
  const pad = 12;

  const leftLines: string[] = [clientName(client)];
  if (clean(client.company) && clean(client.name)) leftLines.push(clean(client.name));
  if (clean(client.address)) leftLines.push(clean(client.address));
  if (clean(client.addressComplement)) leftLines.push(clean(client.addressComplement));
  if (clientAddressLine(client)) leftLines.push(clientAddressLine(client));
  if (clean(client.siret)) leftLines.push(`SIRET ${clean(client.siret)}`);
  if (clean(client.email)) leftLines.push(clean(client.email));
  if (clean(client.phone)) leftLines.push(clean(client.phone));

  const rightLines: string[] = [];
  rightLines.push(`Conditions : ${clean(company.paymentTerms) || '30 jours'}`);
  rightLines.push(`Montant TTC : ${fmtCur(ctx.totals.totalTtc)}`);
  if (ctx.docType === 'devis' && ctx.extraDate) {
    rightLines.push(`Valide jusqu'au : ${fmtDate(ctx.extraDate)}`);
  }
  if (ctx.docType === 'invoice' && ctx.extraDate) {
    rightLines.push(`Échéance : ${fmtDate(ctx.extraDate)}`);
  }
  if (clean(ctx.devisNumber)) rightLines.push(`Réf. devis : ${clean(ctx.devisNumber)}`);

  const leftHeight = 22 + leftLines.length * 10;
  const rightHeight = 22 + rightLines.length * 10;
  const h = Math.max(84, 20 + Math.max(leftHeight, rightHeight));

  ensureSpace(ctx, h + 10);

  doc.roundedRect(x, ctx.y, w, h, 7).fill(C.white);
  doc.roundedRect(x, ctx.y, w, h, 7).strokeColor(C.border).lineWidth(0.7).stroke();
  doc
    .moveTo(split, ctx.y + 8)
    .lineTo(split, ctx.y + h - 8)
    .strokeColor(C.border)
    .lineWidth(0.5)
    .stroke();

  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.accent);
  doc.text('CLIENT', x + pad, ctx.y + pad);
  doc.text('RÉCAPITULATIF', split + pad, ctx.y + pad);

  let ly = ctx.y + pad + 14;
  doc.font('Helvetica').fontSize(8).fillColor(C.text);
  for (const line of leftLines) {
    doc.text(line, x + pad, ly, { width: split - x - pad * 2 });
    ly += 10;
  }

  let ry = ctx.y + pad + 14;
  doc.font('Helvetica').fontSize(7.6).fillColor(C.textSec);
  for (const line of rightLines) {
    doc.text(line, split + pad, ry, { width: x + w - split - pad * 2 });
    ry += 10;
  }

  ctx.y += h + 12;
}

function getColWidths(ae: boolean): ColWidths {
  if (ae) {
    return {
      desc: CW * 0.45,
      qty: CW * 0.11,
      unit: CW * 0.11,
      pu: CW * 0.16,
      total: CW * 0.17,
    };
  }

  return {
    desc: CW * 0.37,
    qty: CW * 0.1,
    unit: CW * 0.1,
    pu: CW * 0.14,
    tva: CW * 0.09,
    total: CW * 0.2,
  };
}

function drawTableHeader(ctx: Ctx, cols: ColWidths): void {
  const { doc } = ctx;
  const x = MG;
  const h = 24;

  doc.roundedRect(x, ctx.y, CW, h, 4).fill(C.primary);

  doc.font('Helvetica-Bold').fontSize(7.3).fillColor(C.white);
  let cx = x;
  doc.text('Description', cx + 6, ctx.y + 8, { width: cols.desc - 12 });
  cx += cols.desc;
  doc.text('Qté', cx + 2, ctx.y + 8, { width: cols.qty - 4, align: 'center' });
  cx += cols.qty;
  doc.text('Unité', cx + 2, ctx.y + 8, { width: cols.unit - 4, align: 'center' });
  cx += cols.unit;
  doc.text('P.U. HT', cx + 2, ctx.y + 8, { width: cols.pu - 4, align: 'right' });
  cx += cols.pu;
  if (!ctx.ae && cols.tva) {
    doc.text('TVA', cx + 2, ctx.y + 8, { width: cols.tva - 4, align: 'center' });
    cx += cols.tva;
  }
  doc.text('Total HT', cx + 2, ctx.y + 8, { width: cols.total - 8, align: 'right' });

  ctx.y += h;
}

function drawTableRow(ctx: Ctx, item: BillingItem, cols: ColWidths, index: number): void {
  const { doc } = ctx;
  const designation = clean(item.designation);
  const description = clean(item.description);
  const rowH = rowHeight(doc, designation, description, cols.desc - 12);

  ensureSpace(ctx, rowH, true);

  if (index % 2 === 1) {
    doc.rect(MG, ctx.y, CW, rowH).fill(C.bgStripe);
  }

  doc
    .moveTo(MG, ctx.y + rowH - 0.5)
    .lineTo(MG + CW, ctx.y + rowH - 0.5)
    .strokeColor(C.border)
    .lineWidth(0.3)
    .stroke();

  const separators: number[] = [];
  let currentX = MG + cols.desc;
  separators.push(currentX);
  currentX += cols.qty;
  separators.push(currentX);
  currentX += cols.unit;
  separators.push(currentX);
  currentX += cols.pu;
  separators.push(currentX);
  if (!ctx.ae && cols.tva) {
    currentX += cols.tva;
    separators.push(currentX);
  }
  for (const sepX of separators) {
    doc
      .moveTo(sepX, ctx.y)
      .lineTo(sepX, ctx.y + rowH)
      .strokeColor(C.border)
      .lineWidth(0.2)
      .stroke();
  }

  const pad = 6;
  let cx = MG;

  doc.font('Helvetica-Bold').fontSize(8.3).fillColor(C.text);
  doc.text(designation || 'Ligne', cx + pad, ctx.y + 6, { width: cols.desc - pad * 2 });
  if (description) {
    const titleHeight = measureText(doc, designation || ' ', cols.desc - pad * 2, 'Helvetica-Bold', 8.3);
    doc.font('Helvetica').fontSize(7.2).fillColor(C.textSec);
    doc.text(description, cx + pad, ctx.y + 7 + titleHeight, { width: cols.desc - pad * 2 });
  }
  cx += cols.desc;

  doc.font('Helvetica').fontSize(8).fillColor(C.text);
  doc.text(fmtQty(toNum(item.quantity)), cx + 3, ctx.y + 6, { width: cols.qty - 6, align: 'center' });
  cx += cols.qty;

  doc.text(clean(item.unit) || 'unité', cx + 3, ctx.y + 6, { width: cols.unit - 6, align: 'center' });
  cx += cols.unit;

  doc.text(fmtCur(toNum(item.unitPrice)), cx + 3, ctx.y + 6, { width: cols.pu - 6, align: 'right' });
  cx += cols.pu;

  if (!ctx.ae && cols.tva) {
    doc.text(`${fmtPercent(toNum(item.tvaRate))}%`, cx + 3, ctx.y + 6, { width: cols.tva - 6, align: 'center' });
    cx += cols.tva;
  }

  const lineTotal = toNum(item.quantity) * toNum(item.unitPrice);
  doc.font('Helvetica-Bold').fontSize(8.3).fillColor(C.text);
  doc.text(fmtCur(lineTotal), cx + 3, ctx.y + 6, { width: cols.total - 6, align: 'right' });

  ctx.y += rowH;
}

function drawItemsTable(ctx: Ctx): void {
  const cols = getColWidths(ctx.ae);

  ensureSpace(ctx, 32);
  drawTableHeader(ctx, cols);

  if (ctx.items.length === 0) {
    const emptyH = 32;
    ensureSpace(ctx, emptyH, true);
    ctx.doc.rect(MG, ctx.y, CW, emptyH).fill(C.bgLight);
    ctx.doc.font('Helvetica-Oblique').fontSize(8).fillColor(C.textMuted);
    ctx.doc.text('Aucune ligne de facturation', MG + 8, ctx.y + 11, { width: CW - 16, align: 'center' });
    ctx.y += emptyH;
    ctx.y += 8;
    return;
  }

  for (let i = 0; i < ctx.items.length; i += 1) {
    drawTableRow(ctx, ctx.items[i], cols, i);
  }

  ctx.y += 10;
}

function drawNotesBlock(ctx: Ctx): void {
  const notes: Array<{ title: string; body: string }> = [];
  if (clean(ctx.documentNotes)) {
    notes.push({
      title: ctx.docType === 'devis' ? 'Notes du devis' : 'Notes de facture',
      body: clean(ctx.documentNotes),
    });
  }
  if (clean(ctx.company.customNotes)) {
    notes.push({
      title: "Informations complémentaires de l'entreprise",
      body: clean(ctx.company.customNotes),
    });
  }
  if (notes.length === 0) return;

  const pad = 12;
  const width = CW - pad * 2;
  let h = 20;
  for (const block of notes) {
    h += measureText(ctx.doc, block.title, width, 'Helvetica-Bold', 7.6);
    h += 2;
    h += measureText(ctx.doc, block.body, width, 'Helvetica', 7.3);
    h += 8;
  }

  ensureSpace(ctx, h + 10);

  ctx.doc.roundedRect(MG, ctx.y, CW, h, 6).fill(C.bgLight);
  ctx.doc.roundedRect(MG, ctx.y, CW, h, 6).strokeColor(C.border).lineWidth(0.6).stroke();

  let y = ctx.y + 10;
  for (const block of notes) {
    ctx.doc.font('Helvetica-Bold').fontSize(7.6).fillColor(C.primary);
    ctx.doc.text(block.title, MG + pad, y, { width });
    y += measureText(ctx.doc, block.title, width, 'Helvetica-Bold', 7.6) + 2;

    ctx.doc.font('Helvetica').fontSize(7.3).fillColor(C.textSec);
    ctx.doc.text(block.body, MG + pad, y, { width });
    y += measureText(ctx.doc, block.body, width, 'Helvetica', 7.3) + 8;
  }

  ctx.y += h + 12;
}

function drawTotals(ctx: Ctx): void {
  const { doc, totals } = ctx;
  const rows: Array<{ label: string; value: string }> = [
    { label: 'Total HT brut', value: fmtCur(totals.grossHt) },
  ];

  if (totals.discountAmount > 0) {
    rows.push({
      label: `Remise (${fmtPercent(totals.discountRate)}%)`,
      value: `- ${fmtCur(totals.discountAmount)}`,
    });
  }

  rows.push({ label: 'Total HT net', value: fmtCur(totals.netHt) });

  if (!ctx.ae) {
    for (const vat of totals.vatByRate) {
      rows.push({ label: `TVA ${fmtPercent(vat.rate)}%`, value: fmtCur(vat.amount) });
    }
    rows.push({ label: 'Total TVA', value: fmtCur(totals.totalVat) });
  } else {
    rows.push({ label: 'TVA', value: 'Non applicable (art. 293 B CGI)' });
  }

  const boxW = CW * 0.46;
  const x = MG + CW - boxW;
  const rowH = 15;
  const h = 20 + rows.length * rowH + 38;

  ensureSpace(ctx, h + 10);

  doc.roundedRect(x, ctx.y, boxW, h, 8).fill(C.white);
  doc.roundedRect(x, ctx.y, boxW, h, 8).strokeColor(C.border).lineWidth(0.8).stroke();

  let y = ctx.y + 12;
  doc.font('Helvetica-Bold').fontSize(8.3).fillColor(C.primary);
  doc.text('RÉCAPITULATIF FINANCIER', x + 10, y, { width: boxW - 20 });
  y += 14;

  for (const row of rows) {
    doc.font('Helvetica').fontSize(8).fillColor(C.textSec).text(row.label, x + 10, y, { width: boxW * 0.55 });
    doc.font('Helvetica').fontSize(8).fillColor(C.text).text(row.value, x + boxW * 0.45, y, {
      width: boxW * 0.55 - 12,
      align: 'right',
    });
    y += rowH;
  }

  doc
    .moveTo(x + 10, y + 2)
    .lineTo(x + boxW - 10, y + 2)
    .strokeColor(C.accentBorder)
    .lineWidth(0.8)
    .stroke();
  y += 8;

  doc.roundedRect(x + 10, y, boxW - 20, 26, 6).fill(C.accentSoft);
  doc.roundedRect(x + 10, y, boxW - 20, 26, 6).strokeColor(C.accentBorder).lineWidth(0.7).stroke();
  doc.font('Helvetica-Bold').fontSize(11).fillColor(C.accent);
  doc.text('TOTAL TTC', x + 16, y + 7, { width: boxW * 0.45 });
  doc.font('Helvetica-Bold').fontSize(14).fillColor(C.primary);
  doc.text(fmtCur(totals.totalTtc), x + boxW * 0.45, y + 5, {
    width: boxW * 0.55 - 16,
    align: 'right',
  });

  ctx.y += h + 12;
}

function drawIbanBlock(ctx: Ctx): void {
  const { doc, company } = ctx;
  if (!clean(company.iban)) return;

  const h = 76;
  ensureSpace(ctx, h + 10);

  doc.roundedRect(MG, ctx.y, CW, h, 6).fill(C.accentSoft);
  doc.roundedRect(MG, ctx.y, CW, h, 6).strokeColor(C.accentBorder).lineWidth(0.9).stroke();

  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.accent);
  doc.text('RÈGLEMENT PAR VIREMENT BANCAIRE', MG + 14, ctx.y + 10, { width: CW - 28 });

  doc.font('Courier').fontSize(9.2).fillColor(C.primary);
  doc.text(fmtIban(clean(company.iban)), MG + 14, ctx.y + 28, { width: CW - 28 });

  const bankParts = [clean(company.bic) ? `BIC : ${clean(company.bic)}` : '', clean(company.bankName)]
    .filter(Boolean)
    .join(' | ');
  if (bankParts) {
    doc.font('Helvetica').fontSize(7.8).fillColor(C.textSec);
    doc.text(bankParts, MG + 14, ctx.y + 44, { width: CW - 28 });
  }

  if (clean(company.accountHolder)) {
    doc.font('Helvetica').fontSize(7.8).fillColor(C.textSec);
    doc.text(`Titulaire : ${clean(company.accountHolder)}`, MG + 14, ctx.y + 56, { width: CW - 28 });
  }

  ctx.y += h + 12;
}

function drawConditions(ctx: Ctx): void {
  const { doc, company } = ctx;
  const terms = clean(company.paymentTerms) || '30 jours';
  const earlyDiscount = toNum(company.earlyDiscount);
  const earlyDiscountDays = Math.round(toNum(company.earlyDiscountDays));
  const latePenaltyRate = toNum(company.latePenaltyRate) > 0 ? toNum(company.latePenaltyRate) : 3;

  const lines: string[] = [];
  if (ctx.docType === 'devis') {
    if (ctx.extraDate) {
      lines.push(`Validité du devis : offre valable jusqu'au ${fmtDate(ctx.extraDate)}.`);
    }
    lines.push(`Règlement : paiement à ${terms} à réception de facture.`);
    if (earlyDiscount > 0 && earlyDiscountDays > 0) {
      lines.push(`Escompte : ${fmtPercent(earlyDiscount)}% accordé pour paiement sous ${earlyDiscountDays} jours.`);
    } else {
      lines.push('Escompte : néant pour paiement anticipé.');
    }
    lines.push("L'acceptation du devis se fait par signature précédée de la mention « Bon pour accord ».");
  } else {
    lines.push(`Conditions de règlement : paiement à ${terms} à compter de la date d'émission.`);
    if (earlyDiscount > 0 && earlyDiscountDays > 0) {
      lines.push(`Escompte : ${fmtPercent(earlyDiscount)}% accordé pour paiement sous ${earlyDiscountDays} jours.`);
    } else {
      lines.push('Escompte pour paiement anticipé : néant.');
    }
    lines.push(`Pénalités de retard exigibles au taux annuel de ${fmtPercent(latePenaltyRate)}%.`);
    lines.push('Indemnité forfaitaire pour frais de recouvrement : 40 € (article D441-5 du Code de commerce).');
  }

  if (ctx.ae) {
    lines.push('TVA non applicable, article 293 B du CGI.');
  }

  const pad = 12;
  const textWidth = CW - pad * 2;
  let h = 26;
  for (const line of lines) {
    h += measureText(doc, `- ${line}`, textWidth, 'Helvetica', 7.4) + 3;
  }

  ensureSpace(ctx, h + 10);

  doc.roundedRect(MG, ctx.y, CW, h, 6).fill(C.bgLight);
  doc.roundedRect(MG, ctx.y, CW, h, 6).strokeColor(C.border).lineWidth(0.6).stroke();
  doc.font('Helvetica-Bold').fontSize(8.2).fillColor(C.primary);
  doc.text(
    ctx.docType === 'devis' ? 'CONDITIONS COMMERCIALES' : 'CONDITIONS DE PAIEMENT ET MENTIONS LÉGALES',
    MG + pad,
    ctx.y + 10,
    { width: textWidth },
  );

  let y = ctx.y + 24;
  doc.font('Helvetica').fontSize(7.4).fillColor(C.textSec);
  for (const line of lines) {
    doc.text(`- ${line}`, MG + pad, y, { width: textWidth });
    y += measureText(doc, `- ${line}`, textWidth, 'Helvetica', 7.4) + 3;
  }

  ctx.y += h + 12;
}

function drawSignature(ctx: Ctx): void {
  if (ctx.docType !== 'devis') return;

  const { doc } = ctx;
  const h = 84;
  ensureSpace(ctx, h + 10);

  doc
    .roundedRect(MG, ctx.y, CW, h, 6)
    .dash(3, { space: 3 })
    .strokeColor(C.textMuted)
    .lineWidth(0.8)
    .stroke();
  doc.undash();

  doc.font('Helvetica-Bold').fontSize(8.8).fillColor(C.primary);
  doc.text('BON POUR ACCORD', MG + 14, ctx.y + 10, { width: CW - 28 });

  doc.font('Helvetica-Oblique').fontSize(7.1).fillColor(C.textSec);
  doc.text(
    "Je soussigné(e), confirme avoir pris connaissance des conditions ci-dessus et accepte le présent devis.",
    MG + 14,
    ctx.y + 24,
    { width: CW - 28 },
  );

  const lineY = ctx.y + 56;
  doc.font('Helvetica').fontSize(7).fillColor(C.textMuted);
  doc.text('Date', MG + 14, lineY - 8);
  doc
    .moveTo(MG + 14, lineY + 2)
    .lineTo(MG + CW * 0.34, lineY + 2)
    .strokeColor(C.textMuted)
    .lineWidth(0.5)
    .stroke();

  doc.text('Signature et cachet', MG + CW * 0.56, lineY - 8);
  doc
    .moveTo(MG + CW * 0.56, lineY + 2)
    .lineTo(MG + CW - 14, lineY + 2)
    .strokeColor(C.textMuted)
    .lineWidth(0.5)
    .stroke();

  ctx.y += h + 12;
}

function estimateCgvSectionHeight(doc: PDFDocument, section: CgvSection, width: number): number {
  let height = 10;
  height += measureText(doc, section.title, width, 'Helvetica-Bold', 8.2) + 3;

  for (const paragraph of section.paragraphs) {
    height += measureText(doc, paragraph, width, 'Helvetica', 7.2) + 2;
  }

  if (section.bullets) {
    for (const bullet of section.bullets) {
      height += measureText(doc, `- ${bullet}`, width, 'Helvetica', 7.2) + 2;
    }
  }

  return Math.max(34, height + 8);
}

function startCgvAnnexPage(ctx: Ctx, continuation = false): void {
  drawFooter(ctx);
  ctx.doc.addPage();
  ctx.pageNum += 1;
  ctx.y = MG;

  drawAccentBar(ctx);

  const title = continuation
    ? 'ANNEXE - CONDITIONS GENERALES DE VENTE (SUITE)'
    : 'ANNEXE - CONDITIONS GENERALES DE VENTE';

  ctx.doc.font('Helvetica-Bold').fontSize(9.2).fillColor(C.primary);
  ctx.doc.text(title, MG, 13, { width: CW * 0.7 });

  ctx.doc.font('Helvetica').fontSize(7).fillColor(C.textSec);
  ctx.doc.text(`${ctx.docType === 'devis' ? 'DEVIS' : 'FACTURE'} N° ${ctx.docNumber}`, MG + CW * 0.46, 13, {
    width: CW * 0.54,
    align: 'right',
  });

  const introHeight = continuation ? 24 : 40;
  ctx.doc.roundedRect(MG, 36, CW, introHeight, 6).fill(C.bgLight);
  ctx.doc.roundedRect(MG, 36, CW, introHeight, 6).strokeColor(C.border).lineWidth(0.6).stroke();

  ctx.doc.font('Helvetica-Bold').fontSize(8).fillColor(C.primary);
  ctx.doc.text('Société : NeoVolt', MG + 10, 44, { width: CW - 20 });

  ctx.doc.font('Helvetica').fontSize(7.2).fillColor(C.textSec);
  const introText = continuation
    ? 'Suite des clauses contractuelles annexées.'
    : "Les présentes CGV sont annexées au document et s'appliquent aux prestations d'électricité générale.";
  ctx.doc.text(introText, MG + 10, 56, { width: CW - 20 });

  ctx.y = 36 + introHeight + 10;
}

function drawCgvAnnex(ctx: Ctx): void {
  const { doc } = ctx;
  const padX = 11;
  const textWidth = CW - padX * 2;

  startCgvAnnexPage(ctx, false);

  const ensureCgvSpace = (needed: number): void => {
    if (ctx.y + needed <= CONTENT_BOTTOM) return;
    startCgvAnnexPage(ctx, true);
  };

  for (const section of NEOVOLT_CGV_SECTIONS) {
    const blockHeight = estimateCgvSectionHeight(doc, section, textWidth);
    ensureCgvSpace(blockHeight + 8);

    doc.roundedRect(MG, ctx.y, CW, blockHeight, 5).fill(C.white);
    doc.roundedRect(MG, ctx.y, CW, blockHeight, 5).strokeColor(C.border).lineWidth(0.45).stroke();

    let y = ctx.y + 8;

    doc.font('Helvetica-Bold').fontSize(8.2).fillColor(C.accent);
    doc.text(section.title, MG + padX, y, { width: textWidth });
    y += measureText(doc, section.title, textWidth, 'Helvetica-Bold', 8.2) + 3;

    doc.font('Helvetica').fontSize(7.2).fillColor(C.textSec);
    for (const paragraph of section.paragraphs) {
      doc.text(paragraph, MG + padX, y, { width: textWidth });
      y += measureText(doc, paragraph, textWidth, 'Helvetica', 7.2) + 2;
    }

    if (section.bullets) {
      for (const bullet of section.bullets) {
        const bulletText = `- ${bullet}`;
        doc.text(bulletText, MG + padX, y, { width: textWidth });
        y += measureText(doc, bulletText, textWidth, 'Helvetica', 7.2) + 2;
      }
    }

    ctx.y += blockHeight + 8;
  }
}

function buildDocument(
  company: CompanyInfo,
  client: Client,
  items: BillingItem[],
  globalDiscount: number,
  docType: DocType,
  docNumber: string,
  issueDate: Date,
  extraDate?: Date,
  devisNumber?: string | null,
  documentNotes?: string | null,
): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 0,
    autoFirstPage: false,
    pdfVersion: '1.7',
  });

  return new Promise((resolve, reject) => {
    const buffers: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    try {
      doc.addPage();

      const ae = isAE(company.legalForm);
      const totals = computeTotals(items, globalDiscount, ae);

      const ctx: Ctx = {
        doc,
        y: MG,
        pageNum: 1,
        company,
        client,
        ae,
        docType,
        docNumber,
        issueDate,
        extraDate,
        devisNumber,
        items,
        globalDiscount,
        documentNotes,
        totals,
      };

      drawAccentBar(ctx);
      drawHeader(ctx);

      ctx.y += 2;
      doc.moveTo(MG, ctx.y).lineTo(MG + CW, ctx.y).strokeColor(C.border).lineWidth(0.5).stroke();
      ctx.y += 12;

      drawClientCard(ctx);
      drawItemsTable(ctx);
      drawNotesBlock(ctx);
      drawTotals(ctx);
      drawIbanBlock(ctx);
      drawConditions(ctx);
      drawSignature(ctx);
      drawCgvAnnex(ctx);

      drawFooter(ctx);

      doc.flushPages();
      doc.end();
    } catch (error) {
      doc.destroy();
      reject(error);
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
    undefined,
    devis.notes,
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
    invoice.notes,
  );
}
