/**
 * TEMPORARY diagnostic for SECURITY_BACKLOG.md Item 8.
 *
 * PostgREST cannot run raw SQL, so the aggregate
 *   SELECT COUNT(*) FILTER (WHERE eliminated), COUNT(*) FROM tournament_participants
 * is expressed as exact head-counts with filters. Same numbers.
 *
 * Also counts confirmed matches: `marked = 0` only proves the bug if there are
 * confirmed matches that should have produced eliminations.
 *
 * Delete after use.  Run:  node scripts/tmp-item8-counts.js
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
for (const rawLine of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const line = rawLine.trim();
  if (!line || line.startsWith('#')) continue;
  const eq = line.indexOf('=');
  if (eq === -1) continue;
  const key = line.slice(0, eq).trim();
  let value = line.slice(eq + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  if (!(key in process.env)) process.env[key] = value;
}

(async () => {
  const { createClient } = require('@supabase/supabase-js');
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const count = async (table, apply) => {
    let q = admin.from(table).select('id', { count: 'exact', head: true });
    if (apply) q = apply(q);
    const { count: n, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    return n;
  };

  const total       = await count('tournament_participants');
  const marked      = await count('tournament_participants', q => q.eq('eliminated', true));
  const matchTotal  = await count('matches');
  const confirmed   = await count('matches', q => q.eq('status', 'confirmed'));
  const withWinner  = await count('matches', q => q.not('winner_id', 'is', null));

  console.log('--- tournament_participants ---');
  console.log(`marked (eliminated = true) : ${marked}`);
  console.log(`total                      : ${total}`);
  console.log('');
  console.log('--- matches (context) ---');
  console.log(`total                      : ${matchTotal}`);
  console.log(`status = 'confirmed'       : ${confirmed}`);
  console.log(`winner_id IS NOT NULL      : ${withWinner}`);
  console.log('');

  if (confirmed === 0 && withWinner === 0) {
    console.log('INCONCLUSIVE: no confirmed matches exist, so no eliminations');
    console.log('are expected yet. The missing UPDATE policy is still a real');
    console.log('defect, but it has not corrupted data yet.');
  } else if (marked === 0) {
    console.log('BUG CONFIRMED: confirmed matches exist but zero participants');
    console.log('are flagged eliminated. A backfill is needed alongside the fix.');
  } else {
    console.log(`MIXED: ${marked} participant(s) are flagged. Compare against`);
    console.log('the number of decided matches before assuming a clean backfill.');
  }
})().catch((e) => {
  console.error(`FAILED: ${e.message}`);
  process.exit(1);
});
