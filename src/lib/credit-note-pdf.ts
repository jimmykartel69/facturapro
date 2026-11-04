import PDFDocument from 'pdfkit';
import type { InvoiceArchiveSnapshot } from '@/lib/invoice-archive';

function money(cents: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
    .format(cents / 100).replace(/\u202f|\u00a0/g, ' ');
}
function date(value: string | Date): string {
  return new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris' }).format(new Date(value));
}
function safe(value: string | null | undefined): string {
  return String(value ?? '').replace(/[\u0000-\u001f]/g, ' ').trim();
}

export function generateFullCreditPdf(input: {
  snapshot: InvoiceArchiveSnapshot;
  number: string;
  issueDate: Date;
  reason: string;
}): Promise<Buffer> {
  const { snapshot, number, issueDate, reason } = input;
  const doc = new PDFDocument({ size: 'A4', margin: 42, autoFirstPage: true });
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (part: Buffer) => chunks.push(part));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    try {
      const issuer = snapshot.company;
      const buyer = snapshot.client;
      const total = snapshot.totals;
      const x = 46;
      const width = 500;
      doc.rect(0, 0, 595, 10).fill('#1d4ed8');
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(22)
        .text('FACTURE D’AVOIR', x, 42);
      doc.font('Helvetica').fontSize(10).fillColor('#475569')
        .text('Avoir intégral n° ' + number, x, 72)
        .text('Émis le ' + date(issueDate), x, 87);
      doc.moveTo(x, 111).lineTo(x + width, 111).strokeColor('#d1d5db').stroke();

      doc.font('Helvetica-Bold').fontSize(10).fillColor('#1e293b').text('ÉMETTEUR', x, 130);
      doc.text('CLIENT', 307, 130);
      const companyText = [
        safe(issuer.companyName) || [issuer.firstName, issuer.name].filter(Boolean).join(' '),
        safe(issuer.address), safe(issuer.addressComplement),
        [issuer.postalCode, issuer.city].filter(Boolean).join(' '),
        issuer.siret ? 'SIRET ' + safe(issuer.siret) : '',
        safe(issuer.professionalEmail),
      ].filter(Boolean).join('\n');
      const clientText = [
        safe(buyer.company) || safe(buyer.name),
        buyer.company ? safe(buyer.name) : '',
        safe(buyer.address), safe(buyer.addressComplement),
        [buyer.postalCode, buyer.city].filter(Boolean).join(' '),
        buyer.siret ? 'SIRET ' + safe(buyer.siret) : '',
      ].filter(Boolean).join('\n');
      doc.font('Helvetica').fontSize(9).fillColor('#334155')
        .text(companyText, x, 149, { width: 235 })
        .text(clientText, 307, 149, { width: 238 });
      doc.roundedRect(x, 260, width, 94, 6).fill('#eff6ff');
      doc.fillColor('#1e40af').font('Helvetica-Bold').fontSize(11)
        .text('Facture initiale : ' + snapshot.invoice.number, x + 15, 277, { width: 470 });
      doc.font('Helvetica').fontSize(9).fillColor('#334155')
        .text('Date de la facture initiale : ' + date(snapshot.invoice.issueDate), x + 15, 299)
        .text('Objet : annulation intégrale de cette facture', x + 15, 315);

      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(11)
        .text('Motif de l’avoir', x, 375);
      doc.font('Helvetica').fontSize(10)
        .text(safe(reason), x, 396, { width, height: 66, ellipsis: true });
      doc.moveTo(x, 480).lineTo(x + width, 480).strokeColor('#cbd5e1').stroke();

      doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a')
        .text('Montants crédités', x, 499);
      let y = 529;
      const amount = (label: string, centsValue: number) => {
        doc.font('Helvetica').fontSize(10).fillColor('#334155')
          .text(label, x, y, { width: 330 });
        doc.font('Helvetica-Bold').fillColor('#0f172a')
          .text('- ' + money(centsValue), 393, y, { width: 153, align: 'right' });
        y += 24;
      };
      amount('Montant hors taxes', total.amountHtCents);
      for (const vat of total.vatBreakdown) {
        amount('TVA ' + vat.rate.toLocaleString('fr-FR') + ' %', vat.amountCents);
      }
      if (!total.vatBreakdown.length) amount('TVA', 0);
      doc.moveTo(x, y + 1).lineTo(x + width, y + 1).strokeColor('#2563eb').lineWidth(1.5).stroke();
      y += 18;
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#1e40af')
        .text('TOTAL DE L’AVOIR', x, y);
      doc.text('- ' + money(total.amountTtcCents), 350, y, { width: 196, align: 'right' });

      const footerY = 743;
      if (issuer.vatRegime === 'franchise') {
        doc.font('Helvetica').fontSize(8).fillColor('#475569')
          .text(safe(issuer.vatExemptionText) || 'TVA non applicable, article 293 B du CGI.', x, 718, { width });
      } else if (issuer.tvaNumber) {
        doc.font('Helvetica').fontSize(8).fillColor('#475569')
          .text('N° TVA intracommunautaire : ' + safe(issuer.tvaNumber), x, 718, { width });
      }
      doc.font('Helvetica').fontSize(8).fillColor('#64748b')
        .text('Document lié à la facture initiale précitée. À conserver avec celle-ci.', x, footerY, { width, align: 'center' });
      doc.end();
    } catch (error) {
      doc.destroy();
      reject(error);
    }
  });
}
