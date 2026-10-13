-- =====================================================================
-- WGM Golf Cup: full reset
--
-- Puts the tournament back to the starting teams, players and pairings,
-- with NO scores and NO ticker notices, ready to run Day 1.
-- The admin list is NOT changed.
--
-- How to run: Supabase dashboard -> SQL Editor -> New query -> paste -> Run.
-- This cannot be undone.
-- =====================================================================

update public.tournament
set setup = '{"version":2,"name":"WGM Golf Cup","isDemo":false,"days":[1,2,3],"currentDay":1,"targetPoints":10,"holesPerMatch":18,"teams":{"HOME":{"id":"HOME","name":"Home Team"},"CHALLENGERS":{"id":"CHALLENGERS","name":"Challengers"}},"players":[{"id":"h1","name":"Tom Hamilton","teamId":"HOME"},{"id":"h2","name":"Ian Ross","teamId":"HOME"},{"id":"h3","name":"David Kelly","teamId":"HOME"},{"id":"h4","name":"James Wilson","teamId":"HOME"},{"id":"h5","name":"David Campbell","teamId":"HOME"},{"id":"h6","name":"Mark Stewart","teamId":"HOME"},{"id":"c1","name":"Greig Dyer","teamId":"CHALLENGERS"},{"id":"c2","name":"Ian Mathieson","teamId":"CHALLENGERS"},{"id":"c3","name":"Bobby Brown","teamId":"CHALLENGERS"},{"id":"c4","name":"Steven Clark","teamId":"CHALLENGERS"},{"id":"c5","name":"Gordon Reid","teamId":"CHALLENGERS"},{"id":"c6","name":"Alan Murray","teamId":"CHALLENGERS"}],"groups":[{"id":"d1g1","day":1,"number":1},{"id":"d1g2","day":1,"number":2},{"id":"d1g3","day":1,"number":3},{"id":"d2g1","day":2,"number":1},{"id":"d2g2","day":2,"number":2},{"id":"d2g3","day":2,"number":3},{"id":"d3g1","day":3,"number":1},{"id":"d3g2","day":3,"number":2},{"id":"d3g3","day":3,"number":3}],"matches":[{"id":"m1","number":1,"day":1,"groupId":"d1g1","homePlayerId":"h1","challengerPlayerId":"c1"},{"id":"m2","number":2,"day":1,"groupId":"d1g1","homePlayerId":"h2","challengerPlayerId":"c2"},{"id":"m3","number":3,"day":1,"groupId":"d1g2","homePlayerId":"h3","challengerPlayerId":"c3"},{"id":"m4","number":4,"day":1,"groupId":"d1g2","homePlayerId":"h4","challengerPlayerId":"c4"},{"id":"m5","number":5,"day":1,"groupId":"d1g3","homePlayerId":"h5","challengerPlayerId":"c5"},{"id":"m6","number":6,"day":1,"groupId":"d1g3","homePlayerId":"h6","challengerPlayerId":"c6"},{"id":"m7","number":7,"day":2,"groupId":"d2g1","homePlayerId":"h1","challengerPlayerId":"c2"},{"id":"m8","number":8,"day":2,"groupId":"d2g1","homePlayerId":"h2","challengerPlayerId":"c3"},{"id":"m9","number":9,"day":2,"groupId":"d2g2","homePlayerId":"h3","challengerPlayerId":"c4"},{"id":"m10","number":10,"day":2,"groupId":"d2g2","homePlayerId":"h4","challengerPlayerId":"c5"},{"id":"m11","number":11,"day":2,"groupId":"d2g3","homePlayerId":"h5","challengerPlayerId":"c6"},{"id":"m12","number":12,"day":2,"groupId":"d2g3","homePlayerId":"h6","challengerPlayerId":"c1"},{"id":"m13","number":13,"day":3,"groupId":"d3g1","homePlayerId":"h1","challengerPlayerId":"c3"},{"id":"m14","number":14,"day":3,"groupId":"d3g1","homePlayerId":"h2","challengerPlayerId":"c4"},{"id":"m15","number":15,"day":3,"groupId":"d3g2","homePlayerId":"h3","challengerPlayerId":"c5"},{"id":"m16","number":16,"day":3,"groupId":"d3g2","homePlayerId":"h4","challengerPlayerId":"c6"},{"id":"m17","number":17,"day":3,"groupId":"d3g3","homePlayerId":"h5","challengerPlayerId":"c1"},{"id":"m18","number":18,"day":3,"groupId":"d3g3","homePlayerId":"h6","challengerPlayerId":"c2"}]}'::jsonb,
    version = version + 1,
    updated_at = now()
where id = 1;

update public.match_scores
set holes = '{}', hole_times = '{}', updated_at = now()
where holes <> '{}' or hole_times <> '{}';

delete from public.ticker_notices where id is not null;
