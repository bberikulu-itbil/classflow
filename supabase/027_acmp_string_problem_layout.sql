-- Reformat ACMP string-problem pages:
-- remove source screenshots from the statement block, highlight the statement,
-- and show compact INPUT.TXT / OUTPUT.TXT examples in a table.
do $acmp_string_problem_layout$
declare
  v_owner uuid;
  v_source uuid;
  v_slides jsonb;
begin
  select c.owner_id into v_owner
  from public.cf_curr_courses c
  where c.id = 'dbe60970-1fa6-4a8a-a65e-051d20cfd278'
    and c.title = 'ACMP: Язык программирования C++';

  select l.id into v_source
  from public.cf_lessons l
  where l.owner_id = v_owner
    and l.title = 'Жол түрі (string)'
  limit 1;

  select jsonb_agg(
    case
      when slide->>'problemPage' = 'true' then
        slide || jsonb_build_object(
          'sections', (
            select jsonb_agg(
              case
                when section_no = 1 then
                  (section - 'img' - 'alt') || jsonb_build_object(
                    'variant', 'statement',
                    'table', case slide->>'title'
                      when 'ACMP №66 · Пернетақта' then jsonb_build_object(
                        'headers', jsonb_build_array('INPUT.TXT', 'OUTPUT.TXT'),
                        'rows', jsonb_build_array(
                          jsonb_build_array('q', 'w'),
                          jsonb_build_array('t', 'y'),
                          jsonb_build_array('p', 'a'),
                          jsonb_build_array('l', 'z'),
                          jsonb_build_array('m', 'q')
                        )
                      )
                      when 'ACMP №504 · Гүлдер' then jsonb_build_object(
                        'headers', jsonb_build_array('K', 'OUTPUT.TXT'),
                        'rows', jsonb_build_array(
                          jsonb_build_array('1', 'VGC'),
                          jsonb_build_array('5', 'CVG')
                        )
                      )
                      when 'ACMP №46 · E саны' then jsonb_build_object(
                        'headers', jsonb_build_array('n', 'OUTPUT.TXT'),
                        'rows', jsonb_build_array(
                          jsonb_build_array('0', '3'),
                          jsonb_build_array('13', '2.7182818284590'),
                          jsonb_build_array('25', '2.7182818284590452353602875')
                        )
                      )
                      when 'ACMP №6 · Шахмат' then jsonb_build_object(
                        'headers', jsonb_build_array('INPUT.TXT', 'OUTPUT.TXT'),
                        'rows', jsonb_build_array(
                          jsonb_build_array('C7-D5', 'YES'),
                          jsonb_build_array('E2-E4', 'NO'),
                          jsonb_build_array('BSN', 'ERROR')
                        )
                      )
                      when 'ACMP №44 · Көрсеткілер' then jsonb_build_object(
                        'headers', jsonb_build_array('INPUT.TXT', 'OUTPUT.TXT'),
                        'rows', jsonb_build_array(
                          jsonb_build_array('<<<<>>>-->><--<<--<<--<>>>-->><<<<<', '4')
                        )
                      )
                      when 'ACMP №1200 · Ретін өзгерт' then jsonb_build_object(
                        'headers', jsonb_build_array('INPUT.TXT', 'OUTPUT.TXT'),
                        'rows', jsonb_build_array(
                          jsonb_build_array('Ivanov Petrov Sidorov', 'Sidorov Petrov Ivanov'),
                          jsonb_build_array('Bistrov Shustrov', 'Shustrov Bistrov')
                        )
                      )
                      when 'ACMP №283 · Руналық сөздер' then jsonb_build_object(
                        'headers', jsonb_build_array('INPUT.TXT', 'OUTPUT.TXT'),
                        'rows', jsonb_build_array(
                          jsonb_build_array('IoIsTheBest', 'Yes'),
                          jsonb_build_array('IoItIsWaste', 'No')
                        )
                      )
                      when 'ACMP №295 · Шифрлау' then jsonb_build_object(
                        'headers', jsonb_build_array('INPUT.TXT', 'OUTPUT.TXT'),
                        'rows', jsonb_build_array(
                          jsonb_build_array('HELLOAMERICA / AMERICA', 'HELLOAMERICA'),
                          jsonb_build_array('KHOORDPHULD / HELLOAMERICA', 'HELLOAMERICA'),
                          jsonb_build_array('KHOORDPHULD / KHOORDPHULC', 'IMPOSSIBLE')
                        )
                      )
                      when 'ACMP №7 · АББА тайпасының алтыны' then jsonb_build_object(
                        'headers', jsonb_build_array('INPUT.TXT', 'OUTPUT.TXT'),
                        'rows', jsonb_build_array(
                          jsonb_build_array('5 7 3', '7'),
                          jsonb_build_array('987531 234 86364', '987531'),
                          jsonb_build_array('189285 283 4958439238923098349024', '4958439238923098349024')
                        )
                      )
                      else jsonb_build_object('headers', jsonb_build_array('INPUT.TXT', 'OUTPUT.TXT'), 'rows', '[]'::jsonb)
                    end
                  )
                else section
              end
              order by section_no
            )
            from jsonb_array_elements(slide->'sections') with ordinality as parts(section, section_no)
          )
        )
      else slide
    end
    order by slide_no
  ) into v_slides
  from jsonb_array_elements((select slides from public.cf_lessons where id = v_source)) with ordinality as pages(slide, slide_no);

  update public.cf_lessons
  set slides = v_slides,
      updated_at = now()
  where id = v_source;

  update public.cf_lessons target
  set slides = source.slides,
      plan = source.plan,
      terms = source.terms,
      updated_at = now()
  from public.cf_lessons source
  where source.id = v_source
    and target.owner_id = v_owner
    and target.title = 'Строковый тип (string)';
end;
$acmp_string_problem_layout$;
