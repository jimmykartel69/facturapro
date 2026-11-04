#!/usr/bin/env python3
"""Apply reviewed Phase A security changes to FacturaPro's original dev branch.
Does not connect to a database, commit or push. Aborts on an unexpected base.
"""
from __future__ import annotations
import argparse
import subprocess
from pathlib import Path

BASE = '39c30cd7425e95cff54a39618e8d1b863a969d1d'
PACK = Path(__file__).resolve().parent

def git(root: Path, *args: str) -> str:
    return subprocess.check_output(['git', *args], cwd=root, text=True).strip()

def main() -> None:
    parser=argparse.ArgumentParser()
    parser.add_argument('--repo', type=Path, default=Path.cwd(), help='Local clone of jimmykartel69/facturapro')
    a=parser.parse_args()
    root=a.repo.resolve()
    if git(root, 'rev-parse', 'HEAD')!=BASE:
        raise RuntimeError('Commit de depart different de 39c30cd. Verifiez la branche DEV avant de continuer.')
    if git(root, 'branch', '--show-current')!='dev':
        raise RuntimeError('Execution uniquement sur la branche git dev.')
    if git(root, 'status', '--porcelain'):
        raise RuntimeError('Le dossier Git contient des modifications locales. Nettoyer ou sauvegarder avant application.')
    changes:dict[str,str]={}

    def content(path:str) -> str:
        if path not in changes:
            changes[path]=(root/path).read_text(encoding='utf-8')
        return changes[path]
    def replace(path:str, before:str, after:str):
        s=content(path)
        count=s.count(before)
        if count != 1:
            raise RuntimeError(f'{path} : correspondance attendue 1, trouvee {count}: {before[:70]!r}')
        changes[path]=s.replace(before,after,1)
    def add(path:str):
        if (root/path).exists():
            raise RuntimeError(f'{path} existe deja, abandon pour ne pas ecraser')
        changes[path]=(PACK/path).read_text(encoding='utf-8')

    replace('src/app/api/settings/route.ts',
            'const updated = await db.user.update({','await db.user.update({')
    replace('src/app/api/settings/route.ts',
            '    return NextResponse.json({ settings: updated });',
            '    // Return only whitelisted fields; never expose tokens or password hashes.\n'
            '    const safeSettings = await getCurrentUser();\n'
            '    return NextResponse.json({ settings: safeSettings });')

    path='src/app/api/invoices/[id]/route.ts'
    replace(path,"import { db } from '@/lib/db';",
            "import { db } from '@/lib/db';\nimport { canEditInvoiceDocument, isAllowedInvoiceTransition } from '@/lib/invoice-guards';")
    replace(path,"""    if (
      (existing.status === 'paid' || existing.status === 'cancelled') &&
      (hasClientId || hasDueDate || hasGlobalDiscount || hasItems)
    ) {
      return NextResponse.json(
        { error: 'Cette facture ne peut plus être modifiée sur ses données financières' },
        { status: 400 }
      );
    }""","""    // An issued invoice is immutable except for legitimate payment/status changes.
    // Historical corrections must be performed through a credit note or correction document.
    const hasDocumentChanges = hasClientId || hasDueDate || hasNotes || hasGlobalDiscount || hasItems;
    if (!canEditInvoiceDocument(existing.status) && hasDocumentChanges) {
      return NextResponse.json(
        { error: 'Facture émise : contenu non modifiable. Créez un avoir ou une facture rectificative.' },
        { status: 409 }
      );
    }

    if (hasStatus) {
      const nextStatus = String(body.status ?? '').trim();
      if (!isAllowedInvoiceTransition(existing.status, nextStatus)) {
        return NextResponse.json(
          { error: 'Transition de statut interdite pour cette facture' },
          { status: 409 }
        );
      }
    }""")
    replace(path,"where: { id: existing.id },\n        data: {",
            "where: { id: existing.id, userId: user.id, status: existing.status },\n        data: {")
    replace(path,"if (existing.status !== 'draft') {\n      return NextResponse.json(",
            "if (!canEditInvoiceDocument(existing.status)) {\n      return NextResponse.json(")
    replace(path,'await tx.invoice.delete({ where: { id: existing.id } });',
            "await tx.invoice.delete({ where: { id: existing.id, userId: user.id, status: 'draft' } });")
    replace(path,"{ error: 'Facture non trouvée' }, { status: 404 });\n      }\n    }\n    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });",
            "{ error: 'Statut de la facture modifié entre-temps. Actualisez la page.' }, { status: 409 });\n      }\n    }\n    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });")
    replace(path,"return NextResponse.json({ error: 'Facture non trouvée' }, { status: 404 });\n    }\n    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });",
            "return NextResponse.json({ error: 'Facture modifiée entre-temps. Actualisez la page.' }, { status: 409 });\n    }\n    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });")

    add('src/lib/invoice-guards.ts')
    add('src/lib/billing-input.ts')
    path='src/app/api/devis/route.ts'
    replace(path,"import { siteReferenceSchema } from '@/lib/site-reference';",
            "import { siteReferenceSchema } from '@/lib/site-reference';\nimport { parseBillingItems } from '@/lib/billing-input';")
    replace(path,"""    const { clientId, items, notes, globalDiscount, validUntil, status } = body;

    if (!clientId || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Le client et au moins un article sont requis' },
        { status: 400 }
      );
    }""","""    const { clientId, items, notes, globalDiscount, validUntil, status } = body;

    if (!clientId) {
      return NextResponse.json({ error: 'Client requis' }, { status: 400 });
    }
    const parsedItems = parseBillingItems(items);
    if (!parsedItems.ok) {
      return NextResponse.json({ error: parsedItems.error }, { status: 400 });
    }
    if (status !== undefined && !['draft', 'sent', 'accepted', 'refused'].includes(status)) {
      return NextResponse.json({ error: 'Statut de devis invalide' }, { status: 400 });
    }""")
    replace(path,"create: items.map((item: { designation: string; description?: string; quantity: number; unit: string; unitPrice: number; tvaRate: number }) => ({",
            "create: parsedItems.items.map((item) => ({")

    path='src/app/api/devis/[id]/route.ts'
    replace(path,"import { NextRequest, NextResponse } from 'next/server';",
            "import { NextRequest, NextResponse } from 'next/server';\nimport { Prisma } from '@prisma/client';")
    replace(path,"import { siteReferenceSchema } from '@/lib/site-reference';",
            "import { siteReferenceSchema } from '@/lib/site-reference';\nimport { parseBillingItems } from '@/lib/billing-input';")
    replace(path,"""    if (!existing) {
      return NextResponse.json({ error: 'Devis non trouvé' }, { status: 404 });
    }

    const devis = await db.devis.update({""","""    if (!existing) {
      return NextResponse.json({ error: 'Devis non trouvé' }, { status: 404 });
    }
    if (existing.status === 'converted') {
      return NextResponse.json(
        { error: 'Ce devis est déjà converti en facture et ne peut plus être modifié.' },
        { status: 409 }
      );
    }

    if (body.clientId !== undefined) {
      const client = await db.client.findFirst({
        where: { id: String(body.clientId), userId: user.id },
        select: { id: true },
      });
      if (!client) return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 });
    }

    if (body.status !== undefined && !['draft', 'sent', 'accepted', 'refused'].includes(body.status)) {
      return NextResponse.json({ error: 'Statut de devis invalide' }, { status: 400 });
    }
    if (body.validUntil !== undefined && Number.isNaN(new Date(body.validUntil).getTime())) {
      return NextResponse.json({ error: 'Date de validité invalide' }, { status: 400 });
    }
    if (body.globalDiscount !== undefined &&
        (!Number.isFinite(Number(body.globalDiscount)) ||
         Number(body.globalDiscount) < 0 || Number(body.globalDiscount) > 100)) {
      return NextResponse.json({ error: 'Remise globale invalide' }, { status: 400 });
    }
    const parsedItems = body.items !== undefined ? parseBillingItems(body.items) : null;
    if (parsedItems && !parsedItems.ok) {
      return NextResponse.json({ error: parsedItems.error }, { status: 400 });
    }

    const devis = await db.devis.update({""")
    replace(path,'const devis = await db.devis.update({\n      where: { id },',
            "const devis = await db.devis.update({\n      where: { id, userId: user.id, status: { not: 'converted' } },")
    replace(path,"""        ...(body.items && {
          items: {
            deleteMany: {},
            create: body.items.map((item: { designation: string; description?: string; quantity: number; unit: string; unitPrice: number; tvaRate: number }) => ({""",
            """        ...(parsedItems?.ok && {
          items: {
            deleteMany: {},
            create: parsedItems.items.map((item) => ({""")
    replace(path,"""    if (!existing) {
      return NextResponse.json({ error: 'Devis non trouvé' }, { status: 404 });
    }

    await db.devis.delete({ where: { id } });""","""    if (!existing) {
      return NextResponse.json({ error: 'Devis non trouvé' }, { status: 404 });
    }
    if (existing.status === 'converted') {
      return NextResponse.json(
        { error: 'Un devis converti en facture ne peut pas être supprimé.' },
        { status: 409 }
      );
    }

    await db.devis.delete({ where: { id, userId: user.id, status: { not: 'converted' } } });""")
    replace(path,"console.error('Devis PUT error:', error);\n    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });",
            "console.error('Devis PUT error:', error);\n    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {\n      return NextResponse.json({ error: 'Devis modifié entre-temps. Actualisez la page.' }, { status: 409 });\n    }\n    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });")
    replace(path,"console.error('Devis DELETE error:', error);\n    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });",
            "console.error('Devis DELETE error:', error);\n    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {\n      return NextResponse.json({ error: 'Devis modifié entre-temps. Actualisez la page.' }, { status: 409 });\n    }\n    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });")

    path='src/components/facturapro/invoice-detail.tsx'
    replace(path,"  const canEdit = invoice.status !== 'paid' && invoice.status !== 'cancelled';",
            "  const canEdit = invoice.status === 'draft';")
    replace(path,'          <Button variant="outline" size="sm" className="text-red-600" onClick={() => setShowDelete(true)} disabled={!!actionLoading}>',
            '          {invoice.status === \'draft\' && <Button variant="outline" size="sm" className="text-red-600" onClick={() => setShowDelete(true)} disabled={!!actionLoading}>')
    s=content(path); start=s.index("          {invoice.status === 'draft' && <Button variant="); end=s.index('</Button>',start)
    changes[path]=s[:end]+s[end:].replace('</Button>','</Button>}',1)

    path='src/components/facturapro/devis-detail.tsx'
    replace(path,'          <Button variant="outline" size="sm" className="text-red-600" onClick={() => setShowDelete(true)}>',
            '          {canEdit && <Button variant="outline" size="sm" className="text-red-600" onClick={() => setShowDelete(true)}>')
    s=content(path);start=s.index('          {canEdit && <Button variant="outline" size="sm" className="text-red-600"');end=s.index('</Button>',start)
    changes[path]=s[:end]+s[end:].replace('</Button>','</Button>}',1)

    path='tests/site-reference.test.cjs'
    replace(path,"const validation = load('src/lib/site-reference.ts');",
            "const validation = load('src/lib/site-reference.ts');\nconst billing = load('src/lib/billing-input.ts');")
    replace(path,"    '@/lib/site-reference': validation,",
            "    '@/lib/site-reference': validation,\n    '@/lib/billing-input': billing,")
    add('tests/billing-input.test.mjs')
    add('tests/invoice-guards.test.mjs')
    add('tests/api-security.test.cjs')
    replace('package.json','    "build": "next build",',
            '    "build": "next build",\n    "test": "node --experimental-strip-types --test",')

    # All assertions have passed; write in one batch.
    for rel,body in changes.items():
        dest=root/rel;dest.parent.mkdir(parents=True,exist_ok=True)
        dest.write_text(body,encoding='utf-8')
    print(f'SUCCES : {len(changes)} fichiers appliques dans {root}')
    print('Aucune migration de base de donnees, aucun commit et aucun push effectues.')

if __name__=='__main__':
    main()
