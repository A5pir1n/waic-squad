import type { Session } from './types';
export type { Session };

/** Muted lunar palette — one per teammate, assigned by join order hash */
export const MEMBER_COLORS = [
  '#e8cd8a', // 月晕金
  '#c9cdd4', // 银灰
  '#8fb8b2', // 青瓷
  '#a79fc9', // 雾紫
  '#c99a9a', // 暗玫瑰
  '#9ab4c9', // 雾蓝
  '#b4c496', // 苔绿
  '#cdb0a0', // 陶土
];

const KEY = 'waic-squad-session-v1';

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    if (!s.teamCode || !s.member?.id || !s.member?.name) return null;
    return s;
  } catch {
    return null;
  }
}

export function saveSession(s: Session): void {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function clearSession(): void {
  localStorage.removeItem(KEY);
}

export function pickColor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return MEMBER_COLORS[h % MEMBER_COLORS.length];
}

/**
 * crypto.randomUUID() 只在安全上下文（HTTPS/localhost）可用，纯 HTTP 访问时会
 * 抛 "crypto.randomUUID is not a function"。getRandomValues 没有这个限制，优先用它拼 UUID；
 * 两者都不可用时（极老浏览器）退化到 Math.random，够用作本地成员标识即可。
 */
export function newMemberId(): string {
  if (typeof crypto?.randomUUID === 'function') return crypto.randomUUID();
  if (typeof crypto?.getRandomValues === 'function') {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
