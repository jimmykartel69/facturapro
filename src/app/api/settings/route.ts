import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    return NextResponse.json({ settings: user });
  } catch (error) {
    console.error('Settings GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();

    const updated = await db.user.update({
      where: { id: user.id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.firstName !== undefined && { firstName: body.firstName }),
        ...(body.companyName !== undefined && { companyName: body.companyName }),
        ...(body.legalForm !== undefined && { legalForm: body.legalForm }),
        ...(body.siret !== undefined && { siret: body.siret }),
        ...(body.tvaNumber !== undefined && { tvaNumber: body.tvaNumber }),
        ...(body.rcsNumber !== undefined && { rcsNumber: body.rcsNumber }),
        ...(body.socialCapital !== undefined && { socialCapital: body.socialCapital }),
        ...(body.address !== undefined && { address: body.address }),
        ...(body.addressComplement !== undefined && { addressComplement: body.addressComplement }),
        ...(body.postalCode !== undefined && { postalCode: body.postalCode }),
        ...(body.city !== undefined && { city: body.city }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.professionalEmail !== undefined && { professionalEmail: body.professionalEmail }),
        ...(body.website !== undefined && { website: body.website }),
        ...(body.directorName !== undefined && { directorName: body.directorName }),
        ...(body.directorTitle !== undefined && { directorTitle: body.directorTitle }),
        ...(body.accentColor !== undefined && { accentColor: body.accentColor }),
        ...(body.customNotes !== undefined && { customNotes: body.customNotes }),
        ...(body.paymentTerms !== undefined && { paymentTerms: body.paymentTerms }),
        ...(body.latePenaltyRate !== undefined && { latePenaltyRate: body.latePenaltyRate }),
        ...(body.earlyDiscount !== undefined && { earlyDiscount: body.earlyDiscount }),
        ...(body.earlyDiscountDays !== undefined && { earlyDiscountDays: body.earlyDiscountDays }),
        ...(body.devisPrefix !== undefined && { devisPrefix: body.devisPrefix }),
        ...(body.invoicePrefix !== undefined && { invoicePrefix: body.invoicePrefix }),
        ...(body.nextDevisNumber !== undefined && { nextDevisNumber: body.nextDevisNumber }),
        ...(body.nextInvoiceNumber !== undefined && { nextInvoiceNumber: body.nextInvoiceNumber }),
        ...(body.iban !== undefined && { iban: body.iban }),
        ...(body.bic !== undefined && { bic: body.bic }),
        ...(body.bankName !== undefined && { bankName: body.bankName }),
        ...(body.accountHolder !== undefined && { accountHolder: body.accountHolder }),
      },
    });

    return NextResponse.json({ settings: updated });
  } catch (error) {
    console.error('Settings PUT error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
