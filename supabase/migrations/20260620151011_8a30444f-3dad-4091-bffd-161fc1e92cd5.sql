
-- Move pgvector out of public schema (security best practice)
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;
ALTER EXTENSION vector SET SCHEMA extensions;
