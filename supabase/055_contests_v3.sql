-- Сайыстар v3: сала = кез келген мәтін (белгілі кілт немесе мұғалімнің өз атауы), картаға арналған координаталар. Safe to run twice. Needs 052, 054.
--   cf_contests.field : the 4-value check is replaced by a length check; the UI keeps a list of known fields and "Басқа" for a custom one.
--   cf_contests.lat/lng: map pin (both or none). City-level is enough; the form fills them from the 2GIS link (m=lon,lat) or by searching the place name.
alter table cf_contests drop constraint if exists cf_contests_field_check;
alter table cf_contests add constraint cf_contests_field_check check (length(field) between 1 and 60);
alter table cf_contests add column if not exists lat double precision check (lat is null or lat between -90 and 90);
alter table cf_contests add column if not exists lng double precision check (lng is null or lng between -180 and 180);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'cf_contests_pin_pair') then
    alter table cf_contests add constraint cf_contests_pin_pair check ((lat is null) = (lng is null));
  end if;
end $$;
