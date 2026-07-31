const https = require('https');

const supabaseUrl = 'qisvoguakfwwyeiedhuz.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpc3ZvZ3Vha2Z3d3llaWVkaHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwOTI1MTgsImV4cCI6MjEwMDY2ODUxOH0.GEZmFrwy46a_8PzC8lpb6LVckMYVFwdZw1q_i31aDqM';

function rpc(path, method, extraHeaders = {}, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: supabaseUrl,
      path,
      method,
      headers: {
        'apikey': anonKey,
        'Content-Type': 'application/json',
        ...extraHeaders
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runLiveSuite() {
  console.log("=== LIVE SUPABASE HTTP SECURITY SUITE ===\n");

  // ─── VERIFY CONNECTION ──────────────────────────────────────────
  console.log(">>> VERIFY: GET /rest/v1/games?select=id,name");
  const gamesRes = await rpc('/rest/v1/games?select=id,name', 'GET');
  console.log(`HTTP Status: ${gamesRes.status}`);
  console.log(`Response Body: ${gamesRes.body}\n`);

  // ─── CHECK 3a: Register ONE real account ────────────────────────
  const ts = Date.now();
  // Use a unique timestamp-based address — gmail accepted by Supabase validator
  const testEmail = `etournex.sec.${ts}@gmail.com`;
  const testPass  = 'LiveTest!9182';
  const testUser  = `sec_player_${ts}`;

  console.log(">>> CHECK 3a: POST /auth/v1/signup (1 email used)");
  console.log(`Email: ${testEmail}`);
  const signupRes = await rpc('/auth/v1/signup', 'POST', {}, {
    email: testEmail,
    password: testPass,
    data: { username: testUser, display_name: 'Security Tester' }
  });
  console.log(`HTTP Status: ${signupRes.status}`);
  console.log(`Raw Response: ${signupRes.body}\n`);

  const signup = JSON.parse(signupRes.body);

  if (signupRes.status === 429) {
    console.error("BLOCKED: Email rate limit still active (2/hr on free tier).");
    console.error("Please wait ~1 hour from the previous gmail.com signup attempt and re-run.");
    return;
  }

  const accessToken = signup.access_token;
  const userId      = signup.user?.id;
  const emailConfAt = signup.user?.email_confirmed_at;

  console.log(`User ID:               ${userId}`);
  console.log(`email_confirmed_at:    ${emailConfAt ?? 'null — unconfirmed as expected'}`);
  console.log(`access_token obtained: ${accessToken ? 'YES' : 'NO'}\n`);

  if (!accessToken) {
    console.error("Signup returned no access_token. Email confirmation may be blocking sessions.");
    console.error("If Supabase Auth → Email → 'Confirm email' is ON and the project is configured");
    console.error("to NOT issue sessions before confirmation, you must run this test after the user");
    console.error("clicks the confirmation link — or temporarily disable confirmation for testing.");
    return;
  }

  // Verify handle_new_user trigger created the profile
  console.log(">>> TRIGGER CHECK: GET /rest/v1/profiles?id=eq.<userId>&select=*");
  const profileRes = await rpc(
    `/rest/v1/profiles?id=eq.${userId}&select=*`,
    'GET',
    { 'Authorization': `Bearer ${accessToken}` }
  );
  console.log(`HTTP Status: ${profileRes.status}`);
  console.log(`Raw Response: ${profileRes.body}\n`);

  // ─── CHECK 3b: Admin-only action (INSERT tournament) with player JWT ───
  console.log(">>> CHECK 3b: POST /rest/v1/tournaments with player JWT (RLS must reject)");
  const tournamentInsertRes = await rpc('/rest/v1/tournaments', 'POST', {
    'Authorization': `Bearer ${accessToken}`,
    'Prefer': 'return=representation'
  }, {
    name: 'Unauthorized Tournament',
    format: 'single_elimination',
    status: 'registration',
    created_by: userId
  });
  console.log(`HTTP Status: ${tournamentInsertRes.status}`);
  console.log(`Raw Response: ${tournamentInsertRes.body}\n`);

  // ─── CHECK 3c: Join tournament with UNVERIFIED email ───────────────────
  const tlRes = await rpc('/rest/v1/tournaments?select=id,name&limit=1', 'GET');
  const tl    = JSON.parse(tlRes.body);
  const tId   = tl[0]?.id;

  console.log(">>> CHECK 3c: POST /rest/v1/tournament_participants with unverified email");
  console.log(`tournament_id used: ${tId ?? 'none in DB'}`);

  if (tId) {
    const joinRes = await rpc('/rest/v1/tournament_participants', 'POST', {
      'Authorization': `Bearer ${accessToken}`,
      'Prefer': 'return=representation'
    }, {
      tournament_id: tId,
      player_id: userId,
      seed: 1,
      eliminated: false
    });
    console.log(`HTTP Status: ${joinRes.status}`);
    console.log(`Raw Response: ${joinRes.body}\n`);
  } else {
    console.log("No tournament exists — creating one as anon (should also fail, demonstrating RLS double-block):");
    const anonT = await rpc('/rest/v1/tournaments', 'POST', {
      'Prefer': 'return=representation'
    }, { name: 'Seed Tourney', format: 'single_elimination', status: 'registration' });
    console.log(`HTTP Status: ${anonT.status}`);
    console.log(`Raw Response: ${anonT.body}\n`);
  }

  // ─── CHECK 3d: PATCH profiles.role = 'admin' with own JWT ─────────────
  console.log(">>> CHECK 3d: PATCH /rest/v1/profiles?id=eq.<userId>  { role: 'admin' }");
  const patchRoleRes = await rpc(
    `/rest/v1/profiles?id=eq.${userId}`,
    'PATCH',
    {
      'Authorization': `Bearer ${accessToken}`,
      'Prefer': 'return=representation'
    },
    { role: 'admin' }
  );
  console.log(`HTTP Status: ${patchRoleRes.status}`);
  console.log(`Raw Response: ${patchRoleRes.body}\n`);

  // Verify role did not change
  const afterPatch = await rpc(
    `/rest/v1/profiles?id=eq.${userId}&select=id,role,email_confirmed`,
    'GET',
    { 'Authorization': `Bearer ${accessToken}` }
  );
  console.log(`ROLE AFTER PATCH ATTEMPT: ${afterPatch.body}\n`);

  // ─── CHECK 3e: INSERT match with pending_review + NULL screenshot ──────
  console.log(">>> CHECK 3e: POST /rest/v1/matches  { status: 'pending_review', proof_screenshot_url: null }");
  const matchRes = await rpc('/rest/v1/matches', 'POST', {
    'Authorization': `Bearer ${accessToken}`,
    'Prefer': 'return=representation'
  }, {
    round_order: 1,
    status: 'pending_review',
    proof_screenshot_url: null,
    tournament_id: tId ?? null
  });
  console.log(`HTTP Status: ${matchRes.status}`);
  console.log(`Raw Response: ${matchRes.body}\n`);

  console.log("=== SUITE COMPLETE ===");
}

runLiveSuite().catch(err => console.error("Fatal:", err.message));
