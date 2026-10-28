-- VI-IX бөлімдерінің үлгі есептеріне тақырыптық SVG-сызбалар қосу.

do $acmp_advanced_diagrams$
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
  where id='dbe60970-1fa6-4a8a-a65e-051d20cfd278'
    and title='ACMP: Язык программирования C++';
  if v_owner is null then raise exception 'ACMP курсы табылмады'; end if;

  for v_lesson_id, v_module, v_slides in
    select l.id,m.title,l.slides
    from public.cf_lessons l
    join public.cf_curr_lessons cl on cl.lesson_id=l.id
    join public.cf_curr_modules m on m.id=cl.module_id
    join public.cf_curr_courses c on c.id=m.course_id
    where l.owner_id=v_owner and c.id='dbe60970-1fa6-4a8a-a65e-051d20cfd278'
      and l.title in ('Функциялар - 1','Функциялар - 2','Квадраттық сұрыптау','Жылдам сұрыптау','Құрылымдарды сұрыптау','Негізгі операциялар','Таңбалық матрицалар','Бүтін санды матрицалар','Рекурсия - 1','Рекурсия - 2')
  loop
    if v_module='Функции' then
      v_svg := '<svg xmlns="http://www.w3.org/2000/svg" width="760" height="280" viewBox="0 0 760 280"><rect width="760" height="280" rx="24" fill="#eff6ff"/><text x="380" y="42" text-anchor="middle" font-family="Arial" font-size="26" font-weight="700" fill="#1e3a8a">Функция: кіріс → әрекет → нәтиже</text><rect x="50" y="105" width="170" height="80" rx="16" fill="#bfdbfe" stroke="#1d4ed8" stroke-width="3"/><text x="135" y="153" text-anchor="middle" font-family="Arial" font-size="22" fill="#1e3a8a">аргумент</text><path d="M230 145h90" stroke="#1d4ed8" stroke-width="6"/><rect x="325" y="90" width="190" height="110" rx="18" fill="#ddd6fe" stroke="#6d28d9" stroke-width="3"/><text x="420" y="138" text-anchor="middle" font-family="Arial" font-size="22" fill="#4c1d95">function()</text><text x="420" y="170" text-anchor="middle" font-family="Arial" font-size="17" fill="#4c1d95">return</text><path d="M525 145h90" stroke="#1d4ed8" stroke-width="6"/><rect x="620" y="105" width="100" height="80" rx="16" fill="#bbf7d0" stroke="#166534" stroke-width="3"/><text x="670" y="153" text-anchor="middle" font-family="Arial" font-size="21" fill="#14532d">жауап</text></svg>';
    elsif v_module='Сортировка' then
      v_svg := '<svg xmlns="http://www.w3.org/2000/svg" width="760" height="280" viewBox="0 0 760 280"><rect width="760" height="280" rx="24" fill="#fff7ed"/><text x="380" y="42" text-anchor="middle" font-family="Arial" font-size="26" font-weight="700" fill="#9a3412">Сұрыптау: ретсіз → реттелген</text><g font-family="Arial" font-size="24" text-anchor="middle"><rect x="60" y="105" width="90" height="70" rx="12" fill="#fed7aa"/><text x="105" y="148" fill="#7c2d12">4</text><rect x="165" y="105" width="90" height="70" rx="12" fill="#fed7aa"/><text x="210" y="148" fill="#7c2d12">1</text><rect x="270" y="105" width="90" height="70" rx="12" fill="#fed7aa"/><text x="315" y="148" fill="#7c2d12">3</text></g><path d="M385 140h80" stroke="#c2410c" stroke-width="6"/><text x="425" y="112" text-anchor="middle" font-family="Arial" font-size="18" fill="#9a3412">compare + swap</text><g font-family="Arial" font-size="24" text-anchor="middle"><rect x="485" y="105" width="70" height="70" rx="12" fill="#bbf7d0"/><text x="520" y="148" fill="#14532d">1</text><rect x="570" y="105" width="70" height="70" rx="12" fill="#bbf7d0"/><text x="605" y="148" fill="#14532d">3</text><rect x="655" y="105" width="70" height="70" rx="12" fill="#bbf7d0"/><text x="690" y="148" fill="#14532d">4</text></g><text x="380" y="230" text-anchor="middle" font-family="Arial" font-size="19" fill="#7c2d12">O(n²) немесе O(n log n) идеялары</text></svg>';
    elsif v_module='Двумерные массивы' then
      v_svg := '<svg xmlns="http://www.w3.org/2000/svg" width="760" height="300" viewBox="0 0 760 300"><rect width="760" height="300" rx="24" fill="#ecfeff"/><text x="380" y="42" text-anchor="middle" font-family="Arial" font-size="26" font-weight="700" fill="#164e63">Матрица: жол × баған</text><g stroke="#0e7490" stroke-width="3" fill="#a5f3fc"><rect x="95" y="80" width="65" height="65"/><rect x="160" y="80" width="65" height="65"/><rect x="225" y="80" width="65" height="65"/><rect x="95" y="145" width="65" height="65"/><rect x="160" y="145" width="65" height="65"/><rect x="225" y="145" width="65" height="65"/></g><g font-family="Arial" font-size="21" fill="#164e63"><text x="112" y="72">j→</text><text x="70" y="125">i↓</text><text x="330" y="120">a[i][j]</text><path d="M305 120h110" stroke="#0e7490" stroke-width="5" marker-end="url(#m)"/><text x="435" y="100">оқу</text><text x="435" y="135">өзгерту</text><text x="435" y="170">шығару</text></g><defs><marker id="m" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#0e7490"/></marker></defs></svg>';
    else
      v_svg := '<svg xmlns="http://www.w3.org/2000/svg" width="760" height="300" viewBox="0 0 760 300"><rect width="760" height="300" rx="24" fill="#faf5ff"/><text x="380" y="42" text-anchor="middle" font-family="Arial" font-size="26" font-weight="700" fill="#581c87">Рекурсия: кішірейту → шақыру → база</text><rect x="285" y="70" width="190" height="52" rx="14" fill="#e9d5ff" stroke="#7e22ce" stroke-width="3"/><text x="380" y="103" text-anchor="middle" font-family="Arial" font-size="20" fill="#581c87">f(n)</text><path d="M380 123v25" stroke="#7e22ce" stroke-width="5"/><rect x="285" y="148" width="190" height="52" rx="14" fill="#ddd6fe" stroke="#7e22ce" stroke-width="3"/><text x="380" y="181" text-anchor="middle" font-family="Arial" font-size="20" fill="#581c87">f(n-1)</text><path d="M285 174H150v70h135" fill="none" stroke="#7e22ce" stroke-width="5"/><path d="M475 174h135v70H475" fill="none" stroke="#166534" stroke-width="5"/><rect x="285" y="244" width="190" height="42" rx="12" fill="#bbf7d0" stroke="#166534" stroke-width="3"/><text x="380" y="272" text-anchor="middle" font-family="Arial" font-size="18" fill="#14532d">base: тоқтау</text></svg>';
    end if;
    v_img := 'data:image/svg+xml;base64,' || encode(convert_to(v_svg,'UTF8'),'base64');
    v_slides := jsonb_set(v_slides,'{5,sections,1,img}',to_jsonb(v_img),true);
    v_slides := jsonb_set(v_slides,'{5,sections,1,alt}',to_jsonb('Тақырыптың алгоритмдік сызбасы'::text),true);
    v_slides := jsonb_set(v_slides,'{5,ru,sections,1,img}',to_jsonb(v_img),true);
    v_slides := jsonb_set(v_slides,'{5,ru,sections,1,alt}',to_jsonb('Алгоритмная схема темы'::text),true);
    update public.cf_lessons set slides=v_slides,updated_at=now() where id=v_lesson_id;
  end loop;
end;
$acmp_advanced_diagrams$;
