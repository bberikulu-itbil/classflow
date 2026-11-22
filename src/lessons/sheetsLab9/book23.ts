// Informatics 9, lesson 2.3: the textbook pages (guide v0.9.1), the INSERT INTO simulation and the ҚМЖ fields.
import { info, type T } from '../sheetsLab/dsl';
import { BOOK_ROWS } from './lib';

export const page1 = info('explain', ['Жазба қосу: кестеде және SQL-де', 'Добавление записи: в таблице и в SQL', 'Adding a record: in a sheet and in SQL'], [
  ['Бір жаңа жазба = кестенің бір жаңа жолы', 'Одна новая запись = одна новая строка', 'One new record = one new row'],
  ['INSERT INTO кесте VALUES (мәндер);', 'INSERT INTO таблица VALUES (значения);', 'INSERT INTO table VALUES (values);'],
  ['Мәндер — өрістердің ретімен, үтір арқылы', 'Значения — в порядке полей, через запятую', 'Values follow the field order, with commas'],
], {
  code: "INSERT INTO books VALUES\n  (3, 'Көшпенділер', 'Ілияс Есенберлин', 'History', 1976, 6, 5);",
  read: [
    `# Неге?

Өткен сабақта \`CREATE TABLE\` командасымен books кестесін жасадық. Бірақ ол бос: кестенің тек құрылымы бар, яғни өрістердің аты мен түрі ғана анықталған. Кітапханаға жаңа кітап келген сайын қорға жаңа **жазба** (запись, record) қосу керек.

# Қалай?

Жазбаны үш түрлі жолмен қосуға болады, бірақ олардың мәні бір (1-сурет):

- **Форма** — пайдаланушы өрістерді толтырады, мысалы оқулықтағы Google Forms.
- **Кестенің жолы** — әр ұяшыққа өз өрісінің мәнін жазамыз.
- **SQL командасы** — \`INSERT INTO\`.

Команданың жазылуы: \`INSERT INTO кесте VALUES (мән1, мән2, …);\`. **VALUES** сөзінен кейін жақшада мәндер тұрады. Олар өрістер қандай ретпен жасалса, сол ретпен, үтір арқылы жазылады. Команда нүктелі үтірмен бітеді.

# Мысал

books кестесінде жеті өріс бар: id, title, author, genre, year, qty, rating. «Көшпенділер» кітабын қосамыз:
\`INSERT INTO books VALUES (3, 'Көшпенділер', 'Ілияс Есенберлин', 'History', 1976, 6, 5);\`
2-суретте әр мән өз өрісіне бағыттауышпен қосылған: 3 → id, 'Көшпенділер' → title, …, 5 → rating.

# Жиі қате

Мәндердің санын немесе ретін шатастыру. Жеті өріске алты мән берсең, SQL қате береді. Ал title мен year орнын ауыстырсаң, команда орындалуы мүмкін, бірақ кітаптың аты «1976», ал жылы «Көшпенділер» болып шығады. Сондықтан мәндерді өрістермен бір-бірлеп салыстыр.`,
    `# Зачем?

На прошлом уроке мы создали таблицу books командой \`CREATE TABLE\`. Но она пуста: у таблицы есть только структура — имена и типы полей. Каждый раз, когда в библиотеку приходит новая книга, в базу нужно добавлять новую **запись**.

# Как?

Запись можно добавить тремя способами, но смысл у них один (рисунок 1):

- **Форма** — пользователь заполняет поля, например Google Forms из учебника.
- **Строка таблицы** — в каждую ячейку пишем значение её поля.
- **Команда SQL** — \`INSERT INTO\`.

Запись команды: \`INSERT INTO таблица VALUES (значение1, значение2, …);\`. После слова **VALUES** в скобках идут значения — в том же порядке, в каком созданы поля, через запятую. Команда заканчивается точкой с запятой.

# Пример

В таблице books семь полей: id, title, author, genre, year, qty, rating. Добавим книгу «Көшпенділер»:
\`INSERT INTO books VALUES (3, 'Көшпенділер', 'Ілияс Есенберлин', 'History', 1976, 6, 5);\`
На рисунке 2 каждое значение стрелкой соединено со своим полем: 3 → id, 'Көшпенділер' → title, …, 5 → rating.

# Частая ошибка

Перепутать количество или порядок значений. Если дать семи полям шесть значений, SQL выдаст ошибку. А если поменять местами title и year, команда может выполниться, но название книги станет «1976», а год — «Көшпенділер». Поэтому сверяй значения с полями по одному.`,
    `# Why?

Last lesson we created the books table with \`CREATE TABLE\`. But it is empty: the table has only a structure, the names and types of its fields. Each time a new book arrives at the library, the database needs a new **record**.

# How?

A record can be added in three ways that all mean the same (figure 1):

- **A form**: a user fills in the fields, for example the Google Forms of the textbook.
- **A sheet row**: each cell gets the value of its field.
- **An SQL command**: \`INSERT INTO\`.

The command reads \`INSERT INTO table VALUES (value1, value2, …);\`. After **VALUES** come the values in brackets, in the order the fields were created, separated by commas. The command ends with a semicolon.

# Example

books has seven fields: id, title, author, genre, year, qty, rating. We add the book «Көшпенділер»:
\`INSERT INTO books VALUES (3, 'Көшпенділер', 'Ілияс Есенберлин', 'History', 1976, 6, 5);\`
In figure 2 an arrow joins every value to its field: 3 → id, 'Көшпенділер' → title, …, 5 → rating.

# Common mistake

Getting the number or the order of the values wrong. Six values for seven fields make SQL fail. Swap title and year and the command may still run, but the book is now called “1976” and was written in «Көшпенділер». So match the values to the fields one by one.`,
  ],
  figs: [
    { art: 'three-ways', cap: ['Форма, кесте жолы және INSERT — бір әрекеттің үш түрі', 'Форма, строка таблицы и INSERT — три вида одного действия', 'A form, a sheet row and INSERT: one action in three forms'] },
    { art: 'insert-anatomy', cap: ['Әр мән өз өрісіне, ретімен беріледі', 'Каждое значение идёт в своё поле, по порядку', 'Every value goes to its field, in order'] },
  ],
});

export const page2 = info('explain', ['Мәтін, сан және бос мән', 'Текст, число и пустое значение', 'Text, numbers and empty values'], [
  ["Мәтін бір тырнақшада: 'Абай жолы'", "Текст в одинарных кавычках: 'Абай жолы'", "Text in single quotes: 'Абай жолы'"],
  ['Сан тырнақшасыз: 1942', 'Число без кавычек: 1942', 'A number without quotes: 1942'],
  ['NULL — мәні жоқ: 0 емес, бос мәтін емес', 'NULL — нет значения: не 0 и не пустой текст', 'NULL means no value: not 0, not empty text'],
  ['Өрістерді атасаң, қалғаны NULL болады', 'Назвал поля — остальные станут NULL', 'Name the fields and the rest become NULL'],
], {
  code: "INSERT INTO books (id, title, qty)\n  VALUES (5, 'Шерлок Холмс', 5);\n-- author, genre, year, rating → NULL",
  read: [
    `# Неге?

Компьютер «Абай жолы» деген сөзді өрістің атауы деп те, мәтін деп те түсінуі мүмкін. Ал «1942» сан болуы да, мәтін болуы да мүмкін. SQL шатаспауы үшін әр мәннің түрі жазылуынан көрініп тұруы керек.

# Қалай?

- **Мәтін** (TEXT) бір тырнақшаға алынады: \`'Абай жолы'\`.
- **Сан** (INTEGER, REAL) тырнақшасыз жазылады: \`1942\`, \`4.5\`.
- **NULL** — «мәні жоқ» деген арнайы белгі. NULL нөл де, бос мәтін де емес (2-сурет): 0 — «саны нөлге тең екенін білеміз», ал NULL — «мәнін білмейміз».

Кейде жаңа жазбаның барлық мәні белгісіз болады. Онда кесте атынан кейін жақшада тек толтырылатын өрістерді атаймыз: \`INSERT INTO books (id, title, qty) VALUES (5, 'Шерлок Холмс', 5);\`. Мәндер осы аталған өрістерге ретімен беріледі, ал қалған өрістерге NULL жазылады (3-сурет).

# Мысал

1-суретте төрт жазу бар. \`'Абай жолы'\` және \`1942\` — дұрыс. \`Абай жолы\` тырнақшасыз жазылса, SQL оны өріс атауы деп ойлап, қате береді. \`'1942'\` тырнақшада болса, сан мәтінге айналады: кейін оны салыстыру мен сұрыптау дұрыс жұмыс істемейді.

# Жиі қате

- Мәтінді қос тырнақшаға (") алу. SQL-де мәтін **бір** тырнақшаға (') алынады.
- Атауда апостроф болса, оны екі рет жазу керек, мысалы: \`'O''Henry'\`.`,
    `# Зачем?

Слова «Абай жолы» компьютер может принять и за имя поля, и за текст. А «1942» может быть и числом, и текстом. Чтобы SQL не путался, тип каждого значения должен быть виден по его записи.

# Как?

- **Текст** (TEXT) берут в одинарные кавычки: \`'Абай жолы'\`.
- **Число** (INTEGER, REAL) пишут без кавычек: \`1942\`, \`4.5\`.
- **NULL** — особая метка «нет значения». NULL — это не ноль и не пустой текст (рисунок 2): 0 — «мы знаем, что количество равно нулю», а NULL — «значение неизвестно».

Иногда не все значения новой записи известны. Тогда после имени таблицы в скобках называют только заполняемые поля: \`INSERT INTO books (id, title, qty) VALUES (5, 'Шерлок Холмс', 5);\`. Значения идут в названные поля по порядку, а остальные поля получают NULL (рисунок 3).

# Пример

На рисунке 1 четыре записи. \`'Абай жолы'\` и \`1942\` — верно. \`Абай жолы\` без кавычек SQL примет за имя поля и выдаст ошибку. \`'1942'\` в кавычках превращает число в текст: потом сравнение и сортировка работают неправильно.

# Частая ошибка

- Брать текст в двойные кавычки ("). В SQL текст берут в **одинарные** (').
- Если в названии есть апостроф, его пишут дважды: например, \`'O''Henry'\`.`,
    `# Why?

The words Абай жолы could be read as a field name or as a text, and 1942 could be a number or a text. So that SQL is never confused, the type of every value must be visible from the way it is written.

# How?

- **Text** (TEXT) goes in single quotes: \`'Абай жолы'\`.
- **Numbers** (INTEGER, REAL) go without quotes: \`1942\`, \`4.5\`.
- **NULL** is a special mark meaning “no value”. NULL is neither zero nor an empty text (figure 2): 0 says “we know the count is zero”, NULL says “we do not know the value”.

Sometimes not every value of a new record is known. Then, after the table name, list in brackets only the fields you fill: \`INSERT INTO books (id, title, qty) VALUES (5, 'Шерлок Холмс', 5);\`. The values go to those fields in order, and every other field gets NULL (figure 3).

# Example

Figure 1 shows four entries. \`'Абай жолы'\` and \`1942\` are right. \`Абай жолы\` without quotes is taken for a field name and fails. \`'1942'\` in quotes turns the number into text, and later comparing and sorting go wrong.

# Common mistake

- Using double quotes ("). In SQL text goes in **single** quotes (').
- An apostrophe inside a title is written twice: for example \`'O''Henry'\`.`,
  ],
  figs: [
    { art: 'quotes', cap: ['Мәтін тырнақшада, сан тырнақшасыз', 'Текст в кавычках, число без кавычек', 'Text in quotes, numbers without'] },
    { art: 'null-zero', cap: ['NULL, 0 және бос мәтін — үш түрлі нәрсе', 'NULL, 0 и пустой текст — три разные вещи', 'NULL, 0 and an empty text are three different things'] },
    { art: 'insert-cols', cap: ['Аталмаған өрістерге NULL жазылады', 'Неназванные поля получают NULL', 'Fields not named get NULL'] },
  ],
});

const FIELDS = [['id', 'INTEGER'], ['title', 'TEXT'], ['author', 'TEXT'], ['genre', 'TEXT'], ['year', 'INTEGER'], ['qty', 'INTEGER'], ['rating', 'INTEGER']];
export const sim = {
  ...info('example', ['Симуляция: INSERT INTO қадамдап', 'Симуляция: INSERT INTO по шагам', 'Simulation: INSERT INTO step by step'], [
    ['«Қадам» бас: мәндер өрістерге бір-бірден беріледі, түрі тексеріледі.', 'Нажми «Шаг»: значения раздаются полям по одному, тип проверяется.', 'Press “Step”: the values go to the fields one by one and the type is checked.'],
    ['Үлгі батырмаларын бас: тырнақшасыз мәтін, ауысқан рет, жетпеген мән, NULL.', 'Нажимай кнопки-образцы: текст без кавычек, перепутанный порядок, нехватка значения, NULL.', 'Try the sample buttons: text without quotes, swapped order, a missing value, NULL.'],
    ['VALUES жолын өзің өзгертіп, жаңа кітап қос.', 'Измени строку VALUES сам и добавь новую книгу.', 'Edit the VALUES line yourself and add a new book.'],
  ]),
  widget: {
    kind: 'insert', table: 'books', fields: FIELDS, rows: BOOK_ROWS.slice(0, 2),
    value: "(3, 'Көшпенділер', 'Ілияс Есенберлин', 'History', 1976, 6, 5)",
    presets: [
      { label: ['✓ Дұрыс', '✓ Верно', '✓ Right'], v: "(3, 'Көшпенділер', 'Ілияс Есенберлин', 'History', 1976, 6, 5)" },
      { label: ['Тырнақшасыз', 'Без кавычек', 'No quotes'], v: "(3, Көшпенділер, 'Ілияс Есенберлин', 'History', 1976, 6, 5)" },
      { label: ['Рет ауысқан', 'Порядок перепутан', 'Swapped order'], v: "(3, 1976, 'Ілияс Есенберлин', 'History', 'Көшпенділер', 6, 5)" },
      { label: ['Мән жетпейді', 'Не хватает значения', 'A value missing'], v: "(3, 'Көшпенділер', 'Ілияс Есенберлин', 1976, 6, 5)" },
      { label: ['NULL', 'NULL', 'NULL'], v: "(3, 'Көшпенділер', NULL, 'History', 1976, 6, NULL)" },
    ],
  },
};

export const kmj23 = {
  codes: ['9.2.2.2'],
  aim: ['Барлық оқушылар: кестеге жазбаларды қатесіз енгізеді. Көпшілігі: INSERT INTO командасымен мәтін мен санды дұрыс жазып, жазба қосады. Кейбірі: тек кейбір өрістерді атап жазба қосады және NULL-дың мәнін түсіндіреді.',
    'Все ученики: без ошибок вводят записи в таблицу. Большинство: добавляют запись командой INSERT INTO, правильно записывая текст и числа. Некоторые: добавляют запись, назвав только часть полей, и объясняют смысл NULL.',
    'All students: type records into a table without mistakes. Most: add a record with INSERT INTO, writing text and numbers correctly. Some: add a record naming only some fields and explain what NULL means.'] as T,
  diff: ['L1: 1-практика (кестеге төрт кітап) және симуляциядағы дайын үлгілер. L2: 2-практика, SQL-де екі кітап. L3: ★ толық емес жазба (өрістерді атап қосу). Мәтінді тапсырмадан көшіруге рұқсат.',
    'L1: практика 1 (четыре книги в таблице) и готовые образцы в симуляции. L2: практика 2, две книги в SQL. L3: ★ неполная запись (с перечислением полей). Текст можно копировать из задания.',
    'L1: practice 1 (four books in a sheet) and the ready samples of the simulation. L2: practice 2, two books in SQL. L3: ★ an incomplete record (naming the fields). Copying the text from the task is allowed.'] as T,
  assess: ['1-практика: 4 критерий, 6 ұпай. 2-практика: SQL, кестенің нәтижесін сервер салыстырады. ★: 3 ұпай. Тест: 2 сұрақ. Қайта жібергенде ең көбі 80%. Қалыптастырушы бағалау: симуляциядағы қатені түсіндіру, «бас бармақ».',
    'Практика 1: 4 критерия, 6 баллов. Практика 2: SQL, сервер сравнивает итоговую таблицу. ★: 3 балла. Тест: 2 вопроса. При повторной отправке не больше 80%. Формативное: объяснить ошибку в симуляции, «большой палец».',
    'Practice 1: 4 criteria, 6 points. Practice 2: SQL, the server compares the resulting table. ★: 3 points. Test: 2 questions. A resend gets at most 80%. Formative: explain an error in the simulation, thumbs up/down.'] as T,
  health: ['Экранға дейін 50–70 см. SQL жазғанда 20 минуттан кейін 1 минут көзге сергіту: алысқа қарау. Құрылғы үстел үстінде.',
    'До экрана 50–70 см. Через 20 минут работы с SQL — минута отдыха для глаз: посмотреть вдаль. Устройство на столе.',
    'Keep 50–70 cm from the screen. After 20 minutes of SQL, one minute of rest for the eyes: look into the distance. Devices stay on the desk.'] as T,
  t: [
    ['Екі сұрақты шығарып, «Кітапханаға жаңа кітап келсе, қорға қалай қосамыз?» деп сұрайды.', 'Выводит два вопроса и спрашивает: «Как добавить в базу новую книгу?»', 'Shows the two questions and asks: “How do we add a new book to the database?”'],
    ['Екі оқулық бетін түсіндіреді. Симуляцияда дұрыс команданы, сосын қате үлгілерді қадамдап көрсетеді.', 'Объясняет две страницы учебника. В симуляции по шагам показывает верную команду, затем ошибочные образцы.', 'Explains the two textbook pages. In the simulation steps through the right command, then the wrong samples.'],
    ['SQL редакторында INSERT пен SELECT-ті орындап, тырнақшаны әдейі өшіріп көрсетеді.', 'Выполняет INSERT и SELECT в SQL-редакторе, специально удаляет кавычку.', 'Runs INSERT and SELECT in the SQL editor and deletes a quote on purpose.'],
    ['Жұмысты пульттен бақылайды, қиналғанға мәндерді өрістермен салыстыруды ұсынады.', 'Следит за работой на пульте, затрудняющимся предлагает сверить значения с полями.', 'Watches the remote, suggests matching values to fields to those who struggle.'],
    ['Тест нәтижесін талдап, рефлексия өткізеді.', 'Разбирает итоги теста, проводит рефлексию.', 'Goes through the test and runs the reflection.'],
  ] as T[],
  ev: [
    ['Тест (автоматты), дұрыс жауаптар үлесі.', 'Тест (автоматически), доля верных ответов.', 'Test (auto-checked), share of right answers.'],
    ['Ауызша: «Неге Көшпенділер тырнақшасыз қате береді?»', 'Устно: «Почему Көшпенділер без кавычек даёт ошибку?»', 'Oral: “Why does Көшпенділер without quotes fail?”'],
    ['Бірге орындау, сұрақ-жауап.', 'Совместное выполнение, вопрос-ответ.', 'Doing it together, questions and answers.'],
    ['Сервер тексереді: кесте критерийлері және SQL нәтижесі.', 'Проверяет сервер: критерии таблицы и результат SQL.', 'The server marks the sheet criteria and the SQL result.'],
    ['Тест 2 ұпай, рефлексия.', 'Тест 2 балла, рефлексия.', 'Test 2 points, reflection.'],
  ] as T[],
};
