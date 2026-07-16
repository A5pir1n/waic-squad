-- WAIC小分队 schema — paste into Supabase Dashboard > SQL Editor and Run.
-- Safe to re-run (idempotent).

create table if not exists marks (
  id uuid primary key default gen_random_uuid(),
  team_code text not null,
  member_id uuid not null,
  member_name text not null,
  member_color text not null default '#c9cdd4',
  target_type text not null check (target_type in ('exhibitor','party','forum')),
  target_id text not null,
  status text not null check (status in ('want','done','skip')),
  note text not null default '',
  updated_at timestamptz not null default now(),
  unique (member_id, target_type, target_id)
);
create index if not exists marks_team_idx on marks (team_code);

create table if not exists checkins (
  id uuid primary key default gen_random_uuid(),
  team_code text not null,
  member_id uuid not null,
  member_name text not null,
  place_type text not null,
  place_id text not null,
  label text not null default '',
  started_at timestamptz not null default now(),
  ended_at timestamptz
);
create index if not exists checkins_team_idx on checkins (team_code, started_at desc);

-- Realtime: marks 变更需要进 supabase_realtime publication
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'marks'
  ) then
    alter publication supabase_realtime add table marks;
  end if;
end $$;

-- DELETE 事件需要完整 old row 才能带 target 信息
alter table marks replica identity full;

-- RLS：5人小队玩具应用的如实声明——anon 全开，队伍隔离靠 team_code 过滤。
-- 邀请码本质上就是共享密钥；不防恶意扫库，够用即可。
alter table marks enable row level security;
alter table checkins enable row level security;

drop policy if exists marks_all on marks;
create policy marks_all on marks for all using (true) with check (true);

drop policy if exists checkins_all on checkins;
create policy checkins_all on checkins for all using (true) with check (true);
