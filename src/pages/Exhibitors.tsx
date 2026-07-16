import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { loadExhibitors } from '../lib/data';
import type { Exhibitor } from '../lib/types';
import { markKey, useTeam } from '../lib/store';
import { TriStatus, TeamMarks } from '../components/ui/TriStatus';
import { IconSearch } from '../components/ui/icons';
import './list.css';

const PAGE = 60;
const VENUES = ['世博展览馆', '世博中心', '西岸国际会展中心', '张江科学会堂'];
const VENUE_SHORT: Record<string, string> = {
  世博展览馆: '世博展览馆', 世博中心: '世博中心',
  西岸国际会展中心: '西岸', 张江科学会堂: '张江',
};

type StatusFilter = 'all' | 'my-want' | 'team-want' | 'unmarked';

export function Exhibitors() {
  const [all, setAll] = useState<Exhibitor[]>([]);
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [statusF, setStatusF] = useState<StatusFilter>('all');
  const [industry, setIndustry] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const sentinel = useRef<HTMLDivElement>(null);
  const { session, marks } = useTeam();

  const venue = params.get('venue') ?? '';
  const hall = params.get('hall') ?? '';

  useEffect(() => { void loadExhibitors().then(setAll); }, []);

  const industries = useMemo(
    () => [...new Set(all.map((e) => e.industry).filter(Boolean))],
    [all],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return all.filter((e) => {
      if (venue && e.venue !== venue) return false;
      if (hall && e.hall !== hall) return false;
      if (industry && e.industry !== industry) return false;
      if (statusF !== 'all') {
        const bucket = marks[markKey('exhibitor', e.id)] ?? {};
        const mine = bucket[session.member.id];
        const wants = Object.values(bucket).filter((m) => m.status === 'want');
        if (statusF === 'my-want' && mine?.status !== 'want') return false;
        if (statusF === 'team-want' && wants.length === 0) return false;
        if (statusF === 'unmarked' && Object.keys(bucket).length > 0) return false;
      }
      if (needle) {
        const hay = `${e.name} ${e.brand} ${e.biz} ${e.sub} ${e.investors}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [all, q, venue, hall, industry, statusF, marks, session.member.id]);

  useEffect(() => { setLimit(PAGE); }, [q, venue, hall, industry, statusF]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setLimit((n) => n + PAGE);
    }, { rootMargin: '600px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const setVenue = (v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set('venue', v); else next.delete('venue');
    next.delete('hall');
    setParams(next, { replace: true });
  };

  return (
    <div>
      <header className="page-head">
        <h1 className="page-title">
          EXHIBITORS<small>{filtered.length} / {all.length} 家</small>
        </h1>
        <div className="search">
          <IconSearch size={16} />
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="公司 / 业务 / 股东…"
          />
        </div>
        <div className="chips">
          <button className={`chip ${!venue ? 'active' : ''}`} onClick={() => setVenue('')}>全部场馆</button>
          {VENUES.map((v) => (
            <button key={v} className={`chip ${venue === v ? 'active' : ''}`} onClick={() => setVenue(v)}>
              {VENUE_SHORT[v]}
            </button>
          ))}
        </div>
        <div className="chips">
          {hall && <button className="chip active-accent" onClick={() => setVenue(venue)}>展区 {hall} ✕</button>}
          <button className={`chip ${statusF === 'my-want' ? 'active-accent' : ''}`}
            onClick={() => setStatusF(statusF === 'my-want' ? 'all' : 'my-want')}>我想聊</button>
          <button className={`chip ${statusF === 'team-want' ? 'active-accent' : ''}`}
            onClick={() => setStatusF(statusF === 'team-want' ? 'all' : 'team-want')}>队里想聊</button>
          <button className={`chip ${statusF === 'unmarked' ? 'active' : ''}`}
            onClick={() => setStatusF(statusF === 'unmarked' ? 'all' : 'unmarked')}>未标记</button>
          <span className="chip-divider" />
          <button className={`chip ${!industry ? 'active' : ''}`} onClick={() => setIndustry('')}>全部行业</button>
          {industries.map((i) => (
            <button key={i} className={`chip ${industry === i ? 'active' : ''}`} onClick={() => setIndustry(i)}>
              {i}
            </button>
          ))}
        </div>
      </header>

      <div className="list-body">
        {filtered.slice(0, limit).map((e) => <ExhibitorCard key={e.id} e={e} />)}
        {filtered.length === 0 && all.length > 0 && (
          <p className="list-empty">没有匹配的展商</p>
        )}
        <div ref={sentinel} />
      </div>
    </div>
  );
}

/** 短品牌名优先；官方英文全称太长时退回中文名 */
function displayName(e: Exhibitor): string {
  if (e.brand && e.brand !== e.name && e.brand.length <= 24) return e.brand;
  return e.name;
}

function ExhibitorCard({ e }: { e: Exhibitor }) {
  const [expanded, setExpanded] = useState(false);
  const { session, marks, setMark } = useTeam();
  const mine = (marks[markKey('exhibitor', e.id)] ?? {})[session.member.id];
  const [note, setNote] = useState(mine?.note ?? '');

  return (
    <article className="card" onClick={() => setExpanded((v) => !v)}>
      <div className="card-row">
        <h2 className="card-title">{displayName(e)}</h2>
        {e.booth && <span className="booth-pill">{VENUE_SHORT[e.venue] ?? e.venue} · {e.booth}</span>}
      </div>
      {displayName(e) !== e.name && <p className="card-sub clamp-1">{e.name}</p>}
      <div className="card-meta" style={{ marginTop: 6 }}>
        {e.industry && <span>{e.industry}</span>}
        {e.sub && <span>· {e.sub}</span>}
        {e.funding && <span className="meta-funding clamp-1">· {e.funding}</span>}
      </div>
      {e.biz && <p className={`card-sub ${expanded ? '' : 'clamp-2'}`} style={{ marginTop: 8 }}>{e.biz}</p>}
      {expanded && e.investors && (
        <p className="card-sub" style={{ marginTop: 6 }}>
          <span style={{ color: 'var(--text-low)' }}>股东 · </span>{e.investors}
        </p>
      )}
      {expanded && (
        <textarea
          className="note-input"
          placeholder="给队友留一句备注…"
          value={note}
          onClick={(ev) => ev.stopPropagation()}
          onChange={(ev) => setNote(ev.target.value)}
          onBlur={() => {
            if (mine && note !== mine.note) setMark('exhibitor', e.id, mine.status, note);
          }}
        />
      )}
      {mine?.note && !expanded && (
        <p className="card-note clamp-1">“{mine.note}”</p>
      )}
      <div onClick={(ev) => ev.stopPropagation()}>
        <TriStatus type="exhibitor" id={e.id} />
        <TeamMarks type="exhibitor" id={e.id} />
      </div>
    </article>
  );
}
