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

export type TargetType = 'exhibitor' | 'party' | 'forum';
export type MarkStatus = 'want' | 'done' | 'skip';

export interface Mark {
  memberId: string;
  memberName: string;
  memberColor: string;
  targetType: TargetType;
  targetId: string;
  status: MarkStatus;
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

/** UI labels for the tri-state control, per target type */
export const STATUS_LABELS: Record<TargetType, Record<MarkStatus, string>> = {
  exhibitor: { want: '想聊', done: '聊过了', skip: '爬' },
  party: { want: '想去', done: '去了', skip: '爬' },
  forum: { want: '想听', done: '听了', skip: '爬' },
};
