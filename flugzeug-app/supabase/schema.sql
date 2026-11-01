-- =====================================================================
-- Flugzeug-Verwaltung: Datenbankschema für Supabase
-- Im Supabase-Dashboard unter "SQL Editor" -> "New query" einfügen
-- und mit "Run" ausführen.
-- =====================================================================

-- ---------- Benutzerprofile ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  role text not null default 'pilot' check (role in ('admin', 'pilot')),
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

-- Beim Registrieren wird automatisch ein Profil angelegt.
-- Der allererste Benutzer wird Administrator und ist sofort freigeschaltet,
-- alle weiteren müssen von einem Administrator freigegeben werden.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  is_first boolean;
begin
  select not exists (select 1 from public.profiles) into is_first;
  insert into public.profiles (id, email, name, role, approved)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    case when is_first then 'admin' else 'pilot' end,
    is_first
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Hilfsfunktionen für die Zugriffsregeln
create or replace function public.is_approved()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce((select approved from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce(
    (select role = 'admin' and approved from public.profiles where id = auth.uid()),
    false
  );
$$;

-- ---------- Flugzeug (genau ein Datensatz) ----------
create table public.aircraft (
  id int primary key default 1 check (id = 1),
  registration text not null default 'D-EMKR',
  type text not null default 'Wassmer WA52',
  hours_override numeric
);
insert into public.aircraft (id) values (1);

-- ---------- Reservierungen ----------
create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  date date not null,
  start_time time not null,
  end_time time not null,
  pilot_name text not null,
  purpose text,
  note text,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

-- Verhindert überlappende Reservierungen am gleichen Tag
create or replace function public.check_reservation_overlap()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1 from public.reservations r
    where r.date = new.date
      and r.id <> new.id
      and r.start_time < new.end_time
      and r.end_time > new.start_time
  ) then
    raise exception 'Zu diesem Zeitpunkt besteht bereits eine Reservierung.';
  end if;
  return new;
end;
$$;

create trigger reservations_no_overlap
  before insert or update on public.reservations
  for each row execute function public.check_reservation_overlap();

-- ---------- Flugbuch ----------
create table public.flights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  date date not null,
  pilot text not null,
  dep text,
  dest text,
  dep_time time,
  arr_time time,
  duration numeric not null check (duration >= 0),
  landings int not null default 1 check (landings >= 0),
  hobbs numeric,
  note text,
  created_at timestamptz not null default now()
);

-- ---------- Mängelliste ----------
create table public.defects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  date date not null,
  description text not null,
  severity text not null default 'mittel' check (severity in ('gering', 'mittel', 'kritisch')),
  status text not null default 'offen' check (status in ('offen', 'bearbeitung', 'behoben')),
  reported_by text,
  resolved_date date,
  created_at timestamptz not null default now()
);

-- ---------- Teile mit Laufzeit ----------
create table public.parts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  interval_type text not null check (interval_type in ('stunden', 'kalender')),
  interval_value numeric not null check (interval_value > 0),
  last_value text not null, -- Stundenstand (z.B. "1234.5") oder Datum (z.B. "2026-05-01")
  note text,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- Zugriffsregeln (Row Level Security)
-- Nur freigegebene Benutzer sehen und ändern Daten.
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.aircraft enable row level security;
alter table public.reservations enable row level security;
alter table public.flights enable row level security;
alter table public.defects enable row level security;
alter table public.parts enable row level security;

-- Profile: jeder sieht sein eigenes, Administratoren sehen und ändern alle
create policy "profiles_select" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy "profiles_update_admin" on public.profiles
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "profiles_delete_admin" on public.profiles
  for delete to authenticated
  using (public.is_admin());

-- Flugzeug: lesen alle Freigegebenen, ändern nur Administratoren
create policy "aircraft_select" on public.aircraft
  for select to authenticated using (public.is_approved());
create policy "aircraft_update" on public.aircraft
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Reservierungen: alle Freigegebenen lesen/anlegen; ändern/löschen nur Ersteller oder Admin
create policy "reservations_select" on public.reservations
  for select to authenticated using (public.is_approved());
create policy "reservations_insert" on public.reservations
  for insert to authenticated
  with check (public.is_approved() and user_id = auth.uid());
create policy "reservations_update" on public.reservations
  for update to authenticated
  using (public.is_approved() and (user_id = auth.uid() or public.is_admin()))
  with check (public.is_approved());
create policy "reservations_delete" on public.reservations
  for delete to authenticated
  using (public.is_approved() and (user_id = auth.uid() or public.is_admin()));

-- Flugbuch: gleiche Logik
create policy "flights_select" on public.flights
  for select to authenticated using (public.is_approved());
create policy "flights_insert" on public.flights
  for insert to authenticated
  with check (public.is_approved() and user_id = auth.uid());
create policy "flights_update" on public.flights
  for update to authenticated
  using (public.is_approved() and (user_id = auth.uid() or public.is_admin()))
  with check (public.is_approved());
create policy "flights_delete" on public.flights
  for delete to authenticated
  using (public.is_approved() and (user_id = auth.uid() or public.is_admin()));

-- Mängel: alle Freigegebenen dürfen melden und den Status ändern, löschen nur Admin
create policy "defects_select" on public.defects
  for select to authenticated using (public.is_approved());
create policy "defects_insert" on public.defects
  for insert to authenticated
  with check (public.is_approved() and user_id = auth.uid());
create policy "defects_update" on public.defects
  for update to authenticated
  using (public.is_approved()) with check (public.is_approved());
create policy "defects_delete" on public.defects
  for delete to authenticated using (public.is_admin());

-- Teile mit Laufzeit: alle Freigegebenen lesen, nur Administratoren ändern
create policy "parts_select" on public.parts
  for select to authenticated using (public.is_approved());
create policy "parts_insert" on public.parts
  for insert to authenticated with check (public.is_admin());
create policy "parts_update" on public.parts
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "parts_delete" on public.parts
  for delete to authenticated using (public.is_admin());

-- ---------- Wartungshistorie (ein Eintrag pro "Wartung erledigt") ----------
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

-- Alle Freigegebenen sehen den Verlauf, nur Administratoren tragen ein oder löschen
create policy "part_history_select" on public.part_history
  for select to authenticated using (public.is_approved());
create policy "part_history_insert" on public.part_history
  for insert to authenticated
  with check (public.is_admin() and user_id = auth.uid());
create policy "part_history_delete" on public.part_history
  for delete to authenticated using (public.is_admin());
