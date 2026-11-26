/* Daybreak Rail — a real, section-aligned navigator for both detail scroll modes. */
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
   b.addEventListener('click',()=>{goTo(offsetOf(item.target));if(mobile())setOpen(false)});
   nav.appendChild(b);return b;
  });
  panel.insertBefore(rail,panel.firstChild);panel.classList.add('db-ready');
  const stars=rail.querySelector('.db-stars'),meter=rail.querySelector('.db-meter'),phase=rail.querySelector('.db-phase'),night=rail.querySelector('.db-night-toggle'),logo=rail.querySelector('.db-logo');
  let seed=19;const rand=()=>((seed=seed*16807%2147483647)-1)/2147483646;
  for(let i=0;i<24;i++){const s=document.createElement('i');s.style.left=(rand()*94+3)+'%';s.style.top=(rand()*96+2)+'%';s.style.animationDelay=(-rand()*3)+'s';stars.appendChild(s)}
  for(let i=0;i<10;i++)meter.appendChild(document.createElement('i'));
  let manualNight=false,dragging=false,offsets=[],raf=0,viewport=0,content=0,max=1;
  const scrollNow=()=>mobile()?Math.max(0,window.scrollY-(panel.getBoundingClientRect().top+window.scrollY)):panel.scrollTop;
  const offsetOf=target=>mobile()?target.getBoundingClientRect().top-panel.getBoundingClientRect().top:target.getBoundingClientRect().top-panel.getBoundingClientRect().top+panel.scrollTop;
  const measure=()=>{
   viewport=mobile()?window.innerHeight:panel.clientHeight;
   content=panel.scrollHeight;
   max=Math.max(1,content-viewport);
   offsets=items.map(item=>clamp(offsetOf(item.target),0,content));
  };
  const goTo=offset=>{
   const dest=clamp(offset-18,0,max);
   if(mobile())window.scrollTo({top:panel.getBoundingClientRect().top+window.scrollY+dest,behavior:reduce.matches?'auto':'smooth'});
   else panel.scrollTo({top:dest,behavior:reduce.matches?'auto':'smooth'});
  };
  const refresh=()=>{
   const scroll=clamp(scrollNow(),0,max),p=scroll/max;
   const first=offsets[0]||0,last=offsets[offsets.length-1]||content;
   // The rail stays viewport-height; its long chapter map moves underneath it
   // by the exact same amount as the content panel.
   nav.style.height=Math.max(content,viewport)+'px';
   nav.style.transform='translate3d(0,'+(-scroll)+'px,0)';
   const sunY=scroll+viewport*.43;
   sun.style.top=sunY+'px';sun.style.transform='translateY(-50%)';
   track.style.top=first+'px';track.style.height=Math.max(1,last-first)+'px';
   fill.style.top=first+'px';fill.style.height=Math.max(1,last-first)+'px';
   fill.style.transform='scaleY('+clamp((scroll-first)/Math.max(1,last-first),0,1)+')';
   const threshold=scroll+viewport*.34;
   let active=0;offsets.forEach((o,i)=>{if(o<=threshold)active=i});
   stops.forEach((stop,i)=>{stop.style.top=offsets[i]+'px';stop.style.transform='translateY(-50%)';stop.classList.toggle('is-current',i===active);stop.classList.toggle('is-past',i<=active);stop.setAttribute('aria-current',i===active?'location':'false')});
   const tone=manualNight||p>.68?'night':'day';rail.dataset.tone=tone;
   sun.classList.toggle('is-moon',manualNight||p>.72);
   phase.textContent=manualNight?'夜间 NIGHT':p<.34?'白昼 DAY':p<.68?'黄昏 DUSK':'夜晚 NIGHT';
   [...meter.children].forEach((el,i)=>el.classList.toggle('is-on',i<Math.max(1,Math.round((manualNight?1:p)*10))));
   night.setAttribute('aria-pressed',String(manualNight));
  };
  const schedule=()=>{if(!raf)raf=requestAnimationFrame(()=>{raf=0;measure();refresh()})};
  const layout=()=>{measure();refresh()};
  const setOpen=value=>{rail.classList.toggle('is-open',value);logo.setAttribute('aria-expanded',String(value));logo.setAttribute('aria-label',value?'收起详情导航':'展开详情导航')};
  logo.addEventListener('click',()=>setOpen(!rail.classList.contains('is-open')));
  rail.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')setOpen(true)});
  rail.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'&&!dragging)setOpen(false)});
  night.addEventListener('click',()=>{manualNight=!manualNight;refresh()});
  const pointFromY=y=>{
   const rect=nav.getBoundingClientRect();
   const docY=y-rect.top+scrollNow();
   return clamp(docY,0,content);
  };
  sun.addEventListener('pointerdown',e=>{dragging=true;rail.setPointerCapture(e.pointerId);e.preventDefault()});
  sun.addEventListener('pointermove',e=>{if(dragging){manualNight=false;goTo(pointFromY(e.clientY))}});
  const end=()=>{dragging=false};sun.addEventListener('pointerup',end);sun.addEventListener('pointercancel',end);
  sun.addEventListener('keydown',e=>{const d={ArrowUp:-1,ArrowLeft:-1,ArrowDown:1,ArrowRight:1}[e.key];if(!d)return;e.preventDefault();manualNight=false;goTo(scrollNow()+d*max/Math.max(2,items.length))});
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