import { createClient } from 'npm:@supabase/supabase-js@2'
export const base='https://tntbijxtaatsycluiude.supabase.co/functions/v1/zoho-oauth-callback'
export const app='https://asset-iq-rouge.vercel.app/'
export const admin=()=>createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
export const headers={'Access-Control-Allow-Origin':app.slice(0,-1),'Access-Control-Allow-Headers':'authorization, content-type, apikey','Access-Control-Allow-Methods':'POST, OPTIONS'}
export const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...headers,'content-type':'application/json'}})

Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response(null,{headers})
 if(req.method!=='POST')return json({error:'POST required'},405)
 try {
 const token=req.headers.get('authorization')?.replace(/^Bearer /i,'')
 if(!token)return json({error:'Sign in required'},401)
 const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:'Bearer '+token}}})
 const {data:{user},error:authError}=await client.auth.getUser(token)
 if(authError||!user)return json({error:'Session expired'},401)
 const {organization_id}=await req.json()
 if(typeof organization_id!=='string')return json({error:'Organization required'},400)
 const db=admin()
 const {data:member,error:memberError}=await client.from('organization_members').select('role').eq('organization_id',organization_id).eq('user_id',user.id).maybeSingle()
 if(memberError)return json({error:'Could not verify organization membership: '+memberError.message},503)
 if(!member)return json({error:'Your signed-in account has no membership in this organization. Sign out and sign in again.'},403)
 if(!['owner','admin'].includes(member.role))return json({error:'Zoho connection requires Owner/Admin. Current membership: '+member.role},403)
 const clientId=Deno.env.get('ZOHO_CLIENT_ID')
 if(!clientId||!Deno.env.get('ZOHO_CLIENT_SECRET'))return json({error:'Zoho app credentials not configured'},503)
 const state=crypto.randomUUID()+crypto.randomUUID()
 const {error:e}=await db.from('zoho_oauth_states').insert({state,organization_id,user_id:user.id})
 if(e)throw e
 const params=new URLSearchParams({scope:'ZohoCRM.modules.deals.READ,ZohoCRM.modules.deals.CREATE,ZohoCRM.modules.attachments.CREATE',client_id:clientId,response_type:'code',access_type:'offline',prompt:'consent',redirect_uri:base,state})
 return json({url:'https://accounts.zoho.com/oauth/v2/auth?'+params.toString()})
 }catch(e){return json({error:e instanceof Error?e.message:'Unable to start connection'},500)}
})
