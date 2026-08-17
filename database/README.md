# JYYR Store Media V4.9.4 — Database

Run the SQL files in `database/migrations/` in numeric/file order, **one at a time**, stopping if any file fails.

The final file is:

`101_final_integrity_patch_v4_9_4.sql`

It is intentionally idempotent and is the last hardening layer. It removes legacy V4.07 write policies that could bypass the readonly-admin restriction, hardens payment-proof Storage write/delete permissions, and restores the database order-payment guard.

Do **not** execute files inside `database/archive/`. They are historical references only.

If the earlier migrations have already been run successfully, you only need to run `101_final_integrity_patch_v4_9_4.sql` on the existing database.
