import { useState } from 'react';
import { newMemberId, pickColor, saveSession } from '../lib/session';
import type { Session } from '../lib/types';
import './join.css';

export function Join({ onJoin }: { onJoin: (s: Session) => void }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const ready = code.trim().length >= 2 && name.trim().length >= 1;

  const submit = () => {
    if (!ready) return;
    const session: Session = {
      teamCode: code.trim().toLowerCase(),
      member: { id: newMemberId(), name: name.trim(), color: pickColor(name.trim()) },
    };
    saveSession(session);
    onJoin(session);
  };

  return (
    <div className="join">
      <div className="join-body">
        <div className="crescent join-crescent" aria-hidden />
        <p className="join-kicker">WAIC 2026 · 17–20 JUL · SHANGHAI</p>
        <h1 className="wordmark join-title">
          WAIC <em>小分队</em>
        </h1>
        <p className="join-sub">
          963 家展商 · 108 场 afterparty · 一队人分头看，进度全同步
        </p>

        <div className="join-form">
          <label className="join-field">
            <span>队伍口令</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="和队友约一个暗号"
              autoCapitalize="off"
              autoCorrect="off"
            />
          </label>
          <label className="join-field">
            <span>你的名字</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="队友认得出的名字"
              maxLength={12}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
          </label>
          <button className="btn-primary" disabled={!ready} onClick={submit}
            style={{ opacity: ready ? 1 : 0.35 }}>
            集合出发
          </button>
        </div>
      </div>
      <p className="join-foot">同一口令即同一小队 · 无需注册</p>
    </div>
  );
}
