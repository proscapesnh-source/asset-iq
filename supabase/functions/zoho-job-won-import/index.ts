import { createClient } from 'npm:@supabase/supabase-js@2'
const cors={'Access-Control-Allow-Origin':'https://asset-iq-rouge.vercel.app','Access-Control-Allow-Headers':'authorization, content-type, apikey','Access-Control-Allow-Methods':'POST, OPTIONS'}
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}})
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:cors})
 if(req.method!=='POST')return reply({error:'Method not allowed'},405)
 try{
  const token=req.headers.get('Authorization')?.replace(/^Bearer /i,'')
  if(!token)return reply({error:'Sign in required'},401)
  const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!
  const client=createClient(url,anon,{global:{headers:{Authorization:'Bearer '+token}}})
  const {data:{user},error:authError}=await client.auth.getUser(token)
  if(authError||!user)return reply({error:'Session expired. Sign in again.'},401)
  const {organization_id}=await req.json()
  if(typeof organization_id!=='string')return reply({error:'Organization required'},400)
  const {data:membership,error:memberError}=await client.from('organization_members').select('role').eq('organization_id',organization_id).eq('user_id',user.id).maybeSingle()
  if(memberError)return reply({error:'Unable to verify membership.'},503)
  if(!membership||!['owner','admin'].includes(membership.role))return reply({error:'Owner/Admin only'},403)
  const admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const {data:cred,error:credError}=await admin.from('zoho_credentials').select('*').eq('organization_id',organization_id).maybeSingle()
  if(credError)return reply({error:'Credential storage unavailable.'},503)
  if(!cred)return reply({error:'Zoho authorization was not saved. Please use Connect Zoho CRM to authorize again.'},409)
  if(!['https://www.zohoapis.com','https://zohoapis.com'].includes(cred.api_domain))return reply({error:'Unsupported Zoho API domain'},503)
  let access=cred.access_token
  if(new Date(cred.expires_at).getTime()<=Date.now()+60000){
   const clientId=Deno.env.get('ZOHO_CLIENT_ID'),secret=Deno.env.get('ZOHO_CLIENT_SECRET')
   if(!clientId||!secret)return reply({error:'Zoho app credentials unavailable to function.'},503)
   const form=new URLSearchParams({refresh_token:cred.refresh_token,client_id:clientId,client_secret:secret,grant_type:'refresh_token'})
   const refreshed=await fetch('https://accounts.zoho.com/oauth/v2/token',{method:'POST',body:form})
   const result=await refreshed.json()
   if(!refreshed.ok||!result.access_token)return reply({error:'Zoho session expired. Reauthorize connection.'},502)
   access=result.access_token
   const {error:saveError}=await admin.from('zoho_credentials').update({access_token:access,expires_at:new Date(Date.now()+Math.max(60,Number(result.expires_in||3600)-90)*1000).toISOString()}).eq('organization_id',organization_id)
   if(saveError)return reply({error:'Could not securely refresh Zoho session.'},503)
  }
  const api=cred.api_domain==='https://zohoapis.com'?'https://www.zohoapis.com':cred.api_domain
  const fetchZoho=async(path:string)=>{
   const resp=await fetch(api+path,{headers:{Authorization:'Zoho-oauthtoken '+access}})
   const body=await resp.json()
   if(!resp.ok)return {error:body?.message||body?.code||'Zoho API request failed',status:resp.status}
   return {data:body}
  }
  // Owner-initiated safe import: enumerate up to 200 CRM JobSites, no Zoho writes.
  let page=1,found=0,created=0,existing=0
  const failures:string[]=[]
  const matching:{id:string,name:string}[]=[]
  do {
   const deals=await fetchZoho('/crm/v8/Deals?per_page=200&page='+page+'&fields=id,Deal_Name,Stage,Closing_Date,Description')
   if(deals.error)return reply({error:'Zoho Deals: '+deals.error},502)
   const list=deals.data?.data||[]
   for(const deal of list){
    if(String(deal.Stage||'').trim().toLowerCase()!=='job won')continue
    if(!deal.id||!String(deal.Deal_Name||'').trim())continue
    found++
    matching.push({id:String(deal.id),name:String(deal.Deal_Name)})
    const {data:old,error:lookupError}=await admin.from('field_projects').select('id').eq('organization_id',organization_id).eq('zoho_record_id',String(deal.id)).maybeSingle()
    if(lookupError){failures.push('Could not check '+deal.id);continue}
    if(old){existing++;continue}
    const {error:insertError}=await admin.from('field_projects').insert({
     organization_id,title:String(deal.Deal_Name).trim(),
     zoho_record_id:String(deal.id),description:typeof deal.Description==='string'?deal.Description:null,
     status:'owner_review'
    })
    if(insertError){
     if(insertError.code==='23505')existing++
     else failures.push('Could not import '+deal.id)
    } else created++
   }
   if(!deals.data?.info?.more_records)break
   page++
  }while(page<=5)
  return reply({created,existing,matched:found,scanned_pages:page,limited:page>5,failures,records:matching.slice(0,30),trigger_stage:'Job Won'})
 }catch(e){console.error('Zoho job won import failed',e instanceof Error?e.message:'unknown');return reply({error:'Zoho import failed; check logs.'},500)}
})
