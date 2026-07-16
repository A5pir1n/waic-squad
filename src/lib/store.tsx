/* eslint-disable react-refresh/only-export-components */
import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import type { ReactNode } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Mark, MarkStatus, PresencePlace, Session, TargetType, TeammatePresence } from './types';

export type MarksIndex = Record<string, Record<string, Mark>>; // "type:id" -> memberId -> Mark

interface TeamState {
  session: Session;
  marks: MarksIndex;
  presences: TeammatePresence[];
  live: boolean; // realtime channel healthy
  myPlace: PresencePlace | null;
  setMark: (type: TargetType, id: string, status: MarkStatus | null, note?: string) => void;
  checkIn: (place: PresencePlace) => void;
  checkOut: () => void;
}

const Ctx = createContext<TeamState | null>(null);

export function useTeam(): TeamState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTeam outside TeamProvider');
  return v;
}

export function markKey(type: TargetType, id: string): string {
  return `${type}:${id}`;
}

/* ---------------- localStorage fallback (离线/本地模式) ---------------- */

function localKey(teamCode: string) {
  return `waic-squad-marks-${teamCode}`;
}
function loadLocalMarks(teamCode: string): MarksIndex {
  try {
    return JSON.parse(localStorage.getItem(localKey(teamCode)) ?? '{}') as MarksIndex;
  } catch {
    return {};
  }
}

/* ---------------- rows <-> Mark ---------------- */

interface MarkRow {
  member_id: string;
  member_name: string;
  member_color: string;
  target_type: TargetType;
  target_id: string;
  status: MarkStatus;
  note: string;
  updated_at: string;
}

function rowToMark(r: MarkRow): Mark {
  return {
    memberId: r.member_id,
    memberName: r.member_name,
    memberColor: r.member_color,
    targetType: r.target_type,
    targetId: r.target_id,
    status: r.status,
    note: r.note ?? '',
    updatedAt: r.updated_at,
  };
}

function indexMarks(rows: MarkRow[]): MarksIndex {
  const idx: MarksIndex = {};
  for (const r of rows) {
    const k = markKey(r.target_type, r.target_id);
    (idx[k] ??= {})[r.member_id] = rowToMark(r);
  }
  return idx;
}

/* ---------------- provider ---------------- */

export function TeamProvider({ session, children }: { session: Session; children: ReactNode }) {
  const { teamCode, member } = session;
  const [marks, setMarks] = useState<MarksIndex>(() =>
    supabase ? {} : loadLocalMarks(teamCode),
  );
  const [presences, setPresences] = useState<TeammatePresence[]>([]);
  const [live, setLive] = useState(false);
  const [myPlace, setMyPlace] = useState<PresencePlace | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const myPlaceRef = useRef<PresencePlace | null>(null);

  const refreshMarks = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('marks').select('*').eq('team_code', teamCode);
    if (!error && data) setMarks(indexMarks(data as MarkRow[]));
  }, [teamCode]);

  // initial load + realtime subscription + polling fallback
  useEffect(() => {
    if (!supabase) return;
    void refreshMarks();

    const ch = supabase
      .channel(`team:${teamCode}`, { config: { presence: { key: member.id } } })
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'marks', filter: `team_code=eq.${teamCode}` },
        (payload) => {
          setMarks((prev) => {
            const next = { ...prev };
            const row = (payload.eventType === 'DELETE' ? payload.old : payload.new) as Partial<MarkRow>;
            if (!row.target_type || !row.target_id) {
              // DELETE payloads may only carry the pk — cheap full refresh
              void refreshMarks();
              return prev;
            }
            const k = markKey(row.target_type, row.target_id);
            const bucket = { ...(next[k] ?? {}) };
            if (payload.eventType === 'DELETE') {
              if (row.member_id) delete bucket[row.member_id];
            } else {
              const m = rowToMark(payload.new as MarkRow);
              bucket[m.memberId] = m;
            }
            next[k] = bucket;
            return next;
          });
        })
      .on('presence', { event: 'sync' }, () => {
        const state = ch.presenceState<{ member: { id: string; name: string; color: string }; place: PresencePlace | null; since: string }>();
        const list: TeammatePresence[] = [];
        for (const key of Object.keys(state)) {
          const metas = state[key];
          const last = metas[metas.length - 1];
          if (last?.member) list.push({ member: last.member, place: last.place, since: last.since });
        }
        setPresences(list);
      })
      .subscribe((status) => {
        setLive(status === 'SUBSCRIBED');
        if (status === 'SUBSCRIBED') {
          void ch.track({ member, place: myPlaceRef.current, since: new Date().toISOString() });
        }
      });
    channelRef.current = ch;

    // 30s polling fallback keeps marks fresh even if websocket drops
    const poll = setInterval(() => {
      if (!channelRef.current || channelRef.current.state !== 'joined') void refreshMarks();
    }, 30_000);

    return () => {
      clearInterval(poll);
      void supabase?.removeChannel(ch);
      channelRef.current = null;
    };
  }, [teamCode, member, refreshMarks]);

  const setMark = useCallback(
    (type: TargetType, id: string, status: MarkStatus | null, note?: string) => {
      const k = markKey(type, id);
      // optimistic local update
      setMarks((prev) => {
        const next = { ...prev, [k]: { ...(prev[k] ?? {}) } };
        if (status === null) {
          delete next[k][member.id];
        } else {
          const existing = next[k][member.id];
          next[k][member.id] = {
            memberId: member.id,
            memberName: member.name,
            memberColor: member.color,
            targetType: type,
            targetId: id,
            status,
            note: note ?? existing?.note ?? '',
            updatedAt: new Date().toISOString(),
          };
        }
        if (!supabase) localStorage.setItem(localKey(teamCode), JSON.stringify(next));
        return next;
      });
      if (!supabase) return;
      if (status === null) {
        void supabase.from('marks').delete()
          .eq('team_code', teamCode).eq('member_id', member.id)
          .eq('target_type', type).eq('target_id', id);
      } else {
        void supabase.from('marks').upsert(
          {
            team_code: teamCode,
            member_id: member.id,
            member_name: member.name,
            member_color: member.color,
            target_type: type,
            target_id: id,
            status,
            note: note ?? '',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'member_id,target_type,target_id' },
        );
      }
    },
    [teamCode, member],
  );

  const checkIn = useCallback((place: PresencePlace) => {
    setMyPlace(place);
    myPlaceRef.current = place;
    if (channelRef.current?.state === 'joined') {
      void channelRef.current.track({ member, place, since: new Date().toISOString() });
    }
    if (supabase) {
      void supabase.from('checkins').insert({
        team_code: teamCode, member_id: member.id, member_name: member.name,
        place_type: place.type, place_id: place.id, label: place.label,
      });
    }
  }, [teamCode, member]);

  const checkOut = useCallback(() => {
    setMyPlace(null);
    myPlaceRef.current = null;
    if (channelRef.current?.state === 'joined') {
      void channelRef.current.track({ member, place: null, since: new Date().toISOString() });
    }
  }, [member]);

  const value = useMemo(
    () => ({ session, marks, presences, live, myPlace, setMark, checkIn, checkOut }),
    [session, marks, presences, live, myPlace, setMark, checkIn, checkOut],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
