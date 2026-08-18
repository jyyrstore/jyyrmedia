# JYYR Store Media V4.9.4 — Database

Run the SQL files in `database/migrations/` in numeric/file order, **one at a time**, stopping if any file fails.

Migration order for V4.9.4 is:

- `00_integrity_patch.sql`
- `99_integrity_patch.sql`
- `100_security_hardening_v4_8.sql`
- `101_final_integrity_patch_v4_9_4.sql`
- `102_owner_bootstrap_v4_9_4.sql`
- `103_final_sync_v4_9_4.sql`
- the supporting/base migrations in this folder as required by the existing database state.

`103_final_sync_v4_9_4.sql` is the final V4.9.4 LIVE-sync layer. It:

- adds/synchronizes `error_logs` for the frontend error monitor;
- installs `expire_points_for_user()`;
- hardens EXECUTE privileges for sensitive admin RPCs so `anon`/`PUBLIC` cannot invoke them;
- keeps `authenticated` EXECUTE while the existing internal admin/Owner authorization remains enforced.

The migration is idempotent and is intended to be run after `102_owner_bootstrap_v4_9_4.sql` on an existing V4.9.4 database.

Do **not** execute files inside `database/archive/`. They are historical references only.
