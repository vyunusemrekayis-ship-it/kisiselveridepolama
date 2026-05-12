// ── CALENDAR.JS ──────────────────────────────────────────────────────

// Özel günler verisi
const SP = [
  // Resmi Tatiller
  {k:'01-01',n:'Yılbaşı',t:'h'},
  {k:'04-23',n:'Ulusal Egemenlik ve Çocuk Bayramı',t:'h'},
  {k:'05-01',n:'Emek ve Dayanışma Bayramı',t:'h'},
  {k:'05-19',n:"Atatürk'ü Anma, Gençlik ve Spor Bayramı",t:'h'},
  {k:'07-15',n:'Demokrasi ve Millî Birlik Günü',t:'h'},
  {k:'08-30',n:'Zafer Bayramı',t:'h'},
  {k:'10-29',n:'Cumhuriyet Bayramı',t:'h'},
  // Dini Bayramlar
  {k:'03-30',n:'Ramazan Bayramı 1. Gün',t:'r',y:[2025]},
  {k:'03-31',n:'Ramazan Bayramı 2. Gün',t:'r',y:[2025]},
  {k:'04-01',n:'Ramazan Bayramı 3. Gün',t:'r',y:[2025]},
  {k:'03-20',n:'Ramazan Bayramı 1. Gün',t:'r',y:[2026]},
  {k:'03-21',n:'Ramazan Bayramı 2. Gün',t:'r',y:[2026]},
  {k:'03-22',n:'Ramazan Bayramı 3. Gün',t:'r',y:[2026]},
  {k:'06-06',n:'Kurban Bayramı 1. Gün',t:'r',y:[2025]},
  {k:'06-07',n:'Kurban Bayramı 2. Gün',t:'r',y:[2025]},
  {k:'06-08',n:'Kurban Bayramı 3. Gün',t:'r',y:[2025]},
  {k:'06-09',n:'Kurban Bayramı 4. Gün',t:'r',y:[2025]},
  {k:'05-27',n:'Kurban Bayramı 1. Gün',t:'r',y:[2026]},
  {k:'05-28',n:'Kurban Bayramı 2. Gün',t:'r',y:[2026]},
  {k:'05-29',n:'Kurban Bayramı 3. Gün',t:'r',y:[2026]},
  {k:'05-30',n:'Kurban Bayramı 4. Gün',t:'r',y:[2026]},
  // Uluslararası
  {k:'02-14',n:'Sevgililer Günü',t:'i'},
  {k:'03-08',n:'Dünya Kadınlar Günü',t:'i'},
  {k:'04-22',n:'Dünya Günü',t:'i'},
  {k:'06-01',n:'Dünya Çocuklar Günü',t:'i'},
  {k:'10-05',n:'Dünya Öğretmenler Günü',t:'i'},
  {k:'10-31',n:'Cadılar Bayramı',t:'i'},
  {k:'12-25',n:'Noel',t:'i'},
  {k:'12-31',n:'Yılbaşı Gecesi',t:'i'},
];

const SP_COLORS = { h:'#e53935', r:'#8e44ad', i:'#1565c0' };
const SP_LABELS = { h:'Resmi Tatil', r:'Dini Bayram', i:'Uluslararası' };

// ── VERİ FONKSİYONLARI ───────────────────────────────────────────────

function getTodos(){ try{ return JSON.parse(localStorage.getItem('gn_todos')||'{}') }catch(e){ return {} } }
function setTodos(o){ localStorage.setItem('gn_todos',JSON.stringify(o)); window.saveToFirestore&&window.saveToFirestore(); }

function getCalNotes(){ try{ return JSON.parse(localStorage.getItem('gn_notes')||'{}') }catch(e){ return {} } }
function setCalNotes(o){ localStorage.setItem('gn_notes',JSON.stringify(o)); window.saveToFirestore&&window.saveToFirestore(); }

function getSpecial(ds){
  const [y,m,d] = ds.split('-');
  const k = m+'-'+d;
  const yr = parseInt(y);
  return SP.filter(s => s.k===k && (!s.y || s.y.includes(yr)));
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

// ── TAKVİM STATE ─────────────────────────────────────────────────────

let calY = new Date().getFullYear();
let calM = new Date().getMonth();
let calSel = null;
let calNoteEditIdx = -1;
let calNoteColor = '#3a7bd5';
let calSearchMode = false;

// ── TAKVİM RENDER ────────────────────────────────────────────────────

function calMove(dir){
  calM += dir;
  if(calM < 0){ calM = 11; calY--; }
  if(calM > 11){ calM = 0; calY++; }
  renderCal();
}

function calGoToday(){
  calY = new Date().getFullYear();
  calM = new Date().getMonth();
  renderCal();
}

function renderCal(){
  const monthEl = document.getElementById('cal-month');
  if(monthEl) monthEl.textContent = TR_M[calM] + ' ' + calY;

  const first = (new Date(calY, calM, 1).getDay() + 6) % 7;
  const dim = new Date(calY, calM+1, 0).getDate();
  const prev = new Date(calY, calM, 0).getDate();
  const today = todayStr();
  const notes = getCalNotes();
  const todos = getTodos();

  const grid = document.getElementById('cal-days');
  if(!grid) return;
  grid.innerHTML = '';

  // Önceki ay günleri
  for(let i = first-1; i >= 0; i--){
    const c = document.createElement('div');
    c.className = 'cal-day other';
    c.innerHTML = `<span class="day-num">${prev-i}</span>`;
    grid.appendChild(c);
  }

  // Bu ayın günleri
  for(let d = 1; d <= dim; d++){
    const ds = calY+'-'+String(calM+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    const sp = getSpecial(ds);
    const isH = sp.some(s => s.t==='h');
    const isR = sp.some(s => s.t==='r');
    const isI = sp.some(s => s.t==='i');

    const nts = Array.isArray(notes[ds]) ? notes[ds] : (notes[ds] ? [notes[ds]] : []);
    const tdList = todos[ds] || [];
    const hasTodo = tdList.length > 0;
    const allDone = hasTodo && tdList.every(t => t.done);

    const c = document.createElement('div');
    let cls = 'cal-day';
    if(ds === today) cls += ' today';
    if(ds === calSel) cls += ' selected';
    if(isH) cls += ' is-holiday';
    else if(isR) cls += ' is-religious';
    else if(isI) cls += ' is-intl';
    c.className = cls;

    // Gün numarası
    const num = document.createElement('span');
    num.className = 'day-num';
    num.textContent = d;
    c.appendChild(num);

    // Noktalar
    const dots = [];
    if(isH) dots.push('#e53935');
    else if(isR) dots.push('#8e44ad');
    else if(isI) dots.push('#1565c0');
    nts.forEach(n => dots.push(typeof n==='object' ? n.color : '#3a7bd5'));
    if(hasTodo) dots.push(allDone ? '#237F52' : 'var(--accent)');

    if(dots.length){
      const dr = document.createElement('div');
      dr.className = 'dot-row';
      dots.slice(0,4).forEach(color => {
        const dot = document.createElement('span');
        dot.className = 'dot';
        dot.style.background = color;
        dr.appendChild(dot);
      });
      c.appendChild(dr);
    }

    c.onclick = () => selectCalDay(ds);
    grid.appendChild(c);
  }

  // Sonraki ay günleri
  const tot = first + dim;
  const rem = tot % 7 === 0 ? 0 : 7 - (tot % 7);
  for(let d = 1; d <= rem; d++){
    const c = document.createElement('div');
    c.className = 'cal-day other';
    c.innerHTML = `<span class="day-num">${d}</span>`;
    grid.appendChild(c);
  }

  renderSpList();
  if(calSel) renderCalSide(calSel);
}

// ── GÜN SEÇİMİ ───────────────────────────────────────────────────────

function selectCalDay(ds){
  calSel = ds;
  calNoteEditIdx = -1;
  calNoteColor = '#3a7bd5';

  const panel = document.getElementById('cal-day-panel');
  if(panel) panel.style.display = 'block';

  const ta = document.getElementById('note-ta');
  if(ta) ta.value = '';

  const lbl = document.getElementById('cal-note-lbl');
  if(lbl) lbl.textContent = 'Not ekle';

  setCalNoteColor('#3a7bd5');
  renderCal();
  renderCalSide(ds);
  renderTodos(ds);
}

function renderCalSide(ds){
  const [y, m, d] = ds.split('-');
  const lbl = document.getElementById('cal-sel-lbl');
  if(lbl){
    const weekDay = TR_D[new Date(ds+'T00:00:00').getDay()];
    lbl.textContent = weekDay + ', ' + d + ' ' + TR_M[parseInt(m)-1] + ' ' + y;
  }

  const sp = getSpecial(ds);
  const notes = getCalNotes();
  const nts = Array.isArray(notes[ds]) ? notes[ds] : (notes[ds] ? [notes[ds]] : []);

  let html = '';

  // Özel günler
  sp.forEach(s => {
    html += `<div class="cal-item" style="border-left-color:${SP_COLORS[s.t]||'var(--accent)'}">
      <div class="cal-item-title">${esc(s.n)}</div>
      <div class="cal-item-sub">${SP_LABELS[s.t]||''}</div>
    </div>`;
  });

  // O güne eklenen filmler
  db.f.filter(x => x.date===ds).forEach(x => {
    html += `<div class="cal-item" style="border-left-color:var(--film-l)">
      <div class="cal-item-title">${esc(x.name)}</div>
      <div class="cal-item-sub">🎬 Film</div>
    </div>`;
  });

  // O güne eklenen kitaplar
  db.b.filter(x => x.end===ds||x.start===ds).forEach(x => {
    html += `<div class="cal-item" style="border-left-color:var(--book-l)">
      <div class="cal-item-title">${esc(x.name)}</div>
      <div class="cal-item-sub">📚 ${x.start===ds?'Kitap Başlangıç':'Kitap Bitiş'}</div>
    </div>`;
  });

  // Notlar
  nts.forEach((n, i) => {
    const nt = typeof n==='object' ? n.text : n;
    const nc = typeof n==='object' ? n.color : '#3a7bd5';
    html += `<div class="cal-item" style="border-left-color:${nc}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px">
        <div style="flex:1">
          <div class="cal-item-sub" style="font-size:10px;margin-bottom:2px">📝 Not</div>
          <div class="cal-item-title" style="font-size:13px;line-height:1.4;white-space:pre-wrap">${esc(nt)}</div>
        </div>
        <div style="display:flex;gap:3px;flex-shrink:0">
          <button onclick="editCalNote(${i})" style="background:transparent;border:none;cursor:pointer;font-size:13px;color:var(--accent);padding:2px 4px">✎</button>
          <button onclick="delCalNote(${i})" style="background:transparent;border:none;cursor:pointer;font-size:15px;color:var(--muted2);padding:2px 4px">×</button>
        </div>
      </div>
    </div>`;
  });

  const el = document.getElementById('cal-items');
  if(el) el.innerHTML = html || '<div class="cal-empty">Bu gün için kayıt yok.</div>';

  const saved = document.getElementById('note-saved');
  if(saved) saved.style.opacity = '0';
}

function renderSpList(){
  const items = getSpecialMonth(calY, calM);
  const el = document.getElementById('sp-list');
  if(!el) return;

  if(!items.length){
    el.innerHTML = '<div class="cal-empty">Bu ayda özel gün yok.</div>';
    return;
  }

  const bc = {h:'spb-h', r:'spb-r', i:'spb-i'};
  el.innerHTML = items.map(s => `
    <div class="sp-item" onclick="selectCalDay('${s.ds}')" style="cursor:pointer">
      <div class="sp-date">${String(s.d).padStart(2,'0')} ${TR_M[calM].slice(0,3)}</div>
      <div>
        <div class="sp-name">${esc(s.n)}</div>
        <span class="sp-badge ${bc[s.t]||''}">${SP_LABELS[s.t]||s.t}</span>
      </div>
    </div>`).join('');
}

// ── NOT KAYDET ───────────────────────────────────────────────────────

function saveCalNote(){
  const val = document.getElementById('note-ta').value.trim();
  if(!val) return;
  const notes = getCalNotes();
  if(!Array.isArray(notes[calSel])) notes[calSel] = [];
  const entry = {text: val, color: calNoteColor};
  if(calNoteEditIdx >= 0){
    notes[calSel][calNoteEditIdx] = entry;
  } else {
    notes[calSel].push(entry);
  }
  setCalNotes(notes);
  calNoteEditIdx = -1;
  document.getElementById('note-ta').value = '';
  const lbl = document.getElementById('cal-note-lbl');
  if(lbl) lbl.textContent = 'Not ekle';
  calNoteColor = '#3a7bd5';
  setCalNoteColor('#3a7bd5');
  renderCal();
  const msg = document.getElementById('note-saved');
  if(msg){ msg.style.opacity='1'; setTimeout(()=>msg.style.opacity='0', 1800); }
}

function cancelCalNote(){
  calNoteEditIdx = -1;
  const ta = document.getElementById('note-ta');
  if(ta) ta.value = '';
  const lbl = document.getElementById('cal-note-lbl');
  if(lbl) lbl.textContent = 'Not ekle';
  calNoteColor = '#3a7bd5';
  setCalNoteColor('#3a7bd5');
}

function editCalNote(i){
  const notes = getCalNotes();
  const nts = notes[calSel] || [];
  const n = nts[i];
  const nt = typeof n==='object' ? n.text : n;
  const nc = typeof n==='object' ? n.color : '#3a7bd5';
  calNoteEditIdx = i;
  const ta = document.getElementById('note-ta');
  if(ta){ ta.value = nt||''; ta.focus(); }
  const lbl = document.getElementById('cal-note-lbl');
  if(lbl) lbl.textContent = 'Notu düzenle';
  calNoteColor = nc;
  setCalNoteColor(nc);
}

function delCalNote(i){
  const notes = getCalNotes();
  const nts = notes[calSel] || [];
  nts.splice(i, 1);
  if(nts.length === 0) delete notes[calSel];
  else notes[calSel] = nts;
  setCalNotes(notes);
  renderCal();
  renderCalSide(calSel);
}

function setCalNoteColor(c){
  calNoteColor = c;
  document.querySelectorAll('#cal-color-picker [data-color]').forEach(el => {
    el.style.border = el.getAttribute('data-color')===c ? '2px solid var(--text)' : '2px solid transparent';
  });
}

// ── TO-DO LİSTESİ ────────────────────────────────────────────────────

function addTodo(){
  const inp = document.getElementById('todo-input');
  const text = inp.value.trim();
  if(!text) return;
  const todos = getTodos();
  if(!todos[calSel]) todos[calSel] = [];
  todos[calSel].push({text, done:false});
  setTodos(todos);
  inp.value = '';
  renderTodos(calSel);
  renderCal();
}

function todoEnter(){
  const btn = document.getElementById('todo-add-btn');
  if(btn && btn.textContent === 'Güncelle') btn.onclick();
  else addTodo();
}

function toggleTodo(i){
  const todos = getTodos();
  if(!todos[calSel]) return;
  todos[calSel][i].done = !todos[calSel][i].done;
  setTodos(todos);
  renderTodos(calSel);
  renderCal();
}

function delTodo(i){
  const todos = getTodos();
  if(!todos[calSel]) return;
  todos[calSel].splice(i, 1);
  if(!todos[calSel].length) delete todos[calSel];
  setTodos(todos);
  renderTodos(calSel);
  renderCal();
}

function editTodo(i){
  const todos = getTodos();
  if(!todos[calSel]) return;
  const inp = document.getElementById('todo-input');
  inp.value = todos[calSel][i].text;
  inp.focus();
  const btn = document.getElementById('todo-add-btn');
  if(btn){ btn.textContent='Güncelle'; btn.onclick=()=>saveTodoEdit(i); }
}

function saveTodoEdit(i){
  const inp = document.getElementById('todo-input');
  const text = inp.value.trim();
  if(!text) return;
  const todos = getTodos();
  if(!todos[calSel]) return;
  todos[calSel][i].text = text;
  setTodos(todos);
  inp.value = '';
  const btn = document.getElementById('todo-add-btn');
  if(btn){ btn.textContent='Ekle'; btn.onclick=addTodo; }
  renderTodos(calSel);
  renderCal();
}

function renderTodos(ds){
  const todos = getTodos();
  const list = todos[ds] || [];
  const el = document.getElementById('todo-list');
  const counter = document.getElementById('todo-counter');
  if(!el) return;

  const done = list.filter(t => t.done).length;
  if(counter) counter.textContent = list.length ? `${done}/${list.length} tamamlandı` : '';

  if(!list.length){
    el.innerHTML = '<div style="font-size:12px;color:var(--muted);padding:6px 0">Henüz görev yok.</div>';
    return;
  }

  el.innerHTML = list.map((t, i) => `
    <div class="todo-item ${t.done?'done':''}">
      <div class="todo-check ${t.done?'done':''}" onclick="toggleTodo(${i})">${t.done?'✓':''}</div>
      <span class="todo-text ${t.done?'done':''}">${esc(t.text)}</span>
      <button onclick="editTodo(${i})" style="background:transparent;border:none;cursor:pointer;font-size:13px;color:var(--accent);opacity:.7;padding:0 3px;flex-shrink:0">✎</button>
      <button class="todo-del" onclick="delTodo(${i})">×</button>
    </div>`).join('');
}

// ── ARAMA ────────────────────────────────────────────────────────────

function calSearch(){
  const q = document.getElementById('cal-search-input').value.trim().toLowerCase();
  const resultsEl = document.getElementById('cal-search-results');
  if(!q){ resultsEl.innerHTML=''; return; }

  const notes = getCalNotes();
  const todos = getTodos();
  const results = [];

  // Notlarda ara
  Object.entries(notes).forEach(([ds, nts]) => {
    const ntArr = Array.isArray(nts) ? nts : [nts];
    ntArr.forEach(n => {
      const text = typeof n==='object' ? n.text : n;
      if(text && text.toLowerCase().includes(q)){
        results.push({ds, type:'not', text});
      }
    });
  });

  // To-do'larda ara
  Object.entries(todos).forEach(([ds, list]) => {
    list.forEach(t => {
      if(t.text && t.text.toLowerCase().includes(q)){
        results.push({ds, type:'todo', text:t.text, done:t.done});
      }
    });
  });

  // Özel günlerde ara
  SP.forEach(s => {
    if(s.n.toLowerCase().includes(q)){
      // Tüm yıllarda göster
      const year = new Date().getFullYear();
      const ds = year+'-'+s.k;
      results.push({ds, type:'special', text:s.n});
    }
  });

  // Tarihe göre sırala
  results.sort((a,b) => b.ds.localeCompare(a.ds));

  if(!results.length){
    resultsEl.innerHTML = '<div style="font-size:12px;color:var(--muted);padding:8px 0">Sonuç bulunamadı.</div>';
    return;
  }

  const icons = {not:'📝', todo:'✅', special:'⭐'};
  resultsEl.innerHTML = results.slice(0,20).map(r => {
    const [y,m,d] = r.ds.split('-');
    const dateStr = d+' '+TR_M[parseInt(m)-1]+' '+y;
    return `<div onclick="calJumpTo('${r.ds}')" style="padding:8px 10px;border-radius:8px;background:var(--surface);border:0.5px solid var(--border);cursor:pointer;margin-bottom:6px">
      <div style="font-size:11px;color:var(--muted);margin-bottom:2px">${icons[r.type]} ${dateStr}</div>
      <div style="font-size:13px${r.done?';text-decoration:line-through;color:var(--muted)':''}">${esc(r.text)}</div>
    </div>`;
  }).join('');
}

function calJumpTo(ds){
  const [y,m] = ds.split('-');
  calY = parseInt(y);
  calM = parseInt(m)-1;
  // Arama panelini kapat
  const sp = document.getElementById('cal-search-panel');
  if(sp) sp.style.display = 'none';
  const si = document.getElementById('cal-search-input');
  if(si) si.value = '';
  const sr = document.getElementById('cal-search-results');
  if(sr) sr.innerHTML = '';
  renderCal();
  selectCalDay(ds);
  // Takvimi görünür yap
  setTimeout(() => {
    const grid = document.getElementById('cal-grid-wrap');
    if(grid) grid.scrollIntoView({behavior:'smooth', block:'start'});
  }, 100);
}

function toggleCalSearch(){
  const sp = document.getElementById('cal-search-panel');
  if(!sp) return;
  const isOpen = sp.style.display !== 'none';
  sp.style.display = isOpen ? 'none' : 'block';
  if(!isOpen){
    const si = document.getElementById('cal-search-input');
    if(si){ si.value=''; si.focus(); }
    const sr = document.getElementById('cal-search-results');
    if(sr) sr.innerHTML = '';
  }
}
