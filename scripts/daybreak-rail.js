/* Daybreak Rail — each rail belongs to one active work-detail scroll surface. */
(()=> {
 const panels=[...document.querySelectorAll('.work-detail')];
 if(!panels.length)return;
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const mobile=()=>matchMedia('(max-width:680px)').matches;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const labelsFor=panel=>{
  const items=[];
  const add=(target,label,eyebrow)=>{
   if(!target||items.some(x=>x.target===target))return;
   items.push({target,label,eyebrow});
  };
  panel.querySelectorAll(':scope > .detail-overview').forEach(el=>add(el,'作品概览','OVERVIEW'));
  panel.querySelectorAll(':scope > .gallery-heading').forEach(el=>{
   const title=el.querySelector('h2')?.textContent?.trim()||'作品细节';
   add(el,title,'DISCOVER');
  });
  panel.querySelectorAll(':scope > .detail-feature').forEach(el=>{
   const title=el.querySelector('h2')?.textContent?.trim()||'交互体验';
   add(el,title,'EXPERIENCE');
  });
  panel.querySelectorAll(':scope > .embed-snippet').forEach(el=>{
   const title=el.querySelector('h2')?.textContent?.trim()||'嵌入方式';
   add(el,title,'INTEGRATION');
  });
  if(!items.length)add(panel.querySelector('.detail-copy')||panel,'作品概览','OVERVIEW');
  return items;
 };
 const build=panel=>{
  if(panel.querySelector(':scope > .db-rail'))return;
  const items=labelsFor(panel);
  items.forEach((item,i)=>{
   if(!item.target.id)item.target.id='db-section-'+Math.random().toString(36).slice(2,9);
  });
  const rail=document.createElement('aside');
  rail.className='db-rail';rail.setAttribute('aria-label','作品详情导航');
  rail.innerHTML='<div class="db-sky" aria-hidden="true"><div class="db-stars"></div><div class="db-clouds"><i class="db-cloud"></i><i class="db-cloud"></i><i class="db-cloud"></i></div></div><div class="db-head"><button class="db-logo" type="button" aria-label="展开详情导航" aria-expanded="false">☀</button><div class="db-brand">DAYBREAK<small>WORK JOURNEY</small></div><button class="db-night-toggle" type="button" aria-label="切换夜间氛围" aria-pressed="false">☾</button></div><nav class="db-nav" aria-label="详情章节"><div class="db-track"></div><div class="db-fill"></div><button class="db-sun" type="button" aria-label="拖动太阳浏览详情" aria-keyshortcuts="ArrowUp ArrowDown"><i class="db-ring"></i><i class="db-core"></i><i class="db-rays"></i></button></nav><div class="db-foot"><div class="db-card"><div class="db-k">THE ATMOSPHERE</div><div class="db-phase">白昼 DAY</div><div class="db-meter"></div></div></div>';
  const nav=rail.querySelector('.db-nav'),sun=rail.querySelector('.db-sun'),fill=rail.querySelector('.db-fill'),track=rail.querySelector('.db-track');
  const stops=items.map((item,i)=>{
   const b=document.createElement('button');b.type='button';b.className='db-stop';b.style.setProperty('--stop-index',i);
   b.innerHTML='<span class="db-node"></span><span class="db-label"><b></b><em></em></span>';
   b.querySelector('b').textContent=item.label;b.querySelector('em').textContent=item.eyebrow;
   b.setAttribute('aria-label','跳转到'+item.label);b.addEventListener('click',()=>{item.target.scrollIntoView({behavior:reduce.matches?'auto':'smooth',block:'start'});if(mobile())setOpen(false)});
   nav.appendChild(b);return b;
  });
  panel.insertBefore(rail,panel.firstChild);panel.classList.add('db-ready');
  const stars=rail.querySelector('.db-stars'),meter=rail.querySelector('.db-meter'),phase=rail.querySelector('.db-phase'),night=rail.querySelector('.db-night-toggle'),logo=rail.querySelector('.db-logo');
  let seed=19;const rand=()=>((seed=seed*16807%2147483647)-1)/2147483646;
  for(let i=0;i<24;i++){const s=document.createElement('i');s.style.left=(rand()*94+3)+'%';s.style.top=(rand()*96+2)+'%';s.style.animationDelay=(-rand()*3)+'s';stars.appendChild(s)}
  for(let i=0;i<10;i++)meter.appendChild(document.createElement('i'));
  let manualNight=false,dragging=false,centers=[],raf=0;
  const scroller=()=>mobile()?window:panel;
  const maxScroll=()=>mobile()?Math.max(1,document.documentElement.scrollHeight-innerHeight):Math.max(1,panel.scrollHeight-panel.clientHeight);
  const currentScroll=()=>mobile()?window.scrollY:panel.scrollTop;
  const offsetOf=target=>{
   if(mobile())return target.getBoundingClientRect().top+window.scrollY;
   return target.getBoundingClientRect().top-panel.getBoundingClientRect().top+panel.scrollTop;
  };
  const refresh=()=>{
   const p=clamp(currentScroll()/maxScroll(),0,1),tone=manualNight||p>.68?'night':'day';
   rail.dataset.tone=tone;
   const first=centers[0]||30,last=centers[centers.length-1]||first+1,y=first+(last-first)*p;
   sun.style.transform='translateY('+(y-17)+'px)';fill.style.transform='scaleY('+p+')';
   sun.classList.toggle('is-moon',manualNight||p>.72);
   stops.forEach((stop,i)=>{const active=i===items.reduce((best,item,index)=>offsetOf(item.target)<=currentScroll()+(mobile()?innerHeight*.32:panel.clientHeight*.32)?index:best,0);stop.classList.toggle('is-current',i===active);stop.classList.toggle('is-past',i<=active)});
   const label=manualNight?'夜间 NIGHT':p<.34?'白昼 DAY':p<.68?'黄昏 DUSK':'夜晚 NIGHT';
   phase.textContent=label;[...meter.children].forEach((el,i)=>el.classList.toggle('is-on',i<Math.max(1,Math.round((manualNight?1:p)*10))));
   night.setAttribute('aria-pressed',String(manualNight));
  };
  const schedule=()=>{if(!raf)raf=requestAnimationFrame(()=>{raf=0;refresh()})};
  const layout=()=>{
   const nr=nav.getBoundingClientRect();centers=stops.map(el=>{const r=el.getBoundingClientRect();return r.top-nr.top+r.height/2});
   const first=centers[0]||30,last=centers[centers.length-1]||first+1;track.style.top=fill.style.top=first+'px';track.style.height=fill.style.height=Math.max(1,last-first)+'px';refresh();
  };
  const setOpen=value=>{rail.classList.toggle('is-open',value);logo.setAttribute('aria-expanded',String(value));logo.setAttribute('aria-label',value?'收起详情导航':'展开详情导航')};
  logo.addEventListener('click',()=>setOpen(!rail.classList.contains('is-open')));
  rail.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')setOpen(true)});
  rail.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'&&!dragging)setOpen(false)});
  panel.addEventListener('pointerdown',e=>{if(!rail.contains(e.target))setOpen(false)});
  night.addEventListener('click',()=>{manualNight=!manualNight;refresh()});
  const setScroll=p=>{
   const target=clamp(p,0,1)*maxScroll();
   if(mobile())window.scrollTo({top:target,behavior:reduce.matches?'auto':'instant'});
   else panel.scrollTo({top:target,behavior:'instant'});
   refresh();
  };
  const pointFromY=y=>{const rect=nav.getBoundingClientRect(),first=centers[0]||30,last=centers[centers.length-1]||first+1;return clamp((y-rect.top-first)/(last-first),0,1)};
  sun.addEventListener('pointerdown',e=>{dragging=true;rail.setPointerCapture(e.pointerId);e.preventDefault()});
  sun.addEventListener('pointermove',e=>{if(dragging){manualNight=false;setScroll(pointFromY(e.clientY))}});
  const end=()=>{dragging=false};sun.addEventListener('pointerup',end);sun.addEventListener('pointercancel',end);
  sun.addEventListener('keydown',e=>{const d={ArrowUp:-1,ArrowLeft:-1,ArrowDown:1,ArrowRight:1}[e.key];if(!d)return;e.preventDefault();manualNight=false;setScroll(clamp(currentScroll()+d*maxScroll()/Math.max(2,items.length),0,maxScroll())/maxScroll())});
  const onScroll=()=>schedule();
  panel.addEventListener('scroll',onScroll,{passive:true});window.addEventListener('scroll',onScroll,{passive:true});
  window.addEventListener('resize',layout,{passive:true});if('ResizeObserver'in window){const ro=new ResizeObserver(layout);ro.observe(panel)}
  layout();panel._daybreakCleanup=()=>{panel.removeEventListener('scroll',onScroll);window.removeEventListener('scroll',onScroll);window.removeEventListener('resize',layout)};
 };
 const observer=new MutationObserver(()=>panels.forEach(panel=>{if(panel.classList.contains('is-active'))build(panel)}));
 panels.forEach(panel=>{if(panel.classList.contains('is-active'))build(panel)});
 observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});
})();