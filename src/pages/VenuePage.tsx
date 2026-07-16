import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { loadExhibitors, loadVenues } from '../lib/data';
import type { Exhibitor, Venue, VenueHall } from '../lib/types';
import { markKey, useTeam } from '../lib/store';
import { IconBack } from '../components/ui/icons';
import './venue.css';

/**
 * 风格化展区示意图（非官方平面图）：hall 按展商规模成比例分块，
 * 世博展览馆按 H1→H4 实际东西向排布,其余场馆按规模瀑布排列。
 */
export function VenuePage() {
  const { venueId } = useParams();
  const navigate = useNavigate();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [exhibitors, setExhibitors] = useState<Exhibitor[]>([]);
  const { session, marks } = useTeam();

  useEffect(() => {
    void loadVenues().then(setVenues);
    void loadExhibitors().then(setExhibitors);
  }, []);

  const venue = venues.find((v) => v.id === venueId);

  const hallStats = useMemo(() => {
    if (!venue) return new Map<string, { want: number; teamWant: number; done: number }>();
    const stats = new Map<string, { want: number; teamWant: number; done: number }>();
    for (const e of exhibitors) {
      if (e.venue !== venue.name) continue;
      const bucket = marks[markKey('exhibitor', e.id)] ?? {};
      const s = stats.get(e.hall) ?? { want: 0, teamWant: 0, done: 0 };
      const mine = bucket[session.member.id]?.status;
      if (mine === 'want') s.want += 1;
      if (mine === 'done') s.done += 1;
      if (Object.values(bucket).some((m) => m.status === 'want' && m.memberId !== session.member.id)) s.teamWant += 1;
      stats.set(e.hall, s);
    }
    return stats;
  }, [venue, exhibitors, marks, session.member.id]);

  if (!venue) return null;

  const goHall = (hall: string) => {
    navigate(`/exhibitors?venue=${encodeURIComponent(venue.name)}&hall=${encodeURIComponent(hall)}`);
  };

  return (
    <div className="venue-page">
      <header className="page-head venue-head">
        <button className="venue-back" onClick={() => navigate(-1)} aria-label="返回">
          <IconBack size={20} />
        </button>
        <div>
          <h1 className="page-title">{venue.name}</h1>
          <p className="venue-meta">
            {venue.nameEn} · {venue.exhibitorCount} 家展商 · {venue.address}
          </p>
        </div>
      </header>

      <p className="venue-note">展区块面积 ∝ 展商数量 · 点击进入该区展商 · 示意图，非官方平面</p>

      <HallGrid halls={venue.halls} stats={hallStats} onPick={goHall} />

      <button
        className="btn-ghost venue-all"
        onClick={() => navigate(`/exhibitors?venue=${encodeURIComponent(venue.name)}`)}
      >
        查看全馆 {venue.exhibitorCount} 家展商 →
      </button>
    </div>
  );
}

function HallGrid({ halls, stats, onPick }: {
  halls: VenueHall[];
  stats: Map<string, { want: number; teamWant: number; done: number }>;
  onPick: (hall: string) => void;
}) {
  const max = Math.max(...halls.map((h) => h.count), 1);
  return (
    <div className="hall-grid">
      {halls.map((h, i) => {
        const s = stats.get(h.hall);
        const scale = Math.sqrt(h.count / max);
        return (
          <button
            key={h.hall}
            className="hall-block"
            style={{
              flexBasis: `${Math.max(26, Math.round(scale * 100))}%`,
              minHeight: 92 + Math.round(scale * 74),
              animationDelay: `${i * 55}ms`,
            }}
            onClick={() => onPick(h.hall)}
          >
            <span className="hall-code">{h.hall === '?' ? '未标展位' : h.hall}</span>
            <span className="hall-count">{h.count} 家</span>
            <span className="hall-industries">
              {h.topIndustries.map(([name]) => name).join(' / ')}
            </span>
            {(s?.want || s?.teamWant || s?.done) ? (
              <span className="hall-badges">
                {s.want > 0 && <em className="hb hb-want">{s.want} 想聊</em>}
                {s.teamWant > 0 && <em className="hb hb-team">{s.teamWant} 队友</em>}
                {s.done > 0 && <em className="hb hb-done">{s.done} 聊过</em>}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
