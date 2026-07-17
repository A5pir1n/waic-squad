import { useEffect, useMemo, useState } from 'react';
import { loadExhibitors, loadForums, loadParties, loadVenues, dayLabel } from '../lib/data';
import type { Exhibitor, Forum, Mark, Party, PresencePlace, Venue } from '../lib/types';
import { RATING_LABELS, RATING_ORDER } from '../lib/types';
import { useTeam } from '../lib/store';
import { isOnline } from '../lib/supabase';
import { clearSession } from '../lib/session';
import { Avatar } from '../components/ui/Avatar';
import { Drawer } from '../components/ui/Drawer';
import './team.css';

export function Team() {
  const { session, marks, presences, live, myPlace, checkIn, checkOut } = useTeam();
  const [exhibitors, setExhibitors] = useState<Exhibitor[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [forums, setForums] = useState<Forum[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void loadExhibitors().then(setExhibitors);
    void loadParties().then(setParties);
    void loadForums().then(setForums);
    void loadVenues().then(setVenues);
  }, []);

  const titleOf = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of exhibitors) m.set(`exhibitor:${e.id}`, e.brand && e.brand !== e.name && e.brand.length <= 24 ? e.brand : e.name);
    for (const p of parties) m.set(`party:${p.id}`, p.title);
    for (const f of forums) m.set(`forum:${f.id}`, f.title);
    return m;
  }, [exhibitors, parties, forums]);

  const allMarks = useMemo(
    () => Object.values(marks).flatMap((bucket) => Object.values(bucket)),
    [marks],
  );

  const feed = useMemo(
    () => [...allMarks].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 60),
    [allMarks],
  );

  const perMember = useMemo(() => {
    const agg = new Map<string, { name: string; color: string; hang: number; rated: number; noted: number }>();
    for (const m of allMarks) {
      const a = agg.get(m.memberId) ?? { name: m.memberName, color: m.memberColor, hang: 0, rated: 0, noted: 0 };
      if (m.status === 'hang') a.hang += 1;
      if (m.status) a.rated += 1;
      if (m.note.trim()) a.noted += 1;
      agg.set(m.memberId, a);
    }
    return [...agg.values()].sort((a, b) => b.rated - a.rated || b.hang - a.hang);
  }, [allMarks]);

  /** 一键战报: 全队评分+纪要拼成 markdown, 直接丢微信群 */
  const copyReport = async () => {
    const typeName = { exhibitor: '展商', forum: '论坛', party: '夜场' } as const;
    const lines: string[] = [`WAIC 小分队战报 · ${new Date().toLocaleDateString('zh-CN')}`];
    for (const tier of RATING_ORDER) {
      const rows = allMarks
        .filter((m) => m.status === tier)
        .sort((a, b) => a.targetType.localeCompare(b.targetType));
      if (rows.length === 0) continue;
      lines.push('', `【${RATING_LABELS[tier]}】`);
      for (const m of rows) {
        const title = titleOf.get(`${m.targetType}:${m.targetId}`) ?? m.targetId;
        lines.push(`- ${title}（${typeName[m.targetType]}·${m.memberName}）${m.note.trim() ? `：${m.note.trim()}` : ''}`);
      }
    }
    const noteOnly = allMarks.filter((m) => !m.status && m.note.trim());
    if (noteOnly.length > 0) {
      lines.push('', '【纪要】');
      for (const m of noteOnly) {
        const title = titleOf.get(`${m.targetType}:${m.targetId}`) ?? m.targetId;
        lines.push(`- ${title}（${typeName[m.targetType]}·${m.memberName}）：${m.note.trim()}`);
      }
    }
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert(lines.join('\n'));
    }
  };

  const others = presences.filter((p) => p.member.id !== session.member.id);

  return (
    <div className="team-page">
      <div className="crescent team-crescent" aria-hidden />
      <header className="page-head team-head">
        <h1 className="page-title">
          SQUAD<small>口令 {session.teamCode}</small>
        </h1>
        <p className={`team-live ${live ? 'is-live' : ''}`}>
          {!isOnline ? '本地模式 · 未配置同步服务' : live ? '实时同步中' : '轮询模式 · 30s 同步'}
        </p>
      </header>

      {/* 我在哪 */}
      <section className="team-section">
        <div className="checkin-card card">
          <div className="checkin-row">
            <Avatar name={session.member.name} color={session.member.color} size={38} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="card-title">{session.member.name}</p>
              <p className="card-sub clamp-1">
                {myPlace ? `正在 · ${myPlace.label}` : '还没签到'}
              </p>
            </div>
            {myPlace ? (
              <button className="btn-ghost" onClick={checkOut}>离开</button>
            ) : null}
            <button className="btn-ghost checkin-btn" onClick={() => setCheckinOpen(true)}>
              我在…
            </button>
          </div>
        </div>
      </section>

      {/* 队友在哪 */}
      <section className="team-section">
        <h2 className="team-section-title">队友在哪</h2>
        {others.length === 0 && (
          <p className="team-empty">
            {isOnline ? '队友上线后会出现在这里 · 把口令发给他们' : '配置 Supabase 后可见'}
          </p>
        )}
        <div className="team-members">
          {others.map((p) => (
            <div className="member-row" key={p.member.id}>
              <Avatar name={p.member.name} color={p.member.color} size={34} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="card-title" style={{ fontSize: 'var(--text-sm)' }}>{p.member.name}</p>
                <p className="card-sub clamp-1">
                  {p.place ? p.place.label : '在线 · 未签到'}
                </p>
              </div>
              <span className={`member-dot ${p.place ? 'on' : ''}`} />
            </div>
          ))}
        </div>
      </section>

      {/* 战况 */}
      {perMember.length > 0 && (
        <section className="team-section">
          <div className="team-section-head">
            <h2 className="team-section-title">战况</h2>
            <button className="btn-ghost report-btn" onClick={copyReport}>
              {copied ? '已复制 ✓' : '复制战报'}
            </button>
          </div>
          <div className="team-members">
            {perMember.map((m) => (
              <div className="member-row" key={m.name}>
                <Avatar name={m.name} color={m.color} size={34} />
                <div style={{ flex: 1 }}>
                  <p className="card-title" style={{ fontSize: 'var(--text-sm)' }}>{m.name}</p>
                  <div className="progress-line">
                    <i className="pl-want" style={{ flexGrow: m.hang }} />
                    <i className="pl-done" style={{ flexGrow: Math.max(0, m.rated - m.hang) }} />
                    <i className="pl-rest" style={{ flexGrow: Math.max(1, 10 - m.rated) }} />
                  </div>
                </div>
                <span className="member-score">
                  <b>{m.rated}</b> 评 · {m.hang} 夯{m.noted > 0 ? ` · ${m.noted} 纪要` : ''}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 动态 */}
      <section className="team-section">
        <h2 className="team-section-title">小队动态</h2>
        {feed.length === 0 && <p className="team-empty">还没有动静 · 去评第一个夯吧</p>}
        <div className="feed">
          {feed.map((m) => <FeedRow key={`${m.memberId}-${m.targetType}-${m.targetId}`} m={m} title={titleOf.get(`${m.targetType}:${m.targetId}`) ?? m.targetId} />)}
        </div>
      </section>

      <button className="team-leave" onClick={() => { clearSession(); location.reload(); }}>
        退出小队
      </button>

      <CheckinDrawer
        open={checkinOpen}
        onClose={() => setCheckinOpen(false)}
        venues={venues}
        parties={parties}
        onPick={(place) => { checkIn(place); setCheckinOpen(false); }}
      />
    </div>
  );
}

function FeedRow({ m, title }: { m: Mark; title: string }) {
  return (
    <div className="feed-row">
      <Avatar name={m.memberName} color={m.memberColor} size={22} />
      <p className="feed-text clamp-2">
        <b>{m.memberName}</b>
        {m.status ? (
          <> 评 {title}<span className={`feed-verb feed-${m.status}`}> {RATING_LABELS[m.status]}</span></>
        ) : (
          <> 给 {title} 记了纪要</>
        )}
        {m.note && <span className="feed-note">「{m.note}」</span>}
      </p>
      <time className="feed-time">{timeAgo(m.updatedAt)}</time>
    </div>
  );
}

function CheckinDrawer({ open, onClose, venues, parties, onPick }: {
  open: boolean;
  onClose: () => void;
  venues: Venue[];
  parties: Party[];
  onPick: (p: PresencePlace) => void;
}) {
  const [custom, setCustom] = useState('');
  const today = `07-${String(new Date().getDate()).padStart(2, '0')}`;
  const todayParties = parties.filter((p) => p.date === today);

  return (
    <Drawer open={open} onClose={onClose}>
      <h2 className="team-section-title" style={{ marginBottom: 'var(--sp-3)' }}>我在…</h2>
      <div className="checkin-options">
        {venues.map((v) => (
          <button key={v.id} className="checkin-opt"
            onClick={() => onPick({ type: 'venue', id: v.id, label: v.name, lat: v.lat, lng: v.lng })}>
            <span className="checkin-opt-tag">正会</span>{v.name}
          </button>
        ))}
        {todayParties.map((p) => (
          <button key={p.id} className="checkin-opt"
            onClick={() => onPick({
              type: 'party', id: p.id, label: p.title,
              lat: p.lat ?? undefined, lng: p.lng ?? undefined,
            })}>
            <span className="checkin-opt-tag">{dayLabel(p.date)}</span>
            <span className="clamp-1">{p.title}</span>
          </button>
        ))}
      </div>
      <div className="search" style={{ marginTop: 'var(--sp-3)' }}>
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="或者手输一个地方…"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && custom.trim()) {
              onPick({ type: 'custom', id: 'custom', label: custom.trim() });
            }
          }}
        />
      </div>
    </Drawer>
  );
}

function timeAgo(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return '刚刚';
  if (s < 3600) return `${Math.floor(s / 60)}分钟前`;
  if (s < 86400) return `${Math.floor(s / 3600)}小时前`;
  return `${Math.floor(s / 86400)}天前`;
}
