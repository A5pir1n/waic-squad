import type { Exhibitor, Forum, Party, Venue } from './types';

const cache = new Map<string, unknown>();

async function fetchJson<T>(path: string): Promise<T> {
  if (cache.has(path)) return cache.get(path) as T;
  const res = await fetch(path);
  if (!res.ok) throw new Error(`加载数据失败: ${path} (${res.status})`);
  const data = (await res.json()) as T;
  cache.set(path, data);
  return data;
}

export const loadExhibitors = () => fetchJson<Exhibitor[]>('/data/exhibitors.json');
export const loadParties = () => fetchJson<Party[]>('/data/parties.json');
export const loadVenues = () => fetchJson<Venue[]>('/data/venues.json');
export const loadForums = () => fetchJson<Forum[]>('/data/forums.json');

export const PARTY_DAYS = ['07-16', '07-17', '07-18', '07-19', '07-20'] as const;

export function dayLabel(date: string): string {
  const map: Record<string, string> = {
    '07-15': '15日', '07-16': '16日', '07-17': '17日',
    '07-18': '18日', '07-19': '19日', '07-20': '20日',
  };
  return map[date] ?? date;
}
