-- New lessons start with "ask to go ahead" and "auto task" on (the teacher's chosen defaults); running lessons keep theirs.
alter table cf_sessions alter column allow_ahead set default true;
alter table cf_sessions alter column auto_task set default true;
