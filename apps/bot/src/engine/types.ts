import type { PostKind, PostStatus } from "@qfx/shared";
import type { Fingerprint } from "@qfx/shared";

export interface DestResult {
  dest: string; // destination id
  chat_id: string;
  ok: boolean;
  message_id?: number;
  error?: string;
  at: string;
}

export interface PostRow {
  id: string;
  kind: PostKind;
  status: PostStatus;
  title: string | null;
  body: string;
  format: "markup" | "html";
  reply_to: string | null;
  photo_url: string | null;
  source: string | null;
  source_url: string | null;
  external_id: string | null;
  fingerprint: Fingerprint | null;
  categories: string[];
  score: number | null;
  reason: string | null;
  disclaimer: boolean;
  scheduled_at: string | null;
  published_at: string | null;
  results: DestResult[];
  created_at: string;
}
