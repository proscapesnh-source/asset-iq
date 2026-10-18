import { createClient } from 'npm:@supabase/supabase-js@2'
export const base='https://tntbijxtaatsycluiude.supabase.co/functions/v1/zoho-oauth-callback'
export const app='https://asset-iq-rouge.vercel.app/'
export const admin=()=>createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
export const headers={'Access-Control-Allow-Origin':app.slice(0,-1),'Access-Control-Allow-Headers':'authorization, content-type, apikey','Access-Control-Allow-Methods':'POST, OPTIONS'}
export const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...headers,'content-type':'application/json'}})

Deno.serve(async(req)=>{
 const back=(result:string)=>Response.redirect(app+'?zoho='+encodeURIComponent(result),302)
 try{
 const q=new URL(req.url).searchParams
 const state=q.get('state')
 if(!state)return back('invalid_state')
 const db=admin()
 const {data:row}=await db.from('zoho_oauth_states').select('*').eq('state',state).is('consumed_at',null).gt('expires_at',new Date().toISOString()).maybeSingle()
 if(!row)return back('expired_state')
 const {data:consumed,error:consumeError}=await db.from('zoho_oauth_states').update({consumed_at:new Date().toISOString()}).eq('state',state).is('consumed_at',null).select('state').maybeSingle()
 if(consumeError||!consumed)return back('expired_state')
 if(q.has('error')||!q.get('code'))return back('denied')
 const secret=Deno.env.get('ZOHO_CLIENT_SECRET'),clientId=Deno.env.get('ZOHO_CLIENT_ID')
 if(!secret||!clientId)return back('not_configured')
 const form=new URLSearchParams({grant_type:'authorization_code',client_id:clientId,client_secret:secret,redirect_uri:base,code:q.get('code')!})
 const response=await fetch('https://accounts.zoho.com/oauth/v2/token',{method:'POST',body:form})
 const result=await response.json()
 if(!response.ok||!result.refresh_token||!result.access_token)return back('token_error')
 const domain=result.api_domain
 if(!['https://www.zohoapis.com','https://zohoapis.com'].includes(domain))return back('domain_error')
 const {error:saveError}=await db.from('zoho_credentials').upsert({organization_id:row.organization_id,refresh_token:result.refresh_token,access_token:result.access_token,api_domain:domain,expires_at:new Date(Date.now()+Math.max(60,Number(result.expires_in||3600)-90)*1000).toISOString(),updated_at:new Date().toISOString()})
 if(saveError)throw saveError
 const {data:existing}=await db.from('integration_connections').select('id').eq('organization_id',row.organization_id).eq('provider','zoho').limit(1).maybeSingle()
 const payload={organization_id:row.organization_id,provider:'zoho',display_name:'Zoho CRM - Amtech',direction:'incoming',status:'connected',permissions:{sites:{read:true,write:false}},field_mapping:{module:'Deals',trigger:'Job Won'}}
 const {error:connectionError}=existing?await db.from('integration_connections').update({status:'connected'}).eq('id',existing.id):await db.from('integration_connections').insert(payload)
 if(connectionError)throw connectionError
 return back('connected')
 }catch(e){console.error('Zoho OAuth callback failure',e instanceof Error?e.message:'unknown');return back('error')}
})
