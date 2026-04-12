import PDFDocument from 'pdfkit';
import type { Devis, DevisItem, Client, Invoice, InvoiceItem } from '@prisma/client';

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
  directorName?: string | null;
  directorTitle?: string | null;
  logoBase64?: string | null;
  logoMimeType?: string | null;
  accentColor?: string;
  iban?: string | null;
  bic?: string | null;
  bankName?: string | null;
  accountHolder?: string | null;
  paymentTerms?: string;
  latePenaltyRate?: number;
  customNotes?: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/** Safely write text — skips null/undefined/empty values */
function safeText(
  doc: PDFDocument,
  text: string | null | undefined,
  x: number,
  y: number,
  options?: Record<string, unknown>,
): void {
  if (text !== null && text !== undefined && text !== '') {
    doc.text(String(text), x, y, options);
  }
}

function addItemRows(
  doc: PDFDocument,
  items: (DevisItem | InvoiceItem)[],
  startY: number,
  tableWidth: number,
): number {
  let y = startY;
  const colWidths = {
    description: tableWidth * 0.35,
    quantity: tableWidth * 0.08,
    unit: tableWidth * 0.08,
    unitPrice: tableWidth * 0.15,
    tvaRate: tableWidth * 0.1,
    total: tableWidth * 0.15,
  };

  // Header row
  doc.save();
  doc.rect(50, y, tableWidth, 22).fill('#f5f5f5');
  doc.fillColor('#333333');
  doc.font('Helvetica-Bold').fontSize(8);
  let x = 50;
  doc.text('Description', x + 4, y + 6, { width: colWidths.description });
  x += colWidths.description;
  doc.text('Qté', x + 4, y + 6, { width: colWidths.quantity, align: 'center' });
  x += colWidths.quantity;
  doc.text('Unité', x + 4, y + 6, { width: colWidths.unit, align: 'center' });
  x += colWidths.unit;
  doc.text('P.U. HT', x + 4, y + 6, { width: colWidths.unitPrice, align: 'right' });
  x += colWidths.unitPrice;
  doc.text('TVA', x + 4, y + 6, { width: colWidths.tvaRate, align: 'center' });
  x += colWidths.tvaRate;
  doc.text('Total HT', x + 4, y + 6, { width: colWidths.total, align: 'right' });
  doc.restore();
  y += 22;

  // Data rows
  items.forEach((item, index) => {
    const lineHt = item.quantity * item.unitPrice;
    const rowHeight = 20;

    if (y + rowHeight > 700) {
      doc.addPage();
      y = 60;
    }

    if (index % 2 === 1) {
      doc.save();
      doc.rect(50, y, tableWidth, rowHeight).fill('#fafafa');
      doc.restore();
    }

    doc.fillColor('#333333').font('Helvetica').fontSize(8);
    x = 50;
    doc.text(item.description || '', x + 4, y + 5, { width: colWidths.description });
    x += colWidths.description;
    doc.text(String(item.quantity ?? 0), x + 4, y + 5, { width: colWidths.quantity, align: 'center' });
    x += colWidths.quantity;
    doc.text(item.unit || '', x + 4, y + 5, { width: colWidths.unit, align: 'center' });
    x += colWidths.unit;
    doc.text(formatCurrency(item.unitPrice), x + 4, y + 5, { width: colWidths.unitPrice, align: 'right' });
    x += colWidths.unitPrice;
    doc.text(`${item.tvaRate}%`, x + 4, y + 5, { width: colWidths.tvaRate, align: 'center' });
    x += colWidths.tvaRate;
    doc.text(formatCurrency(lineHt), x + 4, y + 5, { width: colWidths.total, align: 'right' });

    y += rowHeight;
  });

  return y;
}

function addTotals(
  doc: PDFDocument,
  items: (DevisItem | InvoiceItem)[],
  globalDiscount: number,
  startY: number,
  tableWidth: number,
): number {
  let y = startY;
  const totalWidth = tableWidth * 0.4;
  const labelWidth = totalWidth * 0.6;
  const valueWidth = totalWidth * 0.4;
  const startX = 50 + tableWidth - totalWidth;

  // Separator line
  doc.moveTo(50, y).lineTo(50 + tableWidth, y).strokeColor('#dddddd').lineWidth(0.5).stroke();
  y += 8;

  const totalHt = items.reduce((s, item) => s + item.quantity * item.unitPrice, 0);
  const tvaAmounts = new Map<number, number>();
  items.forEach((item) => {
    const tva = item.quantity * item.unitPrice * (item.tvaRate / 100);
    tvaAmounts.set(item.tvaRate, (tvaAmounts.get(item.tvaRate) || 0) + tva);
  });
  const totalTva = Array.from(tvaAmounts.values()).reduce((s, v) => s + v, 0);

  let discount = 0;
  if (globalDiscount > 0) {
    discount = totalHt * (globalDiscount / 100);
  }

  const netHt = totalHt - discount;
  const totalTtc = netHt + totalTva;

  // Subtotal HT
  doc.font('Helvetica').fontSize(9).fillColor('#333333');
  doc.text('Total HT', startX, y, { width: labelWidth, align: 'right' });
  doc.text(formatCurrency(totalHt), startX + labelWidth, y, { width: valueWidth, align: 'right' });
  y += 18;

  // Discount
  if (globalDiscount > 0) {
    doc.font('Helvetica').fontSize(9).fillColor('#333333');
    doc.text(`Remise (${globalDiscount}%)`, startX, y, { width: labelWidth, align: 'right' });
    doc.text(`-${formatCurrency(discount)}`, startX + labelWidth, y, { width: valueWidth, align: 'right' });
    y += 18;
  }

  // TVA
  tvaAmounts.forEach((amount, rate) => {
    doc.font('Helvetica').fontSize(9).fillColor('#333333');
    doc.text(`TVA ${rate}%`, startX, y, { width: labelWidth, align: 'right' });
    doc.text(formatCurrency(amount), startX + labelWidth, y, { width: valueWidth, align: 'right' });
    y += 18;
  });

  // Separator line
  doc.moveTo(startX, y - 4).lineTo(startX + totalWidth, y - 4).strokeColor('#dddddd').lineWidth(0.5).stroke();

  // Total TTC
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#1a1a2e');
  doc.text('Total TTC', startX, y, { width: labelWidth, align: 'right' });
  doc.text(formatCurrency(totalTtc), startX + labelWidth, y, { width: valueWidth, align: 'right' });
  y += 24;

  return y;
}

async function buildPDF(
  doc: PDFDocument,
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
  const tableWidth = 495;

  return new Promise((resolve, reject) => {
    const buffers: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    try {
      // Page 1
      doc.rect(0, 0, 595.28, 841.89).fill('#ffffff');
      let y = 40;

      // Logo
      if (company.logoBase64 && company.logoMimeType) {
        try {
          const logoData = Buffer.from(company.logoBase64, 'base64');
          if (logoData.length > 0) {
            doc.image(logoData, 50, y, { fit: [120, 60] });
            y = 80;
          }
        } catch {
          // Skip logo if it can't be rendered
        }
      }

      // Company name
      const companyName = company.companyName || `${company.firstName || ''} ${company.name || ''}`.trim() || 'Mon entreprise';
      doc.font('Helvetica-Bold').fontSize(16).fillColor('#1a1a2e');
      doc.text(companyName, 50, y);
      y += 22;

      // Company details
      doc.font('Helvetica').fontSize(8).fillColor('#666666');
      const companyDetails: string[] = [];
      if (company.legalForm) companyDetails.push(company.legalForm);
      if (company.address) companyDetails.push(company.address);
      if (company.addressComplement) companyDetails.push(company.addressComplement);
      const cityLine = [company.postalCode || '', company.city || ''].join(' ').trim();
      if (cityLine) companyDetails.push(cityLine);
      if (company.phone) companyDetails.push(`Tel : ${company.phone}`);
      if (company.professionalEmail) companyDetails.push(company.professionalEmail);
      if (company.siret) companyDetails.push(`SIRET : ${company.siret}`);
      if (company.tvaNumber) companyDetails.push(`TVA : ${company.tvaNumber}`);
      if (company.rcsNumber) companyDetails.push(`RCS : ${company.rcsNumber}`);
      if (company.socialCapital) companyDetails.push(`Capital : ${company.socialCapital}`);

      companyDetails.forEach((line) => {
        doc.text(line, 50, y);
        y += 12;
      });

      // Document title on the right
      const title = docType === 'devis' ? 'DEVIS' : 'FACTURE';
      doc.font('Helvetica-Bold').fontSize(28).fillColor('#1a1a2e');
      doc.text(title, 595.28 - 50 - tableWidth * 0.45, 40, { width: tableWidth * 0.45, align: 'right' });

      // Document info
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#333333');
      const infoX = 595.28 - 50 - tableWidth * 0.45;
      let infoY = 80;
      doc.text(`${docType === 'devis' ? 'N\u00B0 de devis' : 'N\u00B0 de facture'} :`, infoX, infoY, { width: tableWidth * 0.45, align: 'right' });
      infoY += 14;
      doc.font('Helvetica-Bold').fontSize(12);
      doc.text(docNumber || '', infoX, infoY, { width: tableWidth * 0.45, align: 'right' });
      infoY += 20;

      doc.font('Helvetica').fontSize(9).fillColor('#666666');
      doc.text(`Date : ${formatDate(issueDate)}`, infoX, infoY, { width: tableWidth * 0.45, align: 'right' });
      infoY += 14;

      if (extraDate) {
        const extraLabel = docType === 'devis' ? "Valide jusqu'au" : 'Echeance';
        doc.text(`${extraLabel} : ${formatDate(extraDate)}`, infoX, infoY, { width: tableWidth * 0.45, align: 'right' });
        infoY += 14;
      }

      if (devisNumber) {
        doc.text(`Ref. devis : ${devisNumber}`, infoX, infoY, { width: tableWidth * 0.45, align: 'right' });
      }

      // Client section
      y = Math.max(y, 220);
      doc.moveTo(50, y).lineTo(50 + tableWidth, y).strokeColor('#1a1a2e').lineWidth(1).stroke();
      y += 10;

      doc.font('Helvetica-Bold').fontSize(9).fillColor('#1a1a2e');
      doc.text('CLIENT', 50, y);
      y += 16;

      doc.font('Helvetica').fontSize(9).fillColor('#333333');
      const clientName = client.company || client.name || 'Client';
      doc.text(clientName, 50, y, { continued: false });
      y += 13;
      if (client.company && client.name) {
        safeText(doc, client.name, 50, y);
        y += 13;
      }
      safeText(doc, client.address, 50, y);
      y += 13;
      safeText(doc, client.addressComplement, 50, y);
      y += 13;
      const clientCity = [client.postalCode || '', client.city || ''].join(' ').trim();
      if (clientCity) {
        doc.text(clientCity, 50, y);
        y += 13;
      }
      if (client.siret) {
        doc.text(`SIRET : ${client.siret}`, 50, y);
        y += 13;
      }
      safeText(doc, client.email, 50, y);
      y += 16;

      // Items table
      y = addItemRows(doc, items, y, tableWidth);
      y += 10;

      // Totals
      y = addTotals(doc, items, globalDiscount, y, tableWidth);

      // Notes
      if (company.customNotes) {
        y += 4;
        doc.font('Helvetica').fontSize(8).fillColor('#666666');
        doc.text(company.customNotes, 50, y, { width: tableWidth });
        y += 40;
      }

      // Payment conditions (invoice only)
      if (docType === 'invoice') {
        y += 4;
        doc.moveTo(50, y).lineTo(50 + tableWidth, y).strokeColor('#dddddd').lineWidth(0.5).stroke();
        y += 8;
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#333333');
        doc.text('Conditions de paiement', 50, y);
        y += 14;
        doc.font('Helvetica').fontSize(8).fillColor('#666666');
        doc.text(`Paiement a ${company.paymentTerms || '30 jours'}.`, 50, y);
        y += 12;
        if (company.latePenaltyRate) {
          doc.text(
            `En cas de retard de paiement, une penalite de ${company.latePenaltyRate}% sera appliquee conformement a l'article L441-10 du Code de Commerce.`,
            50, y, { width: tableWidth },
          );
          y += 12;
        }
      }

      // Signature zone for devis
      if (docType === 'devis') {
        y += 16;
        doc.moveTo(50, y).lineTo(50 + tableWidth, y).strokeColor('#dddddd').lineWidth(0.5).stroke();
        y += 10;
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#333333');
        doc.text('Bon pour accord', 50, y);
        y += 14;
        doc.font('Helvetica').fontSize(8).fillColor('#666666');
        doc.text('Signature precedee de la mention "Bon pour accord"', 50, y);
        y += 30;
        doc.moveTo(50, y).lineTo(250, y).strokeColor('#999999').lineWidth(0.5).stroke();
        doc.moveTo(350, y).lineTo(545, y).stroke();
        y += 12;
        doc.font('Helvetica').fontSize(8).fillColor('#999999');
        doc.text('Date', 50, y);
        doc.text('Signature', 350, y);
      }

      // Footer
      const footerY = docType === 'devis' ? 750 : 730;
      doc.font('Helvetica').fontSize(7).fillColor('#999999');
      if (company.iban) {
        let bankInfo = 'Coordonnees bancaires : ';
        if (company.accountHolder) bankInfo += company.accountHolder + ' - ';
        bankInfo += `IBAN : ${company.iban}`;
        if (company.bic) bankInfo += ` - BIC : ${company.bic}`;
        doc.text(bankInfo, 50, footerY, { width: tableWidth, align: 'center' });
      }

      const companyCityLine = [company.address || '', company.postalCode || '', company.city || ''].join(' ').trim();
      doc.text(
        `${companyName}${companyCityLine ? ' - ' + companyCityLine : ''}`,
        50,
        footerY + 12,
        { width: tableWidth, align: 'center' },
      );

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
  const doc = new PDFDocument({ size: 'A4', margin: 0 });
  return buildPDF(
    doc,
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
  const doc = new PDFDocument({ size: 'A4', margin: 0 });
  return buildPDF(
    doc,
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
