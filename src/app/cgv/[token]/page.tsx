import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Conditions générales de vente | Facturapro',
  robots: { index: false, follow: false },
};

export default async function CgvPublicPage({
  params,
}: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(token)) notFound();

  const snapshot = await db.cgvSnapshot.findUnique({
    where: { token },
    select: { companyName: true, clientType: true, content: true, version: true, createdAt: true },
  });
  if (!snapshot) notFound();

  const type = snapshot.clientType === 'business' ? 'professionnels' : 'particuliers';
  const date = new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Europe/Paris',
  }).format(snapshot.createdAt);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <article className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <header className="border-b border-slate-200 pb-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">{snapshot.companyName}</p>
          <h1 className="mt-2 text-2xl font-bold">Conditions générales de vente</h1>
          <p className="mt-2 text-sm text-slate-600">Version destinée aux clients {type}.</p>
          <p className="mt-1 text-xs text-slate-500">Version immuable {snapshot.version.slice(0, 12)} · Archivée le {date}</p>
          <a className="mt-5 inline-flex rounded-lg bg-blue-700 px-4 py-3 font-medium text-white hover:bg-blue-800"
            href={`/api/cgv/${token}/pdf`}>
            Télécharger les CGV en PDF
          </a>
        </header>
        <section className="mt-7 whitespace-pre-wrap break-words text-sm leading-7 text-slate-800">
          {snapshot.content}
        </section>
        <footer className="mt-8 border-t border-slate-200 pt-5 text-xs text-slate-600">
          Cette page présente les conditions associées au document émis. Un QR code ne remplace pas
          la remise d'un exemplaire sur support durable lorsqu'elle est légalement exigée.
        </footer>
      </article>
    </main>
  );
}
