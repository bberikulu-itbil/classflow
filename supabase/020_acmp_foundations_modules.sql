-- ACMP курсының I-V бөлімдеріндегі жетіспейтін тақырыптық дәрістер.
-- Қайта орындауға болады: атауы бірдей дәріс жаңартылып, дұрыс модульге байланысады.

do $acmp_foundations$
declare
  v_course uuid;
  v_school uuid;
  v_owner uuid;
  v_module uuid;
  v_lesson uuid;
  v_spec record;
  v_slides jsonb;
  v_plan jsonb;
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

  for v_spec in
    select *
    from jsonb_to_recordset($spec$
    [
      {
        "module":"Введение","title":"Арифметика","position":0,"grade":7,"duration":"45 минут",
        "summary":"C++ тіліндегі ең алғашқы есептер: енгізу, шығару және арифметикалық амалдар.",
        "theory":["Айнымалы деректі сақтайды: int — бүтін сан, double — бөлшек сан.","Негізгі амалдар: + қосу, - азайту, * көбейту, / бөлу, % қалдық.","Бүтін сандарды бөлгенде нәтиже де бүтін болады: 7 / 2 = 3.","Амалдардың орындалу ретін жақша арқылы анық көрсетіңіз."],
        "algorithm":["Кіріс деректерін оқыңыз.","Формуладағы амалдарды дұрыс ретпен орындаңыз.","Нәтижені талап етілген форматта шығарыңыз."],
        "code":"#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << ' ' << a - b << ' ' << a * b;\n}",
        "tasks":["A. A+B","B. Саңырау емес телефон","C. Моншақ","D. Эния","E. Келесі және алдыңғы","F. Екі бандит"],
        "statement":"Екі бүтін A және B саны берілген. Олардың қосындысын табыңыз.\n\nКіріс деректері: INPUT.TXT файлының бір жолында A және B бүтін сандары берілген.\n\nШығыс деректері: OUTPUT.TXT файлына A+B мәнін шығарыңыз.\n\nМысал: Кіріс: 2 3. Шығыс: 5.",
        "explanation":"Бұл есепте қосымша цикл немесе шарт қажет емес. Екі санды оқып, бір ғана арифметикалық амал орындаймыз.",
        "data":"int: a, b, answer.","pseudo":"оқу a, b\nanswer ← a + b\nшығару answer",
        "solution":"#include <iostream>\nusing namespace std;\nint main() {\n    long long a, b;\n    cin >> a >> b;\n    cout << a + b;\n}"
      },
      {
        "module":"Введение","title":"Қарапайым есептер","position":1,"grade":7,"duration":"45 минут",
        "summary":"Бірнеше енгізу мәнін оқып, шартта берілген қарапайым түрлендіруді орындау.",
        "theory":["Есеп шартын үш бөлікке бөліңіз: не берілген, не табу керек, қандай шектеу бар.","Кіріс деректері пробел немесе жаңа жол арқылы берілсе, cin оларды бірдей оқиды.","Шығысқа тек сұралған мәнді шығарыңыз: артық мәтін ACMP тексеруінен өтпеуі мүмкін.","Өлшем бірлігін түрлендіруде формуланы алдымен қағазға жазыңыз."],
        "algorithm":["Айнымалыларды есеп шартына сай таңдаңыз.","Барлық мәндерді бір рет оқыңыз.","Формула бойынша жауапты есептеңіз.","Жауапты бір жолға шығарыңыз."],
        "code":"#include <iostream>\nusing namespace std;\nint main() {\n    int a, b, c;\n    cin >> a >> b >> c;\n    cout << a + b + c;\n}",
        "tasks":["A. Hello world!","B. Дурак","C. Ойын","D. Үзілістерді қысқарту","E. A+B+C","F. Корольдер бәрін де істей алады","G. Том мен Джерри","H. Кітаптағы жолдар"],
        "statement":"Үш бүтін A, B және C саны берілген. Олардың қосындысын есептеңіз.\n\nКіріс деректері: бір жолда пробелмен бөлінген үш бүтін сан беріледі.\n\nШығыс деректері: үш санның қосындысын шығарыңыз.\n\nМысал: Кіріс: 1 2 3. Шығыс: 6.",
        "explanation":"Кіріс форматы бірнеше саннан тұрса да, cin оларды ретімен бөлек айнымалыларға оқиды. Жауап — үш мәннің қосындысы.",
        "data":"int: a, b, c, sum.","pseudo":"оқу a, b, c\nsum ← a + b + c\nшығару sum",
        "solution":"#include <iostream>\nusing namespace std;\nint main() {\n    long long a, b, c;\n    cin >> a >> b >> c;\n    cout << a + b + c;\n}"
      },
      {
        "module":"Введение","title":"Бүтін сандар","position":2,"grade":7,"duration":"60 минут",
        "summary":"Бүтін санның цифрларымен, бөлінуімен, қалдығымен және цифрлық сипаттарымен жұмыс.",
        "theory":["/ операциясы бүтін бөлінді, % операциясы бөлінгендегі қалдықты береді.","Соңғы цифрды n % 10 арқылы, соңғы цифрды алып тастауды n / 10 арқылы табамыз.","Жұп санның шарты: n % 2 == 0.","Цифрлармен жұмыс істегенде сан 0 болғанға дейін while циклінде бөлінеді."],
        "algorithm":["Санның шектеуін және таңбасын ескеріңіз.","Қажет цифрды % арқылы алыңыз.","Келесі цифрға өту үшін / 10 қолданыңыз.","Арнайы жағдайды, мысалы n=0, бөлек тексеріңіз."],
        "code":"#include <iostream>\nusing namespace std;\nint main() {\n    int n;\n    cin >> n;\n    cout << n % 10 << ' ' << (n / 10) % 10;\n}",
        "tasks":["A. Бес бес – жиырма бес!","B. Соңғы цифр","C. Ондықтар саны","D. Санның цифрларының қосындысы","E. Аспа бау","F. Бөлінгіштікті тексеріңіз","G. Алманы бөлу","H. МКАД","I. Бөлуден қалған қалдық"],
        "statement":"Берілген үш таңбалы бүтін санның соңғы цифрын анықтаңыз.\n\nКіріс деректері: INPUT.TXT файлына үш таңбалы сан жазылады.\n\nШығыс деректері: санның бірліктер цифрын шығарыңыз.\n\nМысал: Кіріс: 203. Шығыс: 3.",
        "explanation":"Ондық санау жүйесінде бірліктер цифры санды 10-ға бөлгендегі қалдыққа тең. Сондықтан есептің негізгі формуласы — n % 10.",
        "data":"int: n, digit.","pseudo":"оқу n\ndigit ← n mod 10\nшығару digit",
        "solution":"#include <iostream>\nusing namespace std;\nint main() {\n    int n;\n    cin >> n;\n    cout << n % 10;\n}"
      },
      {
        "module":"Введение","title":"Формулаларды шығару","position":3,"grade":7,"duration":"60 минут",
        "summary":"Математикалық формулаларды C++ өрнегіне айналдыру және нақты нәтижені дәл шығару.",
        "theory":["sqrt(x), abs(x), pow(x,y), sin(x), cos(x) сияқты функциялар bits/stdc++.h арқылы қолжетімді.","Бөлшек нәтиже күтілсе, кемінде бір операнд double болуы керек.","fixed << setprecision(k) санының үтірден кейінгі k цифрын шығарады.","Формуладағы бөлшек пен жақшаларды C++ синтаксисіне дәл көшіріңіз."],
        "algorithm":["Математикалық формуланы бөліктерге бөліңіз.","Әр бөлікті C++ өрнегіне аударыңыз.","Типтерді double етіп таңдаңыз.","Нәтижені талап етілген дәлдікпен шығарыңыз."],
        "code":"#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    double a, b;\n    cin >> a >> b;\n    double c = sqrt(a * a + b * b);\n    cout << fixed << setprecision(6) << c;\n}",
        "tasks":["A. Кеңсе тауарлары дүкені","B. Гулливер","C. Тырналар","D. Уақыттар айырмасы","E. Сабақтардың аяқталуы","F. Ұлу"],
        "statement":"Катеттері a және b болатын тікбұрышты үшбұрыш берілген. Оның гипотенузасының ұзындығын, ауданын және периметрін табыңыз.\n\nКіріс деректері: a және b — оң нақты сандар.\n\nШығыс деректері: гипотенузаны, ауданды және периметрді 6 цифр дәлдікпен шығарыңыз.\n\nМысал: Кіріс: 3 4. Шығыс: 5.000000 6.000000 12.000000.",
        "explanation":"Пифагор теоремасы бойынша c = sqrt(a²+b²). Аудан S=ab/2, ал периметр P=a+b+c. Нақты тип пен setprecision қолданамыз.",
        "data":"double: a, b, c, area, perimeter.","pseudo":"оқу a, b\nc ← sqrt(a·a + b·b)\narea ← a·b / 2\nperimeter ← a + b + c\nшығару c, area, perimeter",
        "solution":"#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    double a, b;\n    cin >> a >> b;\n    double c = hypot(a, b);\n    cout << fixed << setprecision(6) << c << ' ' << a * b / 2 << ' ' << a + b + c;\n}"
      },
      {
        "module":"Условный оператор","title":"Қарапайым салыстырулар","position":0,"grade":7,"duration":"60 минут",
        "summary":"if, else және салыстыру операторлары арқылы екі немесе бірнеше жағдайдың бірін таңдау.",
        "theory":["Салыстырулар: <, >, <=, >=, ==, !=.","if шарт ақиқат болса, оның блогы орындалады; әйтпесе else блогы орындалады.","Бірнеше шартты && және || логикалық операторларымен біріктіруге болады.","Теңдік үшін = емес, == жазылады."],
        "algorithm":["Шарттағы жағдайларды тізіп жазыңыз.","Шекаралық теңдік белгілерін анықтаңыз.","if/else арқылы әр жағдайға бір нәтиже беріңіз.","Тең, кіші және үлкен мәндерге тест жасаңыз."],
        "code":"#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    if (a > b) cout << a;\n    else cout << b;\n}",
        "tasks":["A. Үлкен-кіші","B. Арифметика","C. Бақытты билет","D. Жалақы","E. Баскетбол","F. Төрт таңбалы палиндром","G. Торт","H. Үш толықбас","I. Алтын құм","J. Бағдаршам"],
        "statement":"Екі бүтін сан берілген. Олардың үлкенін шығарыңыз. Егер сандар тең болса, сол мәннің өзін шығарыңыз.\n\nКіріс деректері: бір жолда a және b бүтін сандары беріледі.\n\nШығыс деректері: max(a,b) мәнін шығарыңыз.\n\nМысал: Кіріс: 7 4. Шығыс: 7.",
        "explanation":"Екі санды салыстыру үшін бір if жеткілікті. a>b болса a, қалған барлық жағдайда b шығарамыз; тең болғанда екі мән де бірдей.",
        "data":"int: a, b.","pseudo":"оқу a, b\nегер a > b болса шығару a\nәйтпесе шығару b",
        "solution":"#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << (a > b ? a : b);\n}"
      },
      {
        "module":"Условный оператор","title":"Шахмат","position":1,"grade":7,"duration":"60 минут",
        "summary":"Шахмат тақтасындағы координаталар арқылы фигуралардың жүрісін шартпен тексеру.",
        "theory":["Шахмат торкөздері 1..8 аралығындағы жол және баған координаталарымен беріледі.","Тура бір жолда немесе бір бағанда жүреді: x1==x2 немесе y1==y2.","Пілдің шарты: |x1-x2| == |y1-y2|.","Аттың айырмалары (1,2) немесе (2,1) болуы керек."],
        "algorithm":["Бастапқы және соңғы координаталарды оқыңыз.","x және y айырмаларын есептеңіз.","Фигураның нақты жүріс шартымен салыстырыңыз.","YES немесе NO шығарыңыз."],
        "code":"#include <iostream>\n#include <cstdlib>\nusing namespace std;\nint main() {\n    int x1, y1, x2, y2;\n    cin >> x1 >> y1 >> x2 >> y2;\n    cout << ((x1 == x2 || y1 == y2) ? \"YES\" : \"NO\");\n}",
        "tasks":["A. Тұра","B. Піл","C. Уәзір","D. Патша","E. Ат","F. Пешка","G. Торкөздер","H. Шахмат өрісі","I. Тұрамен ойын","J. Шахмат фигуралары"],
        "statement":"Шахмат тақтасында ладьяның бастапқы және соңғы торкөздері берілген. Ладья осы жүрісті бір жүріспен жасай ала ма?\n\nКіріс деректері: x1, y1, x2, y2 — 1-ден 8-ге дейінгі координаталар.\n\nШығыс деректері: мүмкін болса YES, мүмкін болмаса NO шығарыңыз.\n\nМысал: Кіріс: 1 2 1 8. Шығыс: YES.",
        "explanation":"Ладья көлденең немесе тік бағытта жүреді. Сондықтан жолдары тең немесе бағандары тең болса, жүріс мүмкін.",
        "data":"int: x1, y1, x2, y2, dx, dy.","pseudo":"оқу x1, y1, x2, y2\nегер x1=x2 немесе y1=y2 болса YES\nәйтпесе NO",
        "solution":"#include <iostream>\nusing namespace std;\nint main() {\n    int x1, y1, x2, y2;\n    cin >> x1 >> y1 >> x2 >> y2;\n    cout << ((x1 == x2 || y1 == y2) ? \"YES\" : \"NO\");\n}"
      },
      {
        "module":"Условный оператор","title":"Күрделі есептер","position":3,"grade":8,"duration":"60 минут",
        "summary":"Бірнеше өзара байланысты шартты талдау, жағдайларды толық жабу және қате тармақтарды болдырмау.",
        "theory":["Күрделі шартты есепте барлық мүмкін жағдайларды кесте түрінде жазу пайдалы.","Ерте қайтару немесе бөлек if блоктары кодты түсінікті етеді.","Шарттар бір-бірін қайталамауы және ешбір жағдайды өткізіп алмауы керек.","Математикалық шектеулерді шарттың өзіне қосыңыз: мысалы, үшбұрыш үшін a+b>c."],
        "algorithm":["Есепті жағдайларға бөліңіз.","Әр жағдайдың қажетті шартын жазыңыз.","Шарттарды қарапайымнан күрделіге қарай тексеріңіз.","Барлық шекаралық мәндерге тест жасаңыз."],
        "code":"#include <iostream>\nusing namespace std;\nint main() {\n    int a, b, c;\n    cin >> a >> b >> c;\n    if (a + b <= c || a + c <= b || b + c <= a) cout << 0;\n    else if (a == b && b == c) cout << 3;\n    else if (a == b || a == c || b == c) cout << 2;\n    else cout << 1;\n}",
        "tasks":["A. Алиса түлкі мен Базилио мысық","B. Турист","C. Котлеттер","D. Манхэттен полицейі"],
        "statement":"Үш қабырғасы a, b және c болатын үшбұрыштың түрін анықтаңыз. Үшбұрыш құрылмаса 0, теңқабырғалы болса 3, теңбүйірлі болса 2, қалған жағдайда 1 шығарыңыз.\n\nКіріс деректері: a, b, c — оң бүтін сандар.\n\nШығыс деректері: шартқа сәйкес кодты шығарыңыз.\n\nМысал: Кіріс: 3 3 4. Шығыс: 2.",
        "explanation":"Алдымен үшбұрыштың бар-жоғын тексереміз. Тек содан кейін қабырғалардың теңдігін талдаймыз; әйтпесе жарамсыз үшбұрыш қате түрге түсіп кетуі мүмкін.",
        "data":"int: a, b, c.","pseudo":"оқу a, b, c\nегер үшбұрыш жоқ болса 0\nәйтпесе барлық қабырға тең болса 3\nәйтпесе екі қабырға тең болса 2\nәйтпесе 1",
        "solution":"#include <iostream>\nusing namespace std;\nint main() {\n    int a, b, c;\n    cin >> a >> b >> c;\n    if (a + b <= c || a + c <= b || b + c <= a) cout << 0;\n    else if (a == b && b == c) cout << 3;\n    else if (a == b || a == c || b == c) cout << 2;\n    else cout << 1;\n}"
      },
      {
        "module":"Операторы цикла","title":"Параметрлі цикл (for)","position":0,"grade":7,"duration":"60 минут",
        "summary":"Итерация саны алдын ала белгілі болғанда for циклін қолдану.",
        "theory":["for циклінің үш бөлігі бар: бастапқы мән, жалғастыру шарты және өзгерту қадамы.","for (int i=1; i<=n; ++i) — 1-ден n-ге дейінгі классикалық цикл.","Цикл ішінде санау, қосынды, көбейтінді және кесте есептерін шығаруға болады.","Шекараны i<n немесе i<=n деп таңдағанда есептің нөмірленуін ескеріңіз."],
        "algorithm":["Итерация санын анықтаңыз.","Санауыштың бастапқы және соңғы мәнін жазыңыз.","Әр қайталануда орындалатын әрекетті белгілеңіз.","n=0 және n=1 жағдайларын тексеріңіз."],
        "code":"#include <iostream>\nusing namespace std;\nint main() {\n    int n, sum = 0;\n    cin >> n;\n    for (int i = 1; i <= n; ++i) sum += i;\n    cout << sum;\n}",
        "tasks":["A. Монеталар","B. Қарбыздар","C. Ақырлы автоматтар","D. Автобус экскурсиясы","E. Халық санағы","F. Жұмбақ","G. Жолдар","H. Қосынды","I. Теңдеу","J. Жылымық"],
        "statement":"N натурал саны берілген. 1-ден N-ге дейінгі барлық сандардың қосындысын табыңыз.\n\nКіріс деректері: N саны.\n\nШығыс деректері: 1+2+...+N қосындысын шығарыңыз.\n\nМысал: Кіріс: 5. Шығыс: 15.",
        "explanation":"Қосындыны 0-ден бастап, циклдің әр қадамында i мәнін қосамыз. for циклі қайталану саны белгілі болғандықтан таңдалады.",
        "data":"int: n, i; long long: sum.","pseudo":"оқу n\nsum ← 0\nfor i=1..n: sum ← sum+i\nшығару sum",
        "solution":"#include <iostream>\nusing namespace std;\nint main() {\n    long long n, sum = 0;\n    cin >> n;\n    for (long long i = 1; i <= n; ++i) sum += i;\n    cout << sum;\n}"
      },
      {
        "module":"Операторы цикла","title":"Алдын ала шарты тексерілетін цикл (while)","position":1,"grade":7,"duration":"60 минут",
        "summary":"Қайталану саны алдын ала белгісіз болғанда while циклін және тоқтау шартын құру.",
        "theory":["while алдымен шартты тексереді, сондықтан дене бір рет те орындалмауы мүмкін.","Цикл ішінде шартқа әсер ететін айнымалы міндетті түрде өзгеруі керек.","Цифрларды талдау, бөлгіштерді іздеу және белгісіз ұзындықтағы енгізу үшін ыңғайлы.","Тоқтау шарты жалған болатын жағдайды алдын ала тексеріңіз."],
        "algorithm":["Цикл инвариантын анықтаңыз.","while шартын жазыңыз.","Дене ішінде айнымалыны өзгертіңіз.","Цикл аяқталғаннан кейінгі нәтижені шығарыңыз."],
        "code":"#include <iostream>\nusing namespace std;\nint main() {\n    int n, digits = 0;\n    cin >> n;\n    while (n > 0) {\n        ++digits;\n        n /= 10;\n    }\n    cout << digits;\n}",
        "tasks":["A. Квадраттар тізімі","B. Ең кіші бөлгіш","C. Екінің дәрежелерінің тізімі","D. Бинарлық сандар","E. Фибоначчи сандары","F. Фибоначчи сандары - 2","G. Банктік пайыздар","H. Таңертеңгі жүгіру","I. Максимум мен минимумның қосындысы"],
        "statement":"N (N>1) саны берілген. Оның 1-ден үлкен ең кіші бөлгішін табыңыз.\n\nКіріс деректері: N бүтін саны.\n\nШығыс деректері: N санының 1-ден үлкен ең кіші бөлгішін шығарыңыз.\n\nМысал: Кіріс: 15. Шығыс: 3.",
        "explanation":"d=2-ден бастап бөлгіштерді тексереміз. Бірінші рет N%d==0 болған d — ең кіші бөлгіш, сондықтан циклді тоқтатуға болады.",
        "data":"int: n, d.","pseudo":"оқу n\nd ← 2\nwhile n mod d ≠ 0: d ← d+1\nшығару d",
        "solution":"#include <iostream>\nusing namespace std;\nint main() {\n    int n;\n    cin >> n;\n    int d = 2;\n    while (n % d != 0) ++d;\n    cout << d;\n}"
      },
      {
        "module":"Операторы цикла","title":"ЕҮОБ және ЕКОЕ","position":3,"grade":8,"duration":"60 минут",
        "summary":"Евклид алгоритмі арқылы ең үлкен ортақ бөлгішті және ең кіші ортақ еселікті табу.",
        "theory":["ЕҮОБ(a,b) — екі санның ортақ бөлгіштерінің ең үлкені.","Евклид алгоритмі: gcd(a,b)=gcd(b,a%b), ал b=0 болғанда жауап a.","ЕКОЕ(a,b)=a/gcd(a,b)*b формуласымен табылады.","Алдымен бөлу жасап, содан кейін көбейту overflow қаупін азайтады."],
        "algorithm":["a және b мәндерін оқыңыз.","Қалдық нөл болғанша Евклид қадамын қайталаңыз.","gcd арқылы lcm есептеңіз.","Үлкен сандар үшін long long таңдаңыз."],
        "code":"#include <iostream>\nusing namespace std;\nlong long gcd(long long a, long long b) {\n    while (b != 0) { long long r = a % b; a = b; b = r; }\n    return a;\n}\nint main() {\n    long long a, b;\n    cin >> a >> b;\n    long long g = gcd(a, b);\n    cout << g << ' ' << a / g * b;\n}",
        "tasks":["A. ЕҮОБ","B. ЕКОЕ","C. Апельсиндер","D. Фибоначчи сандары - 3"],
        "statement":"Екі натурал a және b саны берілген. Олардың ең үлкен ортақ бөлгішін табыңыз.\n\nКіріс деректері: a және b натурал сандары.\n\nШығыс деректері: ЕҮОБ(a,b) мәнін шығарыңыз.\n\nМысал: Кіріс: 18 24. Шығыс: 6.",
        "explanation":"Ортақ бөлгіштердің бәрін тексерудің орнына қалдықтар тізбегін қолданамыз. Бұл алгоритм өте жылдам және O(log(min(a,b))) уақытта жұмыс істейді.",
        "data":"long long: a, b, r, g.","pseudo":"оқу a, b\nwhile b ≠ 0: r ← a mod b; a ← b; b ← r\nшығару a",
        "solution":"#include <iostream>\nusing namespace std;\nint main() {\n    long long a, b;\n    cin >> a >> b;\n    while (b != 0) {\n        long long r = a % b;\n        a = b;\n        b = r;\n    }\n    cout << a;\n}"
      },
      {
        "module":"Строковые типы данных","title":"Жол түрі (string)","position":1,"grade":7,"duration":"60 минут",
        "summary":"C++ string типі арқылы мәтінді оқу, символдарға қол жеткізу, іздеу және түрлендіру.",
        "theory":["string — символдар тізбегі; бірінші символдың индексі 0.","s.size() немесе s.length() жол ұзындығын береді.","s[i] арқылы i-ші символды оқимыз, ал s.substr(k,n) ішкі жолды бөледі.","getline(cin,s) бос орындары бар толық жолды оқиды; оны cin >> s-тан ажыратыңыз."],
        "algorithm":["Жолды қажетті оқу әдісімен алыңыз.","Индекстердің 0..size()-1 аралығында екенін есте сақтаңыз.","Әр символды циклмен қарап, керек шартты санаңыз немесе өзгертіңіз.","Нәтижені жаңа жол немесе өзгертілген string ретінде шығарыңыз."],
        "code":"#include <iostream>\n#include <string>\nusing namespace std;\nint main() {\n    string s;\n    cin >> s;\n    int vowels = 0;\n    for (char c : s)\n        if (c=='a' || c=='e' || c=='i' || c=='o' || c=='u' || c=='y') ++vowels;\n    cout << s.size() << ' ' << vowels;\n}",
        "tasks":["A. Пернетақта","B. Гүлдер","C. E саны","D. Шахмат","E. Көрсеткілер","F. Ретін өзгерт","G. Руналық сөздер","H. Шифрлау","I. АББА тайпасының алтыны"],
        "statement":"Берілген кіші латын әріптерінен тұратын сөздегі дауысты әріптердің санын анықтаңыз. Дауыстылар: a, e, i, o, u, y.\n\nКіріс деректері: ұзындығы 100-ден аспайтын бір сөз.\n\nШығыс деректері: дауысты әріптер санын шығарыңыз.\n\nМысал: Кіріс: program. Шығыс: 2.",
        "explanation":"Сөздің барлық символдарын бір рет қарап шығамыз. Әр символ дауыстылар жиынында болса, санауышты арттырамыз.",
        "data":"string: s; int: vowels; char: c.","pseudo":"оқу s\nvowels ← 0\nәр c символы үшін: егер c дауысты болса vowels++\nшығару vowels",
        "solution":"#include <iostream>\n#include <string>\nusing namespace std;\nint main() {\n    string s;\n    cin >> s;\n    int ans = 0;\n    for (char c : s)\n        ans += (c=='a' || c=='e' || c=='i' || c=='o' || c=='u' || c=='y');\n    cout << ans;\n}"
      },
      {
        "module":"Строковые типы данных","title":"Санау жүйелері","position":2,"grade":7,"duration":"75 минут",
        "summary":"Екілік, сегіздік, ондық және он алтылық санау жүйелерін түсіну және сандарды түрлендіру.",
        "theory":["b негізді жүйеде цифрлар 0-ден b-1-ге дейін болады.","Ондықтан b негізіне ауыстыру: санды b-ге бөліп, қалдықтарды кері ретпен жазу.","b негізінен ондыққа ауыстыру: цифрларды солдан оңға қарай ans=ans*b+digit формуласы арқылы жинау.","Он алтылық цифрлары 0..9 және A..F; char арқылы цифр мәнін тексеріңіз."],
        "algorithm":["Негізді және санды анықтаңыз.","Әр цифрды сандық мәнге айналдырыңыз.","Орын мәнін негіз арқылы жаңартыңыз.","Нәтижені қажетті негізде цифрлармен құрастырыңыз."],
        "code":"#include <iostream>\n#include <string>\nusing namespace std;\nint main() {\n    string s; int base;\n    cin >> s >> base;\n    long long value = 0;\n    for (char c : s) {\n        int d = c <= '9' ? c - '0' : c - 'A' + 10;\n        value = value * base + d;\n    }\n    cout << value;\n}",
        "tasks":["A. Бірліктер","B. Қиын емес есептеу","C. Unix","D. Биттік реверс","E. Ең кіші санау жүйесі","F. Сан — палиндром","G. Қызықты ойын","H. 7-ге бөлінгіштік","I. Санау жүйесі","J. ЕГЭ","K. Таразымен өлшеу","L. Фибоначчи санау жүйесі"],
        "statement":"Ондық бүтін N санын B негізіндегі санау жүйесіне ауыстырыңыз.\n\nКіріс деректері: N — теріс емес бүтін сан және 2≤B≤16.\n\nШығыс деректері: N санының B негізіндегі жазылуын шығарыңыз; 10-нан үлкен цифрлар үшін A-F бас әріптерін қолданыңыз.\n\nМысал: Кіріс: 26 16. Шығыс: 1A.",
        "explanation":"N-ді негізге бөлу қалдықтары ең кіші разрядтан басталады. Сондықтан қалдықтарды жинап, кері ретпен шығарамыз.",
        "data":"long long: n; int: base, digit; string: answer.","pseudo":"оқу n, base\nегер n=0 болса 0 шығару\nwhile n>0: answer-ге digit=n mod base қосу; n←n/base\nanswer-ді кері шығару",
        "solution":"#include <iostream>\n#include <string>\n#include <algorithm>\nusing namespace std;\nint main() {\n    long long n; int base;\n    cin >> n >> base;\n    string d = \"0123456789ABCDEF\", ans;\n    if (n == 0) ans = \"0\";\n    while (n > 0) { ans += d[n % base]; n /= base; }\n    reverse(ans.begin(), ans.end());\n    cout << ans;\n}"
      },
      {
        "module":"Массивы","title":"Сызықтық іздеу","position":0,"grade":7,"duration":"60 минут",
        "summary":"Массив элементтерін басынан соңына дейін қарап, ізделетін мәнді, минимумды немесе максимумды табу.",
        "theory":["Сызықтық іздеу элементтерді ретімен тексереді және сұрыпталған массивті талап етпейді.","Барлық сәйкестікті санау үшін count санауышын арттырыңыз.","Бірінші сәйкестікті тапқанда break қолдануға болады.","Минимум/максимум үшін бастапқы мән ретінде массивтің бірінші элементін алған қауіпсіз."],
        "algorithm":["N және массив элементтерін оқыңыз.","Іздеу мәнімен әр элементті салыстырыңыз.","Сәйкестік болса санауышты немесе жауапты жаңартыңыз.","Соңғы жауапты шығарыңыз."],
        "code":"#include <iostream>\nusing namespace std;\nint main() {\n    int n, x, count = 0;\n    cin >> n >> x;\n    for (int i = 0; i < n; ++i) {\n        int a; cin >> a;\n        if (a == x) ++count;\n    }\n    cout << count;\n}",
        "tasks":["A. Сызықтық іздеу","B. Максималды элемент","C. Қарсы операция","D. Көкжидек жинау","E. Ең жақын сан","F. Салықтар"],
        "statement":"N элементтен тұратын A массиві және X саны берілген. Массивте X саны неше рет кездесетінін анықтаңыз.\n\nКіріс деректері: бірінші жолда N және X, екінші жолда N бүтін массив элементі берілген.\n\nШығыс деректері: X-ке тең элементтер санын шығарыңыз.\n\nМысал: Кіріс: 5 3 және 3 1 3 7 3. Шығыс: 3.",
        "explanation":"Массивті толық бір рет қараймыз. Әр a[i]==x болған сайын count біреуге артады. Уақыт күрделілігі O(N), қосымша жады O(1).",
        "data":"int: n, x, a, count; массивті сақтамай-ақ онлайн санауға болады.","pseudo":"оқу n, x\ncount ← 0\nN рет: оқу a; егер a=x болса count++\nшығару count",
        "solution":"#include <iostream>\nusing namespace std;\nint main() {\n    int n, x; cin >> n >> x;\n    int count = 0;\n    for (int i = 0; i < n; ++i) { int a; cin >> a; count += (a == x); }\n    cout << count;\n}"
      },
      {
        "module":"Массивы","title":"Деректерді түрлендіру және талдау","position":1,"grade":7,"duration":"75 минут",
        "summary":"Массивті кері шығару, жылжыту, қайта құру және статистикалық сипаттарын есептеу.",
        "theory":["Массив индексі 0-ден N-1-ге дейін өзгереді.","Кері шығару үшін i=N-1-ден 0-ге дейін кемітеміз.","Циклдік жылжуда индекс (i+k)%N формуласы жиі қолданылады.","Статистикада қосынды, минимум, максимум және орташа мәнді бір өтімде жинауға болады."],
        "algorithm":["N және массивті оқыңыз.","Нені өзгертетініңізді анықтаңыз: орындарын ауыстыру ма, жаңа массив құру ма.","Индекстердің шектен шықпауын тексеріңіз.","Мысалдағы массивпен қолмен салыстырыңыз."],
        "code":"#include <iostream>\nusing namespace std;\nint main() {\n    int n; cin >> n;\n    int a[100];\n    for (int i = 0; i < n; ++i) cin >> a[i];\n    for (int i = n - 1; i >= 0; --i) cout << a[i] << ' ';\n}",
        "tasks":["A. Кері айналдыру","B. Массивтің ішкі массиві","C. Сап","D. Қосарлы кері айналдыру","E. Алмастырудың жылжуы","F. Статистика","G. Үйге тапсырма","H. Супер жылжу","I. Шашты бизнес","J. Жиындардың қиылысуы"],
        "statement":"N элементтен тұратын тізбек берілген. Оны кері ретпен шығарыңыз.\n\nКіріс деректері: бірінші жолда N, екінші жолда N элемент берілген.\n\nШығыс деректері: элементтерді N-нен 1-ге қарай кері ретпен шығарыңыз.\n\nМысал: Кіріс: 4 және 1 2 3 4. Шығыс: 4 3 2 1.",
        "explanation":"Кері рет индекстері N-1, N-2, ..., 0 болады. Массивті өзгертпей-ақ, осы индекстермен шығару жеткілікті.",
        "data":"int a[100], n; нәтиже үшін қосымша массив қажет емес.","pseudo":"оқу n және a[0..n-1]\nfor i=n-1..0: шығару a[i]",
        "solution":"#include <iostream>\nusing namespace std;\nint main() {\n    int n; cin >> n;\n    int a[100];\n    for (int i = 0; i < n; ++i) cin >> a[i];\n    for (int i = n - 1; i >= 0; --i) {\n        if (i != n - 1) cout << ' ';\n        cout << a[i];\n    }\n}"
      },
      {
        "module":"Массивы","title":"Құрылымдар массиві","position":2,"grade":8,"duration":"75 минут",
        "summary":"Бір объектінің әртүрлі типтегі қасиеттерін struct арқылы біріктіріп, объектілер массивін өңдеу.",
        "theory":["struct жаңа деректер типін жасайды: бір жазбада бірнеше өріс сақталады.","Өріске нүкте арқылы қатынаймыз: student.name, student.score.","Құрылымдар массивін циклмен оқуға, сүзуге және сұрыптауға болады.","Әр өрістің типін есеп шартына сай таңдаңыз: string, int, double."],
        "algorithm":["Жазбадағы өрістерді анықтаңыз.","struct сипаттамасын жазыңыз.","N объектіні оқыңыз.","Қажетті өріс бойынша іздеңіз, санаңыз немесе сұрыптаңыз."],
        "code":"#include <iostream>\n#include <string>\nusing namespace std;\nstruct Student { string name; int score; };\nint main() {\n    int n; cin >> n;\n    Student a[100];\n    for (int i = 0; i < n; ++i) cin >> a[i].name >> a[i].score;\n    for (int i = 0; i < n; ++i)\n        if (a[i].score >= 90) cout << a[i].name << ' ';\n}",
        "tasks":["A. Жазықтықтағы нүктелер","B. Телефон анықтамалығы","C. Үздіктердің үздіктері"],
        "statement":"N оқушының аты және ұпайы берілген. Ұпайы 90-нан кем емес оқушылардың аттарын шығарыңыз.\n\nКіріс деректері: N, одан кейін N жолда латын әріптерімен жазылған ат және бүтін ұпай беріледі.\n\nШығыс деректері: шартқа сай оқушылардың аттарын бастапқы ретпен шығарыңыз.\n\nМысал: Кіріс: 3; Ayan 95; Dana 84; Miras 90. Шығыс: Ayan Miras.",
        "explanation":"Аты мен ұпайы бір объектіге тиесілі болғандықтан, оларды екі бөлек массив емес, Student құрылымы арқылы сақтаймыз. Әр жазбаның score өрісін тексереміз.",
        "data":"struct Student { string name; int score; }; Student a[100].","pseudo":"оқу n\nN рет: оқу a[i].name, a[i].score\nегер a[i].score≥90 болса атын шығару",
        "solution":"#include <iostream>\n#include <string>\nusing namespace std;\nstruct Student { string name; int score; };\nint main() {\n    int n; cin >> n;\n    Student a[100];\n    for (int i = 0; i < n; ++i) cin >> a[i].name >> a[i].score;\n    bool first = true;\n    for (int i = 0; i < n; ++i) if (a[i].score >= 90) {\n        if (!first) cout << ' ';\n        cout << a[i].name; first = false;\n    }\n}"
      }
    ]
    $spec$::jsonb) as x(
      module text, title text, position int, grade int, duration text,
      summary text, theory jsonb, algorithm jsonb, code text, tasks jsonb,
      statement text, explanation text, data text, pseudo text, solution text
    )
  loop
    select m.id into v_module
    from public.cf_curr_modules m
    where m.course_id = v_course and m.title = v_spec.module
    limit 1;

    if v_module is null then
      raise exception 'Модуль табылмады: %', v_spec.module;
    end if;

    v_plan := jsonb_build_object(
      'summary', v_spec.summary,
      'objectives', jsonb_build_array(
        'Тақырыптың негізгі ұғымдарын түсіну',
        'Қарапайым есепті алгоритмге айналдыру',
        'C++ кодын шекаралық жағдайлармен тексеру'
      ),
      'grade', v_spec.grade,
      'duration', v_spec.duration
    );

    v_slides := jsonb_build_array(
      jsonb_build_object(
        'type','title','pageType','slide','templateId','title',
        'title',v_spec.title,
        'subtitle','ACMP: Язык программирования C++ · теория және есептер'
      ),
      jsonb_build_object(
        'type','content','pageType','scroll','templateId','theory',
        'title','Негізгі түсініктер','bullets',v_spec.theory
      ),
      jsonb_build_object(
        'type','content','pageType','scroll','templateId','worked-example',
        'title','C++ мысалы','starter',v_spec.code,
        'prompt','Кодты жол-жолымен оқыңыз: кіріс → негізгі әрекет → шығыс.',
        'notes','Кодты өз тестіңізбен тексеріңіз және әр айнымалының типін түсіндіріңіз.'
      ),
      jsonb_build_object(
        'type','content','pageType','scroll','templateId','theory',
        'title','Есептің алгоритмі','bullets',v_spec.algorithm
      ),
      jsonb_build_object(
        'type','content','pageType','scroll','templateId','theory',
        'title','PDF-тегі ACMP есептері','bullets',v_spec.tasks,
        'prompt','Бұл тақырыптағы есептердің барлығы PDF-тегі есептер көрсеткішінен алынды. Әр есепті алдымен өзіңіз шығарып көріңіз.'
      ),
      jsonb_build_object(
        'type','solution','pageType','slide','templateId','worked-example',
        'problemPage',true,'answerHidden',true,
        'title',v_spec.title || ' · үлгі есеп',
        'sections',jsonb_build_array(
          jsonb_build_object('h','Есептің берілуі','text',v_spec.statement),
          jsonb_build_object('h','Есептің түсіндірілуі','text',v_spec.explanation),
          jsonb_build_object('h','Есептің алгоритмі','text',(select string_agg(value, E'\n' order by ord) from jsonb_array_elements_text(v_spec.algorithm) with ordinality as t(value,ord))),
          jsonb_build_object('h','Деректер құрылымы','text',v_spec.data),
          jsonb_build_object('h','Псевдокод','text',v_spec.pseudo),
          jsonb_build_object('h','Есептің шешімі (жасырын)','hide',true,'code',v_spec.solution,'lang','C++')
        )
      )
    );

    v_terms := jsonb_build_array(
      jsonb_build_object('term',v_spec.title,'definition',v_spec.summary),
      jsonb_build_object('term','алгоритм','definition','Есепті шешуге апаратын реттелген әрекеттер тізбегі.'),
      jsonb_build_object('term','шекаралық жағдай','definition','Ең кіші, ең үлкен немесе ерекше кіріс мәні; оны бөлек тексеру керек.')
    );

    select l.id into v_lesson
    from public.cf_lessons l
    where l.owner_id = v_owner and l.title = v_spec.title
    limit 1;

    if v_lesson is null then
      insert into public.cf_lessons (school_id, owner_id, title, subject, plan, slides, terms)
      values (v_school, v_owner, v_spec.title, 'Информатика олимпиадасы', v_plan, v_slides, v_terms)
      returning id into v_lesson;
    else
      update public.cf_lessons
      set subject = 'Информатика олимпиадасы', plan = v_plan, slides = v_slides, terms = v_terms, updated_at = now()
      where id = v_lesson;
    end if;

    insert into public.cf_curr_lessons (lesson_id, module_id, position)
    values (v_lesson, v_module, v_spec.position)
    on conflict (lesson_id) do update
      set module_id = excluded.module_id, position = excluded.position;

    v_module := null;
    v_lesson := null;
  end loop;

  -- Бұрын жасалған дәрістердің реті PDF мазмұнына сәйкес болсын.
  update public.cf_curr_lessons cl set position = 2
  where cl.lesson_id = (select id from public.cf_lessons where owner_id=v_owner and title='Алгебра и геометрия' limit 1);
  update public.cf_curr_lessons cl set position = 2
  where cl.lesson_id = (select id from public.cf_lessons where owner_id=v_owner and title='Цикл с постусловием (do ... while)' limit 1);
  update public.cf_curr_lessons cl set position = 4
  where cl.lesson_id = (select id from public.cf_lessons where owner_id=v_owner and title='Бинарный поиск' limit 1);
  update public.cf_curr_lessons cl set position = 0
  where cl.lesson_id = (select id from public.cf_lessons where owner_id=v_owner and title='Символьный тип (char)' limit 1);
end;
$acmp_foundations$;
