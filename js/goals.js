// GOALS.JS

function parseStartDate(val){
  if(!val)return null;
  val=val.trim();
  // DD.MM.YYYY formatı
  if(/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(val)){
    const[d,m,y]=val.split('.');
    return new Date(parseInt(y),parseInt(m)-1,parseInt(d));
  }
  // YYYY-MM-DD formatı
  if(/^\d{4}-\d{2}-\d{2}$/.test(val)){
    return new Date(val+'T00:00:00');
  }
  return null;
}
function getWeekStart(date){const d=new Date(date);const day=d.getDay();d.setDate(d.getDate()+(day===0?-6:1-day));d.setHours(0,0,0,0);return d;}

function weekLabel(key){
  const ws=new Date(key+'T00:00:00');
  const we=new Date(ws);we.setDate(ws.getDate()+6);
  const fmt=d=>d.getDate()+' '+TR_M[d.getMonth()];
  const curKey=todayStr();
  // Bu haftaya ait mi? key <= bugün <= key+6
  const today=new Date(curKey+'T00:00:00');
  const isCur=today>=ws&&today<=we;
  return (isCur?'Bu Hafta · ':'')+fmt(ws)+' – '+fmt(we)+' '+ws.getFullYear();
}

function monthLabel(key){
  const n=new Date();
  let start,end,isCur;
  if(key.length===10){
    start=new Date(key+'T00:00:00');
    end=new Date(start);end.setMonth(end.getMonth()+1);end.setDate(end.getDate()-1);
  } else {
    const[y,m]=key.split('-');
    start=new Date(parseInt(y),parseInt(m)-1,1);
    end=new Date(parseInt(y),parseInt(m),0);
  }
  const today=new Date(todayStr()+'T00:00:00');
  isCur=today>=start&&today<=end;
  const fmt=d=>d.getDate()+' '+TR_M[d.getMonth()]+' '+d.getFullYear();
  return (isCur?'Bu Ay · ':'')+fmt(start)+' – '+fmt(end);
}

function yearLabel(key){
  let start,end;
  if(key.length===10){
    start=new Date(key+'T00:00:00');
    end=new Date(start);end.setFullYear(end.getFullYear()+1);end.setDate(end.getDate()-1);
  } else {
    start=new Date(key+'-01-01T00:00:00');
    end=new Date(key+'-12-31T00:00:00');
  }
  const today=new Date(todayStr()+'T00:00:00');
  const isCur=today>=start&&today<=end;
  const fmt=d=>d.getDate()+' '+TR_M[d.getMonth()]+' '+d.getFullYear();
  return (isCur?'Bu Yıl · ':'')+fmt(start)+' – '+fmt(end);
}


function renderGoals(){
  const totalBooks=db.b.length;
  ['weekly','monthly','yearly'].forEach(p=>{
    const items=db.g.map((g,i)=>({g,i})).filter(({g})=>g.period===p);
    const el=document.getElementById('gl-'+p);
    if(!items.length){el.innerHTML=`<div class="empty" style="padding:28px 0"><div class="empty-icon">🎯</div>Bu dönem için hedef yok</div>`;return}
    const groups={};
    items.forEach(({g,i})=>{
      let key=g.periodKey||g.created||todayStr();
      // Aylık/yıllık için eski tam tarih formatını normalize et
      if(p==='monthly'&&key.length===10) key=key.substring(0,7);
      if(p==='yearly'&&key.length>=7) key=key.substring(0,4);
      if(!groups[key])groups[key]=[];groups[key].push({g,i});
    });
    const now=new Date();
    let curKey=p==='weekly'?todayStr():p==='monthly'?now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0'):String(now.getFullYear());
    let html='';
    Object.keys(groups).sort((a,b)=>b.localeCompare(a)).forEach(key=>{
      const isCur=(()=>{
        const td=new Date(todayStr()+'T00:00:00');
        if(p==='weekly'){const ws=new Date(key+'T00:00:00');const we=new Date(ws);we.setDate(ws.getDate()+6);return td>=ws&&td<=we;}
        if(p==='monthly'){let s,e;if(key.length===10){s=new Date(key+'T00:00:00');e=new Date(s);e.setMonth(e.getMonth()+1);e.setDate(e.getDate()-1);}else{const[y,m]=key.split('-');s=new Date(parseInt(y),parseInt(m)-1,1);e=new Date(parseInt(y),parseInt(m),0);}return td>=s&&td<=e;}
        if(p==='yearly'){let s,e;if(key.length===10){s=new Date(key+'T00:00:00');e=new Date(s);e.setFullYear(e.getFullYear()+1);e.setDate(e.getDate()-1);}else{s=new Date(key+'-01-01T00:00:00');e=new Date(key+'-12-31T00:00:00');}return td>=s&&td<=e;}
        return false;
      })();
      const tagCls=p==='weekly'?'ptw':p==='monthly'?'ptm':'pty';
      const lbl=p==='weekly'?weekLabel(key):p==='monthly'?monthLabel(key):yearLabel(key);
      if(isCur){
        html+=`<div style="margin-bottom:18px"><div class="period-hdr"><span class="ptag ${tagCls}">${lbl}</span><span style="font-size:11px;color:var(--accent);background:rgba(58,123,213,.1);padding:2px 8px;border-radius:8px">Aktif</span></div><div class="cards">`;
        groups[key].forEach(({g,i})=>{html+=_goalCard(g,i,totalBooks);});
        html+='</div></div>';
      } else {
        const accId='gacc_'+p+'_'+key.replace(/[^a-z0-9]/gi,'');
        html+=`<div style="margin-bottom:8px">
          <div onclick="toggleGoalAcc('${accId}')" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between;padding:8px 14px;border-radius:10px;background:var(--surface2);border:0.5px solid var(--border)">
            <span class="ptag ${tagCls}" style="margin:0">${lbl}</span>
            <span id="${accId}_icon" style="font-size:12px;color:var(--muted)">▸ ${groups[key].length} hedef</span>
          </div>
          <div id="${accId}" style="display:none;padding-top:8px"><div class="cards">`;
        groups[key].forEach(({g,i})=>{html+=_goalCard(g,i,totalBooks);});
        html+='</div></div></div>';
      }
    });
    el.innerHTML=html;
  });
}

function toggleGoalAcc(id){
  const el=document.getElementById(id);
  const icon=document.getElementById(id+'_icon');
  if(!el)return;
  const open=el.style.display==='none';
  el.style.display=open?'block':'none';
  if(icon){const count=icon.textContent.match(/\d+ hedef/)?.[0]||'';icon.textContent=open?'▾ '+count:'▸ '+count;}
}

function _goalCard(g,i,totalBooks){
  const isBookGoal=g.track==='book'||(g.name.toLowerCase().includes('kitap')&&!g.track);
  const isFilmGoal=g.track==='film';
  const target=parseFloat(g.target)||parseFloat(g.booktarget)||0;
  const current=isBookGoal?totalBooks:isFilmGoal?db.f.length:(parseFloat(g.current)||0);
  const hasTarget=target>0;
  const pct=hasTarget?Math.min(100,Math.round(current/target*100)):0;
  const isDone=hasTarget?current>=target:g.done;
  const unit=g.unit||'';
  return `<div class="card ${isDone?'goal-done':''}"><div class="goal-row">
    <div class="g-check ${isDone?'done':''}" ${!hasTarget?`onclick="toggleGoal(${i})"`:''} style="cursor:${hasTarget?'default':'pointer'}">${isDone?'✓':''}</div>
    <div class="g-info">
      <div class="card-top"><div style="flex:1"><div class="card-title">${esc(g.name)}</div></div>
      <div class="card-actions">
        <button class="del-btn" style="font-size:13px;color:var(--accent);opacity:.7" onclick="editGoal(${i})">✎</button>
        <button class="del-btn" onclick="del('g',${i})">×</button>
      </div></div>
      ${hasTarget?`<div style="margin-top:7px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
          <span style="font-size:12px;color:var(--muted)">${current} / ${target}${unit?' '+unit:''}</span>
          <span style="font-size:12px;font-weight:500;color:#237F52">%${pct}</span>
        </div>
        <div class="prog-bar"><div class="prog-fill" style="width:${pct}%"></div></div>
        ${(!isBookGoal&&!isFilmGoal)?`<div style="display:flex;align-items:center;gap:7px;margin-top:7px">
          <input type="number" min="0" step="any" placeholder="+${unit||'değer'} ekle" id="gp-${i}"
            style="flex:1;padding:5px 9px;border-radius:7px;border:0.5px solid var(--border);background:var(--surface2);color:var(--text);font-family:'DM Sans',sans-serif;font-size:12px;outline:none"
            onkeydown="if(event.key==='Enter')addProgress(${i})">
          <button onclick="addProgress(${i})" style="padding:5px 12px;border-radius:7px;border:none;background:var(--accent);color:#1a1a00;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:500;cursor:pointer">Ekle</button>
          <button onclick="setProgress(${i})" style="padding:5px 10px;border-radius:7px;border:0.5px solid var(--border);background:transparent;color:var(--muted);font-family:'DM Sans',sans-serif;font-size:12px;cursor:pointer">Düzelt</button>
        </div>`:''}
      </div>`:''}
    </div>
  </div></div>`;
}


function openGoalForm(){
  // Aktif sekmeye göre dönem seç
  const period = window._activeGoalTab || 'weekly';
  const sel = document.getElementById('g-period');
  if(sel) sel.value = period;
  toggleForm('gf');
}
// EDIT
let editingFilm=-1,editingBook=-1,editingGoal=-1;

function editGoal(i){const g=db.g[i];set('g-name',g.name);set('g-period',g.period);set('g-target',g.target||g.booktarget||'');set('g-unit',g.unit||'');set('g-track',g.track||'');set('g-startdate','');editingGoal=i;document.getElementById('gf-save-btn').textContent='Güncelle';document.getElementById('gf').style.display='block';document.getElementById('gf').scrollIntoView({behavior:'smooth',block:'start'});}

// ADD / SAVE

function addGoal(){
  const name=v('g-name').trim();if(!name){alert('Hedef adı zorunludur');return}
  const target=parseFloat(v('g-target'))||0;const unit=v('g-unit').trim();const period=v('g-period');const track=v('g-track')||'';
  const startDateVal=v('g-startdate');
  if(editingGoal>=0){
    db.g[editingGoal].name=name;db.g[editingGoal].target=target;db.g[editingGoal].unit=unit;db.g[editingGoal].track=track;db.g[editingGoal].period=period;
    if(startDateVal){
      const sd=parseStartDate(startDateVal);
      if(sd&&!isNaN(sd)){
        db.g[editingGoal].periodKey=sd.getFullYear()+'-'+String(sd.getMonth()+1).padStart(2,'0')+'-'+String(sd.getDate()).padStart(2,'0');
      }
    }
    // startDateVal boşsa periodKey değişmez, mevcut değer korunur
    editingGoal=-1;document.getElementById('gf-save-btn').textContent='Kaydet';
  }else{
    let pk;
    if(startDateVal){
      const sd=parseStartDate(startDateVal);
      if(sd&&!isNaN(sd)){
        pk=sd.getFullYear()+'-'+String(sd.getMonth()+1).padStart(2,'0')+'-'+String(sd.getDate()).padStart(2,'0');
      }
    }
    if(!pk){
      const n=new Date();
      pk=todayStr(); // haftalık, aylık, yıllık hepsi tam tarihle başlasın
    }
    db.g.unshift({name,period,periodKey:pk,target,unit,track,current:0,done:false,created:todayStr()});
  }
  ['g-name','g-target','g-unit','g-startdate'].forEach(id=>set(id,''));
  document.getElementById('gf').style.display='none';save();
}

// CANCEL

function cancelGoalForm(){editingGoal=-1;['g-name','g-target','g-unit','g-startdate'].forEach(id=>set(id,''));document.getElementById('gf').style.display='none';document.getElementById('gf-save-btn').textContent='Kaydet';}

// DELETE / UPDATE

function getGoalCurrent(g){
  if(!g.track)return g.current||0;
  if(g.track==='book')return db.b.length;
  if(g.track==='film')return db.f.length;
  return g.current||0;
}

function toggleGoal(i){db.g[i].done=!db.g[i].done;save()}

function addProgress(i){const el=document.getElementById('gp-'+i);if(!el)return;const val=parseFloat(el.value);if(isNaN(val)||val<=0)return;db.g[i].current=(parseFloat(db.g[i].current)||0)+val;el.value='';save();}

function setProgress(i){const el=document.getElementById('gp-'+i);if(!el)return;const val=parseFloat(el.value);if(isNaN(val)||val<0){alert('Geçerli bir sayı girin.');return;}db.g[i].current=val;el.value='';save();}

// HOME / CLOCK

