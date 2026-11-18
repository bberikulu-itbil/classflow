// Interface language (ҚАЗ / РУС / ENG). The UI is written in Kazakh; for Russian and English a watcher translates the rendered
// text, placeholders, titles and aria-labels through dict.json (Kazakh → [ru, en], built by scripts/i18n-dict). `{0}` in a key
// matches any text (template strings). The dictionary loads only when a non-Kazakh language is picked.
// shortcut: text that a component glues from several pieces (`{n} бет`) is translated only when the whole node matches a key;
// a missing key stays Kazakh. Upgrade path: wrap such strings in pick() where it matters.
import { useEffect, useState } from 'react';
import { setLang, type Lang } from '../lessons/lang';

const KEY = 'cf_ui_lang';
const ORDER: Lang[] = ['kk', 'ru', 'en'];
const CYR = /[А-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі]/;
const ATTRS = ['placeholder', 'title', 'aria-label'];
const SKIP = 'script,style,textarea,code,pre,[contenteditable="true"],[data-no-tr]';

let lang: Lang = (() => { try { const v = localStorage.getItem(KEY) as Lang; return ORDER.includes(v) ? v : 'kk'; } catch { return 'kk'; } })();
const subs = new Set<() => void>();
let exact: Map<string, [string, string]> | null = null;
let tpl: { re: RegExp; v: [string, string] }[] = [];
let loading: Promise<void> | null = null;

const load = () => loading ??= import('./dict.json').then(m => {
  const d = (m.default ?? m) as unknown as Record<string, [string, string]>;
  exact = new Map(); tpl = [];
  for (const [k, v] of Object.entries(d)) {
    if (/\{\d\}/.test(k)) tpl.push({ re: new RegExp('^' + k.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\\?\{(\d)\\?\}/g, '(.+?)') + '$', 's'), v });
    else exact.set(k, v);
  }
  tpl.sort((a, b) => b.re.source.replace(/\(\.\+\?\)/g, '').length - a.re.source.replace(/\(\.\+\?\)/g, '').length); // the most specific template wins
});
/** Loads the dictionary (tests; the app loads it on demand). */
export const loadDict = () => load();

/** One text in the current language, or null when the dictionary has no entry for it. */
const cache = new Map<string, string | null>();
export function translate(s: string, l: Lang = lang): string | null {
  if (l === 'kk' || !exact || !CYR.test(s)) return null;
  const ck = l + s;
  if (cache.has(ck)) return cache.get(ck)!;
  const r = find(s, l);
  if (cache.size > 20000) cache.clear();
  cache.set(ck, r);
  return r;
}
function find(s: string, l: Lang): string | null {
  if (!exact) return null;
  const t = s.replace(/\s+/g, ' ').trim(), i = l === 'ru' ? 0 : 1;
  let out = exact.get(t)?.[i];
  if (out === undefined) { const m = t.match(/^(.*?)([:·.…!?]+)$/); const v = m && exact.get(m[1]); if (v) out = v[i] + m![2]; }
  if (out === undefined) for (const x of tpl) { const m = t.match(x.re); if (m) { out = x.v[i].replace(/\{(\d)\}/g, (_, n) => translate(m[+n + 1], l) ?? m[+n + 1]); break; } }
  if (out === undefined) return null;
  return (s.match(/^\s*/)![0]) + out + (s.match(/\s*$/)![0]);
}

// What React wrote (the Kazakh original) and what we last wrote, per text node and per attribute.
const orig = new WeakMap<Node, string>(), mine = new WeakMap<Node, string>();
const aOrig = new WeakMap<Element, Record<string, string>>(), aMine = new WeakMap<Element, Record<string, string>>();
const skip = (el: Element | null) => !!el?.closest(SKIP);

function text(n: Text) {
  if (skip(n.parentElement)) return;
  if (!orig.has(n) || n.data !== mine.get(n)) orig.set(n, n.data); // React (or anyone) changed it: that is the new original
  const o = orig.get(n)!, want = translate(o) ?? o;
  if (n.data !== want) n.data = want;
  mine.set(n, want);
}
function attrs(el: Element) {
  if (skip(el)) return;
  const o = aOrig.get(el) ?? {}, m = aMine.get(el) ?? {};
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (v === null) continue;
    if (!(a in o) || v !== m[a]) o[a] = v;
    const want = translate(o[a]) ?? o[a];
    if (v !== want) el.setAttribute(a, want);
    m[a] = want;
  }
  aOrig.set(el, o); aMine.set(el, m);
}
function walk(root: Node) {
  if (root.nodeType === 3) return text(root as Text);
  if (root.nodeType !== 1) return;
  attrs(root as Element);
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = w.nextNode(); n; n = w.nextNode()) n.nodeType === 3 ? text(n as Text) : attrs(n as Element);
}

let obs: MutationObserver | null = null;
function start() {
  if (obs || typeof document === 'undefined') return;
  obs = new MutationObserver(list => {
    for (const r of list) {
      if (r.type === 'characterData') text(r.target as Text);
      else if (r.type === 'attributes') attrs(r.target as Element);
      else r.addedNodes.forEach(walk);
    }
  });
  obs.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}

function apply() {
  document.documentElement.lang = lang === 'kk' ? 'kk' : lang;
  if (lang === 'kk' && !exact) return; // never translated: nothing to undo
  start(); walk(document.body);
}

/** Starts the watcher (call once at boot). */
export function initUiLang() {
  if (lang === 'kk') return apply();
  load().then(apply);
}

export function setUiLang(l: Lang) {
  lang = l;
  try { localStorage.setItem(KEY, l); } catch { /* private mode: keep it in memory */ }
  setLang(l); // lessons follow the interface; the board's own switch still changes only the lesson language
  (l === 'kk' ? Promise.resolve() : load()).then(() => { apply(); subs.forEach(f => f()); });
}

export function useUiLang(): Lang {
  const [, bump] = useState(0);
  useEffect(() => { const f = () => bump(n => n + 1); subs.add(f); return () => { subs.delete(f); }; }, []);
  return lang;
}
