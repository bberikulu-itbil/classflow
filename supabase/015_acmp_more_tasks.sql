-- ACMP C++ курсына жаңа char және бинарлық іздеу есептерін қосу.
-- Қайта орындауға болады: осы атаулардағы слайдтар алдымен алынып,
-- кейін жаңартылған нұсқасы қосылады.

do $acmp_more_tasks$
declare
  v_course uuid;
  v_owner uuid;
  v_char_lesson uuid;
  v_binary_lesson uuid;
  v_old_slides jsonb;
  v_char_tasks jsonb;
  v_binary_tasks jsonb;
begin
  select c.id, c.owner_id
    into v_course, v_owner
  from public.cf_curr_courses c
  where c.id = 'dbe60970-1fa6-4a8a-a65e-051d20cfd278'
    and c.title = 'ACMP: Язык программирования C++';

  if v_course is null then
    raise exception 'ACMP курсы табылмады';
  end if;

  v_char_tasks := jsonb_build_array(
    jsonb_build_object(
      'type','content','pageType','scroll','templateId','theory',
      'title',$t1146$ACMP №1146 — Цифра · талдау$t1146$,
      'bullets',jsonb_build_array(
        $b1146$Деңгейі: L1, char және шарт.$b1146$,
        $b1146$Жетектеуші сұрақ: символдың цифр екенін ASCII диапазоны арқылы қалай тексереміз?$b1146$,
        $b1146$Цифр символдары қатар орналасады: '0' <= c && c <= '9'.$b1146$,
        $b1146$Күрделілік: O(1), жады: O(1).$b1146$,
        $b1146$Шеткі жағдай: '0' және '9' — цифр, ал 'A' немесе '?' — цифр емес.$b1146$
      ),
      'prompt',$p1146$Шарты:
Бір символ берілген. Оның цифр екенін анықтаңыз. Цифр болса Yes, әйтпесе No шығарыңыз.

Мысал: 5 → Yes, A → No.

Негізгі идея: char мәнін '0' мен '9' аралығымен салыстыру.$p1146$
    ),
    jsonb_build_object(
      'type','code','pageType','slide','templateId','code-example',
      'title',$c1146$ACMP №1146 — C++ шешімі$c1146$,
      'prompt',$p1146c$Символды оқып, оның цифрлар диапазонына кіретінін тексеріңіз.$p1146c$,
      'starter',$s1146$#include <bits/stdc++.h>
using namespace std;

int main() {
    char c;
    cin >> c;
    cout << (('0' <= c && c <= '9') ? "Yes" : "No");
    return 0;
}$s1146$,
      'hints',jsonb_build_array($h1146$ASCII кодтарын қолмен жазбай, '0' және '9' символдарын пайдаланыңыз.$h1146$),
      'tests',jsonb_build_array(
        jsonb_build_object('input','5','out','Yes','label','Цифр'),
        jsonb_build_object('input','A','out','No','label','Әріп')
      )
    ),

    jsonb_build_object(
      'type','content','pageType','scroll','templateId','theory',
      'title',$t1147$ACMP №1147 — Верхний регистр · талдау$t1147$,
      'bullets',jsonb_build_array(
        $b1147$Деңгейі: L1, ASCII және char түрлендіру.$b1147$,
        $b1147$Егер 'a' <= c <= 'z' болса, бас әріпке ауыстыру керек.$b1147$,
        $b1147$ASCII бойынша айырма: 'A' - 'a' = -32, сондықтан c = c - 'a' + 'A'.$b1147$,
        $b1147$C++ нұсқасы: toupper(c), бірақ тек ағылшын әріптері үшін қолданамыз.$b1147$,
        $b1147$Күрделілік: O(1). Бас әріп пен цифр өзгеріссіз қалады.$b1147$
      ),
      'prompt',$p1147$Шарты:
Бір символ берілген. Егер ол ағылшын алфавитінің кіші әрпі болса, оны бас әріпке ауыстырыңыз. Басқа символдарды өзгертпеңіз.

Мысал: a → A, B → B.$p1147$
    ),
    jsonb_build_object(
      'type','code','pageType','slide','templateId','code-example',
      'title',$c1147$ACMP №1147 — C++ шешімі$c1147$,
      'prompt',$p1147c$Кіші әріп диапазонын тауып, ASCII айырмасын қолданыңыз.$p1147c$,
      'starter',$s1147$#include <bits/stdc++.h>
using namespace std;

int main() {
    char c;
    cin >> c;
    if ('a' <= c && c <= 'z') {
        c = char(c - 'a' + 'A');
    }
    cout << c;
    return 0;
}$s1147$,
      'hints',jsonb_build_array($h1147$'a' мен 'A' әріптерінің арасы 32 код.$h1147$),
      'tests',jsonb_build_array(
        jsonb_build_object('input','a','out','A','label','Кіші әріп'),
        jsonb_build_object('input','B','out','B','label','Бас әріп')
      )
    ),

    jsonb_build_object(
      'type','content','pageType','scroll','templateId','theory',
      'title',$t1148$ACMP №1148 — Смена регистра · талдау$t1148$,
      'bullets',jsonb_build_array(
        $b1148$Деңгейі: L1, екі шартты тармақ.$b1148$,
        $b1148$Кіші әріп болса — бас әріпке, бас әріп болса — кіші әріпке ауыстырамыз.$b1148$,
        $b1148$Цифр, тыныс белгісі және басқа символдар өзгермейді.$b1148$,
        $b1148$ASCII тәсілі: кіші әріпке +('A'-'a'), бас әріпке +('a'-'A').$b1148$,
        $b1148$Күрделілік: O(1).$b1148$
      ),
      'prompt',$p1148$Шарты:
Ағылшын әрпінің регистрін ауыстырыңыз: бас әріпті кішіге, кішіні бас әріпке. Әріп емес символ сол күйінде қалсын.

Мысал: a → A, B → b.$p1148$
    ),
    jsonb_build_object(
      'type','code','pageType','slide','templateId','code-example',
      'title',$c1148$ACMP №1148 — C++ шешімі$c1148$,
      'prompt',$p1148c$Екі диапазонды бөлек тексеріңіз.$p1148c$,
      'starter',$s1148$#include <bits/stdc++.h>
using namespace std;

int main() {
    char c;
    cin >> c;

    if ('a' <= c && c <= 'z') {
        c = char(c - 'a' + 'A');
    } else if ('A' <= c && c <= 'Z') {
        c = char(c - 'A' + 'a');
    }

    cout << c;
    return 0;
}$s1148$,
      'hints',jsonb_build_array($h1148$else тармағында тек бас әріп диапазонын тексеріңіз.$h1148$),
      'tests',jsonb_build_array(
        jsonb_build_object('input','a','out','A','label','Кіші әріп'),
        jsonb_build_object('input','B','out','b','label','Бас әріп'),
        jsonb_build_object('input','7','out','7','label','Цифр')
      )
    ),

    jsonb_build_object(
      'type','content','pageType','scroll','templateId','theory',
      'title',$tpass$Пароль — тексеру · талдау$tpass$,
      'bullets',jsonb_build_array(
        $bpass$Деңгейі: L1/L2, жол және символ санаттарын санау.$bpass$,
        $bpass$Берілген кодтағы a--, b--, c-- қауіпті: unsigned мән 0-ден төмен түссе, үлкен санға айналады.$bpass$,
        $bpass$Талаптарды азайтпай, нақты санағыштармен тексеру қауіпсіз: upper >= A, lower >= B, digit >= C.$bpass$,
        $bpass$Пароль ұзындығы n-ге тең болуы және барлық символдар рұқсат етілген санаттарға кіруі керек.$bpass$,
        $bpass$Күрделілік: O(n), жады: O(1). Шеткі жағдай: ұзындық сәйкес келмесе, бірден қате.$bpass$
      ),
      'prompt',$ppass$Пайдаланушы кодының мақсаты:
n, A, B, C және пароль берілген. Парольдің ұзындығы n-ге тең бе, ішінде кемінде A бас әріп, B кіші әріп және C цифр бар ма — тексеріңіз.

Негізгі түзету: unsigned санағыштарды азайтудың орнына символдарды санап, соңында салыстыру.$ppass$
    ),
    jsonb_build_object(
      'type','code','pageType','slide','templateId','code-example',
      'title',$cpass$Пароль — түзетілген C++ шешімі$cpass$,
      'prompt',$ppassc$Пайдаланушы жіберген кодтағы underflow және толық емес output мәселелерін түзетіңіз.$ppassc$,
      'starter',$spass$#include <bits/stdc++.h>
using namespace std;

int main() {
    int n, needUpper, needLower, needDigit;
    cin >> n >> needUpper >> needLower >> needDigit;

    string password;
    cin >> password;

    int upper = 0, lower = 0, digit = 0;
    for (char c : password) {
        if ('A' <= c && c <= 'Z') ++upper;
        else if ('a' <= c && c <= 'z') ++lower;
        else if ('0' <= c && c <= '9') ++digit;
    }

    bool good = password.size() == size_t(n)
        && upper >= needUpper
        && lower >= needLower
        && digit >= needDigit;

    cout << (good ? "The password is correct"
                  : "The password is incorrect");
    return 0;
}$spass$,
      'hints',jsonb_build_array(
        $hpass$unsigned типін емес, int санағыштарын қолданыңыз.$hpass$,
        $hpass$Символдың бір санатқа ғана түсуі үшін else if қолданыңыз.$hpass$
      ),
      'tests',jsonb_build_array(
        jsonb_build_object('input','8 2 5 1 PasSw0rd','out','The password is correct','label','Дұрыс пароль'),
        jsonb_build_object('input','5 1 1 1 abcde','out','The password is incorrect','label','Талап орындалмайды')
      )
    ),

    jsonb_build_object(
      'type','content','pageType','scroll','templateId','theory',
      'title',$t1198$ACMP №1198 — Генератор паролей · талдау$t1198$,
      'bullets',jsonb_build_array(
        $b1198$Деңгейі: L2, greedy және char санаттары.$b1198$,
        $b1198$Алдымен міндетті A бас әріп, B кіші әріп, C цифр санын орналастырамыз.$b1198$,
        $b1198$Қалған N − A − B − C орынға рұқсат етілген кез келген символдарды қосамыз.$b1198$,
        $b1198$Қатар екі символ бірдей болмауы үшін әр санатта символдарды циклмен ауыстырып таңдаймыз.$b1198$,
        $b1198$Күрделілік: O(N), жады: O(N).$b1198$,
        $b1198$Шеткі жағдай: A+B+C=N болса, қосымша символ толтыру қажет емес.$b1198$
      ),
      'prompt',$p1198$Шарты:
Ұзындығы N болатын пароль құрыңыз. Онда кемінде A бас әріп, B кіші әріп және C цифр болсын. Қатар тұрған екі символ бірдей болмасын.

Мысал: N=8, A=2, B=5, C=1 үшін PasSw0rd сияқты кез келген дұрыс пароль жарайды.$p1198$
    ),
    jsonb_build_object(
      'type','code','pageType','slide','templateId','code-example',
      'title',$c1198$ACMP №1198 — C++ шешімі$c1198$,
      'prompt',$p1198c$Міндетті санаттарды орындап, әр санаттағы әртүрлі символдарды кезекпен таңдаңыз.$p1198c$,
      'starter',$s1198$#include <bits/stdc++.h>
using namespace std;

int main() {
    int n, a, b, c;
    cin >> n >> a >> b >> c;

    string upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    string lower = "abcdefghijklmnopqrstuvwxyz";
    string digits = "0123456789";
    string answer;
    int iu = 0, il = 0, id = 0;

    auto addFrom = [&](const string& pool, int& need, int& index) {
        while (need > 0) {
            char candidate = pool[index++ % pool.size()];
            if (!answer.empty() && answer.back() == candidate) continue;
            answer += candidate;
            --need;
        }
    };

    addFrom(upper, a, iu);
    addFrom(lower, b, il);
    addFrom(digits, c, id);

    string all = upper + lower + digits;
    int p = 0;
    while ((int)answer.size() < n) {
        char candidate = all[p++ % all.size()];
        if (!answer.empty() && answer.back() == candidate) continue;
        answer += candidate;
    }

    cout << answer;
    return 0;
}$s1198$,
      'hints',jsonb_build_array($h1198$A+B+C <= N екенін пайдаланыңыз.$h1198$,$h1198$Бірдей көршілес символды өткізіп жіберіңіз.$h1198$),
      'tests',jsonb_build_array(
        jsonb_build_object('input','8 2 5 1','out','any valid password of length 8','label','Берілген мысал'),
        jsonb_build_object('input','3 1 1 1','out','any valid password of length 3','label','Тек міндетті символдар')
      )
    ),

    jsonb_build_object(
      'type','content','pageType','scroll','templateId','theory',
      'title',$t1153$ACMP №1153 — Благозвучное слово · талдау$t1153$,
      'bullets',jsonb_build_array(
        $b1153$Деңгейі: L2, бір өтімді greedy.$b1153$,
        $b1153$Дауыстылар: a, e, i, o, u, y; қалғандары дауыссыз.$b1153$,
        $b1153$Үшінші қатар тұрған бірдей типтегі әріп келгенде, олардың арасына қарсы типтегі бір әріп қосуға болады.$b1153$,
        $b1153$Сол сәттен кейін қатардың ұзындығын 1 деп жалғастырамыз.$b1153$,
        $b1153$Күрделілік: O(|s|), жады: O(1).$b1153$
      ),
      'prompt',$p1153$Шарты:
Сөзде қатарынан үш дауысты немесе үш дауыссыз болмауы керек. Қажет болса, кез келген жерге ең аз әріп санын қосыңыз.

Мысал: program → 0, school → 1.$p1153$
    ),
    jsonb_build_object(
      'type','code','pageType','slide','templateId','code-example',
      'title',$c1153$ACMP №1153 — C++ шешімі$c1153$,
      'prompt',$p1153c$Әріптердің ағымдағы дауысты/дауыссыз қатар ұзындығын сақтаңыз.$p1153c$,
      'starter',$s1153$#include <bits/stdc++.h>
using namespace std;

bool isVowel(char c) {
    return c == 'a' || c == 'e' || c == 'i' ||
           c == 'o' || c == 'u' || c == 'y';
}

int main() {
    string s;
    cin >> s;

    int vowels = 0, consonants = 0, answer = 0;
    for (char c : s) {
        if (isVowel(c)) {
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
    return 0;
}$s1153$,
      'hints',jsonb_build_array($h1153$Үшінші әріптің алдына қарсы типтегі бір символ қосылды деп есептеңіз.$h1153$),
      'tests',jsonb_build_array(
        jsonb_build_object('input','program','out','0','label','Өзгеріс қажет емес'),
        jsonb_build_object('input','school','out','1','label','Үш дауыссыз')
      )
    ),

    jsonb_build_object(
      'type','content','pageType','scroll','templateId','theory',
      'title',$t1154$ACMP №1154 — IP-адрес · талдау$t1154$,
      'bullets',jsonb_build_array(
        $b1154$Деңгейі: L2, stringstream және бөліктерді тексеру.$b1154$,
        $b1154$Жол нүкте бойынша дәл төрт бөлікке бөлінуі керек.$b1154$,
        $b1154$Әр бөлік бос емес, тек цифрлардан тұрады және 0..255 аралығында болады.$b1154$,
        $b1154$Алдыңғы нөлдерге тыйым салынбаған: 000, 0255 мысалдары шартта дұрыс ретінде берілген.$b1154$,
        $b1154$Күрделілік: O(|s|), жады: O(|s|).$b1154$
      ),
      'prompt',$p1154$Шарты:
Нүктелермен бөлінген жолдың дұрыс IPv4 адрес екенін анықтаңыз. Дұрыс болса Good, әйтпесе Bad шығарыңыз.

Мысал: 192.168.5.12 → Good, 88.144.996.11 → Bad.$p1154$
    ),
    jsonb_build_object(
      'type','code','pageType','slide','templateId','code-example',
      'title',$c1154$ACMP №1154 — C++ шешімі$c1154$,
      'prompt',$p1154c$Нүкте бойынша бөліп, төрт октеттің әрқайсысын жеке тексеріңіз.$p1154c$,
      'starter',$s1154$#include <bits/stdc++.h>
using namespace std;

int main() {
    string s, part;
    cin >> s;

    stringstream in(s);
    bool good = true;
    int parts = 0;

    while (getline(in, part, '.')) {
        ++parts;
        if (part.empty() || part.size() > 3) {
            good = false;
            continue;
        }

        int value = 0;
        for (char c : part) {
            if (c < '0' || c > '9') good = false;
            else value = value * 10 + (c - '0');
        }
        if (value > 255) good = false;
    }

    if (parts != 4) good = false;
    cout << (good ? "Good" : "Bad");
    return 0;
}$s1154$,
      'hints',jsonb_build_array($h1154$996 саны 255-тен үлкен, сондықтан Bad.$h1154$,$h1154$Бос бөлік, мысалы 1..2, жарамсыз.$h1154$),
      'tests',jsonb_build_array(
        jsonb_build_object('input','192.168.5.12','out','Good','label','Дұрыс IP'),
        jsonb_build_object('input','88.144.996.11','out','Bad','label','Октет 255-тен үлкен')
      )
    )
  );

  v_binary_tasks := jsonb_build_array(
    jsonb_build_object(
      'type','content','pageType','scroll','templateId','theory',
      'title',$t1465$ACMP №1465 — Угадай число · талдау$t1465$,
      'bullets',jsonb_build_array(
        $b1465$Деңгейі: L2, интерактивті бинарлық іздеу.$b1465$,
        $b1465$Іздеу аралығы: [1, 10⁹]. Орта мәнді сұрап, жауапқа қарай бір жартысын алып тастаймыз.$b1465$,
        $b1465$< жауабы N < X дегенді білдіреді, сондықтан right = mid - 1.$b1465$,
        $b1465$> жауабы N > X дегенді білдіреді, сондықтан left = mid + 1.$b1465$,
        $b1465$= келгенде бірден аяқталамыз. Әр сұраудан кейін flush қажет.$b1465$,
        $b1465$Күрделілік: O(log 10⁹) ≈ 30 сұрақ, бұл 100 сұрақ шегінен аз.$b1465$
      ),
      'prompt',$p1465$Шарты:
Жюри 1..10⁹ аралығында сан жасырады. Сіздің программаңыз X санын шығарады, жюри <, > немесе = деп жауап береді. Санның өзін 100 сұрақтан аспай табыңыз.

Бұл — интерактивті есеп: cout << endl немесе cout.flush() арқылы буферді тазалау керек.$p1465$
    ),
    jsonb_build_object(
      'type','code','pageType','slide','templateId','code-example',
      'title',$c1465$ACMP №1465 — C++ шешімі$c1465$,
      'prompt',$p1465c$Жауап таңбасына қарай [left, right] аралығын тарылтыңыз.$p1465c$,
      'starter',$s1465$#include <bits/stdc++.h>
using namespace std;

int main() {
    long long left = 1, right = 1000000000LL;

    while (left <= right) {
        long long mid = left + (right - left) / 2;
        cout << mid << endl; // endl буферді тазартады

        char answer;
        cin >> answer;
        if (answer == '=') return 0;
        if (answer == '<') right = mid - 1;
        else if (answer == '>') left = mid + 1;
        else return 0;
    }
    return 0;
}$s1465$,
      'hints',jsonb_build_array($h1465$< және > белгілерінің мағынасын шарттан дәл оқыңыз.$h1465$,$h1465$Интерактивті есепте әр output-тан кейін flush жасаңыз.$h1465$),
      'tests',jsonb_build_array(jsonb_build_object('input','> < < =','out','3 10 8 6','label','Интерактивті протокол'))
    ),

    jsonb_build_object(
      'type','content','pageType','scroll','templateId','theory',
      'title',$t267$ACMP №267 — Ксерокопии · талдау$t267$,
      'bullets',jsonb_build_array(
        $b267$Деңгейі: L2, жауап бойынша бинарлық іздеу.$b267$,
        $b267$Алғашқы көшірмені жылдамырақ ксерокс жасайды: first = min(x,y).$b267$,
        $b267$Уақыт t болғанда көшірме саны: 1 + (t-first)/x + (t-first)/y.$b267$,
        $b267$check(t) осы сан N-нен кем емес екенін тексереді; ол монотонды.$b267$,
        $b267$Күрделілік: O(log answer), жады: O(1).$b267$,
        $b267$Шеткі жағдай: N=1 болса, жауап min(x,y).$b267$
      ),
      'prompt',$p267$Шарты:
N көшірме керек. Бір ксерокс бір парақты x секундта, екіншісі y секундта көшіреді. Екеуін қатар қолдануға болады. Минималды уақытты табыңыз.

Мысал: 4 1 1 → 3, 5 1 2 → 4.$p267$
    ),
    jsonb_build_object(
      'type','code','pageType','slide','templateId','code-example',
      'title',$c267$ACMP №267 — C++ шешімі$c267$,
      'prompt',$p267c$Белгілі уақыт ішінде қанша көшірме шығатынын тексеретін predicate құрыңыз.$p267c$,
      'starter',$s267$#include <bits/stdc++.h>
using namespace std;

int main() {
    long long n, x, y;
    cin >> n >> x >> y;

    long long first = min(x, y);
    long long left = first;
    long long right = first + (n - 1) * max(x, y);

    while (left < right) {
        long long mid = left + (right - left) / 2;
        long long copies = 1 + (mid - first) / x + (mid - first) / y;
        if (copies >= n) right = mid;
        else left = mid + 1;
    }

    cout << left;
    return 0;
}$s267$,
      'hints',jsonb_build_array($h267$Алғашқы көшірме дайын болмай тұрып екі ксерокс та жұмыс істей алмайды.$h267$,$h267$right шекарасы үшін long long қолданыңыз.$h267$),
      'tests',jsonb_build_array(
        jsonb_build_object('input','4 1 1','out','3','label','Екі бірдей ксерокс'),
        jsonb_build_object('input','5 1 2','out','4','label','Жылдамдығы әртүрлі')
      )
    ),

    jsonb_build_object(
      'type','content','pageType','scroll','templateId','theory',
      'title',$tdiplomas$Дипломы — талдау$tdiplomas$,
      'bullets',jsonb_build_array(
        $bdiplomas$Деңгейі: L2, монотонды predicate және 64-биттік бүтін сандар.$bdiplomas$,
        $bdiplomas$Квадрат тақта қабырғасы s болсын. Бір қатарға floor(s/w), бір бағанға floor(s/h) диплом сияды.$bdiplomas$,
        $bdiplomas$check(s): floor(s/w) * floor(s/h) >= n.$bdiplomas$,
        $bdiplomas$check(s) true болса, үлкен тақта да жарайды, сондықтан бинарлық іздеуге болады.$bdiplomas$,
        $bdiplomas$Күрделілік: O(log (w·n)), жады: O(1).$bdiplomas$,
        $bdiplomas$Шеткі жағдай: n=1 болса, жауап max(w,h).$bdiplomas$
      ),
      'prompt',$pdiplomas$Шарты:
Өлшемі w×h болатын n дипломды квадрат тақтаға орналастыру керек. Дипломдар қабырғалары тақта қабырғаларына параллель орналасады. Қажетті квадраттың ең кіші қабырғасын табыңыз.

Мысал: w=2, h=3, n=10 → 9.$pdiplomas$
    ),
    jsonb_build_object(
      'type','code','pageType','slide','templateId','code-example',
      'title',$cdiplomas$Дипломы — C++ шешімі$cdiplomas$,
      'prompt',$pdiplomasc$Тақта қабырғасын бинарлық іздеу арқылы табыңыз.$pdiplomasc$,
      'starter',$sdiplomas$#include <bits/stdc++.h>
using namespace std;

int main() {
    long long w, h, n;
    cin >> w >> h >> n;

    long long left = max(w, h);
    long long right = max(w, h) * n;

    while (left < right) {
        long long mid = left + (right - left) / 2;
        __int128 rows = mid / w;
        __int128 cols = mid / h;
        if (rows * cols >= n) right = mid;
        else left = mid + 1;
    }

    cout << left;
    return 0;
}$sdiplomas$,
      'hints',jsonb_build_array($hdiplomas$Көбейту overflow болмауы үшін __int128 қолдануға болады.$hdiplomas$,$hdiplomas$right = max(w,h)*n жарамды жоғарғы шекара.$hdiplomas$),
      'tests',jsonb_build_array(
        jsonb_build_object('input','2 3 10','out','9','label','Суреттегі мысал'),
        jsonb_build_object('input','1 1 1','out','1','label','Бір диплом')
      )
    ),

    jsonb_build_object(
      'type','content','pageType','scroll','templateId','theory',
      'title',$t1131$ACMP №1131 — Корень кубического уравнения · талдау$t1131$,
      'bullets',jsonb_build_array(
        $b1131$Деңгейі: L2, вещественный бинарлық іздеу.$b1131$,
        $b1131$Функция f(x)=ax³+bx²+cx+d. Бір ғана нақты түбір болғандықтан, [-2000,2000] аралығында түбірді іздеуге болады.$b1131$,
        $b1131$Егер f(left) пен f(mid) таңбалары қарама-қарсы болса, түбір [left,mid] ішінде; әйтпесе [mid,right] ішінде.$b1131$,
        $b1131$100 итерациядан кейін қате өте кіші болады.$b1131$,
        $b1131$Күрделілік: O(1) — итерация саны алдын ала бекітілген; жады: O(1).$b1131$
      ),
      'prompt',$p1131$Шарты:
ax³ + bx² + cx + d = 0 теңдеуінің бір ғана нақты түбірі бар. Сол түбірді кемінде үш ондық таңбамен табыңыз.

Мысал: 2 -6 6 -2 → 1; -1 -6 -12 -7 → -1.$p1131$
    ),
    jsonb_build_object(
      'type','code','pageType','slide','templateId','code-example',
      'title',$c1131$ACMP №1131 — C++ шешімі$c1131$,
      'prompt',$p1131c$Функция мәндерінің таңбасын пайдаланып, вещественный бинарлық іздеу жасаңыз.$p1131c$,
      'starter',$s1131$#include <bits/stdc++.h>
using namespace std;

long double f(long double x, long double a, long double b,
              long double c, long double d) {
    return ((a * x + b) * x + c) * x + d;
}

int main() {
    long double a, b, c, d;
    cin >> a >> b >> c >> d;

    long double left = -2000, right = 2000;
    for (int step = 0; step < 100; ++step) {
        long double mid = (left + right) / 2;
        if (f(left, a, b, c, d) * f(mid, a, b, c, d) <= 0)
            right = mid;
        else
            left = mid;
    }

    cout << fixed << setprecision(4) << (left + right) / 2;
    return 0;
}$s1131$,
      'hints',jsonb_build_array($h1131$Горнер схемасы функцияны тұрақты амалдармен есептейді.$h1131$,$h1131$Нәтижені long double арқылы есептеңіз.$h1131$),
      'tests',jsonb_build_array(
        jsonb_build_object('input','2 -6 6 -2','out','1.0000','label','Түбір 1'),
        jsonb_build_object('input','-1 -6 -12 -7','out','-1.0000','label','Түбір -1')
      )
    )
  );

  select l.id into v_char_lesson
  from public.cf_lessons l
  where l.owner_id = v_owner and l.title = 'Символьный тип (char)'
  limit 1;

  if v_char_lesson is null then
    raise exception 'Символьный тип (char) дәрісі табылмады';
  end if;

  select coalesce(jsonb_agg(x.item order by x.ord), '[]'::jsonb)
    into v_old_slides
  from public.cf_lessons l,
       jsonb_array_elements(coalesce(l.slides, '[]'::jsonb)) with ordinality as x(item, ord)
  where l.id = v_char_lesson
    and coalesce(x.item->>'title','') not in (
      'ACMP №1146 — Цифра · талдау',
      'ACMP №1146 — C++ шешімі',
      'ACMP №1147 — Верхний регистр · талдау',
      'ACMP №1147 — C++ шешімі',
      'ACMP №1148 — Смена регистра · талдау',
      'ACMP №1148 — C++ шешімі',
      'Пароль — тексеру · талдау',
      'Пароль — түзетілген C++ шешімі',
      'ACMP №1198 — Генератор паролей · талдау',
      'ACMP №1198 — C++ шешімі',
      'ACMP №1153 — Благозвучное слово · талдау',
      'ACMP №1153 — C++ шешімі',
      'ACMP №1154 — IP-адрес · талдау',
      'ACMP №1154 — C++ шешімі'
    );

  update public.cf_lessons
  set slides = v_old_slides || v_char_tasks,
      updated_at = now()
  where id = v_char_lesson;

  select l.id into v_binary_lesson
  from public.cf_lessons l
  where l.owner_id = v_owner and l.title = 'Бинарный поиск'
  limit 1;

  if v_binary_lesson is null then
    raise exception 'Бинарный поиск дәрісі табылмады';
  end if;

  select coalesce(jsonb_agg(x.item order by x.ord), '[]'::jsonb)
    into v_old_slides
  from public.cf_lessons l,
       jsonb_array_elements(coalesce(l.slides, '[]'::jsonb)) with ordinality as x(item, ord)
  where l.id = v_binary_lesson
    and coalesce(x.item->>'title','') not in (
      'ACMP №1465 — Угадай число · талдау',
      'ACMP №1465 — C++ шешімі',
      'ACMP №267 — Ксерокопии · талдау',
      'ACMP №267 — C++ шешімі',
      'Дипломы — талдау',
      'Дипломы — C++ шешімі',
      'ACMP №1131 — Корень кубического уравнения · талдау',
      'ACMP №1131 — C++ шешімі'
    );

  update public.cf_lessons
  set slides = v_old_slides || v_binary_tasks,
      updated_at = now()
  where id = v_binary_lesson;
end;
$acmp_more_tasks$;
