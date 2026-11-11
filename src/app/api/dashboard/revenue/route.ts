import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { loadRevenueOverview } from '@/lib/revenue-data';
import { currentRevenueYear, parseRevenueYear } from '@/lib/revenue';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    const currentYear = currentRevenueYear();
    let year: number;
    try { year = parseRevenueYear(request.nextUrl.searchParams.get('year'), currentYear); }
    catch { return NextResponse.json({ error: 'Choisissez une année entre 1900 et l’année actuelle.' }, { status: 400 }); }
    return NextResponse.json(await loadRevenueOverview(user.id, year, currentYear), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('Revenue overview error:', error);
    return NextResponse.json({ error: 'Impossible de charger le chiffre d’affaires.' }, { status: 500 });
  }
}
