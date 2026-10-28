-- ACMP дәрістерінің есеп беттеріне тақырыптық алгоритмдік сызбалар қосу.
-- Суреттер дерекқорда шағын SVG ретінде сақталады, сыртқы URL қажет емес.

do $acmp_foundations_diagrams$
declare
  v_owner uuid;
  v_lesson_id uuid;
  v_module text;
  v_slides jsonb;
  v_svg text;
  v_img text;
begin
  select owner_id into v_owner
  from public.cf_curr_courses
  where id = 'dbe60970-1fa6-4a8a-a65e-051d20cfd278'
    and title = 'ACMP: Язык программирования C++';

  if v_owner is null then
    raise exception 'ACMP курсы табылмады';
  end if;

  for v_lesson_id, v_module, v_slides in
    select l.id, m.title, l.slides
    from public.cf_lessons l
    join public.cf_curr_lessons cl on cl.lesson_id = l.id
    join public.cf_curr_modules m on m.id = cl.module_id
    join public.cf_curr_courses c on c.id = m.course_id
    where l.owner_id = v_owner
      and c.id = 'dbe60970-1fa6-4a8a-a65e-051d20cfd278'
      and l.title in (
        'Арифметика','Қарапайым есептер','Бүтін сандар','Формулаларды шығару',
        'Қарапайым салыстырулар','Шахмат','Күрделі есептер',
        'Параметрлі цикл (for)','Алдын ала шарты тексерілетін цикл (while)',
        'ЕҮОБ және ЕКОЕ','Жол түрі (string)','Санау жүйелері',
        'Сызықтық іздеу','Деректерді түрлендіру және талдау','Құрылымдар массиві'
      )
  loop
    if v_module = 'Введение' then
      v_svg := '<svg xmlns="http://www.w3.org/2000/svg" width="760" height="260" viewBox="0 0 760 260"><rect width="760" height="260" rx="24" fill="#ecfdf5"/><text x="380" y="48" text-anchor="middle" font-family="Arial" font-size="26" font-weight="700" fill="#14532d">Кіріс → формула → нәтиже</text><rect x="40" y="90" width="190" height="100" rx="18" fill="#bbf7d0" stroke="#166534" stroke-width="3"/><text x="135" y="135" text-anchor="middle" font-family="Arial" font-size="24" fill="#14532d">cin</text><text x="135" y="165" text-anchor="middle" font-family="Arial" font-size="18" fill="#14532d">a, b, n</text><path d="M240 140h90" stroke="#166534" stroke-width="6" marker-end="url(#a)"/><rect x="335" y="90" width="190" height="100" rx="18" fill="#bfdbfe" stroke="#1d4ed8" stroke-width="3"/><text x="430" y="135" text-anchor="middle" font-family="Arial" font-size="24" fill="#1e3a8a">есептеу</text><text x="430" y="165" text-anchor="middle" font-family="Arial" font-size="18" fill="#1e3a8a">+ − * / %</text><path d="M535 140h90" stroke="#166534" stroke-width="6" marker-end="url(#a)"/><rect x="630" y="90" width="90" height="100" rx="18" fill="#fde68a" stroke="#a16207" stroke-width="3"/><text x="675" y="148" text-anchor="middle" font-family="Arial" font-size="22" fill="#713f12">cout</text><defs><marker id="a" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#166534"/></marker></defs></svg>';
    elsif v_module = 'Условный оператор' then
      v_svg := '<svg xmlns="http://www.w3.org/2000/svg" width="760" height="300" viewBox="0 0 760 300"><rect width="760" height="300" rx="24" fill="#eff6ff"/><text x="380" y="42" text-anchor="middle" font-family="Arial" font-size="26" font-weight="700" fill="#1e3a8a">Шартты таңдау</text><path d="M380 70l100 70-100 70-100-70z" fill="#bfdbfe" stroke="#1d4ed8" stroke-width="3"/><text x="380" y="145" text-anchor="middle" font-family="Arial" font-size="22" fill="#1e3a8a">шарт?</text><path d="M280 140H120v90" fill="none" stroke="#166534" stroke-width="5"/><path d="M480 140h160v90" fill="none" stroke="#b91c1c" stroke-width="5"/><rect x="45" y="225" width="150" height="48" rx="14" fill="#bbf7d0"/><text x="120" y="256" text-anchor="middle" font-family="Arial" font-size="19" fill="#14532d">if: иә</text><rect x="565" y="225" width="150" height="48" rx="14" fill="#fecaca"/><text x="640" y="256" text-anchor="middle" font-family="Arial" font-size="19" fill="#7f1d1d">else: жоқ</text><text x="220" y="132" font-family="Arial" font-size="18" fill="#166534">true</text><text x="505" y="132" font-family="Arial" font-size="18" fill="#b91c1c">false</text></svg>';
    elsif v_module = 'Операторы цикла' then
      v_svg := '<svg xmlns="http://www.w3.org/2000/svg" width="760" height="330" viewBox="0 0 760 330"><rect width="760" height="330" rx="24" fill="#fff7ed"/><text x="380" y="42" text-anchor="middle" font-family="Arial" font-size="26" font-weight="700" fill="#9a3412">Цикл алгоритмі</text><rect x="285" y="65" width="190" height="52" rx="14" fill="#fed7aa" stroke="#c2410c" stroke-width="3"/><text x="380" y="98" text-anchor="middle" font-family="Arial" font-size="21" fill="#7c2d12">бастау</text><path d="M380 118v28" stroke="#c2410c" stroke-width="5"/><path d="M380 146l80 48-80 48-80-48z" fill="#bfdbfe" stroke="#1d4ed8" stroke-width="3"/><text x="380" y="200" text-anchor="middle" font-family="Arial" font-size="20" fill="#1e3a8a">шарт?</text><path d="M300 194H130v86h155" fill="none" stroke="#166534" stroke-width="5"/><path d="M460 194h170v86H475" fill="none" stroke="#c2410c" stroke-width="5"/><rect x="285" y="258" width="190" height="52" rx="14" fill="#bbf7d0" stroke="#166534" stroke-width="3"/><text x="380" y="291" text-anchor="middle" font-family="Arial" font-size="20" fill="#14532d">әрекет → қадам</text><text x="205" y="185" font-family="Arial" font-size="18" fill="#166534">иә</text><text x="505" y="185" font-family="Arial" font-size="18" fill="#c2410c">жоқ: шығу</text></svg>';
    elsif v_module = 'Строковые типы данных' then
      v_svg := '<svg xmlns="http://www.w3.org/2000/svg" width="760" height="280" viewBox="0 0 760 280"><rect width="760" height="280" rx="24" fill="#faf5ff"/><text x="380" y="42" text-anchor="middle" font-family="Arial" font-size="26" font-weight="700" fill="#581c87">Жол — символдар тізбегі</text><g font-family="Arial" font-size="28" text-anchor="middle"><rect x="70" y="90" width="120" height="90" rx="12" fill="#e9d5ff" stroke="#7e22ce" stroke-width="3"/><text x="130" y="145" fill="#581c87">C</text><rect x="210" y="90" width="120" height="90" rx="12" fill="#e9d5ff" stroke="#7e22ce" stroke-width="3"/><text x="270" y="145" fill="#581c87">+</text><rect x="350" y="90" width="120" height="90" rx="12" fill="#e9d5ff" stroke="#7e22ce" stroke-width="3"/><text x="410" y="145" fill="#581c87">+</text><rect x="490" y="90" width="120" height="90" rx="12" fill="#e9d5ff" stroke="#7e22ce" stroke-width="3"/><text x="550" y="145" fill="#581c87">2</text></g><text x="650" y="145" font-family="Arial" font-size="20" fill="#581c87">s[i]</text><path d="M70 210h540" stroke="#7e22ce" stroke-width="4"/><text x="380" y="245" text-anchor="middle" font-family="Arial" font-size="19" fill="#581c87">индекс: 0 · 1 · 2 · 3</text></svg>';
    else
      v_svg := '<svg xmlns="http://www.w3.org/2000/svg" width="760" height="280" viewBox="0 0 760 280"><rect width="760" height="280" rx="24" fill="#ecfeff"/><text x="380" y="42" text-anchor="middle" font-family="Arial" font-size="26" font-weight="700" fill="#164e63">Массивті талдау</text><g font-family="Arial" font-size="24" text-anchor="middle"><rect x="70" y="105" width="130" height="80" rx="12" fill="#a5f3fc" stroke="#0e7490" stroke-width="3"/><text x="135" y="153" fill="#164e63">a[0]</text><rect x="220" y="105" width="130" height="80" rx="12" fill="#a5f3fc" stroke="#0e7490" stroke-width="3"/><text x="285" y="153" fill="#164e63">a[1]</text><rect x="370" y="105" width="130" height="80" rx="12" fill="#a5f3fc" stroke="#0e7490" stroke-width="3"/><text x="435" y="153" fill="#164e63">a[2]</text><rect x="520" y="105" width="130" height="80" rx="12" fill="#a5f3fc" stroke="#0e7490" stroke-width="3"/><text x="585" y="153" fill="#164e63">a[3]</text></g><path d="M135 210h450" stroke="#0e7490" stroke-width="5"/><text x="380" y="250" text-anchor="middle" font-family="Arial" font-size="19" fill="#164e63">іздеу · санау · түрлендіру</text></svg>';
    end if;

    v_img := 'data:image/svg+xml;base64,' || encode(convert_to(v_svg, 'UTF8'), 'base64');
    v_slides := jsonb_set(v_slides, '{5,sections,1,img}', to_jsonb(v_img), true);
    v_slides := jsonb_set(v_slides, '{5,sections,1,alt}', to_jsonb('Тақырыптың алгоритмдік сызбасы'::text), true);
    v_slides := jsonb_set(v_slides, '{5,ru,sections,1,img}', to_jsonb(v_img), true);
    v_slides := jsonb_set(v_slides, '{5,ru,sections,1,alt}', to_jsonb('Алгоритмная схема темы'::text), true);

    update public.cf_lessons
    set slides = v_slides, updated_at = now()
    where id = v_lesson_id;
  end loop;
end;
$acmp_foundations_diagrams$;
