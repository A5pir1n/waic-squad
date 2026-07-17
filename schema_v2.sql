-- WAIC小分队 v2 迁移 — 三态改五级评分 + 纪要与评分解耦
-- 在 Supabase Dashboard > SQL Editor 跑一遍。可重复执行。

-- 1. status 允许为空（只记纪要不评分）
alter table marks alter column status drop not null;

-- 2. 先清掉 v1 旧口径数据（想聊/聊过了/爬），否则新约束加不上
alter table marks drop constraint if exists marks_status_check;
delete from marks where status in ('want','done','skip');

-- 3. 换成五级评分约束: 夯/顶级/人上人/NPC/拉完了
alter table marks add constraint marks_status_check
  check (status is null or status in ('hang','top','elite','npc','trash'));
