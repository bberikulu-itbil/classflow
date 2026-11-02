-- 036_course_metadata.sql
-- Adds course metadata for course cover page, syllabus, information & analytics
alter table cf_curr_courses add column if not exists description text;
alter table cf_curr_courses add column if not exists cover_url text;
alter table cf_curr_courses add column if not exists instructor text;
alter table cf_curr_courses add column if not exists level text;
