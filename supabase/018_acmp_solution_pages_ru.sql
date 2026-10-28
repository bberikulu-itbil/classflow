-- ACMP есептерін суреті бар бір бетке айналдырады және орысша нұсқасын қосады.
-- Frontend слайдтың ru объектісін cf_lang=ru кезінде қолданады.
-- Идемпотентті: қайта орындалғанда сол беттерді қайта құрады, қайталамайды.

do $acmp_solution_pages_ru$
declare
  v_lesson record;
  v_slide record;
  v_item jsonb;
  v_new jsonb;
  v_ru jsonb;
  v_result jsonb;
  v_slug text;
  v_ru_title text;
  v_ru_statement text;
  v_ru_explanation text;
  v_ru_algorithm text;
  v_ru_data text;
  v_ru_pseudocode text;
  v_ru_alt text;
begin
  for v_lesson in
    select id, title
    from public.cf_lessons
    where title in (
      'Алгебра и геометрия',
      'Цикл с постусловием (do ... while)',
      'Символьный тип (char)',
      'Бинарный поиск'
    )
  loop
    v_result := '[]'::jsonb;

    for v_slide in
      select item, ord
      from jsonb_array_elements(
        coalesce((select slides from public.cf_lessons where id = v_lesson.id), '[]'::jsonb)
      ) with ordinality as x(item, ord)
      order by ord
    loop
      v_item := v_slide.item;
      v_new := v_item;

      if coalesce(v_item->>'problemPage', 'false') = 'true' then
        v_slug := case
          when v_item->>'title' like '%529%' then 'acmp-529'
          when v_item->>'title' like '%411%' then 'acmp-411'
          when v_item->>'title' like '%№26%' then 'acmp-26'
          when v_item->>'title' like '%1132%' then 'acmp-1132'
          when v_item->>'title' like '%1133%' then 'acmp-1133'
          when v_item->>'title' like '%1136%' then 'acmp-1136'
          when v_item->>'title' like '%1146%' then 'acmp-1146'
          when v_item->>'title' like '%1147%' then 'acmp-1147'
          when v_item->>'title' like '%1148%' then 'acmp-1148'
          when v_item->>'title' like '%Пароль%' then 'password-check'
          when v_item->>'title' like '%1198%' then 'acmp-1198'
          when v_item->>'title' like '%1153%' then 'acmp-1153'
          when v_item->>'title' like '%1154%' then 'acmp-1154'
          when v_item->>'title' like '%1465%' then 'acmp-1465'
          when v_item->>'title' like '%267%' then 'acmp-267'
          when v_item->>'title' like '%712%' then 'acmp-712'
          when v_item->>'title' like '%1131%' then 'acmp-1131'
          else 'acmp-problem'
        end;

        v_ru_title := case
          when v_slug = 'password-check' then 'Пароль — проверка'
          else v_item->>'title'
        end;

        v_ru_statement := case v_slug
          when 'acmp-529' then $ru$Даны координаты двух точек (x1, y1) и (x2, y2). Найдите длину отрезка, соединяющего эти точки.$ru$
          when 'acmp-411' then $ru$Дано квадратное уравнение ax² + bx + c = 0. Определите количество действительных корней и выведите их с погрешностью не более 10⁻⁴. При a = 0 уравнение является линейным.$ru$
          when 'acmp-26' then $ru$Даны центры и радиусы двух окружностей. Определите, имеют ли окружности хотя бы одну общую точку.$ru$
          when 'acmp-1132' then $ru$Дана последовательность неотрицательных целых чисел, заканчивающаяся при первом появлении 0. Найдите её длину, не включая 0.$ru$
          when 'acmp-1133' then $ru$Найдите сумму элементов последовательности неотрицательных целых чисел до первого 0. Ноль в сумму не входит.$ru$
          when 'acmp-1136' then $ru$Найдите максимальный элемент последовательности неотрицательных целых чисел до первого 0.$ru$
          when 'acmp-1146' then $ru$Дан один символ. Определите, является ли он цифрой: для цифры выведите Yes, иначе No.$ru$
          when 'acmp-1147' then $ru$Дан символ. Если это строчная английская буква, переведите её в верхний регистр. Остальные символы не изменяйте.$ru$
          when 'acmp-1148' then $ru$Дан символ. Если это английская буква, измените её регистр. Остальные символы не изменяйте.$ru$
          when 'password-check' then $ru$Даны требуемая длина N и минимальные количества заглавных букв, строчных букв и цифр A, B, C. Проверьте пароль: его длина должна быть N, все минимальные требования должны выполняться, а одинаковые соседние символы запрещены.$ru$
          when 'acmp-1198' then $ru$Постройте пароль длины N. В нём должно быть не менее A заглавных букв, B строчных букв и C цифр; два соседних символа не должны совпадать.$ru$
          when 'acmp-1153' then $ru$В слове не должно быть более двух согласных или более двух гласных подряд. Разрешается вставлять буквы. Найдите минимальное количество вставок.$ru$
          when 'acmp-1154' then $ru$Проверьте строку IPv4-адреса: в ней должны быть ровно четыре непустые числовые части от 0 до 255, разделённые точками.$ru$
          when 'acmp-1465' then $ru$Загаданное число N находится в диапазоне от 1 до 10⁹. По ответам <, > или = найдите его не более чем за 100 запросов.$ru$
          when 'acmp-267' then $ru$Нужно получить N копий. Один ксерокс делает копию за x секунд, второй — за y секунд. Найдите минимальное время, используя один или оба ксерокса.$ru$
          when 'acmp-712' then $ru$Даны размеры диплома w × h и их количество n. Найдите минимальную сторону квадратной доски, на которой можно разместить все дипломы без пересечений.$ru$
          when 'acmp-1131' then $ru$Дано кубическое уравнение ax³ + bx² + cx + d = 0, у которого ровно один действительный корень. Найдите этот корень с точностью не менее трёх знаков после запятой.$ru$
          else coalesce(v_item->>'statement', '')
        end;

        v_ru_explanation := case v_slug
          when 'acmp-529' then $ru$Разности координат dx = x2 − x1 и dy = y2 − y1 являются катетами прямоугольного треугольника. По теореме Пифагора длина отрезка равна sqrt(dx² + dy²).$ru$
          when 'acmp-411' then $ru$Сначала проверяем линейный случай a = 0. Для квадратного уравнения вычисляем дискриминант D = b² − 4ac: при D < 0 корней нет, при D = 0 корень один, при D > 0 корня два.$ru$
          when 'acmp-26' then $ru$Вычисляем расстояние d между центрами. Окружности пересекаются или касаются тогда и только тогда, когда |r1 − r2| ≤ d ≤ r1 + r2.$ru$
          when 'acmp-1132' then $ru$Ноль является сигнальным значением. Для каждого ненулевого числа увеличиваем счётчик. Так как первое число обязательно нужно прочитать, цикл do...while подходит естественно.$ru$
          when 'acmp-1133' then $ru$Ноль завершает ввод. Каждое ненулевое число добавляем к переменной sum, а затем повторяем чтение.$ru$
          when 'acmp-1136' then $ru$Храним максимум среди уже прочитанных чисел. Ноль не обрабатываем и сразу завершаем цикл.$ru$
          when 'acmp-1146' then $ru$В ASCII-кодах цифры '0'...'9' образуют непрерывный диапазон, поэтому достаточно проверить две границы.$ru$
          when 'acmp-1147' then $ru$Строчные латинские буквы находятся в диапазоне 'a'...'z'. Разность ASCII-кодов регистра равна 32, поэтому к символу можно применить c − 'a' + 'A'.$ru$
          when 'acmp-1148' then $ru$Для 'A'...'Z' прибавляем 32, а для 'a'...'z' вычитаем 32. Если символ не является английской буквой, оставляем его без изменений.$ru$
          when 'password-check' then $ru$Нельзя уменьшать unsigned-счётчики ниже нуля: они переполняются. Удобнее заново посчитать категории в int и отдельно проверить длину и соседние одинаковые символы.$ru$
          when 'acmp-1198' then $ru$Сначала закрываем обязательные минимумы для трёх категорий. Оставшиеся позиции заполняем символами, каждый раз избегая совпадения с предыдущим.$ru$
          when 'acmp-1153' then $ru$Идём слева направо и храним длину текущей серии гласных или согласных. При третьем символе одного типа вставляем один символ противоположного типа и начинаем новую серию.$ru$
          when 'acmp-1154' then $ru$Разделяем строку по точкам. Для каждой части проверяем, что она непустая, состоит только из цифр и её значение не превышает 255.$ru$
          when 'acmp-1465' then $ru$Каждый ответ отбрасывает половину текущего интервала. Запрашиваем середину: знак < сдвигает правую границу, > — левую, = завершает поиск.$ru$
          when 'acmp-267' then $ru$Первая копия делается из оригинала за min(x,y) секунд. После этого за время t количество копий равно 1 + (t − first)/x + (t − first)/y.$ru$
          when 'acmp-712' then $ru$Для фиксированной стороны s количество помещающихся дипломов равно floor(s/w) · floor(s/h). Это количество монотонно растёт, поэтому подходит бинарный поиск.$ru$
          when 'acmp-1131' then $ru$Используем единственный корень и знак функции на выбранном интервале. Если знаки f(L) и f(mid) совпадают, двигаем L, иначе двигаем R.$ru$
          else coalesce(v_item->>'explanation', '')
        end;

        v_ru_algorithm := case v_slug
          when 'acmp-529' then $ru$Считать координаты → вычислить dx и dy → применить формулу расстояния → вывести результат с нужной точностью.$ru$
          when 'acmp-411' then $ru$Проверить a. Если a = 0, решить линейное уравнение. Иначе найти D и по его знаку вывести 0, 1 или 2 корня.$ru$
          when 'acmp-26' then $ru$Найти dx² + dy² и сравнить это значение с квадратами |r1 − r2| и r1 + r2, не вычисляя корень без необходимости.$ru$
          when 'acmp-1132' then $ru$Установить length = 0 → прочитать x → если x ≠ 0 увеличить length → повторять до нуля → вывести length.$ru$
          when 'acmp-1133' then $ru$Установить sum = 0 → прочитать x → если x ≠ 0 прибавить x → повторять до нуля → вывести sum.$ru$
          when 'acmp-1136' then $ru$Прочитать первое число и сделать его максимумом → читать следующие → обновлять максимум при необходимости → остановиться на нуле.$ru$
          when 'acmp-1146' then $ru$Прочитать c и проверить условие '0' ≤ c ≤ '9'.$ru$
          when 'acmp-1147' then $ru$Прочитать c → проверить диапазон 'a'...'z' → при успехе вычесть 32 → вывести c.$ru$
          when 'acmp-1148' then $ru$Проверить диапазон 'A'...'Z', затем 'a'...'z'. При совпадении изменить код на 32, иначе оставить символ.$ru$
          when 'password-check' then $ru$Прочитать N, A, B, C и пароль → проверить длину → посчитать категории и соседние повторы → вывести результат проверки.$ru$
          when 'acmp-1198' then $ru$Добавить обязательные заглавные, строчные буквы и цифры → заполнить остаток → при совпадении с предыдущим взять следующий символ.$ru$
          when 'acmp-1153' then $ru$Для каждого символа определить тип, обновить длину серии и при run = 3 увеличить answer и сбросить серию до 1.$ru$
          when 'acmp-1154' then $ru$Разделить строку по '.' → проверить число частей → проверить каждую часть → вывести Good или Bad.$ru$
          when 'acmp-1465' then $ru$Установить L = 1, R = 10⁹ → пока L ≤ R брать mid → вывести mid и flush → по ответу оставить нужную половину.$ru$
          when 'acmp-267' then $ru$Построить feasible(t) → бинарным поиском найти минимальное t, для которого capacity(t) ≥ N.$ru$
          when 'acmp-712' then $ru$Построить feasible(s) → бинарным поиском найти минимальную сторону s, для которой floor(s/w) · floor(s/h) ≥ n.$ru$
          when 'acmp-1131' then $ru$Взять [−2000,2000] → 100 раз разделить интервал пополам → оставить половину с корнем → вывести середину.$ru$
          else coalesce(v_item->>'algorithm', '')
        end;

        v_ru_data := case v_slug
          when 'acmp-529' then 'double: dx, dy, distance; массив не нужен.'
          when 'acmp-411' then 'double: a, b, c, D, x1, x2; постоянная память.'
          when 'acmp-26' then 'long long: координаты, радиусы и квадраты; sqrt не обязателен.'
          when 'acmp-1132' then 'int: x и length; хранить всю последовательность не нужно.'
          when 'acmp-1133' then 'long long: sum и int: x; массив не нужен.'
          when 'acmp-1136' then 'int: x и max; все числа хранить не нужно.'
          when 'acmp-1146' then 'char: один символ; дополнительная структура не нужна.'
          when 'acmp-1147' then 'char: один символ.'
          when 'acmp-1148' then 'char: один символ.'
          when 'password-check' then 'string password; int upper, lower, digits; char previous.'
          when 'acmp-1198' then 'string answer; три набора символов; индексы и int need.'
          when 'acmp-1153' then 'string s; bool vowel(char); int run и answer.'
          when 'acmp-1154' then 'string s, stringstream, string part; int value, parts; bool good.'
          when 'acmp-1465' then 'long long left, right, mid; массив не нужен.'
          when 'acmp-267' then 'long long: N, x, y, left, right, mid; для capacity — __int128.'
          when 'acmp-712' then 'long long: w, h, n и границы; для произведения — __int128.'
          when 'acmp-1131' then 'long double: коэффициенты, границы и значение функции.'
          else coalesce(v_item->>'dataStructures', '')
        end;

        v_ru_pseudocode := case v_slug
          when 'acmp-529' then $ru$прочитать x1, y1, x2, y2
dx ← x2 − x1
dy ← y2 − y1
d ← sqrt(dx·dx + dy·dy)
вывести d$ru$
          when 'acmp-411' then $ru$прочитать a, b, c
если a = 0, решить bx + c = 0
иначе:
  D ← b² − 4ac
  D < 0 → вывести 0
  D = 0 → вывести один корень
  D > 0 → вывести два корня$ru$
          when 'acmp-26' then $ru$прочитать x1,y1,r1,x2,y2,r2
d2 ← (x2−x1)² + (y2−y1)²
если (r1−r2)² ≤ d2 ≤ (r1+r2)², вывести YES
иначе вывести NO$ru$
          when 'acmp-1132' then $ru$length ← 0
do:
  прочитать x
  если x ≠ 0, length ← length + 1
while x ≠ 0
вывести length$ru$
          when 'acmp-1133' then $ru$sum ← 0
do:
  прочитать x
  если x ≠ 0, sum ← sum + x
while x ≠ 0
вывести sum$ru$
          when 'acmp-1136' then $ru$прочитать x
max ← x
while x ≠ 0:
  прочитать x
  если x > max, max ← x
вывести max$ru$
          when 'acmp-1146' then $ru$прочитать c
если '0' ≤ c ≤ '9', вывести Yes
иначе вывести No$ru$
          when 'acmp-1147' then $ru$прочитать c
если 'a' ≤ c ≤ 'z', c ← c − 32
вывести c$ru$
          when 'acmp-1148' then $ru$прочитать c
если 'A' ≤ c ≤ 'Z', c ← c + 32
иначе если 'a' ≤ c ≤ 'z', c ← c − 32
вывести c$ru$
          when 'password-check' then $ru$прочитать N, A, B, C және password
если length(password) ≠ N, вывести incorrect
посчитать upper, lower, digits
если есть одинаковые соседние символы, вывести incorrect
если upper ≥ A и lower ≥ B и digits ≥ C, вывести correct
иначе вывести incorrect$ru$
          when 'acmp-1198' then $ru$прочитать N, A, B, C
answer ← обязательные upper + lower + digit
пока длина answer < N:
  добавить следующий символ, отличный от предыдущего
вывести answer$ru$
          when 'acmp-1153' then $ru$answer ← 0, run ← 0
для каждого c:
  type ← гласная или согласная
  если type изменился, run ← 1, иначе run++
  если run = 3, answer++, run ← 1
вывести answer$ru$
          when 'acmp-1154' then $ru$прочитать s
parts ← разделить s по '.'
если число parts ≠ 4, вывести Bad
для каждой parts проверить пустоту, длину, цифры и значение ≤ 255
если всё верно, вывести Good$ru$
          when 'acmp-1465' then $ru$left ← 1, right ← 10⁹
while left ≤ right:
  mid ← (left + right) / 2
  вывести mid и flush
  прочитать reply
  '=' → завершить
  '<' → right ← mid − 1
  '>' → left ← mid + 1$ru$
          when 'acmp-267' then $ru$first ← min(x,y)
left ← first, right ← first + (N−1)·max(x,y)
while left < right:
  mid ← (left + right) / 2
  copies ← 1 + (mid−first)/x + (mid−first)/y
  copies ≥ N → right ← mid, иначе left ← mid+1
вывести left$ru$
          when 'acmp-712' then $ru$left ← 1, right ← max(w,h)·n
while left < right:
  mid ← (left + right) / 2
  capacity ← floor(mid/w)·floor(mid/h)
  capacity ≥ n → right ← mid, иначе left ← mid+1
вывести left$ru$
          when 'acmp-1131' then $ru$прочитать a,b,c,d
left ← −2000, right ← 2000
100 раз:
  mid ← (left+right)/2
  если знаки f(left) и f(mid) совпадают, left ← mid
  иначе right ← mid
вывести (left+right)/2$ru$
          else coalesce(v_item->>'pseudocode', '')
        end;

        v_ru_alt := case v_slug
          when 'acmp-529' then 'Схема расстояния между двумя точками'
          when 'acmp-411' then 'Схема ветвления по a и дискриминанту'
          when 'acmp-26' then 'Схема проверки пересечения окружностей'
          when 'acmp-1132' then 'Схема чтения до нулевого значения'
          when 'acmp-1133' then 'Схема накопления суммы'
          when 'acmp-1136' then 'Схема поиска максимума'
          when 'acmp-1146' then 'Схема проверки цифры'
          when 'acmp-1147' then 'Схема перевода в верхний регистр'
          when 'acmp-1148' then 'Схема смены регистра'
          when 'password-check' then 'Схема проверки пароля'
          when 'acmp-1198' then 'Схема генерации пароля'
          when 'acmp-1153' then 'Схема проверки благозвучного слова'
          when 'acmp-1154' then 'Схема проверки IPv4-адреса'
          when 'acmp-1465' then 'Схема двоичного поиска числа'
          when 'acmp-267' then 'Схема бинарного поиска времени копирования'
          when 'acmp-712' then 'Схема бинарного поиска стороны доски'
          when 'acmp-1131' then 'Схема поиска корня кубического уравнения'
          else 'Схема решения задачи'
        end;

        v_new := jsonb_build_object(
          'type','solution',
          'pageType','scroll',
          'templateId','theory',
          'problemPage',true,
          'answerHidden',true,
          'title',v_item->>'title',
          'solutionLabel','Есептің шешімі (жасырын)',
          'statement',v_item->>'statement',
          'explanation',v_item->>'explanation',
          'algorithm',v_item->>'algorithm',
          'dataStructures',v_item->>'dataStructures',
          'pseudocode',v_item->>'pseudocode',
          'solution',coalesce(v_item->>'solution',''),
          'hints',coalesce(v_item->'hints','[]'::jsonb),
          'tests',coalesce(v_item->'tests','[]'::jsonb),
          'points',v_item->'points',
          'sections',jsonb_build_array(
            jsonb_build_object('h','Есептің берілуі','text',v_item->>'statement'),
            jsonb_build_object('h','Есептің түсіндірілуі','text',v_item->>'explanation','img','lec/'||v_slug||'.svg','alt',v_ru_alt),
            jsonb_build_object('h','Есептің алгоритмі','text',v_item->>'algorithm','img','lec/'||v_slug||'.svg','alt',v_ru_alt),
            jsonb_build_object('h','Деректер құрылымы','text',v_item->>'dataStructures'),
            jsonb_build_object('h','Псевдокод','code',v_item->>'pseudocode','lang','text'),
            jsonb_build_object('h','Есептің шешімі (жасырын)','hide',true,'code',coalesce(v_item->>'solution',''),'lang','cpp')
          ),
          'ru',jsonb_build_object(
            'type','solution',
            'pageType','scroll',
            'templateId','theory',
            'problemPage',true,
            'answerHidden',true,
            'title',v_ru_title,
            'solutionLabel','Решение (скрыто)',
            'sections',jsonb_build_array(
              jsonb_build_object('h','Условие задачи','text',v_ru_statement),
              jsonb_build_object('h','Объяснение задачи','text',v_ru_explanation,'img','lec/'||v_slug||'.svg','alt',v_ru_alt),
              jsonb_build_object('h','Алгоритм задачи','text',v_ru_algorithm,'img','lec/'||v_slug||'.svg','alt',v_ru_alt),
              jsonb_build_object('h','Структура данных','text',v_ru_data),
              jsonb_build_object('h','Псевдокод','code',v_ru_pseudocode,'lang','text'),
              jsonb_build_object('h','Решение задачи (скрыто)','hide',true,'code',coalesce(v_item->>'solution',''),'lang','cpp')
            )
          )
        );
      else
        v_ru := v_item - 'ru';
        case
          when v_lesson.title = 'Алгебра и геометрия' and v_item->>'title' = 'Алгебра и геометрия' then
            v_ru := v_ru || jsonb_build_object('title','Алгебра и геометрия','subtitle','Теорема Пифагора и квадратное уравнение · C++');
          when v_lesson.title = 'Алгебра и геометрия' and v_item->>'title' = 'Пифагор теоремасы' then
            v_ru := v_ru || jsonb_build_object('title','Теорема Пифагора','bullets',jsonb_build_array('В прямоугольном треугольнике a² + b² = c²','Гипотенуза: c = sqrt(a*a + b*b)','Расстояние между точками: d = sqrt((x2-x1)² + (y2-y1)²)'));
          when v_lesson.title = 'Алгебра и геометрия' and v_item->>'title' = 'Гипотенузаны есептеу' then
            v_ru := v_ru || jsonb_build_object('title','Вычисление гипотенузы','prompt','Даны два катета. Найдите гипотенузу, площадь и периметр.','hints',jsonb_build_array('Используйте вещественный тип и sqrt.'));
          when v_lesson.title = 'Алгебра и геометрия' and v_item->>'title' = 'Квадрат теңдеу' then
            v_ru := v_ru || jsonb_build_object('title','Квадратное уравнение','prompt','Решите уравнение ax² + bx + c = 0 через дискриминант.','hints',jsonb_build_array('Отдельно обработайте случаи d < 0, d = 0 и d > 0.'));
          when v_lesson.title = 'Алгебра и геометрия' and v_item->>'title' = 'Өзіңді тексер' then
            v_ru := v_ru || jsonb_build_object('title','Проверь себя','prompt','Какая формула задаёт расстояние между двумя точками?','options',jsonb_build_array('sqrt((x2-x1)^2 + (y2-y1)^2)','(x2-x1) + (y2-y1)','sqrt(x1*x2 + y1*y2)','abs(x2-x1) + abs(y2-y1)'));
          when v_lesson.title = 'Алгебра и геометрия' and v_item->>'title' = 'ACMP есептері' then
            v_ru := v_ru || jsonb_build_object('title','Задачи ACMP','prompt','Решите задачи «Длина отрезка», «Две окружности», «Школьная алгебра» и «Квадратное уравнение». Укажите формулы, типы данных и граничные случаи.');
          when v_lesson.title = 'Цикл с постусловием (do ... while)' and v_item->>'title' = 'Цикл с постусловием' then
            v_ru := v_ru || jsonb_build_object('title','Цикл с постусловием','subtitle','do ... while · олимпиадные задачи на C++');
          when v_lesson.title = 'Цикл с постусловием (do ... while)' and v_item->>'title' = 'Негізгі идея' then
            v_ru := v_ru || jsonb_build_object('title','Основная идея','bullets',jsonb_build_array('Сначала выполняется тело do','Затем проверяется условие while','Если условие true, цикл повторяется','Если условие false, цикл завершается'),'notes','В отличие от while, цикл do...while выполняет тело как минимум один раз.');
          when v_lesson.title = 'Цикл с постусловием (do ... while)' and v_item->>'title' = 'Синтаксис' then
            v_ru := v_ru || jsonb_build_object('title','Синтаксис','prompt','Цикл, который запрашивает пароль до правильного ввода.','hints',jsonb_build_array('Не забудьте точку с запятой после while.'));
          when v_lesson.title = 'Цикл с постусловием (do ... while)' and v_item->>'title' = 'Sentinel арқылы оқу' then
            v_ru := v_ru || jsonb_build_object('title','Чтение до sentinel','prompt','Сумма последовательности, которая заканчивается нулём.','hints',jsonb_build_array('Если 0 не входит в сумму, обработайте его отдельно.'));
          when v_lesson.title = 'Цикл с постусловием (do ... while)' and v_item->>'title' = 'Қай кезде do ... while таңдаймыз?' then
            v_ru := v_ru || jsonb_build_object('title','Когда выбираем do...while?','prompt','Какое требование точнее всего объясняет выбор цикла do...while?','options',jsonb_build_array('Тело цикла должно выполниться хотя бы один раз','Тело цикла может не выполниться ни разу','Число итераций заранее известно','Нужно отсортировать массив'));
          when v_lesson.title = 'Цикл с постусловием (do ... while)' and v_item->>'title' = 'ACMP есептері' then
            v_ru := v_ru || jsonb_build_object('title','Задачи ACMP','prompt','Решите задачи «Длина последовательности», «Сумма последовательности», «Количество чётных элементов» и «Максимум последовательности» с помощью do...while.');
          when v_lesson.title = 'Бинарный поиск' and v_item->>'title' = 'Бинарный поиск' then
            v_ru := v_ru || jsonb_build_object('title','Бинарный поиск','subtitle','Деление интервала пополам · O(log N)');
          when v_lesson.title = 'Бинарный поиск' and v_item->>'title' = 'Понятие бинарного поиска' then
            v_ru := v_ru || jsonb_build_object('title','Понятие бинарного поиска','bullets',jsonb_build_array('Делим интервал поиска ответа на две части','По условию оставляем правильную половину','На каждом шаге число кандидатов уменьшается примерно вдвое','Сложность: O(log N)'));
          when v_lesson.title = 'Бинарный поиск' and v_item->>'title' = 'Целочисленный нұсқа' then
            v_ru := v_ru || jsonb_build_object('title','Целочисленный вариант','prompt','Идея поиска загаданного числа от 1 до 100 не более чем за 7 вопросов.','hints',jsonb_build_array('Так как 2⁷ > 100, семи шагов достаточно.'));
          when v_lesson.title = 'Бинарный поиск' and v_item->>'title' = 'Вещественный бинарлық іздеу' then
            v_ru := v_ru || jsonb_build_object('title','Вещественный бинарный поиск','prompt','Найдите sqrt(a) с заданной точностью epsilon.','hints',jsonb_build_array('Делите интервал, пока его длина не станет меньше epsilon.'));
          when v_lesson.title = 'Бинарный поиск' and v_item->>'title' = 'Қай шарт дұрыс?' then
            v_ru := v_ru || jsonb_build_object('title','Какое условие верно?','prompt','Какое классическое условие остановки у целочисленного бинарного поиска?','options',jsonb_build_array('left < right','left + right > 0','mid == 0','right - left < 0'));
          when v_lesson.title = 'Бинарный поиск' and v_item->>'title' = 'ACMP есептері' then
            v_ru := v_ru || jsonb_build_object('title','Задачи ACMP','prompt','Решите задачи «Ксерокопии», «Дипломы», «Кампус» и «Корень кубического уравнения», построив монотонный предикат и применив бинарный поиск.');
          when v_lesson.title = 'Символьный тип (char)' and v_item->>'title' = 'Символьный тип (char)' then
            v_ru := v_ru || jsonb_build_object('title','Символьный тип (char)','subtitle','ASCII-коды и работа с символами · C++');
          when v_lesson.title = 'Символьный тип (char)' and v_item->>'title' = 'char дегеніміз не?' then
            v_ru := v_ru || jsonb_build_object('title','Что такое char?','bullets',jsonb_build_array('char хранит один символ; символ записывается в одинарных кавычках: ''A'', ''7'', ''?''','Внутреннее значение символа — целочисленный ASCII-код','''0''..''9'': 48..57; ''A''..''Z'': 65..90; ''a''..''z'': 97..122','Символы сравниваются по ASCII-кодам: ''A'' < ''a''','Тип char может быть signed или unsigned; при работе с cctype безопаснее использовать unsigned char.'));
          when v_lesson.title = 'Символьный тип (char)' and v_item->>'title' = 'Символды оқу және ASCII кодын шығару' then
            v_ru := v_ru || jsonb_build_object('title','Чтение символа и вывод ASCII-кода','prompt','Прочитайте один символ, выведите его и его числовой код. Проверьте, является ли он цифрой.','hints',jsonb_build_array('Чтобы вывести код символа, используйте int(c).','Условие проверки цифры: ''0'' <= c && c <= ''9''.'));
          when v_lesson.title = 'Символьный тип (char)' and v_item->>'title' = 'Символдық цифрлар және регистр' then
            v_ru := v_ru || jsonb_build_object('title','Символьные цифры и регистр','bullets',jsonb_build_array('Преобразование символьной цифры в число: x = c - ''0''','Преобразование числа в символьную цифру: c = x + ''0''','Строчную букву в заглавную: toupper(c). Заглавную в строчную: tolower(c).','Функциям <cctype> лучше передавать значение, приведённое к unsigned char.'));
          when v_lesson.title = 'Символьный тип (char)' and v_item->>'title' = 'Жолды бас әріпке ауыстыру' then
            v_ru := v_ru || jsonb_build_object('title','Перевод строки в верхний регистр','prompt','Переведите все буквы введённого текста в верхний регистр.','hints',jsonb_build_array('cin.get(c) также читает пробелы.','Цикл продолжается до EOF.'));
          when v_lesson.title = 'Символьный тип (char)' and v_item->>'title' = 'ASCII кестесі' then
            v_ru := v_ru || jsonb_build_object('title','Таблица ASCII','prompt','Выведите символы с ASCII-кодами от 32 до 127 вместе с их кодами.','hints',jsonb_build_array('char(code) преобразует числовой код в символ.'));
          when v_lesson.title = 'Символьный тип (char)' and v_item->>'title' = 'Өзіңді тексер' then
            v_ru := v_ru || jsonb_build_object('title','Проверь себя','prompt','Какое выражение превращает символ ''7'' в целое число 7?','options',jsonb_build_array('''7'' - ''0''','int(''7'')','''7'' + 0','char(7)'));
          else
            v_ru := null;
        end case;

        if v_ru is not null then
          v_new := jsonb_set(v_item, '{ru}', v_ru, true);
        end if;
      end if;

      v_result := v_result || jsonb_build_array(v_new);
    end loop;

    update public.cf_lessons
    set slides = v_result, updated_at = now()
    where id = v_lesson.id;
  end loop;
end;
$acmp_solution_pages_ru$;
