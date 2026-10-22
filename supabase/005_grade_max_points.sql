-- APPLIED 2026-10-22 (migration cf_hw_grade_max_points). Found by replica-test N5: a teacher could save 99999 points.
create or replace function cf_hw_grade(p_work uuid, p_points int, p_status text, p_feedback text default null)
returns void language plpgsql security definer set search_path = public as $$
declare mx int;
begin
  if not cf_owns_work(p_work) then raise exception 'Құқығыңыз жоқ'; end if;
  if p_status not in ('finalized','needs_work') then raise exception 'Күй қате'; end if;
  select coalesce(a.points, act.points) into mx from cf_work k join cf_assignments a on a.id = k.assignment_id
    join cf_activities act on act.id = a.activity_id where k.id = p_work;
  if coalesce(p_points, 0) < 0 or coalesce(p_points, 0) > mx then raise exception 'Ұпай 0 мен % аралығында болуы керек', mx; end if;
  update cf_work set status = p_status, points = coalesce(p_points, 0), feedback = left(p_feedback, 4000),
    graded_by = auth.uid(), graded_at = now() where id = p_work;
end $$;
