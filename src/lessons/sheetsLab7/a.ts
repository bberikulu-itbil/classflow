// Informatics 7, textbook chapter 3, lessons 3.1-3.4 (kk / ru / en). Every lesson is 45 minutes: 5 warm-up + 8 together + 10 by example + 15 practice + 7 check.
import { demoSheet, info, labTask, prefill, quiz, tag, titleSlide, type LabLesson } from '../sheetsLab/dsl';
import { SUBTITLE, plan, reflect } from './lib';
import { levels } from '../info10/lib';

const TIMETABLE: Record<string, string | [string, string, string]> = {
  A1: ['7А сынып · сабақ кестесі', '7А класс · расписание уроков', 'Class 7A · lesson timetable'],
  A2: '№', B2: ['Дүйсенбі', 'Понедельник', 'Monday'], C2: ['Сейсенбі', 'Вторник', 'Tuesday'], D2: ['Сәрсенбі', 'Среда', 'Wednesday'], E2: ['Бейсенбі', 'Четверг', 'Thursday'], F2: ['Жұма', 'Пятница', 'Friday'],
  A3: '1', B3: ['Информатика (компьютер сыныбы, 2-қабат)', 'Информатика (компьютерный класс, 2-й этаж)', 'Informatics (computer room, 2nd floor)'], C3: ['Алгебра', 'Алгебра', 'Algebra'], D3: ['Физика', 'Физика', 'Physics'], E3: ['Тарих', 'История', 'History'], F3: ['Биология', 'Биология', 'Biology'],
  A4: '2', B4: ['Қазақ тілі', 'Казахский язык', 'Kazakh'], C4: ['Ағылшын тілі', 'Английский язык', 'English'], D4: ['Геометрия', 'Геометрия', 'Geometry'], E4: ['Алгебра', 'Алгебра', 'Algebra'], F4: ['География', 'География', 'Geography'],
  A5: '3', B5: ['Орыс тілі', 'Русский язык', 'Russian'], C5: ['Дене шынықтыру', 'Физкультура', 'PE'], D5: ['Музыка', 'Музыка', 'Music'], E5: ['Химия', 'Химия', 'Chemistry'], F5: ['Әдебиет', 'Литература', 'Literature'],
  A6: '4', B6: ['Алгебра', 'Алгебра', 'Algebra'], C6: ['Тарих', 'История', 'History'], D6: ['Ағылшын тілі', 'Английский язык', 'English'], E6: ['Дене шынықтыру', 'Физкультура', 'PE'], F6: ['Өзін-өзі тану', 'Самопознание', 'Self-knowledge'],
};

export const L1: LabLesson = {
  id: 'inf7lab-1',
  title: ['3.1 Мәтіндік редактордағы кестелер', '3.1 Таблицы в текстовом редакторе', '3.1 Tables in a word processor'],
  summary: ['Кесте — жолдар мен бағандардан тұратын құрылым. Google Docs-та кесте қою, өлшемін өзгерту және пішімдеу.', 'Таблица — структура из строк и столбцов. Вставка, изменение размера и форматирование таблицы в Google Docs.', 'A table is a structure of rows and columns. Inserting, resizing and formatting a table in Google Docs.'],
  objectives: [
    ['Кестенің жолдары мен бағандарын ажырату', 'Различать строки и столбцы таблицы', 'Tell the rows and the columns of a table apart'],
    ['Мәтіндік редакторға берілген өлшемді кесте қою', 'Вставлять в текстовый редактор таблицу заданного размера', 'Insert a table of a given size into a word processor'],
    ['Кесте элементтерін пішімдеу: қаріп, түс, туралау, шекара', 'Форматировать элементы таблицы: шрифт, цвет, выравнивание, границы', 'Format table elements: font, colour, alignment, borders'],
  ],
  terms: [
    ['table', 'Кесте — жолдар мен бағандардан тұратын жиынтық', 'Таблица — набор строк и столбцов', 'Table — a set of rows and columns'],
    ['cell', 'Ұяшық — жол мен бағанның қиылысы', 'Ячейка — пересечение строки и столбца', 'Cell — where a row and a column meet'],
    ['landscape', 'Көлденең бет бағыты (альбомная)', 'Альбомная ориентация страницы', 'Landscape — the page is wider than it is tall'],
  ],
  plan: plan(
    ['Мәтіндік құжатты ашып, мәтін теріп, сақтай алады.', 'Умеют открыть текстовый документ, набрать текст и сохранить.', 'Can open a text document, type text and save it.'], '26–27',
    [['Кесте және құпия сөз туралы екі сұраққа жауап береді', 'Отвечает на два вопроса о таблице и пароле', 'Answers two questions about tables and passwords'],
     ['Кестенің не екенін және Google Docs-та қалай қойылатынын біледі', 'Узнаёт, что такое таблица и как вставить её в Google Docs', 'Learns what a table is and how to insert it in Google Docs'],
     ['Мұғаліммен бірге «Сабақ кестесін» пішімдеу қадамдарын орындайды', 'Вместе с учителем проходит шаги форматирования «Расписания»', 'Follows the formatting steps of the lesson schedule with the teacher'],
     ['Google Docs-та өз сабақ кестесін жасап, екі есеп шығарады', 'Делает своё расписание в Google Docs и решает две задачи', 'Builds the own lesson schedule in Google Docs and solves two problems'],
     ['Қысқа тест тапсырып, не үйренгенін айтады', 'Проходит короткий тест и говорит, что узнал', 'Takes a short test and says what was learned']]),
  slides: [
    titleSlide(['3.1 Мәтіндік редактордағы кестелер', '3.1 Таблицы в текстовом редакторе', '3.1 Tables in a word processor'], SUBTITLE('26–27')),
    tag(quiz(['Қайталау: кесте', 'Повторение: таблица', 'Review: tables'], ['Кесте неден тұрады?', 'Из чего состоит таблица?', 'What is a table made of?'],
      [['Жолдар мен бағандардан', 'Из строк и столбцов', 'Rows and columns'], ['Тек бағандардан', 'Только из столбцов', 'Columns only'], ['Тек суреттерден', 'Только из рисунков', 'Pictures only'], ['Тек сөйлемдерден', 'Только из предложений', 'Sentences only']], 0,
      ['Кесте — жолдар (көлденең) мен бағандардың (тік) жиынтығы.', 'Таблица — набор строк (горизонтально) и столбцов (вертикально).', 'A table is a set of rows (horizontal) and columns (vertical).']), 'warmup',
      ['5 минут. Жауаптарды телефоннан жіберіңдер. Кесте мысалы: сабақ кестесі, күнделік.', '5 минут. Ответы с телефона. Примеры таблиц: расписание, дневник.', '5 minutes. Answers from phones. Table examples: the timetable, the gradebook.']),
    tag(quiz(['Қайталау: құпия сөз', 'Повторение: пароль', 'Review: passwords'], ['Google аккаунтына қандай құпия сөз қою дұрыс?', 'Какой пароль правильно ставить на аккаунт Google?', 'Which password is right for a Google account?'],
      [['Ұзын, болжау қиын: әріптер, сандар, таңбалар', 'Длинный, трудно угадать: буквы, цифры, знаки', 'Long and hard to guess: letters, digits, symbols'], ['Өз атың', 'Своё имя', 'Your own name'], ['12345', '12345', '12345'], ['Туған күнің', 'Дата рождения', 'Your birthday']], 0,
      ['Күшті құпия сөз ұзын және болжау қиын болады. Оны ешкімге айтпа.', 'Надёжный пароль длинный и его трудно угадать. Никому его не говори.', 'A strong password is long and hard to guess. Tell it to nobody.']), 'warmup'),
    tag(info('explain', ['Кесте деген не?', 'Что такое таблица?', 'What is a table?'], [
      ['Кесте — жолдар мен бағандардан тұратын жиынтық. Ақпаратты кестемен көрсету мәтіннен гөрі оқуға оңай.', 'Таблица — набор строк и столбцов. Информацию в таблице читать проще, чем в сплошном тексте.', 'A table is a set of rows and columns. Information is easier to read in a table than in a paragraph.'],
      ['Google Docs-тағы кесте ұяшықтарына мәтін, сурет, тіпті басқа кесте салуға болады.', 'В ячейки таблицы Google Docs можно вставлять текст, рисунки и даже другую таблицу.', 'Cells of a Google Docs table can hold text, pictures or another table.'],
      ['Ұяшық — жол мен бағанның қиылысы.', 'Ячейка — пересечение строки и столбца.', 'A cell is where a row and a column meet.'],
    ], { art: 'anatomy' }), 'together'),
    tag(info('explain', ['Google аккаунт және Google Docs', 'Аккаунт Google и Google Docs', 'Google account and Google Docs'], [
      ['gmail.com сайтына кір, «Create an account» бас, форманы толтыр. Аккаунт атына тегің мен атыңды қолдан: omarov.almas.', 'Зайди на gmail.com, нажми «Create an account», заполни форму. В имени аккаунта используй фамилию и имя: omarov.almas.', 'Go to gmail.com, click “Create an account” and fill in the form. Build the account name from your surname and name: omarov.almas.'],
      ['drive.google.com-да «NEW» → Google Docs таңда. «Untitled document» атын «Менің сабақ кестем» деп ауыстыр.', 'На drive.google.com выбери «NEW» → Google Docs. Переименуй «Untitled document» в «Моё расписание».', 'On drive.google.com choose “NEW” → Google Docs. Rename “Untitled document” to “My lessons schedule”.'],
      ['Аккаунт ашу мектеп ережесіне сай болуы керек. Аккаунт жоқ оқушы ClassFlow кестесінде жұмыс істейді.', 'Аккаунт создаётся по правилам школы. Ученик без аккаунта работает в таблице ClassFlow.', 'An account must follow the school rules. A student without one works in the ClassFlow sheet.'],
    ], { art: 'gdocs' }), 'together', ['Аккаунт ашу — үйде, ата-ананың рұқсатымен. Сабақта дайын аккаунты барлар Docs ашады, қалғандары көршісімен жұптасады.', 'Создание аккаунта — дома, с разрешения родителей. На уроке работают те, у кого аккаунт уже есть, остальные — в паре.', 'Creating an account is for home, with a parent’s permission. In class those who have one open Docs, the others work in pairs.']),
    tag(demoSheet(['Сабақ кестесін жасаймыз', 'Делаем расписание уроков', 'Making a lesson schedule'], [
      ['File → Page setup → Landscape: бетті көлденең етіп аламыз.', 'File → Page setup → Landscape: делаем страницу альбомной.', 'File → Page setup → Landscape: turn the page sideways.'],
      ['Insert → Table → 7 × 9 таңда: 6 күн, күніне 8 сабақ, және тақырып жолы мен бағаны.', 'Insert → Table → выбери 7 × 9: 6 дней, 8 уроков в день, плюс строка и столбец заголовков.', 'Insert → Table → choose 7 × 9: 6 days, 8 lessons a day, plus a header row and column.'],
      ['Table → Table properties: «Minimum row height» = 1.5, ал бағандар енін 4 қыл. Бірінші баған шекарасын сүйреп те өзгертуге болады.', 'Table → Table properties: «Minimum row height» = 1.5, ширину столбцов поставь 4. Первый столбец можно тянуть за границу.', 'Table → Table properties: “Minimum row height” = 1.5 and column width 4. You can also drag the border of the first column.'],
    ], {
      rows: 9, cols: 7,
      cells: {
        A1: ['№', '№', '#'], B1: ['Дс', 'Пн', 'Mon'], C1: ['Сс', 'Вт', 'Tue'], D1: ['Ср', 'Ср', 'Wed'], E1: ['Бс', 'Чт', 'Thu'], F1: ['Жм', 'Пт', 'Fri'], G1: ['Сб', 'Сб', 'Sat'],
        A2: '1', A3: '2', A4: '3', A5: '4', A6: '5', A7: '6', A8: '7', A9: '8',
        B2: ['Алгебра', 'Алгебра', 'Algebra'], C2: ['Қазақ тілі', 'Казахский язык', 'Kazakh'], D2: ['Физика', 'Физика', 'Physics'], E2: ['Тарих', 'История', 'History'], F2: ['Информатика', 'Информатика', 'Informatics'], G2: ['Дене шынықтыру', 'Физкультура', 'PE'],
        B3: ['Ағылшын тілі', 'Английский язык', 'English'], C3: ['Геометрия', 'Геометрия', 'Geometry'], D3: ['Биология', 'Биология', 'Biology'], E3: ['Алгебра', 'Алгебра', 'Algebra'], F3: ['География', 'География', 'Geography'], G3: ['Музыка', 'Музыка', 'Music'],
      },
      fmt: { A1: { bold: true }, B1: { bold: true }, C1: { bold: true }, D1: { bold: true }, E1: { bold: true }, F1: { bold: true }, G1: { bold: true } },
    }), 'example', ['10 минут. Экраннан қадамдарды көрсетіп, оқушылар қатар қайталайды. 7 × 9 = 63 ұяшық: келесі есептің дайындығы.', '10 минут. Показывайте шаги на экране, ученики повторяют. 7 × 9 = 63 ячейки: это подготовка к следующей задаче.', '10 minutes. Show the steps on the screen while students repeat. 7 × 9 = 63 cells: it prepares the next problem.']),
    tag(info('example', ['Пішімдеу құралдары', 'Инструменты форматирования', 'Formatting tools'], [
      ['Қаріп өлшемі; қалың (Ctrl+B), көлбеу (Ctrl+I), асты сызылған (Ctrl+U) және мәтін түсі.', 'Размер шрифта; полужирный (Ctrl+B), курсив (Ctrl+I), подчёркнутый (Ctrl+U) и цвет текста.', 'Font size; bold (Ctrl+B), italic (Ctrl+I), underline (Ctrl+U) and text colour.'],
      ['Туралау: сол жаққа, ортаға, оң жаққа, ені бойынша.', 'Выравнивание: по левому краю, по центру, по правому краю, по ширине.', 'Alignment: left, centre, right, justify.'],
      ['Ұяшықтың фон түсі мен шекара түсі.', 'Цвет заливки ячейки и цвет границ.', 'Cell background colour and border colour.'],
      ['Ұяшықтарды біріктіру: бірнеше ұяшықты белгілеп, тінтуірдің оң жағы → «Merge cells». Кестенің тақырыбы бір ұяшыққа сыяды.', 'Объединение ячеек: выдели несколько ячеек, правая кнопка мыши → «Merge cells». Заголовок таблицы помещается в одну ячейку.', 'Merging cells: select several cells, right-click → “Merge cells”. The table title fits in one cell.'],
    ], { art: 'tabletools' }), 'example'),
    tag(info('practice', ['Практика: менің сабақ кестем', 'Практика: моё расписание', 'Practice: my lesson schedule'], [
      ['Google Docs-та 7 × 9 кесте жасап, апталық сабақ кестеңді толтыр.', 'В Google Docs сделай таблицу 7 × 9 и заполни своё недельное расписание.', 'In Google Docs make a 7 × 9 table and fill in your weekly timetable.'],
      ['Үстіне тақырып жолын қосып, ұяшықтарын біріктір. Тақырып жолы мен бағанын қалың қаріппен, түспен ерекшеле; мәтінді ұяшық ортасына туралау.', 'Добавь сверху строку названия и объедини её ячейки. Выдели строку и столбец заголовков жирным шрифтом и цветом; выровняй текст по центру ячеек.', 'Add a title row on top and merge its cells. Make the header row and column bold and coloured; centre the text in the cells.'],
      ['Қосымша: «Сыныптастар туралы» және «Менің бағаларым» кестелерін жаса. Дайын құжатты мұғалімге көрсет.', 'Дополнительно: сделай таблицы «Об одноклассниках» и «Мои оценки». Покажи готовый документ учителю.', 'Extra: make the tables “About classmates” and “My gradebook”. Show the finished document to the teacher.'],
    ], { art: 'timetable' }), 'practice', ['15 минут. Құжатты мұғалім экраннан тексереді: көлденең бет, 7 × 9, түсті тақырып, туралау. Төмендегі екі есеп — автоматты тексеріледі.', '15 минут. Учитель проверяет документ на экране: альбомная страница, 7 × 9, цветной заголовок, выравнивание. Две задачи ниже проверяются автоматически.', '15 minutes. The teacher checks the document on screen: landscape, 7 × 9, coloured header, alignment. The two problems below are marked automatically.']),
    tag(prefill(labTask(['Практика: сабақ кестесін пішімде', 'Практика: оформи расписание', 'Practice: format the timetable'],
      ['Кесте дайын. Оны платформа кестесінде Google Docs-тағыдай пішімде: тақырыпты біріктір, тақырып жолын ерекшеле, ұзын мәтінді тасымалда. Сосын «Жіберу» бас.', 'Таблица готова. Оформи её в таблице платформы так же, как в Google Docs: объедини заголовок, выдели строку заголовков, перенеси длинный текст. Затем нажми «Отправить».', 'The table is ready. Format it in the platform sheet the way you would in Google Docs: merge the title, highlight the header row, wrap the long text. Then press “Send”.'],
      {
        pic: { name: 'g7-timetable', title: ['7А сынып · сабақ кестесі', '7А класс · расписание', 'Class 7A · timetable'], cols: 6, rows: 6, widths: [50, 150, 110, 110, 110, 110], ask: [], data: TIMETABLE },
        alt: ['Сабақ кестесі: тақырып, күндер жолы және төрт сабақ', 'Расписание: название, строка дней и четыре урока', 'A timetable: a title, the row of days and four lessons'],
        solve: {},
        criteria: [
          { id: 'c1', text: ['A1:F1 біріктірілген (тақырып бір ұяшықта)', 'A1:F1 объединены (название в одной ячейке)', 'A1:F1 are merged (the title is one cell)'], cell: 'A1', look: 'merged', points: 2 },
          { id: 'c2', text: ['A2 — күндер жолы қалың қаріппен', 'A2 — строка дней жирным', 'A2 — the row of days is bold'], cell: 'A2', look: 'bold' },
          { id: 'c3', text: ['B2 — күндер жолының фоны боялған', 'B2 — у строки дней есть заливка', 'B2 — the row of days has a fill colour'], cell: 'B2', look: 'fill' },
          { id: 'c4', text: ['B3 — ұзын мәтін тасымалданады', 'B3 — длинный текст переносится', 'B3 — the long text wraps'], cell: 'B3', look: 'wrap', points: 2 },
        ],
        steps: [
          ['A1:F1 белгіле → «Біріктіру» батырмасы. Google Docs-та: тінтуірдің оң жағы → Merge cells.', 'Выдели A1:F1 → кнопка «Объединить». В Google Docs: правая кнопка → Merge cells.', 'Select A1:F1 → the “Merge” button. In Google Docs: right-click → Merge cells.'],
          ['A2:F2 белгіле → қалың қаріп (Ctrl+B) және фон түсі.', 'Выдели A2:F2 → жирный (Ctrl+B) и цвет заливки.', 'Select A2:F2 → bold (Ctrl+B) and a fill colour.'],
          ['B3 ұяшығына «Мәтінді тасымалдау» батырмасын бас.', 'Для B3 нажми «Перенос текста».', 'Press “Wrap text” for B3.'],
        ],
        notes: ['10 минут. Бұл — Google Docs-тағы кестенің платформадағы көшірмесі: аккаунты жоқ оқушы да біріктіру мен пішімдеуді орындайды. Тексеру автоматты.', '10 минут. Это копия таблицы из Google Docs на платформе: объединение и форматирование выполнит и ученик без аккаунта. Проверка автоматическая.', '10 minutes. This is the Google Docs table copied to the platform: a student without an account can also merge and format. Marking is automatic.'],
      }), TIMETABLE, []), 'practice'),
    tag(levels(['Есептер: кесте өлшемі', 'Задачи: размер таблицы', 'Problems: table size'], ['Есептерді ретімен шығар: L1 дұрыс болса, L2 ашылады.', 'Решай по порядку: после верного L1 откроется L2.', 'Solve in order: L2 opens after L1 is right.'], [
      { title: ['Ұяшықтар саны', 'Число ячеек', 'Number of cells'], prompt: ['Insert → Table арқылы 7 × 9 кесте қойдық. Ол неше ұяшықтан тұрады?', 'Мы вставили таблицу 7 × 9 через Insert → Table. Из скольких ячеек она состоит?', 'We inserted a 7 × 9 table with Insert → Table. How many cells does it have?'], accept: ['63'] },
      { title: ['Жолдар саны', 'Число строк', 'Number of rows'], prompt: ['Кестеде 6 күн, күніне 8 сабақ. Тақырып бағанын қоссақ, баған саны 7 болады. Тақырып жолын қоссақ, жол саны қанша болады?', 'В таблице 6 дней и по 8 уроков в день. С заголовочным столбцом столбцов 7. Сколько будет строк с заголовочной строкой?', 'The table has 6 days and 8 lessons a day. With the header column there are 7 columns. How many rows are there with the header row?'], accept: ['9'] },
      { title: ['★ Сенбісіз кесте', '★ Без субботы', '★ No Saturday'], prompt: ['7 × 9 кестеден сенбі бағанын өшірдік. Тақырып жолы мен тақырып бағанын есептемегенде, сабақ жазылатын неше ұяшық қалды?', 'Из таблицы 7 × 9 удалили столбец субботы. Сколько ячеек для уроков осталось, если не считать строку и столбец заголовков?', 'We deleted the Saturday column from the 7 × 9 table. Not counting the header row and header column, how many lesson cells are left?'], accept: ['40'],
        why: ['7 − 1 = 6 баған, біреуі тақырып → 5 күн; 9 жолдың біреуі тақырып → 8 сабақ; 5 × 8 = 40.', '7 − 1 = 6 столбцов, один заголовок → 5 дней; из 9 строк одна заголовок → 8 уроков; 5 × 8 = 40.', '7 − 1 = 6 columns, one is the header → 5 days; one of 9 rows is the header → 8 lessons; 5 × 8 = 40.'] },
    ]), 'practice'),
    tag(quiz(['Ұяшық фоны', 'Фон ячейки', 'Cell background'], ['Ұяшықтың фон түсін өзгерту үшін не істейміз?', 'Что нужно сделать, чтобы изменить цвет фона ячейки?', 'What do we do to change the background colour of a cell?'],
      [['Ұяшықты белгілеп, құралдар панелінен фон түсін таңдаймыз', 'Выделить ячейку и выбрать цвет заливки на панели инструментов', 'Select the cell and pick the fill colour on the toolbar'], ['File → Print', 'File → Print', 'File → Print'], ['Insert → Image', 'Insert → Image', 'Insert → Image'], ['Tools → Spelling', 'Tools → Spelling', 'Tools → Spelling']], 0,
      ['Фон түсі мен шекара түсі құралдар панелінде ұяшықты белгілегенде өзгереді.', 'Цвет заливки и границ меняется на панели инструментов после выделения ячейки.', 'The fill and border colours change on the toolbar once the cell is selected.']), 'check'),
    tag(quiz(['Беттің бағыты', 'Ориентация страницы', 'Page orientation'], ['Бетті көлденең ету қай командамен жасалады?', 'Какой командой страница становится альбомной?', 'Which command makes the page landscape?'],
      [['File → Page setup → Landscape', 'File → Page setup → Landscape', 'File → Page setup → Landscape'], ['Insert → Table', 'Insert → Table', 'Insert → Table'], ['Table → Table properties', 'Table → Table properties', 'Table → Table properties'], ['View → Full screen', 'View → Full screen', 'View → Full screen']], 0,
      ['Бет бағыты «Page setup» терезесінде өзгереді: Landscape — көлденең.', 'Ориентация меняется в окне «Page setup»: Landscape — альбомная.', 'The orientation changes in “Page setup”: Landscape means sideways.']), 'check'),
    reflect(),
  ],
};

export const L2: LabLesson = {
  id: 'inf7lab-2',
  title: ['3.2 Электрондық кесте элементтерін пішімдеу', '3.2 Форматирование элементов электронной таблицы', '3.2 Formatting spreadsheet elements'],
  summary: ['Электрондық кесте — жолдар мен бағандардан тұратын, компьютерде жасалатын кесте. Ұяшық, жол, баған, парақ ұғымдары; Google Sheets мүмкіндіктері.', 'Электронная таблица состоит из строк и столбцов. Понятия ячейка, строка, столбец, лист; возможности Google Sheets.', 'A spreadsheet is an electronic table of rows and columns. Cell, row, column and sheet; what Google Sheets can do.'],
  objectives: [
    ['Электрондық кесте бағдарламасының не екенін түсіндіру', 'Объяснять, что такое программа электронных таблиц', 'Explain what a spreadsheet program is'],
    ['Ұяшық, жол, баған, кесте, парақ ұғымдарын ажырату', 'Различать понятия ячейка, строка, столбец, таблица, лист', 'Tell cell, row, column, table and sheet apart'],
    ['Google Sheets-те кесте жасап, ұяшықтарды біріктіру, өлшемін өзгерту, қатыру', 'Создавать таблицу в Google Sheets, объединять ячейки, менять размер, закреплять', 'Make a table in Google Sheets, merge cells, resize and freeze them'],
  ],
  terms: [
    ['spreadsheet', 'Электрондық кесте — жолдар мен бағандардан тұратын, компьютерде жасалатын кесте', 'Электронная таблица — таблица из строк и столбцов в электронном виде', 'Spreadsheet — an electronic table of rows and columns'],
    ['worksheet', 'Парақ — бір толық кесте', 'Лист — одна таблица целиком', 'Worksheet — one whole table'],
    ['merge cells', 'Ұяшықтарды біріктіру — бірнеше ұяшықты біреуге қосу', 'Объединение ячеек — несколько ячеек становятся одной', 'Merge cells — several cells become one'],
    ['freeze', 'Қатыру — жолды немесе бағанды жылжытқанда орнында қалдыру', 'Закрепить — строка или столбец остаётся на месте при прокрутке', 'Freeze — a row or column stays in view when scrolling'],
  ],
  plan: plan(
    ['Кестенің жолдары мен бағандарын біледі (3.1 сабақ).', 'Знают строки и столбцы таблицы (урок 3.1).', 'Know the rows and columns of a table (lesson 3.1).'], '28–29',
    [['Кесте және «шығындарды қалай есептейсің?» деген сұраққа жауап береді', 'Отвечает на вопросы о таблицах и учёте расходов', 'Answers questions about tables and tracking expenses'],
     ['Электрондық кесте не екенін және оның бөліктерін үйренеді', 'Узнаёт, что такое электронная таблица и её части', 'Learns what a spreadsheet is and its parts'],
     ['Мұғаліммен бірге «Істер тізімін» жасап, ұяшықтарды біріктіреді', 'Вместе с учителем делает «Список дел» и объединяет ячейки', 'Makes the to-do list with the teacher and merges cells'],
     ['Өз істер тізімін жасап, екі есеп шығарады; үлгерген оқушы ★ есепті шығарады', 'Делает свой список дел и решает две задачи; кто успел — задачу ★', 'Builds an own to-do list and solves two problems; fast students take the ★ problem'],
     ['Қысқа тест тапсырады', 'Проходит короткий тест', 'Takes a short test']]),
  slides: [
    titleSlide(['3.2 Электрондық кесте элементтерін пішімдеу', '3.2 Форматирование элементов электронной таблицы', '3.2 Formatting spreadsheet elements'], SUBTITLE('28–29')),
    tag(quiz(['Қайталау: бағдарлама', 'Повторение: программа', 'Review: programs'], ['Қай бағдарлама электрондық кестемен жұмыс істеуге арналған?', 'Какая программа предназначена для работы с электронными таблицами?', 'Which program is made for working with spreadsheets?'],
      [['Google Sheets', 'Google Sheets', 'Google Sheets'], ['Paint', 'Paint', 'Paint'], ['Google Chrome', 'Google Chrome', 'Google Chrome'], ['Windows Media Player', 'Windows Media Player', 'Windows Media Player']], 0,
      ['Google Sheets, Excel, Calc — электрондық кесте бағдарламалары.', 'Google Sheets, Excel, Calc — программы электронных таблиц.', 'Google Sheets, Excel and Calc are spreadsheet programs.']), 'warmup',
      ['5 минут. Сұрақ: «Шығындарыңды қалай есептейсің?» — қағаз, телефон, кесте. Жауапты сабақ ішінде пайдаланамыз.', '5 минут. Вопрос: «Как ты считаешь расходы?» — бумага, телефон, таблица. Ответы используем по ходу урока.', '5 minutes. Ask: “How do you track your expenses?” — paper, phone, a table. We use the answers during the lesson.']),
    tag(quiz(['Қайталау: жол және баған', 'Повторение: строка и столбец', 'Review: row and column'], ['Баған дегеніміз не?', 'Что такое столбец?', 'What is a column?'],
      [['Ұяшықтардың тік тізбегі', 'Вертикальный ряд ячеек', 'A vertical set of cells'], ['Ұяшықтардың көлденең тізбегі', 'Горизонтальный ряд ячеек', 'A horizontal set of cells'], ['Бір ғана ұяшық', 'Одна ячейка', 'A single cell'], ['Бүкіл құжат', 'Весь документ', 'The whole document']], 0,
      ['Баған — тік, жол — көлденең. Баған әріппен (A, B, C), жол санмен (1, 2, 3) белгіленеді.', 'Столбец — вертикальный, строка — горизонтальная. Столбцы обозначают буквами (A, B, C), строки — числами (1, 2, 3).', 'A column is vertical, a row horizontal. Columns are letters (A, B, C), rows are numbers (1, 2, 3).']), 'warmup'),
    tag(info('explain', ['Электрондық кесте деген не?', 'Что такое электронная таблица?', 'What is a spreadsheet?'], [
      ['Электрондық кесте — жолдар мен бағандардан тұратын, компьютерде жасалатын кесте. Көп мөлшерлі деректерді жеңіл басқаруға көмектеседі.', 'Электронная таблица состоит из строк и столбцов и помогает легко управлять большими объёмами данных.', 'A spreadsheet is an electronic table of columns and rows that makes it easy to manage a lot of data.'],
      ['Ұяшық (cell) — жалғыз деректер элементі; жол (row) — көлденең, баған (column) — тік ұяшықтар тізбегі.', 'Ячейка (cell) — один элемент данных; строка (row) — горизонтальный, столбец (column) — вертикальный ряд.', 'A cell is a single data element; a row is a horizontal and a column a vertical set of cells.'],
      ['Парақ (sheet) — бір толық кесте; электрондық кесте (spreadsheet) — барлық парақтары бар құжат. Бір құжатта бірнеше парақ болады.', 'Лист (sheet) — одна таблица целиком; электронная таблица (spreadsheet) — документ со всеми листами. В документе может быть несколько листов.', 'A worksheet is one whole table; the spreadsheet is the document with all its sheets. One document can hold several sheets.'],
    ], { art: 'anatomy' }), 'together', ['8 минут. Суреттен ұяшық, жол, баған, парақты бірге табыңыз. Сұрақ: «C4 ұяшығы қай баған мен қай жолдың қиылысы?»', '8 минут. Найдите на рисунке ячейку, строку, столбец и лист. Вопрос: «Ячейка C4 — пересечение какого столбца и какой строки?»', '8 minutes. Find a cell, a row, a column and a sheet in the picture together. Ask: “Cell C4 is where which column meets which row?”']),
    tag(info('explain', ['Google Sheets мүмкіндіктері', 'Возможности Google Sheets', 'What Google Sheets can do'], [
      ['Google Sheets браузерде жұмыс істейді, кез келген жүйеде және тегін: орнату керек емес.', 'Google Sheets работает в браузере, в любой системе и бесплатно: ничего устанавливать не нужно.', 'Google Sheets runs in a browser, on any system, for free: nothing to install.'],
      ['Бір кестемен бірнеше адам бір уақытта жұмыс істей алады.', 'С одной таблицей могут работать несколько человек одновременно.', 'Several people can work in the same sheet at the same time.'],
      ['Басқа бағдарламалар да бар: Microsoft Excel, OpenOffice Calc, Numbers (macOS, iOS). Бұл тарауда Google Sheets немесе ClassFlow кестесін қолданамыз.', 'Есть и другие программы: Microsoft Excel, OpenOffice Calc, Numbers (macOS, iOS). В этой главе работаем в Google Sheets или в таблице ClassFlow.', 'There are other programs: Microsoft Excel, OpenOffice Calc, Numbers (macOS, iOS). In this chapter we use Google Sheets or the ClassFlow sheet.'],
    ], { art: 'collab' }), 'together'),
    tag(demoSheet(['Істер тізімі', 'Список дел', 'To-do list'], [
      ['Жаңа кесте ашып, атын «Менің істер тізімім» деп өзгерт.', 'Открой новую таблицу и назови её «Мой список дел».', 'Open a new sheet and name it “My to-do list”.'],
      ['A1:D1 ұяшықтарын белгілеп, «Merge cells» бас — тақырып бір ұяшық болады.', 'Выдели A1:D1 и нажми «Merge cells» — заголовок станет одной ячейкой.', 'Select A1:D1 and click “Merge cells” — the title becomes one cell.'],
      ['Мәтін ұяшыққа сыймаса, жол өлшемін өзгерт немесе «Text wrapping» қос. Бағанның шетін екі рет шертсең, ені өздігінен сәйкестенеді.', 'Если текст не помещается, измени размер строки или включи «Text wrapping». Двойной щелчок по краю столбца подгоняет ширину.', 'If the text does not fit, resize the row or turn on “Text wrapping”. Double-click a column edge to fit it.'],
    ], {
      rows: 8, cols: 4,
      cells: {
        A1: ['Менің істер тізімім', 'Мой список дел', 'My to-do list'],
        A2: ['№', '№', '#'], B2: ['Іс', 'Дело', 'Task'], C2: ['Мерзімі', 'Срок', 'Due'], D2: ['Орындалды', 'Выполнено', 'Done'],
        A3: '1', B3: ['Информатикадан үй тапсырмасы', 'Домашнее задание по информатике', 'Informatics homework'], C3: ['Дүйсенбі', 'Понедельник', 'Monday'], D3: ['Иә', 'Да', 'Yes'],
        A4: '2', B4: ['Кітап оқу', 'Чтение книги', 'Read a book'], C4: ['Сәрсенбі', 'Среда', 'Wednesday'], D4: ['Жоқ', 'Нет', 'No'],
        A5: '3', B5: ['Спорт секциясы', 'Спортивная секция', 'Sports club'], C5: ['Жұма', 'Пятница', 'Friday'], D5: ['Жоқ', 'Нет', 'No'],
      },
      fmt: Object.fromEntries(['A1', 'A2', 'B2', 'C2', 'D2'].map(k => [k, { b: 1, bg: '#dbeafe' }])),
    }, ['10 минут. Оқушылар кестені өз құрылғысында сізбен бірге жасайды. Біріктіру (Merge), өлшемді өзгерту және «View → Freeze» (жолды бекіту) командаларын көрсетіңіз: бекітілген жол төмен жылжытқанда да көрініп тұрады.', '10 минут. Ученики делают таблицу у себя вместе с вами. Покажите Merge, изменение размера и «View → Freeze»: закреплённая строка остаётся на месте при прокрутке.', '10 minutes. Students build the table on their own device along with you. Show Merge, resizing and “View → Freeze”: a frozen row stays in view when scrolling.']), 'example'),
    tag(info('example', ['Қосымша командалар', 'Дополнительные команды', 'More commands'], [
      ['Merge cells — бірнеше ұяшықты біреуге біріктіру.', 'Merge cells — объединить несколько ячеек в одну.', 'Merge cells joins several cells into one.'],
      ['Өлшемді өзгерту: баған немесе жол шетін сүйре; автоматты өлшем үшін шетін екі рет шерт.', 'Изменение размера: тяни за край столбца или строки; двойной щелчок по краю подгоняет размер сам.', 'To resize, drag a column or row edge; a double click on the edge fits it automatically.'],
      ['View → Freeze: таңдалған жолды немесе бағанды қатырып, жылжытқанда жоғалмайтындай етеді.', 'View → Freeze: закрепляет строку или столбец, чтобы они не пропадали при прокрутке.', 'View → Freeze pins a row or column so it stays in view while scrolling.'],
    ], { art: 'mergewrap' }), 'example'),
    tag(info('practice', ['Практика: менің істер тізімім', 'Практика: мой список дел', 'Practice: my to-do list'], [
      ['Кесте жаса: № | Іс | Мерзімі | Орындалды бағандары, кемінде бес жол.', 'Сделай таблицу со столбцами № | Дело | Срок | Выполнено, не меньше пяти строк.', 'Make a table with the columns # | Task | Due | Done and at least five rows.'],
      ['Тақырыпты біріктір, тақырып жолын қалың қыл, ұзын мәтінге Text wrapping қос.', 'Объедини ячейки заголовка, сделай строку заголовков жирной, для длинного текста включи Text wrapping.', 'Merge the title cells, make the header row bold and turn on Text wrapping for long text.'],
      ['Тақырып жолын қатыр. Дайын кестені мұғалімге көрсет.', 'Закрепи строку заголовков. Покажи готовую таблицу учителю.', 'Freeze the header row. Show the finished table to the teacher.'],
    ]), 'practice', ['15 минут. Пішімдеуді мұғалім экраннан қарайды. Төмендегі екі есеп автоматты тексеріледі.', '15 минут. Форматирование учитель смотрит на экране. Две задачи ниже проверяются автоматически.', '15 minutes. The teacher checks the formatting on screen. The two problems below are marked automatically.']),
    tag(prefill(labTask(['Практика: тізімді пішімде', 'Практика: оформи список', 'Practice: format the list'],
      ['Тізім дайын, оны платформа кестесінде пішімде де «Жіберу» бас.', 'Список готов: оформи его в таблице платформы и нажми «Отправить».', 'The list is ready: format it in the platform sheet and press “Send”.'],
      {
        pic: { name: 'g7-todo', title: ['Менің істер тізімім', 'Мой список дел', 'My to-do list'], cols: 4, rows: 6, widths: [70, 230, 110, 110], ask: [],
          data: { A1: ['Менің істер тізімім', 'Мой список дел', 'My to-do list'], A2: '№', B2: ['Іс', 'Дело', 'Task'], C2: ['Мерзімі', 'Срок', 'Due'], D2: ['Орындалды', 'Выполнено', 'Done'],
            A3: '1', B3: ['Информатикадан үй тапсырмасын орындап, мұғалімге жіберу', 'Сделать домашнее задание по информатике и отправить учителю', 'Do the informatics homework and send it to the teacher'], C3: ['Дүйсенбі', 'Понедельник', 'Monday'], D3: ['Иә', 'Да', 'Yes'],
            A4: '2', B4: ['Кітапханаға бару', 'Сходить в библиотеку', 'Go to the library'], C4: ['Сәрсенбі', 'Среда', 'Wednesday'], D4: ['Жоқ', 'Нет', 'No'] } },
        alt: ['Істер тізімі: тақырып, бағандар атаулары және екі іс', 'Список дел: заголовок, названия столбцов и два дела', 'A to-do list: a title, column names and two tasks'],
        solve: {},
        criteria: [
          { id: 'c1', text: ['A1:D1 біріктірілген (тақырып бір ұяшықта)', 'A1:D1 объединены (заголовок в одной ячейке)', 'A1:D1 are merged (the title is one cell)'], cell: 'A1', look: 'merged', points: 2 },
          { id: 'c2', text: ['A2 — тақырып жолы қалың қаріппен', 'A2 — строка заголовков жирным', 'A2 — the header row is bold'], cell: 'A2', look: 'bold' },
          { id: 'c3', text: ['A2 — тақырып жолының фоны боялған', 'A2 — у строки заголовков есть заливка', 'A2 — the header row has a fill colour'], cell: 'A2', look: 'fill' },
          { id: 'c4', text: ['B3 — ұзын мәтін тасымалданады (Text wrapping)', 'B3 — длинный текст переносится (Text wrapping)', 'B3 — the long text wraps (Text wrapping)'], cell: 'B3', look: 'wrap', points: 2 },
        ],
        steps: [
          ['A1:D1 белгіле → «Біріктіру» батырмасы.', 'Выдели A1:D1 → кнопка «Объединить».', 'Select A1:D1 → the “Merge” button.'],
          ['A2:D2 белгіле → қалың қаріп (Ctrl+B) және фон түсі.', 'Выдели A2:D2 → жирный (Ctrl+B) и цвет заливки.', 'Select A2:D2 → bold (Ctrl+B) and a fill colour.'],
          ['B3 ұяшығына «Мәтінді тасымалдау» батырмасын бас.', 'Для B3 нажми «Перенос текста».', 'Press “Wrap text” for B3.'],
        ],
      }), {
        A1: ['Менің істер тізімім', 'Мой список дел', 'My to-do list'], A2: '№', B2: ['Іс', 'Дело', 'Task'], C2: ['Мерзімі', 'Срок', 'Due'], D2: ['Орындалды', 'Выполнено', 'Done'],
        A3: '1', B3: ['Информатикадан үй тапсырмасын орындап, мұғалімге жіберу', 'Сделать домашнее задание по информатике и отправить учителю', 'Do the informatics homework and send it to the teacher'], C3: ['Дүйсенбі', 'Понедельник', 'Monday'], D3: ['Иә', 'Да', 'Yes'],
        A4: '2', B4: ['Кітапханаға бару', 'Сходить в библиотеку', 'Go to the library'], C4: ['Сәрсенбі', 'Среда', 'Wednesday'], D4: ['Жоқ', 'Нет', 'No'],
      }, []), 'practice'),
    tag(levels(['Есептер: диапазон', 'Задачи: диапазон', 'Problems: ranges'], ['Есептерді ретімен шығар: L1 дұрыс болса, L2 ашылады.', 'Решай по порядку: после верного L1 откроется L2.', 'Solve in order: L2 opens after L1 is right.'], [
      { title: ['Ұяшықтар', 'Ячейки', 'Cells'], prompt: ['Кесте A1:D6 ұяшықтарында орналасқан. Онда неше ұяшық бар?', 'Таблица занимает ячейки A1:D6. Сколько в ней ячеек?', 'A table occupies cells A1:D6. How many cells does it have?'], accept: ['24'], why: ['4 баған × 6 жол = 24.', '4 столбца × 6 строк = 24.', '4 columns × 6 rows = 24.'] },
      { title: ['Жолдар саны', 'Число строк', 'Number of rows'], prompt: ['Кесте B3:E10 диапазонында. Онда неше жол бар?', 'Таблица находится в диапазоне B3:E10. Сколько в ней строк?', 'A table sits in the range B3:E10. How many rows does it have?'], accept: ['8'], why: ['10 − 3 + 1 = 8.', '10 − 3 + 1 = 8.', '10 − 3 + 1 = 8.'] },
      { title: ['★ Диапазон', '★ Диапазон', '★ A range'], prompt: ['Кесте C2:H9 диапазонында. Онда барлығы неше ұяшық бар? (Алдымен бағандар мен жолдарды сана.)', 'Таблица занимает диапазон C2:H9. Сколько в ней всего ячеек? (Сначала посчитай столбцы и строки.)', 'A table fills the range C2:H9. How many cells does it have in all? (Count the columns and the rows first.)'], accept: ['48'],
        why: ['C…H — 6 баған, 2…9 — 8 жол; 6 × 8 = 48. Жиі қате: 9 − 2 = 7 деп санау.', 'C…H — 6 столбцов, 2…9 — 8 строк; 6 × 8 = 48. Частая ошибка: считать 9 − 2 = 7.', 'C…H is 6 columns, 2…9 is 8 rows; 6 × 8 = 48. Common slip: counting 9 − 2 = 7.'] },
    ]), 'practice'),
    tag(quiz(['Ұяшықтарды біріктіру', 'Объединение ячеек', 'Merging cells'], ['Бірнеше ұяшықты біреуге қосатын команда қайсы?', 'Какая команда соединяет несколько ячеек в одну?', 'Which command joins several cells into one?'],
      [['Merge cells', 'Merge cells', 'Merge cells'], ['Freeze', 'Freeze', 'Freeze'], ['Text wrapping', 'Text wrapping', 'Text wrapping'], ['Borders', 'Borders', 'Borders']], 0,
      ['Merge cells ұяшықтарды біріктіреді; Freeze қатырады; Text wrapping мәтінді жолдарға бөледі.', 'Merge cells объединяет; Freeze закрепляет; Text wrapping переносит текст на несколько строк.', 'Merge cells joins; Freeze pins; Text wrapping breaks the text into lines.']), 'check'),
    tag(quiz(['Google Sheets артықшылығы', 'Плюс Google Sheets', 'Google Sheets advantage'], ['Google Sheets-тің басқа бағдарламалардан басты артықшылығы қандай?', 'Какое главное преимущество Google Sheets?', 'What is the main advantage of Google Sheets?'],
      [['Браузерде тегін жұмыс істейді, бірнеше адам бірге өңдей алады', 'Работает в браузере бесплатно, несколько человек редактируют вместе', 'Free in a browser, and several people can edit together'], ['Тек бір компьютерде жұмыс істейді', 'Работает только на одном компьютере', 'Works on one computer only'], ['Интернетсіз ғана жұмыс істейді', 'Работает только без интернета', 'Works only offline'], ['Кесте жасай алмайды', 'Не умеет делать таблицы', 'Cannot make tables']], 0,
      ['Google Sheets онлайн, тегін және бірлесіп өңдеуге болады.', 'Google Sheets онлайн, бесплатный и допускает совместную работу.', 'Google Sheets is online, free and allows shared editing.']), 'check'),
    reflect(),
  ],
};
