import type { RecordModel } from "pocketbase";
import type { CategorySlug } from "./categories";

export type Mode = "in_person" | "remote" | "either";

export interface User extends RecordModel {
  email?: string;
  emailVisibility: boolean;
  verified: boolean;
  name: string;
  avatar: string;
  area: string;
  lat: number | null;
  lng: number | null;
  about: string;
  taking_requests: boolean;
  adult: boolean;
  suspended: boolean;
  created: string;
  updated: string;
}

export type ContactMethod = "email" | "phone" | "whatsapp" | "signal" | "telegram" | "other";

export interface ContactSnapshot {
  method: ContactMethod;
  value: string;
  note: string;
}

export interface Contact extends RecordModel, ContactSnapshot {
  user: string;
  created: string;
  updated: string;
}

export interface Skill extends RecordModel {
  user: string;
  category: CategorySlug;
  title: string;
  description: string;
  mode: Mode;
  created: string;
  updated: string;
  expand?: { user?: User };
}

export type NeedStatus = "open" | "done" | "closed";

export interface Need extends RecordModel {
  user: string;
  title: string;
  details: string;
  category: CategorySlug;
  mode: Mode;
  area: string;
  lat: number | null;
  lng: number | null;
  when: string;
  status: NeedStatus;
  created: string;
  updated: string;
  expand?: { user?: User };
}

export type RequestKind = "ask" | "offer";
export type RequestStatus = "pending" | "accepted" | "declined" | "withdrawn" | "done";

export interface HelpRequest extends RecordModel {
  kind: RequestKind;
  seeker: string;
  helper: string;
  skill: string;
  need: string;
  message: string;
  status: RequestStatus;
  seeker_contact: ContactSnapshot | null;
  helper_contact: ContactSnapshot | null;
  created: string;
  updated: string;
  expand?: {
    seeker?: User;
    helper?: User;
    skill?: Skill;
    need?: Need;
  };
}

export interface ThankYou extends RecordModel {
  request: string;
  author: string;
  helper: string;
  message: string;
  created: string;
  updated: string;
  expand?: { author?: User; helper?: User; request?: HelpRequest };
}

export interface HelperStats extends RecordModel {
  helped_count: number;
  thanks_count: number;
}

export type ReportTargetType = "user" | "skill" | "need" | "request" | "thanks";
export type ReportReason = "spam" | "scam" | "harassment" | "unsafe" | "inappropriate" | "other";
export type ReportStatus = "open" | "resolved" | "dismissed";

export interface Report extends RecordModel {
  reporter: string;
  target_type: ReportTargetType;
  target_id: string;
  target_user: string;
  reason: ReportReason;
  details: string;
  status: ReportStatus;
  created: string;
  updated: string;
}
