/**
 * Connectivity check for the service-role client (src/lib/supabase/admin.ts).
 *
 * Proves SUPABASE_SERVICE_ROLE_KEY is present, well-formed, and accepted by
 * the Supabase API — WITHOUT printing the key or any user's email address.
 *
 * Run from the project root:  node scripts/check-admin-client.js
 */

const fs = require('fs');
const path = require('path');

// --- Load .env.local (Node doesn't do this automatically for plain scripts) ---
const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('FAIL: .env.local not found at project root.');
  process.exit(1);
}

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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('=== Service-role client connectivity check ===\n');

// --- 1. Presence ---
if (!url) {
  console.error('FAIL: NEXT_PUBLIC_SUPABASE_URL is not set.');
  process.exit(1);
}
if (!serviceKey) {
  console.error(
    'FAIL: SUPABASE_SERVICE_ROLE_KEY is not set in .env.local.\n' +
      '      Supabase Dashboard -> Settings -> API -> service_role (secret).'
  );
  process.exit(1);
}
console.log(`URL:             ${url}`);
console.log(`Service key:     present (${serviceKey.length} chars)`);

// --- 2. Shape: confirm the key is a secret key, not a public one ---
// Catches the single most common mistake: pasting a public key into the
// service-role slot. Supabase has two key formats in circulation:
//
//   sb_secret_... / sb_publishable_...  — current, opaque (nothing to decode)
//   eyJ...                              — legacy JWT, carries a `role` claim
//
// Only the format and (for JWTs) the role/ref claims are printed, never the key.
if (serviceKey === anonKey) {
  console.error('\nFAIL: SUPABASE_SERVICE_ROLE_KEY is identical to the anon key.');
  process.exit(1);
}

if (serviceKey.startsWith('sb_secret_')) {
  console.log('Key format:      sb_secret_ (current secret key) - OK');
} else if (serviceKey.startsWith('sb_publishable_')) {
  console.error(
    '\nFAIL: this is a PUBLISHABLE key, not a secret key.\n' +
      '      Dashboard -> Settings -> API Keys -> "secret" (sb_secret_...).'
  );
  process.exit(1);
} else if (serviceKey.startsWith('eyJ')) {
  // Legacy JWT: the role claim is readable, so check it.
  let claimedRole = null;
  try {
    const payload = JSON.parse(
      Buffer.from(serviceKey.split('.')[1], 'base64').toString('utf8')
    );
    claimedRole = payload.role;
    console.log(`Key format:      legacy JWT (role=${payload.role}, ref=${payload.ref})`);
  } catch {
    console.error('\nFAIL: key looks like a JWT but its payload will not decode.');
    process.exit(1);
  }
  if (claimedRole !== 'service_role') {
    console.error(
      `\nFAIL: key's role claim is "${claimedRole}", expected "service_role".`
    );
    process.exit(1);
  }
} else {
  console.error(
    '\nFAIL: unrecognised key format (expected sb_secret_... or eyJ...).\n' +
      '      Check for a truncated paste or a stray character in .env.local.'
  );
  process.exit(1);
}

// Opaque keys carry no role claim, so format alone cannot prove this key is
// privileged — only the live calls below can. Test C is what actually
// distinguishes a secret key from a public one at the API level.

// --- 3. Live calls ---
(async () => {
  const { createClient } = require('@supabase/supabase-js');
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 3a. Does the key authenticate at all?
  console.log('\n--- Test A: service-role can read a table ---');
  const { error: readError } = await admin
    .from('profiles')
    .select('id', { count: 'exact', head: true });

  if (readError) {
    console.error(`FAIL: ${readError.message}`);
    process.exit(1);
  }
  console.log('PASS: authenticated and queried `profiles`.');

  // 3b. Can service_role still execute the locked-down RPC?
  // Uses a username that will not exist, so nothing is printed either way:
  // a valid grant returns data: null, a missing grant returns a 42501 error.
  console.log('\n--- Test B: service-role can EXECUTE the RPC ---');
  const { error: rpcError } = await admin.rpc('get_user_email_by_username', {
    lookup_username: '__connectivity_probe_no_such_user__',
  });

  if (!rpcError) {
    console.log('PASS: RPC executed (no permission error).');
  } else if (rpcError.code === '42501') {
    console.error(
      'FAIL: permission denied for service_role.\n' +
        '      Migration 003 revoked too much - check the GRANT ... TO service_role line.'
    );
    process.exit(1);
  } else if (rpcError.code === 'PGRST202') {
    console.error(
      'FAIL: function not found.\n' +
        '      Either migration 002 was never applied, or 003 changed the signature.'
    );
    process.exit(1);
  } else {
    console.error(`FAIL: ${rpcError.code || '?'} - ${rpcError.message}`);
    process.exit(1);
  }

  // 3c. Differential check: the SAME call with the anon key must be denied.
  // Current-format secret keys are opaque, so nothing about the string proves
  // it is privileged. Running one call under both keys does: if both succeed,
  // either the key in the service slot is really a public key, or migration
  // 003's REVOKE did not take. Both are silent failures otherwise.
  console.log('\n--- Test C: anon key is DENIED the same RPC ---');
  if (!anonKey) {
    console.log('SKIP: NEXT_PUBLIC_SUPABASE_ANON_KEY not set.');
  } else {
    const pub = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: anonRpcError } = await pub.rpc('get_user_email_by_username', {
      lookup_username: '__connectivity_probe_no_such_user__',
    });

    if (anonRpcError && anonRpcError.code === '42501') {
      console.log('PASS: anon denied (42501) while service-role succeeded.');
    } else if (!anonRpcError) {
      console.error(
        'FAIL: the anon key can still execute this RPC.\n' +
          '      Either migration 003 was not applied, or the key in the\n' +
          '      SUPABASE_SERVICE_ROLE_KEY slot is not actually privileged.'
      );
      process.exit(1);
    } else {
      console.error(
        `FAIL: unexpected anon-side error ${anonRpcError.code || '?'} - ${anonRpcError.message}`
      );
      process.exit(1);
    }
  }

  console.log('\n=== All checks passed. admin.ts is wired correctly. ===');
})();
