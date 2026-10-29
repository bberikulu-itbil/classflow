-- ACMP есептерін дайын дәрістерге қосу.
-- Қайта орындауға болады: осы атаулардағы есеп слайдтары алдымен алынып,
-- кейін жаңартылған нұсқасы қосылады.

do $acmp_tasks$
declare
  v_course uuid;
  v_owner uuid;
  v_algebra uuid;
  v_loops uuid;
  v_lesson_slides jsonb;
  v_algebra_tasks jsonb;
  v_loop_tasks jsonb;
begin
  select c.id, c.owner_id
    into v_course, v_owner
  from public.cf_curr_courses c
  where c.id = 'dbe60970-1fa6-4a8a-a65e-051d20cfd278'
    and c.title = 'ACMP: Язык программирования C++';

  if v_course is null then
    raise exception 'ACMP курсы табылмады';
  end if;

  select m.id into v_algebra
  from public.cf_curr_modules m
  where m.course_id = v_course and m.title = 'Условный оператор';

  select m.id into v_loops
  from public.cf_curr_modules m
  where m.course_id = v_course and m.title = 'Операторы цикла';

  if v_algebra is null or v_loops is null then
    raise exception 'Қажетті ACMP модульдері табылмады';
  end if;

  v_algebra_tasks := jsonb_build_array(
    jsonb_build_object(
      'type','content','pageType','scroll','templateId','theory',
      'title',$p529$ACMP №529 — Длина отрезка · талдау$p529$,
      'bullets',jsonb_build_array(
        $p529b$Деңгейі: L1, базалық геометрия және sqrt функциясы.$p529b$,
        $p529b$Жетектеуші сұрақ: екі нүктенің x және y координаталарынан қандай екі айырма шығады?$p529b$,
        $p529b$Математикалық модель: dx = x2 − x1, dy = y2 − y1, d = sqrt(dx² + dy²).$p529b$,
        $p529b$Шектеу: координаталар модулі 1000-нан аспайды; жауап 10⁻⁵ дәлдікпен шығарылады.$p529b$,
        $p529b$Псевдокод: координаталарды оқу → dx, dy табу → sqrt(dx*dx + dy*dy) есептеу → 5 таңбамен шығару.$p529b$,
        $p529b$Күрделілік: O(1), себебі тұрақты ғана бірнеше амал орындалады.$p529b$,
        $p529b$Шеткі жағдай: екі нүкте бірдей болса, жауап 0.$p529b$
      ),
      'prompt',$p529$Шарты:
Координаталары (x1, y1) және (x2, y2) болатын кесіндінің ұзындығын табыңыз.

Мысал: 3 4 8 4 → 5.00000.

Формула: d = √((x2 − x1)² + (y2 − y1)²).$p529$
    ),
    jsonb_build_object(
      'type','code','pageType','slide','templateId','code-example',
      'title',$p529c$ACMP №529 — C++ шешімі$p529c$,
      'prompt',$p529c$Координаталарды оқып, Пифагор теоремасы бойынша қашықтықты есептеңіз.$p529c$,
      'starter',$c529$#include <bits/stdc++.h>
using namespace std;

int main() {
    double x1, y1, x2, y2;
    cin >> x1 >> y1 >> x2 >> y2;

    double dx = x2 - x1;
    double dy = y2 - y1;
    double distance = sqrt(dx * dx + dy * dy);

    cout << fixed << setprecision(5) << distance;
    return 0;
}$c529$,
      'hints',jsonb_build_array(
        $h529$dx пен dy теріс болуы мүмкін, бірақ квадратталғаннан кейін бұл мәселе болмайды.$h529$,
        $h529$Вещественный нәтиже болғандықтан double қолданыңыз.$h529$
      ),
      'tests',jsonb_build_array(
        jsonb_build_object('input','3 4 8 4','out','5.00000','label','Көлденең кесінді'),
        jsonb_build_object('input','0 0 3 4','out','5.00000','label','3-4-5 үшбұрышы')
      )
    ),
    jsonb_build_object(
      'type','content','pageType','scroll','templateId','theory',
      'title',$p411$ACMP №411 — Квадратное уравнение · талдау$p411$,
      'bullets',jsonb_build_array(
        $p411b$Деңгейі: L1/L2, шартты оператор және дискриминант.$p411b$,
        $p411b$Жетектеуші сұрақ: a = 0 болғанда теңдеу квадрат теңдеу болып қала ма?$p411b$,
        $p411b$Егер a ≠ 0 болса, D = b² − 4ac: D < 0 — 0 түбір, D = 0 — 1 түбір, D > 0 — 2 түбір.$p411b$,
        $p411b$Егер a = 0 болса, bx + c = 0 сызықтық теңдеуін бөлек қарастырамыз.$p411b$,
        $p411b$Егер a = 0 және b = 0 болса: c = 0 — шексіз көп шешім (−1), c ≠ 0 — шешім жоқ (0).$p411b$,
        $p411b$Күрделілік: O(1). Шеткі жағдай: a = b = c = 0 және дискриминант нөлге тең.$p411b$
      ),
      'prompt',$p411$Шарты:
ax² + bx + c = 0 теңдеуінің әртүрлі нақты түбірлер санын және түбірлерін табыңыз.

Мысалдар: 1 -3 2 → 2 түбір: 1.000000 және 2.000000; 0 -1 6 → 1 түбір: 6.000000.

Алгоритм: алдымен a = 0 жағдайын, содан кейін дискриминанттың үш жағдайын тексеріңіз.$p411$
    ),
    jsonb_build_object(
      'type','code','pageType','slide','templateId','code-example',
      'title',$p411c$ACMP №411 — C++ шешімі$p411c$,
      'prompt',$p411c$Теңдеудің барлық ерекше жағдайларын ретімен өңдеңіз.$p411c$,
      'starter',$c411$#include <bits/stdc++.h>
using namespace std;

int main() {
    double a, b, c;
    cin >> a >> b >> c;

    const double EPS = 1e-12;

    if (fabs(a) < EPS) {
        if (fabs(b) < EPS) {
            cout << (fabs(c) < EPS ? -1 : 0);
        } else {
            cout << 1 << '\n';
            cout << fixed << setprecision(6) << -c / b;
        }
        return 0;
    }

    double d = b * b - 4 * a * c;
    if (d < -EPS) {
        cout << 0;
    } else if (fabs(d) < EPS) {
        cout << 1 << '\n';
        cout << fixed << setprecision(6) << -b / (2 * a);
    } else {
        double x1 = (-b - sqrt(d)) / (2 * a);
        double x2 = (-b + sqrt(d)) / (2 * a);
        if (x1 > x2) swap(x1, x2);
        cout << 2 << '\n';
        cout << fixed << setprecision(6) << x1 << '\n' << x2;
    }
    return 0;
}$c411$,
      'hints',jsonb_build_array(
        $h411$Бірден sqrt(d) шақырмай, алдымен d < 0, d = 0, d > 0 жағдайларын ажыратыңыз.$h411$,
        $h411$a нөлге тең болуы мүмкін екенін ұмытпаңыз.$h411$
      ),
      'tests',jsonb_build_array(
        jsonb_build_object('input','1 -3 2','out','2\n1.000000\n2.000000','label','Екі түбір'),
        jsonb_build_object('input','0 -1 6','out','1\n6.000000','label','Сызықтық теңдеу'),
        jsonb_build_object('input','1 0 1','out','0','label','Нақты түбір жоқ')
      )
    ),
    jsonb_build_object(
      'type','content','pageType','scroll','templateId','theory',
      'title',$p26$ACMP №26 — Две окружности · талдау$p26$,
      'bullets',jsonb_build_array(
        $p26b$Деңгейі: L1/L2, координаталар және салыстыру.$p26b$,
        $p26b$Жетектеуші сұрақ: центрлер арақашықтығы радиустар қосындысынан үлкен болса, шеңберлер қиылыса ма?$p26b$,
        $p26b$Екі шеңбердің ортақ нүктесі болуы үшін |r1 − r2| ≤ d ≤ r1 + r2 болуы керек.$p26b$,
        $p26b$sqrt қолданбаймыз: d² = dx² + dy² мәнін салыстыруға жеткілікті.$p26b$,
        $p26b$Күрделілік: O(1). Шеткі жағдай: ішкі және сыртқы жанасу да YES болып саналады.$p26b$
      ),
      'prompt',$p26$Шарты:
Орталықтары мен радиустары берілген екі шеңбердің кемінде бір ортақ нүктесі бар-жоғын анықтаңыз.

Бірінші жол: x1 y1 r1, екінші жол: x2 y2 r2.
Мысал: 0 0 2 және 0 3 2 → YES; 1 1 1 және 4 4 1 → NO.

Шеңберлер ортақ нүктеге ие, егер |r1 − r2| ≤ d ≤ r1 + r2.$p26$
    ),
    jsonb_build_object(
      'type','code','pageType','slide','templateId','code-example',
      'title',$p26c$ACMP №26 — C++ шешімі$p26c$,
      'prompt',$p26c$Қашықтықтың квадратын радиустардың квадраттарымен салыстырыңыз.$p26c$,
      'starter',$c26$#include <bits/stdc++.h>
using namespace std;

int main() {
    long long x1, y1, r1;
    long long x2, y2, r2;
    cin >> x1 >> y1 >> r1;
    cin >> x2 >> y2 >> r2;

    long long dx = x2 - x1;
    long long dy = y2 - y1;
    long long distance2 = dx * dx + dy * dy;
    long long low = r1 - r2;
    long long high = r1 + r2;

    bool common = low * low <= distance2 && distance2 <= high * high;
    cout << (common ? "YES" : "NO");
    return 0;
}$c26$,
      'hints',jsonb_build_array(
        $h26$Абсолют мәні үшін (r1 − r2)² қолдануға болады: |r1 − r2|² = (r1 − r2)².$h26$,
        $h26$Барлық есептеулер бүтін сандармен орындалады.$h26$
      ),
      'tests',jsonb_build_array(
        jsonb_build_object('input','0 0 2\n0 3 2','out','YES','label','Қиылысу'),
        jsonb_build_object('input','1 1 1\n4 4 1','out','NO','label','Бөлек шеңберлер')
      )
    )
  );

  v_loop_tasks := jsonb_build_array(
    jsonb_build_object(
      'type','content','pageType','scroll','templateId','theory',
      'title',$p1132$ACMP №1132 — Длина последовательности · талдау$p1132$,
      'bullets',jsonb_build_array(
        $p1132b$Деңгейі: L1, do ... while және sentinel нөл.$p1132b$,
        $p1132b$Жетектеуші сұрақ: 0 неліктен жауапқа қосылмайды және цикл қай кезде тоқтайды?$p1132b$,
        $p1132b$Әр нөл емес сан келген сайын length айнымалысын 1-ге арттырамыз.$p1132b$,
        $p1132b$Күрделілік: O(N), мұнда N — бірінші нөлге дейінгі элементтер саны.$p1132b$,
        $p1132b$Шеткі жағдай: бірінші сан 0 болса, жауап 0.$p1132b$
      ),
      'prompt',$p1132$Шарты:
Нөлмен аяқталатын теріс емес бүтін сандар тізбегінің ұзындығын табыңыз. Нөл тізбекке кірмейді.

Мысал: 1 7 9 0 5 → 3; 0 → 0.

Псевдокод: length = 0 → санды оқу → сан 0 болмаса length++ → сан 0 болғанша қайталау.$p1132$
    ),
    jsonb_build_object(
      'type','code','pageType','slide','templateId','code-example',
      'title',$p1132c$ACMP №1132 — C++ шешімі$p1132c$,
      'prompt',$p1132c$Нөлді оқығаннан кейін циклді тоқтатыңыз.$p1132c$,
      'starter',$c1132$#include <bits/stdc++.h>
using namespace std;

int main() {
    int x;
    int length = 0;

    do {
        cin >> x;
        if (x != 0) {
            ++length;
        }
    } while (x != 0);

    cout << length;
    return 0;
}$c1132$,
      'hints',jsonb_build_array($h1132$do ... while денені кемінде бір рет орындайды.$h1132$,$h1132$Нөлді санауға қоспаңыз.$h1132$),
      'tests',jsonb_build_array(
        jsonb_build_object('input','1 7 9 0 5','out','3','label','Бірінші нөл'),
        jsonb_build_object('input','0','out','0','label','Бос тізбек')
      )
    ),
    jsonb_build_object(
      'type','content','pageType','scroll','templateId','theory',
      'title',$p1133$ACMP №1133 — Сумма последовательности · талдау$p1133$,
      'bullets',jsonb_build_array(
        $p1133b$Деңгейі: L1, sentinel арқылы жинақтау.$p1133b$,
        $p1133b$Жетектеуші сұрақ: қай мән қосындыға кірмейді?$p1133b$,
        $p1133b$Әр x нөл емес болса, sum = sum + x амалын орындаймыз.$p1133b$,
        $p1133b$Шектеу бойынша int жеткілікті; жалпы тәсіл ретінде үлкен қосындыға long long таңдауға болады.$p1133b$,
        $p1133b$Күрделілік: O(N), жады: O(1).$p1133b$
      ),
      'prompt',$p1133$Шарты:
Бірінші нөлмен аяқталатын теріс емес бүтін сандар тізбегінің элементтерінің қосындысын табыңыз. Нөл қосындыға кірмейді.

Мысал: 1 7 9 0 5 → 17; 1 2 3 4 5 0 → 15.

Негізгі идея: санды оқыңыз; нөл болмаса ғана sum айнымалысына қосыңыз; нөл келгенде тоқтаңыз.$p1133$
    ),
    jsonb_build_object(
      'type','code','pageType','slide','templateId','code-example',
      'title',$p1133c$ACMP №1133 — C++ шешімі$p1133c$,
      'prompt',$p1133c$Нөл — тек тоқтатқыш белгі, оны sum-ға қоспаңыз.$p1133c$,
      'starter',$c1133$#include <bits/stdc++.h>
using namespace std;

int main() {
    int x;
    int sum = 0;

    do {
        cin >> x;
        if (x != 0) {
            sum += x;
        }
    } while (x != 0);

    cout << sum;
    return 0;
}$c1133$,
      'hints',jsonb_build_array($h1133$sum айнымалысын циклге дейін 0-ге теңестіріңіз.$h1133$,$h1133$Нөл келгенде sum өзгермеуі керек.$h1133$),
      'tests',jsonb_build_array(
        jsonb_build_object('input','1 7 9 0 5','out','17','label','Бірінші нөл'),
        jsonb_build_object('input','0','out','0','label','Бір ғана нөл')
      )
    ),
    jsonb_build_object(
      'type','content','pageType','scroll','templateId','theory',
      'title',$p1136$ACMP №1136 — Максимум последовательности · талдау$p1136$,
      'bullets',jsonb_build_array(
        $p1136b$Деңгейі: L1/L2, цикл ішінде максимумды жаңарту.$p1136b$,
        $p1136b$Жетектеуші сұрақ: максимумның бастапқы мәнін қалай қауіпсіз таңдаймыз?$p1136b$,
        $p1136b$Сандар теріс емес болғандықтан, mx = 0 деп бастауға болады.$p1136b$,
        $p1136b$Әр нөл емес x үшін mx = max(mx, x) жасаймыз.$p1136b$,
        $p1136b$Күрделілік: O(N), жады: O(1). Шеткі жағдай: бірінші сан 0 болса, жауап 0.$p1136b$
      ),
      'prompt',$p1136$Шарты:
Бірінші нөлмен аяқталатын теріс емес бүтін сандар тізбегінің ең үлкен элементін табыңыз. Нөл тізбекке кірмейді.

Мысал: 1 7 9 0 → 9; 1 2 3 4 5 6 7 0 → 7.

Алгоритм: mx = 0 → санды оқу → нөл емес болса mx = max(mx, x) → нөл келгенше қайталау.$p1136$
    ),
    jsonb_build_object(
      'type','code','pageType','slide','templateId','code-example',
      'title',$p1136c$ACMP №1136 — C++ шешімі$p1136c$,
      'prompt',$p1136c$Максимумды әрбір оқылған нөл емес элементтен кейін жаңартыңыз.$p1136c$,
      'starter',$c1136$#include <bits/stdc++.h>
using namespace std;

int main() {
    int x;
    int maximum = 0;

    do {
        cin >> x;
        if (x != 0) {
            maximum = max(maximum, x);
        }
    } while (x != 0);

    cout << maximum;
    return 0;
}$c1136$,
      'hints',jsonb_build_array($h1136$Берілген сандар теріс емес, сондықтан 0-ден бастауға болады.$h1136$,$h1136$0-ді максимум ретінде өңдемеңіз.$h1136$),
      'tests',jsonb_build_array(
        jsonb_build_object('input','1 7 9 0','out','9','label','Максимум ортасында'),
        jsonb_build_object('input','0','out','0','label','Бос тізбек')
      )
    )
  );

  select l.id into v_algebra
  from public.cf_lessons l
  where l.owner_id = v_owner and l.title = 'Алгебра и геометрия'
  limit 1;

  if v_algebra is null then
    raise exception 'Алгебра и геометрия дәрісі табылмады';
  end if;

  select coalesce(jsonb_agg(x.item order by x.ord), '[]'::jsonb)
    into v_lesson_slides
  from public.cf_lessons l,
       jsonb_array_elements(coalesce(l.slides, '[]'::jsonb)) with ordinality as x(item, ord)
  where l.id = v_algebra
    and coalesce(x.item->>'title','') not in (
      'ACMP №529 — Длина отрезка · талдау',
      'ACMP №529 — C++ шешімі',
      'ACMP №411 — Квадратное уравнение · талдау',
      'ACMP №411 — C++ шешімі',
      'ACMP №26 — Две окружности · талдау',
      'ACMP №26 — C++ шешімі'
    );

  update public.cf_lessons
  set slides = v_lesson_slides || v_algebra_tasks,
      updated_at = now()
  where id = v_algebra;

  select l.id into v_loops
  from public.cf_lessons l
  where l.owner_id = v_owner and l.title = 'Цикл с постусловием (do ... while)'
  limit 1;

  if v_loops is null then
    raise exception 'Цикл с постусловием дәрісі табылмады';
  end if;

  select coalesce(jsonb_agg(x.item order by x.ord), '[]'::jsonb)
    into v_lesson_slides
  from public.cf_lessons l,
       jsonb_array_elements(coalesce(l.slides, '[]'::jsonb)) with ordinality as x(item, ord)
  where l.id = v_loops
    and coalesce(x.item->>'title','') not in (
      'ACMP №1132 — Длина последовательности · талдау',
      'ACMP №1132 — C++ шешімі',
      'ACMP №1133 — Сумма последовательности · талдау',
      'ACMP №1133 — C++ шешімі',
      'ACMP №1136 — Максимум последовательности · талдау',
      'ACMP №1136 — C++ шешімі'
    );

  update public.cf_lessons
  set slides = v_lesson_slides || v_loop_tasks,
      updated_at = now()
  where id = v_loops;
end;
$acmp_tasks$;
