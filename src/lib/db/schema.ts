import { getPool } from "./pool";

export interface Fk {
  name: string;
  child: string;
  parent: string;
  childCols: string[];
  parentCols: string[];
}

export interface SchemaInfo {
  fks: Fk[];
  /** table -> column -> udt_name (e.g. "jsonb", "_text", "uuid") */
  columns: Map<string, Map<string, string>>;
}

let cached: Promise<SchemaInfo> | null = null;

async function load(): Promise<SchemaInfo> {
  const pool = getPool();
  const fkRes = await pool.query(`
    select c.conname as name,
           child.relname as child,
           parent.relname as parent,
           (select array_agg(a.attname::text order by k.ord)
              from unnest(c.conkey) with ordinality k(attnum, ord)
              join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum) as child_cols,
           (select array_agg(a.attname::text order by k.ord)
              from unnest(c.confkey) with ordinality k(attnum, ord)
              join pg_attribute a on a.attrelid = c.confrelid and a.attnum = k.attnum) as parent_cols
      from pg_constraint c
      join pg_class child on child.oid = c.conrelid
      join pg_class parent on parent.oid = c.confrelid
      where c.contype = 'f'
        and child.relnamespace = 'public'::regnamespace
        and parent.relnamespace = 'public'::regnamespace`);
  const colRes = await pool.query(`
    select table_name, column_name, udt_name
      from information_schema.columns
     where table_schema = 'public'`);

  const columns = new Map<string, Map<string, string>>();
  for (const r of colRes.rows) {
    if (!columns.has(r.table_name)) columns.set(r.table_name, new Map());
    columns.get(r.table_name)!.set(r.column_name, r.udt_name);
  }
  return {
    fks: fkRes.rows.map((r) => ({
      name: r.name,
      child: r.child,
      parent: r.parent,
      childCols: r.child_cols,
      parentCols: r.parent_cols,
    })),
    columns,
  };
}

export function getSchema(): Promise<SchemaInfo> {
  if (!cached) {
    cached = load().catch((e) => {
      cached = null; // retry on the next call instead of caching a failure
      throw e;
    });
  }
  return cached;
}
