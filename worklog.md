---
Task ID: 1
Agent: main
Task: Améliorer le modal de devis/facture - Désignation + Description, listes déroulantes plus larges, informations optimisées

Work Log:
- Added `designation` field to Prisma schema (DevisItem + InvoiceItem), made `description` optional
- Created manual SQL migration in `prisma/migrations/20240602000000_add_designation/migration.sql`
- Generated updated Prisma client
- Updated TypeScript types (`types.ts`) for DevisItem and InvoiceItem
- Updated 5 API routes to handle `designation`:
  - `src/app/api/devis/route.ts` (GET select + POST create)
  - `src/app/api/invoices/route.ts` (GET select + POST create)
  - `src/app/api/devis/[id]/route.ts` (PUT items create)
  - `src/app/api/invoices/[id]/route.ts` (PUT items create)
  - `src/app/api/convert-devis/route.ts` (devis→invoice items mapping)
- Rewrote `invoice-form.tsx` with:
  - Two-row layout per item (Désignation + Description separated)
  - `max-w-4xl` modal (was max-w-3xl)
  - Unité as proper Select dropdown with 15 common units (h, jour, m, m², forfait, pose, etc.)
  - TVA as Select dropdown with auto-entrepreneur 0% as default
  - Textarea for Description and Notes fields
  - Card-style items with border + bg-muted/20
  - Better labels with `font-medium`
- Rewrote `devis-form.tsx` with same improvements
- Updated `invoice-detail.tsx` table: Désignation + Description columns, responsive hide on mobile
- Updated `devis-detail.tsx` table: same improvements
- Updated `pdf.ts` drawTableRow: designation in bold, description in smaller gray below

Stage Summary:
- All 7 files modified successfully
- ESLint passes clean
- No new TypeScript errors introduced
- Migration ready for Render deploy (will run `prisma migrate deploy`)
- Key improvement: each line now has Désignation (required) + Description (optional), wider Selects, preset units optimized for electricity sector
