import {createClient} from 'npm:@supabase/supabase-js@2'
const h={'Access-Control-Allow-Origin':'https://asset-iq-rouge.vercel.app','Access-Control-Allow-Headers':'authorization,content-type,apikey','Access-Control-Allow-Methods':'POST,OPTIONS','Content-Type':'application/json'}
const res=(v:unknown,s=200)=>new Response(JSON.stringify(v),{status:s,headers:h})
Deno.serve(async request=>{
 if(request.method==='OPTIONS')return new Response(null,{headers:h})
 if(request.method!=='POST')return res({error:'POST required'},405)
 const bearer=request.headers.get('authorization')?.replace(/^Bearer /i,'')
 if(!bearer)return res({error:'Sign in required'},401)
 try{
 const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!
 const session=createClient(url,anon,{global:{headers:{Authorization:'Bearer '+bearer}}})
 const {data:{user}}=await session.auth.getUser(bearer)
 if(!user)return res({error:'Invalid session'},401)
 const {organization_id}=await request.json()
 if(typeof organization_id!=='string')return res({error:'Organization required'},400)
 const {data:membership}=await session.from('organization_members').select('role').eq('organization_id',organization_id).eq('user_id',user.id).maybeSingle()
 if(!membership||!['owner','admin'].includes(membership.role))return res({error:'Owner/Admin only'},403)
 const admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
 const {data:cred}=await admin.from('zoho_credentials').select('access_token,expires_at,api_domain').eq('organization_id',organization_id).maybeSingle()
 if(!cred)return res({error:'Zoho connection unavailable; reauthorize.'},409)
 if(new Date(cred.expires_at).getTime()<Date.now()+30000)return res({error:'Zoho access token expired. Reconnect to authorize test creation.'},409)
 if(!['https://www.zohoapis.com','https://zohoapis.com'].includes(cred.api_domain))return res({error:'Unsupported Zoho API region'},409)
 const marker='POLYSHIELD-ATTACHMENT-TEST-'+organization_id.slice(0,8)
 const list=await fetch('https://www.zohoapis.com/crm/v8/Deals/search?criteria='+encodeURIComponent('(Deal_Name:equals:'+marker+')'),{headers:{Authorization:'Zoho-oauthtoken '+cred.access_token}})
 const found=list.status===204?{code:'NO_CONTENT'}:await list.json().catch(()=>({code:'INVALID_RESPONSE'}))
 if(list.ok&&found?.data?.length)return res({id:String(found.data[0].id),name:marker,existing:true})
 if(!list.ok&&list.status!==204&&found?.code!=='NO_CONTENT')return res({error:'Could not check for an existing test record. No changes made.',zoho_code:found?.code||null},502)
 const body={data:[{Deal_Name:marker,Stage:'Purchase Order Received',Description:'TEST ONLY — PolyShield integration validation. No customer, pricing, invoice, or real purchase order.'}],trigger:[]}
 const create=await fetch('https://www.zohoapis.com/crm/v8/Deals',{method:'POST',headers:{Authorization:'Zoho-oauthtoken '+cred.access_token,'Content-Type':'application/json'},body:JSON.stringify(body)})
 const result=await create.json().catch(()=>({message:'Zoho returned a response without JSON'}))
 const first=result?.data?.[0]
 if(!create.ok||first?.code!=='SUCCESS'||!first?.details?.id)return res({error:'Zoho did not create the sample JobSite.',details:first?.message||result?.message||'Check required Deals fields and stage permissions.',zoho_code:first?.code||result?.code||null},422)
 return res({id:String(first.details.id),name:marker,existing:false})
 }catch(e){console.error('Test jobsite creation failure',e instanceof Error?e.message:'unknown');return res({error:'Could not complete sample JobSite creation'},500)}
})