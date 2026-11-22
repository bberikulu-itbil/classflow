// Informatics 7, lesson 3.4: the textbook pages (guide v0.9.1), the percent simulation and the ҚМЖ fields.
import { info, type T } from '../sheetsLab/dsl';

export const page1 = info('explain', ['Формула және функция', 'Формула и функция', 'Formula and function'], [
  ['Формула әрқашан = белгісінен басталады', 'Формула всегда начинается со знака =', 'A formula always starts with ='],
  ['Формулада сан емес, адрес жаз: =A1+B1', 'Пиши в формуле адрес, а не число: =A1+B1', 'Write addresses, not numbers: =A1+B1'],
  ['Функция — дайын формула: =SUM(A1:A4)', 'Функция — готовая формула: =SUM(A1:A4)', 'A function is a ready formula: =SUM(A1:A4)'],
], {
  read: [
    `# Неге?

Кесте — жай ғана сандар жазылған тор емес. Оның басты күші — **формула**. Формула жазылған ұяшық сандарды өзі есептейді, ал бастапқы сан өзгерсе, нәтижені бірден жаңартады. Сондықтан кестеде бағаны, бағаны немесе ұпайды бір рет жазып, кейін тек өзгертіп отырамыз.

# Қалай?

Формула **=** белгісінен басталады. Одан кейін ұяшық адрестері, сандар және амал белгілері жазылады: + қосу, − азайту, * көбейту, / бөлу, ^ дәрежеге шығару (1-сурет). Формула ұяшықта емес, формула жолында көрінеді, ал ұяшықта оның нәтижесі тұрады.

Адресті қолмен термей-ақ, ұяшықты тінтуірмен басуға болады: кесте адресті формулаға өзі қояды.

**Функция** (функция, function) — кестеде дайын тұрған формула. Оның аты және жақшадағы аргументтері болады: \`=SUM(A1:A4)\`. A1:A4 — **диапазон**, яғни A1-ден A4-ке дейінгі барлық ұяшық.

# Мысал

A1:A4 ұяшықтарында 12, 7, 20, 11 тұр. Қосындыны екі жолмен табуға болады: формуламен \`=A1+A2+A3+A4\` немесе функциямен \`=SUM(A1:A4)\`. Екеуі де 50 береді (2-сурет). Бірақ ұяшық 100 болса, функция әлдеқайда қысқа.

# Жиі қате

= белгісін ұмыту. Онда кесте \`A1+B1\` жазуын формула емес, жай мәтін деп сақтайды да, есептемейді.`,
    `# Зачем?

Таблица — это не просто сетка с числами. Её главная сила — **формула**. Ячейка с формулой сама считает числа, а если исходное число изменится, сразу обновит результат. Поэтому в таблице цены, оценки или баллы записывают один раз, а потом только меняют.

# Как?

Формула начинается со знака **=**. После него пишут адреса ячеек, числа и знаки действий: + сложение, − вычитание, * умножение, / деление, ^ возведение в степень (рисунок 1). Сама формула видна в строке формул, а в ячейке стоит её результат.

Адрес можно не набирать вручную, а щёлкнуть по ячейке мышью — таблица сама вставит его в формулу.

**Функция** — готовая формула, встроенная в таблицу. У неё есть имя и аргументы в скобках: \`=SUM(A1:A4)\`. A1:A4 — это **диапазон**, все ячейки от A1 до A4.

# Пример

В A1:A4 стоят 12, 7, 20, 11. Сумму можно найти двумя способами: формулой \`=A1+A2+A3+A4\` или функцией \`=SUM(A1:A4)\`. Обе дают 50 (рисунок 2). Но если ячеек 100, функция гораздо короче.

# Частая ошибка

Забыть знак =. Тогда таблица сохранит \`A1+B1\` не как формулу, а как обычный текст, и ничего не посчитает.`,
    `# Why?

A sheet is not just a grid of numbers. Its real power is the **formula**. A cell with a formula calculates by itself, and when an input number changes it updates the result at once. So prices, marks or points are typed once and then only changed.

# How?

A formula starts with **=**. Then come cell addresses, numbers and operation signs: + add, − subtract, * multiply, / divide, ^ power (figure 1). The formula itself shows in the formula bar; the cell shows its result.

You do not have to type an address: click the cell and the sheet puts the address into the formula.

A **function** is a ready-made formula built into the sheet. It has a name and arguments in brackets: \`=SUM(A1:A4)\`. A1:A4 is a **range**: every cell from A1 to A4.

# Example

A1:A4 hold 12, 7, 20, 11. The sum can be found two ways: with the formula \`=A1+A2+A3+A4\` or the function \`=SUM(A1:A4)\`. Both give 50 (figure 2). With 100 cells, though, the function is far shorter.

# Common mistake

Forgetting the =. The sheet then keeps \`A1+B1\` as plain text, not as a formula, and calculates nothing.`,
  ],
  figs: [
    { art: 'formula', cap: ['Формула жолы және амал белгілері', 'Строка формул и знаки действий', 'The formula bar and the operation signs'] },
    { art: 'fn-vs-formula', cap: ['Формула мен функция бірдей жауап береді', 'Формула и функция дают один ответ', 'A formula and a function give the same answer'] },
  ],
});

export const page2 = info('explain', ['Формуланы көшіру', 'Копирование формулы', 'Copying a formula'], [
  ['Көшірген формула жаңа орынға бейімделеді', 'Скопированная формула подстраивается под новое место', 'A copied formula adapts to its new place'],
  ['Оңға көшірсең — әріп, төмен — сан өзгереді', 'Вправо — меняется буква, вниз — число', 'Right changes the letter, down the number'],
  ['Санды тек цифрмен енгіз: 2000, 2 000 ₸ емес', 'Число вводи только цифрами: 2000, а не 2 000 ₸', 'Type numbers as digits: 2000, not 2 000 ₸'],
], {
  read: [
    `# Неге?

Сыныпта 25 оқушы болса, әрқайсысының орташа бағасын бөлек формуламен жазу ұзақ әрі қате жіберу оңай. Кестеде формуланы бір рет жазып, қалған ұяшықтарға көшіреміз.

# Қалай?

Формуланы көшіру үшін ұяшықты белгілеп, **Ctrl+C** басамыз, сосын жаңа ұяшықты белгілеп, **Ctrl+V** басамыз. Ұяшықтың төменгі оң жақ бұрышындағы кішкентай шаршыны тартып апаруға да болады.

Көшіргенде кесте формуланы жаңа орынға бейімдейді. Мұндай адрес **салыстырмалы сілтеме** деп аталады:

- формуланы бір баған **оңға** көшірсең, баған әрпі өзгереді: A → B;
- бір жол **төмен** көшірсең, жол нөмірі өзгереді: 2 → 3.

# Мысал

A4 ұяшығында \`=A1*(A2+A3)\` формуласы тұр: 3 × (3 + 7) = 30. Оны B4-ке көшірсек, формула \`=B1*(B2+B3)\` болады да, 5 × (8 + 3) = 55 шығады (1-сурет). Біз ештеңе қайта жазған жоқпыз — кесте әріпті өзі ауыстырды.

# Жиі қате

- Санды бос орынмен немесе белгімен енгізу: «2 000 ₸». Кесте мұны мәтін деп түсінеді де, формулада қолданбайды. Санды тек цифрмен, үтірмен және минуспен енгіз.
- Жақшаны ұмыту: \`=A1*A2+A3\` басқа жауап береді, өйткені алдымен көбейту орындалады.`,
    `# Зачем?

Если в классе 25 учеников, писать средний балл каждого отдельной формулой долго, и легко ошибиться. В таблице формулу пишут один раз и копируют в остальные ячейки.

# Как?

Чтобы скопировать формулу, выдели ячейку и нажми **Ctrl+C**, затем выдели новую ячейку и нажми **Ctrl+V**. Ещё можно потянуть маленький квадратик в правом нижнем углу ячейки.

При копировании таблица подстраивает формулу под новое место. Такой адрес называется **относительной ссылкой**:

- скопируешь формулу на столбец **вправо** — изменится буква столбца: A → B;
- на строку **вниз** — изменится номер строки: 2 → 3.

# Пример

В A4 записано \`=A1*(A2+A3)\`: 3 × (3 + 7) = 30. Скопируем в B4 — формула станет \`=B1*(B2+B3)\`, и получится 5 × (8 + 3) = 55 (рисунок 1). Мы ничего не переписывали — таблица сама поменяла букву.

# Частая ошибка

- Вводить число с пробелом или значком: «2 000 ₸». Таблица считает это текстом и не использует в формуле. Вводи число только цифрами, запятой и минусом.
- Забыть скобки: \`=A1*A2+A3\` даёт другой ответ, потому что сначала выполняется умножение.`,
    `# Why?

With 25 students in a class, writing each average as its own formula is slow and easy to get wrong. In a sheet you write the formula once and copy it to the other cells.

# How?

To copy a formula, select the cell and press **Ctrl+C**, then select the new cell and press **Ctrl+V**. You can also drag the small square in the bottom-right corner of the cell.

When copying, the sheet adapts the formula to the new place. Such an address is called a **relative reference**:

- copy the formula one column **right** and the column letter changes: A → B;
- one row **down** and the row number changes: 2 → 3.

# Example

A4 holds \`=A1*(A2+A3)\`: 3 × (3 + 7) = 30. Copy it to B4 and the formula becomes \`=B1*(B2+B3)\`, giving 5 × (8 + 3) = 55 (figure 1). We rewrote nothing: the sheet changed the letter by itself.

# Common mistake

- Typing a number with a space or a symbol: “2 000 ₸”. The sheet treats it as text and will not use it in a formula. Type digits, a decimal comma and a minus only.
- Forgetting brackets: \`=A1*A2+A3\` gives another answer because multiplication goes first.`,
  ],
  figs: [
    { art: 'copy', cap: ['A4 формуласы B4-ке көшкенде A әрпі B-ге ауысады', 'При копировании из A4 в B4 буква A меняется на B', 'Copied from A4 to B4, the letter A becomes B'] },
  ],
});

export const page3 = info('explain', ['Пайызды есептеу', 'Вычисление процентов', 'Calculating percents'], [
  ['Үлесі: =бөлігі/барлығы, сосын Percent', 'Доля: =часть/целое, затем Percent', 'Share: =part/whole, then Percent'],
  ['Санның пайызы: =B2*30%', 'Процент от числа: =B2*30%', 'Percent of a number: =B2*30%'],
  ['×100 пен Percent-ті бірге қолданба', 'Не используй ×100 и Percent вместе', 'Never use ×100 and Percent together'],
], {
  read: [
    `# Неге?

Пайыз (процент, percent) өмірде жиі кездеседі: дүкендегі жеңілдік, тесттің нәтижесі, қалта ақшаның қанша бөлігі тамаққа кеткені. «Пайыз» — «жүзден бір бөлік» деген сөз: 30% — жүздің 30-ы. Кестеде пайызды дұрыс есептей білсең, кез келген жеңілдікті немесе нәтижені бір формуламен табасың.

# Қалай?

Кестеде пайызға байланысты екі түрлі сұрақ болады (1-сурет).

**1. Бөлігі барлығының неше пайызы?** Бөлігін барлығына бөлеміз: \`=B3/B2\`. Нәтиже — бөлшек сан, мысалы 0,3125. Ұяшыққа **Percent** пішімін қойсақ, ол 31,25% болып көрінеді.

**2. Санның пайызын табу.** Санды пайызға көбейтеміз: \`=B2*30%\`. % белгісінің өзі 100-ге бөледі, сондықтан 100-ге қосымша бөлудің қажеті жоқ.

# Мысал

80 тапсырманың 25-і орындалды. \`=25/80\` = 0,3125, Percent пішімімен — 31,25%. 2-суретте 100 шаршының 31,25-і боялған: «жүздің 31,25-і» деген осы. Ал 80-нің 30%-ы: \`=80*30%\` = 24.

# Жиі қате

Үлесті 100-ге көбейтіп, оның үстіне Percent пішімін қою: \`=B3/B2*100\` → 31,25 → 3125%. Percent пішімі мәнді өзгертпейді, тек көрсетуін өзгертеді, бірақ өзі 100-ге көбейтіп көрсетеді (3-сурет). Сондықтан ×100 немесе Percent — біреуін ғана қолдан.`,
    `# Зачем?

Проценты встречаются в жизни постоянно: скидка в магазине, результат теста, какая часть карманных денег ушла на еду. «Процент» означает «сотая часть»: 30% — это 30 из 100.

# Как?

В таблице бывают два разных вопроса о процентах (рисунок 1).

**1. Сколько процентов часть составляет от целого?** Делим часть на целое: \`=B3/B2\`. Результат — дробное число, например 0,3125. Если поставить ячейке формат **Percent**, она покажет 31,25%.

**2. Найти процент от числа.** Умножаем число на процент: \`=B2*30%\`. Знак % сам делит на 100, поэтому дополнительно делить на 100 не нужно.

# Пример

Из 80 заданий выполнено 25. \`=25/80\` = 0,3125, в формате Percent — 31,25%. На рисунке 2 закрашено 31,25 клетки из 100 — это и есть «31,25 из ста». А 30% от 80: \`=80*30%\` = 24.

# Частая ошибка

Умножить долю на 100 и ещё поставить формат Percent: \`=B3/B2*100\` → 31,25 → 3125%. Формат Percent не меняет значение, а лишь показывает его, умножив на 100 (рисунок 3). Поэтому — либо ×100, либо Percent, что-то одно.`,
    `# Why?

Percents are everywhere: a shop discount, a test result, how much of your pocket money went on food. “Per cent” means “per hundred”: 30% is 30 out of 100.

# How?

A sheet meets two different percent questions (figure 1).

**1. What percent of the whole is the part?** Divide the part by the whole: \`=B3/B2\`. The result is a fraction, for example 0.3125. Give the cell the **Percent** format and it shows 31.25%.

**2. A percent of a number.** Multiply the number by the percent: \`=B2*30%\`. The % sign itself divides by 100, so there is no extra division by 100.

# Example

25 of 80 tasks are done. \`=25/80\` = 0.3125, in Percent format 31.25%. Figure 2 fills 31.25 squares of 100: that is what “31.25 per hundred” means. And 30% of 80: \`=80*30%\` = 24.

# Common mistake

Multiplying the share by 100 and also applying the Percent format: \`=B3/B2*100\` → 31.25 → 3125%. The Percent format does not change the value; it only shows it multiplied by 100 (figure 3). So use ×100 or Percent, never both.`,
  ],
  figs: [
    { art: 'pct-two', cap: ['Пайызға байланысты екі сұрақ және олардың формуласы', 'Два вопроса о процентах и их формулы', 'Two percent questions and their formulas'] },
    { art: 'pct-grid', cap: ['25 ÷ 80 = 0,3125 — жүздің 31,25-і', '25 ÷ 80 = 0,3125 — 31,25 из ста', '25 ÷ 80 = 0.3125: 31.25 per hundred'] },
    { art: 'pct-format', cap: ['Percent пішімі мәнді тек көрсетеді. ×100 қосылса — 3125% қатесі', 'Формат Percent лишь показывает значение. С ×100 — ошибка 3125%', 'Percent only shows the value. With ×100 you get 3125%'] },
  ],
});

export const sim = {
  ...info('example', ['Симуляция: пайыз кестеде', 'Симуляция: проценты в таблице', 'Simulation: percent in a sheet'], [
    ['Сұрақты таңда, сандарды өзгерт, «Қадам» бас: формула → мән → Percent.', 'Выбери вопрос, измени числа, нажми «Шаг»: формула → значение → Percent.', 'Pick a question, change the numbers, press “Step”: formula → value → Percent.'],
    ['Шаршылар 100-ден қанша бөлік екенін көрсетеді.', 'Клетки показывают, сколько это из 100.', 'The squares show how much of 100 it is.'],
    ['«Жиі қатені көрсет» белгісін қойып, 3125% қайдан шығатынын көр.', 'Включи «Показать частую ошибку» и посмотри, откуда берутся 3125%.', 'Tick “Show the common slip” and see where 3125% comes from.'],
  ]),
  widget: { kind: 'pct', whole: 80, part: 25, p: 30 },
};

export const kmj34 = {
  codes: ['7.2.2.1', '7.2.2.2'],
  aim: ['Барлық оқушылар: = белгісінен басталатын формула жазып, оны көшіре алады. Көпшілігі: бөлігінің пайызын және санның пайызын кестеде есептейді. Кейбірі: Percent пішімі мәнді емес, көрінісін өзгертетінін түсіндіреді.',
    'Все ученики: пишут формулу со знаком = и копируют её. Большинство: считают в таблице долю в процентах и процент от числа. Некоторые: объясняют, что формат Percent меняет вид, а не значение.',
    'All students: write a formula starting with = and copy it. Most: calculate a share in percent and a percent of a number in a sheet. Some: explain that the Percent format changes the look, not the value.'] as T,
  diff: ['L1: көмекші қадамдары бар 1-практика (формуланы көшіру). L2: 2-практика, пайыз есебі. L3: ★ B6 «қалғаны» және күн есебі. Симуляцияда әр оқушы өз сандарын енгізеді.',
    'L1: практика 1 с подсказками (копирование формулы). L2: практика 2, задача на проценты. L3: ★ B6 «остаток» и задача на даты. В симуляции каждый вводит свои числа.',
    'L1: practice 1 with hints (copying a formula). L2: practice 2, the percent problem. L3: ★ B6 “what is left” and the dates task. In the simulation everyone types their own numbers.'] as T,
  assess: ['1-практика: 3 критерий, 5 ұпай. 2-практика: 4 критерий, 7 ұпай. Күн есебі: 2 ұпай. Тест: 2 сұрақ. Сервер тексереді, қайта жібергенде ең көбі 80%. Қалыптастырушы бағалау: ауызша сұрақ, «бағдаршам».',
    'Практика 1: 3 критерия, 5 баллов. Практика 2: 4 критерия, 7 баллов. Задача на даты: 2 балла. Тест: 2 вопроса. Проверяет сервер, при повторной отправке не больше 80%. Формативное: устный вопрос, «светофор».',
    'Practice 1: 3 criteria, 5 points. Practice 2: 4 criteria, 7 points. Dates: 2 points. Test: 2 questions. The server marks; a resend gets at most 80%. Formative: oral questions, traffic lights.'] as T,
  health: ['Экранға дейін 50–70 см, арқа тік. Практиканың ортасында 1 минут сергіту: көзді жұмып, иықты айналдыру. Құрылғы үстел үстінде.',
    'До экрана 50–70 см, спина прямая. В середине практики минута разминки: закрыть глаза, покрутить плечами. Устройство на столе.',
    'Keep 50–70 cm from the screen, back straight. A one-minute break mid-practice: close the eyes, roll the shoulders. Devices stay on the desk.'] as T,
  t: [
    ['Екі сұрақты тақтаға шығарып, жауаптарды пульттен көреді. «5%» қай түр екенін ауызша сұрайды.', 'Выводит два вопроса, смотрит ответы на пульте. Устно спрашивает, какой тип у «5%».', 'Shows the two questions, watches the remote, asks aloud what type “5%” is.'],
    ['Үш оқулық бетін түсіндіреді, C1-ге =A1+B1 жазып, A1-ді өзгертіп көрсетеді. Симуляцияда екі сұрақты және жиі қатені көрсетеді.', 'Объясняет три страницы учебника, пишет =A1+B1 в C1 и меняет A1. В симуляции показывает оба вопроса и частую ошибку.', 'Explains the three textbook pages, types =A1+B1 in C1 and changes A1. Shows both questions and the slip in the simulation.'],
    ['Тақтадағы кестеде пайыз формулаларын оқушылармен бірге жазады.', 'Пишет формулы процентов в таблице на доске вместе с классом.', 'Writes the percent formulas in the board sheet with the class.'],
    ['Жұмысты пульттен бақылайды, қиналғанға көмек қадамдарын ашады.', 'Следит за работой на пульте, затрудняющимся открывает подсказки.', 'Watches the remote and opens the hints for those who struggle.'],
    ['Тест нәтижесін талдап, рефлексия өткізеді.', 'Разбирает итоги теста, проводит рефлексию.', 'Goes through the test and runs the reflection.'],
  ] as T[],
  ev: [
    ['Тест (автоматты), дұрыс жауаптар үлесі.', 'Тест (автоматически), доля верных ответов.', 'Test (auto-checked), share of right answers.'],
    ['Ауызша сұрақ: «80-нің 30%-ы қалай есептеледі?»', 'Устный вопрос: «Как посчитать 30% от 80?»', 'Oral question: “How do you find 30% of 80?”'],
    ['Бірге орындау, «бағдаршам».', 'Совместное выполнение, «светофор».', 'Doing it together, traffic lights.'],
    ['Критерийлер бойынша сервер тексереді: 5 + 7 + 2 ұпай.', 'Сервер проверяет по критериям: 5 + 7 + 2 балла.', 'The server marks the criteria: 5 + 7 + 2 points.'],
    ['Тест 2 ұпай, рефлексия.', 'Тест 2 балла, рефлексия.', 'Test 2 points, reflection.'],
  ] as T[],
};
