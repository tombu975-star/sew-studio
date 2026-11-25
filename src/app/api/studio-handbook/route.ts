import { getTenant } from "@/lib/db/session";
import { getPool } from "@/lib/db/pool";

export async function GET() {
 const ctx = await getTenant();
 if (!ctx) return Response.json({error:"Unauthorized"}, {status:401});
 const {rows} = await getPool().query("select about,sop,updated_at from private.studio_handbooks where shop_id=$1",[ctx.shopId]);
 return Response.json({...(rows[0] ?? {about:"",sop:"",updated_at:null}),canEdit:ctx.role==="madam"},{headers:{"Cache-Control":"no-store"}});
}
export async function PATCH(req:Request) {
 const ctx = await getTenant();
 if (!ctx) return Response.json({error:"Unauthorized"},{status:401});
 if (ctx.role!=="madam") return Response.json({error:"Only the studio owner may edit the handbook."},{status:403});
 const body=await req.json().catch(()=>null);
 if (!body || !["about","sop"].includes(body.section) || typeof body.content!=="string" || body.content.length>30000) return Response.json({error:"Invalid handbook content (maximum 30,000 characters)."},{status:400});
 const column=body.section==="about"?"about":"sop";
 await getPool().query(`insert into private.studio_handbooks(shop_id,${column}) values($1,$2) on conflict(shop_id) do update set ${column}=excluded.${column},updated_at=now()`,[ctx.shopId,body.content.trim()]);
 return Response.json({ok:true});
}
