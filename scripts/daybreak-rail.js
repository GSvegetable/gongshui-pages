/* Daybreak Rail — a real, section-aligned navigator for both detail scroll modes.

   The rail is a mini-map: the chapters sit evenly under the head and the sun
   slides along the track between them, following how far the panel is read.
   Clicking the arrow latches the rail open so the labels stay reachable.

   Day / night: the atmosphere follows the chapter position, not the raw scroll
   percentage. The turn starts one chapter before the middle node and completes
   exactly on it, so the sun becomes the moon and the sky turns over in one
   continuous move — never in two steps. */
(()=> {
 const panels=[...document.querySelectorAll('.work-detail')];
 if(!panels.length)return;
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const mobile=()=>matchMedia('(max-width:680px)').matches;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const hex2rgb=h=>{h=h.trim().replace('#','');return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]};
 const mixRgb=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
 const css=c=>`rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
 const chans=c=>`${Math.round(c[0])} ${Math.round(c[1])} ${Math.round(c[2])}`;
 const mixCss=(a,b,t)=>css(mixRgb(hex2rgb(a),hex2rgb(b),t));
 const mixChans=(a,b,t)=>chans(mixRgb(hex2rgb(a),hex2rgb(b),t));
 const mixCssA=(a,b,t,alpha)=>{
  const c=mixRgb(hex2rgb(a),hex2rgb(b),t);
  return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${alpha})`;
 };
 // 日 ↔ 夜 的两套配色。天空三层、圆盘三层都逐层插值，所以切换是渐变而不是跳变。
 const TONE={
  ink:['#292b30','#f2eee4'],
  paper:['#f4efe3','#2b2e46'],
  sky:[['#cfe6ef','#171d33'],['#f2c98a','#2b2a45'],['#f0a04b','#5a465b']],
  core:[['#fff3c4','#fbf6e6'],['#ffd35c','#f3ebd2'],['#ef9c2a','#dfd3b4']],
  ray:['#f9d06a','#8d7f5a'],
  halo:['#ffd98a','#6b6ea8'],
  card:['#ffffff','#1b2038']
 };
 const getItems=panel=>{
  const items=[];
  const add=(target,label,eyebrow)=>{
   if(!target||items.some(x=>x.target===target))return;
   items.push({target,label,eyebrow});
  };
  const overview=panel.querySelector(':scope > .detail-overview');
  if(overview)add(overview,'作品概览','OVERVIEW');
  // Every remaining stop is derived from the actual H2 in the page.
  // This prevents hand-written labels drifting away from the content.
  panel.querySelectorAll('h2').forEach(h=>{
   const target=h.closest('.gallery-heading')||h.closest('.embed-snippet')||h.closest('.detail-feature')||h;
   const label=h.textContent.trim();
   if(label)add(target,label,'CHAPTER');
  });
  if(!items.length)add(panel.querySelector('.detail-copy')||panel,'作品概览','OVERVIEW');
  items.forEach((item,i)=>{
   item.eyebrow=String(i+1).padStart(2,'0')+' / '+(i===0?'START':i===items.length-1?'END':'CHAPTER');
  });
  return items;
 };
 const build=panel=>{
  if(panel.querySelector(':scope > .db-rail'))return;
  const items=getItems(panel);
  const rail=document.createElement('aside');
  rail.className='db-rail';rail.setAttribute('aria-label','作品详情导航');
  rail.innerHTML='<div class="db-sky" aria-hidden="true"><div class="db-stars"></div><div class="db-clouds"><i class="db-cloud"></i><i class="db-cloud"></i><i class="db-cloud"></i></div></div>'+
   '<div class="db-head">'+
    '<button class="db-logo" type="button" aria-label="展开详情导航" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7"/></svg></button>'+
    '<div class="db-brand">DAYBREAK<small>WORK JOURNEY</small></div>'+
    '<button class="db-night-toggle" type="button" aria-label="切换夜间氛围" aria-pressed="false">☾</button>'+
   '</div>'+
   '<nav class="db-nav" aria-label="详情章节"><div class="db-track"></div><div class="db-fill"></div>'+
    '<button class="db-sun" type="button" aria-label="拖动太阳浏览详情" aria-keyshortcuts="ArrowUp ArrowDown">'+
     '<i class="db-halo"></i><i class="db-rays"></i><i class="db-rays-b"></i><i class="db-ring"></i><i class="db-core"></i>'+
    '</button>'+
   '</nav>'+
   '<div class="db-foot"><div class="db-card">'+
    '<div class="db-k">当前氛围 ATMOSPHERE</div>'+
    '<div class="db-phase">白昼 DAY</div>'+
    '<div class="db-meter" role="progressbar" aria-label="详情阅读进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"></div>'+
    '<div class="db-pct">已读 0%</div>'+
   '</div></div>';
  const nav=rail.querySelector('.db-nav'),sun=rail.querySelector('.db-sun'),fill=rail.querySelector('.db-fill'),track=rail.querySelector('.db-track');
  const stops=items.map((item,i)=>{
   const b=document.createElement('button');b.type='button';b.className='db-stop';b.innerHTML='<span class="db-node"></span><span class="db-label"><b></b><em></em></span>';
   b.querySelector('b').textContent=item.label;b.querySelector('em').textContent=item.eyebrow;
   b.setAttribute('aria-label','跳转到'+item.label);
   b.addEventListener('click',()=>{goTo(keys[i]);if(mobile())setOpen(false)});
   nav.appendChild(b);return b;
  });
  panel.insertBefore(rail,panel.firstChild);panel.classList.add('db-ready');
  const stars=rail.querySelector('.db-stars'),meter=rail.querySelector('.db-meter'),phase=rail.querySelector('.db-phase'),
        pctEl=rail.querySelector('.db-pct'),night=rail.querySelector('.db-night-toggle'),logo=rail.querySelector('.db-logo');
  let seed=19;const rand=()=>((seed=seed*16807%2147483647)-1)/2147483646;
  for(let i=0;i<24;i++){const s=document.createElement('i');s.style.left=(rand()*94+3)+'%';s.style.top=(rand()*96+2)+'%';s.style.animationDelay=(-rand()*3)+'s';stars.appendChild(s)}
  for(let i=0;i<10;i++)meter.appendChild(document.createElement('i'));
  let manualNight=false,manualMix=0,mixRaf=0,dragging=false,pinned=false,keys=[],nodeY=[],raf=0,viewport=0,content=0,max=1;
  const scrollNow=()=>mobile()?Math.max(0,window.scrollY-(panel.getBoundingClientRect().top+window.scrollY)):panel.scrollTop;
  const offsetOf=target=>mobile()?target.getBoundingClientRect().top-panel.getBoundingClientRect().top:target.getBoundingClientRect().top-panel.getBoundingClientRect().top+panel.scrollTop;
  const measure=()=>{
   viewport=mobile()?window.innerHeight:panel.clientHeight;
   content=panel.scrollHeight;
   max=Math.max(1,content-viewport);
   // 每一章对应一个滚动位置：这一章的内容刚落到阅读线时的滚动量。
   // 首尾钉死在两端，滚到底必定抵达最后一章，中间保持严格递增。
   const at=items.map(item=>clamp(offsetOf(item.target)-viewport*.5,0,max));
   at[0]=0;at[at.length-1]=max;
   for(let i=1;i<at.length-1;i++)at[i]=clamp(at[i],at[i-1]+1,max-1);
   keys=at;
  };
  // Where the chapters sit inside the rail, measured from the real layout.
  const measureNodes=()=>{nodeY=stops.map(s=>s.offsetTop+s.offsetHeight/2)};
  // Content position → fractional chapter index, and back.
  const invOf=(arr,v)=>{
   if(arr.length<2)return 0;
   if(v<=arr[0])return 0;
   for(let i=arr.length-2;i>=0;i--)if(v>=arr[i])return Math.min(arr.length-1,i+(v-arr[i])/Math.max(1,arr[i+1]-arr[i]));
   return 0;
  };
  const lerpOf=(arr,f)=>{
   if(arr.length<2)return arr[0]||0;
   const i=Math.max(0,Math.min(arr.length-2,Math.floor(f)));
   return arr[i]+(f-i)*(arr[i+1]-arr[i]);
  };
  // 中间那个节点：5 章时是第 3 个，4 章时同样是第 3 个。
  const midIndex=()=>Math.round((items.length-1)/2);
  const goTo=offset=>{
   const dest=clamp(offset-18,0,max);
   if(mobile())window.scrollTo({top:panel.getBoundingClientRect().top+window.scrollY+dest,behavior:reduce.matches?'auto':'smooth'});
   else panel.scrollTo({top:dest,behavior:reduce.matches?'auto':'smooth'});
  };
  // 昼夜：k 是"夜"的强度，0 = 白天，1 = 满月。
  // 走到中间那个节点时 k 正好等于 1，再往前一章开始渐变 —— 丝滑，不跳。
  const applyTone=k=>{
   k=clamp(k,0,1);
   rail.style.setProperty('--db-night',k.toFixed(3));
   rail.style.setProperty('--db-ink',mixCss(TONE.ink[0],TONE.ink[1],k));
   rail.style.setProperty('--db-paper',mixCss(TONE.paper[0],TONE.paper[1],k));
   TONE.sky.forEach((p,i)=>rail.style.setProperty('--db-sky-'+(i+1),mixCss(p[0],p[1],k)));
   TONE.core.forEach((p,i)=>rail.style.setProperty('--db-core-'+(i+1),mixCss(p[0],p[1],k)));
   rail.style.setProperty('--db-ray',mixCss(TONE.ray[0],TONE.ray[1],k));
   rail.style.setProperty('--db-halo-rgb',mixChans(TONE.halo[0],TONE.halo[1],k));
   rail.style.setProperty('--db-card-bg',mixCssA(TONE.card[0],TONE.card[1],k,.48));
   rail.dataset.tone=k>=.5?'night':'day';
  };
  const refresh=()=>{
   const scroll=clamp(scrollNow(),0,max),p=scroll/max;
   measureNodes();
   // The sun rides the track: reading position maps onto the chapter list.
   const f=invOf(keys,scroll);
   const y=lerpOf(nodeY,f);
   sun.style.top=y+'px';sun.style.transform='translateY(-50%)';
   const first=nodeY[0]||0,last=nodeY[nodeY.length-1]||first,span=Math.max(1,last-first);
   track.style.top=first+'px';track.style.height=span+'px';
   fill.style.top=first+'px';fill.style.height=span+'px';
   fill.style.transform='scaleY('+clamp((y-first)/span,0,1)+')';
   const active=clamp(Math.round(f),0,items.length-1);
   stops.forEach((stop,i)=>{
    stop.classList.toggle('is-current',i===active);
    stop.classList.toggle('is-past',i<=active);
    stop.setAttribute('aria-current',i===active?'location':'false');
   });
   // 走到中间那个节点 = 满月 + 夜空；再往前一章就开始渐变。
   const mid=midIndex();
   const k=Math.max(clamp(f-(mid-1),0,1),manualMix);
   applyTone(k);
   phase.textContent=k>=.9?'夜晚 NIGHT':k>.02?'黄昏 DUSK':'白昼 DAY';
   const pct=Math.round(p*100);
   [...meter.children].forEach((el,i)=>el.classList.toggle('is-on',i<Math.round(p*10)));
   meter.setAttribute('aria-valuenow',String(pct));
   pctEl.textContent='已读 '+pct+'%';
   night.setAttribute('aria-pressed',String(manualNight));
  };
  const schedule=()=>{if(!raf)raf=requestAnimationFrame(()=>{raf=0;measure();refresh()})};
  const layout=()=>{measure();refresh()};
  const setOpen=value=>{
   rail.classList.toggle('is-open',value);
   rail.classList.toggle('is-pinned',pinned&&value);
   logo.setAttribute('aria-expanded',String(value));
   logo.setAttribute('aria-label',value?'收起详情导航':'展开详情导航');
  };
  // The arrow latches the rail open. Hovering already expands it, so a plain
  // toggle would immediately close it again — clicking has to pin it instead.
  logo.addEventListener('click',()=>{
   pinned=!pinned;
   setOpen(pinned?true:false);
  });
  rail.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'&&!pinned)setOpen(true)});
  rail.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'&&!pinned&&!dragging)setOpen(false)});
  document.addEventListener('pointerdown',e=>{
   if(pinned&&!rail.contains(e.target)){pinned=false;setOpen(false)}
  });
  // 手动夜晚是一段渐变，不做硬切。
  const setManualNight=v=>{
   manualNight=v;
   const from=manualMix,to=v?1:0,t0=performance.now(),dur=reduce.matches?1:420;
   cancelAnimationFrame(mixRaf);
   const step=now=>{
    const t=Math.min(1,(now-t0)/dur);
    manualMix=from+(to-from)*(1-Math.pow(1-t,3));
    refresh();
    if(t<1)mixRaf=requestAnimationFrame(step);else mixRaf=0;
   };
   mixRaf=requestAnimationFrame(step);
  };
  night.addEventListener('click',()=>setManualNight(!manualNight));
  sun.addEventListener('pointerdown',e=>{dragging=true;rail.setPointerCapture(e.pointerId);e.preventDefault()});
  sun.addEventListener('pointermove',e=>{
   if(!dragging)return;
   // 手动夜景下拖动太阳 = 交还给阅读进度，渐变回当前章节该有的天色。
   if(manualNight)setManualNight(false);
   const rect=nav.getBoundingClientRect();
   const f=invOf(nodeY,e.clientY-rect.top);
   goTo(lerpOf(keys,f));
  });
  const end=()=>{dragging=false};sun.addEventListener('pointerup',end);sun.addEventListener('pointercancel',end);
  sun.addEventListener('keydown',e=>{
   const d={ArrowUp:-1,ArrowLeft:-1,ArrowDown:1,ArrowRight:1}[e.key];if(!d)return;e.preventDefault();
   if(manualNight)setManualNight(false);
   const f=clamp(invOf(keys,clamp(scrollNow(),0,max))+d,0,items.length-1);
   goTo(keys[Math.round(f)]||0);
  });
  const onScroll=()=>schedule();
  panel.addEventListener('scroll',onScroll,{passive:true});window.addEventListener('scroll',onScroll,{passive:true});window.addEventListener('resize',layout,{passive:true});
  let ro;if('ResizeObserver'in window){ro=new ResizeObserver(schedule);ro.observe(panel);items.forEach(x=>ro.observe(x.target))}
  applyTone(0);
  layout();
  panel._daybreakCleanup=()=>{panel.removeEventListener('scroll',onScroll);window.removeEventListener('scroll',onScroll);window.removeEventListener('resize',layout);ro?.disconnect()};
 };
 const observer=new MutationObserver(()=>panels.forEach(panel=>{if(panel.classList.contains('is-active'))build(panel)}));
 panels.forEach(panel=>{if(panel.classList.contains('is-active'))build(panel)});
 observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});
})();
