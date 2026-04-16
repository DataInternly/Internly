// js/supabase.js
// Laad dit bestand ALTIJD na de Supabase CDN script en vóór alle pagina-scripts.
// Het maakt één globale `supabase` client aan die index.html kan hergebruiken.
// Alle andere pagina's declareren hun eigen `db` client inline.

const SUPABASE_URL      = 'https://qoxgbkbnjsycodcqqmft.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFveGdia2JuanN5Y29kY3FxbWZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MTg4OTUsImV4cCI6MjA5MTM5NDg5NX0.XpfdNGwTUG7uzuM0wifeXrws-hok_Ta7H5MyNZMZPzg';

// Globale client — beschikbaar als `supabase` op index.html
// (gebruikt door schrijfInHero() en de waitlist-popup op index.html)
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ── SESSION FIXES ──────────────────────────────────────────────────────────
   Removed dead helpers: getCurrentUser(), signUp(), getInternships(),
   applyToInternship() — each page uses its own inline db client.
   ─────────────────────────────────────────────────────────────────────────── */

// Push helpers live in js/push.js — loaded by all app pages that need push.
// index.html is a public landing page and does not register push notifications.

/* ── FEATURE FLAGS ──────────────────────────────────────────────────────────
   hasActivePlan(minPlan) — returns true if the current user has at least the
   given plan tier active. Currently always returns true so feature-gated code
   can be written and tested before Mollie payments go live.

   Plans:  'company_starter' | 'company_pro' | 'company_business'
           'school_freemium' | 'school_premium'

   Usage:
     if (await hasActivePlan('company_pro')) { renderESGExport(); }
   ─────────────────────────────────────────────────────────────────────────── */
async function hasActivePlan(_minPlan) {
  // STUB: altijd true totdat Mollie-integratie live is.
  // Vervang door echte subscription check op `subscriptions` tabel.
  return true;
}
