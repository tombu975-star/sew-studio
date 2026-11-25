import {getTenant} from "@/lib/db/session";
import {getPool} from "@/lib/db/pool";
export async function GET(){
 const ctx=await getTenant();
 if(!ctx)return Response.json({error:"Unauthorized"},{status:401});
 if(ctx.role!=="madam")return Response.json({error:"Owner access required"},{status:403});
 try{
 const {rows}=await getPool().query("select m.id,m.quantity_before,m.quantity_after,m.reason,m.created_at,p.title,v.size,v.color from public.rtw_stock_movements m left join public.rtw_products p on p.id=m.product_id and p.shop_id=m.shop_id left join public.rtw_variants v on v.id=m.variant_id and v.product_id=m.product_id where m.shop_id=$1 order by m.created_at desc,m.id desc limit 200",[ctx.shopId]);
 return Response.json(rows,{headers:{"Cache-Control":"no-store"}});
 }catch{return Response.json({error:"Unable to load inventory history"},{status:500});}
}
