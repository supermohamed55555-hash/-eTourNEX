-- 005_storage_match_proofs.sql
-- Storage RLS for the private `match-proofs` bucket.
--
-- Why this is needed:
--   `uploadMatchProof` (src/lib/actions/storage-actions.ts) runs as the
--   *signed-in user*, not the service role, and writes to
--       <auth-uid>/<timestamp>.<ext>
--   RLS is enabled on storage.objects in every Supabase project. With the
--   bucket created but no policy attached, every upload fails with
--   "new row violates row-level security policy".
--
-- These policies grant the narrowest access that flow actually needs.
--
-- Note: RLS is ALREADY enabled on storage.objects — no ALTER TABLE here.
-- (It would also fail: the table is owned by supabase_storage_admin.)


-- ─── 1. Upload: a player may write only inside their own uid folder ──────
-- The foldername check is what stops a player from planting or overwriting
-- a proof inside another player's folder.

drop policy if exists "match_proofs_insert_own" on storage.objects;

create policy "match_proofs_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'match-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ─── 2. Read own: required by createSignedUrl() ──────────────────────────
-- storage-actions.ts calls createSignedUrl() immediately after upload, as
-- the same user. Signing requires SELECT on the object. Without this, the
-- upload succeeds and then throws "Failed to generate signed URL".

drop policy if exists "match_proofs_select_own" on storage.objects;

create policy "match_proofs_select_own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'match-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ─── 3. Read all: admins, for review and re-signing ──────────────────────
-- The signed URL stored in matches.proof_screenshot_url expires after 7 days.
-- Admins reviewing an older dispute need to be able to re-sign it.
--
-- Depends on public.profiles being readable by the calling user under its own
-- RLS policies (it is — the /players pages read profiles as authenticated).

drop policy if exists "match_proofs_select_admin" on storage.objects;

create policy "match_proofs_select_admin"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'match-proofs'
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );


-- ─── Deliberately NOT granted ────────────────────────────────────────────
--
-- No UPDATE policy: uploadMatchProof passes `upsert: false`, so the flow
-- never needs one. Withholding it makes a submitted proof immutable — a
-- player cannot swap the screenshot after an admin has started reviewing it.
--
-- No DELETE policy for players: same reason. A player must not be able to
-- destroy the evidence for a match they reported.
--
-- No anon access of any kind: the bucket is private and every path through
-- the app is authenticated.
