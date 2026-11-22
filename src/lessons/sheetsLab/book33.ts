// Informatics 8, lesson 3.3: the textbook pages (guide v0.9.1, «Неге? / Қалай? / Мысал / Жиі қате»), the copy-down simulation and the ҚМЖ fields.
import { info, type T } from './dsl';

export const page1 = info('explain', ['Есепті кестеде шешу қадамдары', 'Шаги решения задачи в таблице', 'Steps for solving a problem in a sheet'], [
  ['Оқы → деректер → формула → тексер', 'Прочитай → данные → формула → проверка', 'Read → data → formula → check'],
  ['Әр шама — жеке ұяшықта, тақырыбымен', 'Каждая величина — в своей ячейке, с заголовком', 'Every quantity in its own cell, with a header'],
  ['Формулада сан емес, адрес тұрады', 'В формуле не число, а адрес', 'A formula holds addresses, not numbers'],
  ['Бір-екі жолды қолмен тексер', 'Проверь одну-две строки вручную', 'Check one or two rows by hand'],
], {
  read: [
    `# Неге?

Дүкендегі чекті елестет: әр тауардың бағасы, саны және құны бар, ең соңында жалпы сома тұр. Мұны калькулятормен де есептеуге болады, бірақ бір сан өзгерсе, бәрін басынан қайта санауға тура келеді. Электрондық кестеде есепті бір рет дұрыс құрасың, сосын кез келген деректі өзгерткенде жауап өзі жаңарады.

# Қалай?

Кестеде кез келген есеп төрт қадаммен шығарылады (1-сурет):

- **Оқы.** Шартта не берілген, нені табу керек? Белгісіз шамаларды атап шық.
- **Деректерді орналастыр.** Әр шаманы жеке ұяшыққа жаз, үстіне тақырып қой. Тұрақты шаманы (мысалы, жеңілдік пайызын) бөлек ұяшыққа шығар.
- **Формула жаз.** Бірінші жолға формула жазып, оны төмен көшір. Формулада сан емес, ұяшық адресі тұруы керек.
- **Тексер.** Бір-екі жолды қолмен есептеп, кестенің жауабымен салыстыр.

# Мысал

2-суреттегі чекте деректер көк, формулалар сары, тұрақты жеңілдік пайызы күлгін, ал жауап жасыл түспен белгіленген. Дәптердің құны: D2 ұяшығында \`=B2*C2\`, яғни 150 × 4 = 600. Осы формуланы D5-ке дейін көшірсек, қалған тауарлардың құны өзі шығады. Жалпы сома: \`=SUM(D2:D5)\` = 1510.

# Жиі қате

Формулаға ұяшық орнына санды жазу: \`=150*4\`. Мұндай формула бүгін дұрыс жауап береді, бірақ баға өзгергенде жаңармайды. Әрқашан адресті жаз: \`=B2*C2\`.`,
    `# Зачем?

Представь чек из магазина: у каждого товара есть цена, количество и стоимость, а внизу — общая сумма. Это можно посчитать и на калькуляторе, но если изменится одно число, придётся пересчитывать всё заново. В электронной таблице задачу один раз строят правильно, и при изменении любых данных ответ обновляется сам.

# Как?

Любая задача в таблице решается в четыре шага (рисунок 1):

- **Прочитай.** Что дано и что нужно найти? Назови неизвестные величины.
- **Размести данные.** Каждую величину запиши в отдельную ячейку и подпиши заголовком. Постоянную величину (например, процент скидки) вынеси в отдельную ячейку.
- **Напиши формулу.** Запиши формулу в первой строке и протяни её вниз. В формуле должен стоять адрес ячейки, а не число.
- **Проверь.** Посчитай одну-две строки вручную и сравни с ответом таблицы.

# Пример

На рисунке 2 данные отмечены синим, формулы — жёлтым, постоянный процент скидки — фиолетовым, ответ — зелёным. Стоимость тетрадей: в D2 стоит \`=B2*C2\`, то есть 150 × 4 = 600. Протянем формулу до D5 — стоимость остальных товаров появится сама. Общая сумма: \`=SUM(D2:D5)\` = 1510.

# Частая ошибка

Писать в формулу число вместо ячейки: \`=150*4\`. Сегодня такая формула даёт верный ответ, но при изменении цены не обновится. Всегда пиши адрес: \`=B2*C2\`.`,
    `# Why?

Think of a shop receipt: every item has a price, a quantity and a cost, and the total sits at the bottom. A calculator can do it too, but when one number changes you have to count everything again. In a spreadsheet you build the solution correctly once, and the answer updates itself whenever any data change.

# How?

Any problem in a sheet is solved in four steps (figure 1):

- **Read.** What is given and what must be found? Name the unknown quantities.
- **Lay out the data.** Put every quantity in its own cell with a header above it. Move a constant (for example the discount percent) to a separate cell.
- **Write a formula.** Write the formula in the first row and fill it down. A formula must hold cell addresses, not numbers.
- **Check.** Work out one or two rows by hand and compare them with the sheet.

# Example

In figure 2 the data are blue, the formulas yellow, the constant discount percent violet and the answer green. The cost of the notebooks: D2 holds \`=B2*C2\`, that is 150 × 4 = 600. Fill the formula down to D5 and the other costs appear by themselves. The total: \`=SUM(D2:D5)\` = 1510.

# Common mistake

Typing numbers instead of cells: \`=150*4\`. Today it gives the right answer, but it will not update when the price changes. Always write the address: \`=B2*C2\`.`,
  ],
  figs: [
    { art: 'steps', cap: ['Есепті кестеде шешудің төрт қадамы', 'Четыре шага решения задачи в таблице', 'The four steps of solving a problem in a sheet'] },
    { art: 'receipt-flow', cap: ['Чек: деректер, формулалар, тұрақты шама және жауап', 'Чек: данные, формулы, постоянная и ответ', 'A receipt: data, formulas, a constant and the answer'] },
  ],
});

export const page2 = info('explain', ['Салыстырмалы және абсолютті сілтеме', 'Относительная и абсолютная ссылка', 'Relative and absolute references'], [
  ['B2 — көшіргенде жылжиды', 'B2 — сдвигается при копировании', 'B2 moves when copied'],
  ['$B$8 — ешқашан жылжымайды', '$B$8 — не сдвигается никогда', '$B$8 never moves'],
  ['B$8 — жол, $B8 — баған бекітілген', 'B$8 — закреплена строка, $B8 — столбец', 'B$8 pins the row, $B8 the column'],
  ['Көшірген соң бір формуланы ашып қара', 'После копирования открой одну формулу', 'After copying, open one formula'],
], {
  code: '=D2*$B$8/100   → 60   ✓\n=D3*$B$8/100   → 40   ✓  ($B$8)\n=D3*B9/100     → 0    ✗  (B9 = ∅)',
  read: [
    `# Неге?

Формуланы бір рет жазып, жүздеген жолға көшіруге болады. Ол үшін кесте формуладағы адрестерді өзі өзгертеді. Көбіне бізге дәл осы керек. Бірақ кейде бір ұяшық орнында тұруы тиіс, мысалы, барлық тауарға ортақ жеңілдік пайызы.

# Қалай?

**Салыстырмалы сілтеме** (относительная ссылка, relative reference) — әдеттегі адрес: B2. Формуланы бір жол төмен көшірсең, ол B3 болады, ал бір баған оңға көшірсең — C2. Кесте адресті «формуладан қанша қашықтықтағы ұяшық» деп есте сақтайды.

**Абсолютті сілтеме** (абсолютная ссылка, absolute reference) — $B$8. Доллар белгісі баған әрпін де, жол нөмірін де бекітеді: формуланы қайда көшірсең де, ол B8-ді көрсетеді. **Аралас сілтемеде** біреуі ғана бекітіледі: B$8 — жол, $B8 — баған (1-сурет).

$ белгісін қолмен жазуға болады. Excel мен Google Sheets-те адресті белгілеп, F4 пернесін басса да болады.

# Мысал

Жеңілдік пайызы B8 ұяшығында тұр (10). Дәптерге берілетін жеңілдік: \`=D2*$B$8/100\` = 600 × 10 / 100 = 60. Формуланы төмен көшірсек, D2 адресі D3, D4 болып ауысады, ал $B$8 орнында қалады: 40, 24.

# Жиі қате

$ белгісін ұмыту. Онда көшірілген формула \`=D3*B9/100\` болып шығады. B9 бос, кесте оны 0 деп алады да, жеңілдік 0 болады (2-сурет). Кесте бұл жерде қате деп ескертпейді, жауап жай ғана дұрыс емес болып шығады. Сондықтан формуланы көшіргеннен кейін бір ұяшықтың формуласын ашып тексер.`,
    `# Зачем?

Формулу можно написать один раз и протянуть на сотни строк. Для этого таблица сама меняет адреса в формуле. Чаще всего это именно то, что нужно. Но иногда одна ячейка должна оставаться на месте — например, общий для всех товаров процент скидки.

# Как?

**Относительная ссылка** — обычный адрес: B2. Скопируешь формулу на строку ниже — получится B3, на столбец вправо — C2. Таблица запоминает адрес как «ячейка на таком-то расстоянии от формулы».

**Абсолютная ссылка** — $B$8. Знак доллара закрепляет и букву столбца, и номер строки: куда ни копируй формулу, она указывает на B8. В **смешанной ссылке** закреплено что-то одно: B$8 — строка, $B8 — столбец (рисунок 1).

Знак $ можно ввести вручную. В Excel и Google Sheets можно выделить адрес и нажать F4.

# Пример

Процент скидки стоит в ячейке B8 (10). Скидка на тетради: \`=D2*$B$8/100\` = 600 × 10 / 100 = 60. Протянем формулу вниз: D2 превратится в D3, D4, а $B$8 останется на месте: 40, 24.

# Частая ошибка

Забыть знак $. Тогда скопированная формула станет \`=D3*B9/100\`. B9 пуста, таблица считает её нулём, и скидка получается 0 (рисунок 2). Таблица не сообщает об ошибке — ответ просто неверный. Поэтому после копирования открой формулу одной из ячеек и проверь.`,
    `# Why?

A formula can be written once and copied to hundreds of rows. To make that work, the sheet changes the addresses in the formula by itself. Usually that is exactly what we want. Sometimes, though, one cell must stay put — for example the discount percent shared by every item.

# How?

A **relative reference** is an ordinary address: B2. Copy the formula one row down and it becomes B3; one column right and it becomes C2. The sheet remembers the address as “the cell this far from the formula”.

An **absolute reference** is $B$8. The dollar signs lock both the column letter and the row number: wherever the formula goes, it points at B8. A **mixed reference** locks only one: B$8 the row, $B8 the column (figure 1).

You can type the $ by hand. In Excel and Google Sheets you can also select the address and press F4.

# Example

The discount percent is in B8 (10). The discount on the notebooks: \`=D2*$B$8/100\` = 600 × 10 / 100 = 60. Fill it down: D2 turns into D3, D4, while $B$8 stays: 40, 24.

# Common mistake

Forgetting the $. The copied formula becomes \`=D3*B9/100\`. B9 is empty, the sheet reads it as 0 and the discount comes out as 0 (figure 2). The sheet gives no warning: the answer is simply wrong. So after copying, open the formula of one cell and check it.`,
  ],
  figs: [
    { art: 'refs', cap: ['Салыстырмалы сілтеме жылжиды, абсолютті сілтеме орнында қалады', 'Относительная ссылка сдвигается, абсолютная остаётся на месте', 'A relative reference moves, an absolute one stays'] },
    { art: 'dollar-bug', cap: ['$ белгісі жоқ: бос B9, B10 → 0. $ белгісімен: дұрыс жауап', 'Без $: пустые B9, B10 → 0. С $: верный ответ', 'Without $: empty B9, B10 → 0. With $: the right answer'] },
  ],
});

export const sim = {
  ...info('example', ['Симуляция: формуланы төмен көшір', 'Симуляция: протяни формулу вниз', 'Simulation: fill the formula down'], [
    ['D2-де жеңілдікпен есептелген құн. «Қадам» бас: формула бір жол төмен көшеді.', 'В D2 стоимость со скидкой. Нажми «Шаг»: формула скопируется на строку ниже.', 'D2 holds the cost with the discount. Press “Step”: the formula is copied one row down.'],
    ['Сары ⚠ — формула бос ұяшықты оқыды. Сілтемені басып, $ қой да, қайта көр.', 'Жёлтый ⚠ — формула прочитала пустую ячейку. Нажми на ссылку, поставь $ и посмотри снова.', 'Yellow ⚠: the formula read an empty cell. Tap the reference, add $ and try again.'],
    ['Түсті жақтау формуланың қай ұяшықтарды оқитынын көрсетеді.', 'Цветная рамка показывает, какие ячейки читает формула.', 'The coloured frames show which cells the formula reads.'],
  ]),
  widget: {
    kind: 'fill', cols: 4, rows: 8, col: 'D', from: 2, to: 5, formula: '=B2*C2*(1-B7/100)',
    presets: ['=B2*C2', '=B2*C2*(1-B7/100)', '=B2*C2*(1-$B$7/100)'],
    cells: {
      A1: ['Тауар', 'Товар', 'Item'], B1: ['Баға', 'Цена', 'Price'], C1: ['Саны', 'Кол-во', 'Qty'], D1: ['Құны', 'Стоимость', 'Cost'],
      A2: ['Дәптер', 'Тетрадь', 'Notebook'], B2: '150', C2: '4', A3: ['Қалам', 'Ручка', 'Pen'], B3: '80', C3: '5',
      A4: ['Сызғыш', 'Линейка', 'Ruler'], B4: '120', C4: '2', A5: ['Папка', 'Папка', 'Folder'], B5: '90', C5: '3',
      A7: ['Жеңілдік, %', 'Скидка, %', 'Discount, %'], B7: '10',
    },
  },
};

export const page3 = info('explain', ['Шарт және IF функциясы', 'Условие и функция IF', 'Conditions and the IF function'], [
  ['IF(шарт; ақиқат болса; жалған болса)', 'IF(условие; если истина; если ложь)', 'IF(condition; if true; if false)'],
  ['> «көп», >= «кем емес»', '> «больше», >= «не меньше»', '> “more than”, >= “at least”'],
  ['Мәтін тырнақшада: "Өтті"', 'Текст в кавычках: "Сдал"', 'Text goes in quotes: "Pass"'],
], {
  code: '=IF(D5>1000;D5*0.9;D5)\n=IF(B2>=50;"Өтті";"Өтпеді")',
  read: [
    `# Неге?

Есептерде жиі шарт кездеседі: «сома 1000 теңгеден асса, жеңілдік бер», «балл 50-ден кем болмаса, өтті деп жаз». Мұндай шешімді кесте **IF** функциясымен өзі қабылдайды. Деректер өзгерсе, шешім де өзгереді.

# Қалай?

**Шарт** — ақиқат (TRUE) немесе жалған (FALSE) болатын салыстыру. Ол салыстыру белгілерімен жазылады: >, <, >=, <=, = және <> (2-сурет).

IF функциясының үш аргументі бар: \`=IF(шарт; ақиқат болса; жалған болса)\`. Кесте алдымен шартты тексереді, сосын екі мәннің біреуін ғана қайтарады (1-сурет). Мән сан, тырнақшадағы мәтін немесе басқа формула болуы мүмкін.

# Мысал

D5 ұяшығында жалпы сома 1080. Формула: \`=IF(D5>1000;D5*0.9;D5)\`. 1080 > 1000 шарты ақиқат, сондықтан екінші аргумент есептеледі: 1080 × 0,9 = 972. Сома 1000 болса, шарт жалған (1000 саны 1000-нан үлкен емес), жауап 1000 болып қалады.

# Жиі қате

- > мен >= белгілерін шатастыру. «1000-нан кем емес» деген — \`>=1000\`, ал «1000-нан көп» — \`>1000\`. Шекаралық мәнді (дәл 1000) әрқашан тексеріп көр.
- Мәтінді тырнақшасыз жазу: \`=IF(B2>=50;Өтті;Өтпеді)\` қате береді. Дұрысы: \`"Өтті"\`.`,
    `# Зачем?

В задачах часто встречается условие: «если сумма больше 1000 тенге — дай скидку», «если балл не меньше 50 — напиши „сдал“». Такое решение таблица принимает сама с помощью функции **IF**. Меняются данные — меняется и решение.

# Как?

**Условие** — это сравнение, которое либо истинно (TRUE), либо ложно (FALSE). Его записывают знаками сравнения: >, <, >=, <=, = и <> (рисунок 2).

У функции IF три аргумента: \`=IF(условие; если истина; если ложь)\`. Таблица сначала проверяет условие, затем возвращает только одно из двух значений (рисунок 1). Значением может быть число, текст в кавычках или другая формула.

# Пример

В D5 общая сумма 1080. Формула: \`=IF(D5>1000;D5*0.9;D5)\`. Условие 1080 > 1000 истинно, поэтому вычисляется второй аргумент: 1080 × 0,9 = 972. Если сумма 1000, условие ложно (1000 не больше 1000), и ответ остаётся 1000.

# Частая ошибка

- Путать > и >=. «Не меньше 1000» — это \`>=1000\`, а «больше 1000» — \`>1000\`. Всегда проверяй граничное значение (ровно 1000).
- Писать текст без кавычек: \`=IF(B2>=50;Сдал;Не сдал)\` даёт ошибку. Правильно: \`"Сдал"\`.`,
    `# Why?

Problems often contain a condition: “if the total is above 1000 tenge, give a discount”, “if the score is at least 50, write Pass”. The sheet makes such a decision by itself with the **IF** function. When the data change, the decision changes too.

# How?

A **condition** is a comparison that is either true (TRUE) or false (FALSE). It is written with comparison signs: >, <, >=, <=, = and <> (figure 2).

IF takes three arguments: \`=IF(condition; if true; if false)\`. The sheet first checks the condition, then returns only one of the two values (figure 1). A value can be a number, a text in quotes or another formula.

# Example

D5 holds the total, 1080. The formula: \`=IF(D5>1000;D5*0.9;D5)\`. The condition 1080 > 1000 is true, so the second argument is calculated: 1080 × 0.9 = 972. With a total of 1000 the condition is false (1000 is not above 1000) and the answer stays 1000.

# Common mistake

- Mixing up > and >=. “At least 1000” is \`>=1000\`, “more than 1000” is \`>1000\`. Always test the boundary value (exactly 1000).
- Text without quotes: \`=IF(B2>=50;Pass;Fail)\` gives an error. Write \`"Pass"\`.`,
  ],
  figs: [
    { art: 'ifflow', cap: ['IF шартты тексеріп, екі жолдың бірін таңдайды', 'IF проверяет условие и выбирает один из двух путей', 'IF checks the condition and takes one of two paths'] },
    { art: 'compare-ops', cap: ['Салыстыру белгілері және олардың нәтижесі', 'Знаки сравнения и их результат', 'Comparison signs and their result'] },
  ],
});

/** The ҚМЖ fields of lesson 3.3 (stages: warmup 5, together 10, example 8, practice 15, check 7). */
export const kmj33 = {
  codes: ['8.2.2.1', '8.2.2.2'],
  aim: ['Барлық оқушылар: формула жазып, оны төмен көшіре алады. Көпшілігі: тұрақты ұяшыққа абсолютті сілтеме қойып, IF функциясымен шарт жазады. Кейбірі: деректі өзгертіп, модельдің жауабы қалай өзгеретінін түсіндіреді (★ есеп).',
    'Все ученики: пишут формулу и протягивают её вниз. Большинство: ставят абсолютную ссылку на постоянную ячейку и записывают условие функцией IF. Некоторые: меняют данные и объясняют, как меняется ответ модели (задача ★).',
    'All students: write a formula and fill it down. Most: put an absolute reference on a constant cell and write a condition with IF. Some: change the data and explain how the model’s answer changes (★ problem).'] as T,
  diff: ['L1: көмекші қадамдар ашық, симуляцияда дайын формуланы таңдайды. L2: чекті өзі толық есептейді. L3: ★ есеп — жеңілдікті өзгертіп, нәтижесін түсіндіреді. Қиналған оқушы көршісімен жұппен тексереді.',
    'L1: подсказки открыты, в симуляции выбирает готовую формулу. L2: сам полностью считает чек. L3: задача ★ — меняет скидку и объясняет результат. Затрудняющийся ученик проверяет работу в паре с соседом.',
    'L1: the hints are open; picks a ready formula in the simulation. L2: works out the receipt alone. L3: the ★ problem — changes the discount and explains the result. A struggling student checks with a partner.'] as T,
  assess: ['Практика: 6 критерий, 10 ұпай (сервер тексереді). ★ есеп: 3 ұпай. Тест: 3 сұрақ, әрқайсысы 1 ұпай. Тапсырманы қайта жіберуге болады, бірақ ең көбі 80% алады. Қалыптастырушы бағалау: «бас бармақ», ауызша кері байланыс.',
    'Практика: 6 критериев, 10 баллов (проверяет сервер). Задача ★: 3 балла. Тест: 3 вопроса по 1 баллу. Задание можно отправить повторно, но не больше 80%. Формативное оценивание: «большой палец», устная обратная связь.',
    'Practice: 6 criteria, 10 points (checked by the server). ★ problem: 3 points. Test: 3 questions, 1 point each. A task may be resent for at most 80%. Formative: thumbs up/down, oral feedback.'] as T,
  health: ['Экранға дейін 50–70 см қашықтық. Практикадан кейін 1 минут көзге арналған сергіту жаттығуы. Құрылғы үстел үстінде тұрады, сымдарға тиіспейміз.',
    'Расстояние до экрана 50–70 см. После практики — минута гимнастики для глаз. Устройство лежит на столе, провода не трогаем.',
    'Keep 50–70 cm from the screen. One minute of eye exercises after the practice. Devices stay on the desk; do not touch the cables.'] as T,
  t: [
    ['Екі сұрақты тақтаға шығарады, жауаптарды пульттен көреді. Қате нұсқаны таңдағандардан қай функциямен шатастырғанын сұрайды.', 'Выводит два вопроса на доску, смотрит ответы на пульте. Спрашивает ошибившихся, с какой функцией они спутали.', 'Shows the two questions, watches the answers on the remote, asks those who erred which function they mixed up.'],
    ['Үш оқулық бетін түсіндіреді. Симуляцияда формуланы $ белгісінсіз, сосын $ белгісімен көшіріп көрсетеді.', 'Объясняет три страницы учебника. В симуляции протягивает формулу без $, а затем с $.', 'Explains the three textbook pages. In the simulation fills the formula down without $, then with $.'],
    ['Чек есебін оқушылармен бірге тақтада шығарады, шешімін соңында ашады.', 'Решает задачу про чек на доске вместе с классом, решение открывает в конце.', 'Solves the receipt problem on the board with the class and reveals the solution last.'],
    ['Жұмысты пульттен бақылайды, қиналған оқушыға көмекші қадамдарды ашады, жылдам оқушыға ★ есепті береді.', 'Следит за работой на пульте, затрудняющимся открывает подсказки, быстрым даёт задачу ★.', 'Watches the work on the remote, opens the hints for those who struggle, gives the ★ problem to fast students.'],
    ['Тест нәтижесін талдайды, көп қате кеткен сұрақты қайта түсіндіреді, рефлексия өткізеді.', 'Разбирает итоги теста, объясняет вопрос с наибольшим числом ошибок, проводит рефлексию.', 'Goes through the test results, re-explains the question with most errors, runs the reflection.'],
  ] as T[],
  ev: [
    ['Тест (автоматты тексеріледі), дұрыс жауаптар үлесі.', 'Тест (проверяется автоматически), доля верных ответов.', 'Test (auto-checked), share of right answers.'],
    ['Ауызша сұрақ: «Неге D3-те жеңілдік жоқ?» «Бас бармақ» әдісі.', 'Устный вопрос: «Почему в D3 нет скидки?» Метод «большой палец».', 'Oral question: “Why is there no discount in D3?” Thumbs up/down.'],
    ['Бірге шешу, сұрақ-жауап.', 'Совместное решение, вопрос-ответ.', 'Solving together, questions and answers.'],
    ['Критерийлер бойынша сервер тексереді: 10 ұпай, ★ 3 ұпай.', 'Сервер проверяет по критериям: 10 баллов, ★ 3 балла.', 'The server marks the criteria: 10 points, ★ 3 points.'],
    ['Тест 3 ұпай, рефлексия.', 'Тест 3 балла, рефлексия.', 'Test 3 points, reflection.'],
  ] as T[],
};
