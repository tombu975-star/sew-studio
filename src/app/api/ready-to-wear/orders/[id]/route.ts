import { getTenant } from "@/lib/db/session";
import { getPool } from "@/lib/db/pool";
type Ctx={params:Promise<{id:string}>};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const transitions:Record<string,string[]>={Paid:["Processing"],Processing:["Dispatched"],Dispatched:["Delivered"],Delivered:[],Cancelled:[]};
export async function PATCH(req:Request,{params}:Ctx){
 const ctx=await getTenant();if(!ctx)return Response.json({error:"Unauthorized"},{status:401});
 if(ctx.role!=="madam")return Response.json({error:"Only the owner can update deliveries"},{status:403});
 const {id}=await params,b=await req.json().catch(()=>({})),next=String(b?.status??"");
 if(!uuid.test(id)||!["Processing","Dispatched","Delivered"].includes(next))return Response.json({error:"Invalid delivery update"},{status:400});
 const courier=String(b.courier??"").trim(),tracking=String(b.trackingNumber??"").trim();
 if(courier.length>150||tracking.length>150||(next==="Dispatched"&&(!courier||!tracking)))return Response.json({error:"Courier and tracking number are required for dispatch"},{status:400});
 const client=await getPool().connect();
 try{
  await client.query("BEGIN");
  const {rows}=await client.query("select status,payment_status from public.rtw_orders where id=$1 and shop_id=$2 for update",[id,ctx.shopId]);
  if(!rows.length){await client.query("ROLLBACK");return Response.json({error:"Order not found"},{status:404})}
  if(rows[0].payment_status!=="Paid"||!transitions[rows[0].status]?.includes(next)){await client.query("ROLLBACK");return Response.json({error:"Invalid status transition or payment not verified"},{status:409})}
  await client.query("update public.rtw_orders set status=$3,courier=case when $3='Dispatched' then $4 else courier end,tracking_number=case when $3='Dispatched' then $5 else tracking_number end,dispatched_at=case when $3='Dispatched' then now() else dispatched_at end,delivered_at=case when $3='Delivered' then now() else delivered_at end,updated_at=now() where id=$1 and shop_id=$2",[id,ctx.shopId,next,courier,tracking]);
  await client.query("COMMIT");return Response.json({id,status:next});
 }catch{await client.query("ROLLBACK");return Response.json({error:"Unable to update delivery"},{status:500})}finally{client.release()}
}

export async function POST(req:Request,{params}:Ctx){
 const ctx=await getTenant();if(!ctx)return Response.json({error:"Unauthorized"},{status:401});
 if(ctx.role!=="madam")return Response.json({error:"Only the studio owner can verify payments"},{status:403});
 const {id}=await params,b=await req.json().catch(()=>({}));
 if(!uuid.test(id)||b?.action!=="confirm_manual_payment"||b.confirmReceived!==true)return Response.json({error:"Explicit payment receipt confirmation is required"},{status:400});
 const client=await getPool().connect();
 try{
  await client.query("BEGIN");
  const {rows}=await client.query("select payment_method,payment_status,status,manual_payment_channel,manual_payment_reference,manual_payment_submitted_at from public.rtw_orders where id=$1 and shop_id=$2 for update",[id,ctx.shopId]);
  if(!rows.length){await client.query("ROLLBACK");return Response.json({error:"Order not found"},{status:404})}
  const o=rows[0];
  if(o.payment_method!=="manual"||o.payment_status!=="Pending verification"||o.status!=="Pending payment"||!o.manual_payment_submitted_at||!o.manual_payment_reference?.trim()){await client.query("ROLLBACK");return Response.json({error:"Order is not awaiting manual payment verification"},{status:409})}
  if(!["Mobile Money","Bank transfer"].includes(o.manual_payment_channel)){await client.query("ROLLBACK");return Response.json({error:"Cash on delivery cannot be confirmed before cash is collected; use a dedicated collection workflow"},{status:409})}
  await client.query("update public.rtw_orders set payment_status='Paid',status='Paid',paid_at=now(),manual_payment_verified_at=now(),updated_at=now() where id=$1 and shop_id=$2",[id,ctx.shopId]);
  await client.query("COMMIT");return Response.json({id,paymentStatus:"Paid",status:"Paid"});
 }catch(e){await client.query("ROLLBACK");console.error("[rtw] manual payment confirmation failed",e);return Response.json({error:"Unable to confirm payment"},{status:500})}finally{client.release()}
}

export async function DELETE(_req:Request,{params}:Ctx){
 const ctx=await getTenant();if(!ctx)return Response.json({error:"Unauthorized"},{status:401});
 if(ctx.role!=="madam")return Response.json({error:"Only the owner can cancel unpaid orders"},{status:403});
 const {id}=await params;if(!uuid.test(id))return Response.json({error:"Invalid order"},{status:400});
 const client=await getPool().connect();
 try{
  await client.query("BEGIN");
  const {rows}=await client.query("select variant_id,quantity,status,payment_status,payment_method from public.rtw_orders where id=$1 and shop_id=$2 for update",[id,ctx.shopId]);
  if(!rows.length){await client.query("ROLLBACK");return Response.json({error:"Order not found"},{status:404})}
  const o=rows[0];
  if(o.status!=="Pending payment"||o.payment_status==="Paid"||o.payment_method!=="manual"){await client.query("ROLLBACK");return Response.json({error:"Only unpaid manual orders can be cancelled here"},{status:409})}
  await client.query("update public.rtw_orders set status='Cancelled',updated_at=now() where id=$1 and shop_id=$2",[id,ctx.shopId]);
  await client.query("select set_config('rtw.stock_reason',$1,true)",["Order cancellation"]);
  const restored=await client.query("update public.rtw_variants v set stock=v.stock+$2 from public.rtw_products p where v.id=$1 and v.product_id=p.id and p.shop_id=$3",[o.variant_id,o.quantity,ctx.shopId]);
  if(restored.rowCount!==1){await client.query("ROLLBACK");return Response.json({error:"Stock could not be restored; cancellation not completed"},{status:409});}
  await client.query("COMMIT");return Response.json({cancelled:true});
 }catch(e){await client.query("ROLLBACK");console.error("[rtw] cancellation failed",e);return Response.json({error:"Unable to cancel order"},{status:500})}finally{client.release()}
}
