-- Convert from event/pod/Swiss structure to a plain manually-recorded match log.
-- Recorded matches keep their full history (ratings before/after, timestamps);
-- auto-generated pending pairings and byes are deleted since they never carried
-- a result. Apply this in the Supabase SQL editor BEFORE deploying the new code.

-- Tag every match with its season directly (was reachable only via round -> pod -> event)
alter table matches add column if not exists season_id uuid references seasons(id);

update matches set season_id = e.season_id
from rounds r, pods p, events e
where matches.round_id = r.id and r.pod_id = p.id and p.event_id = e.id;

-- Pending pairings and byes are meaningless in a manual match log
delete from matches where outcome is null or outcome = 'bye';

alter table matches alter column season_id set not null;
alter table matches drop column round_id;
alter table matches alter column player2_id set not null;
alter table matches alter column recorded_at set not null;
alter table matches alter column recorded_at set default now();

alter table matches drop constraint if exists matches_outcome_check;
alter table matches add constraint matches_outcome_check
  check (outcome in ('p1_win', 'p2_win', 'draw'));
alter table matches alter column outcome set not null;

drop table rounds;
drop table pods;
drop table events;

alter table player_season_stats drop column if exists byes_received;
