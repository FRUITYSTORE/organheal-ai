-- Production authorization hardening.
--
-- Application-facing roles do not require TRUNCATE or TRIGGER.
-- TRUNCATE is particularly sensitive because it is not governed
-- by PostgreSQL row-level security.
--
-- Future tables must be reviewed for equivalent grants because
-- managed Supabase role ownership can restrict ALTER DEFAULT PRIVILEGES.

revoke truncate, trigger
on all tables in schema public
from anon, authenticated;
