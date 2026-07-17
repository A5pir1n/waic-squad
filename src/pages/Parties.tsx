import { useEffect, useMemo, useState } from 'react';
import { loadParties, dayLabel } from '../lib/data';
import type { Party } from '../lib/types';
import { markKey, useTeam } from '../lib/store';
import { RatingBar, NoteInput, TeamMarks, TeamNotes } from '../components/ui/Rating';
import { IconSearch, IconLink, IconNav } from '../components/ui/icons';
import { amapLink } from '../lib/geo';
import './list.css';

type StatusFilter = 'all' | 'my-rated' | 'team-hang';

export function Parties() {
  const [all, setAll] = useState<Party[]>([]);
  const [q, setQ] = useState('');
  const [day, setDay] = useState('');
  const [statusF, setStatusF] = useState<StatusFilter>('all');
  const { session, marks } = useTeam();

  useEffect(() => { void loadParties().then(setAll); }, []);

  const days = useMemo(
    () => [...new Set(all.map((p) => p.date).filter(Boolean))].sort(),
    [all],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return all.filter((p) => {
      if (day && p.date !== day) return false;
      if (statusF !== 'all') {
        const bucket = marks[markKey('party', p.id)] ?? {};
        if (statusF === 'my-rated' && !bucket[session.member.id]?.status) return false;
        if (statusF === 'team-hang' && !Object.values(bucket).some((m) => m.status === 'hang')) return false;
      }
      if (needle) {
        const hay = `${p.title} ${p.organizer} ${p.desc} ${p.venue} ${p.guests.map((g) => g.name).join(' ')}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [all, q, day, statusF, marks, session.member.id]);

  const byDay = useMemo(() => {
    const groups = new Map<string, Party[]>();
    for (const p of filtered) {
      const k = p.date || '其他';
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(p);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <div>
      <header className="page-head">
        <h1 className="page-title">
          AFTERPARTY<small>{filtered.length} / {all.length} 场</small>
        </h1>
        <div className="search">
          <IconSearch size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="活动 / 主办 / 嘉宾…" />
        </div>
        <div className="chips">
          <button className={`chip ${!day ? 'active' : ''}`} onClick={() => setDay('')}>全部</button>
          {days.map((d) => (
            <button key={d} className={`chip ${day === d ? 'active' : ''}`} onClick={() => setDay(d)}>
              {dayLabel(d)}
            </button>
          ))}
          <span className="chip-divider" />
          <button className={`chip ${statusF === 'my-rated' ? 'active-accent' : ''}`}
            onClick={() => setStatusF(statusF === 'my-rated' ? 'all' : 'my-rated')}>我评过</button>
          <button className={`chip ${statusF === 'team-hang' ? 'active-accent' : ''}`}
            onClick={() => setStatusF(statusF === 'team-hang' ? 'all' : 'team-hang')}>队里有夯</button>
        </div>
      </header>

      <div className="list-body">
        {byDay.map(([d, parties]) => (
          <section key={d}>
            <h2 className="party-day-head">JUL {d.slice(3)} · {dayLabel(d)}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
              {parties.map((p) => <PartyCard key={p.id} p={p} />)}
            </div>
          </section>
        ))}
        {filtered.length === 0 && all.length > 0 && <p className="list-empty">没有匹配的活动</p>}
      </div>
    </div>
  );
}

export function PartyCard({ p, defaultExpanded = false }: { p: Party; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const free = /免费/.test(p.price);

  return (
    <article className="card" onClick={() => setExpanded((v) => !v)}>
      <div className="card-row">
        <h2 className="card-title">{p.title}</h2>
        {p.price && (
          <span className={`party-price ${free ? 'party-price--free' : ''}`}>
            {free ? '免费' : p.price}
          </span>
        )}
      </div>
      <p className="card-sub clamp-1" style={{ marginTop: 2 }}>{p.organizer}</p>
      <div className="card-meta" style={{ marginTop: 6 }}>
        <span>{p.dateRaw} {p.time}</span>
        {p.venue && <span className="clamp-1" style={{ maxWidth: '52vw' }}>· {p.venue}</span>}
      </div>
      {expanded && (
        <>
          {p.desc && <p className="card-sub" style={{ marginTop: 8 }}>{p.desc}</p>}
          {p.guests.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {p.guests.slice(0, 6).map((g) => (
                <p className="guest-line clamp-1" key={g.name}><b>{g.name}</b> — {g.bio}</p>
              ))}
              {p.guests.length > 6 && <p className="guest-line">…共 {p.guests.length} 位嘉宾</p>}
            </div>
          )}
          <div className="party-links" onClick={(ev) => ev.stopPropagation()}>
            {p.signup && (
              <a className="btn-ghost" href={p.signup} target="_blank" rel="noreferrer">
                <IconLink size={14} /> 报名
              </a>
            )}
            {!p.signup && p.signupNote && <span className="card-meta">{p.signupNote}</span>}
            {p.lat != null && p.lng != null && (
              <a className="btn-ghost" href={amapLink(p.lat, p.lng, p.title)} target="_blank" rel="noreferrer">
                <IconNav size={14} /> 导航{p.approx ? '（大致位置）' : ''}
              </a>
            )}
          </div>
        </>
      )}
      {expanded && (
        <div onClick={(ev) => ev.stopPropagation()}>
          <NoteInput type="party" id={p.id} />
          <TeamNotes type="party" id={p.id} />
        </div>
      )}
      <div onClick={(ev) => ev.stopPropagation()}>
        <RatingBar type="party" id={p.id} />
        <TeamMarks type="party" id={p.id} />
      </div>
    </article>
  );
}
