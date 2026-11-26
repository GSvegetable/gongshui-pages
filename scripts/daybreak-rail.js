/* Daybreak Rail — a real, section-aligned navigator for both detail scroll modes.

   The rail is a mini-map: the chapters sit evenly under the head and the sun
   slides along the track between them, following how far the panel is read.
   Clicking the logo latches the rail open so the labels stay reachable. */
(()=> {
 const panels=[...document.querySelectorAll('.work-detail')];
 if(!panels.length)return;
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const mobile=()=>matchMedia('(max-width:680px)').matches;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
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
  rail.innerHTML='<div class="db-sky" aria-hidden="true"><div class="db-stars"></div><div class="db-clouds"><i class="db-cloud"></i><i class="db-cloud"></i><i class="db-cloud"></i></div></div><div class="db-head"><button class="db-logo" type="button" aria-label="展开详情导航" aria-expanded="false">宫</button><div class="db-brand">DAYBREAK<small>WORK JOURNEY</small></div><button class="db-night-toggle" type="button" aria-label="切换夜间氛围" aria-pressed="false">☾</button></div><nav class="db-nav" aria-label="详情章节"><div class="db-track"></div><div class="db-fill"></div><button class="db-sun" type="button" aria-label="拖动太阳浏览详情" aria-keyshortcuts="ArrowUp ArrowDown"><i class="db-ring"></i><i class="db-core"></i><i class="db-rays"></i></button></nav><div class="db-foot"><div class="db-card"><div class="db-k">THE ATMOSPHERE</div><div class="db-phase">白昼 DAY</div><div class="db-meter"></div></div></div>';
  const nav=rail.querySelector('.db-nav'),sun=rail.querySelector('.db-sun'),fill=rail.querySelector('.db-fill'),track=rail.querySelector('.db-track');
  const stops=items.map((item,i)=>{
   const b=document.createElement('button');b.type='button';b.className='db-stop';b.innerHTML='<span class="db-node"></span><span class="db-label"><b></b><em></em></span>';
   b.querySelector('b').textContent=item.label;b.querySelector('em').textContent=item.eyebrow;
   b.setAttribute('aria-label','跳转到'+item.label);
   b.addEventListener('click',()=>{goTo(keys[i]);if(mobile())setOpen(false)});
   nav.appendChild(b);return b;
  });
  panel.insertBefore(rail,panel.firstChild);panel.classList.add('db-ready');
  const stars=rail.querySelector('.db-stars'),meter=rail.querySelector('.db-meter'),phase=rail.querySelector('.db-phase'),night=rail.querySelector('.db-night-toggle'),logo=rail.querySelector('.db-logo');
  let seed=19;const rand=()=>((seed=seed*16807%2147483647)-1)/2147483646;
  for(let i=0;i<24;i++){const s=document.createElement('i');s.style.left=(rand()*94+3)+'%';s.style.top=(rand()*96+2)+'%';s.style.animationDelay=(-rand()*3)+'s';stars.appendChild(s)}
  for(let i=0;i<10;i++)meter.appendChild(document.createElement('i'));
  let manualNight=false,dragging=false,pinned=false,keys=[],nodeY=[],raf=0,viewport=0,content=0,max=1;
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
  const goTo=offset=>{
   const dest=clamp(offset-18,0,max);
   if(mobile())window.scrollTo({top:panel.getBoundingClientRect().top+window.scrollY+dest,behavior:reduce.matches?'auto':'smooth'});
   else panel.scrollTo({top:dest,behavior:reduce.matches?'auto':'smooth'});
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
   const tone=manualNight||p>.68?'night':'day';rail.dataset.tone=tone;
   sun.classList.toggle('is-moon',manualNight||p>.72);
   phase.textContent=manualNight?'夜间 NIGHT':p<.34?'白昼 DAY':p<.68?'黄昏 DUSK':'夜晚 NIGHT';
   [...meter.children].forEach((el,i)=>el.classList.toggle('is-on',i<Math.max(1,Math.round((manualNight?1:p)*10))));
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
  // The logo latches the rail open. Hovering already expands it, so a plain
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
  night.addEventListener('click',()=>{manualNight=!manualNight;refresh()});
  sun.addEventListener('pointerdown',e=>{dragging=true;rail.setPointerCapture(e.pointerId);e.preventDefault()});
  sun.addEventListener('pointermove',e=>{
   if(!dragging)return;
   manualNight=false;
   const rect=nav.getBoundingClientRect();
   const f=invOf(nodeY,e.clientY-rect.top);
   goTo(lerpOf(keys,f));
  });
  const end=()=>{dragging=false};sun.addEventListener('pointerup',end);sun.addEventListener('pointercancel',end);
  sun.addEventListener('keydown',e=>{
   const d={ArrowUp:-1,ArrowLeft:-1,ArrowDown:1,ArrowRight:1}[e.key];if(!d)return;e.preventDefault();
   manualNight=false;
   const f=clamp(invOf(keys,clamp(scrollNow(),0,max))+d,0,items.length-1);
   goTo(keys[Math.round(f)]||0);
  });
  const onScroll=()=>schedule();
  panel.addEventListener('scroll',onScroll,{passive:true});window.addEventListener('scroll',onScroll,{passive:true});window.addEventListener('resize',layout,{passive:true});
  let ro;if('ResizeObserver'in window){ro=new ResizeObserver(schedule);ro.observe(panel);items.forEach(x=>ro.observe(x.target))}
  layout();
  panel._daybreakCleanup=()=>{panel.removeEventListener('scroll',onScroll);window.removeEventListener('scroll',onScroll);window.removeEventListener('resize',layout);ro?.disconnect()};
 };
 const observer=new MutationObserver(()=>panels.forEach(panel=>{if(panel.classList.contains('is-active'))build(panel)}));
 panels.forEach(panel=>{if(panel.classList.contains('is-active'))build(panel)});
 observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});
})();
