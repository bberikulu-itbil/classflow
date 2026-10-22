import React, { useState, useEffect } from 'react';
import { sb } from '../config';
import { TopBar } from './TopBar';
import { BTN, BTN_P, BTN_G, INP } from './Widgets';
import { AiPanel } from './AiPanel';

const PLAN_COLS: any = {
  lesson: [
    ['stage', 'Кезең', 'w-28'],
    ['minutes', 'Мин', 'w-14'],
    ['teacher', 'Мұғалім', 'w-48'],
    ['student', 'Оқушы', 'w-48'],
    ['assessment', 'Бағалау', 'w-28'],
  ],
  quarter: [
    ['week', 'Апта', 'w-14'],
    ['topic', 'Тақырып', 'w-48'],
    ['hours', 'Сағат', 'w-14'],
    ['outcome', 'Оқу мақсаты', 'w-56'],
    ['assessment', 'Бағалау', 'w-24'],
  ],
};

function printPlan(kind: string, title: string, c: any) {
  const cols = PLAN_COLS[kind];
  const esc = (x: any) => String(x ?? '').replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[m] as string);
  const list = (t: string, a: string[]) => (a && a.length ? `<h3>${t}</h3><ul>${a.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '');
  const rows = c.rows || [];
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`<!doctype html><meta charset="utf-8"><title>${esc(title)}</title>
<style>
body{font-family:Inter,sans-serif;padding:24px;color:#111}
h1{font-size:22px;margin-bottom:4px}
h3{font-size:14px;margin:12px 0 4px;color:#333}
ul{margin:0;padding-left:20px;font-size:13px}
table{width:100%;border-collapse:collapse;margin-top:16px;font-size:12px}
th,td{border:1px solid #cbd5e1;padding:6px 8px;vertical-align:top}
th{background:#f1f5f9;text-align:left}
</style>
<h1>${esc(title)}</h1>
${list('Мақсаттар', c.goals)}
${list('Күтілетін нәтиже', c.outcomes)}
<table><thead><tr>${cols.map(([_, h]: any) => `<th>${h}</th>`).join('')}</tr></thead>
<tbody>${rows.map((r: any) => `<tr>${cols.map(([k]: any) => `<td>${esc(r[k])}</td>`).join('')}</tr>`).join('')}</tbody>
</table>
${c.homework ? `<h3>Үй тапсырмасы:</h3><p>${esc(c.homework)}</p>` : ''}
`);
  w.document.close();
  w.print();
}

export function PlanEditorView({ id, me, onLogout }: { id: string; me: any; onLogout: () => void }) {
  const isNew = id === 'new';
  const [plan, setPlan] = useState<any>({
    kind: 'quarter',
    title: '',
    quarter: 1,
    content: { rows: [], goals: [], outcomes: [], homework: '' },
    class_id: null,
  });
  const [classes, setClasses] = useState<any[]>([]);

  useEffect(() => {
    sb.from('classes').select('id,name').order('name').then(({ data }) => {
      if (data) setClasses(data);
    });
    if (!isNew) {
      sb.from('cf_plans').select('*').eq('id', id).single().then(({ data }) => {
        if (data) {
          if (!data.content.rows) data.content.rows = data.content.steps || [];
          setPlan(data);
        }
      });
    }
  }, [id, isNew]);

  const updateContent = (updater: (c: any) => void) => {
    const nextC = JSON.parse(JSON.stringify(plan.content));
    updater(nextC);
    setPlan({ ...plan, content: nextC });
  };

  const kind = plan.kind;
  const cols = PLAN_COLS[kind];
  const c = plan.content || {};

  const linesKey = (key: string, label: string) => (
    <textarea
      className={`${INP} h-20 text-white`}
      placeholder={label + ' (әр жол — бір пункт)'}
      value={(c[key] || []).join('\n')}
      onChange={e => {
        const val = e.target.value.split('\n');
        updateContent(content => {
          content[key] = val;
        });
      }}
    />
  );

  return (
    <div className="min-h-screen bg-bg text-white">
      <TopBar me={me} onLogout={onLogout} />
      <div className="max-w-5xl mx-auto p-4 space-y-3">
        <h2 className="font-bold text-xl text-black">{isNew ? 'Жаңа жоспар' : 'Жоспарды өңдеу'}</h2>
        <div className="flex gap-2 flex-wrap">
          <select
            className={`${INP} !w-auto text-white`}
            value={plan.kind}
            onChange={e => setPlan({ ...plan, kind: e.target.value, content: { rows: [], goals: [], outcomes: [], homework: '' } })}
          >
            <option value="quarter">Тоқсандық жоспар</option>
            <option value="lesson">Сабақ жоспары</option>
          </select>
          <select
            className={`${INP} !w-auto text-white`}
            value={plan.class_id || ''}
            onChange={e => setPlan({ ...plan, class_id: e.target.value || null })}
          >
            <option value="">Сынып</option>
            {classes.map(cl => (
              <option key={cl.id} value={cl.id}>{cl.name}</option>
            ))}
          </select>
          <input
            className={`${INP} !w-20 text-white`}
            type="number"
            min={1}
            max={4}
            value={plan.quarter || 1}
            onChange={e => setPlan({ ...plan, quarter: +e.target.value })}
            title="Тоқсан"
          />
        </div>
        <input
          className={`${INP} text-white`}
          placeholder="Атауы"
          value={plan.title || ''}
          onChange={e => setPlan({ ...plan, title: e.target.value })}
        />

        {kind === 'quarter' ? (
          <AiPanel
            mode="quarter"
            countLabel="Апта"
            countDef={9}
            onResult={res => {
              updateContent(content => {
                content.rows = res.rows || [];
              });
              alert('Жоспар дайын, тексеріп шық');
            }}
            onParams={v => {
              v.quarter = +plan.quarter;
              v.weeks = v.count;
              if (!plan.title) setPlan((p: any) => ({ ...p, title: `${v.grade}-сынып · ${plan.quarter}-тоқсан · ${v.topic}` }));
            }}
            extraFields={[['hours', '', <input key="h" className={`${INP} !w-24 text-white`} placeholder="Сағат/апта" defaultValue={1} />]]}
          />
        ) : (
          <AiPanel
            mode="lesson"
            countLabel="Минут"
            countDef={45}
            onResult={res => {
              updateContent(content => {
                content.goals = res.goals;
                content.outcomes = res.outcomes;
                content.homework = res.homework;
                content.rows = res.steps || [];
              });
              alert('Жоспар дайын, тексеріп шық');
            }}
            onParams={v => {
              v.minutes = v.count;
              if (!plan.title) setPlan((p: any) => ({ ...p, title: v.topic }));
            }}
          />
        )}

        <div className="space-y-3 bg-slate-900 p-4 rounded-2xl">
          {kind === 'lesson' && (
            <div className="space-y-2">
              {linesKey('goals', 'Мақсаттар')}
              {linesKey('outcomes', 'Күтілетін нәтиже')}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {cols.map(([_, h]: any, i: number) => (
                    <th key={i} className="text-left text-xs text-slate-400 px-1">{h}</th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {(c.rows || []).map((row: any, i: number) => (
                  <tr key={i}>
                    {cols.map(([key, , w]: any, ci: number) => (
                      <td key={ci} className="p-0.5 align-top">
                        <textarea
                          className={`${INP} !px-2 !py-1 h-14 ${w} text-white`}
                          rows={2}
                          value={row[key] ?? ''}
                          onChange={e => {
                            const val = e.target.value;
                            updateContent(content => {
                              content.rows[i][key] = val;
                            });
                          }}
                        />
                      </td>
                    ))}
                    <td>
                      <button
                        className={BTN + ' !px-2'}
                        onClick={() => {
                          updateContent(content => {
                            content.rows.splice(i, 1);
                          });
                        }}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            className={BTN}
            onClick={() => {
              updateContent(content => {
                if (!content.rows) content.rows = [];
                content.rows.push({});
              });
            }}
          >
            + Жол
          </button>
          {kind === 'lesson' && (
            <input
              className={`${INP} text-white`}
              placeholder="Үй тапсырмасы"
              value={c.homework || ''}
              onChange={e => {
                const val = e.target.value;
                updateContent(content => {
                  content.homework = val;
                });
              }}
            />
          )}
        </div>

        <div className="flex gap-2">
          <button
            className={BTN_G}
            onClick={async () => {
              if (!plan.title.trim()) {
                alert('Атауын жаз');
                return;
              }
              const row = {
                kind: plan.kind,
                title: plan.title.trim(),
                class_id: plan.class_id || null,
                quarter: +plan.quarter || null,
                content: plan.content,
                updated_at: new Date().toISOString(),
              };
              if (isNew) {
                await sb.from('cf_plans').insert({ ...row, school_id: me.school_id });
              } else {
                await sb.from('cf_plans').update(row).eq('id', id);
              }
              alert('Сақталды');
              window.location.hash = 'plans';
            }}
          >
            Сақтау
          </button>
          <button className={BTN} onClick={() => printPlan(plan.kind, plan.title, plan.content)}>
            🖨 Басып шығару / PDF
          </button>
          {!isNew && (
            <button
              className={BTN + ' !bg-red-800 !text-white'}
              onClick={async () => {
                if (confirm('Жоспарды өшіру керек пе?')) {
                  await sb.from('cf_plans').delete().eq('id', id);
                  window.location.hash = 'plans';
                }
              }}
            >
              Өшіру
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
