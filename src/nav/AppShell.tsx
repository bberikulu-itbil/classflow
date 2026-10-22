import React, { useEffect, useRef, useState } from 'react';
import { Menu, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { ROLE_NAMES, activeSection, sectionTo, sectionsFor } from './config';
import type { Role, Section } from './config';

const KEY = 'cf_nav_collapsed';
const readPref = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };
const writePref = (v: boolean) => { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch { /* private mode: the menu still works, it just forgets */ } };

interface Who { full_name: string; role: string }
const initials = (n: string) => (n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

function Logo() {
  return <a href="#" className="font-black text-xl">Class<span className="text-accent">Flow</span></a>;
}

function IconBtn({ label, onClick, children, expanded, controls, ref }: {
  label: string; onClick: () => void; children: React.ReactNode; expanded?: boolean; controls?: string; ref?: React.Ref<HTMLButtonElement>;
}) {
  return (
    <button ref={ref} type="button" aria-label={label} aria-expanded={expanded} aria-controls={controls} onClick={onClick}
      className="grid place-items-center h-11 w-11 shrink-0 rounded-md text-text-secondary hover:bg-surface-2 hover:text-text cursor-pointer">
      {children}
    </button>
  );
}

/** Label bubble shown next to an icon when the menu is collapsed (hover or keyboard focus). */
function Tip({ text }: { text: string }) {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute left-full ml-2 z-50 whitespace-nowrap rounded-md bg-text text-surface text-xs font-medium px-2 py-1 shadow-pop opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100">
      {text}
    </span>
  );
}

const linkCls = (collapsed: boolean, active: boolean) =>
  `group relative flex items-center gap-3 min-h-[44px] rounded-md text-sm font-medium transition-colors ${collapsed ? 'justify-center' : 'px-3'} ${active ? 'bg-accent-soft text-on-accent-soft' : 'text-text-secondary hover:bg-surface-2 hover:text-text'}`;

function NavItem({ s, active, collapsed }: { s: Section; active: boolean; collapsed: boolean }) {
  const Icon = s.icon;
  return (
    <a href={'#' + sectionTo(s)} aria-current={active ? 'page' : undefined} aria-label={collapsed ? s.label : undefined} className={linkCls(collapsed, active)}>
      <Icon size={20} aria-hidden="true" className="shrink-0" />
      {!collapsed && <span className="truncate">{s.label}</span>}
      {collapsed && <Tip text={s.label} />}
    </a>
  );
}

function Body({ sections, active, collapsed, me, onToggle, onClose, closeRef }: {
  sections: Section[]; active?: Section; collapsed: boolean; me: Who;
  onToggle?: () => void; onClose?: () => void; closeRef?: React.Ref<HTMLButtonElement>;
}) {
  return (
    <>
      <div className={`flex items-center h-14 shrink-0 ${collapsed ? 'justify-center px-2' : 'justify-between px-3'}`}>
        {!collapsed && <Logo />}
        {onToggle && (
          <IconBtn label={collapsed ? 'Мәзірді жаю' : 'Мәзірді жию'} expanded={!collapsed} onClick={onToggle}>
            {collapsed ? <PanelLeftOpen size={20} aria-hidden="true" /> : <PanelLeftClose size={20} aria-hidden="true" />}
          </IconBtn>
        )}
        {onClose && <IconBtn label="Мәзірді жабу" onClick={onClose} ref={closeRef}><X size={20} aria-hidden="true" /></IconBtn>}
      </div>
      {/* no overflow clipping while collapsed, otherwise the hover labels would be cut off */}
      <nav aria-label="Негізгі мәзір" className={`flex-1 px-2 py-2 ${collapsed ? '' : 'overflow-y-auto'}`}>
        <ul className="space-y-1">
          {sections.map(s => <li key={s.key}><NavItem s={s} active={s === active} collapsed={collapsed} /></li>)}
        </ul>
      </nav>
      {!collapsed && <p className="px-4 pb-1 text-xs text-text-muted">ClassFlow v{__APP_VERSION__}</p>}
      <div className="shrink-0 border-t border-border p-2">
        <a href="#profile" aria-label={collapsed ? `Профиль: ${me.full_name}` : undefined} className={linkCls(collapsed, false)}>
          <span aria-hidden="true" className="grid place-items-center h-8 w-8 shrink-0 rounded-full bg-accent-soft text-on-accent-soft text-xs font-bold">{initials(me.full_name)}</span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate text-text">{me.full_name}</span>
              <span className="block truncate text-xs text-text-muted font-normal">{ROLE_NAMES[me.role] || me.role}</span>
            </span>
          )}
          {collapsed && <Tip text="Профиль" />}
        </a>
      </div>
    </>
  );
}

export function AppShell({ me, role, routeKey, children }: { me: Who; role: Role; routeKey: string; children: React.ReactNode }) {
  const [pref, setPref] = useState(readPref);
  const [open, setOpen] = useState(false);
  const sections = sectionsFor(role);
  const active = activeSection(role, routeKey);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLDivElement>(null);

  const toggle = () => { setPref(p => { writePref(!p); return !p; }); };
  const close = (back = false) => { setOpen(false); if (back) menuBtn.current?.focus(); };
  // a button, not an #anchor: the hash is the router, so a real anchor would navigate away
  const skip = () => { const m = document.querySelector<HTMLElement>('main'); if (m) { m.tabIndex = -1; m.focus(); } };

  useEffect(() => { if (open) closeBtn.current?.focus(); }, [open]);
  useEffect(() => {
    const h = () => setOpen(false);
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') return close(true);
    if (e.key !== 'Tab' || !drawer.current) return;
    const f = [...drawer.current.querySelectorAll<HTMLElement>('a[href],button')];
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  return (
    <div className="min-h-screen bg-bg text-text md:flex">
      <button type="button" onClick={skip} className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-text focus:shadow-pop">
        Негізгі мазмұнға өту
      </button>
      <aside className={`hidden md:flex flex-col sticky top-0 h-screen shrink-0 z-30 border-r border-border bg-surface transition-[width] duration-150 ${pref ? 'w-16' : 'w-60'}`}>
        <Body sections={sections} active={active} collapsed={pref} me={me} onToggle={toggle} />
      </aside>

      <div className="flex-1 min-w-0">
        <header className="md:hidden sticky top-0 z-20 flex items-center gap-2 h-14 px-3 bg-surface border-b border-border">
          <IconBtn label="Мәзірді ашу" expanded={open} controls="mobile-menu" onClick={() => setOpen(true)} ref={menuBtn}><Menu size={20} aria-hidden="true" /></IconBtn>
          <Logo />
          <a href="#profile" aria-label="Профиль" className="ml-auto grid place-items-center h-11 w-11">
            <span aria-hidden="true" className="grid place-items-center h-8 w-8 rounded-full bg-accent-soft text-on-accent-soft text-xs font-bold">{initials(me.full_name)}</span>
          </a>
        </header>
        {children}
      </div>

      {open && (
        <div className="md:hidden fixed inset-0 z-40" onKeyDown={onKey}>
          <div className="absolute inset-0 bg-black/40" onClick={() => close(true)} />
          <div ref={drawer} id="mobile-menu" role="dialog" aria-modal="true" aria-label="Мәзір" className="absolute inset-y-0 left-0 w-64 max-w-[85vw] flex flex-col bg-surface border-r border-border shadow-pop">
            <Body sections={sections} active={active} collapsed={false} me={me} onClose={() => close(true)} closeRef={closeBtn} />
          </div>
        </div>
      )}
    </div>
  );
}
