import { createClient } from 'npm:@supabase/supabase-js@2'
const cors={ 'Access-Control-Allow-Origin':'https://asset-iq-rouge.vercel.app', 'Access-Control-Allow-Headers':'authorization,content-type,apikey', 'Access-Control-Allow-Methods':'POST,OPTIONS' }
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}})
type Deal={id:string,Deal_Name:string,Stage:string,Description?:string,Closing_Date?:string}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:cors})
 if(req.method!=='POST')return reply({error:'Method not allowed'},405)
 try{
  const token=req.headers.get('Authorization')?.replace(/^Bearer /i,'')
  if(!token)return reply({error:'Sign in required'},401)
  const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!
  const client=createClient(url,anon,{global:{headers:{Authorization:'Bearer '+token}}})
  const {data:{user},error:authError}=await client.auth.getUser(token)
  if(authError||!user)return reply({error:'Session expired'},401)
  const payload=await req.json()
  const organization_id=payload?.organization_id
  const mode=payload?.mode
  if(typeof organization_id!=='string'||!['search','import'].includes(mode))return reply({error:'Invalid request'},400)
  const {data:membership,error:memberError}=await client.from('organization_members').select('role').eq('organization_id',organization_id).eq('user_id',user.id).maybeSingle()
  if(memberError)return reply({error:'Could not validate membership'},503)
  if(!membership||!['owner','supervisor'].includes(membership.role))return reply({error:'Owner or Supervisor only'},403)
  if(mode==='import'&&membership.role!=='owner')return reply({error:'Only owners can import Zoho projects. Ask an owner to approve the import.'},403)
  const admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const {data:cred,error:credError}=await admin.from('zoho_credentials').select('*').eq('organization_id',organization_id).maybeSingle()
  if(credError||!cred)return reply({error:'Zoho is not connected. Ask an owner to connect it in Integration Hub.'},409)
  if(!['https://www.zohoapis.com','https://zohoapis.com'].includes(cred.api_domain))return reply({error:'Unsupported Zoho endpoint'},503)
  let access=cred.access_token
  if(new Date(cred.expires_at).getTime()<=Date.now()+60000){
   const clientId=Deno.env.get('ZOHO_CLIENT_ID'),secret=Deno.env.get('ZOHO_CLIENT_SECRET')
   if(!clientId||!secret)return reply({error:'Zoho connection needs reauthorization'},503)
   const form=new URLSearchParams({refresh_token:cred.refresh_token,client_id:clientId,client_secret:secret,grant_type:'refresh_token'})
   const renewed=await fetch('https://accounts.zoho.com/oauth/v2/token',{method:'POST',body:form})
   const result=await renewed.json()
   if(!renewed.ok||!result.access_token)return reply({error:'Zoho session expired. Reconnect Zoho.'},502)
   access=result.access_token
   const {error:updateError}=await admin.from('zoho_credentials').update({access_token:access,expires_at:new Date(Date.now()+Math.max(60,Number(result.expires_in||3600)-90)*1000).toISOString()}).eq('organization_id',organization_id)
   if(updateError)return reply({error:'Failed to refresh Zoho credentials'},503)
  }
  const base=cred.api_domain==='https://zohoapis.com'?'https://www.zohoapis.com':cred.api_domain
  async function getDeals(path:string):Promise<{data?:{data?:Deal[],info?:{more_records?:boolean}},error?:string}>{
   const response=await fetch(base+path,{headers:{Authorization:'Zoho-oauthtoken '+access}})
   const result=await response.json()
   if(!response.ok)return {error:String(result?.message||result?.code||'Zoho API error')}
   return {data:result}
  }
  if(mode==='search'){
   const term=String(payload?.search||'').trim().toLowerCase()
   if(term.length<2||term.length>120)return reply({error:'Enter at least two characters of the project name'},400)
   const matches:{id:string,name:string,stage:string,closing_date:string|null,importable:boolean}[]=[]
   let page=1,more=false
   do{
    const response=await getDeals('/crm/v8/Deals?per_page=200&page='+page+'&fields=id,Deal_Name,Stage,Closing_Date,Description')
    if(response.error)return reply({error:response.error},502)
    for(const d of response.data?.data||[]){
     if(String(d.Deal_Name||'').toLowerCase().includes(term))matches.push({
      id:String(d.id),name:String(d.Deal_Name),stage:String(d.Stage||''),closing_date:d.Closing_Date||null,
      importable:String(d.Stage||'').trim().toLowerCase()==='purchase order received'
     })
     if(matches.length>=20)break
    }
    more=!!response.data?.info?.more_records
    page++
   }while(more&&page<=5&&matches.length<20)
   return reply({matches,limited:more,read_only:true})
  }
  const dealId=String(payload?.deal_id||'')
  if(!/^\d{5,30}$/.test(dealId))return reply({error:'Select an exact Zoho job before importing'},400)
  const result=await getDeals('/crm/v8/Deals/'+encodeURIComponent(dealId))
  if(result.error)return reply({error:result.error},502)
  const deal=result.data?.data?.[0]
  if(!deal||String(deal.id)!==dealId)return reply({error:'Deal not found'},404)
  if(String(deal.Stage||'').trim().toLowerCase()!=='purchase order received')return reply({error:'Only Purchase Order Received jobs can be imported'},409)
  const title=String(deal.Deal_Name||'').trim()
  if(!title)return reply({error:'Zoho job has no name'},409)
  const {data:existing,error:lookupError}=await admin.from('field_projects').select('id,title,status').eq('organization_id',organization_id).eq('zoho_record_id',dealId).maybeSingle()
  if(lookupError)return reply({error:'Project lookup failed'},503)
  if(existing)return reply({existing:true,project:existing})
  const {data:created,error:insertError}=await admin.from('field_projects')
   .insert({organization_id,title,zoho_record_id:dealId,description:typeof deal.Description==='string'?deal.Description:null,status:'owner_review'})
   .select('id,title,status').single()
  if(insertError){
   if(insertError.code==='23505'){
    const {data:again}=await admin.from('field_projects').select('id,title,status').eq('organization_id',organization_id).eq('zoho_record_id',dealId).maybeSingle()
    if(again)return reply({existing:true,project:again})
   }
   return reply({error:'Could not import selected project'},503)
  }
  return reply({existing:false,project:created})
 }catch(e){console.error('Zoho assistant operation failed',e instanceof Error?e.message:'unknown');return reply({error:'Unable to complete Zoho operation'},500)}
})
