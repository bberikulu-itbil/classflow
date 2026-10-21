import React, { useState } from 'react';
import { sb } from '../config';
import { BTN_P, INP } from './Widgets';

export async function ai(mode: string, body: any) {
  const { data, error } = await sb.functions.invoke('cf-ai', { body: { mode, ...body } });
  if (error) {
    let m = error.message;
    try {
      m = (await error.context.json()).error || m;
    } catch {}
    alert(m);
    throw error;
  }
  if (data?.error) {
    alert(data.error);
    throw new Error(data.error);
  }
  return data.result;
}

export function AiPanel({
  mode,
  countLabel,
  countDef,
  onResult,
  onParams,
  extraFields = [],
}: {
  mode: string;
  countLabel: string;
  countDef: number;
  onResult: (res: any) => void;
  onParams?: (p: any) => void;
  extraFields?: Array<[string, string, React.ReactNode]>;
}) {
  const [topic, setTopic] = useState('');
  const [grade, setGrade] = useState('7');
  const [cnt, setCnt] = useState(String(countDef));
  const [extra, setExtra] = useState('');
  const [busy, setBusy] = useState(false);
  const [btnText, setBtnText] = useState('✨ ЖИ-мен жасау');

  const handleAi = async () => {
    if (!topic.trim()) {
      alert('Тақырып жаз');
      return;
    }
    setBusy(true);
    setBtnText('⏳ ЖИ жазып жатыр (30-90 сек)...');
    const params = {
      topic: topic.trim(),
      grade,
      count: +cnt,
      extra,
      ...Object.fromEntries(extraFields.map(([k, , inp]: any) => [k, (inp as any).props?.value])),
    };
    try {
      if (onParams) onParams(params);
      const res = await ai(mode, params);
      onResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
      setBtnText('✨ ЖИ-мен жасау');
    }
  };

  return (
    <div className="p-3 rounded-2xl bg-indigo-950 border border-indigo-700 space-y-2 text-white">
      <div className="font-bold">✨ ЖИ көмекші</div>
      <div className="flex gap-2 flex-wrap">
        <input className={INP} placeholder="Тақырып, мыс: Циклдер (for)" value={topic} onChange={e => setTopic(e.target.value)} />
        <input className={`${INP} !w-20`} placeholder="Сынып" value={grade} onChange={e => setGrade(e.target.value)} />
        <input className={`${INP} !w-24`} placeholder={countLabel} value={cnt} onChange={e => setCnt(e.target.value)} />
        {extraFields.map(([k, , inp], i) => (
          <React.Fragment key={i}>{inp}</React.Fragment>
        ))}
      </div>
      <input className={INP} placeholder="Қосымша тілек (міндетті емес)" value={extra} onChange={e => setExtra(e.target.value)} />
      <button disabled={busy} onClick={handleAi} className={`${BTN_P} disabled:opacity-50`}>
        {btnText}
      </button>
      <p className="text-xs text-indigo-300">ЖИ қателесуі мүмкін: нәтижені міндетті түрде тексер.</p>
    </div>
  );
}
