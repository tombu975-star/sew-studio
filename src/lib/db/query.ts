/**
 * A small query builder that speaks the same method chain the API routes
 * already use (from().select().eq().order().maybeSingle() ...) but compiles
 * to parameterised SQL against Railway Postgres. Results are shaped by
 * Postgres itself (jsonb), so numbers, timestamps and embedded relations
 * come back exactly as the routes expect.
 *
 * Every identifier is validated and quoted; every value is a bind parameter.
 */
import { getSchema, type Fk, type SchemaInfo } from "./schema";

export type DbError = {
  message: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
};
export type DbResult<T = any> = { data: T | null; error: DbError | null; count?: number | null };

export interface Executor {
  run(sql: string, params: unknown[]): Promise<Record<string, any>[]>;
}

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;
const q = (id: string): string => {
  if (!IDENT.test(id)) throw new Error(`Invalid identifier: ${id}`);
  return `"${id}"`;
};

// ---------- select-string parsing ----------

type SelItem =
  | { kind: "star" }
  | { kind: "col"; name: string; alias: string }
  | {
      kind: "embed";
      alias: string;
      target: string;
      hint?: string;
      inner: boolean;
      items: SelItem[];
      count: boolean;
    };

function splitTop(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote = false;
  let cur = "";
  for (const ch of s) {
    if (ch === '"') quote = !quote;
    if (!quote) {
      if (ch === "(") depth++;
      if (ch === ")") depth--;
      if (ch === "," && depth === 0) {
        out.push(cur);
        cur = "";
        continue;
      }
    }
    cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out.map((p) => p.trim()).filter(Boolean);
}

function parseSelect(str: string): SelItem[] {
  const items: SelItem[] = [];
  for (const part of splitTop(str)) {
    if (part === "*") {
      items.push({ kind: "star" });
      continue;
    }
    const embed = part.match(/^(?:(\w+):)?(\w+)((?:![\w]+)*)\(([\s\S]*)\)$/);
    if (embed) {
      const [, alias, target, mods, inside] = embed;
      let inner = false;
      let hint: string | undefined;
      for (const m of mods.split("!").filter(Boolean)) {
        if (m === "inner") inner = true;
        else if (m === "left") inner = false;
        else hint = m;
      }
      const count = inside.trim() === "count";
      items.push({
        kind: "embed",
        alias: alias || target,
        target,
        hint,
        inner,
        count,
        items: count ? [] : parseSelect(inside),
      });
      continue;
    }
    const col = part.match(/^(?:(\w+):)?(\w+)$/);
    if (!col) throw new Error(`Unsupported select expression: ${part}`);
    items.push({ kind: "col", name: col[2], alias: col[1] || col[2] });
  }
  return items;
}

// ---------- conditions ----------

type Cond =
  | { col: string; op: string; val: unknown; negate?: boolean }
  | { or: Cond[] };

function parseList(v: unknown): unknown[] {
  if (Array.isArray(v)) return v;
  const s = String(v).trim();
  const body = s.startsWith("(") && s.endsWith(")") ? s.slice(1, -1) : s;
  return splitTop(body).map((x) => x.replace(/^"(.*)"$/, "$1"));
}

function parseOrString(s: string): Cond[] {
  return splitTop(s).map((part) => {
    if (/^(or|and|not)\(/.test(part)) throw new Error("Nested or()/and() groups are not supported");
    const first = part.indexOf(".");
    const second = part.indexOf(".", first + 1);
    if (first < 1 || second < 0) throw new Error(`Bad or() filter: ${part}`);
    const col = part.slice(0, first);
    let op = part.slice(first + 1, second);
    let rest = part.slice(second + 1);
    let negate = false;
    if (op === "not") {
      negate = true;
      const next = rest.indexOf(".");
      op = rest.slice(0, next);
      rest = rest.slice(next + 1);
    }
    return { col, op, val: rest, negate };
  });
}

// ---------- the builder ----------

type Op = "select" | "insert" | "update" | "delete";

export class QueryBuilder implements PromiseLike<DbResult> {
  private op: Op = "select";
  private selectStr = "*";
  private returning: string | null = null;
  private rows: Record<string, unknown>[] = [];
  private patch: Record<string, unknown> = {};
  private conds: Cond[] = [];
  private orders: { col: string; asc: boolean; nulls?: "first" | "last" }[] = [];
  private limitN: number | null = null;
  private mode: "many" | "single" | "maybe" = "many";
  private countExact = false;
  private head = false;

  constructor(private exec: Executor, private table: string) {}

  select(cols = "*", opts: { count?: string; head?: boolean } = {}) {
    if (this.op === "select") {
      this.selectStr = cols;
    } else {
      this.returning = cols;
    }
    if (opts.count) this.countExact = true;
    if (opts.head) this.head = true;
    return this;
  }
  insert(values: Record<string, unknown> | Record<string, unknown>[]) {
    this.op = "insert";
    this.rows = Array.isArray(values) ? values : [values];
    return this;
  }
  update(values: Record<string, unknown>) {
    this.op = "update";
    this.patch = values;
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }

  private add(col: string, op: string, val: unknown, negate = false) {
    this.conds.push({ col, op, val, negate });
    return this;
  }
  eq(c: string, v: unknown) { return this.add(c, "eq", v); }
  neq(c: string, v: unknown) { return this.add(c, "neq", v); }
  gt(c: string, v: unknown) { return this.add(c, "gt", v); }
  gte(c: string, v: unknown) { return this.add(c, "gte", v); }
  lt(c: string, v: unknown) { return this.add(c, "lt", v); }
  lte(c: string, v: unknown) { return this.add(c, "lte", v); }
  like(c: string, v: unknown) { return this.add(c, "like", v); }
  ilike(c: string, v: unknown) { return this.add(c, "ilike", v); }
  is(c: string, v: unknown) { return this.add(c, "is", v); }
  in(c: string, v: unknown[]) { return this.add(c, "in", v); }
  not(c: string, op: string, v: unknown) { return this.add(c, op, v, true); }
  filter(c: string, op: string, v: unknown) { return this.add(c, op, v); }
  or(expr: string) {
    this.conds.push({ or: parseOrString(expr) });
    return this;
  }
  order(col: string, opts: { ascending?: boolean; nullsFirst?: boolean } = {}) {
    this.orders.push({
      col,
      asc: opts.ascending !== false,
      nulls: opts.nullsFirst === undefined ? undefined : opts.nullsFirst ? "first" : "last",
    });
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }
  single() {
    this.mode = "single";
    return this;
  }
  maybeSingle() {
    this.mode = "maybe";
    return this;
  }

  then<R1 = DbResult, R2 = never>(
    onfulfilled?: ((v: DbResult) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((e: unknown) => R2 | PromiseLike<R2>) | null
  ): PromiseLike<R1 | R2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  // ----- execution -----

  private async execute(): Promise<DbResult> {
    try {
      const schema = await getSchema();
      const params: unknown[] = [];
      const sql = this.build(schema, params);
      const rows = await this.exec.run(sql, params);
      return this.shape(rows[0] ?? {});
    } catch (e) {
      return { data: null, error: toDbError(e) };
    }
  }

  private shape(row: Record<string, any>): DbResult {
    const count = typeof row.count === "number" ? row.count : row.count != null ? Number(row.count) : null;
    if (this.head) return { data: null, error: null, count };
    const isWrite = this.op !== "select";
    if (isWrite && this.returning === null) return { data: null, error: null, count };
    const list: any[] = row.data ?? [];
    if (this.mode === "many") return { data: list, error: null, count };
    if (list.length === 1) return { data: list[0], error: null, count };
    if (list.length === 0 && this.mode === "maybe") return { data: null, error: null, count };
    return {
      data: null,
      error: {
        code: "PGRST116",
        message: "Cannot coerce the result to a single JSON object",
        details: `The result contains ${list.length} rows`,
        hint: null,
      },
      count,
    };
  }

  private push(params: unknown[], v: unknown): string {
    params.push(v);
    return `$${params.length}`;
  }

  private colType(schema: SchemaInfo, col: string): string | undefined {
    return schema.columns.get(this.table)?.get(col);
  }

  private bindValue(schema: SchemaInfo, col: string, v: unknown): unknown {
    if (v instanceof Date) return v.toISOString();
    if (v instanceof Uint8Array) return Buffer.from(v);
    const t = this.colType(schema, col);
    if (t === "json" || t === "jsonb") return v === null ? null : JSON.stringify(v);
    if (v !== null && typeof v === "object" && !Array.isArray(v)) return JSON.stringify(v);
    return v;
  }

  // Resolve how `target` relates to `parent`.
  private relation(schema: SchemaInfo, parent: string, e: Extract<SelItem, { kind: "embed" }>) {
    const cands: { fk: Fk; forward: boolean }[] = [];
    for (const fk of schema.fks) {
      if (fk.child === parent && fk.parent === e.target) cands.push({ fk, forward: true });
      if (fk.child === e.target && fk.parent === parent) cands.push({ fk, forward: false });
    }
    let list = cands;
    if (e.hint) {
      list = cands.filter(
        (c) => c.fk.name === e.hint || c.fk.childCols.includes(e.hint!) || c.fk.parentCols.includes(e.hint!)
      );
    }
    // A self-referencing key (profiles.mentor_id -> profiles.id) matches in both
    // directions. When it is named explicitly, treat it as "the row this one points to".
    if (list.length === 2 && list[0].fk === list[1].fk) list = list.filter((c) => c.forward);
    if (list.length !== 1) {
      throw new Error(
        `Could not embed "${e.target}" from "${parent}": ${list.length === 0 ? "no relationship found" : "ambiguous, add a !fk_name hint"}`
      );
    }
    return list[0];
  }

  private join(fk: Fk, forward: boolean, parentAlias: string, childAlias: string): string {
    // forward: parent row holds the FK; reverse: target row holds the FK.
    return fk.childCols
      .map((c, i) =>
        forward
          ? `${childAlias}.${q(fk.parentCols[i])} = ${parentAlias}.${q(c)}`
          : `${childAlias}.${q(c)} = ${parentAlias}.${q(fk.parentCols[i])}`
      )
      .join(" and ");
  }

  private objExpr(schema: SchemaInfo, items: SelItem[], table: string, alias: string, depth: number): string {
    const parts: string[] = [];
    for (const it of items) {
      if (it.kind === "star") parts.push(`to_jsonb(${alias})`);
      else if (it.kind === "col") parts.push(`jsonb_build_object('${it.alias.replace(/'/g, "''")}', ${alias}.${q(it.name)})`);
      else {
        const { fk, forward } = this.relation(schema, table, it);
        const ea = `e${depth + 1}`;
        const on = this.join(fk, forward, alias, ea);
        let sub: string;
        if (it.count) {
          sub = `jsonb_build_array(jsonb_build_object('count', (select count(*)::int from ${q(it.target)} ${ea} where ${on})))`;
        } else if (forward) {
          sub = `(select ${this.objExpr(schema, it.items, it.target, ea, depth + 1)} from ${q(it.target)} ${ea} where ${on} limit 1)`;
        } else {
          sub = `coalesce((select jsonb_agg(${this.objExpr(schema, it.items, it.target, ea, depth + 1)}) from ${q(it.target)} ${ea} where ${on}), '[]'::jsonb)`;
        }
        parts.push(`jsonb_build_object('${it.alias.replace(/'/g, "''")}', ${sub})`);
      }
    }
    return parts.length ? parts.join(" || ") : "'{}'::jsonb";
  }

  private condSql(
    schema: SchemaInfo,
    c: Cond,
    items: SelItem[],
    alias: string,
    params: unknown[]
  ): string {
    if ("or" in c) {
      return `(${c.or.map((x) => this.condSql(schema, x, items, alias, params)).join(" or ")})`;
    }
    // Filter on an inner-joined embedded column, e.g. .eq("order.shop_id", id)
    if (c.col.includes(".")) {
      const [embedAlias, col, ...extra] = c.col.split(".");
      if (extra.length) throw new Error(`Unsupported nested filter column: ${c.col}`);
      const e = items.find((i) => i.kind === "embed" && i.alias === embedAlias) as
        | Extract<SelItem, { kind: "embed" }>
        | undefined;
      if (!e || !e.inner) throw new Error(`Filter on "${c.col}" needs an !inner embed in select()`);
      const { fk, forward } = this.relation(schema, this.table, e);
      const ea = "ef";
      const inner = this.leaf(c.op, `${ea}.${q(col)}`, c.val, params, c.negate);
      return `exists (select 1 from ${q(e.target)} ${ea} where ${this.join(fk, forward, alias, ea)} and ${inner})`;
    }
    return this.leaf(c.op, `${alias}.${q(c.col)}`, c.val, params, c.negate);
  }

  private leaf(op: string, ref: string, val: unknown, params: unknown[], negate?: boolean): string {
    let s: string;
    switch (op) {
      case "eq":
        s = val === null ? `${ref} is null` : `${ref} = ${this.push(params, val)}`;
        break;
      case "neq":
        s = val === null ? `${ref} is not null` : `${ref} <> ${this.push(params, val)}`;
        break;
      case "gt": s = `${ref} > ${this.push(params, val)}`; break;
      case "gte": s = `${ref} >= ${this.push(params, val)}`; break;
      case "lt": s = `${ref} < ${this.push(params, val)}`; break;
      case "lte": s = `${ref} <= ${this.push(params, val)}`; break;
      case "like":
      case "ilike":
        s = `${ref} ${op} ${this.push(params, String(val).replace(/\*/g, "%"))}`;
        break;
      case "is": {
        const v = String(val).toLowerCase();
        if (val === null || v === "null") s = `${ref} is null`;
        else if (val === true || v === "true") s = `${ref} is true`;
        else if (val === false || v === "false") s = `${ref} is false`;
        else throw new Error(`Unsupported is() value: ${String(val)}`);
        break;
      }
      case "in": {
        const list = parseList(val);
        s = list.length ? `${ref} = any(array[${list.map((x) => this.push(params, x)).join(", ")}])` : "false";
        break;
      }
      default:
        throw new Error(`Unsupported filter operator: ${op}`);
    }
    return negate ? `not (${s})` : s;
  }

  private where(schema: SchemaInfo, items: SelItem[], alias: string, params: unknown[]): string {
    const parts = this.conds.map((c) => this.condSql(schema, c, items, alias, params));
    for (const it of items) {
      if (it.kind === "embed" && it.inner) {
        const { fk, forward } = this.relation(schema, this.table, it);
        parts.push(`exists (select 1 from ${q(it.target)} ei where ${this.join(fk, forward, alias, "ei")})`);
      }
    }
    return parts.length ? ` where ${parts.join(" and ")}` : "";
  }

  private tail(): string {
    let s = "";
    if (this.orders.length) {
      s += " order by " + this.orders
        .map((o) => `t0.${q(o.col)} ${o.asc ? "asc" : "desc"}${o.nulls ? ` nulls ${o.nulls}` : ""}`)
        .join(", ");
    }
    if (this.limitN !== null) s += ` limit ${Math.max(0, Math.floor(Number(this.limitN)))}`;
    return s;
  }

  private build(schema: SchemaInfo, params: unknown[]): string {
    const tbl = q(this.table);
    if (!schema.columns.has(this.table)) throw new Error(`Unknown table: ${this.table}`);

    if (this.op === "select") {
      const items = parseSelect(this.selectStr);
      const where = this.where(schema, items, "t0", params);
      const countExpr = `(select count(*)::int from ${tbl} t0${where})`;
      if (this.head) return `select ${countExpr} as count`;
      const obj = this.objExpr(schema, items, this.table, "t0", 0);
      return (
        `select coalesce(jsonb_agg(s.j), '[]'::jsonb) as data${this.countExact ? `, ${countExpr} as count` : ""} ` +
        `from (select ${obj} as j from ${tbl} t0${where}${this.tail()}) s`
      );
    }

    let write: string;
    let where = "";
    if (this.op === "insert") {
      if (!this.rows.length) throw new Error("insert() needs at least one row");
      const keys = [...new Set(this.rows.flatMap((r) => Object.keys(r).filter((k) => r[k] !== undefined)))];
      if (!keys.length) {
        write = `insert into ${tbl} default values`;
      } else {
        const values = this.rows
          .map(
            (r) =>
              "(" +
              keys
                .map((k) => (r[k] === undefined ? "default" : this.push(params, this.bindValue(schema, k, r[k]))))
                .join(", ") +
              ")"
          )
          .join(", ");
        write = `insert into ${tbl} (${keys.map(q).join(", ")}) values ${values}`;
      }
    } else if (this.op === "update") {
      const keys = Object.keys(this.patch).filter((k) => this.patch[k] !== undefined);
      if (!keys.length) throw new Error("update() needs at least one column");
      const sets = keys.map((k) => `${q(k)} = ${this.push(params, this.bindValue(schema, k, this.patch[k]))}`);
      where = this.where(schema, [], "t0", params);
      write = `update ${tbl} t0 set ${sets.join(", ")}${where}`;
    } else {
      where = this.where(schema, [], "t0", params);
      write = `delete from ${tbl} t0${where}`;
    }

    if (this.returning === null) return `${write} returning 1 as ok`;
    const items = parseSelect(this.returning);
    const obj = this.objExpr(schema, items, this.table, "t0", 0);
    return (
      `with w as (${write} returning ${this.op === "insert" ? "*" : "t0.*"}) ` +
      `select coalesce(jsonb_agg(s.j), '[]'::jsonb) as data from (select ${obj} as j from w t0) s`
    );
  }
}

export function toDbError(e: unknown): DbError {
  const err = e as { message?: string; code?: string; detail?: string; hint?: string };
  return {
    message: err?.message ?? "Database error",
    code: err?.code,
    details: err?.detail ?? null,
    hint: err?.hint ?? null,
  };
}
