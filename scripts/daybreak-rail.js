/* Daybreak Rail — scroll-linked day/night navigation */
(()=>{
  const rail=document.getElementById('daybreak-rail');
  if(!rail||rail.dataset.ready==='true')return;
  rail.dataset.ready='true';
  const nav=rail.querySelector('.db-nav'),sun=rail.querySelector('.db-sun'),
    fill=rail.querySelector('.db-fill'),track=rail.querySelector('.db-track'),
    phase=rail.querySelector('.db-phase'),meter=rail.querySelector('.db-meter'),
    stars=rail.querySelector('.db-stars'),logo=rail.querySelector('.db-logo'),
    nightToggle=rail.querySelector('.db-night-toggle'),
    stops=[...rail.querySelectorAll('[data-db-stop]')];
  let seed=19;const random=()=>((seed=seed*16807%2147483647)-1)/2147483646;
  for(let i=0;i<26;i++){
    const star=document.createElement('i');
    star.style.left=(random()*94+3)+'%';star.style.top=(random()*96+2)+'%';
    star.style.animationDelay=(-random()*3).toFixed(2)+'s';
    if(random()>.76)star.style.width=star.style.height='5px';
    stars.appendChild(star);
  }
  for(let i=0;i<10;i++)meter.appendChild(document.createElement('i'));
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const mix=(a,b,t)=>a.map((v,i)=>Math.round(v+(b[i]-v)*t));
  const colors=[[221,236,240],[240,160,75],[24,27,46]];
  const sky=p=>p<.55?mix(colors[0],colors[1],p/.55):mix(colors[1],colors[2],(p-.55)/.45);
  const smooth=(a,b,x)=>{x=clamp((x-a)/(b-a),0,1);return x*x*(3-2*x)};
  let centers=[],maxScroll=1,manualNight=false,dragging=false,raf=0;
  const layout=()=>{
    const nr=nav.getBoundingClientRect();
    centers=stops.map(el=>{const r=el.getBoundingClientRect();return r.top-nr.top+r.height/2});
    const first=centers[0]||30,last=centers[centers.length-1]||first+1;
    track.style.top=fill.style.top=first+'px';
    track.style.height=fill.style.height=Math.max(1,last-first)+'px';
    maxScroll=Math.max(1,document.documentElement.scrollHeight-innerHeight);
    render();
  };
  const render=()=>{
    raf=0;
    const p=clamp(scrollY/maxScroll,0,1),tone=manualNight||p>.67?'night':'day';
    rail.dataset.tone=tone;
    const point=sky(p),next=sky(clamp(p+.25,0,1));
    rail.style.background='linear-gradient(180deg,rgb('+point.join(',')+') 0%,rgb('+next.join(',')+') 100%)';
    const progress=smooth(.48,.96,p);
    rail.style.setProperty('--db-night',progress.toFixed(3));
    const first=centers[0]||30,last=centers[centers.length-1]||first+1;
    const y=first+(last-first)*p;
    sun.style.transform='translateY('+(y-17)+'px)';
    fill.style.transform='scaleY('+p+')';
    const moon=manualNight||p>.72;
    sun.classList.toggle('is-moon',moon);
    stops.forEach((el,i)=>{
      const active=el.dataset.dbStop==='entry'?p<.12:el.dataset.dbStop==='works'?p>=.12&&p<.68:false;
      el.classList.toggle('is-current',active);
      el.classList.toggle('is-past',centers[i]<=y+2);
    });
    const label=manualNight?'夜间 NIGHT':p<.34?'白昼 DAY':p<.68?'黄昏 DUSK':'夜晚 NIGHT';
    if(phase.textContent!==label)phase.textContent=label;
    [...meter.children].forEach((el,i)=>el.classList.toggle('is-on',i<Math.max(1,Math.round((manualNight?1:p)*10))));
    nightToggle.setAttribute('aria-pressed',String(manualNight));
    nightToggle.setAttribute('aria-label',manualNight?'切换回自动昼夜':'切换夜间氛围');
  };
  const schedule=()=>{if(!raf)raf=requestAnimationFrame(render)};
  const scrollToTarget=selector=>{
    const target=document.querySelector(selector);
    if(target)target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
  };
  const setOpen=value=>{
    rail.classList.toggle('is-open',value);
    logo.setAttribute('aria-expanded',String(value));
  };
  logo.addEventListener('click',()=>setOpen(!rail.classList.contains('is-open')));
  rail.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')setOpen(true)});
  rail.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'&&!dragging)setOpen(false)});
  document.addEventListener('pointerdown',e=>{if(!rail.contains(e.target))setOpen(false)});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')setOpen(false)});
  stops.forEach(stop=>{
    stop.addEventListener('click',e=>{
      const href=stop.getAttribute('href');
      if(href&&href.startsWith('#')){e.preventDefault();scrollToTarget(href)}
      if(matchMedia('(hover:none)').matches)setOpen(false);
    });
  });
  nightToggle.addEventListener('click',()=>{manualNight=!manualNight;render()});
  const pointFromY=y=>{
    const rect=nav.getBoundingClientRect(),first=centers[0]||30,last=centers[centers.length-1]||first+1;
    return clamp((y-rect.top-first)/(last-first),0,1);
  };
  sun.addEventListener('pointerdown',e=>{
    dragging=true;rail.classList.add('is-dragging');sun.setPointerCapture(e.pointerId);e.preventDefault();
  });
  sun.addEventListener('pointermove',e=>{
    if(!dragging)return;
    const p=pointFromY(e.clientY),top=p*maxScroll;
    manualNight=false;window.scrollTo({top,behavior:'instant'});render();
  });
  const endDrag=()=>{if(!dragging)return;dragging=false;rail.classList.remove('is-dragging');layout()};
  sun.addEventListener('pointerup',endDrag);
  sun.addEventListener('pointercancel',endDrag);
  sun.addEventListener('keydown',e=>{
    const direction={ArrowUp:-1,ArrowLeft:-1,ArrowDown:1,ArrowRight:1}[e.key];
    if(!direction)return;e.preventDefault();
    manualNight=false;
    window.scrollTo({top:clamp(scrollY+direction*maxScroll/4,0,maxScroll),behavior:'smooth'});
  });
  let resizeTimer=0;
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(layout,100)},{passive:true});
  window.addEventListener('load',layout,{once:true});
  if('ResizeObserver'in window){const observer=new ResizeObserver(()=>{maxScroll=Math.max(1,document.documentElement.scrollHeight-innerHeight);schedule()});observer.observe(document.body)}
  layout();
})();
