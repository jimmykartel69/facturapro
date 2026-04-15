import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, generateSessionToken } from '@/lib/auth';
import { createSessionCookie } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, firstName, email, password, companyName } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Le nom, l\'email et le mot de passe sont requis' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 8 caractères' },
        { status: 400 }
      );
    }

    const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return NextResponse.json(
        { error: 'Un compte avec cet email existe déjà' },
        { status: 409 }
      );
    }

    const passwordHash = hashPassword(password);
    const sessionToken = generateSessionToken();
    const sessionExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const user = await db.user.create({
      data: {
        name,
        firstName: firstName || '',
        email: email.toLowerCase(),
        passwordHash,
        companyName: companyName || null,
        sessionToken,
        sessionExpiry,
      },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
      },
    });

    const response = NextResponse.json({ user }, { status: 201 });
    response.cookies.set(createSessionCookie(sessionToken));
    return response;
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'inscription' },
      { status: 500 }
    );
  }
}
