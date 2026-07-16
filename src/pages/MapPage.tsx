import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol } from 'pmtiles';
import { buildMapStyle } from '../map/style';
import { loadParties, loadVenues, dayLabel } from '../lib/data';
import type { Party, Venue } from '../lib/types';
import { markKey, useTeam } from '../lib/store';
import { Drawer } from '../components/ui/Drawer';
import { PartyCard } from './Parties';
import './map.css';

const protocol = new Protocol();
maplibregl.addProtocol('pmtiles', protocol.tile);

const DAYS = ['07-16', '07-17', '07-18', '07-19', '07-20'];

interface PinGroup {
  key: string;
  lat: number;
  lng: number;
  approx: boolean;
  parties: Party[];
}

function groupParties(parties: Party[]): PinGroup[] {
  const groups = new Map<string, PinGroup>();
  for (const p of parties) {
    if (p.lat == null || p.lng == null) continue;
    const key = `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;
    if (!groups.has(key)) {
      groups.set(key, { key, lat: p.lat, lng: p.lng, approx: p.approx, parties: [] });
    }
    groups.get(key)!.parties.push(p);
  }
  return [...groups.values()];
}

export function MapPage() {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const presenceMarkersRef = useRef<maplibregl.Marker[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [day, setDay] = useState('07-17');
  const [selected, setSelected] = useState<PinGroup | null>(null);
  const [ready, setReady] = useState(false);
  const { session, marks, presences } = useTeam();
  const navigate = useNavigate();

  // ---- init map ----
  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: mapEl.current,
      style: buildMapStyle(`${window.location.origin}/tiles/shanghai.pmtiles`),
      center: [121.478, 31.19],
      zoom: 11.6,
      minZoom: 9,
      maxZoom: 15.9,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
    });
    map.touchZoomRotate.disableRotation();
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');
    map.on('load', () => setReady(true));
    map.on('error', (e) => console.error('[map]', e.error?.message ?? e));
    // 低缩放只留光点，减少标签打架
    const syncZoomClass = () => {
      map.getContainer().classList.toggle('zoomed-out', map.getZoom() < 12.2);
    };
    map.on('zoom', syncZoomClass);
    syncZoomClass();
    if (import.meta.env.DEV) (window as unknown as { __map?: maplibregl.Map }).__map = map;
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    void loadParties().then(setParties);
    void loadVenues().then(setVenues);
  }, []);

  const dayParties = useMemo(
    () => parties.filter((p) => !day || p.date === day),
    [parties, day],
  );
  const groups = useMemo(() => groupParties(dayParties), [dayParties]);

  /** my status per group: want > done > skip > none (for pin styling) */
  const groupStatus = (g: PinGroup): string => {
    let has = '';
    for (const p of g.parties) {
      const s = (marks[markKey('party', p.id)] ?? {})[session.member.id]?.status;
      if (s === 'want') return 'want';
      if (s === 'done') has = has || 'done';
      else if (s === 'skip') has = has || 'skip';
    }
    // 队友想去也点亮（弱一档）
    if (!has) {
      for (const p of g.parties) {
        const bucket = marks[markKey('party', p.id)] ?? {};
        if (Object.values(bucket).some((m) => m.status === 'want')) return 'team-want';
      }
    }
    return has;
  };

  // ---- party pins ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    for (const g of groups) {
      const status = groupStatus(g);
      const el = document.createElement('button');
      el.className = `pin ${g.approx ? 'pin--approx' : ''} status-${status || 'none'}`;
      const first = g.parties[0];
      el.innerHTML = `
        <span class="pin-dot">${g.parties.length > 1 ? g.parties.length : ''}</span>
        <span class="pin-label">${g.parties.length > 1 ? `${first.venue || first.address || ''}`.slice(0, 10) || '多场活动' : escapeHtml(short(first))}</span>`;
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        setSelected(g);
        map.easeTo({ center: [g.lng, g.lat], duration: 450, offset: [0, -120] });
      });
      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([g.lng, g.lat]).addTo(map);
      markersRef.current.push(marker);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, ready, marks]);

  // ---- venue mega-markers ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || venues.length === 0) return;
    const vm: maplibregl.Marker[] = [];
    for (const v of venues) {
      const el = document.createElement('button');
      el.className = 'venue-marker';
      el.innerHTML = `
        <span class="venue-ring"></span>
        <span class="venue-tag">WAIC</span>
        <span class="venue-name">${v.name}</span>
        <span class="venue-count">${v.exhibitorCount} 展商</span>`;
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        navigate(`/venue/${v.id}`);
      });
      vm.push(new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([v.lng, v.lat]).addTo(map));
    }
    return () => vm.forEach((m) => m.remove());
  }, [venues, ready, navigate]);

  // ---- teammate presence avatars ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    presenceMarkersRef.current.forEach((m) => m.remove());
    presenceMarkersRef.current = [];
    for (const pr of presences) {
      const place = pr.place;
      if (!place) continue;
      let lat = place.lat, lng = place.lng;
      if (lat == null || lng == null) {
        if (place.type === 'venue') {
          const v = venues.find((x) => x.id === place.id);
          if (v) { lat = v.lat; lng = v.lng; }
        } else if (place.type === 'party') {
          const p = parties.find((x) => x.id === place.id);
          if (p?.lat != null) { lat = p.lat; lng = p.lng!; }
        }
      }
      if (lat == null || lng == null) continue;
      const el = document.createElement('div');
      el.className = 'presence-marker';
      el.innerHTML = `
        <span class="presence-avatar" style="background:${pr.member.color}">${escapeHtml([...pr.member.name][0] ?? '?')}</span>
        <span class="presence-name">${escapeHtml(pr.member.name)}</span>`;
      presenceMarkersRef.current.push(
        new maplibregl.Marker({ element: el, anchor: 'bottom', offset: [0, -6] })
          .setLngLat([lng, lat]).addTo(map),
      );
    }
  }, [presences, venues, parties, ready]);

  return (
    <div className="map-page">
      <div ref={mapEl} className="map-canvas" />

      <div className="map-top">
        <h1 className="wordmark map-brand">WAIC <em>小分队</em></h1>
        <div className="chips map-days">
          <button className={`chip ${!day ? 'active' : ''}`} onClick={() => setDay('')}>全部</button>
          {DAYS.map((d) => (
            <button key={d} className={`chip ${day === d ? 'active' : ''}`} onClick={() => setDay(d)}>
              {dayLabel(d)}
            </button>
          ))}
        </div>
      </div>

      <div className="map-legend">
        <span><i className="lg lg-want" />想去</span>
        <span><i className="lg lg-team" />队友想去</span>
        <span><i className="lg lg-done" />去过</span>
        <span><i className="lg lg-approx" />位置待定</span>
      </div>

      <Drawer open={selected !== null} onClose={() => setSelected(null)}>
        {selected && (
          <div className="map-drawer-list">
            {selected.approx && (
              <p className="approx-note">该片区活动具体地址报名后才公布，pin 为大致位置</p>
            )}
            {selected.parties.map((p) => (
              <PartyCard key={p.id} p={p} defaultExpanded={selected.parties.length === 1} />
            ))}
          </div>
        )}
      </Drawer>
    </div>
  );
}

function short(p: Party): string {
  const t = p.organizer || p.title;
  return t.length > 12 ? t.slice(0, 11) + '…' : t;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}
