import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Contest } from './store';

/** One pin per place (contests with the same spot share it); a click lists them, each opens the contest window. Tiles: OpenStreetMap. */
export default function MapView({ items, onOpen }: { items: Contest[]; onOpen: (id: string) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const open = useRef(onOpen); open.current = onOpen;
  useEffect(() => {
    if (!el.current) return;
    const map = L.map(el.current, { scrollWheelZoom: false, worldCopyJump: true }).setView([48, 68], 3);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(map);
    const groups = new Map<string, Contest[]>();
    for (const c of items) if (c.lat != null && c.lng != null) { const k = `${c.lat.toFixed(2)},${c.lng.toFixed(2)}`; groups.set(k, [...(groups.get(k) ?? []), c]); }
    const pts: L.LatLngTuple[] = [];
    for (const g of groups.values()) {
      const ll: L.LatLngTuple = [g[0].lat as number, g[0].lng as number]; pts.push(ll);
      const icon = L.divIcon({
        className: '', iconSize: [34, 34], iconAnchor: [17, 17],
        html: `<span style="display:grid;place-items:center;width:34px;height:34px;border-radius:9999px;background:var(--color-accent);color:var(--color-on-accent);font:600 14px/1 system-ui;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35)">${g.length}</span>`,
      });
      const pop = document.createElement('div');
      pop.style.cssText = 'display:grid;gap:4px;min-width:180px;max-width:240px';
      for (const c of g) {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = c.title;
        b.style.cssText = 'text-align:left;cursor:pointer;min-height:36px;padding:6px 8px;border-radius:8px;border:1px solid var(--color-border);background:var(--color-surface);color:var(--color-text);font:500 14px/1.3 system-ui';
        b.onclick = () => { map.closePopup(); open.current(c.id); };
        pop.appendChild(b);
      }
      L.marker(ll, { icon, title: `${g[0].location ?? 'Орын'}: ${g.length} жарыс`, keyboard: true }).addTo(map).bindPopup(pop);
    }
    if (pts.length === 1) map.setView(pts[0], 9); else if (pts.length) map.fitBounds(L.latLngBounds(pts).pad(0.25));
    return () => { map.remove(); };
  }, [items]);
  return <div ref={el} role="region" aria-label="Жарыстар картасы" className="relative z-0 h-[26rem] w-full overflow-hidden rounded-xl border border-border" />;
}
