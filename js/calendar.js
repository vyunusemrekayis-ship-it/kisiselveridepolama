// ── CALENDAR.JS - Sıfırdan yazıldı ──────────────────────────────

// Özel günler verisi
const CAL_SP = [
  {k:'01-01',n:'Yılbaşı',t:'h'},
  {k:'04-23',n:'Ulusal Egemenlik ve Çocuk Bayramı',t:'h'},
  {k:'05-01',n:'Emek ve Dayanışma Bayramı',t:'h'},
  {k:'05-19',n:"Atatürk'ü Anma, Gençlik ve Spor Bayramı",t:'h'},
  {k:'07-15',n:'Demokrasi ve Millî Birlik Günü',t:'h'},
  {k:'08-30',n:'Zafer Bayramı',t:'h'},
  {k:'10-29',n:'Cumhuriyet Bayramı',t:'h'},
  {k:'03-30',n:'Ramazan Bayramı 1.Gün',t:'r',y:[2025]},
  {k:'03-31',n:'Ramazan Bayramı 2.Gün',t:'r',y:[2025]},
  {k:'04-01',n:'Ramazan Bayramı 3.Gün',t:'r',y:[2025]},
  {k:'03-20',n:'Ramazan Bayramı 1.Gün',t:'r',y:[2026]},
  {k:'03-21',n:'Ramazan Bayramı 2.Gün',t:'r',y:[2026]},
  {k:'03-22',n:'Ramazan Bayramı 3.Gün',t:'r',y:[2026]},
  {k:'06-06',n:'Kurban Bayramı 1.Gün',t:'r',y:[2025]},
  {k:'06-07',n:'Kurban Bayramı 2.Gün',t:'r',y:[2025]},
  {k:'06-08',n:'Kurban Bayramı 3.Gün',t:'r',y:[2025]},
  {k:'06-09',n:'Kurban Bayramı 4.Gün',t:'r',y:[2025]},
  {k:'05-27',n:'Kurban Bayramı 1.Gün',t:'r',y:[2026]},
  {k:'05-28',n:'Kurban Bayramı 2.Gün',t:'r',y:[2026]},
  {k:'05-29',n:'Kurban Bayramı 3.Gün',t:'r',y:[2026]},
  {k:'05-30',n:'Kurban Bayramı 4.Gün',t:'r',y:[2026]},
  {k:'02-14',n:'Sevgililer Günü',t:'i'},
  {k:'03-08',n:'Dünya Kadınlar Günü',t:'i'},
  {k:'04-22',n:'Dünya Günü',t:'i'},
  {k:'06-01',n:'Dünya Çocuklar Günü',t:'i'},
  {k:'10-05',n:'Dünya Öğretmenler Günü',t:'i'},
  {k:'10-31',n:'Cadılar Bayramı',t:'i'},
  {k:'12-25',n:'Noel',t:'i'},
  {k:'12-31',n:'Yılbaşı Gecesi',t:'i'},
];

// Renk sabitleri
const CAL_COLORS = {h:'#e53935', r:'#8e44ad', i:'#1565c0'};
const CAL_LABELS = {h:'Resmi Tatil', r:'Dini Bayram', i:'Uluslararası'};

// Durum
let calY = new Date().getFullYear();
let calM = new Date().getMonth();
let calSel = null;
let calNoteEditIdx = -1;
let calNoteColor = '#3a7bd5';

// ── VERİ FONKSİYONLARI ─────────────────────────────────────────

function getTodos(){ try{return JSON.parse(localStorage.getItem('gn_todos')||'{}')}catch(e){return{}} }
function setTodos(o){ localStorage.setItem('gn_todos',JSON.stringify(o)); window.saveToFirestore&&window.saveToFirestore(); }

function getCalNotes(){ try{return JSON.parse(localStorage.getItem('gn_notes')||'{}')}catch(e){return{}} }
function setCalNotes(o){ localStorage.setItem('gn_notes',JSON.stringify(o)); window.saveToFirestore&&window.saveToFirestore(); }

function getSpecial(ds){
  const [y,m,d] = ds.split('-');
  const k = m+'-'+d;
  const yr = parseInt(y);
  return CAL_SP.filter(s => s.k===k && (!s.y || s.y.includes(yr)));
}

function getSpecialMonth(year, month){
  const days = new Date(year, month+1, 0).getDate();
  const res = [];
  for(let d=1; d<=days; d++){
    const ds = year+'-'+String(month+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    getSpecial(ds).forEach(s => res.push({...s, ds, d}));
  }
  return res;
}

// ── TAKVİM RENDER ───────────────────────────────────────────────

function calMove(dir){
  calM += dir;
  if(calM < 0){ calM=11; calY--; }
  if(calM > 11){ calM=0; calY++; }
  renderCal();
}

function renderCal(){
  const monthEl = document.getElementById('cal-month');
  if(!monthEl) return;
  monthEl.textContent = TR_M[calM]+' '+calY;

  const first = (new Date(calY,calM,1).getDay()+6)%7;
  const dim = new Date(calY,calM+1,0).getDate();
  const prev = new Date(calY,calM,0).getDate();
  const today = todayStr();
  const notes = getCalNotes();
  const todos = getTodos();

  const grid = document.getElementById('cal-days');
  if(!grid) return;
  grid.innerHTML = '';

  // Önceki ay günleri
  for(let i=first-1; i>=0; i--){
    const c = document.createElement('div');
    c.className = 'cal-day other';
    c.textContent = prev-i;
    grid.appendChild(c);
  }

  // Bu ayın günleri
  for(let d=1; d<=dim; d++){
    const ds = calY+'-'+String(calM+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    const sp = getSpecial(ds);
    const isH = sp.some(s=>s.t==='h');
    const isR = sp.some(s=>s.t==='r');
    const isI = sp.some(s=>s.t==='i');
    const nts = Array.isArray(notes[ds]) ? notes[ds] : (notes[ds]?[notes[ds]]:[]);
    const tdList = todos[ds]||[];
    const hasTodo = tdList.length > 0;
    const allDone = hasTodo && tdList.every(t=>t.done);

    const c = document.createElement('div');
    c.className = 'cal-day'
      +(ds===today?' today':'')
      +(ds===calSel?' selected':'')
      +(isH?' is-holiday':isR?' is-religious':isI?' is-intl':'');

    // Gün numarası
    const num = document.createElement('span');
    num.className = 'day-num';
    num.textContent = d;
    c.appendChild(num);

    // Nokta göstergeleri
    const dots = [];
    if(isH) dots.push({c:CAL_COLORS.h, big:true});
    if(isR) dots.push({c:CAL_COLORS.r, big:true});
    if(isI) dots.push({c:CAL_COLORS.i, big:true});
    nts.forEach(n => { const nc=typeof n==='object'?n.color:'#3a7bd5'; dots.push({c:nc,big:false}); });
    // To-do için nokta gösterme

    if(dots.length){
      const dr = document.createElement('div');
      dr.className = 'dot-row';
      dots.slice(0,5).forEach(({c:col,big})=>{
        const dot = document.createElement('span');
        dot.className = 'dot';
        dot.style.background = col;
        if(big){ dot.style.width='6px'; dot.style.height='6px'; }
        dr.appendChild(dot);
      });
      c.appendChild(dr);
    }

    c.onclick = () => selectCalDay(ds);
    grid.appendChild(c);
  }

  // Sonraki ay dolgu günleri
  const tot = first+dim;
  const rem = tot%7===0 ? 0 : 7-(tot%7);
  for(let d=1; d<=rem; d++){
    const c = document.createElement('div');
    c.className = 'cal-day other';
    c.textContent = d;
    grid.appendChild(c);
  }

  if(calSel) renderCalSide(calSel);
}

// ── GÜN SEÇİMİ ──────────────────────────────────────────────────

function selectCalDay(ds){
  calMediaEditMode = false;
  calSel = ds;
  calNoteEditIdx = -1;
  const ta = document.getElementById('note-ta');
  if(ta) ta.value = '';
  const lbl = document.getElementById('cal-note-lbl');
  if(lbl) lbl.textContent = 'Not ekle';
  calNoteColor = '#3a7bd5';
  setCalNoteColor('#3a7bd5');
  const panel = document.getElementById('cal-day-panel');
  if(panel) panel.style.display = 'block';
  renderCal();
  renderCalSide(ds);
  renderTodos(ds);
  renderCalMedia(ds);
}

// ── GÜN DETAY PANELİ ────────────────────────────────────────────

function renderCalSide(ds){
  const lbl = document.getElementById('cal-sel-lbl');
  if(!lbl) return;
  const [y,m,d] = ds.split('-');
  const dateObj = new Date(ds+'T00:00:00');
  const dayName = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'][dateObj.getDay()];
  lbl.textContent = dayName+', '+d+' '+TR_M[parseInt(m)-1]+' '+y;

  const sp = getSpecial(ds);
  let html = '';

  // Özel günler
  sp.forEach(s => {
    html += `<div class="cal-item" style="border-left-color:${CAL_COLORS[s.t]||'var(--accent)'}">
      <div class="cal-item-title">${esc(s.n)}</div>
      <div class="cal-item-sub">${CAL_LABELS[s.t]||''}</div>
    </div>`;
  });

  // Filmler
  (db.f||[]).filter(x=>x.date===ds).forEach(x => {
    html += `<div class="cal-item" style="border-left-color:var(--film-l)">
      <div class="cal-item-title">${esc(x.name)}</div>
      <div class="cal-item-sub">🎬 Film</div>
    </div>`;
  });

  // Kitaplar
  (db.b||[]).filter(x=>x.end===ds||x.start===ds).forEach(x => {
    html += `<div class="cal-item" style="border-left-color:var(--book-l)">
      <div class="cal-item-title">${esc(x.name)}</div>
      <div class="cal-item-sub">📚 ${x.start===ds?'Kitap Başlangıç':'Kitap Bitiş'}</div>
    </div>`;
  });

  // Notlar
  const notes = getCalNotes();
  const nts = Array.isArray(notes[ds]) ? notes[ds] : (notes[ds]?[notes[ds]]:[]);
  nts.forEach((n,i) => {
    const nt = typeof n==='object' ? n.text : n;
    const nc = typeof n==='object' ? n.color : '#3a7bd5';
    html += `<div class="cal-item" style="border-left-color:${nc}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px">
        <div style="flex:1">
          <div class="cal-item-sub" style="font-size:10px;margin-bottom:2px">📝 Not${nts.length>1?' '+(i+1):''}</div>
          <div class="cal-item-title" style="font-size:13px;line-height:1.4">${esc(nt)}</div>
        </div>
        <div style="display:flex;gap:3px;flex-shrink:0">
          <button onclick="editCalNote(${i})" style="background:transparent;border:none;cursor:pointer;font-size:13px;color:var(--accent);padding:2px 4px">✎</button>
          <button onclick="delCalNote(${i})" style="background:transparent;border:none;cursor:pointer;font-size:15px;color:var(--muted2);padding:2px 4px">×</button>
        </div>
      </div>
    </div>`;
  });

  const itemsEl = document.getElementById('cal-items');
  if(itemsEl) itemsEl.innerHTML = html||'<div class="cal-empty">Bu gün için kayıt yok.</div>';

  const saved = document.getElementById('note-saved');
  if(saved) saved.style.opacity = '0';
}

// ── ÖZEL GÜNLER LİSTESİ ─────────────────────────────────────────

function renderSpList(){
  const el = document.getElementById('sp-list');
  if(!el) return;
  const items = getSpecialMonth(calY, calM);
  if(!items.length){
    el.innerHTML = '<div class="cal-empty">Bu ayda özel gün yok.</div>';
    return;
  }
  const bc = {h:'spb-h', r:'spb-r', i:'spb-i'};
  el.innerHTML = items.map(s => `
    <div class="sp-item">
      <div class="sp-date">${String(s.d).padStart(2,'0')} ${TR_M[calM].slice(0,3)}</div>
      <div>
        <div class="sp-name">${esc(s.n)}</div>
        <span class="sp-badge ${bc[s.t]||''}">${CAL_LABELS[s.t]||s.t}</span>
      </div>
    </div>`).join('');
}

// ── ARAMA ───────────────────────────────────────────────────────

function calSearch(){
  const q = document.getElementById('cal-search-input');
  if(!q) return;
  const term = q.value.trim().toLowerCase();
  const resultsEl = document.getElementById('cal-search-results');
  if(!resultsEl) return;

  if(!term){ resultsEl.innerHTML=''; resultsEl.style.display='none'; return; }
  resultsEl.style.display='block';

  const notes = getCalNotes();
  const todos = getTodos();
  const results = [];

  // Özel günlerde ara
  CAL_SP.forEach(s => {
    if(s.n.toLowerCase().includes(term)){
      results.push({type:'special', text:s.n, label:CAL_LABELS[s.t]||s.t, key:s.k});
    }
  });

  // Notlarda ara
  Object.entries(notes).forEach(([ds, nts]) => {
    const arr = Array.isArray(nts) ? nts : [nts];
    arr.forEach(n => {
      const nt = typeof n==='object' ? n.text : n;
      if(nt && nt.toLowerCase().includes(term)){
        results.push({type:'note', text:nt, ds});
      }
    });
  });

  // To-do'larda ara
  Object.entries(todos).forEach(([ds, list]) => {
    (list||[]).forEach(t => {
      if(t.text && t.text.toLowerCase().includes(term)){
        results.push({type:'todo', text:t.text, ds, done:t.done});
      }
    });
  });

  if(!results.length){
    resultsEl.innerHTML = '<div style="padding:8px;color:var(--muted);font-size:13px">Sonuç bulunamadı.</div>';
    return;
  }

  resultsEl.innerHTML = results.slice(0,20).map(r => {
    if(r.type==='special'){
      return `<div class="cal-search-item" style="cursor:default">
        <span style="font-size:11px;color:var(--muted)">${r.label}</span>
        <div style="font-size:13px">${esc(r.text)}</div>
      </div>`;
    }
    const [y,m,d] = r.ds.split('-');
    const dateStr = d+' '+TR_M[parseInt(m)-1]+' '+y;
    const icon = r.type==='note' ? '📝' : (r.done?'✅':'☐');
    return `<div class="cal-search-item" onclick="calGoToDate('${r.ds}')" style="cursor:pointer">
      <span style="font-size:11px;color:var(--muted)">${icon} ${dateStr}</span>
      <div style="font-size:13px">${esc(r.text)}</div>
    </div>`;
  }).join('');
}

function calGoToDate(ds){
  const [y,m] = ds.split('-');
  calY = parseInt(y);
  calM = parseInt(m)-1;
  renderCal();
  setTimeout(()=>selectCalDay(ds), 50);
  // Arama panelini kapat
  const resultsEl = document.getElementById('cal-search-results');
  if(resultsEl) resultsEl.innerHTML='';
  const inp = document.getElementById('cal-search-input');
  if(inp) inp.value='';
}

// ── TO-DO LİSTESİ ───────────────────────────────────────────────

function todoEnter(){
  const btn = document.getElementById('todo-add-btn');
  if(btn && btn.textContent==='Güncelle') btn.onclick();
  else addTodo();
}

function addTodo(){
  if(!calSel) return;
  const inp = document.getElementById('todo-input');
  const text = inp.value.trim();
  if(!text) return;
  const todos = getTodos();
  if(!todos[calSel]) todos[calSel]=[];
  todos[calSel].push({text, done:false});
  setTodos(todos);
  inp.value='';
  renderTodos(calSel);
  renderCal();
}

function toggleTodo(i){
  if(!calSel) return;
  const todos = getTodos();
  if(!todos[calSel]) return;
  todos[calSel][i].done = !todos[calSel][i].done;
  setTodos(todos);
  renderTodos(calSel);
  renderCal();
}

function delTodo(i){
  if(!calSel) return;
  const todos = getTodos();
  if(!todos[calSel]) return;
  todos[calSel].splice(i,1);
  if(!todos[calSel].length) delete todos[calSel];
  setTodos(todos);
  renderTodos(calSel);
  renderCal();
}

function editTodo(i){
  if(!calSel) return;
  const todos = getTodos();
  if(!todos[calSel]) return;
  const inp = document.getElementById('todo-input');
  inp.value = todos[calSel][i].text;
  inp.focus();
  const btn = document.getElementById('todo-add-btn');
  if(btn){ btn.textContent='Güncelle'; btn.onclick=()=>saveTodoEdit(i); }
}

function saveTodoEdit(i){
  if(!calSel) return;
  const inp = document.getElementById('todo-input');
  const text = inp.value.trim();
  if(!text) return;
  const todos = getTodos();
  if(!todos[calSel]) return;
  todos[calSel][i].text = text;
  setTodos(todos);
  inp.value='';
  const btn = document.getElementById('todo-add-btn');
  if(btn){ btn.textContent='Ekle'; btn.onclick=addTodo; }
  renderTodos(calSel);
  renderCal();
}

function renderTodos(ds){
  const el = document.getElementById('todo-list');
  const counter = document.getElementById('todo-counter');
  if(!el) return;
  const list = (getTodos()[ds]||[]);
  const done = list.filter(t=>t.done).length;
  if(counter) counter.textContent = list.length ? done+'/'+list.length+' tamamlandı' : '';
  if(!list.length){
    el.innerHTML='<div style="color:var(--muted);font-size:12px;padding:4px 0">Görev yok</div>';
    return;
  }
  el.innerHTML = list.map((t,i)=>`
    <div class="todo-item ${t.done?'done':''}">
      <div class="todo-check ${t.done?'done':''}" onclick="toggleTodo(${i})">${t.done?'✓':''}</div>
      <span class="todo-text ${t.done?'done':''}">${esc(t.text)}</span>
      <button onclick="editTodo(${i})" style="background:transparent;border:none;cursor:pointer;font-size:13px;color:var(--accent);opacity:.7;padding:0 3px;flex-shrink:0">✎</button>
      <button class="todo-del" onclick="delTodo(${i})">×</button>
    </div>`).join('');
}

// ── NOTLAR ──────────────────────────────────────────────────────

function saveCalNote(){
  const val = document.getElementById('note-ta').value.trim();
  if(!val || !calSel) return;
  const notes = getCalNotes();
  if(!Array.isArray(notes[calSel])) notes[calSel]=[];
  const entry = {text:val, color:calNoteColor};
  if(calNoteEditIdx>=0) notes[calSel][calNoteEditIdx]=entry;
  else notes[calSel].push(entry);
  setCalNotes(notes);
  calNoteEditIdx=-1;
  document.getElementById('note-ta').value='';
  const lbl=document.getElementById('cal-note-lbl');
  if(lbl) lbl.textContent='Yeni not ekle';
  calNoteColor='#3a7bd5';
  setCalNoteColor('#3a7bd5');
  renderCal();
  renderCalSide(calSel);
  const msg=document.getElementById('note-saved');
  if(msg){ msg.style.opacity='1'; setTimeout(()=>msg.style.opacity='0',1800); }
}

function cancelCalNote(){
  calNoteEditIdx=-1;
  const ta=document.getElementById('note-ta');
  if(ta) ta.value='';
  const lbl=document.getElementById('cal-note-lbl');
  if(lbl) lbl.textContent='Yeni not ekle';
  calNoteColor='#3a7bd5';
  setCalNoteColor('#3a7bd5');
}

function editCalNote(i){
  const notes=getCalNotes();
  const nts=notes[calSel]||[];
  const n=nts[i];
  const nt=typeof n==='object'?n.text:n;
  const nc=typeof n==='object'?n.color:'#3a7bd5';
  calNoteEditIdx=i;
  const ta=document.getElementById('note-ta');
  if(ta){ ta.value=nt||''; ta.focus(); }
  const lbl=document.getElementById('cal-note-lbl');
  if(lbl) lbl.textContent='Notu düzenle';
  calNoteColor=nc;
  setCalNoteColor(nc);
}

function delCalNote(i){
  const notes=getCalNotes();
  const nts=notes[calSel]||[];
  nts.splice(i,1);
  if(!nts.length) delete notes[calSel];
  else notes[calSel]=nts;
  setCalNotes(notes);
  renderCal();
  renderCalSide(calSel);
}

function setCalNoteColor(c){
  calNoteColor=c;
  document.querySelectorAll('#cal-color-picker [data-color]').forEach(el=>{
    el.style.border = el.getAttribute('data-color')===c ? '2px solid var(--text)' : '2px solid transparent';
  });
}

// ── MEDYA ────────────────────────────────────────────────────────────

function getCalMedia(){ try{ return JSON.parse(localStorage.getItem('gn_media')||'{}') }catch(e){ return {} } }
function setCalMedia(o){ localStorage.setItem('gn_media',JSON.stringify(o)); window.saveToFirestore&&window.saveToFirestore(); }

function addCalMedia(event){
  const files = Array.from(event.target.files);
  if(!files.length || !calSel) return;

  const media = getCalMedia();
  if(!media[calSel]) media[calSel] = [];

  let loaded = 0;
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      media[calSel].push({
        type: file.type.startsWith('video') ? 'video' : 'image',
        data: e.target.result,
        name: file.name
      });
      loaded++;
      if(loaded === files.length){
        setCalMedia(media);
        renderCalMedia(calSel);
      }
    };
    reader.readAsDataURL(file);
  });

  // Input'u sıfırla
  event.target.value = '';
}

function delCalMedia(i){
  const media = getCalMedia();
  if(!media[calSel]) return;
  media[calSel].splice(i,1);
  if(!media[calSel].length) delete media[calSel];
  setCalMedia(media);
  renderCalMedia(calSel);
}

function renderCalMedia(ds){
  const el = document.getElementById('cal-media-list');
  if(!el) return;
  const media = getCalMedia();
  const list = media[ds] || [];

  if(!list.length){
    el.innerHTML = '<div style="font-size:12px;color:var(--muted)">Henüz medya yok.</div>';
    return;
  }

  el.innerHTML = list.map((m,i) => `
    <div style="position:relative;display:inline-block">
      ${m.type==='video'
        ? `<video src="${m.data}" style="width:120px;height:90px;border-radius:8px;object-fit:cover;border:0.5px solid var(--border)" controls></video>`
        : `<img src="${m.data}" style="width:120px;height:90px;border-radius:8px;object-fit:cover;border:0.5px solid var(--border);cursor:pointer" onclick="if(!calMediaEditMode)openMediaFull('${ds}',${i})">`
      }
      ${calMediaEditMode ? `<button onclick="delCalMedia(${i})" style="position:absolute;top:3px;right:3px;background:rgba(192,57,43,.85);border:none;color:#fff;border-radius:50%;width:22px;height:22px;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;font-weight:bold">×</button>` : ''}
    </div>`).join('');
}

function openMediaFull(ds, i){
  const media = getCalMedia();
  const m = (media[ds]||[])[i];
  if(!m) return;
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:pointer';
  overlay.onclick = () => overlay.remove();
  overlay.innerHTML = `<img src="${m.data}" style="max-width:90vw;max-height:90vh;border-radius:12px;object-fit:contain">`;
  document.body.appendChild(overlay);
}

// ── MEDYA DÜZENLEME MODU ────────────────────────────────────────────
let calMediaEditMode = false;

function toggleMediaEdit(){
  calMediaEditMode = !calMediaEditMode;
  const btn = document.getElementById('media-edit-btn');
  if(btn){
    btn.textContent = calMediaEditMode ? 'Bitti' : 'Düzenle';
    btn.style.background = calMediaEditMode ? 'rgba(192,57,43,.15)' : '';
    btn.style.color = calMediaEditMode ? '#c0392b' : '';
    btn.style.borderColor = calMediaEditMode ? '#c0392b' : '';
  }
  renderCalMedia(calSel);
}
