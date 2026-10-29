-- ACMP есептерін бір толық оқу бетіне жинау.
-- Көрінетін бөлімдер: берілуі, түсіндіру/сурет, алгоритм/сурет,
-- деректер құрылымы және псевдокод. Шешім solution өрісінде сақталады:
-- ол оқушыға көрсетілмейді, ал мұғалім/редактор үшін қолжетімді.

do $acmp_problem_pages$
declare
  v_course uuid;
  v_owner uuid;
  v_char_lesson uuid;
  v_algebra_lesson uuid;
  v_loop_lesson uuid;
  v_binary_lesson uuid;
  v_specs jsonb;
  v_spec jsonb;
  v_slides jsonb;
  v_analysis jsonb;
  v_code jsonb;
  v_page jsonb;
  v_solution text;
  v_old_slides jsonb;
  v_char_pages jsonb := '[]'::jsonb;
  v_algebra_pages jsonb := '[]'::jsonb;
  v_loop_pages jsonb := '[]'::jsonb;
  v_binary_pages jsonb := '[]'::jsonb;
  v_target_lesson uuid;
begin
  select c.id, c.owner_id
    into v_course, v_owner
  from public.cf_curr_courses c
  where c.id = 'dbe60970-1fa6-4a8a-a65e-051d20cfd278'
    and c.title = 'ACMP: Язык программирования C++';

  if v_course is null then
    raise exception 'ACMP курсы табылмады';
  end if;

  select l.id into v_char_lesson from public.cf_lessons l
    where l.owner_id = v_owner and l.title = 'Символьный тип (char)' limit 1;
  select l.id into v_algebra_lesson from public.cf_lessons l
    where l.owner_id = v_owner and l.title = 'Алгебра и геометрия' limit 1;
  select l.id into v_loop_lesson from public.cf_lessons l
    where l.owner_id = v_owner and l.title = 'Цикл с постусловием (do ... while)' limit 1;
  select l.id into v_binary_lesson from public.cf_lessons l
    where l.owner_id = v_owner and l.title = 'Бинарный поиск' limit 1;

  if v_char_lesson is null or v_algebra_lesson is null or v_loop_lesson is null or v_binary_lesson is null then
    raise exception 'ACMP дәрістерінің бірі табылмады';
  end if;

  v_specs := jsonb_build_array(
    jsonb_build_object(
      'l','algebra','t','ACMP №529 — Длина отрезка',
      'a','ACMP №529 — Длина отрезка · талдау','c','ACMP №529 — C++ шешімі',
      'statement',$s529$Екі нүктенің координаталары (x1, y1) және (x2, y2) берілген. Осы нүктелерді қосатын кесіндінің ұзындығын табыңыз.$s529$,
      'explanation',$e529$Кесінді ұзындығы — катеттері координаталар айырмалары болатын тікбұрышты үшбұрыштың гипотенузасы. dx = x2 − x1 және dy = y2 − y1 табамыз.$e529$,
      'explanationDiagram',$d529$A(x1,y1) ── dx ──┐
                         │ dy
                         └──── B(x2,y2)
                 d = √(dx² + dy²)$d529$,
      'algorithm',$al529$Координаталарды оқу → dx, dy табу → sqrt(dx² + dy²) есептеу → жауапты шығару.$al529$,
      'algorithmDiagram',$ad529$[x1,y1,x2,y2] → [dx,dy] → [√(dx²+dy²)] → [d]$ad529$,
      'dataStructures','double: dx, dy, distance; массив қажет емес.',
      'pseudocode',$p529$оқу x1, y1, x2, y2
dx ← x2 − x1
dy ← y2 − y1
d ← sqrt(dx·dx + dy·dy)
шығару d$p529$
    ),
    jsonb_build_object(
      'l','algebra','t','ACMP №411 — Квадратное уравнение',
      'a','ACMP №411 — Квадратное уравнение · талдау','c','ACMP №411 — C++ шешімі',
      'statement',$s411$ax² + bx + c = 0 квадрат теңдеуі берілген. Нақты түбірлердің санын анықтап, түбірлерді 10⁻⁴ қателікпен шығарыңыз. a = 0 болса, теңдеу сызықтық болады.$s411$,
      'explanation',$e411$Дискриминант D = b² − 4ac. D < 0 — түбір жоқ, D = 0 — бір түбір, D > 0 — екі түбір. a = 0 кезінде bx + c = 0 теңдеуін шешеміз.$e411$,
      'explanationDiagram',$d411$D < 0 → 0 түбір
D = 0 → x = −b/(2a)
D > 0 → x1, x2 = (−b ± √D)/(2a)$d411$,
      'algorithm',$al411$a нөлге тең бе екенін тексеру. Квадрат жағдайында D табу және D белгісіне қарай 0, 1 немесе 2 түбір шығару.$al411$,
      'algorithmDiagram',$ad411$[a,b,c] → [a=0?] → [сызықтық/квадрат] → [D] → [түбір саны]$ad411$,
      'dataStructures','double: a, b, c, D, x1, x2; тұрақты жады.',
      'pseudocode',$p411$оқу a, b, c
егер a = 0 болса, bx + c = 0 шешу
әйтпесе:
  D ← b² − 4ac
  D < 0 болса 0 шығару
  D = 0 болса бір түбір шығару
  D > 0 болса екі түбір шығару$p411$
    ),
    jsonb_build_object(
      'l','algebra','t','ACMP №26 — Две окружности',
      'a','ACMP №26 — Две окружности · талдау','c','ACMP №26 — C++ шешімі',
      'statement',$s26$Екі шеңбердің центрлері мен радиустары берілген. Олардың кемінде бір ортақ нүктесі бар ма, соны анықтаңыз.$s26$,
      'explanation',$e26$Центрлер арасындағы d қашықтықты табамыз. Ортақ нүкте болуы үшін |r1−r2| ≤ d ≤ r1+r2 шарты орындалуы керек.$e26$,
      'explanationDiagram',$d26$C1 ───── d ───── C2
      ○ r1        r2 ○
|r1−r2| ≤ d ≤ r1+r2$d26$,
      'algorithm',$al26$dx және dy айырмаларын, d² мәнін есептеу. d-ні түбірсіз тексеру үшін шекаралардың квадраттарымен салыстыру.$al26$,
      'algorithmDiagram',$ad26$[C1,C2,r1,r2] → [d²] → [екі шарт] → [YES/NO]$ad26$,
      'dataStructures','long long: координаталар, радиустар және квадраттар; sqrt міндетті емес.',
      'pseudocode',$p26$оқу x1,y1,r1,x2,y2,r2
d2 ← (x2−x1)² + (y2−y1)²
егер (r1−r2)² ≤ d2 ≤ (r1+r2)² болса YES
әйтпесе NO$p26$
    ),

    jsonb_build_object(
      'l','loop','t','ACMP №1132 — Длина последовательности',
      'a','ACMP №1132 — Длина последовательности · талдау','c','ACMP №1132 — C++ шешімі',
      'statement',$s1132$Теріс емес бүтін сандар тізбегі бірінші 0 саны кездескенде аяқталады. 0-ді қоспай, тізбектің ұзындығын табыңыз.$s1132$,
      'explanation',$e1132$Нөл — тоқтау белгісі. Нөл емес әр сан үшін санауышты арттырамыз. Бірінші сан да міндетті түрде тексерілетіндіктен do ... while ыңғайлы.$e1132$,
      'explanationDiagram',$d1132$1 → 7 → 9 → 0
│    │    │    └─ тоқтау
└────┴────┴───── length = 3$d1132$,
      'algorithm',$al1132$length = 0 орнату → сан оқу → нөл емес болса length++ → нөлге дейін қайталау.$al1132$,
      'algorithmDiagram',$ad1132$[x оқу] → [x=0?] ─ иә → [length]
                  └ жоқ → [length++] → қайта оқу$ad1132$,
      'dataStructures','int: x және length; тізімді массивте сақтау қажет емес.',
      'pseudocode',$p1132$length ← 0
do:
  оқу x
  егер x ≠ 0 болса length ← length + 1
while x ≠ 0
шығару length$p1132$
    ),
    jsonb_build_object(
      'l','loop','t','ACMP №1133 — Сумма последовательности',
      'a','ACMP №1133 — Сумма последовательности · талдау','c','ACMP №1133 — C++ шешімі',
      'statement',$s1133$Бірінші 0 санына дейінгі теріс емес бүтін сандардың қосындысын табыңыз. 0 қосындыға кірмейді.$s1133$,
      'explanation',$e1133$Ұзындық есебіндегідей, нөл — sentinel. Айырмашылығы: әр нөл емес санды sum айнымалысына қосамыз.$e1133$,
      'explanationDiagram',$d1133$1 + 7 + 9 + 0 = 17
└────── нөл есепке қосылмайды$d1133$,
      'algorithm',$al1133$sum = 0 орнату → сан оқу → нөл емес санды sum-ға қосу → нөлге дейін қайталау.$al1133$,
      'algorithmDiagram',$ad1133$[sum=0] → [x оқу] → [x=0?]
                  └ жоқ → [sum += x] → қайта оқу$ad1133$,
      'dataStructures','long long: sum және int: x; массив қажет емес.',
      'pseudocode',$p1133$sum ← 0
do:
  оқу x
  егер x ≠ 0 болса sum ← sum + x
while x ≠ 0
шығару sum$p1133$
    ),
    jsonb_build_object(
      'l','loop','t','ACMP №1136 — Максимум последовательности',
      'a','ACMP №1136 — Максимум последовательности · талдау','c','ACMP №1136 — C++ шешімі',
      'statement',$s1136$Теріс емес бүтін сандар тізбегінің бірінші 0-ге дейінгі бөлігіндегі ең үлкен элементті табыңыз.$s1136$,
      'explanation',$e1136$Әр санды оқығанда оны қазіргі максимуммен салыстырамыз. Нөлді өңдемейміз және ол кездескенде циклді тоқтатамыз.$e1136$,
      'explanationDiagram',$d1136$1 → 7 → 9 → 0
max: 1 → 7 → 9 → тоқтау$d1136$,
      'algorithm',$al1136$Бірінші элементті max деп алу → келесі сандарды оқу → үлкен болса max-ты жаңарту → нөлде тоқтау.$al1136$,
      'algorithmDiagram',$ad1136$[x оқу] → [x=0?] ─ иә → [max]
              └ жоқ → [max=max(max,x)] → қайта оқу$ad1136$,
      'dataStructures','int: x және max; барлық сандарды сақтау қажет емес.',
      'pseudocode',$p1136$оқу x
max ← x
while x ≠ 0:
  оқу x
  егер x > max болса max ← x
шығару max$p1136$
    ),

    jsonb_build_object(
      'l','char','t','ACMP №1146 — Цифра',
      'a','ACMP №1146 — Цифра · талдау','c','ACMP №1146 — C++ шешімі',
      'statement',$s1146$Бір символ берілген. Оның цифр екенін анықтаңыз: цифр болса Yes, әйтпесе No.$s1146$,
      'explanation',$e1146$ASCII кестесінде '0'...'9' цифрлары бір диапазонда орналасады. Символды осы екі шекарамен салыстыру жеткілікті.$e1146$,
      'explanationDiagram',$d1146$          c
          │
     '0' ≤ c ≤ '9'?
       ↙       ↘
     Yes       No$d1146$,
      'algorithm',$al1146$Символды оқу және оның '0' мен '9' аралығында жатқанын тексеру.$al1146$,
      'algorithmDiagram',$ad1146$[char c] → [0 ≤ c−'0' ≤ 9] → [Yes/No]$ad1146$,
      'dataStructures','char: бір символ; қосымша құрылым жоқ.',
      'pseudocode',$p1146$оқу c
егер '0' ≤ c ≤ '9' болса Yes
әйтпесе No$p1146$
    ),
    jsonb_build_object(
      'l','char','t','ACMP №1147 — Верхний регистр',
      'a','ACMP №1147 — Верхний регистр · талдау','c','ACMP №1147 — C++ шешімі',
      'statement',$s1147$Бір символ берілген. Кіші ағылшын әрпі болса, оны бас әріпке айналдырыңыз. Басқа символ өзгермейді.$s1147$,
      'explanation',$e1147$Кіші латын әріптері 'a'...'z' диапазонында. ASCII-де бас және кіші әріптердің айырмасы 32, сондықтан c - 'a' + 'A' формуласы қолданылады.$e1147$,
      'explanationDiagram',$d1147$'a' ... 'z' ── −32 ──> 'A' ... 'Z'
басқа символ ───────────> өзгермейді$d1147$,
      'algorithm',$al1147$Кіші әріп екенін тексеру. Иә болса ASCII айырмасы арқылы бас әріпке ауыстыру, жоқ болса бастапқы символды шығару.$al1147$,
      'algorithmDiagram',$ad1147$[c] → [a≤c≤z?] ─ иә → [c−32] → [шығару]
                         └ жоқ ─────────────→ [шығару]$ad1147$,
      'dataStructures','char: бір символ.',
      'pseudocode',$p1147$оқу c
егер 'a' ≤ c ≤ 'z' болса c ← c − 32
шығару c$p1147$
    ),
    jsonb_build_object(
      'l','char','t','ACMP №1148 — Смена регистра',
      'a','ACMP №1148 — Смена регистра · талдау','c','ACMP №1148 — C++ шешімі',
      'statement',$s1148$Бір символ берілген. Ағылшын әрпі болса, регистрін ауыстырыңыз. Басқа символ өзгермейді.$s1148$,
      'explanation',$e1148$Бас әріп диапазоны 'A'...'Z', кіші әріп диапазоны 'a'...'z'. Екі диапазонда айырма 32: бас әріпке +32, кіші әріпке −32.$e1148$,
      'explanationDiagram',$d1148$'A'...'Z' ── +32 ──> 'a'...'z'
'a'...'z' ── −32 ──> 'A'...'Z'$d1148$,
      'algorithm',$al1148$Алдымен бас әріп диапазонын, кейін кіші әріп диапазонын тексеру. Екі шарт та орындалмаса, c өзгермейді.$al1148$,
      'algorithmDiagram',$ad1148$[c] → [A..Z?] → +32
       └────→ [a..z?] → −32
       └────→ [өзгеріссіз]$ad1148$,
      'dataStructures','char: бір символ.',
      'pseudocode',$p1148$оқу c
егер 'A' ≤ c ≤ 'Z' болса c ← c + 32
әйтпесе егер 'a' ≤ c ≤ 'z' болса c ← c − 32
шығару c$p1148$
    ),
    jsonb_build_object(
      'l','char','t','Пароль — тексеру',
      'a','Пароль — тексеру · талдау','c','Пароль — түзетілген C++ шешімі',
      'statement',$spass$N ұзындықтағы пароль және ең аз A бас әріп, B кіші әріп, C цифр талаптары берілген. Пароль ұзындығы мен талаптардың орындалуын тексеріңіз.$spass$,
      'explanation',$epass$unsigned айнымалыны нөлден кейін азайту қауіпті: ол өте үлкен санға айналады. Санақтарды нөлден бастап int арқылы жүргізіп, соңында ұзындықты және үш санақты салыстырамыз. Қатар тұрған бірдей символдарға да жеке шарт керек.$epass$,
      'explanationDiagram',$dpass$[password] → [N ұзындығы?] → [upper/lower/digit санау]
                                      → [барлық талап орындалды ма?]$dpass$,
      'algorithm',$alpass$Парольді бір рет қарап шығу: әр символдың түрін анықтап, санауышты өсіру. Ұзындық дұрыс және барлық минимум орындалса — correct, әйтпесе incorrect.$alpass$,
      'algorithmDiagram',$adpass$[оқу] → [ұзындық] → [әр char] → [санақ] → [AND шарт] → [нәтиже]$adpass$,
      'dataStructures','string password; int upper, lower, digits; char previous.',
      'pseudocode',$ppass$оқу N, A, B, C және password
егер length(password) ≠ N болса incorrect
әр c үшін upper/lower/digits санағын арттыру
қатар тұрған бірдей символ болса incorrect
егер upper ≥ A және lower ≥ B және digits ≥ C болса correct
әйтпесе incorrect$ppass$
    ),
    jsonb_build_object(
      'l','char','t','ACMP №1198 — Генератор паролей',
      'a','ACMP №1198 — Генератор паролей · талдау','c','ACMP №1198 — C++ шешімі',
      'old','Пароль генераторы',
      'statement',$s1198$Ұзындығы N пароль құрыңыз. Кемінде A бас әріп, B кіші әріп, C цифр болсын және қатар тұрған екі символ бірдей болмасын.$s1198$,
      'explanation',$e1198$Алдымен міндетті үш санатты орналастырып, минимумдарды жабамыз. Қалған орындарды әртүрлі таңбалар пулынан толтырамыз. Жаңа таңба алдыңғысымен бірдей болса, келесісін таңдаймыз.$e1198$,
      'explanationDiagram',$d1198$N орын: [Upper] [Lower] [Digit] [қалғаны...]
        міндетті бөліктер → қауіпсіз толтыру$d1198$,
      'algorithm',$al1198$A, B, C талаптарын орындап, қажетті таңбаларды қосу. Қалған позицияларды кезекпен толтыру және ұзындық N болғанша жалғастыру.$al1198$,
      'algorithmDiagram',$ad1198$[N,A,B,C] → [үш міндетті топ] → [қалған орындар] → [пароль]$ad1198$,
      'dataStructures','string answer; үш string pool; индекстер және int need.',
      'pseudocode',$p1198$оқу N, A, B, C
answer ← міндетті upper + lower + digit таңбалары
әзір answer ұзындығы N-ге жетпесе:
  алдыңғыға тең емес келесі таңбаны қосу
шығару answer$p1198$
    ),
    jsonb_build_object(
      'l','char','t','ACMP №1153 — Благозвучное слово',
      'a','ACMP №1153 — Благозвучное слово · талдау','c','ACMP №1153 — C++ шешімі',
      'old','Благозвучное слово',
      'statement',$s1153$Сөзде үш дауыссыз немесе үш дауысты қатар келмеуі керек. Кез келген жерге әріп қоса отырып, ең аз әріп санын табыңыз.$s1153$,
      'explanation',$e1153$Сөзді солдан оңға қарай оқып, бір типті әріптердің қатар санын сақтаймыз. Үшінші бірдей тип келгенде бір қарсы типті әріпті енгізуге болады: жауап өседі, қатар саны 1-ге түседі.$e1153$,
      'explanationDiagram',$d1153$aaa → aa|a
sch → sc|h$d1153$,
      'algorithm',$al1153$Әр символдың дауысты/дауыссыз екенін анықтау, run санағын өсіру және run=3 кезінде insertion санын арттыру.$al1153$,
      'algorithmDiagram',$ad1153$[char] → [vowel/consonant] → [run=3?] → [insert++] → [run=1]$ad1153$,
      'dataStructures','string s; bool vowel(char); int run және answer.',
      'pseudocode',$p1153$answer ← 0, run ← 0
әр c үшін:
  type ← дауысты не дауыссыз
  type өзгерсе run ← 1, әйтпесе run++
  егер run = 3 болса answer++, run ← 1
шығару answer$p1153$
    ),
    jsonb_build_object(
      'l','char','t','ACMP №1154 — IP-адрес',
      'a','ACMP №1154 — IP-адрес · талдау','c','ACMP №1154 — C++ шешімі',
      'old','IP-адрес',
      'statement',$s1154$Дұрыс IPv4 адресінде нүктемен бөлінген дәл төрт бөлік болады. Әр бөлік бос емес, тек цифрлардан тұрады және 0 мен 255 аралығында жатады.$s1154$,
      'explanation',$e1154$Жолды нүкте бойынша бөлеміз. Әр бөліктің бос еместігін, ұзындығын, цифрлардан тұратынын және сандық мәнін тексереміз.$e1154$,
      'explanationDiagram',$d1154$192 . 168 . 5 . 12
└────┴────┴────┴────
  әр бөлік: 0..255$d1154$,
      'algorithm',$al1154$Бөліктерді санау, әр бөлікті тексеру және барлық шарт орындалса Good, әйтпесе Bad шығару.$al1154$,
      'algorithmDiagram',$ad1154$[string] → [split '.'] → [4 бөлік?] → [0..255?] → [Good/Bad]$ad1154$,
      'dataStructures','string s, stringstream, string part; int value, parts; bool good.',
      'pseudocode',$p1154$оқу s
parts ← s-ті '.' бойынша бөлу
егер parts саны ≠ 4 болса Bad
әр part үшін бос/ұзын/цифр емес/255-тен үлкен болса Bad
барлығы дұрыс болса Good$p1154$
    ),

    jsonb_build_object(
      'l','binary','t','ACMP №1465 — Угадай число',
      'a','ACMP №1465 — Угадай число · талдау','c','ACMP №1465 — C++ шешімі',
      'statement',$s1465$Жасырылған N саны 1 мен 10⁹ аралығында. X санын сұрағанда <, > немесе = жауабы беріледі. N санын 100 сұрақтан асырмай табыңыз.$s1465$,
      'explanation',$e1465$Әр жауап іздеу аралығының жартысын алып тастауға мүмкіндік береді. mid сұраймыз: < болса оң шекара, > болса сол шекара жылжиды, = болса жауап табылды.$e1465$,
      'explanationDiagram',$d1465$[1 ───────── 10⁹]
          mid
   <: [left..mid−1]   >: [mid+1..right]$d1465$,
      'algorithm',$al1465$left=1, right=10⁹. Аралық босамағанша ортасын сұрау. Интерактивті есепте әр X-тен кейін endl немесе flush қажет.$al1465$,
      'algorithmDiagram',$ad1465$[L,R] → [mid] → [<,>,=] → [жартысын қалдыру] → [қайталау]$ad1465$,
      'dataStructures','long long left, right, mid; массив қажет емес.',
      'pseudocode',$p1465$left ← 1, right ← 10⁹
while left ≤ right:
  mid ← (left + right) / 2
  шығару mid және flush
  reply оқу
  '=' болса тоқтау
  '<' болса right ← mid − 1
  '>' болса left ← mid + 1$p1465$
    ),
    jsonb_build_object(
      'l','binary','t','ACMP №267 — Ксерокопии',
      'a','ACMP №267 — Ксерокопии · талдау','c','ACMP №267 — C++ шешімі',
      'statement',$s267$N көшірме керек. Бір ксерокс бір көшірмені x секундта, екіншісі y секундта жасайды. Екеуін қатар қолдануға болады. Ең аз уақытты табыңыз.$s267$,
      'explanation',$e267$Алғашқы көшірме түпнұсқадан жасалады және first=min(x,y) уақыт алады. Одан кейін t уақытында жасалатын көшірме саны 1 + (t−first)/x + (t−first)/y.$e267$,
      'explanationDiagram',$d267$түпнұсқа → [жылдам ксерокс] → көшірме
                 ↘ [екінші ксерокс] → көшірме$d267$,
      'algorithm',$al267$feasible(t) функциясы t уақытта N көшірме жасала ма екенін тексереді. t бойынша бинарлық іздеу ең кіші жеткілікті уақытты береді.$al267$,
      'algorithmDiagram',$ad267$[1..upper уақыт] → [mid] → [capacity ≥ N?] → [сол/оң жарты]$ad267$,
      'dataStructures','long long: N, x, y, left, right, mid; capacity үшін __int128.',
      'pseudocode',$p267$first ← min(x,y)
left ← first, right ← first + (N−1)·max(x,y)
while left < right:
  mid ← (left + right) / 2
  copies ← 1 + (mid−first)/x + (mid−first)/y
  copies ≥ N болса right ← mid, әйтпесе left ← mid+1
шығару left$p267$
    ),
    jsonb_build_object(
      'l','binary','t','Дипломы',
      'a','Дипломы — талдау','c','Дипломы — C++ шешімі',
      'statement',$sdip$w × h өлшемді n дипломды орналастыруға арналған қабырғасы ең кіші квадрат тақтаның өлшемін табыңыз.$sdip$,
      'explanation',$edip$Қабырға s болса, бір қатарға floor(s/w), бір бағанға floor(s/h) диплом сыяды. Көбейтінді n-нен кем емес болса, s жарамды.$edip$,
      'explanationDiagram',$ddip$s × s квадрат
┌────┬────┬────┐  floor(s/w)
│w×h │w×h │... │
├────┼────┼────┤  floor(s/h)$ddip$,
      'algorithm',$aldip$capacity(s)=floor(s/w)·floor(s/h) функциясын тексеріп, 1 мен max(w,h)·n аралығында бинарлық іздеу орындау.$aldip$,
      'algorithmDiagram',$addip$[s] → [rows·cols] → [≥n?] → [ең кіші s]$addip$,
      'dataStructures','long long: w, h, n және шекаралар; көбейтінді үшін __int128.',
      'pseudocode',$pdip$left ← 1, right ← max(w,h)·n
while left < right:
  mid ← (left + right) / 2
  capacity ← floor(mid/w)·floor(mid/h)
  capacity ≥ n болса right ← mid, әйтпесе left ← mid+1
шығару left$pdip$
    ),
    jsonb_build_object(
      'l','binary','t','ACMP №1131 — Корень кубического уравнения',
      'a','ACMP №1131 — Корень кубического уравнения · талдау','c','ACMP №1131 — C++ шешімі',
      'statement',$s1131$ax³ + bx² + cx + d = 0 куб теңдеуі берілген (a ≠ 0). Оның дәл бір нақты түбірі бар. Түбірді кемінде үш ондық таңбамен табыңыз.$s1131$,
      'explanation',$e1131$Түбірді формуламен емес, функция таңбасын пайдаланып іздейміз. Бір нақты түбір болғандықтан, жеткілікті үлкен аралықта f(L) және f(R) таңбалары қарама-қарсы болады.$e1131$,
      'explanationDiagram',$d1131$L ├──────── root ────────┤ R
  f(L) < 0              f(R) > 0
                 M$d1131$,
      'algorithm',$al1131$[-2000,2000] аралығында 100 рет бинарлық іздеу жасау. f(left) және f(mid) таңбалары бірдей болса left=mid, әйтпесе right=mid.$al1131$,
      'algorithmDiagram',$ad1131$[L,R] → [M] → [f(M)] → [L=M немесе R=M] → 100 рет$ad1131$,
      'dataStructures','long double: коэффициенттер, шекаралар және функция мәні.',
      'pseudocode',$p1131$оқу a,b,c,d
left ← −2000, right ← 2000
100 рет:
  mid ← (left+right)/2
  sign(f(left)) = sign(f(mid)) болса left ← mid
  әйтпесе right ← mid
шығару (left+right)/2$p1131$
    )
  );

  for v_spec in select value from jsonb_array_elements(v_specs) as e(value) loop
    v_target_lesson := case v_spec->>'l'
      when 'char' then v_char_lesson
      when 'algebra' then v_algebra_lesson
      when 'loop' then v_loop_lesson
      when 'binary' then v_binary_lesson
      else null
    end;

    select l.slides into v_slides from public.cf_lessons l where l.id = v_target_lesson;

    select e.item into v_page
    from jsonb_array_elements(coalesce(v_slides, '[]'::jsonb)) as e(item)
    where e.item->>'title' = v_spec->>'t'
      and e.item->>'problemPage' = 'true'
    limit 1;

    if v_page is null then
      select e.item into v_analysis
      from jsonb_array_elements(coalesce(v_slides, '[]'::jsonb)) as e(item)
      where e.item->>'title' = v_spec->>'a' limit 1;
      select e.item into v_code
      from jsonb_array_elements(coalesce(v_slides, '[]'::jsonb)) as e(item)
      where e.item->>'title' = v_spec->>'c' limit 1;

      if v_analysis is null or v_code is null then
        raise exception 'Есептің бастапқы слайдтары табылмады: %', v_spec->>'t';
      end if;

      v_solution := coalesce(v_code->>'starter', v_code->>'solution', '');
      v_page := jsonb_build_object(
        'type','task','pageType','interactive','templateId','short-answer',
        'problemPage',true,'answerHidden',true,'title',v_spec->>'t',
        'prompt',concat(
          'Есептің берілуі', chr(10), v_spec->>'statement', chr(10), chr(10),
          'Есептің түсіндірілуі', chr(10), v_spec->>'explanation', chr(10),
          'Сурет:', chr(10), v_spec->>'explanationDiagram', chr(10), chr(10),
          'Есептің алгоритмі', chr(10), v_spec->>'algorithm', chr(10),
          'Сурет:', chr(10), v_spec->>'algorithmDiagram', chr(10), chr(10),
          'Деректер құрылымы', chr(10), v_spec->>'dataStructures', chr(10), chr(10),
          'Псевдокод', chr(10), v_spec->>'pseudocode'
        ),
        'statement',v_spec->>'statement','explanation',v_spec->>'explanation',
        'explanationDiagram',v_spec->>'explanationDiagram',
        'algorithm',v_spec->>'algorithm','algorithmDiagram',v_spec->>'algorithmDiagram',
        'dataStructures',v_spec->>'dataStructures','pseudocode',v_spec->>'pseudocode',
        'solution',v_solution,'hints',coalesce(v_code->'hints','[]'::jsonb),
        'tests',coalesce(v_code->'tests','[]'::jsonb),'points',5
      );
    end if;

    if v_spec->>'l' = 'char' then v_char_pages := v_char_pages || jsonb_build_array(v_page);
    elsif v_spec->>'l' = 'algebra' then v_algebra_pages := v_algebra_pages || jsonb_build_array(v_page);
    elsif v_spec->>'l' = 'loop' then v_loop_pages := v_loop_pages || jsonb_build_array(v_page);
    else v_binary_pages := v_binary_pages || jsonb_build_array(v_page);
    end if;
  end loop;

  select coalesce(jsonb_agg(x.item order by x.ord), '[]'::jsonb) into v_old_slides
  from public.cf_lessons l, jsonb_array_elements(coalesce(l.slides, '[]'::jsonb)) with ordinality as x(item, ord)
  where l.id = v_char_lesson
    and not exists (
      select 1
      from jsonb_array_elements(v_specs) as sp(value)
      where sp.value->>'l' = 'char'
        and coalesce(x.item->>'title','') in (sp.value->>'t',sp.value->>'a',sp.value->>'c',sp.value->>'old')
    );
  update public.cf_lessons set slides = v_old_slides || v_char_pages, updated_at = now() where id = v_char_lesson;

  select coalesce(jsonb_agg(x.item order by x.ord), '[]'::jsonb) into v_old_slides
  from public.cf_lessons l, jsonb_array_elements(coalesce(l.slides, '[]'::jsonb)) with ordinality as x(item, ord)
  where l.id = v_algebra_lesson
    and not exists (
      select 1 from jsonb_array_elements(v_specs) as sp(value)
      where sp.value->>'l' = 'algebra'
        and coalesce(x.item->>'title','') in (sp.value->>'t',sp.value->>'a',sp.value->>'c',sp.value->>'old')
    );
  update public.cf_lessons set slides = v_old_slides || v_algebra_pages, updated_at = now() where id = v_algebra_lesson;

  select coalesce(jsonb_agg(x.item order by x.ord), '[]'::jsonb) into v_old_slides
  from public.cf_lessons l, jsonb_array_elements(coalesce(l.slides, '[]'::jsonb)) with ordinality as x(item, ord)
  where l.id = v_loop_lesson
    and not exists (
      select 1 from jsonb_array_elements(v_specs) as sp(value)
      where sp.value->>'l' = 'loop'
        and coalesce(x.item->>'title','') in (sp.value->>'t',sp.value->>'a',sp.value->>'c',sp.value->>'old')
    );
  update public.cf_lessons set slides = v_old_slides || v_loop_pages, updated_at = now() where id = v_loop_lesson;

  select coalesce(jsonb_agg(x.item order by x.ord), '[]'::jsonb) into v_old_slides
  from public.cf_lessons l, jsonb_array_elements(coalesce(l.slides, '[]'::jsonb)) with ordinality as x(item, ord)
  where l.id = v_binary_lesson
    and not exists (
      select 1 from jsonb_array_elements(v_specs) as sp(value)
      where sp.value->>'l' = 'binary'
        and coalesce(x.item->>'title','') in (sp.value->>'t',sp.value->>'a',sp.value->>'c',sp.value->>'old')
    );
  update public.cf_lessons set slides = v_old_slides || v_binary_pages, updated_at = now() where id = v_binary_lesson;
end;
$acmp_problem_pages$;

