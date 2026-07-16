import { STATUS_LABELS } from '../../lib/types';
import type { Mark, MarkStatus, TargetType } from '../../lib/types';
import { markKey, useTeam } from '../../lib/store';
import { Avatar } from './Avatar';

const ORDER: MarkStatus[] = ['want', 'done', 'skip'];

/** 三态按钮：想聊 / 聊过了 / 爬 —— 再点一次取消 */
export function TriStatus({ type, id }: { type: TargetType; id: string }) {
  const { session, marks, setMark } = useTeam();
  const bucket = marks[markKey(type, id)] ?? {};
  const mine = bucket[session.member.id]?.status ?? null;
  const labels = STATUS_LABELS[type];

  return (
    <div className="tri">
      {ORDER.map((s) => (
        <button
          key={s}
          className={mine === s ? `on-${s}` : ''}
          onClick={() => setMark(type, id, mine === s ? null : s)}
        >
          {labels[s]}
        </button>
      ))}
    </div>
  );
}

/** 队友标记一览（不含自己） */
export function TeamMarks({ type, id }: { type: TargetType; id: string }) {
  const { session, marks } = useTeam();
  const bucket = marks[markKey(type, id)] ?? {};
  const others = Object.values(bucket).filter((m) => m.memberId !== session.member.id);
  if (others.length === 0) return null;
  const labels = STATUS_LABELS[type];
  return (
    <div className="mark-row">
      {others.map((m: Mark) => (
        <span className="mark-chip" key={m.memberId}>
          <Avatar name={m.memberName} color={m.memberColor} size={16} />
          {m.memberName} · {labels[m.status]}
        </span>
      ))}
    </div>
  );
}
