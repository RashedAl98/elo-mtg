-- Simplify match outcomes from score-aware (p1_2_0/p1_2_1/p2_2_0/p2_2_1) to
-- plain win/loss (p1_win/p2_win). Margin-of-victory no longer affects ELO.
-- Apply this in the Supabase SQL editor.

alter table matches drop constraint if exists matches_outcome_check;

update matches set outcome = 'p1_win' where outcome in ('p1_2_0', 'p1_2_1');
update matches set outcome = 'p2_win' where outcome in ('p2_2_0', 'p2_2_1');

alter table matches add constraint matches_outcome_check
  check (outcome is null or outcome in ('p1_win', 'p2_win', 'draw', 'bye'));
