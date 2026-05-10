#!/usr/bin/env node
/**
 * SEED LEERAGREEMENTEN — Internly livetest 11 mei 2026
 *
 * Wat dit script doet:
 *   1. Leest 5 placeholder PDFs uit scripts/output/
 *   2. Uploadt elk naar Supabase Storage 'leeragreementen' op pad
 *      <profile_id>/leeragreement.pdf  (overschrijft bestaande)
 *   3. Maakt signed URL (7 dagen geldig — livetest-window)
 *   4. UPDATE student_profiles.leeragreement_url + leeragreement_uploaded_at
 *
 * Vereisten:
 *   - .env in project root met:
 *       SUPABASE_URL=https://qoxgbkbnjsycodcqqmft.supabase.co
 *       SUPABASE_SERVICE_KEY=<service-role key, NIET de anon key>
 *   - Storage bucket 'leeragreementen' bestaat al (private)
 *   - PDFs in scripts/output/ — run eerst:
 *       python scripts/generate-bbl-placeholder.py
 *   - npm install @supabase/supabase-js dotenv
 *
 * Run:
 *   node scripts/seed-leeragreementen.js
 *
 * NB: vereist dat de RLS-policy op storage.objects de service-role
 * laat schrijven (service-role bypasst RLS standaard, dus OK).
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('FOUT: SUPABASE_URL of SUPABASE_SERVICE_KEY ontbreekt in .env');
  console.error('Voorbeeld .env:');
  console.error('  SUPABASE_URL=https://qoxgbkbnjsycodcqqmft.supabase.co');
  console.error('  SUPABASE_SERVICE_KEY=<service-role key uit Supabase dashboard>');
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// profile_ids geverifieerd via SQL-audit 10 mei 2026.
// Daan H. resolved we runtime via auth.admin (email-lookup).
const STUDENTEN = [
  { naam: 'Koen BBL',      slug: 'koen-bbl',      profile_id: '3e517403-efc7-48fa-9a45-8e9f0b9e7145' },
  { naam: 'Rik BBL',       slug: 'rik-bbl',       profile_id: '57ac5ab2-d757-45fc-8c3b-428d48db9386' },
  { naam: 'Pepijn BBL',    slug: 'pepijn-bbl',    profile_id: '6b1ee34c-5acd-40cc-afa5-c3e934c194b1' },
  { naam: 'Patrick BBL',   slug: 'patrick-bbl',   profile_id: '207f0724-02ec-4281-9afd-429102afa59b' },
  { naam: 'Daan Hendriks', slug: 'daan-hendriks', profile_id: null /* lookup via email */ },
];

const PDF_DIR = path.join(__dirname, 'output');
const BUCKET  = 'leeragreementen';
const SIGNED_URL_TTL = 60 * 60 * 24 * 7; // 7 dagen

async function resolveDaanId() {
  // auth.users-lookup vereist service-role + admin API
  const { data, error } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error('auth.admin.listUsers fout: ' + error.message);
  const u = (data?.users || []).find(x => (x.email || '').toLowerCase() === 'daan.bbl@internly.pro');
  if (!u) throw new Error('Daan-user niet gevonden voor email daan.bbl@internly.pro');
  return u.id;
}

async function seedStudent(student) {
  console.log(`\n→ ${student.naam}`);

  if (!student.profile_id) {
    console.log('  · profile_id lookup via email...');
    student.profile_id = await resolveDaanId();
    console.log(`  · profile_id: ${student.profile_id}`);
  }

  const pdfPath = path.join(PDF_DIR, `leeragreement-${student.slug}.pdf`);
  if (!fs.existsSync(pdfPath)) {
    console.error(`  ✗ PDF ontbreekt: ${pdfPath}`);
    console.error('    Run eerst: python scripts/generate-bbl-placeholder.py');
    return false;
  }
  const pdfBuffer = fs.readFileSync(pdfPath);
  console.log(`  · PDF gelezen (${pdfBuffer.length} bytes)`);

  const storagePath = `${student.profile_id}/leeragreement.pdf`;
  const { error: upErr } = await db.storage
    .from(BUCKET)
    .upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    });
  if (upErr) {
    console.error(`  ✗ upload fout: ${upErr.message}`);
    return false;
  }
  console.log(`  · upload → ${BUCKET}/${storagePath}`);

  const { data: signed, error: signErr } = await db.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL);
  if (signErr) {
    console.error(`  ✗ signed URL fout: ${signErr.message}`);
    return false;
  }

  const { error: updErr } = await db
    .from('student_profiles')
    .update({
      leeragreement_url: signed.signedUrl,
      leeragreement_uploaded_at: new Date().toISOString(),
    })
    .eq('profile_id', student.profile_id);
  if (updErr) {
    console.error(`  ✗ DB update fout: ${updErr.message}`);
    return false;
  }
  console.log(`  ✓ student_profiles bijgewerkt — leeragreement_url + uploaded_at`);
  return true;
}

async function main() {
  console.log('SEED LEERAGREEMENTEN — Internly livetest 11 mei 2026');
  console.log(`Bucket: ${BUCKET}`);
  console.log(`Studenten: ${STUDENTEN.length}`);
  console.log(`PDF-bron: ${PDF_DIR}`);

  let ok = 0, fail = 0;
  for (const student of STUDENTEN) {
    try {
      const success = await seedStudent(student);
      if (success) ok++; else fail++;
    } catch (err) {
      console.error(`  ✗ exception voor ${student.naam}:`, err?.message || err);
      fail++;
    }
  }

  console.log('\n────────────────────────────────');
  console.log(`Klaar: ${ok} succes / ${fail} mislukt`);
  if (fail > 0) process.exit(1);
}

main().catch(err => {
  console.error('Fataal:', err);
  process.exit(1);
});
