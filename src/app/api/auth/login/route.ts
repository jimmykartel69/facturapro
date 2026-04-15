import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, generateSessionToken } from '@/lib/auth';
import { createSessionCookie } from '@/lib/session';

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Payload JSON invalide' }, { status: 400 });
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 });
    }

    const payload = body as Record<string, unknown>;
    const email = String(payload.email ?? '').trim().toLowerCase();
    const password = String(payload.password ?? '');

    if (!email || !password) {
      return NextResponse.json(
        { error: 'L\'email et le mot de passe sont requis' },
        { status: 400 }
      );
    }

    // Validation légère pour éviter des requêtes DB inutiles sur des entrées manifestement invalides.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Format d\'email invalide' }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        passwordHash: true,
      },
    });

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      );
    }

    const sessionToken = generateSessionToken();
    const sessionExpiry = new Date(Date.now() + SESSION_DURATION_MS);

    await db.user.update({
      where: { id: user.id },
      data: { sessionToken, sessionExpiry },
    });

    const response = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, firstName: user.firstName },
    });
    response.cookies.set(createSessionCookie(sessionToken));
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la connexion' },
      { status: 500 }
    );
  }
}
