import {getTenant} from "@/lib/db/session";
import {getPool} from "@/lib/db/pool";
export async function GET(){
 const ctx=await getTenant();if(!ctx)return Response.json({error:"Unauthorized"},{status:401});
 const {rows}=await getPool().query(`select s.*,exists(select 1 from private.studio_sop_acknowledgements a where a.sop_id=s.id and a.revision=s.revision and a.user_id=$2) as acknowledged from private.studio_sops s where s.shop_id=$1 and (s.published or $3) order by s.department,s.title`,[ctx.shopId,ctx.userId,ctx.role==="madam"]);
 return Response.json({items:rows,canEdit:ctx.role==="madam"},{headers:{"Cache-Control":"no-store"}});
}
export async function POST(req:Request){
 const ctx=await getTenant();if(!ctx)return Response.json({error:"Unauthorized"},{status:401});
 const b=await req.json().catch(()=>null);if(!b||typeof b!=="object")return Response.json({error:"Invalid request"},{status:400});
 const uuid=(v:unknown)=>typeof v==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
 if(b.action==="acknowledge"){
 if(!uuid(b.id)||!Number.isInteger(b.revision))return Response.json({error:"Invalid procedure"},{status:400});
 const result=await getPool().query(`insert into private.studio_sop_acknowledgements(sop_id,revision,user_id) select id,revision,$3 from private.studio_sops where id=$1 and shop_id=$2 and published and revision=$4 on conflict do nothing returning sop_id`,[b.id,ctx.shopId,ctx.userId,b.revision]);
 if(!result.rowCount)return Response.json({error:"Already acknowledged or procedure changed. Refresh the register."},{status:409});
 return Response.json({ok:true});
 }
 if(ctx.role!=="madam")return Response.json({error:"Owner access required"},{status:403});
 if(b.action!=="save"||typeof b.title!=="string"||!b.title.trim()||b.title.length>160||typeof b.department!=="string"||!b.department.trim()||b.department.length>80||typeof b.instructions!=="string"||!b.instructions.trim()||b.instructions.length>30000||typeof b.published!=="boolean")return Response.json({error:"Invalid procedure details"},{status:400});
 if(b.id!=null){
 if(!uuid(b.id)||!Number.isInteger(b.revision))return Response.json({error:"Invalid revision"},{status:400});
 const result=await getPool().query("update private.studio_sops set title=$3,department=$4,instructions=$5,published=$6,revision=revision+1,updated_at=now() where id=$1 and shop_id=$2 and revision=$7",[b.id,ctx.shopId,b.title.trim(),b.department.trim(),b.instructions.trim(),b.published,b.revision]);
 if(!result.rowCount)return Response.json({error:"Procedure changed or unavailable. Refresh before editing."},{status:409});
 }else await getPool().query("insert into private.studio_sops(shop_id,title,department,instructions,published) values($1,$2,$3,$4,$5)",[ctx.shopId,b.title.trim(),b.department.trim(),b.instructions.trim(),b.published]);
 return Response.json({ok:true});
}
