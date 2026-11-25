import {getTenant} from "@/lib/db/session";
import {getPool} from "@/lib/db/pool";
export async function GET(req:Request){
 const ctx=await getTenant();if(!ctx)return Response.json({error:"Unauthorized"},{status:401});
 if(ctx.role!=="madam")return Response.json({error:"Owner access required"},{status:403});
 const month=new URL(req.url).searchParams.get("month")||new Date().toISOString().slice(0,7);
 if(!/^20[0-9]{2}-(0[1-9]|1[0-2])$/.test(month))return Response.json({error:"Invalid month"},{status:400});
 try{
 const db=getPool(),params=[ctx.shopId,month+"-01"];
 const [summary,products,inventory]=await Promise.all([
 db.query("select count(*) filter(where payment_status='Paid')::int as paid_orders,count(*) filter(where payment_status='Paid' and unit_cost_snapshot is null)::int as unknown_cost_orders,coalesce(sum(total-quantity*unit_cost_snapshot) filter(where payment_status='Paid' and unit_cost_snapshot is not null),0) as known_gross_profit,coalesce(sum(total) filter(where payment_status='Paid' and unit_cost_snapshot is not null),0) as known_cost_revenue,coalesce(sum(total) filter(where payment_status='Paid'),0) as revenue,coalesce(sum(quantity) filter(where payment_status='Paid'),0) as units from public.rtw_orders where shop_id=$1 and paid_at >= $2::date::timestamp at time zone 'UTC' and paid_at < ($2::date+interval '1 month') at time zone 'UTC'",params),
 db.query("select p.id,p.title,sum(o.quantity)::int as units,sum(o.total) as revenue from public.rtw_orders o join public.rtw_products p on p.id=o.product_id and p.shop_id=o.shop_id where o.shop_id=$1 and o.payment_status='Paid' and o.paid_at >= $2::date::timestamp at time zone 'UTC' and o.paid_at < ($2::date+interval '1 month') at time zone 'UTC' group by p.id,p.title order by units desc,p.id limit 100",params),
 db.query("select coalesce(sum(v.stock),0) as units,coalesce(sum(v.stock*p.price),0) as retail_value,coalesce(sum(v.stock*p.unit_cost),0) as known_stock_cost,coalesce(sum(v.stock) filter(where p.unit_cost is null),0) as unknown_stock_units,count(*) filter(where v.stock<=p.low_stock_threshold)::int as low_variants from public.rtw_products p join public.rtw_variants v on v.product_id=p.id where p.shop_id=$1 and p.archived_at is null",[ctx.shopId])
 ]);
 return Response.json({month,summary:summary.rows[0],products:products.rows,inventory:inventory.rows[0]},{headers:{"Cache-Control":"no-store"}});
 }catch{return Response.json({error:"Unable to load commerce analytics"},{status:500});}
}
