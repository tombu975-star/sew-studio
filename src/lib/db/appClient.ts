import { DbClient, type DbRole } from "./client";
import { AuthApi, type CookieAdapter } from "./auth";

/**
 * The object API routes hold as `db` / `ctx.db`: queries via
 * .from(), and sign-in / sign-out / admin user management via .auth.
 * A request-scoped client resolves the signed-in user from the session
 * cookie the first time it needs one.
 */
export class AppClient extends DbClient {
  auth: AuthApi;
  private resolved: boolean;

  constructor(
    role: DbRole,
    cookies: CookieAdapter | null = null,
    opts: { rememberMe?: boolean; ip?: string } = {}
  ) {
    super(role, null);
    this.resolved = role !== "authenticated" || !cookies;
    this.auth = new AuthApi(cookies, opts);
    this.auth.onUser = (id) => {
      this.userId = id;
      this.resolved = true;
    };
  }

  async run(sql: string, params: unknown[]) {
    if (!this.resolved) {
      this.resolved = true;
      this.userId = (await this.auth.lookup())?.id ?? null;
    }
    return super.run(sql, params);
  }
}
