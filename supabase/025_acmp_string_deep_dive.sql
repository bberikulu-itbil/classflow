-- ACMP: «Строковый тип (string)» тақырыбын толық екітілді дәріс ретінде жаңарту.
-- Дәріс теорияны, алгоритм визуалдарын және PDF-тегі 9 ACMP есебін қамтиды.

do $acmp_string_deep_dive$
declare
  v_owner uuid;
  v_lesson uuid;
  v_slides jsonb;
begin
  select c.owner_id into v_owner
  from public.cf_curr_courses c
  where c.id = 'dbe60970-1fa6-4a8a-a65e-051d20cfd278'
    and c.title = 'ACMP: Язык программирования C++';

  if v_owner is null then
    raise exception 'ACMP курсы табылмады';
  end if;

  select l.id into v_lesson
  from public.cf_lessons l
  where l.owner_id = v_owner and l.title = 'Жол түрі (string)'
  limit 1;

  if v_lesson is null then
    raise exception '«Жол түрі (string)» дәрісі табылмады';
  end if;

  v_slides := jsonb_build_array(
    jsonb_build_object(
      'type','title','pageType','slide','templateId','title',
      'title',$kz$Жол түрі (string)$kz$,
      'subtitle',$kz$C++ тіліндегі мәтінмен жұмыс · теория, алгоритмдер және ACMP есептері$kz$,
      'img','lec/string-theory-overview.png',
      'alt',$kz$String — символдардан құралған жол$kz$,
      'ru',jsonb_build_object(
        'title',$ru$Строковый тип (string)$ru$,
        'subtitle',$ru$Работа с текстом в C++ · теория, алгоритмы и задачи ACMP$ru$,
        'img','lec/string-theory-overview.png',
        'alt',$ru$Строка как последовательность символов$ru$
      )
    ),
    jsonb_build_object(
      'type','content','pageType','scroll','templateId','theory',
      'title',$kz$1. String қалай сақталады?$kz$,
      'bullets',jsonb_build_array(
        $kz$string — char символдарының реттелген тізбегі. Ұзындығы n болса, индекстер 0-ден n-1-ге дейін болады.$kz$,
        $kz$s[0] — бірінші, s[n-1] — соңғы символ. Бос жолда индекс арқылы қатынауға болмайды.$kz$,
        $kz$s.size() және s.length() жолдағы символдар санын береді; s.empty() жолдың бос екенін тексереді.$kz$,
        $kz$cin >> s бос орынға дейін оқиды, getline(cin,s) бос орындары бар толық жолды оқиды.$kz$,
        $kz$Символдарды бір рет қарап шығу арқылы санау, іздеу, ауыстыру және тексеру есептерінің көбін шешуге болады.$kz$
      ),
      'img','lec/string-indexing.png',
      'alt',$kz$HELLO жолының 0..4 индекстері және size() мәні$kz$,
      'ru',jsonb_build_object(
        'title',$ru$1. Как хранится string?$ru$,
        'bullets',jsonb_build_array(
          $ru$string — упорядоченная последовательность символов char. При длине n индексы идут от 0 до n-1.$ru$,
          $ru$s[0] — первый, s[n-1] — последний символ. Для пустой строки обращаться по индексу нельзя.$ru$,
          $ru$s.size() и s.length() возвращают количество символов, s.empty() проверяет пустую строку.$ru$,
          $ru$cin >> s читает до пробела, getline(cin,s) читает всю строку вместе с пробелами.$ru$,
          $ru$Одним проходом по символам можно решать задачи на подсчёт, поиск, замену и проверку текста.$ru$
        ),
        'img','lec/string-indexing.png',
        'alt',$ru$Индексы строки HELLO от 0 до 4 и значение size()$ru$
      )
    ),
    jsonb_build_object(
      'type','content','pageType','scroll','templateId','theory',
      'title',$kz$2. Оқу, шығару және салыстыру$kz$,
      'bullets',jsonb_build_array(
        $kz$Бір сөзді оқу үшін cin >> s, ал толық жолды оқу үшін getline(cin,s) қолданылады. Саннан кейін getline болса, cin.ignore() керек.$kz$,
        $kz$Жолды қосу: s=a+b немесе s+=b. Символды өзгерту: s[i]='X'.$kz$,
        $kz$Жолдар лексикографиялық салыстырылады: бірінші айырмашылықтағы символдар, ал префикс бірдей болса қысқа жол салыстырылады.$kz$,
        $kz$«ABC» < «ABD», «cat» < «catalog». Салыстыру ASCII/алфавиттік ретті қолданады.$kz$
      ),
      'code',$code$#include <iostream>
#include <string>
using namespace std;

int main() {
    string word, line;
    cin >> word;
    cin.ignore();
    getline(cin, line);
    cout << word << " | " << line << '\n';
    cout << (word < line ? "word is smaller" : "word is not smaller");
}$code$,
      'lang','C++',
      'img','lec/string-methods-example.png',
      'alt',$kz$string енгізу және салыстыру мысалы$kz$,
      'ru',jsonb_build_object(
        'title',$ru$2. Ввод, вывод и сравнение$ru$,
        'bullets',jsonb_build_array(
          $ru$Одно слово читаем через cin >> s, всю строку — через getline(cin,s). После чтения числа перед getline нужен cin.ignore().$ru$,
          $ru$Склеивание: s=a+b или s+=b. Изменение символа: s[i]='X'.$ru$,
          $ru$Строки сравниваются лексикографически: сначала первый различающийся символ, а при общем префиксе сравнивается длина.$ru$,
          $ru$«ABC» < «ABD», «cat» < «catalog». Используется порядок кодов символов.$ru$
        ),
        'code',$code$#include <iostream>
#include <string>
using namespace std;

int main() {
    string word, line;
    cin >> word;
    cin.ignore();
    getline(cin, line);
    cout << word << " | " << line << '\n';
    cout << (word < line ? "word is smaller" : "word is not smaller");
}$code$,
        'lang','C++',
        'img','lec/string-methods-example.png',
        'alt',$ru$Пример чтения и сравнения строк$ru$
      )
    ),
    jsonb_build_object(
      'type','content','pageType','scroll','templateId','theory',
      'title',$kz$3. Негізгі string әдістері$kz$,
      'bullets',jsonb_build_array(
        $kz$s.size(), s.length() — ұзындық; s[i] — i-ші символ; s.empty() — бос жолды тексеру.$kz$,
        $kz$s.find(t) — t ішкі жолының бірінші индексі; табылмаса string::npos қайтарады.$kz$,
        $kz$s.substr(pos,len) — ішкі жол; s.insert(pos,t) — кірістіру; s.erase(pos,len) — өшіру.$kz$,
        $kz$reverse(s.begin(),s.end()) — жолды кері айналдырады; <algorithm> кітапханасын қосыңыз.$kz$,
        $kz$Санды жолға to_string(x), жолды санға stoi(s) немесе stoll(s) арқылы түрлендіруге болады.$kz$
      ),
      'img','lec/string-methods-table.png',
      'alt',$kz$string класының негізгі әдістері$kz$,
      'ru',jsonb_build_object(
        'title',$ru$3. Основные методы string$ru$,
        'bullets',jsonb_build_array(
          $ru$s.size(), s.length() — длина; s[i] — i-й символ; s.empty() — пустая строка.$ru$,
          $ru$s.find(t) — индекс первого вхождения t; если подстрока не найдена, возвращается string::npos.$ru$,
          $ru$s.substr(pos,len) — подстрока; s.insert(pos,t) — вставка; s.erase(pos,len) — удаление.$ru$,
          $ru$reverse(s.begin(),s.end()) разворачивает строку; подключается <algorithm>.$ru$,
          $ru$Число в строку: to_string(x), строку в число: stoi(s) или stoll(s).$ru$
        ),
        'img','lec/string-methods-table.png',
        'alt',$ru$Основные методы класса string$ru$
      )
    ),
    jsonb_build_object(
      'type','content','pageType','scroll','templateId','theory',
      'title',$kz$4. Жолды бір өтімде талдау$kz$,
      'bullets',jsonb_build_array(
        $kz$Кіріс форматын анықтаңыз: сөз бе, толық жол ма, әлде бірнеше жол ма?$kz$,
        $kz$Әр символға арналған шартты бөлек ойлаңыз: цифр, әріп, бос орын немесе арнайы белгі.$kz$,
        $kz$for (char c : s) циклі символдарды солдан оңға бір рет қарайды.$kz$,
        $kz$Жауапты count, sum, first, last немесе жаңа string айнымалысында жинаңыз.$kz$,
        $kz$Бос жолды, бірінші/соңғы символды және циклдік ауысуды жеке тексеріңіз.$kz$
      ),
      'img','lec/string-scan-flow.png',
      'alt',$kz$string бойынша солдан оңға өту алгоритмі$kz$,
      'ru',jsonb_build_object(
        'title',$ru$4. Просмотр строки за один проход$ru$,
        'bullets',jsonb_build_array(
          $ru$Сначала определите формат ввода: слово, полная строка или несколько строк.$ru$,
          $ru$Сформулируйте отдельное условие для символа: цифра, буква, пробел или специальный знак.$ru$,
          $ru$Цикл for (char c : s) просматривает символы слева направо ровно один раз.$ru$,
          $ru$Ответ накапливайте в count, sum, first, last или новой строке.$ru$,
          $ru$Отдельно проверьте пустую строку, первый/последний символ и циклический переход.$ru$
        ),
        'img','lec/string-scan-flow.png',
        'alt',$ru$Алгоритм просмотра строки слева направо$ru$
      )
    ),
    jsonb_build_object(
      'type','content','pageType','scroll','templateId','tasks',
      'title',$kz$5. ACMP есептер картасы$kz$,
      'bullets',jsonb_build_array(
        $kz$№66 «Пернетақта» — find және modulo арқылы циклдік қатардағы келесі символ.$kz$,
        $kz$№504 «Гүлдер» — string позицияларын бірнеше рет swap жасау.$kz$,
        $kz$№46 «E саны» — fixed және setprecision арқылы дәл формат.$kz$,
        $kz$№6 «Шахмат» — жол форматын және координаталарды тексеру.$kz$,
        $kz$№44 «Көрсеткілер» — substr арқылы ішкі жол санау.$kz$,
        $kz$№1200 «Ретін өзгерт» — getline, stringstream, vector және reverse.$kz$,
        $kz$№283 «Руналық сөздер» — бас әріптермен бөлінген сегменттерді тексеру.$kz$,
        $kz$№295 «Шифрлау» — 26 мүмкін ығысуды brute force тексеру.$kz$,
        $kz$№7 «АББА тайпасының алтыны» — өте үлкен сандарды string ретінде салыстыру.$kz$
      ),
      'img','lec/string-methods-example.png',
      'alt',$kz$string әдістерін қолдану мысалы$kz$,
      'ru',jsonb_build_object(
        'title',$ru$5. Карта задач ACMP$ru$,
        'bullets',jsonb_build_array(
          $ru$№66 «Клавиатура» — следующая буква в циклическом ряду через find и modulo.$ru$,
          $ru$№504 «Цветочки» — многократная перестановка позиций строки.$ru$,
          $ru$№46 «Число E» — точный формат через fixed и setprecision.$ru$,
          $ru$№6 «Шахматы» — проверка формата и координат строки.$ru$,
          $ru$№44 «Стрелки» — подсчёт подстрок через substr.$ru$,
          $ru$№1200 «Измени порядок» — getline, stringstream, vector и reverse.$ru$,
          $ru$№283 «Рунные слова» — проверка сегментов по заглавным буквам.$ru$,
          $ru$№295 «Шифровка» — перебор 26 возможных сдвигов.$ru$,
          $ru$№7 «Золото племени АББА» — сравнение огромных чисел как строк.$ru$
        ),
        'img','lec/string-methods-example.png',
        'alt',$ru$Пример применения методов string$ru$
      )
    ),

    jsonb_build_object(
      'type','solution','pageType','slide','templateId','solution','problemPage',true,
      'title',$kz$ACMP №66 · Пернетақта$kz$,
      'sections',jsonb_build_array(
        jsonb_build_object('h',$kz$Есептің берілуі / Условие задачи$kz$,'text',$p66$Қазақша:
Ағылшын әліпбиінің бір кіші әрпі берілген. Стандартты пернетақтада осы әріптің оң жағында тұрған әріпті шығарыңыз. Пернетақта циклдік: p-ден кейін a, l-ден кейін z, m-нен кейін q келеді.

Кіріс: бір кіші ағылшын әрпі.
Шығыс: оның оң жағындағы әріп.
Мысалдар: q→w, t→y, p→a, l→z, m→q.

Русский:
Для данной строчной буквы английского алфавита выведите букву справа на стандартной клавиатуре. Клавиатура замкнута: справа от p стоит a, от l — z, от m — q.

Ввод: одна строчная английская буква. Вывод: буква справа. Примеры: q→w, t→y, p→a, l→z, m→q.$p66$,'img','lec/string-acmp-66-keyboard.png','alt',$kz$ACMP №66 толық шарты$kz$),
        jsonb_build_object('h',$kz$Есептің түсіндірілуі / Объяснение$kz$,'text',$p66e$Пернетақта қатарын qwertyuiopasdfghjklzxcvbnm string-іне сақтаймыз. find берілген символдың индексін табады. Соңғы символдан кейін қайтадан біріншіге өту үшін (pos+1)%26 формуласын қолданамыз.

Запишем ряд клавиатуры в string qwertyuiopasdfghjklzxcvbnm. Метод find находит индекс. Формула (pos+1)%26 возвращает первый индекс после последнего.$p66e$),
        jsonb_build_object('h',$kz$Есептің алгоритмі / Алгоритм$kz$,'bullets',jsonb_build_array($kz$keyboard string-ін жасаңыз және c символын оқыңыз.$kz$,$kz$pos=keyboard.find(c) индексін табыңыз.$kz$,$kz$keyboard[(pos+1)%keyboard.size()] мәнін шығарыңыз.$kz$,$ru$Создать строку раскладки, найти pos, вывести символ по (pos+1)%size.$ru$)),
        jsonb_build_object('h',$kz$Деректер құрылымы / Структура данных$kz$,'text',$kz$string keyboard; char c; int pos.$kz$),
        jsonb_build_object('h',$kz$Псевдокод$kz$,'text',$p66p$keyboard ← "qwertyuiopasdfghjklzxcvbnm"
оқу c
pos ← keyboard.find(c)
шығару keyboard[(pos+1) mod keyboard.size()]$p66p$),
        jsonb_build_object('h',$kz$Есептің шешімі (жасырын) / Решение (скрыто)$kz$,'hide',true,'code',$p66c$#include <iostream>
#include <string>
using namespace std;

int main() {
    string keyboard = "qwertyuiopasdfghjklzxcvbnm";
    char c;
    cin >> c;
    int pos = keyboard.find(c);
    cout << keyboard[(pos + 1) % keyboard.size()];
}$p66c$,'lang','C++')
      )
    ),

    jsonb_build_object(
      'type','solution','pageType','slide','templateId','solution','problemPage',true,
      'title',$kz$ACMP №504 · Гүлдер$kz$,
      'sections',jsonb_build_array(
        jsonb_build_object('h',$kz$Есептің берілуі / Условие задачи$kz$,'text',$p504$Қазақша:
Терезеде солдан оңға қарай герань, крокус, фиалка тұр. Әр таңертең оң жақтағы гүл ортаңғы гүлмен орын ауыстырады. Әр кеш сайын сол жақтағы гүл ортаңғы гүлмен орын ауыстырады. K күннен кейінгі ретті табыңыз.

Кіріс: K натурал саны, K<1000.
Шығыс: G — герань, C — крокус, V — фиалка әріптерімен үш символ.
Мысалдар: K=1 → VGC, K=5 → CVG.

Русский:
На окне слева направо стоят герань, крокус и фиалка. Утром правый цветок меняется местами с центральным, вечером левый — с центральным. Найдите порядок через K дней.
Ввод: K<1000. Вывод: три буквы G,C,V. Примеры: K=1 → VGC, K=5 → CVG.$p504$,'img','lec/string-acmp-504-flowers.png','alt',$kz$ACMP №504 толық шарты$kz$),
        jsonb_build_object('h',$kz$Есептің түсіндірілуі / Объяснение$kz$,'text',$p504e$Бастапқы string — GCV. Бір күн: алдымен swap(s[1],s[2]), кейін swap(s[0],s[1]). Осы екі операцияны K рет модельдейміз.

Начальная строка GCV. За один день выполняются swap(s[1],s[2]), затем swap(s[0],s[1]). Повторяем эту пару операций K раз.$p504e$),
        jsonb_build_object('h',$kz$Есептің алгоритмі / Алгоритм$kz$,'bullets',jsonb_build_array($kz$s="GCV" деп бастаңыз; K рет екі swap жасаңыз.$kz$,$kz$Алдымен 1 және 2 индекстерін, содан кейін 0 және 1 индекстерін ауыстырыңыз.$kz$,$kz$Соңында s string-ін шығарыңыз.$kz$,$ru$Начать с GCV; K раз выполнить две перестановки; вывести s.$ru$)),
        jsonb_build_object('h',$kz$Деректер құрылымы / Структура данных$kz$,'text',$kz$string s; int K.$kz$),
        jsonb_build_object('h',$kz$Псевдокод$kz$,'text',$p504p$s ← "GCV"
оқу K
K рет:
  swap(s[1],s[2])
  swap(s[0],s[1])
шығару s$p504p$),
        jsonb_build_object('h',$kz$Есептің шешімі (жасырын) / Решение (скрыто)$kz$,'hide',true,'code',$p504c$#include <iostream>
#include <string>
using namespace std;

int main() {
    int k;
    cin >> k;
    string s = "GCV";
    while (k--) {
        swap(s[1], s[2]);
        swap(s[0], s[1]);
    }
    cout << s;
}$p504c$,'lang','C++')
      )
    ),

    jsonb_build_object(
      'type','solution','pageType','slide','templateId','solution','problemPage',true,
      'title',$kz$ACMP №46 · E саны$kz$,
      'sections',jsonb_build_array(
        jsonb_build_object('h',$kz$Есептің берілуі / Условие задачи$kz$,'text',$p46$Қазақша:
E санын n ондық таңбаға дейін дөңгелектеп, үтірден кейін дәл n цифрмен шығарыңыз. E=2.7182818284590452353602875 деп есептеледі.

Кіріс: 0≤n≤25 бүтін саны. Шығыс: E саны fixed форматында.
Мысалдар: 0→3, 25→2.7182818284590452353602875, 13→2.7182818284590.

Русский:
Выведите число E, округлённое до n знаков после десятичной точки, где E=2.7182818284590452353602875.
Ввод: 0≤n≤25. Вывод: ровно n знаков после точки. Примеры: 0→3, 25→2.7182818284590452353602875, 13→2.7182818284590.$p46$,'img','lec/string-acmp-46-e.png','alt',$kz$ACMP №46 толық шарты$kz$),
        jsonb_build_object('h',$kz$Есептің түсіндірілуі / Объяснение$kz$,'text',$p46e$Шартта E мәні дайын берілген, сондықтан формуламен есептеудің қажеті жоқ. fixed<<setprecision(n) үтірден кейін дәл n цифрды және дөңгелектеуді қамтамасыз етеді.

Значение E уже дано в условии. Манипулятор fixed<<setprecision(n) печатает ровно n знаков и выполняет округление.$p46e$),
        jsonb_build_object('h',$kz$Есептің алгоритмі / Алгоритм$kz$,'bullets',jsonb_build_array($kz$n оқыңыз.$kz$,$kz$E тұрақтысын алыңыз.$kz$,$kz$fixed және setprecision(n) қолданыңыз.$kz$,$kz$E мәнін шығарыңыз.$kz$,$ru$Прочитать n, включить fixed и setprecision(n), вывести константу E.$ru$)),
        jsonb_build_object('h',$kz$Деректер құрылымы / Структура данных$kz$,'text',$kz$int n; long double e.$kz$),
        jsonb_build_object('h',$kz$Псевдокод$kz$,'text',$p46p$оқу n
e ← 2.7182818284590452353602875
setprecision(n) қосу
шығару e$p46p$),
        jsonb_build_object('h',$kz$Есептің шешімі (жасырын) / Решение (скрыто)$kz$,'hide',true,'code',$p46c$#include <iomanip>
#include <iostream>
using namespace std;

int main() {
    int n;
    cin >> n;
    long double e = 2.7182818284590452353602875L;
    cout << fixed << setprecision(n) << e;
}$p46c$,'lang','C++')
      )
    ),

    jsonb_build_object(
      'type','solution','pageType','slide','templateId','solution','problemPage',true,
      'title',$kz$ACMP №6 · Шахмат$kz$,
      'sections',jsonb_build_array(
        jsonb_build_object('h',$kz$Есептің берілуі / Условие задачи$kz$,'text',$p6$Қазақша:
Аттың жүрісі C7-D5 сияқты жолмен беріледі. Жазбаны тексеріңіз.

Кіріс: бос емес, ұзындығы 5 символдан аспайтын жол.
Шығыс: координаталар қате болса ERROR; координаталар дұрыс, бірақ ат жүре алмаса NO; дұрыс жүріс болса YES.
Мысалдар: C7-D5→YES, E2-E4→NO, BSN→ERROR.

Русский:
Пользователь вводит ход конём, например C7-D5. Проверьте запись и возможность хода.
Ввод: непустая строка длиной не более 5. Вывод: ERROR при неверных координатах, NO при невозможном ходе, YES при правильном ходе. Примеры: C7-D5→YES, E2-E4→NO, BSN→ERROR.$p6$,'img','lec/string-acmp-6-chess.png','alt',$kz$ACMP №6 толық шарты$kz$),
        jsonb_build_object('h',$kz$Есептің түсіндірілуі / Объяснение$kz$,'text',$p6e$Алдымен length=5, s[2]='-', бағандар A..H және жолдар 1..8 екенін тексереміз. Содан кейін dx=abs(s[0]-s[3]), dy=abs(s[1]-s[4]); ат үшін айырмалар 1 және 2 болуы керек.

Сначала проверяем формат и диапазоны A..H, 1..8. Затем ход коня: разности координат равны 1 и 2 в любом порядке.$p6e$),
        jsonb_build_object('h',$kz$Есептің алгоритмі / Алгоритм$kz$,'bullets',jsonb_build_array($kz$Формат жарамсыз болса ERROR.$kz$,$kz$dx және dy мәндерін есептеңіз.$kz$,$kz$dx=1,dy=2 немесе dx=2,dy=1 болса YES, әйтпесе NO.$kz$,$ru$Сначала ERROR для неверного формата, затем проверка dx и dy, результат YES/NO.$ru$)),
        jsonb_build_object('h',$kz$Деректер құрылымы / Структура данных$kz$,'text',$kz$string s; int dx,dy; bool valid.$kz$),
        jsonb_build_object('h',$kz$Псевдокод$kz$,'text',$p6p$оқу s
егер формат немесе координаталар қате болса ERROR
бақылау: dx=abs(s[0]-s[3]), dy=abs(s[1]-s[4])
егер (dx,dy)=(1,2) немесе (2,1) болса YES, әйтпесе NO$p6p$),
        jsonb_build_object('h',$kz$Есептің шешімі (жасырын) / Решение (скрыто)$kz$,'hide',true,'code',$p6c$#include <cstdlib>
#include <iostream>
#include <string>
using namespace std;

int main() {
    string s;
    cin >> s;
    bool valid = s.size() == 5 && s[2] == '-'
        && s[0] >= 'A' && s[0] <= 'H'
        && s[3] >= 'A' && s[3] <= 'H'
        && s[1] >= '1' && s[1] <= '8'
        && s[4] >= '1' && s[4] <= '8';
    if (!valid) { cout << "ERROR"; return 0; }
    int dx = abs(s[0] - s[3]);
    int dy = abs(s[1] - s[4]);
    cout << (((dx == 1 && dy == 2) || (dx == 2 && dy == 1)) ? "YES" : "NO");
}$p6c$,'lang','C++')
      )
    ),

    jsonb_build_object(
      'type','solution','pageType','slide','templateId','solution','problemPage',true,
      'title',$kz$ACMP №44 · Көрсеткілер$kz$,
      'sections',jsonb_build_array(
        jsonb_build_object('h',$kz$Есептің берілуі / Условие задачи$kz$,'text',$p44$Қазақша:
>, < және - символдарынан тұратын жол берілген. >>>--> және <---<< түріндегі ішкі жолдар көрсеткі деп аталады. Көрсеткілер санын табыңыз.

Кіріс: бос орынсыз жол, ұзындығы 250-ден аспайды. Шығыс: көрсеткілер саны. Мысалдағы жауап — 4.

Русский:
Дана строка только из символов >, < и -. Стрелки — подстроки вида >>>--> и <---<<. Найдите их количество.
Ввод: строка длиной не более 250 без пробелов. Вывод: количество стрелок. Ответ для примера — 4.$p44$,'img','lec/string-acmp-44-arrows.png','alt',$kz$ACMP №44 толық шарты$kz$),
        jsonb_build_object('h',$kz$Есептің түсіндірілуі / Объяснение$kz$,'text',$p44e$Әр позициядан басталатын алты символдық бөлікті тексереміз. Сәйкес үлгі табылса count арттырамыз; i-ді секіртпейміз, сондықтан қабаттасатын ішкі жолдар да саналады.

Проверяем каждую шестисимвольную подстроку. При совпадении увеличиваем count и не пропускаем перекрывающиеся вхождения.$p44e$),
        jsonb_build_object('h',$kz$Есептің алгоритмі / Алгоритм$kz$,'bullets',jsonb_build_array($kz$i=0..size(s)-6 үшін s.substr(i,6) алыңыз.$kz$,$kz$Оны >>>--> немесе <---<< үлгісімен салыстырыңыз.$kz$,$kz$Сәйкес болса count++ жасаңыз және count шығарыңыз.$kz$,$ru$Для каждой позиции сравнить substr(i,6) с двумя шаблонами и посчитать совпадения.$ru$)),
        jsonb_build_object('h',$kz$Деректер құрылымы / Структура данных$kz$,'text',$kz$string s; int count.$kz$),
        jsonb_build_object('h',$kz$Псевдокод$kz$,'text',$p44p$оқу s
count ← 0
әр i үшін 0..size(s)-6:
  part ← s.substr(i,6)
  егер part=\">>>-->\" немесе part=\"<---<<\" болса count++
шығару count$p44p$),
        jsonb_build_object('h',$kz$Есептің шешімі (жасырын) / Решение (скрыто)$kz$,'hide',true,'code',$p44c$#include <iostream>
#include <string>
using namespace std;

int main() {
    string s;
    cin >> s;
    int ans = 0;
    for (int i = 0; i + 5 < (int)s.size(); ++i) {
        string part = s.substr(i, 6);
        if (part == ">>>-->" || part == "<---<<") ++ans;
    }
    cout << ans;
}$p44c$,'lang','C++')
      )
    ),

    jsonb_build_object(
      'type','solution','pageType','slide','templateId','solution','problemPage',true,
      'title',$kz$ACMP №1200 · Ретін өзгерт$kz$,
      'sections',jsonb_build_array(
        jsonb_build_object('h',$kz$Есептің берілуі / Условие задачи$kz$,'text',$p1200$Қазақша:
K күннің әрқайсысында қызметкерлер фамилиялары келу ретімен жазылған бір жол берілген. Кешіккендерді бірінші көру үшін әр жолдағы фамилиялардың ретін кері өзгертіңіз.

Кіріс: K (K≤10), кейін K жол. Фамилиялар бір пробелмен бөлінеді.
Шығыс: дәл K жол, әр жолдағы сөздер кері ретпен.
Мысал: Ivanov Petrov Sidorov → Sidorov Petrov Ivanov.

Русский:
Даны K строк с фамилиями сотрудников в порядке прихода. Разверните порядок фамилий в каждой строке.
Ввод: K≤10, затем K строк, фамилии разделены одним пробелом. Вывод: те же K строк в обратном порядке. Пример: Ivanov Petrov Sidorov → Sidorov Petrov Ivanov.$p1200$,'img','lec/string-acmp-1200-reorder.png','alt',$kz$ACMP №1200 толық шарты$kz$),
        jsonb_build_object('h',$kz$Есептің түсіндірілуі / Объяснение$kz$,'text',$p1200e$Жолды символдар бойынша reverse жасауға болмайды. getline толық жолды алады, stringstream фамилияларды сөздерге бөледі, vector сақтайды, vector reverse жасалады.

Нельзя разворачивать строку посимвольно. Нужно прочитать её через getline, разобрать слова stringstream, сохранить в vector и развернуть vector.$p1200e$),
        jsonb_build_object('h',$kz$Есептің алгоритмі / Алгоритм$kz$,'bullets',jsonb_build_array($kz$K оқыңыз және cin.ignore() жасаңыз.$kz$,$kz$Әр жолды getline арқылы алыңыз.$kz$,$kz$stringstream арқылы сөздерді vector<string>-ке жинаңыз.$kz$,$kz$vector-ды reverse етіп, пробелмен шығарыңыз.$kz$,$ru$Прочитать K, каждую строку разобрать в vector, reverse и напечатать.$ru$)),
        jsonb_build_object('h',$kz$Деректер құрылымы / Структура данных$kz$,'text',$kz$string line; stringstream in; vector<string> names.$kz$),
        jsonb_build_object('h',$kz$Псевдокод$kz$,'text',$p1200p$оқу K
K рет:
  line ← толық жолды оқу
  names ← line сөздері
  reverse(names)
  names-ті шығару$p1200p$),
        jsonb_build_object('h',$kz$Есептің шешімі (жасырын) / Решение (скрыто)$kz$,'hide',true,'code',$p1200c$#include <algorithm>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>
using namespace std;

int main() {
    int k;
    cin >> k;
    cin.ignore();
    while (k--) {
        string line;
        getline(cin, line);
        stringstream in(line);
        vector<string> names;
        string name;
        while (in >> name) names.push_back(name);
        reverse(names.begin(), names.end());
        for (int i = 0; i < (int)names.size(); ++i) {
            if (i) cout << ' ';
            cout << names[i];
        }
        cout << '\n';
    }
}$p1200c$,'lang','C++')
      )
    ),

    jsonb_build_object(
      'type','solution','pageType','slide','templateId','solution','problemPage',true,
      'title',$kz$ACMP №283 · Руналық сөздер$kz$,
      'sections',jsonb_build_array(
        jsonb_build_object('h',$kz$Есептің берілуі / Условие задачи$kz$,'text',$p283$Қазақша:
Әр руна екі, үш немесе төрт ағылшын әрпінен тұрады: әр бөліктің бірінші әрпі бас, қалғандары кіші. Берілген сөздің руналық екенін тексеріңіз.

Кіріс: тек ағылшын әріптері бар, ұзындығы 100000-нан аспайтын бос емес сөз.
Шығыс: руналық болса Yes, әйтпесе No. Мысалдар: IoIsTheBest → Yes, IoItIsWaste → No.

Русский:
Каждая руна состоит из двух, трёх или четырёх английских букв: первая заглавная, остальные строчные. Проверьте слово.
Ввод: непустое слово длиной не более 100000 из английских букв. Вывод: Yes или No. Примеры: IoIsTheBest → Yes, IoItIsWaste → No.$p283$,'img','lec/string-acmp-283-runes.png','alt',$kz$ACMP №283 толық шарты$kz$),
        jsonb_build_object('h',$kz$Есептің түсіндірілуі / Объяснение$kz$,'text',$p283e$Әр руна жаңа бас әріптен басталады. Сондықтан жолды бас әріптерге дейінгі сегменттерге бөлеміз. Әр сегмент ұзындығы 2..4 және бірінші символдан кейінгі символдар кіші болуы керек.

Каждый сегмент начинается с заглавной буквы. Проверяем длину 2..4 и строчные буквы после первой.$p283e$),
        jsonb_build_object('h',$kz$Есептің алгоритмі / Алгоритм$kz$,'bullets',jsonb_build_array($kz$Бірінші символ бас әріп болмаса, No.$kz$,$kz$Келесі бас әріпке дейінгі сегмент ұзындығын табыңыз.$kz$,$kz$Ұзындығы 2-ден 4-ке дейін екенін тексеріңіз.$kz$,$kz$Барлық сегмент дұрыс болса Yes шығарыңыз.$kz$,$ru$Проверять сегменты между заглавными буквами; каждая длина должна быть 2..4.$ru$)),
        jsonb_build_object('h',$kz$Деректер құрылымы / Структура данных$kz$,'text',$kz$string s; int i,j,len; bool ok.$kz$),
        jsonb_build_object('h',$kz$Псевдокод$kz$,'text',$p283p$оқу s
ok ← true; i ← 0
әзір i<size(s):
  j ← кіші әріптер біткенше жылжыту
  егер j-i<2 немесе j-i>4 болса ok ← false
  i ← j
ok болса Yes, әйтпесе No$p283p$),
        jsonb_build_object('h',$kz$Есептің шешімі (жасырын) / Решение (скрыто)$kz$,'hide',true,'code',$p283c$#include <cctype>
#include <iostream>
#include <string>
using namespace std;

int main() {
    string s;
    cin >> s;
    bool ok = !s.empty() && isupper((unsigned char)s[0]);
    for (int i = 0; ok && i < (int)s.size();) {
        int j = i + 1;
        while (j < (int)s.size() && islower((unsigned char)s[j])) ++j;
        int len = j - i;
        if (len < 2 || len > 4) ok = false;
        i = j;
        if (i < (int)s.size() && !isupper((unsigned char)s[i])) ok = false;
    }
    cout << (ok ? "Yes" : "No");
}$p283c$,'lang','C++')
      )
    ),

    jsonb_build_object(
      'type','solution','pageType','slide','templateId','solution','problemPage',true,
      'title',$kz$ACMP №295 · Шифрлау$kz$,
      'sections',jsonb_build_array(
        jsonb_build_object('h',$kz$Есептің берілуі / Условие задачи$kz$,'text',$p295$Қазақша:
Хабарлама циклдік ығысу әдісімен шифрланған: әр бас әріп әліпбиде белгілі қашықтыққа жылжиды. Ығысу 0..25. Шифрланған жолда міндетті түрде кездесетін сөз белгілі.

Кіріс: бірінші жолда шифрланған хабарлама, екінші жолда міндетті түрде кездесетін сөз. Екі жол 1..40 бас латын әрпінен тұрады.
Шығыс: шифры шешілген мәтін; бірнеше нұсқа болса ең кіші ығысуды таңдаңыз, ешқайсысы болмаса IMPOSSIBLE.
Мысал: KHOORDPHULD / HELLOAMERICA → HELLOAMERICA.

Русский:
Сообщение зашифровано циклическим сдвигом заглавных букв. Сдвиг 0..25, известное слово обязательно встречается в исходном тексте.
Ввод: зашифрованная строка и слово длиной 1..40. Вывод: расшифрованный текст с минимальным подходящим сдвигом или IMPOSSIBLE. Пример: KHOORDPHULD / HELLOAMERICA → HELLOAMERICA.$p295$,'img','lec/string-acmp-295-cipher.png','alt',$kz$ACMP №295 толық шарты$kz$),
        jsonb_build_object('h',$kz$Есептің түсіндірілуі / Объяснение$kz$,'text',$p295e$Мүмкін болатын key саны 26 ғана. Әр key үшін хабарламаны кері ығыстырып, decoded.find(word) арқылы белгілі сөзді іздейміз. key=0-ден басталғандықтан, бірінші табылған жауап ең кішісі болады.

Возможны только 26 сдвигов. Для каждого key расшифровать строку назад и проверить find(word). Перебор от 0 гарантирует минимальный подходящий ключ.$p295e$),
        jsonb_build_object('h',$kz$Есептің алгоритмі / Алгоритм$kz$,'bullets',jsonb_build_array($kz$key=0..25 үшін decoded string жасаңыз.$kz$,$kz$Әр символды (c-'A'-key+26)%26 арқылы кері жылжытыңыз.$kz$,$kz$decoded ішінде word бар болса, оны шығарыңыз.$kz$,$kz$Ешбір нұсқа табылмаса IMPOSSIBLE.$kz$,$ru$Для key=0..25 построить decoded, проверить find(word), вывести первый успех.$ru$)),
        jsonb_build_object('h',$kz$Деректер құрылымы / Структура данных$kz$,'text',$kz$string encrypted, word, decoded; int key.$kz$),
        jsonb_build_object('h',$kz$Псевдокод$kz$,'text',$p295p$оқу encrypted, word
0..25 key үшін:
  decoded ← әр символды кері ығыстыру
  егер decoded.find(word) табылса, шығару decoded және тоқтау
шығару IMPOSSIBLE$p295p$),
        jsonb_build_object('h',$kz$Есептің шешімі (жасырын) / Решение (скрыто)$kz$,'hide',true,'code',$p295c$#include <iostream>
#include <string>
using namespace std;

int main() {
    string encrypted, word;
    cin >> encrypted >> word;
    for (int key = 0; key < 26; ++key) {
        string decoded;
        for (char c : encrypted) {
            decoded += char('A' + (c - 'A' - key + 26) % 26);
        }
        if (decoded.find(word) != string::npos) {
            cout << decoded;
            return 0;
        }
    }
    cout << "IMPOSSIBLE";
}$p295c$,'lang','C++')
      )
    ),

    jsonb_build_object(
      'type','solution','pageType','slide','templateId','solution','problemPage',true,
      'title',$kz$ACMP №7 · АББА тайпасының алтыны$kz$,
      'sections',jsonb_build_array(
        jsonb_build_object('h',$kz$Есептің берілуі / Условие задачи$kz$,'text',$p7$Қазақша:
АББА тайпасының көсеміне үш қаптың бірін таңдау керек. Қаптардағы алтын монеталар саны берілген; ең үлкен санды таңдаңыз.

Кіріс: үш натурал сан, әрқайсысы 10^100-ден аспайды және жетекші нөлсіз жазылған.
Шығыс: ең үлкен сан. Мысалдар: 5 7 3 → 7; 987531 234 86364 → 987531.

Русский:
Вождю племени Абба нужно выбрать один из трёх мешков с золотыми монетами. Даны количества монет, выберите максимальное.
Ввод: три натуральных числа не более 10^100 без ведущих нулей. Вывод: максимум. Примеры: 5 7 3 → 7; 987531 234 86364 → 987531.$p7$,'img','lec/string-acmp-7-abba.png','alt',$kz$ACMP №7 толық шарты$kz$),
        jsonb_build_object('h',$kz$Есептің түсіндірілуі / Объяснение$kz$,'text',$p7e$10^100 өлшеміндегі сан long long-қа сыймайды. Оны string ретінде салыстырамыз: ұзындығы үлкен сан үлкен; ұзындығы тең болса, лексикографиялық салыстыру дұрыс, себебі жетекші нөлдер жоқ.

Числа до 10^100 не помещаются в long long. Сравниваем строки: сначала длину, затем лексикографически, так как ведущих нулей нет.$p7e$),
        jsonb_build_object('h',$kz$Есептің алгоритмі / Алгоритм$kz$,'bullets',jsonb_build_array($kz$Үш мәнді string ретінде оқыңыз.$kz$,$kz$Екі санды салыстырғанда алдымен length(), содан кейін оператор > қолданыңыз.$kz$,$kz$Үлкен string-ді сақтап, соңында шығарыңыз.$kz$,$ru$Хранить числа как string; сравнивать длину, затем лексикографический порядок.$ru$)),
        jsonb_build_object('h',$kz$Деректер құрылымы / Структура данных$kz$,'text',$kz$string a,b,c; cmp(a,b) функциясы.$kz$),
        jsonb_build_object('h',$kz$Псевдокод$kz$,'text',$p7p$оқу a,b,c
ans ← a
егер b үлкен болса ans ← b
егер c үлкен болса ans ← c
шығару ans$p7p$),
        jsonb_build_object('h',$kz$Есептің шешімі (жасырын) / Решение (скрыто)$kz$,'hide',true,'code',$p7c$#include <iostream>
#include <string>
using namespace std;

bool greaterNumber(const string& a, const string& b) {
    if (a.size() != b.size()) return a.size() > b.size();
    return a > b;
}

int main() {
    string a, b, c;
    cin >> a >> b >> c;
    string ans = a;
    if (greaterNumber(b, ans)) ans = b;
    if (greaterNumber(c, ans)) ans = c;
    cout << ans;
}$p7c$,'lang','C++')
      )
    )
  );

  update public.cf_lessons
  set slides = v_slides,
      plan = jsonb_build_object(
        'summary',$kz$C++ string типін толық меңгеру: енгізу, индекстеу, іздеу, ішкі жол, түрлендіру, салыстыру және ACMP есептері.$kz$,
        'objectives',jsonb_build_array(
          $kz$string жолын cin және getline арқылы оқу.$kz$,
          $kz$Индекстермен және негізгі string әдістерімен қауіпсіз жұмыс істеу.$kz$,
          $kz$Жолды бір өтімде талдайтын алгоритм құру.$kz$,
          $kz$ACMP есептерін шарт → түсіндіру → алгоритм → псевдокод → код ретімен шығару.$kz$
        ),
        'grade',7,
        'duration',$kz$120 минут$kz$
      ),
      terms = jsonb_build_array(
        jsonb_build_object('term',$kz$string$kz$,'definition',$kz$Символдардың реттелген тізбегін сақтайтын C++ типі.$kz$),
        jsonb_build_object('term',$kz$индекс$kz$,'definition',$kz$Жолдағы символдың нөмірі; бірінші индекс 0.$kz$),
        jsonb_build_object('term',$kz$ішкі жол$kz$,'definition',$kz$Бастапқы жолдың қатар тұрған символдардан тұратын бөлігі.$kz$),
        jsonb_build_object('term',$kz$лексикографиялық салыстыру$kz$,'definition',$kz$Жолдарды сөздіктегі рет сияқты символдар бойынша салыстыру.$kz$)
      ),
      updated_at = now()
  where id = v_lesson;
end;
$acmp_string_deep_dive$;
