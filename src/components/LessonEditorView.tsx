import React, { useState, useEffect } from 'react';
import { sb } from '../config';
import { TopBar } from './TopBar';
import { BTN_G, INP } from './Widgets';
import { AiPanel } from './AiPanel';

const SAMPLE = [
  { type: 'title', title: 'Алгоритм', subtitle: '7-сынып · Информатика' },
  { type: 'content', title: 'Алгоритм деген не?', bullets: ['Әрекеттердің ретті тізбегі', 'Орындаушыға түсінікті болуы керек', 'Соңы бар (ақырлы)'], notes: 'Тұрмыстық мысал: шай қайнату' },
  { type: 'quiz', title: 'Тест', prompt: 'Қайсысы алгоритм қасиеті?', options: ['Дискреттілік', 'Түс', 'Салмақ'], answer: 0, points: 2, time: 20, speed: true, explanation: 'Алгоритм қадамдарға бөлінеді.' },
  { type: 'task', title: 'Қысқа жауап', prompt: 'Бағдарлама қай тілде жазылады: Python, ____ ? (бір сөз: C++)', accept: ['c++'], points: 3 },
  { type: 'code', title: 'Қосынды', prompt: 'Екі бүтін санды оқып (әрқайсысы жеке жолда), олардың қосындысын шығар.', starter: 'a = int(input())\nb = int(input())\n', hints: ['input() жол қайтарады, int() арқылы санға айналдыр', 'print(a + b)'], tests: [{ input: '3\n4', out: '7', label: 'Мысал 1' }, { input: '-5\n5', out: '0' }, { input: '100\n250', out: '350', hidden: true }], points: 5 },
  { type: 'logic', title: 'Логикалық вентиль', prompt: 'A және B-ні басып көр', gate: 'AND' },
  { type: 'matching', title: 'Сәйкестендір', pairs: [{ l: 'print', r: 'шығару' }, { l: 'input', r: 'енгізу' }, { l: 'len', r: 'ұзындық' }] },
  { type: 'flashcards', title: 'Терминдер', cards: [{ front: 'Алгоритм', back: 'Қадамдар тізбегі' }, { front: 'Айнымалы', back: 'Атауы бар жад ұясы' }] },
  { type: 'leaderboard', title: '🏆 Нәтиже' },
];

export function LessonEditorView({ id, me, onLogout }: { id: string; me: any; onLogout: () => void }) {
  const isNew = id === 'new';
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Информатика');
  const [slidesJson, setSlidesJson] = useState('');
  const [termsJson, setTermsJson] = useState('');

  useEffect(() => {
    if (isNew) {
      setTitle('');
      setSubject('Информатика');
      setSlidesJson(JSON.stringify(SAMPLE, null, 1));
      setTermsJson(JSON.stringify([{ term: 'Алгоритм', definition: 'Есепті шешу қадамдарының тізбегі' }], null, 1));
    } else {
      sb.from('cf_lessons').select('*').eq('id', id).single().then(({ data }) => {
        if (data) {
          setTitle(data.title || '');
          setSubject(data.subject || '');
          setSlidesJson(JSON.stringify(data.slides || [], null, 1));
          setTermsJson(JSON.stringify(data.terms || [], null, 1));
        }
      });
    }
  }, [id, isNew]);

  return (
    <div className="min-h-screen bg-[#F4F5F7] text-white">
      <TopBar me={me} onLogout={onLogout} />
      <div className="max-w-3xl mx-auto p-4 space-y-3">
        <h2 className="font-bold text-xl text-black">{isNew ? 'Жаңа сабақ' : 'Сабақты өңдеу'}</h2>
        <AiPanel
          mode="slides"
          countLabel="Слайд саны"
          countDef={10}
          onResult={r => {
            setSlidesJson(JSON.stringify(r.slides || [], null, 1));
            setTermsJson(JSON.stringify(r.terms || [], null, 1));
            alert('Слайдтар дайын. Тест жауаптары мен код-тесттерді тексеріп шық!');
          }}
          onParams={v => {
            if (!title.trim()) setTitle(v.topic);
          }}
        />
        <input
          className={`${INP} text-white`}
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Сабақ тақырыбы"
        />
        <input
          className={`${INP} text-white`}
          value={subject}
          onChange={e => setSubject(e.target.value)}
          placeholder="Пән"
        />
        <p className="text-xs text-slate-500">
          Слайдтар (JSON). Түрлері: title, content, quiz, task, code, logic, matching, flashcards, leaderboard. quiz: answer = дұрыс нұсқа нөмірі (0-ден); task: accept = қабылданатын жауаптар; time = секунд, speed:true = жылдамдыққа бонус; code: tests = [&#123;input, out, hidden?&#125;], hints = [...].
        </p>
        <textarea
          className={`${INP} font-mono h-96 text-white`}
          value={slidesJson}
          onChange={e => setSlidesJson(e.target.value)}
        />
        <p className="text-xs text-slate-500">Терминдер (JSON): [&#123;term, definition&#125;]</p>
        <textarea
          className={`${INP} font-mono h-28 text-white`}
          value={termsJson}
          onChange={e => setTermsJson(e.target.value)}
        />
        <button
          className={BTN_G}
          onClick={async () => {
            let slides, terms;
            try {
              slides = JSON.parse(slidesJson);
              terms = JSON.parse(termsJson || '[]');
              if (!Array.isArray(slides)) throw 0;
            } catch {
              alert('JSON қате');
              return;
            }
            if (!title.trim()) {
              alert('Тақырып жаз');
              return;
            }
            const row = { title: title.trim(), subject, slides, terms };
            if (isNew) {
              await sb.from('cf_lessons').insert({ ...row, owner_id: me.id, school_id: me.school_id, plan: {} });
            } else {
              await sb.from('cf_lessons').update({ ...row, updated_at: new Date().toISOString() }).eq('id', id);
            }
            alert('Сақталды');
            window.location.hash = '';
          }}
        >
          Сақтау
        </button>
      </div>
    </div>
  );
}
