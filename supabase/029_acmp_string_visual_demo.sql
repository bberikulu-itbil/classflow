-- Визуалды стильдің сынақ нұсқасы: «Жол түрі (string)» дәрісінің
-- алғашқы бес теориялық бетін canvas-слайдтарға ауыстырады.
-- Есеп беттері, кестелер және жасырын шешімдер өзгермейді.

do $acmp_string_visual_demo$
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
  where l.owner_id = v_owner
    and l.title = 'Жол түрі (string)'
  limit 1;

  if v_lesson is null then
    raise exception '«Жол түрі (string)» дәрісі табылмады';
  end if;

  select slides into v_slides
  from public.cf_lessons
  where id = v_lesson;

  -- 1. Кіріспе: string-ті үш визуалды ұғыммен көрсету.
  v_slides := jsonb_set(
    v_slides, '{0}',
    jsonb_build_object(
      'type','canvas', 'pageType','slide', 'templateId','canvas-blank',
      'title','Жол түрі (string)', 'bg','#0B1220',
      'blocks',jsonb_build_array(
        jsonb_build_object('id','s0-title','kind','text','x',60,'y',34,'w',840,'h',76,'text','🔤  STRING','size',54,'bold',true,'align','center','color','#FFFFFF'),
        jsonb_build_object('id','s0-sub','kind','text','x',100,'y',112,'w',760,'h',42,'text','C++ тіліндегі мәтінмен жұмыс','size',24,'align','center','color','#9FE3D8'),
        jsonb_build_object('id','s0-card1','kind','shape','x',95,'y',220,'w',220,'h',170,'shape','rect','fill','#164E63'),
        jsonb_build_object('id','s0-card2','kind','shape','x',370,'y',220,'w',220,'h',170,'shape','rect','fill','#1D4ED8'),
        jsonb_build_object('id','s0-card3','kind','shape','x',645,'y',220,'w',220,'h',170,'shape','rect','fill','#7C3AED'),
        jsonb_build_object('id','s0-i1','kind','text','x',110,'y',245,'w',190,'h',54,'text','🧱  char','size',32,'bold',true,'align','center','color','#FFFFFF'),
        jsonb_build_object('id','s0-i2','kind','text','x',385,'y',245,'w',190,'h',54,'text','🔢  index','size',32,'bold',true,'align','center','color','#FFFFFF'),
        jsonb_build_object('id','s0-i3','kind','text','x',660,'y',245,'w',190,'h',54,'text','📏  length','size',32,'bold',true,'align','center','color','#FFFFFF'),
        jsonb_build_object('id','s0-t1','kind','text','x',115,'y',314,'w',180,'h',52,'text','Әр ұяшықта\nбір символ','size',22,'align','center','color','#E0F2FE'),
        jsonb_build_object('id','s0-t2','kind','text','x',390,'y',314,'w',180,'h',52,'text','Бірінші индекс\nәрқашан 0','size',22,'align','center','color','#DBEAFE'),
        jsonb_build_object('id','s0-t3','kind','text','x',665,'y',314,'w',180,'h',52,'text','Символдар\nсаны','size',22,'align','center','color','#EDE9FE'),
        jsonb_build_object('id','s0-footer','kind','text','x',80,'y',455,'w',800,'h',38,'text','String = символдардан құралған реттелген жол','size',24,'bold',true,'align','center','color','#FDE68A')
      ),
      'ru',jsonb_build_object(
        'title','Строковый тип (string)',
        'blocks',jsonb_build_array(
          jsonb_build_object('id','s0-title','kind','text','x',60,'y',34,'w',840,'h',76,'text','🔤  STRING','size',54,'bold',true,'align','center','color','#FFFFFF'),
          jsonb_build_object('id','s0-sub','kind','text','x',100,'y',112,'w',760,'h',42,'text','Работа с текстом в C++','size',24,'align','center','color','#9FE3D8'),
          jsonb_build_object('id','s0-card1','kind','shape','x',95,'y',220,'w',220,'h',170,'shape','rect','fill','#164E63'),
          jsonb_build_object('id','s0-card2','kind','shape','x',370,'y',220,'w',220,'h',170,'shape','rect','fill','#1D4ED8'),
          jsonb_build_object('id','s0-card3','kind','shape','x',645,'y',220,'w',220,'h',170,'shape','rect','fill','#7C3AED'),
          jsonb_build_object('id','s0-i1','kind','text','x',110,'y',245,'w',190,'h',54,'text','🧱  char','size',32,'bold',true,'align','center','color','#FFFFFF'),
          jsonb_build_object('id','s0-i2','kind','text','x',385,'y',245,'w',190,'h',54,'text','🔢  index','size',32,'bold',true,'align','center','color','#FFFFFF'),
          jsonb_build_object('id','s0-i3','kind','text','x',660,'y',245,'w',190,'h',54,'text','📏  length','size',32,'bold',true,'align','center','color','#FFFFFF'),
          jsonb_build_object('id','s0-t1','kind','text','x',115,'y',314,'w',180,'h',52,'text','В каждой ячейке\nодин символ','size',22,'align','center','color','#E0F2FE'),
          jsonb_build_object('id','s0-t2','kind','text','x',390,'y',314,'w',180,'h',52,'text','Первый индекс\nвсегда 0','size',22,'align','center','color','#DBEAFE'),
          jsonb_build_object('id','s0-t3','kind','text','x',665,'y',314,'w',180,'h',52,'text','Количество\nсимволов','size',22,'align','center','color','#EDE9FE'),
          jsonb_build_object('id','s0-footer','kind','text','x',80,'y',455,'w',800,'h',38,'text','String = упорядоченная последовательность символов','size',24,'bold',true,'align','center','color','#FDE68A')
        )
      )
    ), true
  );

  -- 2. Жолдың ұяшықтарға бөлінуі және индекстер.
  v_slides := jsonb_set(
    v_slides, '{1}',
    jsonb_build_object(
      'type','canvas', 'pageType','slide', 'templateId','canvas-blank',
      'title','1. String қалай сақталады?', 'bg','#F4F1E8',
      'blocks',jsonb_build_array(
        jsonb_build_object('id','s1-head','kind','text','x',55,'y',28,'w',850,'h',54,'text','1. String қалай сақталады?','size',40,'bold',true,'color','#111827'),
        jsonb_build_object('id','s1-label','kind','text','x',70,'y',118,'w',90,'h',40,'text','s =','size',34,'bold',true,'color','#2457D6'),
        jsonb_build_object('id','s1-c0','kind','shape','x',170,'y',100,'w',112,'h',102,'shape','rect','fill','#BFDBFE'),
        jsonb_build_object('id','s1-c1','kind','shape','x',282,'y',100,'w',112,'h',102,'shape','rect','fill','#C7D2FE'),
        jsonb_build_object('id','s1-c2','kind','shape','x',394,'y',100,'w',112,'h',102,'shape','rect','fill','#DDD6FE'),
        jsonb_build_object('id','s1-c3','kind','shape','x',506,'y',100,'w',112,'h',102,'shape','rect','fill','#FBCFE8'),
        jsonb_build_object('id','s1-c4','kind','shape','x',618,'y',100,'w',112,'h',102,'shape','rect','fill','#FED7AA'),
        jsonb_build_object('id','s1-chars','kind','text','x',178,'y',122,'w',744,'h',46,'text','H          E          L          L          O','size',34,'bold',true,'align','left','color','#111827'),
        jsonb_build_object('id','s1-idx','kind','text','x',195,'y',215,'w',560,'h',38,'text','0          1          2          3          4','size',22,'bold',true,'align','left','color','#64748B'),
        jsonb_build_object('id','s1-note','kind','shape','x',80,'y',295,'w',800,'h',145,'shape','rect','fill','#E0F2FE'),
        jsonb_build_object('id','s1-note-title','kind','text','x',110,'y',320,'w',740,'h',34,'text','💡 Негізгі ереже','size',28,'bold',true,'color','#075985'),
        jsonb_build_object('id','s1-note-body','kind','text','x',110,'y',365,'w',740,'h',52,'text','s[i] — i индексіндегі символ.\nҰзындық: s.length() немесе s.size().','size',24,'color','#0C4A6E'),
        jsonb_build_object('id','s1-bottom','kind','text','x',80,'y',475,'w',800,'h',30,'text','Индекстер әрқашан солдан оңға қарай 0-ден басталады.','size',20,'bold',true,'align','center','color','#7C2D12')
      ),
      'ru',jsonb_build_object(
        'title','1. Как хранится string?',
        'blocks',jsonb_build_array(
          jsonb_build_object('id','s1-head','kind','text','x',55,'y',28,'w',850,'h',54,'text','1. Как хранится string?','size',40,'bold',true,'color','#111827'),
          jsonb_build_object('id','s1-label','kind','text','x',70,'y',118,'w',90,'h',40,'text','s =','size',34,'bold',true,'color','#2457D6'),
          jsonb_build_object('id','s1-c0','kind','shape','x',170,'y',100,'w',112,'h',102,'shape','rect','fill','#BFDBFE'),
          jsonb_build_object('id','s1-c1','kind','shape','x',282,'y',100,'w',112,'h',102,'shape','rect','fill','#C7D2FE'),
          jsonb_build_object('id','s1-c2','kind','shape','x',394,'y',100,'w',112,'h',102,'shape','rect','fill','#DDD6FE'),
          jsonb_build_object('id','s1-c3','kind','shape','x',506,'y',100,'w',112,'h',102,'shape','rect','fill','#FBCFE8'),
          jsonb_build_object('id','s1-c4','kind','shape','x',618,'y',100,'w',112,'h',102,'shape','rect','fill','#FED7AA'),
          jsonb_build_object('id','s1-chars','kind','text','x',178,'y',122,'w',744,'h',46,'text','H          E          L          L          O','size',34,'bold',true,'align','left','color','#111827'),
          jsonb_build_object('id','s1-idx','kind','text','x',195,'y',215,'w',560,'h',38,'text','0          1          2          3          4','size',22,'bold',true,'align','left','color','#64748B'),
          jsonb_build_object('id','s1-note','kind','shape','x',80,'y',295,'w',800,'h',145,'shape','rect','fill','#E0F2FE'),
          jsonb_build_object('id','s1-note-title','kind','text','x',110,'y',320,'w',740,'h',34,'text','💡 Главное правило','size',28,'bold',true,'color','#075985'),
          jsonb_build_object('id','s1-note-body','kind','text','x',110,'y',365,'w',740,'h',52,'text','s[i] — символ по индексу i.\nДлина: s.length() или s.size().','size',24,'color','#0C4A6E'),
          jsonb_build_object('id','s1-bottom','kind','text','x',80,'y',475,'w',800,'h',30,'text','Индексы всегда начинаются с 0 и идут слева направо.','size',20,'bold',true,'align','center','color','#7C2D12')
        )
      )
    ), true
  );

  -- 3. cin және getline айырмашылығы.
  v_slides := jsonb_set(
    v_slides, '{2}',
    jsonb_build_object(
      'type','canvas', 'pageType','slide', 'templateId','canvas-blank',
      'title','2. Оқу: бір сөз бе, толық жол ма?', 'bg','#EEF6FF',
      'blocks',jsonb_build_array(
        jsonb_build_object('id','s2-head','kind','text','x',50,'y',28,'w',860,'h',54,'text','2. Оқу: бір сөз бе, толық жол ма?','size',38,'bold',true,'color','#111827'),
        jsonb_build_object('id','s2-left','kind','shape','x',60,'y',115,'w',390,'h',245,'shape','rect','fill','#DBEAFE'),
        jsonb_build_object('id','s2-right','kind','shape','x',510,'y',115,'w',390,'h',245,'shape','rect','fill','#D1FAE5'),
        jsonb_build_object('id','s2-left-title','kind','text','x',85,'y',140,'w',340,'h',48,'text','⌨️  cin >> s','size',32,'bold',true,'align','center','color','#1E3A8A'),
        jsonb_build_object('id','s2-right-title','kind','text','x',535,'y',140,'w',340,'h',48,'text','📝  getline(cin,s)','size',30,'bold',true,'align','center','color','#065F46'),
        jsonb_build_object('id','s2-left-example','kind','text','x',95,'y',225,'w',320,'h',76,'text','Hello world\n→  Hello','size',28,'bold',true,'align','center','color','#1E40AF'),
        jsonb_build_object('id','s2-right-example','kind','text','x',545,'y',225,'w',320,'h',76,'text','Hello world\n→  Hello world','size',28,'bold',true,'align','center','color','#047857'),
        jsonb_build_object('id','s2-warning','kind','shape','x',100,'y',395,'w',760,'h',92,'shape','rect','fill','#FEF3C7'),
        jsonb_build_object('id','s2-warning-text','kind','text','x',125,'y',415,'w',710,'h',54,'text','⚠️ Саннан кейін getline болса,\nбірінші getline қалған Enter-ді оқиды.','size',24,'bold',true,'align','center','color','#92400E')
      ),
      'ru',jsonb_build_object(
        'title','2. Ввод: одно слово или вся строка?',
        'blocks',jsonb_build_array(
          jsonb_build_object('id','s2-head','kind','text','x',50,'y',28,'w',860,'h',54,'text','2. Ввод: одно слово или вся строка?','size',38,'bold',true,'color','#111827'),
          jsonb_build_object('id','s2-left','kind','shape','x',60,'y',115,'w',390,'h',245,'shape','rect','fill','#DBEAFE'),
          jsonb_build_object('id','s2-right','kind','shape','x',510,'y',115,'w',390,'h',245,'shape','rect','fill','#D1FAE5'),
          jsonb_build_object('id','s2-left-title','kind','text','x',85,'y',140,'w',340,'h',48,'text','⌨️  cin >> s','size',32,'bold',true,'align','center','color','#1E3A8A'),
          jsonb_build_object('id','s2-right-title','kind','text','x',535,'y',140,'w',340,'h',48,'text','📝  getline(cin,s)','size',30,'bold',true,'align','center','color','#065F46'),
          jsonb_build_object('id','s2-left-example','kind','text','x',95,'y',225,'w',320,'h',76,'text','Hello world\n→  Hello','size',28,'bold',true,'align','center','color','#1E40AF'),
          jsonb_build_object('id','s2-right-example','kind','text','x',545,'y',225,'w',320,'h',76,'text','Hello world\n→  Hello world','size',28,'bold',true,'align','center','color','#047857'),
          jsonb_build_object('id','s2-warning','kind','shape','x',100,'y',395,'w',760,'h',92,'shape','rect','fill','#FEF3C7'),
          jsonb_build_object('id','s2-warning-text','kind','text','x',125,'y',415,'w',710,'h',54,'text','⚠️ После чтения числа getline сначала\nзабирает оставшийся Enter.','size',24,'bold',true,'align','center','color','#92400E')
        )
      )
    ), true
  );

  -- 4. ACMP №1200: сөздерді соңынан бастап жинау.
  v_slides := jsonb_set(
    v_slides, '{3}',
    jsonb_build_object(
      'type','canvas', 'pageType','slide', 'templateId','canvas-blank',
      'title','3. ACMP №1200: сөздердің ретін өзгерту', 'bg','#F0FDF4',
      'blocks',jsonb_build_array(
        jsonb_build_object('id','s3-head','kind','text','x',45,'y',24,'w',870,'h',50,'text','3. ACMP №1200 · сөздерді соңынан бастап жинау','size',34,'bold',true,'color','#14532D'),
        jsonb_build_object('id','s3-in','kind','shape','x',55,'y',100,'w',850,'h',72,'shape','rect','fill','#DCFCE7'),
        jsonb_build_object('id','s3-in-text','kind','text','x',80,'y',120,'w',800,'h',34,'text','Кіріс:   Ivanov   Petrov   Sidorov','size',28,'bold',true,'align','center','color','#166534'),
        jsonb_build_object('id','s3-arrow','kind','text','x',420,'y',183,'w',120,'h',40,'text','⬇  ⬇  ⬇','size',28,'bold',true,'align','center','color','#16A34A'),
        jsonb_build_object('id','s3-step1','kind','shape','x',65,'y',235,'w',250,'h',105,'shape','rect','fill','#BBF7D0'),
        jsonb_build_object('id','s3-step2','kind','shape','x',355,'y',235,'w',250,'h',105,'shape','rect','fill','#BAE6FD'),
        jsonb_build_object('id','s3-step3','kind','shape','x',645,'y',235,'w',250,'h',105,'shape','rect','fill','#DDD6FE'),
        jsonb_build_object('id','s3-t1','kind','text','x',80,'y',255,'w',220,'h',70,'text','1️⃣ end\nсоңғы сөз','size',24,'bold',true,'align','center','color','#166534'),
        jsonb_build_object('id','s3-t2','kind','text','x',370,'y',255,'w',220,'h',70,'text','2️⃣ substr\nсөзді алу','size',24,'bold',true,'align','center','color','#075985'),
        jsonb_build_object('id','s3-t3','kind','text','x',660,'y',255,'w',220,'h',70,'text','3️⃣ result +=\nнәтижеге қосу','size',24,'bold',true,'align','center','color','#5B21B6'),
        jsonb_build_object('id','s3-out','kind','shape','x',55,'y',390,'w',850,'h',75,'shape','rect','fill','#FEF3C7'),
        jsonb_build_object('id','s3-out-text','kind','text','x',80,'y',411,'w',800,'h',34,'text','Шығыс:   Sidorov   Petrov   Ivanov','size',28,'bold',true,'align','center','color','#92400E'),
        jsonb_build_object('id','s3-bottom','kind','text','x',80,'y',488,'w',800,'h',28,'text','Символдардың ішкі реті өзгермейді — тек сөздердің орны өзгереді.','size',19,'bold',true,'align','center','color','#365314')
      ),
      'ru',jsonb_build_object(
        'title','3. ACMP №1200: меняем порядок слов',
        'blocks',jsonb_build_array(
          jsonb_build_object('id','s3-head','kind','text','x',45,'y',24,'w',870,'h',50,'text','3. ACMP №1200 · собираем слова с конца','size',34,'bold',true,'color','#14532D'),
          jsonb_build_object('id','s3-in','kind','shape','x',55,'y',100,'w',850,'h',72,'shape','rect','fill','#DCFCE7'),
          jsonb_build_object('id','s3-in-text','kind','text','x',80,'y',120,'w',800,'h',34,'text','Ввод:   Ivanov   Petrov   Sidorov','size',28,'bold',true,'align','center','color','#166534'),
          jsonb_build_object('id','s3-arrow','kind','text','x',420,'y',183,'w',120,'h',40,'text','⬇  ⬇  ⬇','size',28,'bold',true,'align','center','color','#16A34A'),
          jsonb_build_object('id','s3-step1','kind','shape','x',65,'y',235,'w',250,'h',105,'shape','rect','fill','#BBF7D0'),
          jsonb_build_object('id','s3-step2','kind','shape','x',355,'y',235,'w',250,'h',105,'shape','rect','fill','#BAE6FD'),
          jsonb_build_object('id','s3-step3','kind','shape','x',645,'y',235,'w',250,'h',105,'shape','rect','fill','#DDD6FE'),
          jsonb_build_object('id','s3-t1','kind','text','x',80,'y',255,'w',220,'h',70,'text','1️⃣ end\nпоследнее слово','size',24,'bold',true,'align','center','color','#166534'),
          jsonb_build_object('id','s3-t2','kind','text','x',370,'y',255,'w',220,'h',70,'text','2️⃣ substr\nвзять слово','size',24,'bold',true,'align','center','color','#075985'),
          jsonb_build_object('id','s3-t3','kind','text','x',660,'y',255,'w',220,'h',70,'text','3️⃣ result +=\nдобавить','size',24,'bold',true,'align','center','color','#5B21B6'),
          jsonb_build_object('id','s3-out','kind','shape','x',55,'y',390,'w',850,'h',75,'shape','rect','fill','#FEF3C7'),
          jsonb_build_object('id','s3-out-text','kind','text','x',80,'y',411,'w',800,'h',34,'text','Вывод:   Sidorov   Petrov   Ivanov','size',28,'bold',true,'align','center','color','#92400E'),
          jsonb_build_object('id','s3-bottom','kind','text','x',80,'y',488,'w',800,'h',28,'text','Внутри фамилий символы не меняются — меняется только порядок слов.','size',19,'bold',true,'align','center','color','#365314')
        )
      )
    ), true
  );

  -- 5. Негізгі әдістерді визуалды карта ретінде беру.
  v_slides := jsonb_set(
    v_slides, '{4}',
    jsonb_build_object(
      'type','canvas', 'pageType','slide', 'templateId','canvas-blank',
      'title','4. String әдістерінің картасы', 'bg','#FFF7ED',
      'blocks',jsonb_build_array(
        jsonb_build_object('id','s4-head','kind','text','x',50,'y',25,'w',860,'h',50,'text','4. String әдістерінің картасы','size',40,'bold',true,'align','center','color','#431407'),
        jsonb_build_object('id','s4-core','kind','shape','x',350,'y',195,'w',260,'h',140,'shape','ellipse','fill','#F59E0B'),
        jsonb_build_object('id','s4-core-t','kind','text','x',375,'y',235,'w',210,'h',58,'text','string','size',44,'bold',true,'align','center','color','#FFFFFF'),
        jsonb_build_object('id','s4-a','kind','shape','x',70,'y',120,'w',220,'h',90,'shape','rect','fill','#FED7AA'),
        jsonb_build_object('id','s4-b','kind','shape','x',670,'y',120,'w',220,'h',90,'shape','rect','fill','#FBCFE8'),
        jsonb_build_object('id','s4-c','kind','shape','x',70,'y',370,'w',220,'h',90,'shape','rect','fill','#BFDBFE'),
        jsonb_build_object('id','s4-d','kind','shape','x',670,'y',370,'w',220,'h',90,'shape','rect','fill','#C7D2FE'),
        jsonb_build_object('id','s4-a-t','kind','text','x',85,'y',143,'w',190,'h',44,'text','📏 length()','size',27,'bold',true,'align','center','color','#7C2D12'),
        jsonb_build_object('id','s4-b-t','kind','text','x',685,'y',143,'w',190,'h',44,'text','🔎 find()','size',27,'bold',true,'align','center','color','#9D174D'),
        jsonb_build_object('id','s4-c-t','kind','text','x',85,'y',393,'w',190,'h',44,'text','✂️ substr()','size',27,'bold',true,'align','center','color','#1E3A8A'),
        jsonb_build_object('id','s4-d-t','kind','text','x',685,'y',393,'w',190,'h',44,'text','➕ insert() / erase()','size',23,'bold',true,'align','center','color','#3730A3'),
        jsonb_build_object('id','s4-arrows','kind','text','x',255,'y',142,'w',450,'h',290,'text','↘                 ↙\n\n\n↗                 ↖','size',42,'bold',true,'align','center','color','#B45309'),
        jsonb_build_object('id','s4-footer','kind','text','x',80,'y',492,'w',800,'h',28,'text','Әр әдіс — жолмен орындалатын бір нақты әрекет.','size',20,'bold',true,'align','center','color','#7C2D12')
      ),
      'ru',jsonb_build_object(
        'title','4. Карта методов string',
        'blocks',jsonb_build_array(
          jsonb_build_object('id','s4-head','kind','text','x',50,'y',25,'w',860,'h',50,'text','4. Карта методов string','size',40,'bold',true,'align','center','color','#431407'),
          jsonb_build_object('id','s4-core','kind','shape','x',350,'y',195,'w',260,'h',140,'shape','ellipse','fill','#F59E0B'),
          jsonb_build_object('id','s4-core-t','kind','text','x',375,'y',235,'w',210,'h',58,'text','string','size',44,'bold',true,'align','center','color','#FFFFFF'),
          jsonb_build_object('id','s4-a','kind','shape','x',70,'y',120,'w',220,'h',90,'shape','rect','fill','#FED7AA'),
          jsonb_build_object('id','s4-b','kind','shape','x',670,'y',120,'w',220,'h',90,'shape','rect','fill','#FBCFE8'),
          jsonb_build_object('id','s4-c','kind','shape','x',70,'y',370,'w',220,'h',90,'shape','rect','fill','#BFDBFE'),
          jsonb_build_object('id','s4-d','kind','shape','x',670,'y',370,'w',220,'h',90,'shape','rect','fill','#C7D2FE'),
          jsonb_build_object('id','s4-a-t','kind','text','x',85,'y',143,'w',190,'h',44,'text','📏 length()','size',27,'bold',true,'align','center','color','#7C2D12'),
          jsonb_build_object('id','s4-b-t','kind','text','x',685,'y',143,'w',190,'h',44,'text','🔎 find()','size',27,'bold',true,'align','center','color','#9D174D'),
          jsonb_build_object('id','s4-c-t','kind','text','x',85,'y',393,'w',190,'h',44,'text','✂️ substr()','size',27,'bold',true,'align','center','color','#1E3A8A'),
          jsonb_build_object('id','s4-d-t','kind','text','x',685,'y',393,'w',190,'h',44,'text','➕ insert() / erase()','size',23,'bold',true,'align','center','color','#3730A3'),
          jsonb_build_object('id','s4-arrows','kind','text','x',255,'y',142,'w',450,'h',290,'text','↘                 ↙\n\n\n↗                 ↖','size',42,'bold',true,'align','center','color','#B45309'),
          jsonb_build_object('id','s4-footer','kind','text','x',80,'y',492,'w',800,'h',28,'text','Каждый метод — одно конкретное действие над строкой.','size',20,'bold',true,'align','center','color','#7C2D12')
        )
      )
    ), true
  );

  update public.cf_lessons
  set slides = v_slides,
      updated_at = now()
  where id = v_lesson;
end;
$acmp_string_visual_demo$;
