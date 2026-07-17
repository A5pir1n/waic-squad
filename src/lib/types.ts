export interface Exhibitor {
  id: string;
  name: string;
  brand: string;
  venue: string;
  booth: string;
  hall: string;
  industry: string;
  sub: string;
  biz: string;
  investors: string;
  funding: string;
  hq: string;
}

export interface PartyGuest {
  name: string;
  bio: string;
}

export interface Party {
  id: string;
  organizer: string;
  date: string; // "07-17"
  dateRaw: string;
  time: string;
  venue: string;
  title: string;
  desc: string;
  audience: string;
  guests: PartyGuest[];
  format: string;
  price: string;
  signup: string;
  signupNote: string;
  address: string;
  lat: number | null;
  lng: number | null;
  approx: boolean;
}

export interface VenueHall {
  hall: string;
  count: number;
  topIndustries: [string, number][];
}

export interface Venue {
  id: string;
  name: string;
  nameEn: string;
  lat: number;
  lng: number;
  address: string;
  exhibitorCount: number;
  halls: VenueHall[];
}

export interface Forum {
  id: string;
  track: string;
  title: string;
  titleEn: string;
  date: string; // "07-17"
  time: string;
  room: string;
  venue: string;
}

export type TargetType = 'exhibitor' | 'party' | 'forum';

/** 五级评分，从高到低。status 为 null = 只记了纪要还没评 */
export type MarkStatus = 'hang' | 'top' | 'elite' | 'npc' | 'trash';

export interface Mark {
  memberId: string;
  memberName: string;
  memberColor: string;
  targetType: TargetType;
  targetId: string;
  status: MarkStatus | null;
  note: string;
  updatedAt: string;
}

export interface Member {
  id: string;
  name: string;
  color: string;
}

export interface PresencePlace {
  type: 'venue' | 'party' | 'custom';
  id: string;
  label: string;
  lat?: number;
  lng?: number;
}

export interface Session {
  teamCode: string;
  member: Member;
}

export interface TeammatePresence {
  member: Member;
  place: PresencePlace | null;
  since: string;
}

/** 评分从高到低的展示顺序 */
export const RATING_ORDER: MarkStatus[] = ['hang', 'top', 'elite', 'npc', 'trash'];

export const RATING_LABELS: Record<MarkStatus, string> = {
  hang: '夯',
  top: '顶级',
  elite: '人上人',
  npc: 'NPC',
  trash: '拉完了',
};

/** 数值分，用于聚合排序（夯=5 … 拉完了=1） */
export const RATING_SCORE: Record<MarkStatus, number> = {
  hang: 5, top: 4, elite: 3, npc: 2, trash: 1,
};
