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

export function newMemberId(): string {
  return crypto.randomUUID();
}
