-- JYYR STORE V4 — SAFE SPLIT MIGRATION
-- Generated against the live JYYR core schema discovered during this session.
-- Run in numeric order, one file at a time. Stop on first error.
-- No external API is required.

BEGIN;

-- =========================================================
-- Default FAQ/help
-- =========================================================
insert into public.faq_items(question,answer,sort_order) values
('Bagaimana cara order?','Login, pilih layanan, masukkan target dan jumlah, lalu pilih metode pembayaran.',0),
('Berapa lama proses?','Waktu proses bergantung pada layanan dan antrean.',1),
('Bagaimana cara deposit saldo?','Buka Dashboard lalu pilih Deposit Saldo dan upload bukti pembayaran.',2)
on conflict do nothing;

insert into public.help_articles(title,content,sort_order) values
('Cara Order','1. Login. 2. Pilih layanan. 3. Isi target dan jumlah. 4. Bayar. 5. Pantau status di riwayat.',0),
('Cara Deposit','Pilih Deposit Saldo di Dashboard, pilih nominal, lakukan pembayaran, lalu kirim bukti.',1)
on conflict do nothing;

COMMIT;
