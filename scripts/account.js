/* Account menu — clean square profile, editable names, linked accounts. */
(() => {
  const entry = document.getElementById('account-entry');
  if (!entry || !window.siteAuth) return;
  let dialog = null;
  const style = document.createElement('style');
  style.textContent = `
    .account-entry.is-signed-in{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;min-width:44px;padding:0;overflow:hidden}
    .account-avatar{width:100%;height:100%;flex:0 0 100%;display:grid;place-items:center;overflow:hidden;border:0!important;border-radius:0!important;background:#29251d;color:#f4bd3c;font:800 15px/1 system-ui,sans-serif}
    .account-avatar img{width:100%;height:100%;display:block;object-fit:cover}
    .account-modal-backdrop{position:fixed;inset:0;z-index:700;display:grid;place-items:center;padding:18px;background:rgba(12,10,7,.58);backdrop-filter:blur(5px)}
    .account-modal{width:min(440px,100%);max-height:min(86vh,760px);overflow:auto;border:1px solid rgba(25,22,17,.2);border-radius:10px;background:#f7f2e8;color:#242018;box-shadow:0 22px 70px rgba(0,0,0,.28);animation:account-in .16s ease-out}
    @keyframes account-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
    .account-modal-head{display:flex;align-items:center;justify-content:space-between;padding:17px 19px;border-bottom:1px solid rgba(25,22,17,.12)}
    .account-modal-head h2{margin:0;font-size:17px;font-weight:750;letter-spacing:0}
    .account-modal-close{width:32px;height:32px;border:1px solid rgba(25,22,17,.18);border-radius:6px;background:#fffdf8;color:#302a20;font-size:20px;cursor:pointer}
    .account-modal-body{padding:18px}
    .account-profile{display:flex;align-items:center;gap:13px;padding:0 0 16px;border-bottom:1px solid rgba(25,22,17,.12)}
    .account-profile .account-avatar{width:58px;height:58px;flex-basis:58px;border:1px solid rgba(25,22,17,.16)!important;background:#e9dfca;font-size:18px}
    .account-profile-main{min-width:0;display:grid;gap:6px}
    .account-profile-main strong{font-size:15px;overflow-wrap:anywhere}
    .account-public-id{color:#807866;font:600 11px ui-monospace,monospace;letter-spacing:.5px}
    .account-section{padding:16px 0;border-bottom:1px solid rgba(25,22,17,.12)}
    .account-section:last-of-type{border-bottom:0}
    .account-section-title{margin:0 0 10px;font-size:12px;font-weight:750;color:#5f5748}
    .account-name-row,.account-switch-row{display:flex;align-items:center;gap:8px;margin:7px 0}
    .account-name-value{flex:1;min-width:0;padding:9px 10px;border:1px solid rgba(25,22,17,.12);border-radius:6px;background:#fffdf8;font-size:13px;overflow-wrap:anywhere}
    .account-modal button{font:650 12px/1.2 system-ui,sans-serif}
    .account-action{min-height:34px;padding:0 11px;border:1px solid rgba(25,22,17,.2);border-radius:6px;background:#fffdf8;color:#2b271f;cursor:pointer;white-space:nowrap}
    .account-action.primary{border-color:#c18b25;background:#eebd55;color:#241d10}
    .account-action:disabled{opacity:.45;cursor:not-allowed}
    .account-edit-input,.account-add-form input{width:100%;min-width:0;height:36px;padding:0 9px;border:1px solid rgba(25,22,17,.2);border-radius:6px;background:#fffdf8;color:#242018;font:500 13px system-ui,sans-serif}
    .account-add-form{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px;margin-top:10px}
    .account-add-account{display:grid;gap:8px;margin-top:10px}
    .account-switch-row .account-name-value{display:grid;gap:4px}
    .account-switch-row small{color:#817866;font-size:10px}
    .account-status{min-height:16px;margin:8px 0 0;color:#76684f;font-size:11px;line-height:1.5}
    .account-modal-actions{display:flex;gap:9px;margin-top:17px}
    .account-modal-actions button{flex:1;min-height:38px}
    .account-modal-logout{background:#fffdf8}
    .account-loading{color:#8b806c;font-size:12px}
    @media(max-width:600px){.account-entry.is-signed-in{width:38px;height:38px;min-width:38px}.account-modal-body{padding:15px}.account-modal{max-height:88vh}}
    @media(prefers-reduced-motion:reduce){.account-modal{animation:none}}
  `;
  document.head.appendChild(style);

  const strings = () => {
    const lang=document.documentElement.lang;
    if(lang==='en') return {title:'My account',name:'Username',id:'Account ID',edit:'Edit',save:'Save',cancel:'Cancel',add:'Add',addName:'Add username',accounts:'Linked accounts',addAccount:'Add an account',switch:'Switch',current:'Current',logout:'Sign out all',close:'Close',identifier:'Username or email',password:'Password',limit:'Up to 9 accounts',loading:'Loading…',failed:'Could not load account information.',saved:'Username updated.',added:'Account linked successfully.',bad:'Please enter a valid username.',error:'Something went wrong. Please try again.',confirm:'Sign out all accounts saved on this device?',yes:'Sign out all',no:'Cancel',missingToken:'Sign in to this account on this device before switching.',idLabel:'11-digit ID'};
    if(lang==='ja') return {title:'マイアカウント',name:'ユーザー名',id:'アカウントID',edit:'編集',save:'保存',cancel:'キャンセル',add:'追加',addName:'ユーザー名を追加',accounts:'連携済みアカウント',addAccount:'アカウントを追加',switch:'切替',current:'使用中',logout:'すべてログアウト',close:'閉じる',identifier:'ユーザー名またはメール',password:'パスワード',limit:'最大9アカウント',loading:'読み込み中…',failed:'アカウント情報を読み込めません。',saved:'ユーザー名を更新しました。',added:'アカウントを連携しました。',bad:'有効なユーザー名を入力してください。',error:'エラーが発生しました。もう一度お試しください。',confirm:'この端末に保存されたすべてのアカウントからログアウトしますか？',yes:'すべてログアウト',no:'キャンセル',missingToken:'切り替えるには、この端末で一度ログインしてください。',idLabel:'11桁ID'};
    return {title:'我的账号',name:'用户名',id:'账号 ID',edit:'编辑',save:'保存',cancel:'取消',add:'添加',addName:'添加用户名',accounts:'已关联账号',addAccount:'添加账号',switch:'切换',current:'当前使用',logout:'退出所有账号',close:'关闭',identifier:'用户名或邮箱',password:'密码',limit:'最多关联 9 个账号',loading:'正在加载…',failed:'账号信息加载失败。',saved:'用户名已更新。',added:'账号关联成功。',bad:'请输入有效的用户名。',error:'操作失败，请重试。',confirm:'确定退出此设备上保存的所有账号吗？',yes:'全部退出',no:'取消',missingToken:'这台设备尚未保存该账号的登录凭据，请先登录一次。',idLabel:'11 位数字 ID'};
  };
  const safeAvatarUrl=value=>{try{const url=new URL(String(value||''));const host=url.hostname.toLowerCase();if(url.protocol!=='https:')return '';if(host==='avatars.githubusercontent.com'||host==='lh3.googleusercontent.com'||host.endsWith('.googleusercontent.com'))return url.href;return '';}catch(_){return '';}};
  const avatar=(u)=>{const el=document.createElement('span');el.className='account-avatar';el.setAttribute('aria-hidden','true');const fallback=String(u.username||u.email||'U').trim().slice(0,1).toUpperCase()||'U';const src=safeAvatarUrl(u.avatarUrl);if(src){const img=document.createElement('img');img.src=src;img.alt='';img.referrerPolicy='no-referrer';img.onerror=()=>{el.textContent=fallback};el.append(img)}else el.textContent=fallback;return el;};
  const close=()=>{if(dialog){dialog.remove();dialog=null;}};
  const status=(node,text)=>{node.textContent=text||'';};
  const open=async(user)=>{
    if(dialog)return;
    const t=strings();
    dialog=document.createElement('div');dialog.className='account-modal-backdrop';
    dialog.innerHTML=`<section class="account-modal" role="dialog" aria-modal="true" aria-labelledby="account-modal-title">
      <header class="account-modal-head"><h2 id="account-modal-title">${t.title}</h2><button class="account-modal-close" type="button" aria-label="${t.close}">×</button></header>
      <div class="account-modal-body">
        <div class="account-profile"><div class="account-profile-avatar"></div><div class="account-profile-main"><strong class="account-profile-name"></strong><span class="account-public-id"></span></div></div>
        <section class="account-section"><h3 class="account-section-title">${t.name}</h3><div class="account-usernames"><span class="account-loading">${t.loading}</span></div><form class="account-add-form"><input name="username" maxlength="9" minlength="4" placeholder="${t.name}" autocomplete="off" required><button class="account-action primary" type="submit">${t.add}</button></form><p class="account-status account-name-status" aria-live="polite"></p></section>
        <section class="account-section"><h3 class="account-section-title">${t.accounts}</h3><div class="account-linked"><span class="account-loading">${t.loading}</span></div><p class="account-status account-link-status" aria-live="polite"></p></section>
        <section class="account-section"><h3 class="account-section-title">${t.addAccount}</h3><form class="account-add-account"><input name="identifier" placeholder="${t.identifier}" autocomplete="username" required><input name="password" type="password" placeholder="${t.password}" autocomplete="current-password" required><button class="account-action primary" type="submit">${t.addAccount}</button></form><p class="account-status account-add-status" aria-live="polite"></p></section>
        <div class="account-modal-actions"><button class="account-action account-modal-logout" type="button">${t.logout}</button><button class="account-action" type="button" data-close>${t.close}</button></div>
      </div></section>`;
    document.body.append(dialog);
    const q=s=>dialog.querySelector(s), nameStatus=q('.account-name-status'), linkStatus=q('.account-link-status'), addStatus=q('.account-add-status');
    q('.account-profile-avatar').append(avatar(user));q('.account-profile-name').textContent=user.username||user.email||'Account';
    q('.account-modal-close').onclick=close;q('[data-close]').onclick=close;
    dialog.addEventListener('click',e=>{if(e.target===dialog)close();});
    const load=async()=>{
      try{
        const [names,accounts]=await Promise.all([window.siteAuth.listUsernames(),window.siteAuth.listLinkedAccounts()]);
        const own=(accounts||[]).find(x=>x.is_current);
        q('.account-public-id').textContent=own? t.id+' · '+own.public_id:t.idLabel;
        const list=q('.account-usernames');list.replaceChildren();
        (names||[]).forEach(item=>{
          const row=document.createElement('div');row.className='account-name-row';
          const value=document.createElement('span');value.className='account-name-value';value.textContent=item.username;
          const edit=document.createElement('button');edit.type='button';edit.className='account-action';edit.textContent=t.edit;
          edit.onclick=()=>{
            const input=document.createElement('input');input.className='account-edit-input';input.value=item.username;input.maxLength=9;input.autocomplete='off';
            const save=document.createElement('button');save.type='button';save.className='account-action primary';save.textContent=t.save;
            const cancel=document.createElement('button');cancel.type='button';cancel.className='account-action';cancel.textContent=t.cancel;
            row.replaceChildren(input,save,cancel);
            cancel.onclick=()=>load();
            save.onclick=async()=>{if(!/^[A-Za-z0-9][A-Za-z0-9_-]{3,8}$/.test(input.value.trim())){status(nameStatus,t.bad);return;}save.disabled=true;try{await window.siteAuth.updateUsername(item.username,input.value.trim());status(nameStatus,t.saved);await load();}catch(e){status(nameStatus,e.message||t.error);save.disabled=false;}};
          };
          row.append(value,edit);list.append(row);
        });
        if(!names||!names.length)list.textContent='—';
        const linked=q('.account-linked');linked.replaceChildren();
        (accounts||[]).forEach(account=>{
          const row=document.createElement('div');row.className='account-switch-row';
          const detail=document.createElement('span');detail.className='account-name-value';
          const label=document.createElement('strong');label.textContent=account.username||'Account';
          const id=document.createElement('small');id.textContent=account.public_id||'';
          detail.append(label,id);row.append(detail);
          const btn=document.createElement('button');btn.type='button';btn.className='account-action'+(account.is_current?' primary':'');btn.textContent=account.is_current?t.current:t.switch;btn.disabled=!!account.is_current;
          btn.onclick=async()=>{btn.disabled=true;try{await window.siteAuth.switchAccount(account.user_id);close();}catch(e){status(linkStatus,e.message||t.missingToken);btn.disabled=false;}};
          row.append(btn);linked.append(row);
        });
        const count=(accounts||[]).length, form=q('.account-add-account');form.querySelector('button').disabled=count>=9;
        if(count>=9)status(linkStatus,t.limit);
      }catch(_){q('.account-usernames').textContent=t.failed;q('.account-linked').textContent=t.failed;}
    };
    q('.account-add-form').onsubmit=async e=>{e.preventDefault();const form=e.currentTarget, input=form.elements.username, value=input.value.trim(), btn=form.querySelector('button');if(!/^[A-Za-z0-9][A-Za-z0-9_-]{3,8}$/.test(value)){status(nameStatus,t.bad);return;}btn.disabled=true;try{await window.siteAuth.addUsername(value);input.value='';status(nameStatus,t.saved);await load();}catch(err){status(nameStatus,err.message||t.error);}finally{btn.disabled=false;}};
    q('.account-add-account').onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,btn=form.querySelector('button');btn.disabled=true;try{await window.siteAuth.linkAccount({identifier:form.elements.identifier.value.trim(),password:form.elements.password.value});form.reset();status(addStatus,t.added);await load();}catch(err){status(addStatus,err.message||t.error);}finally{btn.disabled=false;}};
    q('.account-modal-logout').onclick=()=>{const body=q('.account-modal-body');body.innerHTML=`<p>${t.confirm}</p><div class="account-modal-actions"><button class="account-action primary" type="button" data-yes>${t.yes}</button><button class="account-action" type="button" data-no>${t.no}</button></div>`;body.querySelector('[data-no]').onclick=close;body.querySelector('[data-yes]').onclick=async e=>{e.currentTarget.disabled=true;await window.siteAuth.signOut();close();};};
    const esc=e=>{if(e.key==='Escape'){close();document.removeEventListener('keydown',esc);}};document.addEventListener('keydown',esc);
    await load();
  };
  const render=user=>{
    if(user&&(user.username||user.email)){
      entry.replaceChildren(avatar(user));entry.classList.add('is-signed-in');entry.title=document.documentElement.lang==='en'?'Account options':document.documentElement.lang==='ja'?'アカウント設定':'账号选项';entry.setAttribute('aria-label',(user.username||user.email)+' account options');
    }else{close();entry.textContent='Sign in';entry.classList.remove('is-signed-in');entry.title='';entry.setAttribute('aria-label','Sign in / Sign up');}
  };
  entry.addEventListener('click',e=>{if(!entry.classList.contains('is-signed-in'))return;e.preventDefault();open(window.siteAuth.getUser()||{});});
  window.siteAuth.onChange(render);
  window.siteAuth.restore().then(render);
})();
