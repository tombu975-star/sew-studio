import { getPool } from "./pool";
import { QueryBuilder, type Executor } from "./query";

export type DbRole = "authenticated" | "service_role" | "anon";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Runs each statement in its own short transaction as the right Postgres
 * role, with the caller's id exposed to row-level-security policies through
 * auth.uid(). This is what keeps the tenant boundary inside the database,
 * exactly as it was before.
 */
export class DbClient implements Executor {
  constructor(public role: DbRole, public userId: string | null = null) {}

  from(table: string) {
    return new QueryBuilder(this, table);
  }

  async run(sql: string, params: unknown[]): Promise<Record<string, any>[]> {
    let role = this.role;
    let uid = "";
    if (role === "authenticated") {
      if (this.userId && UUID.test(this.userId)) uid = this.userId;
      else role = "anon";
    }
    const client = await getPool().connect();
    try {
      // role is one of three fixed names; uid is validated as a UUID above.
      await client.query(`begin; set local role ${role}; select set_config('app.user_id', '${uid}', true)`);
      const res = await client.query(sql, params as any[]);
      await client.query("commit");
      return res.rows;
    } catch (e) {
      await client.query("rollback").catch(() => {});
      throw e;
    } finally {
      client.release();
    }
  }
}
