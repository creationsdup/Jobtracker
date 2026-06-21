-- Security hardening found during UX/DB audit (2026-06-19):
-- 1. company_domains UPDATE policy was `USING (true)`, letting any authenticated
--    user overwrite an already-populated catalog entry (e.g. redirect a known
--    company's logo domain). Restrict updates to rows that are still empty,
--    so the crowdsourced catalog can still be filled in but not vandalized.
-- 2. Resume has RLS enabled with zero policies (silent deny-all from the
--    client). Add an owner-scoped policy matching the pattern already used
--    by Application/Experience, for defense in depth even though the CV
--    builder UI was removed.

DROP POLICY IF EXISTS "Authenticated users can refresh catalog entries" ON public.company_domains;

CREATE POLICY "Authenticated users can fill in missing catalog entries"
  ON public.company_domains
  FOR UPDATE
  TO authenticated
  USING (domain IS NULL OR domain = '')
  WITH CHECK (true);

CREATE POLICY "Users can CRUD own resumes"
  ON public."Resume"
  FOR ALL
  USING ("userId" = (auth.uid())::text)
  WITH CHECK ("userId" = (auth.uid())::text);
