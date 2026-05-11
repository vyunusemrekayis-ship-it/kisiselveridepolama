// FILMS.JS

async function fetchPoster(name){
  if(posterCache[name]!==undefined)return posterCache[name];
  try{
    const res=await fetch(`https://www.omdbapi.com/?t=${encodeURIComponent(name)}&apikey=${OMDB_KEY}`);
    const data=await res.json();
    const url=(data.Poster&&data.Poster!=='N/A')?data.Poster.replace(/SX\d+/,'SX1000').replace('http://','https://'):null;
    posterCache[name]=url;
    return url;
  }catch(e){posterCache[name]=null;return null;}
}


function renderFilms(){
  const fc=document.getElementById('film-counter');if(fc)fc.textContent=db.f.length;
  const sorted=db.f.map((f,i)=>({f,i})).sort((a,b)=>{
    const da=a.f.date||'';const db2=b.f.date||'';
    if(da&&db2)return db2.localeCompare(da);
    if(da)return -1;if(db2)return 1;return 0;
  });
  const el=document.getElementById('film-list');
  if(!el)return;
  el.innerHTML=sorted.length?sorted.map(({f,i})=>{
    const poster=posterCache[f.name];
    const posterHtml=poster
      ?`<img src="${poster}" alt="${esc(f.name)}" style="width:100%;display:block;border-radius:8px 8px 0 0;object-fit:contain;background:#111;max-height:320px">`
      :`<div style="width:100%;height:180px;background:var(--surface2);border-radius:8px 8px 0 0;display:flex;align-items:center;justify-content:center;font-size:40px">🎬</div>`;
    return `<div class="card">
      ${posterHtml}
      <div style="padding:12px 13px">
        <div class="card-top"><div style="flex:1;min-width:0">
          <div class="card-title">${esc(f.name)}</div>
          <div class="card-meta">${[f.dir,fmtDate(f.date)].filter(Boolean).join(' · ')}</div>
        </div><div class="card-actions">
          <button class="del-btn" style="font-size:13px;color:var(--accent);opacity:.7" onclick="editFilm(${i})">✎</button>
          <button class="del-btn" onclick="del('f',${i})">×</button>
        </div></div>
        ${f.note?`<div class="card-note">${esc(f.note)}</div>`:''}
      </div>
    </div>`;
  }).join('')
    :`<div class="empty"><div class="empty-icon">🎬</div>Henüz film eklemediniz</div>`;

  // Posterleri arka planda yükle
  sorted.forEach(({f})=>{
    if(posterCache[f.name]===undefined){
      fetchPoster(f.name).then(url=>{
        if(url)renderFilms();
      });
    }
  });
}






function editFilm(i){const f=db.f[i];set('f-name',f.name);set('f-dir',f.dir||'');set('f-date',f.date||'');set('f-note',f.note||'');editingFilm=i;document.getElementById('ff-save-btn').textContent='Güncelle';document.getElementById('ff').style.display='block';document.getElementById('ff').scrollIntoView({behavior:'smooth',block:'start'});}

function addFilm(){
  const name=v('f-name').trim();if(!name){alert('Film adı zorunludur');return}
  const film={name,dir:v('f-dir').trim(),date:v('f-date'),note:v('f-note').trim()};
  if(editingFilm>=0){db.f[editingFilm]=film;editingFilm=-1;}else{db.f.unshift(film);}
  ['f-name','f-dir','f-date','f-note'].forEach(id=>set(id,''));
  const dirEl=document.getElementById('f-dir');
  if(dirEl)dirEl.placeholder='Otomatik doldur →';
  document.getElementById('ff').style.display='none';document.getElementById('ff-save-btn').textContent='Kaydet';save();
}

function cancelFilmForm(){
  editingFilm=-1;
  ['f-name','f-dir','f-date','f-note'].forEach(id=>set(id,''));
  const dirEl=document.getElementById('f-dir');
  if(dirEl)dirEl.placeholder='Otomatik doldur →';
  document.getElementById('ff').style.display='none';
  document.getElementById('ff-save-btn').textContent='Kaydet';
}

// Film ve kitap veritabanı (offline)
// API KEY - Buraya kendi key'inizi yazın
window.ANTHROPIC_KEY='';

async function autoFillFilm(nameId,dirId){
  const nameEl=document.getElementById(nameId);
  const dirEl=document.getElementById(dirId);
  if(!nameEl||!dirEl)return;
  const name=nameEl.value.trim();
  if(!name)return;
  const loadEl=document.getElementById(dirId+'-loading');
  if(loadEl)loadEl.style.display='inline';
  dirEl.placeholder='Aranıyor...';
  dirEl.value='';
  await window.loadApiKey&&window.loadApiKey();
  try{
    const res=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'x-api-key':window.ANTHROPIC_KEY,
        'anthropic-version':'2023-06-01',
        'anthropic-dangerous-direct-browser-access':'true'
      },
      body:JSON.stringify({
        model:'claude-haiku-4-5-20251001',
        max_tokens:60,
        messages:[{role:'user',content:`"${name}" filminin yönetmeni kimdir? Sadece yönetmenin adını yaz, başka hiçbir şey ekleme.`}]
      })
    });
    const data=await res.json();
    const text=data?.content?.[0]?.text?.trim();
    if(text)dirEl.value=text;
    else dirEl.placeholder='Bulunamadı, elle yazın';
  }catch(e){dirEl.placeholder='Bulunamadı, elle yazın';}
  if(loadEl)loadEl.style.display='none';
}


function switchFilmTab(tab,btn){
  document.querySelectorAll('#ftab-watched,#ftab-watchlist').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('#ft-watched,#ft-watchlist').forEach(c=>c.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('ft-'+tab).classList.add('active');
}

function getWl(){try{return JSON.parse(localStorage.getItem('gn_wl')||'[]')}catch(e){return[]}}

function saveWl(d){localStorage.setItem('gn_wl',JSON.stringify(d));window.saveToFirestore&&window.saveToFirestore();}
let editingWl=-1;

function addWatchlist(){
  const name=v('wl-name').trim();if(!name){alert('Film adı zorunludur');return}
  const film={name,dir:v('wl-dir').trim()};
  const wl=getWl();
  if(editingWl>=0){wl[editingWl]=film;editingWl=-1;}else{wl.unshift(film);}
  saveWl(wl);['wl-name','wl-dir'].forEach(id=>set(id,''));
  document.getElementById('wlf').style.display='none';document.getElementById('wlf-save-btn').textContent='Kaydet';
  renderWatchlist();
}

function cancelWlForm(){
  editingWl=-1;['wl-name','wl-dir'].forEach(id=>set(id,''));
  document.getElementById('wlf').style.display='none';document.getElementById('wlf-save-btn').textContent='Kaydet';
}

function editWl(i){
  const wl=getWl();const f=wl[i];
  set('wl-name',f.name);set('wl-dir',f.dir||'');
  editingWl=i;document.getElementById('wlf-save-btn').textContent='Güncelle';
  document.getElementById('wlf').style.display='block';
}

function delWl(i){const wl=getWl();wl.splice(i,1);saveWl(wl);renderWatchlist();}

function moveToWatched(i){
  const wl=getWl();const f=wl[i];
  set('f-name',f.name);set('f-dir',f.dir||'');set('f-note',f.note||'');
  wl.splice(i,1);saveWl(wl);renderWatchlist();
  switchFilmTab('watched',document.getElementById('ftab-watched'));
  document.getElementById('ff').style.display='block';
}

function renderWatchlist(){
  const wl=getWl();
  const counter=document.getElementById('wl-counter');if(counter)counter.textContent=wl.length;
  const el=document.getElementById('watchlist-list');if(!el)return;
  el.innerHTML=wl.length?wl.map((f,i)=>{
    const poster=posterCache[f.name];
    const posterHtml=poster
      ?`<img src="${poster}" alt="${esc(f.name)}" style="width:100%;display:block;border-radius:8px 8px 0 0;object-fit:contain;background:#111;max-height:320px">`
      :`<div style="width:100%;height:180px;background:var(--surface2);border-radius:8px 8px 0 0;display:flex;align-items:center;justify-content:center;font-size:40px">🎬</div>`;
    return `<div class="card">
      ${posterHtml}
      <div style="padding:12px 13px">
        <div class="card-top"><div style="flex:1;min-width:0">
          <div class="card-title">${esc(f.name)}</div>
          <div class="card-meta">${f.dir?esc(f.dir):''}</div>
        </div><div class="card-actions">
          <button class="del-btn" style="font-size:13px;color:#237F52;opacity:.9" onclick="moveToWatched(${i})" title="İzledim — taşı">✓</button>
          <button class="del-btn" style="font-size:13px;color:var(--accent);opacity:.7" onclick="editWl(${i})">✎</button>
          <button class="del-btn" onclick="delWl(${i})">×</button>
        </div></div>
      </div>
    </div>`;
  }).join('')
    :`<div class="empty"><div class="empty-icon">🎬</div>İzleyecek film listesi boş</div>`;

  // Posterleri arka planda yükle
  wl.forEach(f=>{
    if(posterCache[f.name]===undefined){
      fetchPoster(f.name).then(url=>{
        if(url)renderWatchlist();
      });
    }
  });
}

