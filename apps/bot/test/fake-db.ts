// قاعدة بيانات وهمية بالذاكرة تحاكي ما نستخدمه من supabase-js (للاختبارات فقط)
import { randomUUID } from "node:crypto";

type Row = Record<string, any>;
type Filter = (r: Row) => boolean;

const DEFAULTS: Record<string, () => Row> = {
  posts: () => ({
    status: "draft", format: "markup", results: [], categories: [], disclaimer: false, reply_to: null, photo_url: null,
    source: null, source_url: null, external_id: null, fingerprint: null, score: null, reason: null, scheduled_at: null,
    published_at: null, title: null, approved_by: null,
  }),
  signals: () => ({ status: "open", result_pips: null, notes: null, telegram_message_id: null, take_profit_2: null, take_profit_3: null, closed_at: null }),
  price_alerts: () => ({ active: true, repeat: false, cooldown_min: 60, last_price: null, triggered_at: null, trigger_count: 0, note: null }),
  task_runs: () => ({ last_run_at: null, ok: null, error: null, result: null, runs: 0, failures: 0 }),
  news: () => ({ published_to_telegram: false, telegram_message_id: null, meta: null }),
  settings: () => ({}),
};
const PK: Record<string, string> = { settings: "key", task_runs: "task" };
const UNIQUE: Record<string, string[]> = { posts: ["external_id"], news: ["external_id"] };

export class FakeDb {
  tables: Record<string, Row[]> = {};
  t(name: string) {
    return (this.tables[name] ??= []);
  }
  from(table: string) {
    return new Query(this, table);
  }
}

class Query implements PromiseLike<{ data: any; error: any }> {
  private op: "select" | "insert" | "update" | "upsert" | "delete" = "select";
  private filters: Filter[] = [];
  private payload: Row | Row[] | null = null;
  private opts: { onConflict?: string; ignoreDuplicates?: boolean } = {};
  private returning = false;
  private mode: "many" | "single" | "maybe" = "many";
  private orderBy: { col: string; asc: boolean } | null = null;
  private lim: number | null = null;

  constructor(private db: FakeDb, private table: string) {}

  select(_cols?: string) {
    if (this.op !== "select") this.returning = true;
    return this;
  }
  insert(p: Row | Row[]) {
    this.op = "insert";
    this.payload = p;
    return this;
  }
  upsert(p: Row | Row[], opts: { onConflict?: string; ignoreDuplicates?: boolean } = {}) {
    this.op = "upsert";
    this.payload = p;
    this.opts = opts;
    return this;
  }
  update(p: Row) {
    this.op = "update";
    this.payload = p;
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }
  eq(c: string, v: unknown) {
    this.filters.push((r) => r[c] === v);
    return this;
  }
  neq(c: string, v: unknown) {
    this.filters.push((r) => r[c] !== v);
    return this;
  }
  in(c: string, vs: unknown[]) {
    this.filters.push((r) => vs.includes(r[c]));
    return this;
  }
  gte(c: string, v: string) {
    this.filters.push((r) => r[c] !== null && r[c] !== undefined && String(r[c]) >= v);
    return this;
  }
  lte(c: string, v: string) {
    this.filters.push((r) => r[c] !== null && r[c] !== undefined && String(r[c]) <= v);
    return this;
  }
  lt(c: string, v: string) {
    this.filters.push((r) => r[c] !== null && r[c] !== undefined && String(r[c]) < v);
    return this;
  }
  like(c: string, pattern: string) {
    const re = new RegExp(`^${pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*")}$`);
    this.filters.push((r) => re.test(String(r[c] ?? "")));
    return this;
  }
  not(c: string, op: string, v: unknown) {
    if (op === "is" && v === null) this.filters.push((r) => r[c] !== null && r[c] !== undefined);
    else if (op === "like") {
      const re = new RegExp(`^${String(v).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*")}$`);
      this.filters.push((r) => !re.test(String(r[c] ?? "")));
    }
    return this;
  }
  or(expr: string) {
    const parts = expr.split(",").map((p) => {
      const [col, op, ...rest] = p.split(".");
      const val = rest.join(".");
      if (op === "is" && val === "null") return (r: Row) => r[col] === null || r[col] === undefined;
      if (op === "lt") return (r: Row) => r[col] !== null && r[col] !== undefined && String(r[col]) < val;
      throw new Error(`unsupported or: ${p}`);
    });
    this.filters.push((r) => parts.some((f) => f(r)));
    return this;
  }
  order(col: string, o: { ascending?: boolean } = {}) {
    this.orderBy = { col, asc: o.ascending !== false };
    return this;
  }
  limit(n: number) {
    this.lim = n;
    return this;
  }
  single<T = any>() {
    this.mode = "single";
    return this as unknown as Query & PromiseLike<{ data: T; error: any }>;
  }
  maybeSingle<T = any>() {
    this.mode = "maybe";
    return this as unknown as Query & PromiseLike<{ data: T | null; error: any }>;
  }
  returns<T>() {
    return this as unknown as Query & PromiseLike<{ data: T; error: any }>;
  }

  private match() {
    return this.db.t(this.table).filter((r) => this.filters.every((f) => f(r)));
  }

  private conflictKey() {
    return this.opts.onConflict ?? PK[this.table] ?? "id";
  }

  private exec(): { data: any; error: any } {
    const rows = this.db.t(this.table);
    let out: Row[] = [];
    const now = new Date().toISOString();
    if (this.op === "select") {
      out = this.match();
    } else if (this.op === "insert" || this.op === "upsert") {
      const list = Array.isArray(this.payload) ? this.payload : [this.payload!];
      for (const p of list) {
        const clean = Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined));
        if (this.op === "upsert") {
          const key = this.conflictKey();
          const existing = rows.find((r) => r[key] === clean[key] && clean[key] !== undefined);
          if (existing) {
            if (!this.opts.ignoreDuplicates) Object.assign(existing, clean);
            out.push(existing);
            continue;
          }
        }
        for (const u of UNIQUE[this.table] ?? []) {
          if (clean[u] !== null && clean[u] !== undefined && rows.some((r) => r[u] === clean[u])) {
            return { data: null, error: { code: "23505", message: `duplicate key ${u}` } };
          }
        }
        const row = { id: randomUUID(), created_at: now, updated_at: now, ...(DEFAULTS[this.table]?.() ?? {}), ...clean };
        rows.push(row);
        out.push(row);
      }
    } else if (this.op === "update") {
      out = this.match();
      for (const r of out) Object.assign(r, this.payload, { updated_at: now });
    } else if (this.op === "delete") {
      out = this.match();
      this.db.tables[this.table] = rows.filter((r) => !out.includes(r));
    }
    if (this.orderBy) {
      const { col, asc } = this.orderBy;
      out = [...out].sort((a, b) => (String(a[col]) < String(b[col]) ? -1 : String(a[col]) > String(b[col]) ? 1 : 0) * (asc ? 1 : -1));
    }
    if (this.lim !== null) out = out.slice(0, this.lim);
    const copy = (r: Row) => structuredClone(r);
    if (this.mode === "single") {
      return out.length === 1 ? { data: copy(out[0]), error: null } : { data: null, error: { message: `expected 1 row, got ${out.length}` } };
    }
    if (this.mode === "maybe") return { data: out[0] ? copy(out[0]) : null, error: null };
    if (this.op !== "select" && !this.returning) return { data: null, error: null };
    return { data: out.map(copy), error: null };
  }

  then<A, B>(ok?: ((v: { data: any; error: any }) => A | PromiseLike<A>) | null, bad?: ((e: unknown) => B | PromiseLike<B>) | null) {
    return Promise.resolve()
      .then(() => this.exec())
      .then(ok, bad);
  }
}
