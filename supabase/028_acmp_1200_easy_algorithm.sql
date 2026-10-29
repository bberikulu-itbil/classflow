-- Make the ACMP #1200 explanation more beginner-friendly.
do $acmp_1200_easy_algorithm$
declare
  v_owner uuid;
  v_source uuid;
  v_slides jsonb;
begin
  select c.owner_id into v_owner
  from public.cf_curr_courses c
  where c.id = 'dbe60970-1fa6-4a8a-a65e-051d20cfd278'
    and c.title = 'ACMP: Язык программирования C++';

  select l.id into v_source
  from public.cf_lessons l
  where l.owner_id = v_owner
    and l.title = 'Жол түрі (string)'
  limit 1;

  select jsonb_agg(
    case
      when slide->>'title' = 'ACMP №1200 · Ретін өзгерт' then
        slide || jsonb_build_object(
          'sections',
          jsonb_set(
            jsonb_set(
              jsonb_set(
                jsonb_set(
                  jsonb_set(
                    slide->'sections',
                    '{1,text}',
                    to_jsonb($p1200_easy_explain$Ең қарапайым тәсіл — қосымша кітапхана қоспай, жолдың соңынан бастап сөздерді бір-бірден алу. Мысалы, "Ivanov Petrov Sidorov" жолында соңғы сөзді пробелге дейін іздейміз, оны нәтижеге қосамыз, содан кейін сол жақтағы сөзге өтеміз. Осылайша символдардың емес, фамилиялардың реті ғана өзгереді.

Самый простой способ — без stringstream, vector и reverse. Идём с конца строки, находим ближайший пробел, берём слово через substr и добавляем его в результат. Так меняется порядок фамилий, а буквы внутри фамилий остаются без изменений.$p1200_easy_explain$::text)
                  ),
                  '{2,bullets}',
                  jsonb_build_array(
                    $kz$1. K санын оқыңыз. Бірінші getline қалған жол соңын ғана оқиды.$kz$,
                    $kz$2. Әр жолды getline арқылы толық оқыңыз.$kz$,
                    $kz$3. end индексін жолдың соңына қойыңыз және start индексін солға жылжытып, пробелді табыңыз.$kz$,
                    $kz$4. Табылған сөзді substr арқылы result жолына қосыңыз.$kz$,
                    $kz$5. end=start-1 деп қойып, келесі сөзге өтіңіз.$kz$,
                    $kz$6. result жолын шығарыңыз.$kz$,
                    $ru$1. Считать K. Первый getline забирает оставшийся перевод строки.$ru$,
                    $ru$2. Каждую строку полностью прочитать через getline.$ru$,
                    $ru$3. Поставить end в конец строки и двигать start влево до пробела.$ru$,
                    $ru$4. Добавить найденное слово в result с помощью substr.$ru$,
                    $ru$5. Установить end=start-1 и перейти к следующему слову.$ru$,
                    $ru$6. Вывести result.$ru$
                  )
                ),
                '{3,text}',
                to_jsonb($p1200_easy_data$string line, result; int start, end.$p1200_easy_data$::text)
              ),
              '{4,text}',
              to_jsonb($p1200_easy_pseudo$оқу K
оқу line  // қалған жол соңын өткізу
K рет қайтала:
  line ← getline арқылы толық жолды оқу
  result ← ""
  end ← line.length()-1
  әзір end >= 0:
    start ← end
    әзір start >= 0 және line[start] != ' ': start--
    result += line.substr(start+1, end-start)
    егер start >= 0: result += " "
    end ← start-1
  шығару result

прочитать K
прочитать line  // забрать конец первой строки
повторить K раз:
  line ← прочитать всю строку через getline
  result ← ""
  end ← line.length()-1
  пока end >= 0:
    start ← end
    пока start >= 0 и line[start] != ' ': start--
    result += line.substr(start+1, end-start)
    если start >= 0: result += " "
    end ← start-1
  вывести result$p1200_easy_pseudo$::text)
            ),
            '{5,code}',
            to_jsonb($p1200_easy_code$#include <iostream>
#include <string>
using namespace std;

int main() {
    int k;
    cin >> k;

    string line;
    getline(cin, line); // оқылмаған жол соңын өткізу

    while (k--) {
        getline(cin, line);
        string result;
        int end = (int)line.length() - 1;

        while (end >= 0) {
            int start = end;
            while (start >= 0 && line[start] != ' ') --start;

            result += line.substr(start + 1, end - start);
            if (start >= 0) result += ' ';
            end = start - 1;
        }

        cout << result;
        if (k) cout << '\n';
    }
    }$p1200_easy_code$::text)
          )
        )
      else slide
    end
    order by slide_no
  ) into v_slides
  from jsonb_array_elements((select slides from public.cf_lessons where id = v_source)) with ordinality as pages(slide, slide_no);

  update public.cf_lessons
  set slides = v_slides,
      updated_at = now()
  where id = v_source;

  update public.cf_lessons target
  set slides = source.slides,
      plan = source.plan,
      terms = source.terms,
      updated_at = now()
  from public.cf_lessons source
  where source.id = v_source
    and target.owner_id = v_owner
    and target.title = 'Строковый тип (string)';
end;
$acmp_1200_easy_algorithm$;
