import { getTenant } from "@/lib/db/session";
import { getPool } from "@/lib/db/pool";
import { cleanImageRef } from "@/lib/image-ref";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function validVariant(v:any){return v && typeof v.size==="string" && v.size.trim().length>0 && v.size.trim().length<=80 && typeof v.color==="string" && v.color.trim().length>0 && v.color.trim().length<=80 && Number.isInteger(v.stock) && v.stock>=0 && v.stock<=100000;}
function variantKey(v:{size:string;color:string}){return JSON.stringify([v.size.trim().toLowerCase(),v.color.trim().toLowerCase()]);}
function galleryRefs(input:unknown):string[]|undefined {if(input===undefined)return [];if(!Array.isArray(input)||input.length>7)return undefined;const refs=input.map(v=>typeof v==="string"?cleanImageRef(v):undefined);if(refs.some(v=>!v))return undefined;return Array.from(new Set(refs as string[]));}
function organisation(b:any){const collection=typeof b.collection==="string"?b.collection.trim():"",sku=typeof b.sku==="string"?b.sku.trim().toUpperCase():"",barcode=typeof b.barcode==="string"?b.barcode.trim():"";if(collection.length>100|| (sku&&!/^[A-Z0-9._-]{1,64}$/.test(sku))||(barcode&&!/^[0-9]{8,14}$/.test(barcode)))return null;return {collection,sku:sku||null,barcode:barcode||null};}
export async function GET() {
 const ctx=await getTenant(); if(!ctx)return Response.json({error:"Unauthorized"},{status:401});
 if(ctx.role!=="madam")return Response.json({error:"Only the owner can manage products"},{status:403});
 const {rows}=await getPool().query("select p.*,coalesce(json_agg(json_build_object('id',v.id,'size',v.size,'color',v.color,'stock',v.stock)) filter(where v.id is not null),'[]') as variants from public.rtw_products p left join public.rtw_variants v on v.product_id=p.id where p.shop_id=$1 group by p.id order by p.created_at desc",[ctx.shopId]);
 return Response.json(rows);
}
export async function POST(req:Request) {
 const ctx=await getTenant();if(!ctx)return Response.json({error:"Unauthorized"},{status:401});
 if(ctx.role!=="madam")return Response.json({error:"Only the owner can manage products"},{status:403});
 const b=await req.json().catch(()=>null);
 if(!b||typeof b!=="object"||Array.isArray(b))return Response.json({error:"Invalid product request"},{status:400});
 const title=String(b.title??"").trim(),description=String(b.description??"").trim(),category=String(b.category??"Dresses").trim();
 const price=Number(b.price),image=b.imageUrl?cleanImageRef(String(b.imageUrl)):null;
 if(!title||title.length>180||description.length>4000||category.length>80||!Number.isFinite(price)||price<=0||price>1000000||image===undefined)return Response.json({error:"Invalid product details"},{status:400});
 const org=organisation(b);if(!org)return Response.json({error:"Invalid collection, SKU or barcode"},{status:400});
 const gallery=galleryRefs(b.galleryImages);if(!gallery)return Response.json({error:"Invalid gallery images"},{status:400});
 const variants=Array.isArray(b.variants)?b.variants:[];
 if(!variants.length||variants.length>50||variants.some(v=>!validVariant(v)))return Response.json({error:"Add valid sizes, colours and stock"},{status:400});
 if(new Set(variants.map(variantKey)).size!==variants.length)return Response.json({error:"Duplicate size and colour combinations are not allowed"},{status:400});
 const pool=getPool(),client=await pool.connect();
 try {
  await client.query("BEGIN");
  const {rows}=await client.query("insert into public.rtw_products(shop_id,title,description,category,price,image_url,published,gallery_images,collection_name,sku,barcode) values($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11) returning id",[ctx.shopId,title,description,category,price,image??null,b.published===true,JSON.stringify(gallery),org.collection,org.sku,org.barcode]);
  for(const v of variants)await client.query("insert into public.rtw_variants(product_id,size,color,stock) values($1,$2,$3,$4)",[rows[0].id,String(v.size).trim(),String(v.color).trim(),v.stock]);
  await client.query("COMMIT");return Response.json({id:rows[0].id},{status:201});
 }catch(err){if((err as {code?:string})?.code==="23505")return Response.json({error:"Duplicate SKU, barcode or variant"},{status:409});console.error("Ready-to-wear product creation failed", {shopId:ctx.shopId,code:(err as {code?:string})?.code});return Response.json({error:"Unable to save product; check duplicate sizes and colours"},{status:500})}finally{try{await client.query("ROLLBACK")}catch{}client.release()}
}

export async function PATCH(req:Request){
 const ctx=await getTenant();if(!ctx)return Response.json({error:"Unauthorized"},{status:401});
 if(ctx.role!=="madam")return Response.json({error:"Only the owner can manage products"},{status:403});
 const b=await req.json().catch(()=>null);
 if(b?.action==="detailed_cost"){
 const keys=["materials","wastage","labour","embellishments","overhead","other"] as const;
 const parts=b.parts,margin=b.margin;
 if(typeof b.id!=="string"||!uuid.test(b.id)||!parts||typeof parts!=="object"||Array.isArray(parts)||keys.some(k=>typeof parts[k]!=="number"||!Number.isFinite(parts[k])||parts[k]<0||parts[k]>1000000||Math.abs(parts[k]*100-Math.round(parts[k]*100))>0.000001)||typeof margin!=="number"||!Number.isFinite(margin)||margin<0||margin>99||Math.abs(margin*100-Math.round(margin*100))>0.000001)return Response.json({error:"Invalid costing details"},{status:400});
 const breakdown=Object.fromEntries(keys.map(k=>[k,parts[k]])),total=keys.reduce((sum,k)=>sum+Math.round(parts[k]*100),0)/100;
 if(total>1000000)return Response.json({error:"Total cost exceeds limit"},{status:400});
 try{const r=await getPool().query("update public.rtw_products set unit_cost=$3,cost_breakdown=$4::jsonb,target_margin=$5 where id=$1 and shop_id=$2 returning id",[b.id,ctx.shopId,total,JSON.stringify(breakdown),margin]);return r.rowCount?Response.json({id:b.id,unitCost:total}):Response.json({error:"Product not found"},{status:404});}catch{return Response.json({error:"Unable to save costing details"},{status:500});}}
 if(b?.action==="cost"){const cost=b.unitCost;if(typeof b.id!=="string"||!uuid.test(b.id)||(cost!==null&&(typeof cost!=="number"||!Number.isFinite(cost)||cost<0||cost>1000000||Math.abs(cost*100-Math.round(cost*100))>0.000001)))return Response.json({error:"Invalid production cost"},{status:400});try{const r=await getPool().query("update public.rtw_products set unit_cost=$3,cost_breakdown=null,target_margin=null where id=$1 and shop_id=$2 returning id",[b.id,ctx.shopId,cost]);return r.rowCount?Response.json({id:b.id}):Response.json({error:"Product not found"},{status:404});}catch{return Response.json({error:"Unable to save production cost"},{status:500});}}
 if(b?.action==="pricing"){
 const threshold=b.threshold, sale=b.salePrice===null?null:Number(b.salePrice), start=sale===null?null:new Date(b.start),end=sale===null?null:new Date(b.end);
 if(typeof b.id!=="string"||!uuid.test(b.id)||!Number.isInteger(threshold)||threshold<0||threshold>100000||(sale!==null&&(!Number.isFinite(sale)||sale<0.01||sale>1000000||Math.abs(sale*100-Math.round(sale*100))>0.000001||!start||!end||!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||end<=start)))return Response.json({error:"Invalid promotion or stock threshold"},{status:400});
 try{const r=await getPool().query("update public.rtw_products set sale_price=$3,sale_start=$4,sale_end=$5,low_stock_threshold=$6 where id=$1 and shop_id=$2 and ($3::numeric is null or $3::numeric<price) returning id",[b.id,ctx.shopId,sale,start,end,threshold]);return r.rowCount?Response.json({id:b.id}):Response.json({error:"Product not found or sale price must be below regular price"},{status:409});}catch{return Response.json({error:"Unable to update pricing"},{status:500});}}
 if(b?.action==="archive"){if(typeof b.id!=="string"||!uuid.test(b.id)||typeof b.archived!=="boolean")return Response.json({error:"Invalid archive request"},{status:400});try{const r=await getPool().query("update public.rtw_products set archived_at=case when $3::boolean then coalesce(archived_at,now()) else null end,published=false where id=$1 and shop_id=$2 returning id",[b.id,ctx.shopId,b.archived]);return r.rowCount?Response.json({id:b.id}):Response.json({error:"Product not found"},{status:404});}catch{return Response.json({error:"Unable to change archive status"},{status:500});}}
 if(b?.action==="add_variant"){
 if(typeof b.id!=="string"||!uuid.test(b.id)||!validVariant(b.variant))return Response.json({error:"Enter a valid size, colour and stock quantity"},{status:400});
 const client=await getPool().connect();
 try{
 await client.query("BEGIN");
 const product=await client.query("select id from public.rtw_products where id=$1 and shop_id=$2 for update",[b.id,ctx.shopId]);
 if(!product.rowCount)return Response.json({error:"Product not found"},{status:404});
 const existing=await client.query("select size,color from public.rtw_variants where product_id=$1",[b.id]);
 if(existing.rows.length>=50)return Response.json({error:"Maximum 50 variants per product"},{status:409});
 if(existing.rows.some(v=>variantKey(v)===variantKey(b.variant)))return Response.json({error:"This size and colour already exists. Adjust its stock instead."},{status:409});
 const result=await client.query("insert into public.rtw_variants(product_id,size,color,stock) values($1,$2,$3,$4) returning id",[b.id,b.variant.size.trim(),b.variant.color.trim(),b.variant.stock]);
 await client.query("COMMIT");return Response.json({id:result.rows[0].id},{status:201});
 }catch{return Response.json({error:"Unable to add variant"},{status:500});}finally{try{await client.query("ROLLBACK")}catch{}client.release()}
 }
 if(b?.action==="edit"){ const title=typeof b.title==="string"?b.title.trim():"",category=typeof b.category==="string"?b.category.trim():"",description=typeof b.description==="string"?b.description.trim():"",price=Number(b.price); const image=b.imageUrl?cleanImageRef(String(b.imageUrl)):null;
 if(typeof b.id!=="string"||!uuid.test(b.id)||!title||title.length>180||!category||category.length>80||description.length>4000||!Number.isFinite(price)||price<=0||price>1000000||image===undefined)return Response.json({error:"Invalid product details"},{status:400});
 const org=organisation(b);if(!org)return Response.json({error:"Invalid collection, SKU or barcode"},{status:400});
 const gallery=galleryRefs(b.galleryImages);if(!gallery)return Response.json({error:"Invalid gallery images"},{status:400});
 try{const r=await getPool().query("update public.rtw_products set title=$3,category=$4,description=$5,price=$6,image_url=$7,gallery_images=coalesce($8::jsonb,gallery_images),collection_name=$9,sku=$10,barcode=$11,sale_price=case when sale_price >= $6 then null else sale_price end where id=$1 and shop_id=$2 returning id",[b.id,ctx.shopId,title,category,description,price,image,b.galleryImages===undefined?null:JSON.stringify(gallery),org.collection,org.sku,org.barcode]);return r.rowCount?Response.json({id:b.id}):Response.json({error:"Product not found"},{status:404});}catch(err){if((err as {code?:string})?.code==="23505")return Response.json({error:"SKU or barcode already exists in your studio"},{status:409});return Response.json({error:"Unable to edit product"},{status:500});}}
 if(b?.action==="adjust_stock"){if(typeof b.id!=="string"||!uuid.test(b.id)||typeof b.variantId!=="string"||!uuid.test(b.variantId)||!Number.isInteger(b.delta)||b.delta===0||Math.abs(b.delta)>100000)return Response.json({error:"Invalid stock adjustment"},{status:400});try{const r=await getPool().query("update public.rtw_variants v set stock=v.stock+$4 from public.rtw_products p where v.id=$1 and p.id=$2 and p.shop_id=$3 and v.product_id=p.id and v.stock+$4 between 0 and 100000 returning v.stock",[b.variantId,b.id,ctx.shopId,b.delta]);return r.rowCount?Response.json({stock:r.rows[0].stock}):Response.json({error:"Stock adjustment unavailable or exceeds stock limits"},{status:409});}catch{return Response.json({error:"Unable to adjust stock"},{status:500});}}
 if(!b||typeof b.id!=="string"||!uuid.test(b.id)||typeof b.published!=="boolean")return Response.json({error:"Invalid publication request"},{status:400});
 try{const r=await getPool().query("update public.rtw_products set published=$3 where id=$1 and shop_id=$2 and archived_at is null returning id",[b.id,ctx.shopId,b.published]);if(!r.rowCount)return Response.json({error:"Product not found"},{status:404});return Response.json({id:b.id,published:b.published});}catch{return Response.json({error:"Unable to update product publication"},{status:500});}
}
