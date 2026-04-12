import { NextResponse } from 'next/server';
import { getCurrentUser, deleteSessionCookie } from '@/lib/session';
import { db } from '@/lib/db';

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (user) {
      await db.user.update({
        where: { id: user.id },
        data: { sessionToken: null, sessionExpiry: null },
      });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(deleteSessionCookie());
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la déconnexion' },
      { status: 500 }
    );
  }
}
