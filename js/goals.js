// GOALS.JS - Temiz versiyon

// ── YARDIMCI FONKSİYONLAR ──────────────────────────────────────────

function parseStartDate(val){
  if(!val)return null;
  val=val.trim();
  if(/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(val)){
    const[d,m,y]=val.split('.');
    return new Date(parseInt(y),parseInt(m)-1,parseInt(d));
  }
  if(/^\d{4}-\d{2}-\d{2}$/.test(val)){
    return new Date(val+'T00:00:00');
  }
  return null;
}

// Bir hedefin başlangıç ve bitiş tarihini hesapla
function goalDateRange(g){
  const start = new Date((g.periodKey||todayStr())+'T00:00:00');
  const end = new Date(start);
  if(g.period==='weekly'){
    end.setDate(end.getDate()+6);
  } else if(g.period==='monthly'){
    end.setMonth(end.getMonth()+1);
    end.setDate(end.getDate()-1);
  } else if(g.period==='yearly'){
    end.setFullYear(end.getFullYear()+1);
    end.setDate(end.getDate()-1);
  }
  return {start, end};
}

// Bugün o hedefin aktif döneminde mi?
function isGoalActive(g){
  const today = new Date(todayStr()+'T00:00:00');
  const {start, end} = goalDateRange(g);
  return today >= start && today <= end;
}

function fmtD(d){ return d.getDate()+' '+TR_M[d.getMonth()]+' '+d.getFullYear(); }

// ── RENDER ──────────────────────────────────────────────────────────

function renderGoals(){
  const totalBooks = db.b.length;
  const totalFilms = db.f.length;

  ['weekly','monthly','yearly'].forEach(p=>{
    const el = document.getElementById('gl-'+p);
    if(!el) return;

    const items = db.g.map((g,i)=>({g,i})).filter(({g})=>g.period===p);

    if(!items.length){
      el.innerHTML=`<div class="empty" style="padding:28px 0"><div class="empty-icon">🎯</div>Bu dönem için hedef yok</div>`;
      return;
    }

    // Aktif ve geçmiş olarak ayır
    const active = items.filter(({g})=>isGoalActive(g));
    const past = items.filter(({g})=>!isGoalActive(g));

    let html = '';

    // Aktif hedefler — açık
    if(active.length){
      active.forEach(({g,i})=>{
        const {start,end} = goalDateRange(g);
        const dateLabel = fmtD(start)+' – '+fmtD(end);
        html += `<div style="margin-bottom:18px">
          <div class="period-hdr">
            <span class="ptag pt-${p}" style="font-size:11px;padding:3px 11px;border-radius:12px">${dateLabel}</span>
            <span style="font-size:11px;color:var(--accent);background:rgba(58,123,213,.1);padding:2px 8px;border-radius:8px">Aktif</span>
          </div>
          <div class="cards">${_goalCard(g,i,totalBooks,totalFilms)}</div>
        </div>`;
      });
    }

    // Geçmiş hedefler — kapalı (accordion)
    if(past.length){
      // Tarihe göre grupla
      const groups = {};
      past.forEach(({g,i})=>{
        const key = g.periodKey||todayStr();
        if(!groups[key]) groups[key]=[];
        groups[key].push({g,i});
      });

      Object.keys(groups).sort((a,b)=>b.localeCompare(a)).forEach(key=>{
        const accId = 'gacc_'+p+'_'+key.replace(/[^a-z0-9]/gi,'');
        const g0 = groups[key][0].g;
        const {start,end} = goalDateRange(g0);
        const dateLabel = fmtD(start)+' – '+fmtD(end);
        html += `<div style="margin-bottom:8px">
          <div onclick="toggleGoalAcc('${accId}')" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between;padding:8px 14px;border-radius:10px;background:var(--surface2);border:0.5px solid var(--border)">
            <span style="font-size:12px;color:var(--muted)">${dateLabel}</span>
            <span id="${accId}_icon" style="font-size:12px;color:var(--muted)">▸ ${groups[key].length} hedef</span>
          </div>
          <div id="${accId}" style="display:none;padding-top:8px">
            <div class="cards">${groups[key].map(({g,i})=>_goalCard(g,i,totalBooks,totalFilms)).join('')}</div>
          </div>
        </div>`;
      });
    }

    el.innerHTML = html;
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

function _goalCard(g,i,totalBooks,totalFilms){
  const isBookGoal = g.track==='book';
  const isFilmGoal = g.track==='film';
  const target = parseFloat(g.target)||0;
  const current = isBookGoal ? totalBooks : isFilmGoal ? totalFilms : (parseFloat(g.current)||0);
  const hasTarget = target>0;
  const pct = hasTarget ? Math.min(100,Math.round(current/target*100)) : 0;
  const isDone = hasTarget ? current>=target : g.done;
  const unit = g.unit||'';

  return `<div class="card ${isDone?'goal-done':''}"><div class="goal-row">
    <div class="g-check ${isDone?'done':''}" ${!hasTarget?`onclick="toggleGoal(${i})"`:''}
      style="cursor:${hasTarget?'default':'pointer'}">${isDone?'✓':''}</div>
    <div class="g-info">
      <div class="card-top">
        <div style="flex:1"><div class="card-title">${esc(g.name)}</div></div>
        <div class="card-actions">
          <button class="del-btn" style="font-size:13px;color:var(--accent);opacity:.7" onclick="editGoal(${i})">✎</button>
          <button class="del-btn" onclick="del('g',${i})">×</button>
        </div>
      </div>
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

// ── FORM ────────────────────────────────────────────────────────────

let editingFilm=-1, editingBook=-1, editingGoal=-1;

// Aktif sekmeye göre dönem seçili form aç
function openGoalForm(){
  const period = window._activeGoalTab||'weekly';
  const sel = document.getElementById('g-period');
  if(sel) sel.value = period;
  set('g-startdate','');
  toggleForm('gf');
}

function editGoal(i){
  const g = db.g[i];
  set('g-name', g.name);
  set('g-period', g.period);
  set('g-target', g.target||g.booktarget||'');
  set('g-unit', g.unit||'');
  set('g-track', g.track||'');
  set('g-startdate', ''); // boş bırak, değiştirmek isterse doldursun
  editingGoal = i;
  document.getElementById('gf-save-btn').textContent='Güncelle';
  document.getElementById('gf').style.display='block';
  document.getElementById('gf').scrollIntoView({behavior:'smooth',block:'start'});
}

function addGoal(){
  const name = v('g-name').trim();
  if(!name){alert('Hedef adı zorunludur');return;}
  const target = parseFloat(v('g-target'))||0;
  const unit = v('g-unit').trim();
  const period = v('g-period');
  const track = v('g-track')||'';
  const startDateVal = v('g-startdate');

  // Başlangıç tarihini belirle
  let pk = null;
  if(startDateVal){
    const sd = parseStartDate(startDateVal);
    if(sd && !isNaN(sd)){
      pk = sd.getFullYear()+'-'+String(sd.getMonth()+1).padStart(2,'0')+'-'+String(sd.getDate()).padStart(2,'0');
    }
  }
  if(!pk) pk = todayStr();

  if(editingGoal>=0){
    db.g[editingGoal].name = name;
    db.g[editingGoal].target = target;
    db.g[editingGoal].unit = unit;
    db.g[editingGoal].track = track;
    db.g[editingGoal].period = period;
    if(startDateVal) db.g[editingGoal].periodKey = pk;
    editingGoal = -1;
    document.getElementById('gf-save-btn').textContent='Kaydet';
  } else {
    db.g.unshift({name, period, periodKey:pk, target, unit, track, current:0, done:false, created:todayStr()});
  }

  ['g-name','g-target','g-unit','g-startdate'].forEach(id=>set(id,''));
  document.getElementById('gf').style.display='none';
  save();
}

function cancelGoalForm(){
  editingGoal = -1;
  ['g-name','g-target','g-unit','g-startdate'].forEach(id=>set(id,''));
  document.getElementById('gf').style.display='none';
  document.getElementById('gf-save-btn').textContent='Kaydet';
}

// ── İLERLEME ────────────────────────────────────────────────────────

function getGoalCurrent(g){
  if(!g.track) return g.current||0;
  if(g.track==='book') return db.b.length;
  if(g.track==='film') return db.f.length;
  return g.current||0;
}

function toggleGoal(i){db.g[i].done=!db.g[i].done;save();}

function addProgress(i){
  const el=document.getElementById('gp-'+i);
  if(!el)return;
  const val=parseFloat(el.value);
  if(isNaN(val)||val<=0)return;
  db.g[i].current=(parseFloat(db.g[i].current)||0)+val;
  el.value='';save();
}

function setProgress(i){
  const el=document.getElementById('gp-'+i);
  if(!el)return;
  const val=parseFloat(el.value);
  if(isNaN(val)||val<0){alert('Geçerli bir sayı girin.');return;}
  db.g[i].current=val;
  el.value='';save();
}
