-- ACMP C++ курсына үш дәріс қосу.
-- Қайта орындауға болады: бірдей атаудағы дәрістер жаңартылып, модульге қайта байланысады.
-- Supabase SQL Editor-де орындауға арналған.

do $$
declare
  v_course uuid;
  v_school uuid;
  v_owner uuid;
  v_conditional uuid;
  v_loops uuid;
  v_lesson uuid;
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

  select m.id into v_conditional
  from public.cf_curr_modules m
  where m.course_id = v_course and m.title = 'Условный оператор';

  select m.id into v_loops
  from public.cf_curr_modules m
  where m.course_id = v_course and m.title = 'Операторы цикла';

  if v_conditional is null or v_loops is null then
    raise exception 'Қажетті ACMP модульдері табылмады';
  end if;

  v_plan := jsonb_build_object(
    'summary', $t$Пифагор теоремасы, координаталардағы қашықтық және квадрат теңдеуді C++ арқылы шешу.$t$,
    'objectives', jsonb_build_array(
      $t$Гипотенуза, катет және қашықтық формуласын қолдану$t$,
      $t$Дискриминант арқылы квадрат теңдеуді шешу$t$,
      $t$Вещественный нәтиже үшін setprecision қолдану$t$
    ),
    'grade', 9,
    'duration', $t$90 минут$t$
  );
  v_slides := jsonb_build_array(
    jsonb_build_object(
      'type','title','pageType','slide','templateId','title',
      'title',$t$Алгебра и геометрия$t$,
      'subtitle',$t$Пифагор теоремасы және квадрат теңдеу · C++$t$
    ),
    jsonb_build_object(
      'type','content','pageType','scroll','templateId','theory',
      'title',$t$Пифагор теоремасы$t$,
      'bullets',jsonb_build_array(
        $t$Тікбұрышты үшбұрышта a² + b² = c²$t$,
        $t$Гипотенуза: c = sqrt(a*a + b*b)$t$,
        $t$Координаталардағы қашықтық: d = sqrt((x2-x1)² + (y2-y1)²)$t$
      )
    ),
    jsonb_build_object(
      'type','code','pageType','slide','templateId','code-example',
      'title',$t$Гипотенузаны есептеу$t$,
      'prompt',$t$Екі катет берілген. Гипотенуза, аудан және периметрді табыңыз.$t$,
      'starter',$code1$#include <bits/stdc++.h>
using namespace std;

int main() {
    double a, b;
    cin >> a >> b;
    double c = sqrt(a * a + b * b);
    cout << fixed << setprecision(6) << c << "\\n";
    cout << a * b / 2 << "\\n";
    cout << a + b + c << "\\n";
}$code1$,
      'hints',jsonb_build_array($t$Вещественный тип және sqrt қолданыңыз$t$),
      'tests',jsonb_build_array()
    ),
    jsonb_build_object(
      'type','code','pageType','slide','templateId','code-example',
      'title',$t$Квадрат теңдеу$t$,
      'prompt',$t$ax² + bx + c = 0 теңдеуін дискриминант арқылы шешу.$t$,
      'starter',$code2$double a, b, c;
cin >> a >> b >> c;
double d = b * b - 4 * a * c;
if (d < 0) {
    cout << "No solution";
} else if (d == 0) {
    cout << -b / (2 * a);
} else {
    cout << (-b - sqrt(d)) / (2 * a) << " ";
    cout << (-b + sqrt(d)) / (2 * a);
}$code2$,
      'hints',jsonb_build_array($t$d < 0, d = 0 және d > 0 жағдайларын бөлек өңдеңіз$t$),
      'tests',jsonb_build_array()
    ),
    jsonb_build_object(
      'type','quiz','pageType','interactive','templateId','single-choice',
      'title',$t$Өзіңді тексер$t$,
      'prompt',$t$Екі нүкте арасындағы қашықтық формуласы қайсы?$t$,
      'options',jsonb_build_array(
        $t$sqrt((x2-x1)^2 + (y2-y1)^2)$t$,
        $t$(x2-x1) + (y2-y1)$t$,
        $t$sqrt(x1*x2 + y1*y2)$t$,
        $t$abs(x2-x1) + abs(y2-y1)$t$
      ),
      'answer',0,'points',1
    ),
    jsonb_build_object(
      'type','task','pageType','interactive','templateId','short-answer',
      'title',$t$ACMP есептері$t$,
      'prompt',$t$«Длина отрезка», «Две окружности», «Школьная алгебра», «Квадратное уравнение» есептерін шешіңіз. Формуланы, типті және шекаралық жағдайларды көрсетіңіз.$t$,
      'accept',jsonb_build_array($t$формула$t$,$t$double$t$,$t$дискриминант$t$),'points',5
    )
  );
  v_terms := jsonb_build_array(
    jsonb_build_object('term',$t$гипотенуза$t$,'definition',$t$Тікбұрышты үшбұрыштың 90° бұрышына қарсы жатқан қабырға.$t$),
    jsonb_build_object('term',$t$дискриминант$t$,'definition',$t$Квадрат теңдеудің түбірлер санын анықтайтын D = b² − 4ac мәні.$t$),
    jsonb_build_object('term',$t$setprecision$t$,'definition',$t$Вещественный санды берілген дәлдікпен шығаратын iomanip манипуляторы.$t$)
  );

  select l.id into v_lesson
  from public.cf_lessons l
  where l.owner_id = v_owner and l.title = 'Алгебра и геометрия'
  limit 1;

  if v_lesson is null then
    insert into public.cf_lessons (school_id, owner_id, title, subject, plan, slides, terms)
    values (v_school, v_owner, 'Алгебра и геометрия', 'Информатика олимпиадасы', v_plan, v_slides, v_terms)
    returning id into v_lesson;
  else
    update public.cf_lessons
    set subject = 'Информатика олимпиадасы', plan = v_plan, slides = v_slides, terms = v_terms, updated_at = now()
    where id = v_lesson;
  end if;

  insert into public.cf_curr_lessons (lesson_id, module_id, position)
  values (v_lesson, v_conditional, 0)
  on conflict (lesson_id) do update set module_id = excluded.module_id, position = excluded.position;

  v_plan := jsonb_build_object(
    'summary', $t$do ... while циклінің құрылымы, орындалу реті және тізбектермен жұмыс.$t$,
    'objectives', jsonb_build_array(
      $t$Цикл денесінің кемінде бір рет орындалуын түсіндіру$t$,
      $t$Цикл шартын соңында тексеру$t$,
      $t$Тізбек есептерінде тоқтау шартын дұрыс құру$t$
    ),
    'grade', 7,
    'duration', $t$90 минут$t$
  );
  v_slides := jsonb_build_array(
    jsonb_build_object(
      'type','title','pageType','slide','templateId','title',
      'title',$t$Цикл с постусловием$t$,
      'subtitle',$t$do ... while · C++ олимпиадалық есептер$t$
    ),
    jsonb_build_object(
      'type','content','pageType','scroll','templateId','theory',
      'title',$t$Негізгі идея$t$,
      'bullets',jsonb_build_array(
        $t$do блогы алдымен орындалады$t$,
        $t$while шарт содан кейін тексеріледі$t$,
        $t$Шарт true болса, цикл қайталанады$t$,
        $t$Шарт false болса, цикл тоқтайды$t$
      ),
      'notes',$t$while циклінен айырмашылығы: do ... while денені кемінде бір рет орындайды.$t$
    ),
    jsonb_build_object(
      'type','code','pageType','slide','templateId','code-example',
      'title',$t$Синтаксис$t$,
      'prompt',$t$Пароль дұрыс болғанша сұрайтын цикл.$t$,
      'starter',$code3$#include <bits/stdc++.h>
using namespace std;

int main() {
    string s;
    const string password = "C++";
    do {
        cin >> s;
        if (s != password) cout << "Access denied\\n";
    } while (s != password);
    cout << "Access granted\\n";
}$code3$,
      'hints',jsonb_build_array($t$Соңындағы нүктелі үтірді ұмытпаңыз$t$),
      'tests',jsonb_build_array()
    ),
    jsonb_build_object(
      'type','code','pageType','slide','templateId','code-example',
      'title',$t$Sentinel арқылы оқу$t$,
      'prompt',$t$0 енгізілгенде аяқталатын тізбектің қосындысы.$t$,
      'starter',$code4$int x, sum = 0;
do {
    cin >> x;
    sum += x;
} while (x != 0);
cout << sum;$code4$,
      'hints',jsonb_build_array($t$0 қосындыға кірмеуі керек болса, оны бөлек өңдеңіз$t$),
      'tests',jsonb_build_array()
    ),
    jsonb_build_object(
      'type','quiz','pageType','interactive','templateId','single-choice',
      'title',$t$Қай кезде do ... while таңдаймыз?$t$,
      'prompt',$t$Қай талап do ... while циклін таңдауға ең дәл себеп болады?$t$,
      'options',jsonb_build_array(
        $t$Цикл денесі кемінде бір рет орындалуы керек$t$,
        $t$Цикл денесі ешқашан орындалмауы мүмкін$t$,
        $t$Итерация саны алдын ала белгілі$t$,
        $t$Массивті сұрыптау керек$t$
      ),
      'answer',0,'points',1
    ),
    jsonb_build_object(
      'type','task','pageType','interactive','templateId','short-answer',
      'title',$t$ACMP есептері$t$,
      'prompt',$t$«Длина последовательности», «Сумма последовательности», «Количество четных элементов», «Максимум последовательности» есептерін do ... while көмегімен шешіңіз.$t$,
      'accept',jsonb_build_array($t$do$t$,$t$while$t$,$t$тоқтау шарты$t$),'points',5
    )
  );
  v_terms := jsonb_build_array(
    jsonb_build_object('term',$t$do ... while$t$,'definition',$t$Цикл денесін алдымен орындап, шартты соңында тексеретін цикл.$t$),
    jsonb_build_object('term',$t$sentinel$t$,'definition',$t$Енгізуді аяқтайтын арнайы басқарушы мән.$t$),
    jsonb_build_object('term',$t$итерация$t$,'definition',$t$Цикл денесінің бір рет орындалуы.$t$)
  );

  select l.id into v_lesson
  from public.cf_lessons l
  where l.owner_id = v_owner and l.title = 'Цикл с постусловием (do ... while)'
  limit 1;

  if v_lesson is null then
    insert into public.cf_lessons (school_id, owner_id, title, subject, plan, slides, terms)
    values (v_school, v_owner, 'Цикл с постусловием (do ... while)', 'Информатика олимпиадасы', v_plan, v_slides, v_terms)
    returning id into v_lesson;
  else
    update public.cf_lessons
    set subject = 'Информатика олимпиадасы', plan = v_plan, slides = v_slides, terms = v_terms, updated_at = now()
    where id = v_lesson;
  end if;

  insert into public.cf_curr_lessons (lesson_id, module_id, position)
  values (v_lesson, v_loops, 0)
  on conflict (lesson_id) do update set module_id = excluded.module_id, position = excluded.position;

  v_plan := jsonb_build_object(
    'summary', $t$Іздеу аралығын екіге бөліп, шешім болатын жартысын қалдыру әдісі.$t$,
    'objectives', jsonb_build_array(
      $t$Бинарлық іздеудің O(log N) идеясын түсіну$t$,
      $t$Целочисленный бинарлық іздеуді шекаралармен жазу$t$,
      $t$Вещественный бинарлық іздеуде epsilon қолдану$t$
    ),
    'grade', 9,
    'duration', $t$120 минут$t$
  );
  v_slides := jsonb_build_array(
    jsonb_build_object(
      'type','title','pageType','slide','templateId','title',
      'title',$t$Бинарный поиск$t$,
      'subtitle',$t$Аралықты екіге бөлу · O(log N)$t$
    ),
    jsonb_build_object(
      'type','content','pageType','scroll','templateId','theory',
      'title',$t$Понятие бинарного поиска$t$,
      'bullets',jsonb_build_array(
        $t$Жауапты іздеу аралығын екі бөлікке бөлеміз$t$,
        $t$Шарт арқылы дұрыс жартысын қалдырамыз$t$,
        $t$Әр қадамда кандидаттар саны шамамен екі есе азаяды$t$,
        $t$Күрделілік: O(log N)$t$
      )
    ),
    jsonb_build_object(
      'type','code','pageType','slide','templateId','code-example',
      'title',$t$Целочисленный нұсқа$t$,
      'prompt',$t$1 мен 100 аралығындағы жасырын санды ең көбі 7 сұрақпен табу идеясы.$t$,
      'starter',$code5$int left = 1, right = 100;
while (left < right) {
    int mid = left + (right - left) / 2;
    if (isGreater(mid)) left = mid + 1;
    else right = mid;
}
cout << left;$code5$,
      'hints',jsonb_build_array($t$27 > 100 болғандықтан, 7 қадам жеткілікті$t$),
      'tests',jsonb_build_array()
    ),
    jsonb_build_object(
      'type','code','pageType','slide','templateId','code-example',
      'title',$t$Вещественный бинарлық іздеу$t$,
      'prompt',$t$sqrt(a) мәнін epsilon дәлдігімен табу.$t$,
      'starter',$code6$double left = 0, right = a + 1;
const double eps = 1e-6;
while (right - left > eps) {
    double mid = (left + right) / 2;
    if (mid * mid < a) left = mid;
    else right = mid;
}
cout << fixed << setprecision(6) << (left + right) / 2;$code6$,
      'hints',jsonb_build_array($t$Аралық ұзындығы epsilon-нан азайғанша бөл$t$),
      'tests',jsonb_build_array()
    ),
    jsonb_build_object(
      'type','quiz','pageType','interactive','templateId','single-choice',
      'title',$t$Қай шарт дұрыс?$t$,
      'prompt',$t$Целочисленный бинарлық іздеудің классикалық тоқтау шарты қандай?$t$,
      'options',jsonb_build_array($t$left < right$t$,$t$left + right > 0$t$,$t$mid == 0$t$,$t$right - left < 0$t$),
      'answer',0,'points',1
    ),
    jsonb_build_object(
      'type','task','pageType','interactive','templateId','short-answer',
      'title',$t$ACMP есептері$t$,
      'prompt',$t$«Ксерокопии», «Дипломы», «Кампус», «Корень кубического уравнения» есептерінде монотонды predicate құрып, бинарлық іздеуді қолданыңыз.$t$,
      'accept',jsonb_build_array($t$O(log N)$t$,$t$left$t$,$t$right$t$,$t$mid$t$,$t$epsilon$t$),'points',5
    )
  );
  v_terms := jsonb_build_array(
    jsonb_build_object('term',$t$бинарлық іздеу$t$,'definition',$t$Іздеу аралығын әр қадамда екіге бөліп, мүмкін жауаптардың бір жартысын алып тастайтын әдіс.$t$),
    jsonb_build_object('term',$t$predicate$t$,'definition',$t$Жауапқа қатысты true/false мәнін беретін монотонды шарт.$t$),
    jsonb_build_object('term',$t$epsilon$t$,'definition',$t$Вещественный бинарлық іздеудегі рұқсат етілген абсолют қате.$t$)
  );

  select l.id into v_lesson
  from public.cf_lessons l
  where l.owner_id = v_owner and l.title = 'Бинарный поиск'
  limit 1;

  if v_lesson is null then
    insert into public.cf_lessons (school_id, owner_id, title, subject, plan, slides, terms)
    values (v_school, v_owner, 'Бинарный поиск', 'Информатика олимпиадасы', v_plan, v_slides, v_terms)
    returning id into v_lesson;
  else
    update public.cf_lessons
    set subject = 'Информатика олимпиадасы', plan = v_plan, slides = v_slides, terms = v_terms, updated_at = now()
    where id = v_lesson;
  end if;

  insert into public.cf_curr_lessons (lesson_id, module_id, position)
  values (v_lesson, v_loops, 1)
  on conflict (lesson_id) do update set module_id = excluded.module_id, position = excluded.position;
end;
$$;

-- ACMP C++ курсына "Символьный тип (char)" дәрісін қосу.
-- Қайта орындауға болады: бірдей атаудағы дәріс жаңартылып, модульге қайта байланысады.
do $block_char_lecture$
declare
  v_course uuid;
  v_school uuid;
  v_owner uuid;
  v_strings uuid;
  v_lesson uuid;
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

  select m.id into v_strings
  from public.cf_curr_modules m
  where m.course_id = v_course and m.title = 'Строковые типы данных';

  if v_strings is null then
    raise exception 'Строковые типы данных модулі табылмады';
  end if;

  v_plan := jsonb_build_object(
    'summary', $ct$char типі, ASCII кодтары, регистр, символдық цифрлар және char есептері.$ct$,
    'objectives', jsonb_build_array(
      $ct$char мәнін оқу, шығару және ASCII коды арқылы салыстыруды үйрену$ct$,
      $ct$Символдық цифрды санға және санды цифр символына айналдыру$ct$,
      $ct$tolower, toupper функцияларын қауіпсіз қолдану$ct$,
      $ct$Пароль, IP-адрес және благозвучное слово есептерін шешу$ct$
    ),
    'grade', 7,
    'duration', $ct$90 минут$ct$
  );

  v_slides := jsonb_build_array(
    jsonb_build_object(
      'type','title','pageType','slide','templateId','title',
      'title',$ct$Символьный тип (char)$ct$,
      'subtitle',$ct$ASCII кодтары және символдармен жұмыс · C++$ct$
    ),
    jsonb_build_object(
      'type','content','pageType','scroll','templateId','theory',
      'title',$ct$char дегеніміз не?$ct$,
      'bullets',jsonb_build_array(
        $ct$char бір символды сақтайды; символды тырнақшаға аламыз: 'A', '7', '?'$ct$,
        $ct$Символдың ішкі мәні — бүтін ASCII коды.$ct$,
        $ct$'0'..'9': 48..57; 'A'..'Z': 65..90; 'a'..'z': 97..122.$ct$,
        $ct$Символдар ASCII кодтары бойынша салыстырылады: 'A' < 'a'.$ct$,
        $ct$char signed немесе unsigned болуы мүмкін; кодтармен жұмыс істегенде unsigned char cast қолданған дұрыс.$ct$
      )
    ),
    jsonb_build_object(
      'type','code','pageType','slide','templateId','code-example',
      'title',$ct$Символды оқу және ASCII кодын шығару$ct$,
      'prompt',$ct$Бір символ оқып, оның өзін және сандық кодын шығарыңыз. Цифр екенін тексеріңіз.$ct$,
      'starter',$cc1$#include <bits/stdc++.h>
using namespace std;

int main() {
    char c;
    cin >> c;

    cout << c << '\n';
    cout << int(c) << '\n';
    if ('0' <= c && c <= '9') {
        cout << "digit\n";
    }
}$cc1$,
      'hints',jsonb_build_array(
        $ct$Символдың кодын шығару үшін int(c) қолданыңыз.$ct$,
        $ct$Цифрды тексеру шарты: '0' <= c && c <= '9'.$ct$
      ),
      'tests',jsonb_build_array()
    ),
    jsonb_build_object(
      'type','content','pageType','scroll','templateId','theory',
      'title',$ct$Символдық цифрлар және регистр$ct$,
      'bullets',jsonb_build_array(
        $ct$Символдық цифрды санға айналдыру: x = c - '0'.$ct$,
        $ct$Санды символдық цифрға айналдыру: c = x + '0'.$ct$,
        $ct$Кіші әріпті бас әріпке: toupper(c). Бас әріпті кіші әріпке: tolower(c).$ct$,
        $ct$<cctype> функцияларына unsigned char түріне түрлендіріп берген дұрыс.$ct$
      )
    ),
    jsonb_build_object(
      'type','code','pageType','slide','templateId','code-example',
      'title',$ct$Жолды бас әріпке ауыстыру$ct$,
      'prompt',$ct$Енгізілген мәтіндегі әріптерді бас әріпке ауыстырып шығарыңыз.$ct$,
      'starter',$cc2$#include <bits/stdc++.h>
using namespace std;

int main() {
    char c;
    while (cin.get(c)) {
        c = char(toupper(static_cast<unsigned char>(c)));
        cout << c;
    }
}$cc2$,
      'hints',jsonb_build_array($ct$cin.get(c) бос орындарды да оқиды.$ct$,$ct$EOF келгенше цикл жалғасады.$ct$),
      'tests',jsonb_build_array()
    ),
    jsonb_build_object(
      'type','code','pageType','slide','templateId','code-example',
      'title',$ct$ASCII кестесі$ct$,
      'prompt',$ct$32-ден 127-ге дейінгі ASCII кодтарын символымен бірге шығарыңыз.$ct$,
      'starter',$cc3$#include <bits/stdc++.h>
using namespace std;

int main() {
    for (int code = 32; code < 128; ++code) {
        cout << char(code) << " - " << code << '\n';
    }
}$cc3$,
      'hints',jsonb_build_array($ct$char(code) сандық кодты символға айналдырады.$ct$),
      'tests',jsonb_build_array()
    ),
    jsonb_build_object(
      'type','task','pageType','interactive','templateId','short-answer',
      'title',$ct$Пароль генераторы$ct$,
      'prompt',$ct$N ұзындықтағы пароль құрыңыз. Онда кемінде A бас әріп, B кіші әріп және C цифр болсын; қатар тұрған екі символ бірдей болмасын. Қалған символдарды өзіңіз таңдаңыз.$ct$,
      'solution',$cc4$int n;
cin >> n;
int a, b, c;
cin >> a >> b >> c;

string password;
int upper = 0, lower = 0, digit = 0;
for (int i = 0; i < n; ++i) {
    if (a > 0) {
        password += char('A' + upper++ % 26);
        --a;
    } else if (b > 0) {
        password += char('a' + lower++ % 26);
        --b;
    } else {
        password += char('0' + digit++ % 10);
        --c;
    }
}
cout << password;$cc4$,
      'hints',jsonb_build_array(
        $ct$Алдымен минималды талаптарды орындаңыз: A, B, C символдарын қосыңыз.$ct$,
        $ct$Бір типтегі символдарды да әртүрлі кодтармен таңдаңыз.$ct$
      ),
      'tests',jsonb_build_array()
    ),
    jsonb_build_object(
      'type','task','pageType','interactive','templateId','short-answer',
      'title',$ct$Благозвучное слово$ct$,
      'prompt',$ct$Сөзде үш дауыссыз немесе үш дауысты қатар келмеуі керек. Қажет болса, кез келген жерге әріп қосып, ең аз санын табыңыз.$ct$,
      'solution',$cc5$bool vowel(char c) {
    return c == 'a' || c == 'e' || c == 'i' ||
           c == 'o' || c == 'u' || c == 'y';
}

int main() {
    string s;
    cin >> s;
    int vowels = 0, consonants = 0, answer = 0;

    for (char c : s) {
        if (vowel(c)) {
            ++vowels;
            consonants = 0;
        } else {
            ++consonants;
            vowels = 0;
        }
        if (vowels == 3) {
            ++answer;
            vowels = 1;
        }
        if (consonants == 3) {
            ++answer;
            consonants = 1;
        }
    }
    cout << answer;
}$cc5$,
      'hints',jsonb_build_array($ct$Үшінші бірдей типтегі әріп келгенде, арасына қарсы типтегі бір әріп қосыңыз.$ct$),
      'tests',jsonb_build_array()
    ),
    jsonb_build_object(
      'type','task','pageType','interactive','templateId','short-answer',
      'title',$ct$IP-адрес$ct$,
      'prompt',$ct$Нүктемен бөлінген төрт бүтін саннан тұратын жолдың дұрыс IP-адрес екенін тексеріңіз. Әр бөлік 0 мен 255 аралығында болуы керек. Дұрыс болса Good, әйтпесе Bad шығарыңыз.$ct$,
      'solution',$cc6$#include <bits/stdc++.h>
using namespace std;

int main() {
    string s;
    cin >> s;
    string part;
    stringstream input(s);
    bool good = true;
    int parts = 0;

    while (getline(input, part, '.')) {
        ++parts;
        if (part.empty() || part.size() > 3) {
            good = false;
            continue;
        }
        int value = 0;
        for (char c : part) {
            if (c < '0' || c > '9') good = false;
            value = value * 10 + (c - '0');
        }
        if (value > 255) good = false;
    }

    if (parts != 4) good = false;
    cout << (good ? "Good" : "Bad");
}$cc6$,
      'hints',jsonb_build_array(
        $ct$Алдымен нүкте бойынша төрт бөлікке бөліңіз.$ct$,
        $ct$Әр бөліктің бос еместігін, ұзындығын және 255-тен аспайтынын тексеріңіз.$ct$
      ),
      'tests',jsonb_build_array()
    ),
    jsonb_build_object(
      'type','quiz','pageType','interactive','templateId','single-choice',
      'title',$ct$Өзіңді тексер$ct$,
      'prompt',$ct$'7' символын бүтін 7 санына айналдыратын өрнек қайсы?$ct$,
      'options',jsonb_build_array($ct$'7' - '0'$ct$,$ct$int('7')$ct$,$ct$'7' + 0$ct$,$ct$char(7)$ct$),
      'answer',0,'points',1
    )
  );

  v_terms := jsonb_build_array(
    jsonb_build_object('term',$ct$ASCII$ct$,'definition',$ct$Әр символға сәйкес келетін сандық кодтар кестесі.$ct$),
    jsonb_build_object('term',$ct$char$ct$,'definition',$ct$Бір символды сақтайтын C++ дерек типі.$ct$),
    jsonb_build_object('term',$ct$кодты түрлендіру$ct$,'definition',$ct$Символды int арқылы кодқа, ал кодты char арқылы символға айналдыру.$ct$),
    jsonb_build_object('term',$ct$IP-адрес$ct$,'definition',$ct$Нүктемен бөлінген, 0..255 аралығындағы төрт сан.$ct$)
  );

  select l.id into v_lesson
  from public.cf_lessons l
  where l.owner_id = v_owner and l.title = 'Символьный тип (char)'
  limit 1;

  if v_lesson is null then
    insert into public.cf_lessons (school_id, owner_id, title, subject, plan, slides, terms)
    values (v_school, v_owner, 'Символьный тип (char)', 'Информатика олимпиадасы', v_plan, v_slides, v_terms)
    returning id into v_lesson;
  else
    update public.cf_lessons
    set subject = 'Информатика олимпиадасы', plan = v_plan, slides = v_slides, terms = v_terms, updated_at = now()
    where id = v_lesson;
  end if;

  insert into public.cf_curr_lessons (lesson_id, module_id, position)
  values (v_lesson, v_strings, 0)
  on conflict (lesson_id) do update set module_id = excluded.module_id, position = excluded.position;
end;
$block_char_lecture$;
