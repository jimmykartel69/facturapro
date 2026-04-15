import { cookies } from 'next/headers';
import { db } from '@/lib/db';

const SESSION_COOKIE = 'facturapro_session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) return null;

  const user = await db.user.findFirst({
    where: {
      sessionToken: token,
      sessionExpiry: { gt: new Date() },
    },
    select: {
      id: true,
      email: true,
      name: true,
      firstName: true,
      companyName: true,
      phone: true,
      address: true,
      postalCode: true,
      city: true,
      siret: true,
      tvaNumber: true,
      rcsNumber: true,
      legalForm: true,
      socialCapital: true,
      addressComplement: true,
      professionalEmail: true,
      website: true,
      directorName: true,
      directorTitle: true,
      logoBase64: true,
      logoMimeType: true,
      accentColor: true,
      customNotes: true,
      paymentTerms: true,
      latePenaltyRate: true,
      earlyDiscount: true,
      earlyDiscountDays: true,
      devisPrefix: true,
      invoicePrefix: true,
      nextDevisNumber: true,
      nextInvoiceNumber: true,
      iban: true,
      bic: true,
      bankName: true,
      accountHolder: true,
    },
  });

  return user;
}

export function createSessionCookie(token: string) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: MAX_AGE,
  };
}

export function deleteSessionCookie() {
  return {
    name: SESSION_COOKIE,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  };
}

export { SESSION_COOKIE, MAX_AGE };
