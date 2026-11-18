import { setUiLang, useUiLang } from './index';
import type { Lang } from '../lessons/lang';

const OPTS: [Lang, string, string][] = [['kk', 'ҚАЗ', 'Қазақша'], ['ru', 'РУС', 'Русский'], ['en', 'ENG', 'English']];

/** ҚАЗ · РУС · ENG — the interface language (also sets the lesson language). */
export function LangSwitch({ className = '' }: { className?: string }) {
  const cur = useUiLang();
  return (
    <div role="radiogroup" aria-label="Тіл · Язык · Language" data-no-tr className={`inline-flex rounded-lg border border-border bg-surface p-0.5 ${className}`}>
      {OPTS.map(([l, short, name]) => (
        <button key={l} type="button" role="radio" aria-checked={cur === l} lang={l} title={name} onClick={() => setUiLang(l)}
          className={`min-h-[36px] min-w-[44px] rounded-md px-2 text-xs font-bold cursor-pointer ${cur === l ? 'bg-accent text-on-accent' : 'text-text-secondary hover:bg-surface-2'}`}>
          {short}
        </button>
      ))}
    </div>
  );
}
