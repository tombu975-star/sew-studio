import { enforceShopRateLimit } from "@/lib/ready-to-wear-rate-limit";
import { paymentConfiguration } from "@/lib/ready-to-wear-paystack";
import { getPool } from "@/lib/db/pool";
type Ctx={params:Promise<{shopId:string}>};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function GET(_req:Request,{params}:Ctx){
 const {shopId}=await params;if(!uuid.test(shopId))return Response.json({error:"Invalid shop"},{status:400});
 const config=await paymentConfiguration();
 const {rows}=await getPool().query("select p.id,p.title,p.description,p.category,case when p.sale_price is not null and now()>=p.sale_start and now()<p.sale_end then p.sale_price else p.price end as price,p.price as regular_price,p.image_url,p.gallery_images,p.collection_name,coalesce(json_agg(json_build_object('id',v.id,'size',v.size,'color',v.color,'stock',v.stock)) filter(where v.id is not null),'[]') as variants from public.rtw_products p left join public.rtw_variants v on v.product_id=p.id where p.shop_id=$1 and p.published=true and p.archived_at is null and exists(select 1 from public.shops s where s.id=p.shop_id and s.suspended_at is null) group by p.id order by p.created_at desc",[shopId]);
 return Response.json({products:rows,checkoutEnabled:config.enabled},{headers:{"Cache-Control":"no-store"}});
}
export async function POST(req:Request,{params}:Ctx){
 const {shopId}=await params;if(!uuid.test(shopId))return Response.json({error:"Invalid shop"},{status:400});
 const b=await req.json().catch(()=>({}));
 if(!b||typeof b!=="object"||Array.isArray(b)||!["manual","paystack"].includes(b.paymentMethod))return Response.json({error:"Invalid checkout request"},{status:400});
 const method=b.paymentMethod==="paystack"?"paystack":"manual";
 if(method==="paystack"&&!(await paymentConfiguration()).enabled)return Response.json({error:"Online payments are not available yet. Choose manual payment."},{status:503});
 const quantity=Number(b.quantity),productId=String(b.productId??""),variantId=String(b.variantId??"");
 const name=String(b.name??"").trim(),phone=String(b.phone??"").trim(),email=String(b.email??"").trim(),address=String(b.address??"").trim(),city=String(b.city??"").trim(),notes=String(b.notes??"").trim();
 if(!uuid.test(productId)||!uuid.test(variantId)||!Number.isInteger(quantity)||quantity<1||quantity>20||name.length<2||name.length>150||phone.length<7||phone.length>30||address.length<8||address.length>500||!city||city.length>120||email.length>200||(method==="paystack"&&!/^\S+@\S+\.\S+$/.test(email))||notes.length>1000)return Response.json({error:"Please provide valid order and delivery details"},{status:400});
 const limited=await enforceShopRateLimit(req,{scope:"order:"+shopId,max:5,seconds:3600,identity:phone});if(limited)return limited;
 const client=await getPool().connect();
 try{
  await client.query("BEGIN");
  const {rows}=await client.query("select v.id,v.stock,p.unit_cost,case when p.sale_price is not null and now()>=p.sale_start and now()<p.sale_end then p.sale_price else p.price end as price from public.rtw_variants v join public.rtw_products p on p.id=v.product_id where p.shop_id=$1 and p.published=true and p.archived_at is null and exists(select 1 from public.shops s where s.id=p.shop_id and s.suspended_at is null) and p.id=$2 and v.id=$3 for update of v,p",[shopId,productId,variantId]);
  if(!rows.length||rows[0].stock<quantity){await client.query("ROLLBACK");return Response.json({error:"This size or colour is out of stock"},{status:409})}
  const unitMinor=Math.round(Number(rows[0].price)*100),totalMinor=unitMinor*quantity;
  if(!Number.isSafeInteger(unitMinor)||unitMinor<=0||!Number.isSafeInteger(totalMinor)){await client.query("ROLLBACK");return Response.json({error:"Invalid product price"},{status:409});}
  if(!Number.isSafeInteger(b.expectedUnitMinor)||b.expectedUnitMinor!==unitMinor){await client.query("ROLLBACK");return Response.json({error:"Price changed. Refresh the collection and review the current price before ordering."},{status:409});}
  const total=(totalMinor/100).toFixed(2);
  await client.query("select set_config('rtw.stock_reason',$1,true)",["Order reservation"]);
  const stock=await client.query("update public.rtw_variants set stock=stock-$2 where id=$1 and stock >= $2",[variantId,quantity]);
  if(stock.rowCount!==1){await client.query("ROLLBACK");return Response.json({error:"Insufficient stock"},{status:409});}
  const order=await client.query("insert into public.rtw_orders(shop_id,product_id,variant_id,quantity,unit_price,total,customer_name,customer_phone,customer_email,delivery_address,delivery_city,delivery_notes,payment_method,unit_cost_snapshot) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) returning id,status,payment_status",[shopId,productId,variantId,quantity,rows[0].price,total,name,phone,email||null,address,city,notes||null,method,rows[0].unit_cost]);
  await client.query("COMMIT");
  return Response.json({orderId:order.rows[0].id,status:"Pending payment",paymentStatus:"Unpaid",total,paymentMethod:method,message:method==="manual"?"Order received. Contact the studio to arrange payment, then submit your transaction reference. Your order stays unpaid until the studio verifies receipt.":"Order created. Proceed to secure Paystack checkout."},{status:201});
 }catch{return Response.json({error:"Unable to place order"},{status:500})}finally{try{await client.query("ROLLBACK")}catch{}client.release()}
}
