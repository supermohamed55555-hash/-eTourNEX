# eTourNEX — Security Backlog

Deferred findings. Numbering continues the sequence from our working session.

---

## Item 8 — `advanceWinner`'s `eliminated: true` silently no-ops

**Status:** code fix + migration drafted, verified on live data — apply `supabase/migrations/006_participant_elimination.sql` in the SQL Editor, then close
**Severity:** medium (data correctness, not a privilege hole)
**Location:** `src/lib/actions/match-actions.ts:160-163`, `supabase/schema.sql:130-143`

`advanceWinner` marks the loser eliminated:

```ts
await supabase
  .from('tournament_participants')
  .update({ eliminated: true })
  .eq('id', loserId);
```

`tournament_participants` has **no UPDATE policy**. `schema.sql:130-143` defines
only SELECT, INSERT and DELETE, and unlike `matches` and `leaderboard_entries`
there is no `FOR ALL` admin policy either. With RLS enabled and no matching
UPDATE policy, Postgres matches zero rows — it does not raise. The call also
discards its result (no `error` check, unlike every other write in the file), so
the failure is invisible at runtime.

Consequence: losers are very likely never flagged `eliminated`, on every
tournament run to date. Anything reading that column (bracket rendering,
re-registration guards, standings) is working from wrong data.

**Fix sketch** — needs a decision on which:
- (a) Admin `FOR ALL` policy on `tournament_participants`, matching the shape at
  `schema.sql:153-155`. Smallest change, consistent with the rest of the schema.
- (b) Have `advanceWinner` use the service-role client from
  `src/lib/supabase/admin.ts`. It is already server-only and bracket
  advancement is system work, not user work.
- (c) Narrow policy allowing UPDATE only of `eliminated`, only by an admin.

Prefer (a) or (b). Whichever we pick, add the missing `if (error) throw` — the
silent discard is the reason this went unnoticed, and it will hide the next bug
in the same place.

**Fix applied** — option (a), narrowed to `FOR UPDATE` rather than `FOR ALL`:
- `supabase/migrations/006_participant_elimination.sql` — backfills the losers
  of already-confirmed matches, then adds an admin-only UPDATE policy. `FOR ALL`
  was rejected because it would also widen INSERT/DELETE, which schema.sql
  deliberately scopes to players. Option (b) was rejected because `admin.ts`
  would bypass RLS for the whole confirm path.
- `match-actions.ts` — the discarded result is now `.select('id')`ed and an
  empty result throws. Note an `if (error) throw` **alone would not have caught
  this**: the failure was zero rows with no error. Detecting a policy no-op
  requires checking what was actually written.

**Confirmed against live data before fixing** (`scripts/tmp-item8-counts.js`):
confirmed matches = 1, participants flagged eliminated = 0 → bug real, backfill
touches exactly 1 row. Reproduced end-to-end through the UI: reko 8-2 S7S
confirmed, no ELIMINATED tag on the loser.

**Verify before fixing:** confirm the column exists and check current state.
`schema.sql` was not read past line 200, so `eliminated` may be declared
elsewhere or added in a later migration.

```sql
SELECT id, eliminated FROM tournament_participants WHERE eliminated = true;
-- Expect 0 rows on a tournament that has completed matches → confirms the bug.
```

---

## Item 9 — `rejectMatch` leaves `confirmed_by` set

**Status:** open, low effort
**Severity:** low on its own, but it interacts with migration 004
**Location:** `src/lib/actions/match-actions.ts:111-121`

`rejectMatch` clears `score_a`, `score_b`, `proof_screenshot_url`, `status`,
`reported_by` and `winner_id` — but not `confirmed_by`. A match confirmed and
then rejected returns to `status='scheduled'` still carrying the confirming
admin's id.

Migration 004's policy requires `confirmed_by IS NULL` on any player write, so
such a row becomes permanently un-reportable — the players see a silent failure
(zero rows matched, no error) with no way forward. **004 includes a pre-flight
`UPDATE` that clears existing stale values**, so this is not currently blocking,
but the code path will keep recreating them until fixed.

Fix: add `confirmed_by: null` to the update object at `match-actions.ts:113-120`.

---

## Item 10 — Post-004, disputing a confirmed match fails silently and logs a false audit event

**Status:** open — surfaced by 004, decide alongside it
**Severity:** medium (misleading audit trail)
**Location:** `src/lib/actions/match-actions.ts:128-148`

`disputeMatch` has no status precondition in code — it relies entirely on RLS.
After 004, the policy's `USING` clause excludes `confirmed`, so a player
disputing a confirmed match updates **zero rows**. PostgREST does not treat that
as an error, so `error` is null, the function proceeds, and it writes an
`audit_logs` entry recording a dispute that never happened.

So the deliberate decision to make post-confirmation disputes admin-only lands as
"button appears to work, nothing changes, audit log says it did" — worse than a
clear rejection.

Fix: use `.select()` on the update and treat an empty result as a failure, or
fetch and check `status` first, then throw something the UI can show — e.g.
"Confirmed results can only be disputed by an admin." Log the audit event only
after a confirmed write.

Same silent-zero-rows pattern applies to `reportMatchResult`
(`match-actions.ts:23-33`), which already filters `.eq('status','scheduled')`
and will now also fail silently against the tightened policy.
