// HOME.JS

function initHome(){
  const bg=document.getElementById('home-bg');
  const credit=document.getElementById('home-credit');
  const photos=[
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80',
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=80',
    'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1920&q=80',
    'https://images.unsplash.com/photo-1506773090264-ac0b07293a64?w=1920&q=80',
    'https://images.unsplash.com/photo-1476673160081-cf065607f449?w=1920&q=80',
    'https://images.unsplash.com/photo-1470770903676-69b98201ea1c?w=1920&q=80',
    'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1920&q=80',
    'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=1920&q=80',
    'https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?w=1920&q=80',
    'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=1920&q=80',
    'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=1920&q=80',
    'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=1920&q=80',
    'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1920&q=80',
    'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=1920&q=80',
    'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1920&q=80',
    'https://images.unsplash.com/photo-1455156218388-5e61b526818b?w=1920&q=80',
    'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=1920&q=80',
    'https://images.unsplash.com/photo-1520962880247-cfaf541c8724?w=1920&q=80',
    'https://images.unsplash.com/photo-1511884642898-4c92249e20b6?w=1920&q=80',
    'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1920&q=80',
    'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1920&q=80',
    'https://images.unsplash.com/photo-1502899576159-f224dc2349fa?w=1920&q=80',
    'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1920&q=80',
    'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1920&q=80',
    'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=1920&q=80',
    'https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=1920&q=80',
    'https://images.unsplash.com/photo-1540390769625-2fc3f8b1d50c?w=1920&q=80',
    'https://images.unsplash.com/photo-1542224566-6e85f2e6772f?w=1920&q=80',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80',
    'https://images.unsplash.com/photo-1546514714-df0ccc50d7bf?w=1920&q=80',
  ];
  let seen=[];
  try{seen=JSON.parse(localStorage.getItem('gn_seen_photos')||'[]')}catch(e){}
  if(seen.length>=photos.length)seen=[];
  const remaining=photos.map((_,i)=>i).filter(i=>!seen.includes(i));
  const idx=remaining[Math.floor(Math.random()*remaining.length)];
  seen.push(idx);
  localStorage.setItem('gn_seen_photos',JSON.stringify(seen));
  if(bg) bg.style.backgroundImage=`url('${photos[idx]}')`;
  if(credit) credit.textContent='';
}


function renderHomeWidgets(){
  const today=todayStr();
  // Todos
  const tb=document.getElementById('hw-todos-body');
  if(tb){
    const todos=getTodos()[today]||[];
    const items=todos.slice(0,5).map((t,i)=>`
      <div class="hw-item" style="justify-content:space-between">
        <div style="display:flex;align-items:center;gap:6px;cursor:pointer;flex:1" onclick="event.stopPropagation();hwTodoToggle('${today}',${i})">
          <div class="hw-check${t.done?' done':''}"></div>
          <span style="text-decoration:${t.done?'line-through':'none'};opacity:${t.done?.5:1};font-size:11px">${esc(t.text)}</span>
        </div>
        <button onclick="event.stopPropagation();hwTodoEdit('${today}',${i})" style="background:none;border:none;color:rgba(255,255,255,.4);cursor:pointer;font-size:12px;padding:0 2px">✎</button>
      </div>`).join('');
    tb.innerHTML=`${items||'<div class="hw-empty">Görev yok</div>'}
      <div style="margin-top:6px;display:flex;gap:4px">
        <input id="hw-todo-input" placeholder="Görev ekle..." style="flex:1;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.2);border-radius:6px;padding:4px 7px;color:#fff;font-size:11px;outline:none" onclick="event.stopPropagation()" onkeydown="if(event.key==='Enter')hwTodoAdd()">
        <button onclick="event.stopPropagation();hwTodoAdd()" style="background:rgba(255,255,255,.2);border:none;border-radius:6px;color:#fff;padding:4px 8px;cursor:pointer;font-size:11px">+</button>
      </div>`;
  }
  // Goals - dinamik zaman filtresi
  const gb=document.getElementById('hw-goals-body');
  if(gb){
    const goals=(db.g||[]).filter(g=>{
      if(g.period!==hwGoalPeriod)return false;
      // isGoalActive goals.js'den geliyor
      if(typeof isGoalActive==='function') return isGoalActive(g);
      return true;
    });
    const label=hwGoalPeriod==='weekly'?'Haftalık':hwGoalPeriod==='monthly'?'Aylık':'Yıllık';
    if(!goals.length) gb.innerHTML=`<div class="hw-empty">${label} hedef yok</div>`;
    else gb.innerHTML=goals.slice(0,4).map(g=>{
      const cur=getGoalCurrent(g);
      const pct=g.target?Math.min(100,Math.round(cur/g.target*100)):0;
      return `<div class="hw-item" style="flex-direction:column;align-items:flex-start;gap:3px">
        <div style="display:flex;justify-content:space-between;width:100%">
          <span style="font-size:11px">${esc(g.name)}</span>
          <span style="font-size:10px;color:var(--accent)">${cur}/${g.target} ${g.unit||''}</span>
        </div>
        <div style="width:100%;height:4px;background:rgba(255,255,255,.2);border-radius:2px">
          <div style="width:${pct}%;height:100%;background:var(--accent);border-radius:2px"></div>
        </div>
      </div>`;
    }).join('');
  }
  // Chains
  const cb=document.getElementById('hw-chains-body');
  if(cb){
    const chains=getCh();
    if(!chains.length) cb.innerHTML='<div class="hw-empty">Zincir yok</div>';
    else cb.innerHTML=chains.slice(0,3).map(ch=>{
      const today2=todayStr();
      const doneTodayArr=ch.done||[];
      // Streak hesapla - done array gün indexi tutuyor
      const doneSet=new Set(ch.done||[]);
      const startMs=new Date(ch.start+'T00:00:00').getTime();
      const todayIdx=Math.floor((Date.now()-startMs)/86400000);
      // En son işaretlenen günden geriye say (bugünden en fazla 1 gün öncesine kadar bak)
      let startIdx=-1;
      for(let d=0;d<=1;d++){if(doneSet.has(todayIdx-d)){startIdx=todayIdx-d;break;}}
      // Bulamazsak en son işaretlenen günü bul
      if(startIdx<0){
        const maxDone=Math.max(...(ch.done||[-1]));
        if(maxDone>=0)startIdx=maxDone;
      }
      let streak=0;
      if(startIdx>=0){
        let checkIdx=startIdx;
        while(checkIdx>=0&&doneSet.has(checkIdx)){streak++;checkIdx--;}
      }

      return `<div class="hw-item" style="flex-direction:column;align-items:flex-start;gap:5px">
        <div style="display:flex;justify-content:space-between;width:100%;align-items:center">
          <span style="font-size:11px;font-weight:500">${esc(ch.name)}</span>
          <div style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.12);border:1.5px solid rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <span style="font-size:12px;font-weight:700;color:var(--accent)">${streak}</span>
          </div>
        </div>
      </div>`;
    }).join('');
  }
  // Takvim - mini ay
  const calb=document.getElementById('hw-cal-body');
  if(calb){
    const n=new Date();
    const y=n.getFullYear(),mo=n.getMonth(),tod=n.getDate();
    const first=new Date(y,mo,1).getDay();
    const startDay=first===0?6:first-1;
    const days=new Date(y,mo+1,0).getDate();
    let grid='<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;text-align:center">';
    ['P','S','Ç','P','C','C','P'].forEach(d=>{grid+=`<div style="font-size:9px;color:rgba(255,255,255,.4)">${d}</div>`;});
    for(let i=0;i<startDay;i++)grid+='<div></div>';
    for(let d=1;d<=days;d++){
      const isT=d===tod;
      grid+=`<div style="font-size:10px;padding:2px;border-radius:3px;${isT?'background:var(--accent);color:#000;font-weight:700':'color:rgba(255,255,255,.8)'}">${d}</div>`;
    }
    grid+='</div>';
    calb.innerHTML=`<div style="font-size:10px;color:rgba(255,255,255,.5);margin-bottom:3px">${TR_M[mo]} ${y}</div>${grid}`;
  }
}
let hwGoalPeriod='weekly';

function hwGoalTab(p){
  hwGoalPeriod=p;
  ['weekly','monthly','yearly'].forEach(t=>{
    const btn=document.getElementById('hw-gt-'+t);
    if(btn){btn.style.background=t===p?'var(--accent)':'rgba(255,255,255,.15)';btn.style.color=t===p?'#000':'#fff';}
  });
  renderHomeWidgets();
}

function hwTodoEdit(date,idx){
  const todos=getTodos();
  if(!todos[date]||!todos[date][idx])return;
  const newText=prompt('Görevi düzenle:',todos[date][idx].text);
  if(newText===null)return;
  if(newText.trim()){todos[date][idx].text=newText.trim();}
  else{todos[date].splice(idx,1);}
  setTodos(todos);renderHomeWidgets();renderCal();
}

function hwTodoAdd(){
  const inp=document.getElementById('hw-todo-input');
  if(!inp||!inp.value.trim())return;
  const today=todayStr();
  const todos=getTodos();
  if(!todos[today])todos[today]=[];
  todos[today].push({text:inp.value.trim(),done:false});
  setTodos(todos);inp.value='';
  renderHomeWidgets();renderCal();
}

function hwTodoToggle(date,idx){
  const todos=getTodos();
  if(!todos[date]||!todos[date][idx])return;
  todos[date][idx].done=!todos[date][idx].done;
  setTodos(todos);renderHomeWidgets();renderCal();
}


function hwSwToggle(){swToggle();}

function hwSwReset(){swReset();}

