// Informatics 8, textbook chapter 3, lesson 3.1: relative and absolute references (the textbook's three practices with its menu tables).
// Texts are [kk, ru, en]; the numbers of every table are checked by replica/unit/sheetslab.test.mjs.
import { demoSheet, info, labTask, quiz, titleSlide, walk, type LabLesson, type Pic, type T } from './dsl';

const sub: T = ['Информатика 8-сынып · 3-тарау «Электрондық кестелер»', 'Информатика 8 класс · глава 3 «Электронные таблицы»', 'Informatics Grade 8 · Chapter 3 “Spreadsheets”'];
const NOTE: T = ['сары «?» ұяшықтарды формуламен есепте', 'жёлтые «?» посчитай формулой', 'work out the yellow “?” cells with a formula'];
const pic = (name: string, title: T, data: Pic['data'], ask: string[], cols: number, rows: number, widths: number[]): Pic => ({ name, title, data, ask, cols, rows, widths, note: NOTE });

const H = {
  menu: ['Мәзір', 'Меню', 'Menu'] as T, price: ['Баға, ₸', 'Цена, ₸', 'Price, ₸'] as T, qty: ['Саны', 'Количество', 'Quantity'] as T,
  total: ['Барлығы', 'Итого', 'Total'] as T, tax: ['Сатылым салығы', 'Налог с продаж', 'Sales Tax'] as T, rate: ['Салық мөлшері', 'Ставка налога', 'Tax Rate'] as T,
  disc: ['Жеңілдік', 'Скидка', 'Discount'] as T, rateD: ['Жеңілдік мөлшері', 'Размер скидки', 'Discount'] as T,
};
const beef: T = ['Кебаб: сиыр еті', 'Кебаб: говядина', 'Kebab: Beef'], chicken: T = ['Кебаб: тауық', 'Кебаб: курица', 'Kebab: Chicken'];
const salad: T = ['Салат: көкөніс', 'Салат: овощной', 'Salad: Vegetable'], lemonade: T = ['Сусын: лимонад', 'Напиток: лимонад', 'Beverages: Lemonade'], ayran: T = ['Сусын: айран', 'Напиток: айран', 'Beverages: Ayran'];

export const L1: LabLesson = {
  id: 'inf8lab-1',
  title: ['3.1 Статистикалық деректер', '3.1 Статистические данные', '3.1 Statistical data'],
  summary: [
    'Сілтеме түрлері: салыстырмалы және абсолютті сілтеме. Формуланы көшіргенде сілтеме қалай өзгеретінін және $ белгісін қолдануды үйрену.',
    'Виды ссылок: относительные и абсолютные. Как меняются ссылки при копировании формулы и как использовать знак $.',
    'Types of cell references: relative and absolute. How references change when a formula is copied and how to use the $ sign.',
  ],
  objectives: [
    ['Сілтеменің түрлерін білу', 'Знать виды ссылок', 'Learn the types of cell references'],
    ['Кестеде абсолютті және салыстырмалы сілтемені қолдану', 'Применять абсолютные и относительные ссылки в таблице', 'Use absolute and relative references in the spreadsheet'],
  ],
  terms: [
    ['reference', 'сілтеме — формуладағы ұяшықтың мекенжайы, мысалы B2', 'ссылка — адрес ячейки в формуле, например B2', 'reference — the address of a cell in a formula, e.g. B2'],
    ['relative', 'салыстырмалы — көшіргенде өзгереді (A2)', 'относительный — меняется при копировании (A2)', 'relative — changes when copied (A2)'],
    ['absolute', 'абсолютті — көшіргенде өзгермейді ($A$2)', 'абсолютный — не меняется при копировании ($A$2)', 'absolute — does not change when copied ($A$2)'],
    ['designated', 'тағайындалған — доллар белгісімен ($) белгіленген', 'назначенный — обозначенный знаком доллара ($)', 'designated — marked with the dollar sign ($)'],
    ['convenient', 'қолайлы — жұмысқа ыңғайлы', 'удобный — удобный в работе', 'convenient — easy and handy to use'],
    ['depending on', 'байланысты — бір нәрсеге қарай өзгеретін', 'в зависимости от — меняется по чему-то', 'depending on — changing according to something'],
  ],
  slides: [
    titleSlide(['3.1 Статистикалық деректер', '3.1 Статистические данные', '3.1 Statistical data'], sub),
    info('explain', ['Сен не үйренесің', 'Что ты узнаешь', 'You will'], [
      ['Сілтеменің түрлерін үйренесің.', 'Узнаешь, какие бывают ссылки на ячейки.', 'Learn types of cell references.'],
      ['Кестеде абсолютті және салыстырмалы сілтемені қолданасың.', 'Будешь применять абсолютные и относительные ссылки в таблице.', 'Use absolute and relative references in the spreadsheet.'],
      ['Сұрақ: шығындарыңды жазып отырасың ба? Қандай қолданба немесе әдіс қолданасың?', 'Вопрос: ты записываешь свои расходы? Какими приложениями или способами пользуешься?', 'Question: do you track your expenses? Which apps or methods do you use?'],
    ], { notes: ['Сыныптан сұраңыз: «Шығынды қайда жазасыңдар — қолданба, дәптер, кесте?» Кестеде бір формуланы жазып, барлық жолға көшіруге болатынын айтып, тақырыпқа өтіңіз.', 'Спросите класс: «Где вы записываете расходы — приложение, тетрадь, таблица?» Скажите, что в таблице формулу можно записать один раз и скопировать на все строки.', 'Ask the class: “Where do you track expenses — an app, a notebook, a spreadsheet?” Point out that a sheet lets you write a formula once and copy it to every row.'] }),
    info('explain', ['Қайталау: жол мен баған', 'Повторение: строка и столбец', 'Review: row and column'], [
      ['Баған (Column) — тігінен орналасқан ұяшықтар. Әріппен белгіленеді: A, B, C…', 'Столбец (Column) — ячейки по вертикали. Обозначается буквой: A, B, C…', 'A column (Column) runs vertically. It is named by a letter: A, B, C…'],
      ['Жол (Row) — көлденең орналасқан ұяшықтар. Санмен белгіленеді: 1, 2, 3…', 'Строка (Row) — ячейки по горизонтали. Обозначается числом: 1, 2, 3…', 'A row (Row) runs horizontally. It is named by a number: 1, 2, 3…'],
      ['Ұяшық мекенжайы = баған әрпі + жол нөмірі. C4 — C бағаны мен 4-жолдың қиылысы.', 'Адрес ячейки = буква столбца + номер строки. C4 — пересечение столбца C и строки 4.', 'A cell address = column letter + row number. C4 is where column C meets row 4.'],
      ['Аралық: B2:B6 — бір бағанда, B2:D2 — бір жолда. Формуланы көшіргенде әріп (баған) немесе сан (жол) ауысады — келесі слайдтарда соны көреміз.', 'Диапазон: B2:B6 — в одном столбце, B2:D2 — в одной строке. При копировании формулы меняется буква (столбец) или число (строка) — это мы увидим дальше.', 'A range: B2:B6 is in one column, B2:D2 in one row. When a formula is copied, the letter (column) or the number (row) shifts — we will see that next.'],
    ], { art: 'anatomy', notes: ['Сыныпқа сұрақ: «C4 қайда тұр?», «B2:B6 қанша ұяшық?» (5). Содан кейін сілтемелерге өтіңіз.', 'Вопрос классу: «Где находится C4?», «Сколько ячеек в B2:B6?» (5). Затем переходите к ссылкам.', 'Ask the class: “Where is C4?”, “How many cells are in B2:B6?” (5). Then move on to references.'] }),
    info('explain', ['Салыстырмалы және абсолютті сілтеме', 'Относительные и абсолютные ссылки', 'Relative and absolute values'], [
      ['Сілтеменің екі түрі бар: салыстырмалы және абсолютті. Формуланы басқа ұяшыққа көшіргенде олар әртүрлі жүреді.', 'Бывает два вида ссылок: относительные и абсолютные. При копировании формулы в другие ячейки они ведут себя по-разному.', 'There are two types of cell references: relative and absolute. They behave differently when copied and filled to other cells.'],
      ['Салыстырмалы сілтеме формуланы көшіргенде өзгереді. Әдепкіде барлық сілтеме салыстырмалы.', 'Относительные ссылки меняются при копировании формулы. По умолчанию все ссылки относительные.', 'Relative references change when a formula is copied to another cell. By default, all cell references are relative.'],
      ['Абсолютті сілтеме жолды және/немесе бағанды тұрақты ұстайды. Ол формулада доллар белгісімен ($) белгіленеді.', 'Абсолютная ссылка закрепляет строку и/или столбец. В формуле она обозначается знаком доллара ($).', 'An absolute reference keeps a row and/or column constant. It is designated in the formula by a dollar sign ($).'],
    ], { art: 'refs' }),
    info('explain', ['Сілтеме жазылымдары', 'Виды записи ссылки', 'Reference formats'], [
      ['A2 — көшіргенде баған да, жол да өзгереді.', 'A2 — при копировании меняются и столбец, и строка.', 'A2 — the column and the row change when copied.'],
      ['$A$2 — көшіргенде баған да, жол да өзгермейді. Ең жиі осы түрі қолданылады.', '$A$2 — не меняются ни столбец, ни строка. Чаще всего используют именно такую запись.', '$A$2 — the column and the row do not change when copied. You will use this one most often.'],
      ['A$2 — жол өзгермейді. $A2 — баған өзгермейді. Бұл екеуі сирек қолданылады.', 'A$2 — строка не меняется. $A2 — столбец не меняется. Эти два вида нужны реже.', 'A$2 — the row does not change. $A2 — the column does not change. These two are used much less often.'],
    ], { code: 'A2      column and row change\n$A$2    column and row stay\nA$2     row stays\n$A2     column stays' }),
    info('explain', ['Салыстырмалы сілтеме', 'Относительные ссылки', 'Relative references'], [
      ['Әдепкіде барлық сілтеме салыстырмалы: көшіргенде жолдар мен бағандардың орнына қарай өзгереді.', 'По умолчанию все ссылки относительные: при копировании они меняются в зависимости от положения строк и столбцов.', 'By default all references are relative: when copied they change based on the relative position of rows and columns.'],
      ['Мысалы, =A1+B1 формуласын 1-жолдан 2-жолға көшірсең, ол =A2+B2 болады.', 'Например, если скопировать формулу =A1+B1 из строки 1 в строку 2, она станет =A2+B2.', 'For example, if you copy =A1+B1 from row 1 to row 2, the formula becomes =A2+B2.'],
      ['Бірдей есепті көп жолда қайталау керек болғанда салыстырмалы сілтеме өте қолайлы.', 'Относительные ссылки удобны, когда одно и то же вычисление нужно повторить в нескольких строках или столбцах.', 'Relative references are especially convenient when you repeat the same calculation across rows or columns.'],
    ], { code: '=A1+B1   (row 1)\n=A2+B2   (row 2)\n=A3+B3   (row 3)', art: 'copy' }),
    info('explain', ['Абсолютті сілтеме', 'Абсолютные ссылки', 'Absolute references'], [
      ['Кейде формуланы көшіргенде сілтеме өзгермеуі керек (салық мөлшері, жеңілдік). Ондай ұяшықты абсолютті сілтемемен бекітеміз.', 'Иногда при копировании ссылка не должна меняться (ставка налога, скидка). Такую ячейку закрепляют абсолютной ссылкой.', 'Sometimes you do not want a reference to change when copying (a tax rate, a discount). Use an absolute reference for that cell.'],
      ['$E$1 деп жазамыз: баған әрпі мен жол нөмірінің алдына $ қоямыз.', 'Записываем $E$1: знак $ ставим перед буквой столбца и перед номером строки.', 'Write $E$1: put $ before the column letter and before the row number.'],
      ['Мысалы, =B3*C3*$E$1 формуласында E1 әрқашан бір ұяшық, ал B3 мен C3 жолмен бірге жылжиды.', 'Например, в формуле =B3*C3*$E$1 ячейка E1 всегда одна и та же, а B3 и C3 сдвигаются вместе со строкой.', 'For example, in =B3*C3*$E$1 the cell E1 is always the same, while B3 and C3 move with the row.'],
    ], { code: '=B3*C3*$E$1\n=B4*C4*$E$1\n=B5*C5*$E$1' }),
    demoSheet(['Кестемен түсіндіру', 'Объясняем на таблице', 'Let us see it in a sheet'], [
      ['D4 ұяшығына =B4*C4 жаз, D8-ге дейін төмен тарт. B мен C жолмен бірге ауысады — бұл салыстырмалы сілтеме.', 'В D4 запиши =B4*C4 и протяни до D8. B и C сдвигаются вместе со строкой — это относительные ссылки.', 'In D4 type =B4*C4 and drag down to D8. B and C move with the row — these are relative references.'],
      ['E4 ұяшығына =D4*$B$1 жаз, төмен тарт. $B$1 бәрінде бірдей қалады — бұл абсолютті сілтеме. E5 ішіне қарап көр.', 'В E4 запиши =D4*$B$1 и протяни вниз. $B$1 везде одинакова — это абсолютная ссылка. Загляни в E5.', 'In E4 type =D4*$B$1 and drag down. $B$1 stays the same everywhere — an absolute reference. Look inside E5.'],
      ['Салыстыр: E4-ке =D4*B1 ($-сыз) жазып төмен тартсаң, E5-те B2 шығады да, нәтиже бұрмаланады.', 'Сравни: если в E4 записать =D4*B1 (без $) и протянуть, в E5 появится B2 и результат будет неверным.', 'Compare: if E4 is =D4*B1 (no $) and you drag down, E5 gets B2 and the result is wrong.'],
      ['F4: =D4+E4, төмен тарт. Содан соң D9, E9, F9 ұяшықтарына =SUM(...) жаз.', 'F4: =D4+E4, протяни вниз. Затем в D9, E9, F9 запиши =SUM(...).', 'F4: =D4+E4, drag down. Then type =SUM(...) in D9, E9, F9.'],
      ['Көбейту кестесі: B13-ке =$A13*B$12 жаз, оңға, сосын төмен тарт. $A13 — баған, B$12 — жол бекіген.', 'Таблица умножения: в B13 запиши =$A13*B$12, протяни вправо и вниз. $A13 — закреплён столбец, B$12 — строка.', 'Multiplication table: in B13 type =$A13*B$12, drag right then down. $A13 pins the column, B$12 pins the row.'],
    ], {
      rows: 18, cols: 7,
      cells: {
        A1: ['Салық мөлшері', 'Ставка налога', 'Tax rate'], B1: '10%',
        A3: ['Тауар', 'Товар', 'Item'], B3: ['Бағасы, ₸', 'Цена, ₸', 'Price, ₸'], C3: ['Саны', 'Кол-во', 'Qty'], D3: ['Құны', 'Стоимость', 'Cost'], E3: ['Салық', 'Налог', 'Tax'], F3: ['Төлем', 'К оплате', 'To pay'],
        A4: ['Дәптер', 'Тетрадь', 'Notebook'], B4: '150', C4: '10',
        A5: ['Қалам', 'Ручка', 'Pen'], B5: '80', C5: '20',
        A6: ['Өшіргіш', 'Ластик', 'Eraser'], B6: '60', C6: '15',
        A7: ['Сызғыш', 'Линейка', 'Ruler'], B7: '120', C7: '8',
        A8: ['Маркер', 'Маркер', 'Marker'], B8: '250', C8: '5',
        A9: ['Барлығы', 'Итого', 'Total'],
        A11: ['Көбейту кестесі', 'Таблица умножения', 'Multiplication table'],
        B12: '1', C12: '2', D12: '3', E12: '4', F12: '5',
        A13: '1', A14: '2', A15: '3', A16: '4', A17: '5',
      },
      fmt: {
        A1: { b: 1 }, B1: { nf: 'pct', b: 1, bg: '#7c2d12' }, A11: { b: 1 },
        ...Object.fromEntries(['A3', 'B3', 'C3', 'D3', 'E3', 'F3', 'A9'].map(k => [k, { b: 1, bg: '#1e3a8a' }])),
        ...Object.fromEntries(['B12', 'C12', 'D12', 'E12', 'F12', 'A13', 'A14', 'A15', 'A16', 'A17'].map(k => [k, { b: 1, bg: '#4c1d95' }])),
      },
    }, [
      'Мұғалімге: кесте дайын, тек формулаларды өзің жазасың. Тақтада кестені өңдеуге болады, оқушылар экранда көреді. «Бастапқыға қайтару» батырмасы кестені алғашқы күйіне келтіреді.\nКүтілетін нәтиже: D4:D8 = 1500, 1600, 900, 960, 1250 (D9 = 6210); E4:E8 = 150, 160, 90, 96, 125 (E9 = 621); F4:F8 = 1650, 1760, 990, 1056, 1375 (F9 = 6831). Көбейту кестесінде B13:F17 — 1-ден 25-ке дейінгі көбейтінділер.',
      'Учителю: таблица готова, формулы вводите вы. На доске её можно редактировать, ученики смотрят на экран. Кнопка «Сбросить» возвращает исходное состояние.\nОжидаемый результат: D4:D8 = 1500, 1600, 900, 960, 1250 (D9 = 6210); E4:E8 = 150, 160, 90, 96, 125 (E9 = 621); F4:F8 = 1650, 1760, 990, 1056, 1375 (F9 = 6831). В таблице умножения B13:F17 — произведения от 1 до 25.',
      'For the teacher: the table is ready, you type the formulas. It is editable on the board while the class watches the screen. The Reset button restores the starting table.\nExpected: D4:D8 = 1500, 1600, 900, 960, 1250 (D9 = 6210); E4:E8 = 150, 160, 90, 96, 125 (E9 = 621); F4:F8 = 1650, 1760, 990, 1056, 1375 (F9 = 6831). In the multiplication table B13:F17 hold the products 1 to 25.',
    ]),
    walk(['Мысал: салық', 'Пример: налог', 'Example: tax'],
      ['B2:B4 ұяшықтарында бағалар: 1000, 500, 800; C2:C4 ұяшықтарында саны: 2, 4, 1; E1 ұяшығында салық мөлшері 10%. Әр жолдың салығын тап.', 'В B2:B4 цены: 1000, 500, 800; в C2:C4 количество: 2, 4, 1; в E1 ставка налога 10%. Найди налог для каждой строки.', 'B2:B4 hold prices 1000, 500, 800; C2:C4 hold quantities 2, 4, 1; E1 holds a tax rate of 10%. Find the tax for each row.'],
      [['D2 ұяшығына =B2*C2*$E$1 жаз. Нәтиже: 1000·2·0,1 = 200.', 'В D2 запиши =B2*C2*$E$1. Результат: 1000·2·0,1 = 200.', 'In D2 type =B2*C2*$E$1. Result: 1000·2·0.1 = 200.'],
       ['D2-ні D4-ке дейін көшір: D3 = B3*C3*$E$1, D4 = B4*C4*$E$1.', 'Скопируй D2 до D4: D3 = B3*C3*$E$1, D4 = B4*C4*$E$1.', 'Copy D2 down to D4: D3 = B3*C3*$E$1, D4 = B4*C4*$E$1.'],
       ['Тексер: $E$1 барлық жолда бірдей, B және C жолмен бірге өзгерді.', 'Проверь: $E$1 одинакова во всех строках, а B и C изменились вместе со строкой.', 'Check: $E$1 is the same in every row while B and C changed with the row.']],
      ['Салықтар: 200, 200, 80.', 'Налоги: 200, 200, 80.', 'Taxes: 200, 200, 80.']),
    quiz(['Сілтемені көшіру', 'Копирование ссылки', 'Copying a reference'], ['D2 ұяшығындағы =B2*$E$1 формуласын D3 ұяшығына көшірсек, қандай формула шығады?', 'Какая формула получится, если скопировать =B2*$E$1 из D2 в D3?', 'Which formula appears if =B2*$E$1 is copied from D2 to D3?'],
      [['=B3*$E$1', '=B3*$E$1', '=B3*$E$1'], ['=B3*$E$2', '=B3*$E$2', '=B3*$E$2'], ['=B2*$E$1', '=B2*$E$1', '=B2*$E$1'], ['=B3*E1', '=B3*E1', '=B3*E1']], 0,
      ['B2 салыстырмалы, сондықтан B3 болады. $E$1 абсолютті, сондықтан өзгермейді.', 'B2 относительная, поэтому станет B3. $E$1 абсолютная, поэтому не изменится.', 'B2 is relative so it becomes B3. $E$1 is absolute so it stays.']),
    quiz(['Жолды бекіту', 'Закрепить строку', 'Fixing the row'], ['Қай жазылым көшіргенде тек жолды тұрақты қалдырады?', 'Какая запись при копировании закрепляет только строку?', 'Which format keeps only the row constant when copied?'],
      [['A2', 'A2', 'A2'], ['$A$2', '$A$2', '$A$2'], ['A$2', 'A$2', 'A$2'], ['$A2', '$A2', '$A2']], 2,
      ['$ жолдың нөмірінің алдында тұр (A$2), сондықтан тек жол өзгермейді.', '$ стоит перед номером строки (A$2), поэтому не меняется только строка.', 'The $ is before the row number (A$2), so only the row stays.']),
    info('explain', ['Практикада қолданылатын формулалар', 'Формулы, которые понадобятся в практике', 'Formulas you will use in the practice'], [
      ['1-практика: =B2*C2 — құны (D2-ден D6-ға көшіреміз). =SUM(D2:D6) — жалпы сома.', 'Практика 1: =B2*C2 — стоимость (копируем из D2 до D6). =SUM(D2:D6) — общая сумма.', 'Practice 1: =B2*C2 — the cost (copy D2 down to D6). =SUM(D2:D6) — the total.'],
      ['2-практика: =B3*C3*$E$1 — салық ($E$1 бекітілген). =B3*C3+D3 — құн мен салық қосындысы. =SUM(E3:E7) — жалпы.', 'Практика 2: =B3*C3*$E$1 — налог ($E$1 закреплена). =B3*C3+D3 — стоимость с налогом. =SUM(E3:E7) — итого.', 'Practice 2: =B3*C3*$E$1 — the tax ($E$1 is pinned). =B3*C3+D3 — cost plus tax. =SUM(E3:E7) — the total.'],
      ['3-практика: =B3*C3*$E$1 — үнемдеген сома (жеңілдік). =B3*C3-D3 — жеңілдікпен төлем. =SUM(E3:E8) — жалпы.', 'Практика 3: =B3*C3*$E$1 — сколько сэкономили (скидка). =B3*C3-D3 — оплата со скидкой. =SUM(E3:E8) — итого.', 'Practice 3: =B3*C3*$E$1 — how much is saved (discount). =B3*C3-D3 — pay with the discount. =SUM(E3:E8) — the total.'],
    ], { code: 'P1  D2: =B2*C2        D7: =SUM(D2:D6)\nP2  D3: =B3*C3*$E$1   E3: =B3*C3+D3   E8: =SUM(E3:E7)\nP3  D3: =B3*C3*$E$1   E3: =B3*C3-D3   E9: =SUM(E3:E8)' }),

    labTask(['1-практика: мәзір құны', 'Практика 1: стоимость меню', 'Practice 1: menu cost'],
      ['Суреттегі кестені енгіз. D2 ұяшығына =B2*C2 жазып, формуланы D3:D6 ұяшықтарына көшір. D7-ге жалпы соманы тап.', 'Введи таблицу с рисунка. В D2 запиши =B2*C2 и скопируй формулу в D3:D6. В D7 найди общую сумму.', 'Enter the table from the picture. In D2 type =B2*C2 and copy the formula to D3:D6. Find the total in D7.'],
      {
        pic: pic('t31a', ['Мәзір: баға және саны', 'Меню: цена и количество', 'Menu: price and quantity'],
          { A1: H.menu, B1: H.price, C1: H.qty, D1: H.total, A2: beef, B2: '2700', C2: '10', D2: '?', A3: chicken, B3: '1100', C3: '15', D3: '?', A4: salad, B4: '1200', C4: '20', D4: '?',
            A5: lemonade, B5: '320', C5: '25', D5: '?', A6: ayran, B6: '1200', C6: '20', D6: '?', C7: H.total, D7: '?' },
          ['D2', 'D3', 'D4', 'D5', 'D6', 'D7'], 4, 7, [230, 110, 110, 120]),
        alt: ['Бес тағам: баға мен саны, құн мен жалпы сомаға арналған бос ұяшықтар', 'Пять позиций меню: цена и количество, пустые ячейки для стоимости и итога', 'Five menu items with price and quantity and empty cells for the cost and the total'],
        solve: { D2: '=B2*C2', D3: '=B3*C3', D4: '=B4*C4', D5: '=B5*C5', D6: '=B6*C6', D7: '=SUM(D2:D6)' },
        steps: [
          ['Кестені тордағы A1:C6 ұяшықтарына көшір.', 'Перенеси таблицу в ячейки A1:C6.', 'Copy the table into cells A1:C6.'],
          ['D2 ұяшығын таңдап, =B2*C2 жаз.', 'Выбери D2 и запиши =B2*C2.', 'Select D2 and type =B2*C2.'],
          ['Формуланы D3:D6 ұяшықтарына көшір: сілтемелер әр жолда басқаша болуы керек.', 'Скопируй формулу в D3:D6: ссылки в каждой строке должны быть разными.', 'Copy the formula to D3:D6: the references must differ in each row.'],
          ['D7 ұяшығында SUM арқылы жалпы соманы тап.', 'В D7 найди общую сумму функцией SUM.', 'In D7 find the total with SUM.'],
        ],
        criteria: [
          { id: 'c1', text: ['Деректер енгізілген: B2 = 2700 және C6 = 20', 'Данные введены: B2 = 2700 и C6 = 20', 'Data entered: B2 = 2700 and C6 = 20'], cell: 'C6' },
          { id: 'c2', text: ['D2 — кебабтың құны (формуламен)', 'D2 — стоимость кебаба (формулой)', 'D2 — cost of the beef kebab (formula)'], cell: 'D2', formula: true },
          { id: 'c3', text: ['D3 — көшірілген формула (салыстырмалы сілтеме)', 'D3 — скопированная формула (относительные ссылки)', 'D3 — the copied formula (relative references)'], cell: 'D3', formula: true },
          { id: 'c4', text: ['D5 — лимонадтың құны (формуламен)', 'D5 — стоимость лимонада (формулой)', 'D5 — cost of the lemonade (formula)'], cell: 'D5', formula: true },
          { id: 'c5', text: ['D6 — айранның құны (формуламен)', 'D6 — стоимость айрана (формулой)', 'D6 — cost of the ayran (formula)'], cell: 'D6', formula: true },
          { id: 'c6', text: ['D7 — жалпы сома (SUM)', 'D7 — общая сумма (SUM)', 'D7 — the total (SUM)'], cell: 'D7', fn: 'SUM', points: 2 },
        ],
      }),

    labTask(['2-практика: салықпен құн', 'Практика 2: стоимость с налогом', 'Practice 2: cost with sales tax'],
      ['Кестені және E1 ұяшығындағы салық мөлшерін (7,5%) енгіз. Әр жолдың салығын =B3*C3*$E$1 формуласымен тап ($E$1 абсолютті), құнын салықпен есепте, E8-ге жалпы соманы жаз.', 'Введи таблицу и ставку налога (7,5%) в E1. Налог каждой строки найди формулой =B3*C3*$E$1 (ячейка $E$1 абсолютная), посчитай стоимость с налогом, в E8 найди итог.', 'Enter the table and the tax rate (7.5%) in E1. Find each row’s tax with =B3*C3*$E$1 ($E$1 is absolute), work out the cost with tax, and find the total in E8.'],
      {
        pic: pic('t31b', ['Сатылым салығымен мәзір', 'Меню с налогом с продаж', 'Menu with sales tax'],
          { D1: H.rate, E1: '7.5%', A2: H.menu, B2: H.price, C2: H.qty, D2: H.tax, E2: H.total, A3: beef, B3: '2700', C3: '10', D3: '?', E3: '?', A4: chicken, B4: '1100', C4: '15', D4: '?', E4: '?',
            A5: salad, B5: '1200', C5: '20', D5: '?', E5: '?', A6: lemonade, B6: '320', C6: '25', D6: '?', E6: '?', A7: ayran, B7: '1200', C7: '20', D7: '?', E7: '?', D8: H.total, E8: '?' },
          ['D3', 'D4', 'D5', 'D6', 'D7', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8'], 5, 8, [230, 100, 100, 130, 110]),
        alt: ['Салық мөлшері E1 ұяшығында, бес тағамның бағасы мен саны, салық пен жалпы құнға арналған бос ұяшықтар', 'Ставка налога в E1, цена и количество пяти позиций, пустые ячейки для налога и стоимости', 'Tax rate in E1, price and quantity of five items, empty cells for the tax and the cost'],
        solve: { D3: '=B3*C3*$E$1', D4: '=B4*C4*$E$1', D5: '=B5*C5*$E$1', D6: '=B6*C6*$E$1', D7: '=B7*C7*$E$1', E3: '=B3*C3+D3', E4: '=B4*C4+D4', E5: '=B5*C5+D5', E6: '=B6*C6+D6', E7: '=B7*C7+D7', E8: '=SUM(E3:E7)' },
        steps: [
          ['Кестені көшір, E1 ұяшығына салық мөлшерін 7,5% (немесе 0,075) жаз.', 'Перенеси таблицу, в E1 запиши ставку налога 7,5% (или 0,075).', 'Copy the table and type the tax rate 7.5% (or 0.075) in E1.'],
          ['D3 ұяшығына =B3*C3*$E$1 жаз: $E$1 — абсолютті сілтеме.', 'В D3 запиши =B3*C3*$E$1: $E$1 — абсолютная ссылка.', 'In D3 type =B3*C3*$E$1: $E$1 is an absolute reference.'],
          ['Формуланы D4:D7 ұяшықтарына көшір. Абсолютті сілтеме әр ұяшықта бірдей, қалғандары жолға қарай өзгеруі керек.', 'Скопируй формулу в D4:D7. Абсолютная ссылка в каждой ячейке одинакова, остальные меняются по строке.', 'Copy the formula to D4:D7. The absolute reference must be the same in every cell, the others change with the row.'],
          ['E3 ұяшығына құн + салық формуласын жаз (=B3*C3+D3), көшір, E8-ге SUM жаз.', 'В E3 запиши стоимость + налог (=B3*C3+D3), скопируй, в E8 запиши SUM.', 'In E3 type cost + tax (=B3*C3+D3), copy it, and type SUM in E8.'],
        ],
        criteria: [
          { id: 'c1', text: ['E1 ұяшығына салық мөлшері енгізілген (7,5%)', 'В E1 введена ставка налога (7,5%)', 'The tax rate is entered in E1 (7.5%)'], cell: 'E1', accept: ['0.07', '0.075'] },
          { id: 'c2', text: ['D3 — салық ($E$1 абсолютті сілтемемен)', 'D3 — налог (с абсолютной ссылкой $E$1)', 'D3 — the tax (with the absolute reference $E$1)'], cell: 'D3', formula: true, points: 2 },
          { id: 'c3', text: ['D7 — көшірілген формула, салық дұрыс', 'D7 — скопированная формула, налог верный', 'D7 — the copied formula, the tax is right'], cell: 'D7', formula: true },
          { id: 'c4', text: ['E3 — кебабтың салықпен құны', 'E3 — стоимость кебаба с налогом', 'E3 — cost of the beef kebab with tax'], cell: 'E3', formula: true },
          { id: 'c5', text: ['E4 — тауық кебабының салықпен құны', 'E4 — стоимость куриного кебаба с налогом', 'E4 — cost of the chicken kebab with tax'], cell: 'E4', formula: true },
          { id: 'c6', text: ['E6 — лимонадтың салықпен құны', 'E6 — стоимость лимонада с налогом', 'E6 — cost of the lemonade with tax'], cell: 'E6', formula: true },
          { id: 'c7', text: ['E8 — жалпы сома (SUM)', 'E8 — общая сумма (SUM)', 'E8 — the total (SUM)'], cell: 'E8', fn: 'SUM', points: 2 },
        ],
      }),

    labTask(['3-практика: жеңілдік', 'Практика 3: скидка', 'Practice 3: discount'],
      ['Кестені және E1 ұяшығындағы жеңілдікті (15%) енгіз. D3 ұяшығына әр тауар бойынша қанша үнемдейтінін есептейтін формула жаз (баға, саны және E1), сосын төленетін соманы тап.', 'Введи таблицу и скидку (15%) в E1. В D3 запиши формулу, которая считает, сколько покупатель экономит на каждом товаре (цена, количество и E1), затем найди сумму к оплате.', 'Enter the table and the discount (15%) in E1. In D3 write a formula that works out how much the customer saves on each item (price, quantity and E1), then find the amount to pay.'],
      {
        pic: pic('t31c', ['Ыдыс-аяқ: жеңілдікпен', 'Посуда: со скидкой', 'Tableware with a discount'],
          { D1: H.rateD, E1: '15%', A2: H.menu, B2: H.price, C2: H.qty, D2: H.disc, E2: H.total,
            A3: ['Қалың түскі ас табақтары', 'Плотные обеденные тарелки', 'Extra Thick Dinner Plates'], B3: '1604', C3: '15', D3: '?', E3: '?',
            A4: ['Сусын стақандары', 'Стаканы для напитков', 'Beverage Cups'], B4: '546', C4: '10', D4: '?', E4: '?',
            A5: ['Көбікті кофе стақандары', 'Кофейные стаканчики', 'Styrofoam Coffee Cups'], B5: '673', C5: '15', D5: '?', E5: '?',
            A6: ['Пластик қасықтар', 'Пластиковые ложки', 'Plastic Spoons'], B6: '1096', C6: '6', D6: '?', E6: '?',
            A7: ['Пластик шанышқылар', 'Пластиковые вилки', 'Plastic Forks'], B7: '1138', C7: '6', D7: '?', E7: '?',
            A8: ['Пластик пышақтар', 'Пластиковые ножи', 'Plastic Knives'], B8: '927', C8: '6', D8: '?', E8: '?', D9: H.total, E9: '?' },
          ['D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9'], 5, 9, [240, 100, 100, 110, 110]),
        alt: ['Жеңілдік E1 ұяшығында, алты тауардың бағасы мен саны, үнемдеу мен төлемге арналған бос ұяшықтар', 'Скидка в E1, цена и количество шести товаров, пустые ячейки для экономии и оплаты', 'Discount in E1, price and quantity of six items, empty cells for the saving and the payment'],
        solve: {
          D3: '=B3*C3*$E$1', D4: '=B4*C4*$E$1', D5: '=B5*C5*$E$1', D6: '=B6*C6*$E$1', D7: '=B7*C7*$E$1', D8: '=B8*C8*$E$1',
          E3: '=B3*C3-D3', E4: '=B4*C4-D4', E5: '=B5*C5-D5', E6: '=B6*C6-D6', E7: '=B7*C7-D7', E8: '=B8*C8-D8', E9: '=SUM(E3:E8)',
        },
        steps: [
          ['Кестені және E1 ұяшығына жеңілдікті (15%) енгіз.', 'Введи таблицу и скидку (15%) в E1.', 'Enter the table and the discount (15%) in E1.'],
          ['D3: =B3*C3*$E$1 — әр тауар бойынша үнемдейтін сома. Көшіргенде $E$1 өзгермейді.', 'D3: =B3*C3*$E$1 — сколько экономим на товаре. При копировании $E$1 не меняется.', 'D3: =B3*C3*$E$1 — what is saved on the item. $E$1 does not change when copied.'],
          ['Формуланы D4:D8 ұяшықтарына көшір.', 'Скопируй формулу в D4:D8.', 'Copy the formula to D4:D8.'],
          ['E3: =B3*C3-D3 — жеңілдікпен төленетін сома. E3:E8 көшіріп, E9-ға SUM жаз.', 'E3: =B3*C3-D3 — сумма к оплате со скидкой. Скопируй в E3:E8 и запиши SUM в E9.', 'E3: =B3*C3-D3 — the amount to pay after the discount. Copy it to E3:E8 and type SUM in E9.'],
        ],
        criteria: [
          { id: 'c1', text: ['E1 ұяшығына жеңілдік енгізілген (15%)', 'В E1 введена скидка (15%)', 'The discount is entered in E1 (15%)'], cell: 'E1' },
          { id: 'c2', text: ['D3 — әр тауардан үнемдеу ($E$1 абсолютті)', 'D3 — экономия на товаре ($E$1 абсолютная)', 'D3 — the saving on the item ($E$1 is absolute)'], cell: 'D3', formula: true, points: 2 },
          { id: 'c3', text: ['D8 — көшірілген формула дұрыс', 'D8 — скопированная формула верна', 'D8 — the copied formula is right'], cell: 'D8', formula: true },
          { id: 'c4', text: ['E3 — табақтарға жеңілдікпен төлем', 'E3 — оплата за тарелки со скидкой', 'E3 — payment for the plates with the discount'], cell: 'E3', formula: true },
          { id: 'c5', text: ['E6 — қасықтарға жеңілдікпен төлем', 'E6 — оплата за ложки со скидкой', 'E6 — payment for the spoons with the discount'], cell: 'E6', formula: true },
          { id: 'c6', text: ['E8 — пышақтарға жеңілдікпен төлем', 'E8 — оплата за ножи со скидкой', 'E8 — payment for the knives with the discount'], cell: 'E8', formula: true },
          { id: 'c7', text: ['E9 — жалпы төлем (SUM)', 'E9 — общая сумма к оплате (SUM)', 'E9 — the total to pay (SUM)'], cell: 'E9', fn: 'SUM', points: 2 },
        ],
      }),

    info('explain', ['Сауаттылық: қайталау сұрақтары', 'Грамотность: вопросы для повторения', 'Literacy: review questions'], [
      ['Салыстырмалы және абсолютті сілтеменің айырмашылығы неде?', 'Чем отличаются относительные и абсолютные ссылки?', 'What is the difference between relative and absolute references?'],
      ['Қай түрін жиі қолданамыз? Неге?', 'Какой вид ссылок используют чаще? Почему?', 'Which type of cell reference do we use often? Why?'],
      ['Ұяшыққа абсолютті сілтемені қалай қолданамыз?', 'Как сделать ссылку на ячейку абсолютной?', 'How do you apply an absolute reference to a cell?'],
      ['Абсолютті сілтемені тек жол немесе тек баған бойынша қалай орнатамыз?', 'Как закрепить ссылку только по строке или только по столбцу?', 'Explain the setting of an absolute cell reference based on the row or column only.'],
    ], { notes: ['Жауаптары: 1) салыстырмалы көшіргенде өзгереді, абсолютті өзгермейді; 2) салыстырмалы әдепкі, бірақ тұрақты шамаға (салық, жеңілдік) $A$2 қолданылады; 3) баған мен жол алдына $ қою; 4) A$2 — жол бекітіледі, $A2 — баған бекітіледі.', 'Ответы: 1) относительные меняются при копировании, абсолютные нет; 2) относительные по умолчанию, а для постоянной величины (налог, скидка) нужна $A$2; 3) поставить $ перед столбцом и строкой; 4) A$2 — закреплена строка, $A2 — столбец.', 'Answers: 1) relative references change when copied, absolute ones do not; 2) relative is the default, but a constant (tax, discount) needs $A$2; 3) put $ before the column and the row; 4) A$2 pins the row, $A2 pins the column.'] }),
  ],
};
