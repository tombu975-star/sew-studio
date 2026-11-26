import {getTenant,getSystemAdminSession} from "@/lib/db/session";
import {getPool} from "@/lib/db/pool";
export async function GET(){
 const admin=await getSystemAdminSession();
 if(!admin?.isSuper && !await getTenant())return Response.json({error:"Unauthorized"},{status:401});
 const {rows}=await getPool().query("select section,content,updated_at from private.platform_handbook");
 return Response.json({about:rows.find(r=>r.section==="about")?.content??"",sop:rows.find(r=>r.section==="sop")?.content??"",privacy:rows.find(r=>r.section==="privacy")?.content??"",canEdit:admin?.isSuper===true},{headers:{"Cache-Control":"no-store"}});
}
export async function PATCH(req:Request){
 const admin=await getSystemAdminSession();
 if(!admin?.isSuper)return Response.json({error:"Platform administrator access required"},{status:403});
 const b=await req.json().catch(()=>null);
 if(!b||!["about","sop","privacy"].includes(b.section)||typeof b.content!=="string"||b.content.length>30000)return Response.json({error:"Invalid content"},{status:400});
 await getPool().query("insert into private.platform_handbook(section,content) values($1,$2) on conflict(section) do update set content=excluded.content,updated_at=now()",[b.section,b.content.trim()]);
 return Response.json({ok:true});
}
