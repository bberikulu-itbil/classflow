-- Пайдаланушы жіберген барлық ACMP есептерін бір жинақ-дәріске біріктіру.
-- Қайта орындауға болады: жинақ-дәріс атауы бойынша жаңартылады.

do $acmp_collection$
declare
  v_course uuid;
  v_school uuid;
  v_owner uuid;
  v_module uuid;
  v_lesson uuid;
  v_position int;
  v_plan jsonb;
  v_slides jsonb;
  v_terms jsonb;
begin
  select c.id, c.school_id, c.owner_id
    into v_course, v_school, v_owner
  from public.cf_curr_courses c
  where c.id = 'dbe60970-1fa6-4a8a-a65e-051d20cfd278'
    and c.title = 'ACMP: Язык программирования C++';

  if v_course is null then
    raise exception 'ACMP курсы табылмады';
  end if;

  select m.id
    into v_module
  from public.cf_curr_modules m
  where m.course_id = v_course
    and m.title = 'Жіберілген есептер жинағы'
  limit 1;

  if v_module is null then
    select coalesce(max(m.position) + 1, 0)
      into v_position
    from public.cf_curr_modules m
    where m.course_id = v_course;

    insert into public.cf_curr_modules (course_id, title, position, kind, grade)
    values (v_course, 'Жіберілген есептер жинағы', v_position, 'course', 7)
    returning id into v_module;
  end if;

  v_plan := jsonb_build_object(
    'summary', $plan$Пайдаланушы жіберген ACMP және олимпиадалық есептердің бір жердегі тақырыптық картасы.$plan$,
    'objectives', jsonb_build_array(
      $plan$Есепті тақырыбы мен алгоритмі бойынша тез табу$plan$,
      $plan$Шартты оқып, кіріс/шығыс деректерін ажырату$plan$,
      $plan$Қажетті C++ құралын дұрыс таңдау: шарт, цикл, char/string, массив немесе бинарлық іздеу$plan$
    ),
    'grade', 7,
    'duration', $plan$45 минут$plan$
  );

  v_slides := jsonb_build_array(
    jsonb_build_object(
      'type','title','pageType','slide','templateId','title',
      'title',$title$Жіберген есептер жинағы$title$,
      'subtitle',$subtitle$ACMP: Язык программирования C++ · барлық тапсырма бір жерде$subtitle$
    ),
    jsonb_build_object(
      'type','content','pageType','scroll','templateId','theory',
      'title',$algebra$1. Алгебра и геометрия$algebra$,
      'bullets',jsonb_build_array(
        $algebra$A. От перестановки что-то меняется …$algebra$,
        $algebra$B. Внеземные гости$algebra$,
        $algebra$C. Длина отрезка$algebra$,
        $algebra$D. Две окружности$algebra$,
        $algebra$E. Симметрия$algebra$,
        $algebra$F. Коробки$algebra$,
        $algebra$G. Школьная алгебра$algebra$,
        $algebra$H. Квадратное уравнение$algebra$,
        $algebra$I. Упаковка$algebra$
      ),
      'prompt',$algebra_prompt$Нақты жіберілген есептер: №529 «Длина отрезка», №26 «Две окружности», №411 «Квадратное уравнение».$algebra_prompt$
    ),
    jsonb_build_object(
      'type','content','pageType','scroll','templateId','theory',
      'title',$sequences$2. Тізбектер және циклдер$sequences$,
      'bullets',jsonb_build_array(
        $sequences$A. Длина последовательности$sequences$,
        $sequences$B. Сумма последовательности$sequences$,
        $sequences$C. Среднее значение$sequences$,
        $sequences$D. Количество четных элементов$sequences$,
        $sequences$E. Максимум последовательности$sequences$,
        $sequences$F. Элементы, большие предыдущего$sequences$,
        $sequences$G. Второй максимум$sequences$,
        $sequences$H. Элементы, равные максимуму$sequences$,
        $sequences$I. Сумма последовательности — 2$sequences$,
        $sequences$J. Равные элементы$sequences$,
        $sequences$K. Монотонный фрагмент$sequences$,
        $sequences$L. Локальные максимумы$sequences$,
        $sequences$M. Расстояние между максимумами$sequences$,
        $sequences$N. Стандартное отклонение$sequences$
      ),
      'prompt',$sequence_prompt$Нақты жіберілген есептер: №1132 «Длина последовательности», №1133 «Сумма последовательности», №1136 «Максимум последовательности».$sequence_prompt$
    ),
    jsonb_build_object(
      'type','content','pageType','scroll','templateId','theory',
      'title',$binary$3. Бинарлық іздеу және сандық есептер$binary$,
      'bullets',jsonb_build_array(
        $binary$A. Сложность бинарного поиска$binary$,
        $binary$B. ROVEDA-2014$binary$,
        $binary$C. Угадай число$binary$,
        $binary$D. Ксерокопии$binary$,
        $binary$E. Космическое поселение$binary$,
        $binary$F. Стрелы!$binary$,
        $binary$G. Вырубка леса$binary$,
        $binary$H. Корень кубического уравнения$binary$,
        $binary$I. Дипломы$binary$,
        $binary$J. Кампус$binary$,
        $binary$K. Сыграешь с Денисом?$binary$,
        $binary$L. Три монеты$binary$,
        $binary$M. Круговой марафон$binary$
      ),
      'prompt',$binary_prompt$Нақты жіберілген есептер: №1465 «Угадай число», №267 «Ксерокопии», «Дипломы» №712, №1131 «Корень кубического уравнения».$binary_prompt$
    ),
    jsonb_build_object(
      'type','content','pageType','scroll','templateId','theory',
      'title',$chars$4. Символдық тип және жолдар$chars$,
      'bullets',jsonb_build_array(
        $chars$A. Цифра$chars$,
        $chars$B. Верхний регистр$chars$,
        $chars$C. Смена регистра$chars$,
        $chars$D. Количество нулей$chars$,
        $chars$E. Удаление цифр$chars$,
        $chars$F. Простой шифр$chars$,
        $chars$G. Вставка символов$chars$,
        $chars$H. Кругляши$chars$,
        $chars$I. Пароль$chars$,
        $chars$J. Нули$chars$,
        $chars$K. Генератор паролей$chars$,
        $chars$L. Благозвучное слово$chars$,
        $chars$M. IP-адрес$chars$,
        $chars$N. Уравнение для 5 класса!$chars$
      ),
      'prompt',$chars_prompt$Нақты жіберілген есептер: №1146 «Цифра», №1147 «Верхний регистр», №1148 «Смена регистра», №1198 «Генератор паролей», №1153 «Благозвучное слово», №1154 «IP-адрес». Сонымен бірге парольді тексеру коды бөлек талданды.$chars_prompt$
    ),
    jsonb_build_object(
      'type','content','pageType','scroll','templateId','theory',
      'title',$numbered1$5. Нөмірі бар есептер — формула және цикл$numbered1$,
      'bullets',jsonb_build_array(
        $numbered1$№529 — Длина отрезка: d = √((x2−x1)² + (y2−y1)²), sqrt және double.$numbered1$,
        $numbered1$№411 — Квадратное уравнение: a=0 жағдайы, дискриминант және 0/1/2 түбір.$numbered1$,
        $numbered1$№26 — Две окружности: |r1−r2| ≤ d ≤ r1+r2, түбірсіз салыстыру.$numbered1$,
        $numbered1$№1132 — Длина последовательности: бірінші 0-ге дейін санау.$numbered1$,
        $numbered1$№1133 — Сумма последовательности: бірінші 0-ге дейін қосу.$numbered1$,
        $numbered1$№1136 — Максимум последовательности: ағымдағы максимумды жаңарту.$numbered1$
      ),
      'prompt',$numbered1_prompt$Бұл есептердің толық талдауы тиісті негізгі дәрістерге де орналастырылған: «Алгебра и геометрия» және «Цикл с постусловием (do ... while)».$numbered1_prompt$
    ),
    jsonb_build_object(
      'type','content','pageType','scroll','templateId','theory',
      'title',$numbered2$6. Нөмірі бар есептер — char және бинарлық іздеу$numbered2$,
      'bullets',jsonb_build_array(
        $numbered2$№1465 — Угадай число: интерактивті бинарлық іздеу, әр жауаптан кейін flush.$numbered2$,
        $numbered2$№267 — Ксерокопии: feasible(t) және уақыт бойынша бинарлық іздеу.$numbered2$,
        $numbered2$№712 — Дипломы: квадрат тақта сыйымдылығын бинарлық іздеу.$numbered2$,
        $numbered2$№1131 — Корень кубического уравнения: нақты түбірді вещественный бинарлық іздеумен табу.$numbered2$,
        $numbered2$№1146, №1147, №1148 — char диапазондары және ASCII регистрі.$numbered2$,
        $numbered2$№1198, №1153, №1154 — пароль, дауысты/дауыссыз қатарлары және IP бөліктерін тексеру.$numbered2$
      ),
      'prompt',$numbered2_prompt$Парольді тексеру кодындағы негізгі қате: unsigned a,b,c нөлден төмен азайтылса, underflow болады. Дұрыс нұсқа санақтарды int арқылы нөлден бастап, ұзындықты және барлық минимумдарды соңында тексереді.$numbered2_prompt$
    ),
    jsonb_build_object(
      'type','content','pageType','scroll','templateId','theory',
      'title',$route$7. Ұсынылған шешу реті$route$,
      'bullets',jsonb_build_array(
        $route$1) Алдымен шартты қысқаша жазу: не берілді, не шығарылады?$route$,
        $route$2) Формуланы немесе цикл тоқтау шартын анықтау.$route$,
        $route$3) Ең қарапайым мысалды қолмен тексеру.$route$,
        $route$4) Шеткі жағдайларды қарау: 0, теңдік, бос бөлік, бірдей символ, a=0.$route$,
        $route$5) C++ кодын жазу, типтерді және дәлдікті тексеру.$route$,
        $route$6) Күрделілікті бағалау және қосымша тесттермен тексеру.$route$
      ),
      'prompt',$route_prompt$Жинақтағы есептің атауын көргенде алдымен оның алгоритмдік белгісін анықтаңыз: тұрақты формула, бір өтім, шартты таңдау немесе бинарлық іздеу.$route_prompt$
    )
  );

  v_terms := jsonb_build_array(
    jsonb_build_object('term',$term1$Жинақ-дәріс$term1$,'definition',$term1d$Пайдаланушы жіберген есептерді бір жерде көрсететін каталог.$term1d$),
    jsonb_build_object('term',$term2$Sentinel$term2$,'definition',$term2d$Тізбектің аяқталғанын білдіретін арнайы мән, мысалы 0.$term2d$),
    jsonb_build_object('term',$term3$feasible$term3$,'definition',$term3d$Берілген уақытта немесе өлшемде шарттың орындалатынын тексеретін функция.$term3d$),
    jsonb_build_object('term',$term4$ASCII$term4$,'definition',$term4d$Символдарды кодтар арқылы салыстыруға мүмкіндік беретін кесте.$term4d$)
  );

  select l.id
    into v_lesson
  from public.cf_lessons l
  where l.owner_id = v_owner
    and l.title = 'Жіберген есептер жинағы'
  limit 1;

  if v_lesson is null then
    insert into public.cf_lessons (school_id, owner_id, title, subject, plan, slides, terms)
    values (v_school, v_owner, 'Жіберген есептер жинағы', 'Информатика олимпиадасы', v_plan, v_slides, v_terms)
    returning id into v_lesson;
  else
    update public.cf_lessons
    set subject = 'Информатика олимпиадасы', plan = v_plan, slides = v_slides, terms = v_terms, updated_at = now()
    where id = v_lesson;
  end if;

  insert into public.cf_curr_lessons (lesson_id, module_id, position)
  values (v_lesson, v_module, 0)
  on conflict (lesson_id) do update
    set module_id = excluded.module_id, position = excluded.position;
end;
$acmp_collection$;
