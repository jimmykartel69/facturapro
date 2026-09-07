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

const NEOVOLT_CGV_INTRO = [
  "Les présentes Conditions Générales de Vente et de Sous-Traitance s'appliquent aux prestations d'électricité générale réalisées par NeoVolt pour le compte de clients professionnels, entreprises principales ou donneurs d'ordre.",
  "Les conditions particulières figurant sur le devis ou sur un contrat de sous-traitance accepté prévalent sur les présentes CGV en cas de contradiction."
];

const NEOVOLT_CGV_SECTIONS: CgvSection[] = [
  {
    "title": "1. Objet",
    "paragraphs": [
      "Les présentes conditions définissent les modalités selon lesquelles NeoVolt réalise les prestations décrites au devis accepté.",
      "Les prestations de NeoVolt sont strictement limitées aux travaux, fournitures et interventions expressément prévus au devis ou dans tout document contractuel accepté par les parties.",
      "Tout travail non prévu au périmètre initial constitue une prestation supplémentaire."
    ]
  },
  {
    "title": "2. Formation de la commande",
    "paragraphs": [
      "Sauf indication contraire, les devis émis par NeoVolt sont valables pendant 30 jours à compter de leur date d'émission.",
      "La commande devient ferme après acceptation du devis par le client ou le donneur d'ordre, notamment par :",
      "- signature du devis avec la mention « Bon pour accord » ;",
      "- validation écrite ou électronique non équivoque ;",
      "- et, lorsqu'il est prévu, versement de l'acompte demandé.",
      "Les conditions particulières mentionnées sur le devis prévalent sur les présentes CGV.",
      "Toute modification postérieure à l'acceptation devra faire l'objet d'un accord écrit entre les parties."
    ]
  },
  {
    "title": "3. Prix et modalités de paiement",
    "paragraphs": [
      "Les prix applicables sont ceux figurant au devis accepté.",
      "Sauf conditions particulières différentes indiquées sur le devis, un acompte de 30 % pourra être demandé à la commande pour toute prestation d'un montant supérieur à 500 €.",
      "Lorsque le devis prévoit expressément un paiement intégral à réception de facture, cette condition prévaut sur l'acompte prévu ci-dessus.",
      "Le solde est payable selon l'échéance indiquée sur la facture, par virement bancaire ou tout autre moyen accepté par NeoVolt.",
      "Aucun escompte n'est accordé pour paiement anticipé, sauf accord écrit contraire."
    ]
  },
  {
    "title": "4. Retard de paiement – Clients professionnels",
    "paragraphs": [
      "Toute somme non réglée à son échéance entraîne, de plein droit et sans qu'un rappel préalable soit nécessaire, l'application de pénalités de retard conformément à l'article L.441-10 du Code de commerce.",
      "Le taux des pénalités est égal au taux d'intérêt appliqué par la Banque centrale européenne à son opération de refinancement la plus récente, majoré de 10 points de pourcentage, sauf disposition contractuelle différente conforme à la réglementation applicable.",
      "Tout professionnel en situation de retard de paiement est également redevable de plein droit d'une indemnité forfaitaire de 40 € pour frais de recouvrement.",
      "Lorsque les frais de recouvrement réellement exposés sont supérieurs à cette indemnité, NeoVolt pourra demander une indemnisation complémentaire sur justification, dans les conditions prévues par la réglementation."
    ]
  },
  {
    "title": "5. Délais d'exécution",
    "paragraphs": [
      "Les dates et délais d'intervention indiqués au devis constituent des prévisions sauf engagement écrit exprès de NeoVolt sur une date impérative.",
      "Les délais peuvent être prolongés lorsque l'exécution est retardée par une circonstance indépendante de NeoVolt, notamment :",
      "- indisponibilité ou retard de livraison des fournitures ;",
      "- impossibilité d'accès au chantier ;",
      "- intervention ou retard d'un autre corps d'état ;",
      "- découverte d'une contrainte technique non apparente lors de l'établissement du devis ;",
      "- modification demandée par le client ou le donneur d'ordre ;",
      "- conditions de sécurité ne permettant pas l'intervention ;",
      "- événement de force majeure.",
      "NeoVolt informe le donneur d'ordre dans un délai raisonnable lorsqu'un événement entraîne une modification significative du planning."
    ]
  },
  {
    "title": "6. Exécution des travaux",
    "paragraphs": [
      "NeoVolt réalise les prestations conformément au périmètre défini au devis, aux règles de l'art et aux prescriptions techniques applicables aux travaux concernés.",
      "Toute prestation supplémentaire ou modification demandée en cours d'intervention pourra donner lieu à :",
      "- un devis complémentaire ;",
      "- un avenant ;",
      "- ou un accord écrit précisant le prix supplémentaire.",
      "NeoVolt n'est pas tenu d'exécuter des travaux supplémentaires sans accord sur leur nature et leur rémunération."
    ]
  },
  {
    "title": "7. Obligations du client ou donneur d'ordre",
    "paragraphs": [
      "Le client ou donneur d'ordre s'engage à :",
      "- assurer l'accès aux locaux et aux zones d'intervention ;",
      "- communiquer les informations nécessaires à l'exécution des travaux ;",
      "- signaler les risques, réseaux, installations ou contraintes techniques dont il a connaissance ;",
      "- garantir des conditions d'intervention compatibles avec les règles de sécurité ;",
      "- assurer, lorsque cela relève de sa responsabilité, la coordination avec les autres intervenants du chantier ;",
      "- obtenir les autorisations nécessaires relevant de sa responsabilité.",
      "NeoVolt ne pourra être tenu responsable des conséquences résultant d'informations erronées, incomplètes ou dissimulées par le donneur d'ordre."
    ]
  },
  {
    "title": "8. Matériels et fournitures",
    "paragraphs": [
      "Les matériels et fournitures fournis par NeoVolt sont choisis en fonction du devis accepté et des caractéristiques connues de l'installation.",
      "Lorsque certains matériels sont imposés ou directement fournis par le client, le donneur d'ordre ou un tiers, NeoVolt ne garantit pas leur qualité intrinsèque, leur durée de vie ou leur conformité aux performances annoncées par leur fabricant.",
      "NeoVolt reste responsable de la qualité de sa propre mise en œuvre dans les limites de la prestation confiée.",
      "Toute incompatibilité manifeste constatée avant installation est signalée au donneur d'ordre."
    ]
  },
  {
    "title": "9. Réserve de propriété",
    "paragraphs": [
      "Les matériels et équipements livrés mais non encore incorporés de manière définitive à l'ouvrage restent la propriété de NeoVolt jusqu'au paiement intégral des sommes dues au titre de leur fourniture.",
      "Le transfert des risques intervient selon les règles applicables à la livraison, à la détention et à l'installation des matériels concernés.",
      "La présente clause ne saurait autoriser NeoVolt à procéder au démontage d'un équipement incorporé à l'ouvrage en dehors des conditions et voies de droit légalement applicables."
    ]
  },
  {
    "title": "10. Responsabilité",
    "paragraphs": [
      "NeoVolt répond de la bonne exécution des prestations relevant de son périmètre contractuel.",
      "Sa responsabilité ne saurait être engagée pour les dommages directement imputables notamment :",
      "- à une installation existante défectueuse située hors du périmètre des travaux ;",
      "- à une mauvaise utilisation postérieure à l'intervention ;",
      "- à la modification de l'installation par un tiers ;",
      "- à un défaut ou désordre qui ne pouvait raisonnablement être détecté lors de l'intervention ;",
      "- à un matériel fourni ou imposé par un tiers, sous réserve des obligations propres de NeoVolt concernant sa mise en œuvre ;",
      "- au non-respect par le donneur d'ordre des préconisations écrites de NeoVolt.",
      "Aucune disposition des présentes CGV ne peut avoir pour effet d'exclure une responsabilité ou une garantie légalement impérative applicable à NeoVolt."
    ]
  },
  {
    "title": "11. Garanties",
    "paragraphs": [
      "Les prestations réalisées bénéficient des garanties légales et contractuelles applicables en fonction de la nature des travaux, de la qualité des parties et du rôle de NeoVolt dans l'opération de construction.",
      "Lorsque NeoVolt intervient directement en qualité d'entrepreneur auprès du maître d'ouvrage, les garanties légales relatives aux travaux de construction s'appliquent lorsque leurs conditions légales sont réunies.",
      "Lorsque NeoVolt intervient en qualité de sous-traitant, ses obligations et responsabilités sont appréciées au regard du contrat de sous-traitance, de la nature de ses travaux et des dispositions légales applicables à la sous-traitance.",
      "Les garanties ne couvrent notamment pas l'usure normale, la mauvaise utilisation, les modifications réalisées ultérieurement par un tiers ou les dommages provenant d'éléments extérieurs à la prestation réalisée par NeoVolt."
    ]
  },
  {
    "title": "12. Annulation ou résiliation de la commande",
    "paragraphs": [
      "En cas d'annulation par le donneur d'ordre après acceptation du devis et avant l'achèvement des travaux, NeoVolt pourra facturer :",
      "- les prestations déjà exécutées ;",
      "- les fournitures spécialement commandées et ne pouvant être raisonnablement retournées ;",
      "- les frais directement engagés pour le chantier ;",
      "- ainsi que, le cas échéant, le préjudice directement subi et justifiable résultant de l'annulation.",
      "Les sommes déjà versées seront imputées sur les montants effectivement dus.",
      "L'acompte n'est donc pas automatiquement acquis dans tous les cas indépendamment des circonstances de l'annulation.",
      "En cas de résiliation imputable à NeoVolt, les prestations non réalisées ne seront pas facturées et les sommes éventuellement perçues au titre de prestations non exécutées seront restituées."
    ]
  },
  {
    "title": "13. Suspension ou arrêt du chantier",
    "paragraphs": [
      "NeoVolt peut suspendre l'exécution de ses prestations en cas notamment :",
      "- de défaut de paiement arrivé à échéance ;",
      "- de manquement contractuel sérieux du donneur d'ordre ;",
      "- d'impossibilité matérielle d'accéder au chantier ;",
      "- de danger pour les personnes ou les biens ;",
      "- de conditions d'intervention incompatibles avec les règles de sécurité.",
      "En cas de défaut de paiement ou de manquement contractuel pouvant être régularisé, la suspension intervient après information ou mise en demeure restée sans effet pendant un délai raisonnable, sauf situation urgente.",
      "En présence d'un danger immédiat pour les personnes, les biens ou les installations, NeoVolt peut interrompre immédiatement son intervention.",
      "Cette suspension n'emporte pas renonciation au paiement des travaux et frais déjà engagés."
    ]
  },
  {
    "title": "14. Réception des travaux",
    "paragraphs": [
      "Lorsque la nature des travaux le justifie, leur achèvement peut donner lieu à une réception contradictoire entre les parties.",
      "La réception peut être prononcée avec ou sans réserve.",
      "Les éventuelles réserves doivent être décrites aussi précisément que possible afin de permettre leur traitement.",
      "La seule absence de contestation dans un délai de 48 heures ne vaut pas automatiquement réception sans réserve.",
      "À défaut de procès-verbal formel, l'existence et la date d'une éventuelle réception sont appréciées conformément aux règles légales applicables et aux circonstances de l'exécution du chantier."
    ]
  },
  {
    "title": "15. Travaux imprévus et installations existantes",
    "paragraphs": [
      "Le devis est établi sur la base des éléments visibles et des informations disponibles au moment de son établissement.",
      "La découverte en cours de chantier notamment :",
      "- d'une installation non conforme ;",
      "- d'un câblage dégradé ;",
      "- d'un défaut d'isolement ;",
      "- d'une canalisation ou d'un réseau dissimulé ;",
      "- d'un support impropre à la pose ;",
      "- d'une absence de continuité de terre ;",
      "- d'une modification antérieure non visible ;",
      "- ou de toute autre difficulté technique non raisonnablement décelable avant travaux",
      "peut nécessiter des travaux supplémentaires.",
      "NeoVolt informe alors le donneur d'ordre et lui soumet, lorsque cela a une incidence sur le prix ou le périmètre, une proposition complémentaire avant réalisation, sauf mesure conservatoire urgente nécessaire à la sécurité."
    ]
  },
  {
    "title": "16. Variation du prix des matériaux",
    "paragraphs": [
      "Les prix figurant sur un devis accepté ne peuvent être modifiés unilatéralement par NeoVolt en raison d'une simple hausse du prix des matériaux.",
      "En cas de modification importante du projet, de demande complémentaire du donneur d'ordre, de changement de référence imposé ou de circonstances modifiant substantiellement le périmètre prévu, une adaptation du prix pourra être proposée.",
      "Cette adaptation devra faire l'objet d'un accord préalable du donneur d'ordre, notamment sous la forme d'un avenant ou d'un devis complémentaire.",
      "Après expiration de la durée de validité d'un devis non encore accepté, NeoVolt est libre d'établir une nouvelle proposition tarifaire."
    ]
  },
  {
    "title": "17. Force majeure",
    "paragraphs": [
      "Aucune partie ne pourra être tenue responsable d'un retard ou d'une inexécution résultant d'un événement présentant les caractéristiques de la force majeure au sens du droit français.",
      "La partie concernée informe l'autre partie dans les meilleurs délais.",
      "Les obligations empêchées sont suspendues pendant la durée de l'événement lorsque celui-ci est temporaire.",
      "Si l'empêchement devient définitif ou rend raisonnablement impossible la poursuite du contrat, les parties déterminent les conséquences de la cessation du contrat conformément au droit applicable."
    ]
  },
  {
    "title": "18. Dispositions spécifiques à la sous-traitance",
    "paragraphs": [
      "Lorsque NeoVolt intervient pour le compte d'une entreprise principale en qualité de sous-traitant, les dispositions impératives de la loi n° 75-1334 du 31 décembre 1975 relative à la sous-traitance s'appliquent lorsqu'elles entrent dans le champ de l'opération concernée.",
      "L'entreprise principale accomplit les formalités qui lui incombent notamment concernant, lorsque la loi l'exige :",
      "- la déclaration et l'acceptation du sous-traitant par le maître d'ouvrage ;",
      "- l'agrément de ses conditions de paiement ;",
      "- et la mise en place des garanties de paiement légalement requises.",
      "Les relations entre le maître d'ouvrage et l'entreprise principale ne modifient pas, sauf disposition légale ou accord écrit contraire, le prix convenu entre NeoVolt et son donneur d'ordre.",
      "NeoVolt n'est responsable que du périmètre des prestations qui lui sont contractuellement confiées.",
      "Les travaux réalisés par l'entreprise principale, les autres sous-traitants ou tout autre intervenant demeurent sous la responsabilité de leurs auteurs respectifs."
    ]
  },
  {
    "title": "19. Assurance professionnelle",
    "paragraphs": [
      "NeoVolt maintient les assurances professionnelles correspondant aux activités et travaux effectivement déclarés à son assureur.",
      "Lorsque la nature des travaux rend obligatoire une assurance de responsabilité décennale, les justificatifs prévus par la réglementation sont communiqués conformément aux dispositions applicables.",
      "Assureur : À venir\nN° de contrat : À venir\nActivités garanties : À venir\nZone géographique de couverture : À venir",
      "Aucune mention figurant dans les présentes CGV ne saurait étendre les garanties de l'assureur au-delà des activités et conditions effectivement prévues au contrat d'assurance."
    ]
  },
  {
    "title": "20. Règlement amiable et litiges",
    "paragraphs": [
      "En cas de difficulté relative à l'interprétation ou à l'exécution du contrat, les parties s'efforcent de rechercher préalablement une solution amiable.",
      "À défaut d'accord, le litige est porté devant la juridiction territorialement et matériellement compétente selon les règles légales applicables.",
      "Aucune clause attributive de juridiction contraire aux dispositions impératives applicables ne pourra être opposée à l'une des parties."
    ]
  },
  {
    "title": "21. Droit applicable et hiérarchie contractuelle",
    "paragraphs": [
      "Les présentes CGV et les contrats auxquels elles se rapportent sont soumis au droit français.",
      "L'ordre de priorité contractuelle est, sauf convention contraire :",
      "1. les éventuelles conditions particulières ou le contrat de sous-traitance signé ;",
      "2. le devis accepté et ses éventuels avenants ;",
      "3. les présentes Conditions Générales de Vente et de Sous-Traitance.",
      "Si une disposition des présentes CGV devait être déclarée nulle ou inapplicable, les autres dispositions conserveraient leur effet."
    ]
  }
];

const NEOVOLT_CGV_CLOSING = [
  "NEOVOLT",
  "SIRET : 788 947 836 00037",
  "Tél. : +33 6 68 56 99 53",
  "E-mail : contact-nv@neovolt69.fr",
  "Site : neovolt69.fr",
  "TVA non applicable, article L. 223-3 du Code des impositions sur les biens et services (CIBS)."
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

function normalizePdfText(value: string): string {
  // PDFKit + Helvetica may render thin/non-breaking spaces as unexpected glyphs (e.g. "/").
  return value
    .replace(/\u202f/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+€/g, ' €')
    .trim();
}

function fmtCur(amount: number): string {
  return normalizePdfText(
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount),
  );
}

function fmtDate(date: Date): string {
  return normalizePdfText(
    new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(date),
  );
}

function fmtQty(value: number): string {
  return normalizePdfText(new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 }).format(value));
}

function fmtPercent(value: number): string {
  return normalizePdfText(new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(value));
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

  doc.font('Helvetica-Bold').fontSize(7.1).fillColor(C.accent);
  doc.text('ÉLECTRICITÉ GÉNÉRALE • INSTALLATION • MAINTENANCE', lx, ly, { width: leftW });
  ly += 12;

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
    { key: 'Devise', value: 'EUR' },
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

  rows.push({
    key: ctx.docType === 'devis' ? 'Acompte' : 'Paiement',
    value: ctx.docType === 'devis' ? '30 % à la commande' : 'Virement bancaire',
  });

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
  rightLines.push('Mode de règlement : virement bancaire');
  if (ctx.docType === 'devis' && ctx.extraDate) {
    rightLines.push(`Valide jusqu'au : ${fmtDate(ctx.extraDate)}`);
    rightLines.push('Acompte à la commande : 30 %');
  }
  if (ctx.docType === 'invoice' && ctx.extraDate) {
    rightLines.push(`Échéance : ${fmtDate(ctx.extraDate)}`);
  }
  rightLines.push('CGV : annexe contractuelle jointe');
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
  for (const line of rightLines) {
    const isAmount = line.startsWith('Montant TTC');
    doc
      .font(isAmount ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(isAmount ? 8.8 : 7.6)
      .fillColor(isAmount ? C.primary : C.textSec);
    doc.text(line, split + pad, ry, { width: x + w - split - pad * 2 });
    ry += isAmount ? 12 : 10;
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

  if (ctx.docType === 'devis') {
    rows.push({ label: 'Acompte conseillé (30%)', value: fmtCur(totals.totalTtc * 0.3) });
  }

  const boxW = CW * 0.46;
  const x = MG + CW - boxW;
  const rowH = 15;
  const h = 20 + rows.length * rowH + 38;

  ensureSpace(ctx, h + 10);

  doc.roundedRect(x, ctx.y, boxW, h, 8).fill(C.white);
  doc.roundedRect(x, ctx.y, boxW, h, 8).strokeColor(C.border).lineWidth(0.8).stroke();
  doc.roundedRect(x + 1, ctx.y + 1, boxW - 2, 20, 7).fill(C.bgLight);

  let y = ctx.y + 7;
  doc.font('Helvetica-Bold').fontSize(8.3).fillColor(C.primary);
  doc.text('RÉCAPITULATIF FINANCIER', x + 10, y, { width: boxW - 20 });
  y += 19;

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

  doc.font('Helvetica').fontSize(6.8).fillColor(C.textSec);
  doc.text('Montant net à payer', x + 16, y + 20, { width: boxW - 32 });

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

function drawPremiumClosingNote(ctx: Ctx): void {
  const { doc } = ctx;
  const title = ctx.docType === 'devis' ? 'ENGAGEMENT DE SERVICE NEOVOLT' : 'MERCI POUR VOTRE CONFIANCE';
  const lines =
    ctx.docType === 'devis'
      ? [
          "Ce devis est établi sur la base des informations techniques connues à la date d'émission.",
          'Toute adaptation chantier fera l’objet d’un devis complémentaire validé avant exécution.',
          'Une annexe CGV complète est jointe au présent document.',
        ]
      : [
          'Cette facture correspond aux prestations réalisées selon devis et validation client.',
          'Pour toute question, notre équipe reste disponible pour un suivi technique et administratif.',
          'Une annexe CGV complète est jointe au présent document.',
        ];

  const pad = 12;
  const textWidth = CW - pad * 2;
  let h = 24;

  for (const line of lines) {
    h += measureText(doc, `- ${line}`, textWidth, 'Helvetica', 7.3) + 3;
  }

  ensureSpace(ctx, h + 10);

  doc.roundedRect(MG, ctx.y, CW, h, 7).fill(C.bgLight);
  doc.roundedRect(MG, ctx.y, CW, h, 7).strokeColor(C.accentBorder).lineWidth(0.7).stroke();

  doc.font('Helvetica-Bold').fontSize(8.2).fillColor(C.accent);
  doc.text(title, MG + pad, ctx.y + 10, { width: textWidth });

  let y = ctx.y + 24;
  doc.font('Helvetica').fontSize(7.3).fillColor(C.textSec);
  for (const line of lines) {
    const lineText = `- ${line}`;
    doc.text(lineText, MG + pad, y, { width: textWidth });
    y += measureText(doc, lineText, textWidth, 'Helvetica', 7.3) + 3;
  }

  ctx.y += h + 12;
}

function estimateCgvSectionHeight(doc: PDFDocument, section: CgvSection, width: number): number {
  let height = 20;
  height += measureText(doc, section.title, width, 'Helvetica-Bold', 9.2) + 6;
  for (const paragraph of section.paragraphs) {
    height += measureText(doc, paragraph, width, 'Helvetica', 8.3) + 4;
  }
  return height;
}

function startCgvAnnexPage(ctx: Ctx, continuation = false): void {
  drawFooter(ctx);
  ctx.doc.addPage();
  ctx.pageNum += 1;
  drawAccentBar(ctx);

  const title = 'ANNEXE - CONDITIONS GÉNÉRALES DE VENTE ET DE SOUS-TRAITANCE';
  const titleHeight = measureText(ctx.doc, title, CW, 'Helvetica-Bold', 10);
  ctx.doc.fillColor(C.primary).text(title, MG, 18, { width: CW });
  ctx.y = 18 + titleHeight + 7;

  const reference = (ctx.docType === 'devis' ? 'Devis' : 'Facture') + ' n° ' + ctx.docNumber + (continuation ? ' | Suite' : '');
  const referenceHeight = measureText(ctx.doc, reference, CW, 'Helvetica', 8);
  ctx.doc.fillColor(C.textSec).text(reference, MG, ctx.y, { width: CW });
  ctx.y += referenceHeight + 12;
  if (continuation) return;

  const introWidth = CW - 22;
  const introHeight = 36 + NEOVOLT_CGV_INTRO.reduce(
    (height, paragraph) => height + measureText(ctx.doc, paragraph, introWidth, 'Helvetica', 8.3) + 5,
    0,
  );
  ctx.doc.roundedRect(MG, ctx.y, CW, introHeight, 6).fill(C.bgLight);
  ctx.doc.roundedRect(MG, ctx.y, CW, introHeight, 6).strokeColor(C.border).lineWidth(0.6).stroke();
  let y = ctx.y + 10;
  ctx.doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.primary);
  ctx.doc.text('Prestataire : NeoVolt', MG + 11, y, { width: introWidth });
  y += 16;
  for (const paragraph of NEOVOLT_CGV_INTRO) {
    const height = measureText(ctx.doc, paragraph, introWidth, 'Helvetica', 8.3);
    ctx.doc.fillColor(C.textSec).text(paragraph, MG + 11, y, { width: introWidth });
    y += height + 5;
  }
  ctx.y += introHeight + 12;
}

function drawCgvAnnex(ctx: Ctx): void {
  const { doc } = ctx;
  const padX = 11;
  const textWidth = CW - padX * 2;
  startCgvAnnexPage(ctx);

  const ensureCgvSpace = (needed: number): void => {
    if (ctx.y + needed <= CONTENT_BOTTOM) return;
    startCgvAnnexPage(ctx, true);
  };

  for (const section of NEOVOLT_CGV_SECTIONS) {
    const blockHeight = estimateCgvSectionHeight(doc, section, textWidth);
    ensureCgvSpace(blockHeight + 8);
    doc.roundedRect(MG, ctx.y, CW, blockHeight, 5).fill(C.white);
    doc.roundedRect(MG, ctx.y, CW, blockHeight, 5).strokeColor(C.border).lineWidth(0.45).stroke();
    let y = ctx.y + 10;
    doc.font('Helvetica-Bold').fontSize(9.2).fillColor(C.accent);
    doc.text(section.title, MG + padX, y, { width: textWidth });
    y += measureText(doc, section.title, textWidth, 'Helvetica-Bold', 9.2) + 6;

    // Keep paragraphs and list items in their contractual reading order.
    doc.font('Helvetica').fontSize(8.3).fillColor(C.textSec);
    for (const paragraph of section.paragraphs) {
      doc.text(paragraph, MG + padX, y, { width: textWidth });
      y += measureText(doc, paragraph, textWidth, 'Helvetica', 8.3) + 4;
    }
    ctx.y += blockHeight + 8;
  }

  const closingHeight = 20 + NEOVOLT_CGV_CLOSING.reduce(
    (height, line) => height + measureText(doc, line, textWidth, 'Helvetica', 8.3) + 4,
    0,
  );
  ensureCgvSpace(closingHeight);
  doc.roundedRect(MG, ctx.y, CW, closingHeight, 6).fill(C.bgLight);
  let y = ctx.y + 10;
  for (const line of NEOVOLT_CGV_CLOSING) {
    const height = measureText(doc, line, textWidth, 'Helvetica', 8.3);
    doc.fillColor(C.textSec).text(line, MG + padX, y, { width: textWidth });
    y += height + 4;
  }
  ctx.y += closingHeight;
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
      drawPremiumClosingNote(ctx);
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
