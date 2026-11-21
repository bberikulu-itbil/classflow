import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const SLIDE_SCHEMA = `Слайд түрлері (JSON объектілері):
{"type":"title","title":"","subtitle":""}
{"type":"content","title":"","bullets":[""],"notes":"мұғалімге жазба"}
{"type":"quiz","title":"","prompt":"","options":["","",""],"answer":0,"points":2,"explanation":"","notes":""}   // answer = дұрыс нұсқаның нөмірі (0-ден)
{"type":"task","title":"","prompt":"","accept":["қабылданатын жауап (кіші әріппен)"],"points":3}
{"type":"code","title":"","prompt":"","starter":"Python бастапқы код","hints":["кеңес1","кеңес2"],"tests":[{"input":"stdin мәтіні","out":"күтілетін stdout","label":"Мысал 1"},{"input":"","out":"","hidden":true}],"points":5}   // tests: 3-4 тест, кемі 1 жасырын; out дәл print нәтижесі болуы керек
{"type":"matching","title":"","pairs":[{"l":"","r":""}]}
{"type":"flashcards","title":"","cards":[{"front":"","back":""}]}
{"type":"logic","title":"","prompt":"","gate":"AND"}   // AND|OR|XOR|NOT, тек логика тақырыбына
{"type":"leaderboard","title":"🏆 Нәтиже"}`;

const VARIANT_SHAPE: Record<string, string> = {
  quiz: '{"q":"сұрақ","options":["","","",""],"answer":0,"why":"неге дұрыс"}   // answer = дұрыс нұсқаның нөмірі (0-ден), 4 әртүрлі нұсқа',
  short: '{"q":"сұрақ","accept":["дұрыс жауап","басқа дұрыс жазылуы"],"why":"шешуі"}   // жауап қысқа: сан, сөз немесе код',
  match: '{"q":"нұсқау","left":["","",""],"right":["","",""],"why":""}   // left[i] ↔ right[i] дұрыс жұп; оң жақ мәндері әртүрлі',
};

function build(mode: string, b: any): { system: string; user: string } {
  const lang = b.lang === 'ru' ? 'орыс' : b.lang === 'en' ? 'ағылшын' : 'қазақ';
  const ctx = `Пән: ${b.subject || 'Информатика'}. Сынып: ${b.grade || ''}. Тақырып: ${b.topic}. Тіл: ${lang}. Қосымша тілек: ${b.extra || '—'}`;
  const base = 'Сен Қазақстан мектебінің тәжірибелі мұғалімісің. Жауабың ТЕК жарамды JSON болсын: markdown, түсініктеме, ``` белгілері жоқ.';
  if (mode === 'variants') {
    return {
      system: base,
      user: `Емтихан тапсырмасының үлгісі (JSON): ${b.sample}\nОсыған ұқсас, қиындығы бірдей, бірақ сандары/мазмұны басқа ${b.count} жаңа нұсқа жаса. Әр нұсқаның жауабын өзің тексер: жауап міндетті түрде дұрыс болсын. Үлгіні қайталама, нұсқалар бір-бірін қайталамасын. Тіл: ${lang}. Қосымша тілек: ${b.extra || '—'}\nӘр нұсқа пішімі: ${VARIANT_SHAPE[b.kind] || VARIANT_SHAPE.short}\nФормат: {"variants":[...]}`,
    };
  }
  if (mode === 'slides') {
    return {
      system: base,
      user: `${ctx}\nСабаққа ${b.count || 10} слайд жаса: бірінші title, соңында leaderboard, ортасында түсіндіру (content), тест (quiz), қысқа жауап (task), керек болса code (Python, автотестпен) және ойын слайдтары (matching/flashcards).\n${SLIDE_SCHEMA}\nФормат: {"slides":[...],"terms":[{"term":"","definition":""}]} — terms: сабақтың 4-8 негізгі термині. Нақты, қате жоқ мазмұн жаз.`,
    };
  }
  if (mode === 'lesson') {
    return {
      system: base,
      user: `${ctx}. Ұзақтығы: ${b.minutes || 45} минут.\nСабақ жоспарын жаса. Формат: {"goals":["оқу мақсаттары"],"outcomes":["күтілетін нәтиже"],"steps":[{"stage":"кезең атауы","minutes":5,"teacher":"мұғалім әрекеті","student":"оқушы әрекеті","assessment":"бағалау"}],"homework":"","resources":[""]}. Минуттар қосындысы ұзақтыққа тең болсын.`,
    };
  }
  return {
    system: base,
    user: `${ctx}. Тоқсан: ${b.quarter || 1}. Аптасына ${b.hours || 1} сағат, ${b.weeks || 9} апта.\nТоқсандық жоспар жаса. Формат: {"rows":[{"week":1,"topic":"","hours":1,"outcome":"оқу мақсаты","assessment":"бағалау түрі (ФБ/БЖБ/ТЖБ/—)"}]}. Соңында қорытынды бақылау (ТЖБ) болсын.`,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const auth = req.headers.get('Authorization') ?? '';
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const { data: u } = await sb.auth.getUser();
    if (!u?.user) return json({ error: 'Кіру керек' }, 401);
    const { data: prof } = await sb.from('profiles').select('role').eq('id', u.user.id).maybeSingle();
    if (!prof || !['teacher', 'class_teacher', 'deputy', 'admin'].includes(String(prof.role))) return json({ error: 'Тек мұғалімдерге' }, 403);

    const key = Deno.env.get('ANTHROPIC_API_KEY');
    if (!key) return json({ error: 'ANTHROPIC_API_KEY әлі орнатылмаған (Supabase → Edge Functions → Secrets)' }, 500);

    const b = await req.json();
    const mode = String(b.mode);
    if (!['slides', 'lesson', 'quarter', 'variants'].includes(mode)) return json({ error: 'mode қате' }, 400);
    b.topic = String(b.topic || '').slice(0, 300); b.extra = String(b.extra || '').slice(0, 600);
    if (mode === 'variants') {
      b.sample = JSON.stringify(b.sample ?? {}).slice(0, 4000); b.kind = String(b.kind || 'short');
      b.count = Math.min(Math.max(+b.count || 5, 1), 25);
    } else {
      b.count = Math.min(Math.max(+b.count || 10, 3), 20);
      if (!b.topic) return json({ error: 'Тақырып жаз' }, 400);
    }

    const { system, user } = build(mode, b);
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-sonnet-5-5', max_tokens: 12000, system, messages: [{ role: 'user', content: user }] }),
    });
    const j = await r.json();
    if (!r.ok) return json({ error: j?.error?.message ?? 'ЖИ қатесі' }, 502);
    const text: string = (j.content ?? []).map((c: any) => c.text ?? '').join('');
    const a = text.indexOf('{'), z = text.lastIndexOf('}');
    if (a < 0 || z < a) return json({ error: 'ЖИ JSON қайтармады' }, 502);
    return json({ result: JSON.parse(text.slice(a, z + 1)) });
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
