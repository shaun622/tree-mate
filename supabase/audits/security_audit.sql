-- ============================================================
-- TreeMate · Supabase RLS / security audit
-- ============================================================
-- Run this in the Supabase Dashboard → SQL Editor (use a service-role
-- session — the regular anon connection won't return everything).
--
-- Each query has a numbered header. Run them one at a time so you can
-- inspect each output independently. Or "Run all" and scroll the result
-- panel — Supabase shows multiple result sets stacked.
--
-- Anything that surfaces in queries 1, 2, 5, or 6 is a real flag.
-- Queries 3, 4, 7 are informational — useful to read, not necessarily
-- problems.
-- ============================================================


-- ============================================================
-- 1. Tables in the `public` schema with RLS DISABLED
-- ============================================================
-- This is the equivalent of the SEA Padel "rls_disabled_in_public"
-- warning. Any row returned here = anyone with the anon key can
-- read/write that table. CRITICAL — fix these first.

SELECT
  c.relname                    AS table_name,
  pg_size_pretty(pg_relation_size(c.oid)) AS size,
  obj_description(c.oid, 'pg_class')      AS description
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'                -- ordinary tables only
  AND c.relrowsecurity = false       -- RLS disabled
ORDER BY c.relname;


-- ============================================================
-- 2. Tables in `public` with RLS ENABLED but NO policies
-- ============================================================
-- These tables block everything by default — including legitimate
-- queries from authenticated users. Either add policies or it should
-- be deliberate (e.g. service-role-only tables that no client touches).

SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  COUNT(p.policyname) AS policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policies p
  ON p.schemaname = n.nspname AND p.tablename = c.relname
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity = true
GROUP BY c.relname, c.relrowsecurity
HAVING COUNT(p.policyname) = 0
ORDER BY c.relname;


-- ============================================================
-- 3. All policies in `public` — full view
-- ============================================================
-- Read this carefully. Anything with USING = 'true' or
-- WITH_CHECK = 'true' is wide open for that role.

SELECT
  schemaname,
  tablename,
  policyname,
  cmd                              AS operation,            -- SELECT/INSERT/UPDATE/DELETE/ALL
  array_to_string(roles, ', ')     AS allowed_roles,
  qual                             AS using_clause,         -- the SELECT/UPDATE/DELETE filter
  with_check                       AS with_check_clause     -- the INSERT/UPDATE check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;


-- ============================================================
-- 4. Permissive policies (USING = true)
-- ============================================================
-- A USING (true) policy means "anyone with this role can pass the
-- filter" — i.e. read or write any row. Sometimes legitimate (e.g.
-- a public read on a marketing table), almost always a flag for
-- tables containing client data.

SELECT
  tablename,
  policyname,
  cmd AS operation,
  array_to_string(roles, ', ') AS allowed_roles,
  qual AS using_clause,
  with_check AS with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual = 'true' OR with_check = 'true')
ORDER BY tablename, policyname;


-- ============================================================
-- 5. Policies that grant access to the `anon` role
-- ============================================================
-- The `anon` role is whoever's calling the API without logging in.
-- Tree Mate uses it for the public quote portal (PublicQuote.jsx
-- via quotes.token) and the client portal landing (job_sites via
-- portal_token).
--
-- These policies are LEGITIMATE if they require the token in the
-- using clause, e.g.   USING (token = current_setting('...')::uuid)
-- or USING (token IS NOT NULL AND token = ...)
--
-- They are DANGEROUS if the using clause is `true` or doesn't gate
-- on a hard-to-guess identifier — that's the SEA Padel
-- "sensitive_columns_exposed" warning.

SELECT
  tablename,
  policyname,
  cmd AS operation,
  qual AS using_clause,
  with_check AS with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND ('anon' = ANY(roles) OR 'public' = ANY(roles))
ORDER BY tablename, policyname;


-- ============================================================
-- 6. Tables with potentially sensitive column names
-- ============================================================
-- Cross-check this list against the RLS-disabled list (query 1).
-- Anything appearing in both is a "sensitive_columns_exposed" flag.

SELECT
  c.table_name,
  string_agg(c.column_name, ', ' ORDER BY c.column_name) AS sensitive_columns,
  cls.relrowsecurity AS rls_enabled
FROM information_schema.columns c
JOIN pg_class cls ON cls.relname = c.table_name
JOIN pg_namespace n ON n.oid = cls.relnamespace AND n.nspname = c.table_schema
WHERE c.table_schema = 'public'
  AND cls.relkind = 'r'
  AND (
    c.column_name ILIKE '%password%'
    OR c.column_name ILIKE '%secret%'
    OR c.column_name ILIKE '%token%'
    OR c.column_name ILIKE '%api_key%'
    OR c.column_name ILIKE '%apikey%'
    OR c.column_name ILIKE '%private_key%'
    OR c.column_name ILIKE '%email%'
    OR c.column_name ILIKE '%phone%'
    OR c.column_name = 'ssn'
    OR c.column_name = 'tfn'                -- AU: tax file number
    OR c.column_name ILIKE '%credit_card%'
    OR c.column_name ILIKE '%bank_account%'
  )
GROUP BY c.table_name, cls.relrowsecurity
ORDER BY c.table_name;


-- ============================================================
-- 7. Roles granted directly on tables (the "BYPASS RLS" check)
-- ============================================================
-- RLS only matters if the role hits the policy. If `anon` or
-- `authenticated` has been granted SELECT directly on a table without
-- RLS being enabled, the grant wins and anyone can read.

SELECT
  table_name,
  string_agg(DISTINCT grantee || ':' || privilege_type, ', ' ORDER BY grantee || ':' || privilege_type) AS grants
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN ('anon', 'authenticated', 'public')
GROUP BY table_name
ORDER BY table_name;


-- ============================================================
-- 8. Storage buckets — public access check
-- ============================================================
-- Tree Mate has a `logos` bucket (Onboarding + OrganisationPane)
-- that's intentionally public. `photos`, `job-photos`, `staff-photos`
-- should ideally be private — but if they're public, file URLs are
-- guessable and any leaked URL is permanent access.

SELECT
  id AS bucket_name,
  public AS is_public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets
ORDER BY id;


-- ============================================================
-- 9. Storage policies (object-level RLS)
-- ============================================================
-- Public buckets bypass these. Private buckets need at least one
-- policy per operation.

SELECT
  policyname,
  bucket_id,
  cmd AS operation,
  array_to_string(roles, ', ') AS allowed_roles,
  qual AS using_clause,
  with_check AS with_check_clause
FROM (
  SELECT
    p.policyname,
    p.cmd,
    p.roles,
    p.qual,
    p.with_check,
    -- best-effort bucket id extraction from the qual text
    (regexp_match(p.qual, $$bucket_id\s*=\s*'([^']+)'$$))[1] AS bucket_id
  FROM pg_policies p
  WHERE p.schemaname = 'storage' AND p.tablename = 'objects'
) sub
ORDER BY bucket_id NULLS LAST, policyname;


-- ============================================================
-- 10. Quick summary line
-- ============================================================
-- One row, easy to glance at. No flags = good news.

SELECT
  (SELECT COUNT(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r')                                                AS public_tables_total,
  (SELECT COUNT(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity = false)                   AS rls_disabled_count,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public')                                   AS total_policies,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND (qual = 'true' OR with_check = 'true')) AS permissive_policy_count,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND ('anon' = ANY(roles) OR 'public' = ANY(roles))) AS anon_accessible_policies;
