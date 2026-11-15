import React, { useEffect, useRef, useState } from 'react';
import { sb } from '../config';
import { Icon } from './Icons';
import { pick, type Lang } from '../lessons/lang';

interface Q { id: string; slide_index: number; body: string; resolved: boolean }

/** "Түсінбедім": an edge tab that opens a panel where the student writes a question about the slide on the screen. The teacher sees it with the slide number. */
export function AskPanel({ sid, me, slide, kind, lang }: { sid: string; me: any; slide: number; kind: string; lang: Lang }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [mine, setMine] = useState<Q[]>([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const area = useRef<HTMLTextAreaElement | null>(null);

  const load = async () => {
    const { data } = await sb.from('cf_questions').select('id,slide_index,body,resolved').eq('session_id', sid).eq('student_id', me.id).order('created_at', { ascending: false }).limit(20);
    if (data) setMine(data as Q[]);
  };
  useEffect(() => {
    if (!open) return;
    load();
    area.current?.focus();
    const ch = sb.channel(`ask-${sid}-${me.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'cf_questions', filter: `session_id=eq.${sid}` }, () => load()).subscribe();
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', esc);
    return () => { sb.removeChannel(ch); document.removeEventListener('keydown', esc); };
  }, [open, sid]);

  const send = async () => {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true); setErr('');
    const { error } = await sb.rpc('cf_ask', { p_session: sid, p_slide: slide, p_body: body });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setText('');
    load();
  };

  const quick = [
    pick(lang, 'Мұны түсінбедім', 'Это не понял(а)', 'I did not get this'),
    pick(lang, 'Қадамды түсінбедім', 'Не понял(а) шаг', 'I did not get the step'),
    pick(lang, 'Қайта түсіндіріңіз', 'Объясните ещё раз', 'Please explain again'),
  ];

  return (
    <>
      {!open && (
        <button type="button" data-testid="ask-open" onClick={() => setOpen(true)} aria-label={pick(lang, 'Түсінбедім: сұрақ жазу', 'Не понял: задать вопрос', 'Ask a question')}
          className="fixed bottom-4 right-4 z-30 flex h-12 items-center gap-2 rounded-full bg-text px-4 text-sm font-semibold text-bg shadow-pop sm:bottom-auto sm:right-0 sm:top-1/2 sm:h-36 sm:w-11 sm:-translate-y-1/2 sm:flex-col sm:justify-center sm:rounded-l-2xl sm:rounded-r-none sm:px-0">
          <Icon n="help" size={20} />
          <span className="sm:[writing-mode:vertical-rl] sm:rotate-180">{pick(lang, 'Түсінбедім', 'Не понял', 'Ask')}</span>
        </button>
      )}
      {open && (
        <aside data-testid="ask-panel" role="dialog" aria-label={pick(lang, 'Түсінбедім', 'Не понял', 'Ask a question')}
          className="fixed bottom-0 right-0 top-0 z-40 flex w-full flex-col gap-3 overflow-y-auto border-l border-border bg-surface p-5 shadow-pop sm:w-[22rem]">
          <div className="flex items-center justify-between">
            <b className="text-base">{pick(lang, 'Түсінбедім', 'Не понял', 'Ask a question')}</b>
            <button type="button" onClick={() => setOpen(false)} aria-label={pick(lang, 'Жабу', 'Закрыть', 'Close')} className="grid h-11 w-11 place-items-center rounded-xl text-text-secondary hover:bg-bg"><Icon n="x" size={20} /></button>
          </div>
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <span className="rounded-full bg-bg px-2.5 py-1 font-bold text-text">{slide + 1} · {kind}</span>
            <span>{pick(lang, 'слайдына сұрақ', 'вопрос к слайду', 'question about this slide')}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {quick.map(q => <button key={q} type="button" onClick={() => setText(q)} className="min-h-9 rounded-full border border-border bg-surface px-3 text-sm hover:bg-bg">{q}</button>)}
          </div>
          <label htmlFor="ask-text" className="text-sm font-semibold">{pick(lang, 'Қай жері түсініксіз?', 'Что непонятно?', 'What is unclear?')}</label>
          <textarea id="ask-text" ref={area} value={text} maxLength={500} onChange={e => setText(e.target.value)} className="h-32 resize-none rounded-xl border-[1.5px] border-text bg-surface p-3 text-base leading-snug text-text outline-none" />
          {err && <div role="alert" className="text-sm font-semibold text-red-700">{err}</div>}
          <button type="button" data-testid="ask-send" onClick={send} disabled={!text.trim() || busy} className="h-11 rounded-xl bg-text text-sm font-bold text-bg disabled:opacity-50">{pick(lang, 'Мұғалімге жіберу', 'Отправить учителю', 'Send to the teacher')}</button>
          <p className="text-xs leading-snug text-text-secondary">{pick(lang, 'Сұрақ слайд нөмірімен мұғалімге барады. Сыныпқа көрінбейді.', 'Вопрос уйдёт учителю с номером слайда. Класс его не увидит.', 'The question goes to the teacher with the slide number. The class does not see it.')}</p>
          {mine.length > 0 && (
            <div className="space-y-2 border-t border-border pt-3">
              <div className="text-sm font-semibold">{pick(lang, 'Менің сұрақтарым', 'Мои вопросы', 'My questions')}</div>
              {mine.map(q => (
                <div key={q.id} className="flex items-start justify-between gap-2 rounded-xl bg-bg p-2.5 text-sm">
                  <span><b>{q.slide_index + 1}:</b> {q.body}</span>
                  {q.resolved && <span className="shrink-0 font-semibold text-emerald-800">{pick(lang, 'Жауап берілді', 'Отвечено', 'Answered')}</span>}
                </div>
              ))}
            </div>
          )}
        </aside>
      )}
    </>
  );
}
