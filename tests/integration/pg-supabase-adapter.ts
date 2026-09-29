/**
 * A small supabase-js look-alike that runs the query-builder calls our
 * services use against a real Postgres (PGlite). It lets the REAL service
 * code (join / start / autosave / submit / result) run in tests with real SQL,
 * constraints and triggers, without needing a Supabase project or network.
 *
 * Supported: from, select (incl. count/head and many-to-one embeds), insert,
 * update, delete, eq, in, order, limit, single, maybeSingle.
 */
import type { PGlite } from "@electric-sql/pglite";

type Row = Record<string, unknown>;
type Filter = { col: string; op: "eq" | "in"; val: unknown };
const FK: Record<string, string> = { quizzes: "quiz_id", classes: "class_id", students: "student_id", assignments: "assignment_id" };

function splitTop(s: string): string[] {
  const out: string[] = []; let depth = 0, cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) { out.push(cur.trim()); cur = ""; } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
const norm = (v: unknown): unknown => {
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.map(norm);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v as Row).map(([k, x]) => [k, norm(x)]));
  return v;
};

export function createPgSupabase(db: PGlite) {
  const colCache = new Map<string, Map<string, string>>();
  async function colTypes(table: string) {
    if (!colCache.has(table)) {
      const { rows } = await db.query<{ column_name: string; data_type: string; udt_name: string }>(
        "select column_name, data_type, udt_name from information_schema.columns where table_schema = 'public' and table_name = $1", [table]);
      colCache.set(table, new Map(rows.map((r) => [r.column_name, r.data_type === "ARRAY" ? "array" : r.udt_name])));
    }
    return colCache.get(table)!;
  }
  const encode = (v: unknown, type: string | undefined) => {
    if (v === undefined || v === null) return null;
    if (type === "json" || type === "jsonb") return JSON.stringify(v);
    if (type === "array" && Array.isArray(v)) return `{${v.map((x) => `"${String(x).replace(/"/g, '\\"')}"`).join(",")}}`;
    return v;
  };

  class Builder implements PromiseLike<{ data: unknown; error: unknown; count?: number | null }> {
    private op: "select" | "insert" | "update" | "delete" = "select";
    private payload: Row[] | Row | null = null;
    private filters: Filter[] = [];
    private orders: string[] = [];
    private lim: number | null = null;
    private returning = false;
    private mode: "many" | "single" | "maybe" = "many";
    private selectSpec = "*";
    private head = false;
    private wantCount = false;
    constructor(private table: string) {}

    select(spec = "*", opts?: { count?: string; head?: boolean }) {
      if (this.op !== "select") this.returning = true;
      this.selectSpec = spec || "*";
      this.head = !!opts?.head; this.wantCount = !!opts?.count;
      return this;
    }
    insert(p: Row | Row[]) { this.op = "insert"; this.payload = p; return this; }
    update(p: Row) { this.op = "update"; this.payload = p; return this; }
    delete() { this.op = "delete"; return this; }
    eq(col: string, val: unknown) { this.filters.push({ col, op: "eq", val }); return this; }
    in(col: string, val: unknown[]) { this.filters.push({ col, op: "in", val }); return this; }
    order(col: string, o?: { ascending?: boolean }) { this.orders.push(`${col} ${o?.ascending === false ? "desc" : "asc"}`); return this; }
    limit(n: number) { this.lim = n; return this; }
    single() { this.mode = "single"; return this; }
    maybeSingle() { this.mode = "maybe"; return this; }

    then<T1, T2>(res?: ((v: { data: unknown; error: unknown; count?: number | null }) => T1 | PromiseLike<T1>) | null, rej?: ((r: unknown) => T2 | PromiseLike<T2>) | null) {
      return this.exec().then(res, rej);
    }

    private where(params: unknown[], types: Map<string, string>) {
      if (!this.filters.length) return "";
      return " where " + this.filters.map((f) => {
        if (f.op === "in") { params.push(encode(f.val as unknown[], "array")); return `${f.col} = any($${params.length}::${types.get(f.col) === "uuid" ? "uuid" : "text"}[])`; }
        params.push(encode(f.val, types.get(f.col))); return `${f.col} = $${params.length}`;
      }).join(" and ");
    }

    private async exec() {
      try {
        const types = await colTypes(this.table);
        const params: unknown[] = [];
        let rows: Row[] = []; let count: number | null = null;

        if (this.op === "select") {
          const tokens = splitTop(this.selectSpec);
          const embeds = tokens.filter((t) => /^\w+\(.*\)$/.test(t));
          const plain = tokens.filter((t) => !embeds.includes(t));
          const where = this.where(params, types);
          if (this.head) {
            const r = await db.query<{ n: number }>(`select count(*)::int n from ${this.table}${where}`, params);
            return { data: null, error: null, count: r.rows[0].n };
          }
          let q = `select ${plain.join(", ") || "*"} from ${this.table}${where}`;
          if (this.orders.length) q += ` order by ${this.orders.join(", ")}`;
          if (this.lim != null) q += ` limit ${this.lim}`;
          rows = (await db.query<Row>(q, params)).rows;
          if (this.wantCount) count = rows.length;
          for (const e of embeds) {
            const m = /^(\w+)\((.*)\)$/.exec(e)!; const [, name, inner] = m;
            if (inner === "count") throw new Error("count embeds are not supported by the test adapter");
            const fk = FK[name]; if (!fk) throw new Error(`no FK mapping for embed ${name}`);
            const ids = [...new Set(rows.map((r) => r[fk]).filter(Boolean))];
            const related = ids.length ? ((await new Builder(name).select(`${inner}, id`).in("id", ids)) as { data: Row[] }).data : [];
            const byId = new Map(related.map((r) => [r.id, r]));
            rows = rows.map((r) => ({ ...r, [name]: byId.get(r[fk]) ?? null }));
          }
        } else if (this.op === "insert") {
          const list = Array.isArray(this.payload) ? this.payload : [this.payload as Row];
          const keys = [...new Set(list.flatMap((r) => Object.keys(r)))];
          const values = list.map((r) => `(${keys.map((k) => { params.push(encode(r[k], types.get(k))); return `$${params.length}`; }).join(", ")})`).join(", ");
          rows = (await db.query<Row>(`insert into ${this.table} (${keys.join(", ")}) values ${values} returning *`, params)).rows;
        } else if (this.op === "update") {
          const sets = Object.entries(this.payload as Row).map(([k, v]) => { params.push(encode(v, types.get(k))); return `${k} = $${params.length}`; });
          const where = this.where(params, types);
          rows = (await db.query<Row>(`update ${this.table} set ${sets.join(", ")}${where} returning *`, params)).rows;
        } else {
          const where = this.where(params, types);
          rows = (await db.query<Row>(`delete from ${this.table}${where} returning *`, params)).rows;
        }

        rows = rows.map((r) => norm(r) as Row);
        if (this.op !== "select" && !this.returning) return { data: null, error: null, count };
        if (this.mode === "single") {
          if (rows.length !== 1) return { data: null, error: { code: "PGRST116", message: `Expected 1 row, got ${rows.length}` }, count };
          return { data: rows[0], error: null, count };
        }
        if (this.mode === "maybe") {
          if (rows.length > 1) return { data: null, error: { code: "PGRST116", message: "Multiple rows" }, count };
          return { data: rows[0] ?? null, error: null, count };
        }
        return { data: rows, error: null, count };
      } catch (e) {
        const err = e as { message?: string; code?: string };
        return { data: null, error: { message: err.message ?? String(e), code: err.code }, count: null };
      }
    }
  }

  async function rpc(fn: string, args: Row = {}) {
    try {
      const keys = Object.keys(args);
      const r = await db.query<Row>(`select ${fn}(${keys.map((k, i) => `${k} => $${i + 1}`).join(", ")}) as result`, keys.map((k) => norm(args[k])));
      return { data: norm(r.rows[0]?.result), error: null };
    } catch (e) {
      const err = e as { message?: string; code?: string };
      return { data: null, error: { message: err.message ?? String(e), code: err.code } };
    }
  }
  return { from: (table: string) => new Builder(table), rpc };
}
