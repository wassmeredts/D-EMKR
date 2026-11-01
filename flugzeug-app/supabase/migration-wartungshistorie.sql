-- =====================================================================
-- Nachrüstung: Wartungshistorie
-- NUR ausführen, wenn du schema.sql bereits früher ausgeführt hast.
-- (Bei einer frischen Einrichtung enthält schema.sql dies schon.)
-- Supabase-Dashboard -> SQL Editor -> New query -> einfügen -> Run
-- =====================================================================

create table public.part_history (
  id uuid primary key default gen_random_uuid(),
  part_id uuid not null references public.parts(id) on delete cascade,
  done_date date not null,
  done_hours numeric,
  note text,
  done_by text,
  user_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.part_history enable row level security;

create policy "part_history_select" on public.part_history
  for select to authenticated using (public.is_approved());
create policy "part_history_insert" on public.part_history
  for insert to authenticated
  with check (public.is_admin() and user_id = auth.uid());
create policy "part_history_delete" on public.part_history
  for delete to authenticated using (public.is_admin());
