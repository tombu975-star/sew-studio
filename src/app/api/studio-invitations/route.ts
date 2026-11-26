import {getTenant} from "@/lib/db/session";
import {createRequestClient} from "@/lib/db/requestClient";
import {getPool} from "@/lib/db/pool";
import {normalizeEmail} from "@/lib/identity";
export async function GET(){
 const db=await createRequestClient();
 const user=await db.auth.lookup();
 if(!user)return Response.json({error:"Unauthorized"},{status:401});
 const {rows}=await getPool().query("select i.id,i.role,i.status,i.expires_at,s.name as studio_name from private.studio_invitations i join public.shops s on s.id=i.shop_id where i.user_id=$1 and i.status in ('pending','accepted_pending_activation') and i.expires_at>now() and s.suspended_at is null order by i.created_at desc",[user.id]);
 return Response.json(rows,{headers:{"Cache-Control":"no-store"}});
}
export async function POST(req:Request){
 if(req.headers.get("origin")!==new URL(req.url).origin)return Response.json({error:"Invalid origin"},{status:403});
 const ctx=await getTenant();
 if(!ctx||ctx.role!=="madam")return Response.json({error:"Owner access required"},{status:403});
 const b=await req.json().catch(()=>null);
 if(!b||typeof b.email!=="string"||b.email.length>254||!["staff","trainer","trainee"].includes(b.role))return Response.json({error:"Invalid invitation"},{status:400});
 const pool=getPool();
 const {rows}=await pool.query("select id from public.profiles where email_key=$1 and is_active=true and shop_id<>$2 limit 2",[normalizeEmail(b.email),ctx.shopId]);
 if(rows.length!==1)return Response.json({error:"No eligible existing account found"},{status:404});
 const id=rows[0].id;
 const result=await pool.query("insert into private.studio_invitations(shop_id,user_id,invited_by,role) select $1,$2,$3,$4 where not exists(select 1 from public.studio_memberships where shop_id=$1 and user_id=$2 and status='active') on conflict do nothing returning id",[ctx.shopId,id,ctx.userId,b.role]);
 if(!result.rowCount)return Response.json({error:"Membership or invitation already exists"},{status:409});
 return Response.json({id:result.rows[0].id,status:"pending"},{status:201});
}
export async function PATCH(req:Request){
 if(req.headers.get("origin")!==new URL(req.url).origin)return Response.json({error:"Invalid origin"},{status:403});
 const user=await (await createRequestClient()).auth.lookup();
 if(!user)return Response.json({error:"Unauthorized"},{status:401});
 const b=await req.json().catch(()=>null);
 if(!b||typeof b.id!=="string"||! /^[0-9a-f-]{36}$/i.test(b.id)||!["accept","decline"].includes(b.action))return Response.json({error:"Invalid response"},{status:400});
 const status=b.action==="accept"?"accepted_pending_activation":"declined";
 const {rowCount}=await getPool().query("update private.studio_invitations i set status=$1,responded_at=now() where i.id=$2 and i.user_id=$3 and i.status='pending' and i.expires_at>now() and exists(select 1 from public.shops s where s.id=i.shop_id and s.suspended_at is null)",[status,b.id,user.id]);
 return rowCount?Response.json({status}):Response.json({error:"Invitation unavailable"},{status:409});
}
