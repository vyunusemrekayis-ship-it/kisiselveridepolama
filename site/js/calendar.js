// CALENDAR.JS

function getSpecial(ds){
  const[y,m,d]=ds.split('-');const k=m+'-'+d;const yr=parseInt(y);
  return SP.filter(s=>s.k===k&&(!s.y||s.y.includes(yr)));
}

function getSpecialMonth(year,month){
  const days=new Date(year,month+1,0).getDate(),res=[];
  for(let d=1;d<=days;d++){const ds=year+'-'+String(month+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');getSpecial(ds).forEach(s=>res.push({...s,ds,d}));}
  return res;
}

let calY=new Date().getFullYear(),calM=new Date().getMonth(),calSel=null;

function calMove(dir){calM+=dir;if(calM<0){calM=11;calY--}if(calM>11){calM=0;calY++}renderCal()}

function renderCal(){
  document.getElementById('cal-month').textContent=TR_M[calM]+' '+calY;
  const first=(new Date(calY,calM,1).getDay()+6)%7,dim=new Date(calY,calM+1,0).getDate(),prev=new Date(calY,calM,0).getDate();
  const today=todayStr(),notes=getCalNotes();
  const grid=document.getElementById('cal-days');grid.innerHTML='';
  for(let i=first-1;i>=0;i--){const c=document.createElement('div');c.className='cal-day other';c.textContent=prev-i;grid.appendChild(c)}
  for(let d=1;d<=dim;d++){
    const ds=calY+'-'+String(calM+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    const sp=getSpecial(ds);const isH=sp.some(s=>s.t==='h'),isR=sp.some(s=>s.t==='r'),isI=sp.some(s=>s.t==='i');
    const hasGoal=db.g.some(g=>g.due===ds);
    const nts=Array.isArray(notes[ds])?notes[ds]:(notes[ds]?[notes[ds]]:[]);
    const tdList=(getTodos()[ds]||[]);
    const hasTodo=tdList.length>0;
    const allDone=hasTodo&&tdList.every(t=>t.done);
    const c=document.createElement('div');
    c.className='cal-day'+(ds===today?' today':'')+(ds===calSel?' selected':'')+(isH?' is-holiday':isR?' is-religious':isI?' is-intl':'');
    const num=document.createElement('span');num.className='day-num';num.textContent=d;c.appendChild(num);
    const dots=[];
    if(isH)dots.push({c:'#e53935',big:true});
    if(isR)dots.push({c:'#8e44ad',big:true});
    if(isI)dots.push({c:'#1565c0',big:true});
    nts.forEach(n=>{const nc=typeof n==='object'?n.color:'#3a7bd5';dots.push({c:nc,big:false});});
    if(hasGoal)dots.push({c:'#237F52',big:false});
    if(dots.length){
      const dr=document.createElement('div');dr.className='dot-row';
      dots.slice(0,5).forEach(({c,big})=>{
        const dot=document.createElement('span');
        dot.className='dot';
        dot.style.background=c;
        if(big){dot.style.width='6px';dot.style.height='6px';}
        dr.appendChild(dot);
      });
      c.appendChild(dr);
    }
    c.onclick=()=>selectCalDay(ds);grid.appendChild(c);
  }
  const tot=first+dim,rem=tot%7===0?0:7-(tot%7);
  for(let d=1;d<=rem;d++){const c=document.createElement('div');c.className='cal-day other';c.textContent=d;grid.appendChild(c)}
  renderSpList();if(calSel)renderCalSide(calSel);
}

function selectCalDay(ds){
  calSel=ds;calNoteEditIdx=-1;
  document.getElementById('note-ta').value='';
  document.getElementById('cal-note-lbl').textContent='Not ekle';
  calNoteColor='#3a7bd5';setCalNoteColor('#3a7bd5');
  document.getElementById('cal-day-panel').style.display='block';
  renderCal();renderCalSide(ds);renderTodos(ds);
}

function renderCalSide(ds){
  const[y,m,d]=ds.split('-');document.getElementById('cal-sel-lbl').textContent=d+' '+TR_M[parseInt(m)-1]+' '+y;
  const sp=getSpecial(ds);const tc={h:'#c0392b',r:'#7b5ea7',i:'#2874a6'};const tl={h:'Resmi Tatil',r:'Dini Bayram',i:'Uluslararası'};
  let html='';
  sp.forEach(s=>{html+=`<div class="cal-item" style="border-left-color:${tc[s.t]||'var(--accent)'}"><div class="cal-item-title">${esc(s.n)}</div><div class="cal-item-sub">${tl[s.t]||''}</div></div>`});
  db.f.filter(x=>x.date===ds).forEach(x=>{html+=`<div class="cal-item" style="border-left-color:var(--film-l)"><div class="cal-item-title">${esc(x.name)}</div><div class="cal-item-sub">Film</div></div>`});
  db.b.filter(x=>x.end===ds||x.start===ds).forEach(x=>{html+=`<div class="cal-item" style="border-left-color:var(--book-l)"><div class="cal-item-title">${esc(x.name)}</div><div class="cal-item-sub">${x.start===ds?'Kitap Başlangıç':'Kitap Bitiş'}</div></div>`});
  const notes=getCalNotes();
  const nts=Array.isArray(notes[ds])?notes[ds]:(notes[ds]?[notes[ds]]:[]);
  nts.forEach((n,i)=>{
    const nt=typeof n==='object'?n.text:n;
    const nc=typeof n==='object'?n.color:'#3a7bd5';
    html+=`<div class="cal-item" style="border-left-color:${nc};background:rgba(58,123,213,.04);margin-top:4px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px">
        <div style="flex:1"><div class="cal-item-sub" style="font-size:10px;margin-bottom:2px">Not${nts.length>1?' '+(i+1):''}</div>
        <div class="cal-item-title" style="font-size:13px;line-height:1.4">${esc(nt)}</div></div>
        <div style="display:flex;gap:3px;flex-shrink:0;margin-top:1px">
          <button onclick="editCalNote(${i})" style="background:transparent;border:none;cursor:pointer;font-size:13px;color:var(--accent);padding:2px 4px">✎</button>
          <button onclick="delCalNote(${i})" style="background:transparent;border:none;cursor:pointer;font-size:15px;color:var(--muted2);padding:2px 4px">×</button>
        </div>
      </div>
    </div>`;
  });
  document.getElementById('cal-items').innerHTML=html||'<div class="cal-empty">Bu gün için kayıt yok.</div>';
  document.getElementById('note-saved').style.opacity='0';
}

function renderSpList(){
  const items=getSpecialMonth(calY,calM);const el=document.getElementById('sp-list');
  if(!items.length){el.innerHTML='<div class="cal-empty">Bu ayda özel gün yok.</div>';return}
  const bc={h:'spb-h',r:'spb-r',i:'spb-i',p:'spb-p'};const bl={h:'Resmi Tatil',r:'Dini Bayram',i:'Uluslararası',p:'Kişisel'};
  el.innerHTML=items.map(s=>`<div class="sp-item"><div class="sp-date">${String(s.d).padStart(2,'0')} ${TR_M[calM].slice(0,3)}</div><div><div class="sp-name">${esc(s.n)}</div><span class="sp-badge ${bc[s.t]||''}">${bl[s.t]||s.t}</span></div></div>`).join('');
}
// TO-DO LİSTESİ

function getTodos(){try{return JSON.parse(localStorage.getItem('gn_todos')||'{}')}catch(x){return{}}}

function setTodos(o){localStorage.setItem('gn_todos',JSON.stringify(o));window.saveToFirestore&&window.saveToFirestore();}


function todoEnter(){
  const btn=document.getElementById('todo-add-btn');
  if(btn&&btn.textContent==='Güncelle')btn.onclick();
  else addTodo();
}

function addTodo(){
  const inp=document.getElementById('todo-input');
  const text=inp.value.trim();if(!text)return;
  const todos=getTodos();
  if(!todos[calSel])todos[calSel]=[];
  todos[calSel].push({text,done:false});
  setTodos(todos);inp.value='';
  renderTodos(calSel);renderCal();
}


function toggleTodo(i){
  const todos=getTodos();
  if(!todos[calSel])return;
  todos[calSel][i].done=!todos[calSel][i].done;
  setTodos(todos);renderTodos(calSel);renderCal();
}


function delTodo(i){
  const todos=getTodos();
  if(!todos[calSel])return;
  todos[calSel].splice(i,1);
  if(!todos[calSel].length)delete todos[calSel];
  setTodos(todos);renderTodos(calSel);renderCal();
}


function renderTodos(ds){
  const todos=getTodos();
  const list=todos[ds]||[];
  const el=document.getElementById('todo-list');
  const counter=document.getElementById('todo-counter');
  if(!el)return;
  const done=list.filter(t=>t.done).length;
  if(counter)counter.textContent=list.length?done+'/'+list.length+' tamamlandı':'';
  el.innerHTML=list.map((t,i)=>`
    <div class="todo-item ${t.done?'done':''}">
      <div class="todo-check ${t.done?'done':''}" onclick="toggleTodo(${i})">${t.done?'✓':''}</div>
      <span class="todo-text ${t.done?'done':''}">${esc(t.text)}</span>
      <button onclick="editTodo(${i})" style="background:transparent;border:none;cursor:pointer;font-size:13px;color:var(--accent);opacity:.7;padding:0 3px;flex-shrink:0">✎</button>
      <button class="todo-del" onclick="delTodo(${i})">×</button>
    </div>`).join('');
}


function editTodo(i){
  const todos=getTodos();
  if(!todos[calSel])return;
  const text=todos[calSel][i].text;
  const inp=document.getElementById('todo-input');
  inp.value=text;inp.focus();
  // Kaydet butonunu güncelle moduna al
  const btn=document.getElementById('todo-add-btn');
  if(btn){btn.textContent='Güncelle';btn.onclick=()=>saveTodoEdit(i);}
}


function saveTodoEdit(i){
  const inp=document.getElementById('todo-input');
  const text=inp.value.trim();if(!text)return;
  const todos=getTodos();
  if(!todos[calSel])return;
  todos[calSel][i].text=text;
  setTodos(todos);inp.value='';
  const btn=document.getElementById('todo-add-btn');
  if(btn){btn.textContent='Ekle';btn.onclick=addTodo;}
  renderTodos(calSel);renderCal();
}

// ── ZİNCİR KIRMA ─────────────────────────────────────────

function getCalNotes(){try{return JSON.parse(localStorage.getItem('gn_notes')||'{}')}catch(x){return{}}}

function setCalNotes(o){localStorage.setItem('gn_notes',JSON.stringify(o));window.saveToFirestore&&window.saveToFirestore();}


function saveCalNote(){
  const val=document.getElementById('note-ta').value.trim();if(!val)return;
  const notes=getCalNotes();
  if(!Array.isArray(notes[calSel]))notes[calSel]=[];
  const entry={text:val,color:calNoteColor};
  if(calNoteEditIdx>=0){notes[calSel][calNoteEditIdx]=entry;}
  else{notes[calSel].push(entry);}
  setCalNotes(notes);
  calNoteEditIdx=-1;
  document.getElementById('note-ta').value='';
  document.getElementById('cal-note-lbl').textContent='Yeni not ekle';
  calNoteColor='#3a7bd5';setCalNoteColor('#3a7bd5');
  renderCal();
  const msg=document.getElementById('note-saved');msg.style.opacity='1';setTimeout(()=>msg.style.opacity='0',1800);
}

function cancelCalNote(){
  calNoteEditIdx=-1;
  document.getElementById('note-ta').value='';
  document.getElementById('cal-note-lbl').textContent='Yeni not ekle';
  calNoteColor='#3a7bd5';setCalNoteColor('#3a7bd5');
}

function editCalNote(i){
  const notes=getCalNotes();const nts=notes[calSel]||[];
  const n=nts[i];
  const nt=typeof n==='object'?n.text:n;
  const nc=typeof n==='object'?n.color:'#3a7bd5';
  calNoteEditIdx=i;
  document.getElementById('note-ta').value=nt||'';
  document.getElementById('cal-note-lbl').textContent='Notu düzenle';
  calNoteColor=nc;setCalNoteColor(nc);
  document.getElementById('note-ta').focus();
}

function delCalNote(i){
  const notes=getCalNotes();const nts=notes[calSel]||[];
  nts.splice(i,1);
  if(nts.length===0)delete notes[calSel];else notes[calSel]=nts;
  setCalNotes(notes);renderCal();renderCalSide(calSel);
}

// INIT
(function(){
  
  set('f-date',todayStr());
  initHome();tickClock();setInterval(tickClock,100);
  const _sb=document.getElementById('sidebar');
  const _hw=document.getElementById('home-bg');
  if(_sb&&_hw)_hw.style.left=_sb.classList.contains('collapsed')?'58px':'220px';
  swRender();swRenderLog();
  if(swElapsed>0){const f=swFmt(swElapsed);const sv=document.getElementById('sw-saved');if(sv)sv.textContent='Kaydedildi: '+f.main;const btn=document.getElementById('sw-btn');if(btn)btn.textContent='Devam Et';}
  updateBadges();renderAll();
})();

function setCalNoteColor(c){
  calNoteColor=c;
  document.querySelectorAll('#cal-color-picker [data-color]').forEach(el=>{
    el.style.border=el.getAttribute('data-color')===c?'2px solid var(--text)':'2px solid transparent';
  });
}


