import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const cors = { "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods":"POST, OPTIONS" };
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
 if(req.method!=="POST") return json({error:"Method not allowed"},405);
 try{
  const callerToken=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");
  if(!callerToken) return json({error:"请先登录"},401);
  const {identifier,password}=await req.json();
  const login=String(identifier||"").trim(), pass=String(password||"");
  if(!login||!pass) return json({error:"请填写要添加账号的登录名和密码"},400);
  const url=Deno.env.get("SUPABASE_URL")!, service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, anon=Deno.env.get("SUPABASE_ANON_KEY")!;
  const callerRes=await fetch(url+"/auth/v1/user",{headers:{apikey:anon,Authorization:"Bearer "+callerToken}});
  if(!callerRes.ok) return json({error:"当前登录状态已失效，请重新登录"},401);
  const caller=await callerRes.json();
  let email=login;
  if(!login.includes("@")){
   if(!/^[A-Za-z0-9][A-Za-z0-9_-]{3,8}$/.test(login)) return json({error:"用户名或密码不正确"},400);
   const lookup=await fetch(url+"/rest/v1/rpc/resolve_username_user_id",{method:"POST",headers:{apikey:service,Authorization:"Bearer "+service,"Content-Type":"application/json"},body:JSON.stringify({p_username:login})});
   if(!lookup.ok) throw new Error("lookup failed");
   const targetId=await lookup.json();
   if(!targetId) return json({error:"用户名或密码不正确"},401);
   const profile=await fetch(url+"/auth/v1/admin/users/"+encodeURIComponent(targetId),{headers:{apikey:service,Authorization:"Bearer "+service}});
   if(!profile.ok) throw new Error("profile failed");
   email=(await profile.json()).email||"";
  }
  if(!email) return json({error:"用户名或密码不正确"},401);
  const authRes=await fetch(url+"/auth/v1/token?grant_type=password",{method:"POST",headers:{apikey:anon,"Content-Type":"application/json"},body:JSON.stringify({email,password:pass})});
  const session=await authRes.json();
  if(!authRes.ok||!session.user?.id) return json({error:"用户名或密码不正确"},401);
  if(session.user.id===caller.id) return json({error:"这已经是当前登录的账号"},400);
  const attach=await fetch(url+"/rest/v1/rpc/attach_accounts_to_group",{method:"POST",headers:{apikey:service,Authorization:"Bearer "+service,"Content-Type":"application/json"},body:JSON.stringify({p_current_user_id:caller.id,p_target_user_id:session.user.id})});
  if(!attach.ok){const detail=await attach.text();if(detail.includes("maximum nine accounts"))return json({error:"一个人最多关联 9 个账号"},400);throw new Error("attach failed");}
  return json(session);
 }catch(_){return json({error:"账号关联失败，请检查登录信息后重试"},500);}
});