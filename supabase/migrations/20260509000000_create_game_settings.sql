create table if not exists public.game_settings (
  id text primary key,
  debug_enabled boolean default false,
  sprint_seconds integer default 60,
  show_correct_answers boolean default false,
  updated_at timestamptz default now()
);

insert into public.game_settings (id, debug_enabled, sprint_seconds, show_correct_answers)
values ('default', false, 60, false)
on conflict (id) do nothing;

alter table public.game_settings enable row level security;

drop policy if exists "Public can read default game settings" on public.game_settings;
create policy "Public can read default game settings"
on public.game_settings
for select
using (id = 'default');

drop policy if exists "Admins can insert game settings" on public.game_settings;
create policy "Admins can insert game settings"
on public.game_settings
for insert
with check (
  id = 'default'
  and exists (
    select 1
    from public.admin_users admin_user
    where lower(admin_user.email) = lower(auth.jwt() ->> 'email')
  )
);

drop policy if exists "Admins can update game settings" on public.game_settings;
create policy "Admins can update game settings"
on public.game_settings
for update
using (
  id = 'default'
  and exists (
    select 1
    from public.admin_users admin_user
    where lower(admin_user.email) = lower(auth.jwt() ->> 'email')
  )
)
with check (
  id = 'default'
  and exists (
    select 1
    from public.admin_users admin_user
    where lower(admin_user.email) = lower(auth.jwt() ->> 'email')
  )
);

drop policy if exists "Admins can delete game settings" on public.game_settings;
create policy "Admins can delete game settings"
on public.game_settings
for delete
using (
  id = 'default'
  and exists (
    select 1
    from public.admin_users admin_user
    where lower(admin_user.email) = lower(auth.jwt() ->> 'email')
  )
);
