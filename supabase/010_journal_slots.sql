-- NOT APPLIED YET. Run after 007_gradebook.sql and 009_schedule.sql (safe to run twice).
-- Links a gradebook column (cf_assessments) to the schedule slot (cf_slots) it was made from, so a held lesson becomes a ҚБ column only once.
-- Deleting the slot keeps the column (the link is cleared).

alter table cf_assessments add column if not exists slot_id uuid references cf_slots(id) on delete set null;
create unique index if not exists cf_assessments_slot_uq on cf_assessments (slot_id) where slot_id is not null;
