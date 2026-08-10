-- One-time cleanup: before this fix, every logActivity() call inserted a
-- remote row with a server-generated id that never matched the id used for
-- the local copy, so fetchActivity's merge treated them as two different
-- entries and every action showed up twice in Activity. Run once after
-- deploying the fix in lib/activity.ts to remove the historical duplicates.
delete from public.activity_log a
using public.activity_log b
where a.id > b.id
  and a.actor is not distinct from b.actor
  and a.entity = b.entity
  and a.entity_id is not distinct from b.entity_id
  and a.action = b.action
  and a.summary = b.summary
  and a.detail is not distinct from b.detail
  and abs(extract(epoch from (a.created_at - b.created_at))) < 5;
