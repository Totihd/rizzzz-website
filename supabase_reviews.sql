-- RIZZZSTORE.ID — ONLINE RATING & ULASAN
-- Jalankan seluruh SQL ini di Supabase SQL Editor.

create table if not exists public.reviews (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 30),
  rating integer not null check (rating between 1 and 5),
  text text not null check (char_length(text) between 1 and 180),
  created_at timestamptz not null default now()
);

alter table public.reviews enable row level security;

-- Hapus policy lama jika pernah dibuat.
drop policy if exists "Public can read reviews" on public.reviews;
drop policy if exists "Public can submit reviews" on public.reviews;

-- Semua pengunjung boleh membaca ulasan.
create policy "Public can read reviews"
on public.reviews
for select
to anon, authenticated
using (true);

-- Semua pengunjung boleh mengirim ulasan.
create policy "Public can submit reviews"
on public.reviews
for insert
to anon, authenticated
with check (
  char_length(name) between 1 and 30
  and rating between 1 and 5
  and char_length(text) between 1 and 180
);

grant select, insert on public.reviews to anon, authenticated;
grant usage, select on sequence public.reviews_id_seq to anon, authenticated;

-- Aktifkan realtime untuk tabel reviews.
alter table public.reviews replica identity full;
alter publication supabase_realtime add table public.reviews;
