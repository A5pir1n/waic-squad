import { useEffect, useState } from 'react';
import { RATING_LABELS, RATING_ORDER } from '../../lib/types';
import type { Mark, TargetType } from '../../lib/types';
import { markKey, useTeam } from '../../lib/store';
import { Avatar } from './Avatar';

/** 五级评分条：夯 / 顶级 / 人上人 / NPC / 拉完了 —— 再点一次取消 */
export function RatingBar({ type, id }: { type: TargetType; id: string }) {
  const { session, marks, setMark } = useTeam();
  const bucket = marks[markKey(type, id)] ?? {};
  const mine = bucket[session.member.id]?.status ?? null;

  return (
    <div className="rating">
      {RATING_ORDER.map((s) => (
        <button
          key={s}
          className={mine === s ? `on-${s}` : ''}
          onClick={() => setMark(type, id, mine === s ? null : s)}
        >
          {RATING_LABELS[s]}
        </button>
      ))}
    </div>
  );
}

/** 纪要输入：与评分解耦，可以只记纪要不打分。失焦保存并同步给队友。 */
export function NoteInput({ type, id, placeholder = '记一笔纪要给队友…' }: {
  type: TargetType;
  id: string;
  placeholder?: string;
}) {
  const { session, marks, setMark } = useTeam();
  const mine = (marks[markKey(type, id)] ?? {})[session.member.id];
  const saved = mine?.note ?? '';
  const [note, setNote] = useState(saved);

  // 队友端/其他入口更新时同步进来（本地编辑中不打扰）
  useEffect(() => { setNote(saved); }, [saved]);

  return (
    <textarea
      className="note-input"
      placeholder={placeholder}
      value={note}
      onClick={(ev) => ev.stopPropagation()}
      onChange={(ev) => setNote(ev.target.value)}
      onBlur={() => {
        if (note !== saved) setMark(type, id, mine?.status ?? null, note);
      }}
    />
  );
}

/** 队友评分/纪要一览（不含自己） */
export function TeamMarks({ type, id }: { type: TargetType; id: string }) {
  const { session, marks } = useTeam();
  const bucket = marks[markKey(type, id)] ?? {};
  const others = Object.values(bucket).filter((m) => m.memberId !== session.member.id);
  if (others.length === 0) return null;
  return (
    <div className="mark-row">
      {others.map((m: Mark) => (
        <span className={`mark-chip ${m.status ? `chip-${m.status}` : ''}`} key={m.memberId}>
          <Avatar name={m.memberName} color={m.memberColor} size={16} />
          {m.memberName}{m.status ? ` · ${RATING_LABELS[m.status]}` : ' · 记了纪要'}
        </span>
      ))}
    </div>
  );
}

/** 队友纪要正文（展开态显示） */
export function TeamNotes({ type, id }: { type: TargetType; id: string }) {
  const { session, marks } = useTeam();
  const bucket = marks[markKey(type, id)] ?? {};
  const noted = Object.values(bucket).filter(
    (m) => m.memberId !== session.member.id && m.note.trim(),
  );
  if (noted.length === 0) return null;
  return (
    <div className="team-notes">
      {noted.map((m) => (
        <p className="team-note" key={m.memberId}>
          <b style={{ color: m.memberColor }}>{m.memberName}</b>「{m.note}」
        </p>
      ))}
    </div>
  );
}
