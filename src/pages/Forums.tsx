import { useEffect, useMemo, useState } from 'react';
import { loadForums, dayLabel } from '../lib/data';
import type { Forum } from '../lib/types';
import { markKey, useTeam } from '../lib/store';
import { RatingBar, NoteInput, TeamMarks, TeamNotes } from '../components/ui/Rating';
import { IconSearch } from '../components/ui/icons';
import './list.css';

type StatusFilter = 'all' | 'my-rated' | 'team-hang' | 'noted';

export function Forums() {
  const [all, setAll] = useState<Forum[]>([]);
  const [q, setQ] = useState('');
  const [day, setDay] = useState('');
  const [track, setTrack] = useState('');
  const [statusF, setStatusF] = useState<StatusFilter>('all');
  const { session, marks } = useTeam();

  useEffect(() => { void loadForums().then(setAll); }, []);

  const days = useMemo(
    () => [...new Set(all.map((f) => f.date).filter(Boolean))].sort(),
    [all],
  );
  const tracks = useMemo(
    () => [...new Set(all.map((f) => f.track).filter(Boolean))],
    [all],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return all.filter((f) => {
      if (day && f.date !== day) return false;
      if (track && f.track !== track) return false;
      if (statusF !== 'all') {
        const bucket = marks[markKey('forum', f.id)] ?? {};
        if (statusF === 'my-rated' && !bucket[session.member.id]?.status) return false;
        if (statusF === 'team-hang' && !Object.values(bucket).some((m) => m.status === 'hang')) return false;
        if (statusF === 'noted' && !Object.values(bucket).some((m) => m.note.trim())) return false;
      }
      if (needle) {
        const hay = `${f.title} ${f.titleEn} ${f.track} ${f.room} ${f.venue}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [all, q, day, track, statusF, marks, session.member.id]);

  const byDay = useMemo(() => {
    const groups = new Map<string, Forum[]>();
    for (const f of filtered) {
      const k = f.date || '其他';
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(f);
    }
    for (const list of groups.values()) {
      list.sort((a, b) => a.time.localeCompare(b.time));
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <div>
      <header className="page-head">
        <h1 className="page-title">
          FORUMS<small>{filtered.length} / {all.length} 场</small>
        </h1>
        <div className="search">
          <IconSearch size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="论坛 / 赛道 / 会议室…" />
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
          <button className={`chip ${statusF === 'noted' ? 'active' : ''}`}
            onClick={() => setStatusF(statusF === 'noted' ? 'all' : 'noted')}>有纪要</button>
        </div>
        <div className="chips">
          <button className={`chip ${!track ? 'active' : ''}`} onClick={() => setTrack('')}>全部赛道</button>
          {tracks.map((t) => (
            <button key={t} className={`chip ${track === t ? 'active' : ''}`} onClick={() => setTrack(t)}>
              {t}
            </button>
          ))}
        </div>
      </header>

      <div className="list-body">
        {byDay.map(([d, forums]) => (
          <section key={d}>
            <h2 className="party-day-head">JUL {d.slice(3)} · {dayLabel(d)}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
              {forums.map((f) => <ForumCard key={f.id} f={f} />)}
            </div>
          </section>
        ))}
        {filtered.length === 0 && all.length > 0 && <p className="list-empty">没有匹配的论坛</p>}
      </div>
    </div>
  );
}

function ForumCard({ f }: { f: Forum }) {
  const [expanded, setExpanded] = useState(false);
  const { session, marks } = useTeam();
  const mine = (marks[markKey('forum', f.id)] ?? {})[session.member.id];

  return (
    <article className="card" onClick={() => setExpanded((v) => !v)}>
      <div className="card-row">
        <h2 className="card-title">{f.title}</h2>
        {f.track && <span className="booth-pill">{f.track}</span>}
      </div>
      {f.titleEn && <p className="card-sub clamp-1" style={{ marginTop: 2 }}>{f.titleEn}</p>}
      <div className="card-meta" style={{ marginTop: 6 }}>
        <span>{dayLabel(f.date)} {f.time}</span>
        {f.room && <span className="clamp-1" style={{ maxWidth: '52vw' }}>· {f.room}</span>}
      </div>
      {expanded && (
        <div onClick={(ev) => ev.stopPropagation()}>
          <NoteInput type="forum" id={f.id} placeholder="纪要 / 金句 / 谁讲得好…" />
          <TeamNotes type="forum" id={f.id} />
        </div>
      )}
      {mine?.note && !expanded && (
        <p className="card-note clamp-1">“{mine.note}”</p>
      )}
      <div onClick={(ev) => ev.stopPropagation()}>
        <RatingBar type="forum" id={f.id} />
        <TeamMarks type="forum" id={f.id} />
      </div>
    </article>
  );
}
