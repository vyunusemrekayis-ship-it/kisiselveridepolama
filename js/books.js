// BOOKS.JS

function renderBooks(){
  const bc=document.getElementById('book-counter');if(bc)bc.textContent=db.b.length;
  const sorted=db.b.map((b,i)=>({b,i})).sort((a,b)=>{
    const da=a.b.end||a.b.start||'';const db2=b.b.end||b.b.start||'';
    if(da&&db2)return db2.localeCompare(da);
    if(da)return -1;if(db2)return 1;return 0;
  });
  const el=document.getElementById('book-list');
  if(!el)return;
  el.innerHTML=sorted.length?sorted.map(({b,i})=>{

    return `<div class="card">
      <div style="padding:12px 13px">
        <div class="card-top"><div style="flex:1;min-width:0">
          <div class="card-title">${esc(b.name)}</div>
          <div class="card-meta">${[b.author,b.pages?b.pages+' sf.':''].filter(Boolean).join(' · ')}</div>
          ${b.start||b.end?`<div class="card-meta">${[b.start?'Başlangıç: '+fmtDate(b.start):'',b.end?'Bitiş: '+fmtDate(b.end):''].filter(Boolean).join(' · ')}</div>`:''}
        </div><div class="card-actions">
          <button class="del-btn" style="font-size:13px;color:var(--accent);opacity:.7" onclick="editBook(${i})">✎</button>
          <button class="del-btn" onclick="del('b',${i})">×</button>
        </div></div>
        ${b.note?`<div class="card-note">${esc(b.note)}</div>`:''}
      </div>
    </div>`;
  }).join('')
    :`<div class="empty"><div class="empty-icon">📚</div>Henüz kitap eklemediniz</div>`;
}


function editBook(i){const b=db.b[i];set('b-name',b.name);set('b-author',b.author||'');set('b-pages',b.pages||'');set('b-start',b.start||'');set('b-end',b.end||'');set('b-note',b.note||'');editingBook=i;document.getElementById('bf-save-btn').textContent='Güncelle';document.getElementById('bf').style.display='block';document.getElementById('bf').scrollIntoView({behavior:'smooth',block:'start'});}

function addBook(){
  const name=v('b-name').trim();if(!name){alert('Kitap adı zorunludur');return}
  const book={name,author:v('b-author').trim(),pages:v('b-pages'),start:v('b-start'),end:v('b-end'),note:v('b-note').trim()};
  if(editingBook>=0){db.b[editingBook]=book;editingBook=-1;}else{db.b.unshift(book);}
  ['b-name','b-author','b-pages','b-start','b-end','b-note'].forEach(id=>set(id,''));
  const authorEl=document.getElementById('b-author');
  if(authorEl)authorEl.placeholder='Otomatik doldur →';
  document.getElementById('bf').style.display='none';document.getElementById('bf-save-btn').textContent='Kaydet';save();
}

function cancelBookForm(){editingBook=-1;['b-name','b-author','b-pages','b-start','b-end','b-note'].forEach(id=>set(id,''));document.getElementById('bf').style.display='none';document.getElementById('bf-save-btn').textContent='Kaydet';}


async function autoFillBook(nameId,authorId,pagesId){
  const nameEl=document.getElementById(nameId);
  const authorEl=document.getElementById(authorId);
  if(!nameEl||!authorEl)return;
  const name=nameEl.value.trim();
  if(!name)return;
  const loadEl=document.getElementById(authorId+'-loading');
  if(loadEl)loadEl.style.display='inline';
  authorEl.placeholder='Aranıyor...';
  authorEl.value='';
  const pagesEl=pagesId?document.getElementById(pagesId):null;
  if(pagesEl)pagesEl.value='';
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
        max_tokens:100,
        messages:[{role:'user',content:pagesId
          ?`"${name}" kitabının orijinal yazarı kimdir? Çevirmeni değil, orijinal yazarı ver. Türkçe çeviri olsa bile orijinal yazarı yaz. Sadece JSON: {"author":"Ad Soyad","pages":123} pages bilinmiyorsa null.`
          :`"${name}" kitabının orijinal yazarı kimdir? Çevirmeni değil orijinal yazarı yaz. Sadece isim.`}]
      })
    });
    const data=await res.json();
    const text=data?.content?.[0]?.text?.trim();
    if(text){
      if(pagesId){
        try{
          const clean=text.replace(/```json|```/g,'').replace(/[\u201c\u201d]/g,'"').trim();
          const jsonMatch=clean.match(/\{[\s\S]*?\}/);
          const obj=JSON.parse(jsonMatch?jsonMatch[0]:clean);
          if(obj.author)authorEl.value=obj.author;
          if(obj.pages){const pEl=document.getElementById(pagesId);if(pEl)pEl.value=obj.pages;}
        }catch(e){
          const authorMatch=text.match(/"author"\s*:\s*"([^"]+)"/);
          if(authorMatch)authorEl.value=authorMatch[1];
          else authorEl.value=text.split('\n')[0].replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ\s]/g,'').trim();
        }
      }else authorEl.value=text;
    }else authorEl.placeholder='Bulunamadı, elle yazın';
  }catch(e){authorEl.placeholder='Bulunamadı, elle yazın';}
  if(loadEl)loadEl.style.display='none';
}


function switchBookTab(tab,btn){
  document.querySelectorAll('#btab-read,#btab-readlist').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('#bt-read,#bt-readlist').forEach(c=>c.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('bt-'+tab).classList.add('active');
}

function getRl(){try{return JSON.parse(localStorage.getItem('gn_rl')||'[]')}catch(e){return[]}}

function saveRl(d){localStorage.setItem('gn_rl',JSON.stringify(d));window.saveToFirestore&&window.saveToFirestore();}
let editingRl=-1;

function addReadlist(){
  const name=v('rl-name').trim();if(!name){alert('Kitap adı zorunludur');return}
  const book={name,author:v('rl-author').trim()};
  const rl=getRl();
  if(editingRl>=0){rl[editingRl]=book;editingRl=-1;}else{rl.unshift(book);}
  saveRl(rl);['rl-name','rl-author'].forEach(id=>set(id,''));
  document.getElementById('rlf').style.display='none';document.getElementById('rlf-save-btn').textContent='Kaydet';
  renderReadlist();
}

function cancelRlForm(){
  editingRl=-1;['rl-name','rl-author'].forEach(id=>set(id,''));
  document.getElementById('rlf').style.display='none';document.getElementById('rlf-save-btn').textContent='Kaydet';
}

function editRl(i){
  const rl=getRl();const b=rl[i];
  set('rl-name',b.name);set('rl-author',b.author||'');
  editingRl=i;document.getElementById('rlf-save-btn').textContent='Güncelle';
  document.getElementById('rlf').style.display='block';
}

function delRl(i){const rl=getRl();rl.splice(i,1);saveRl(rl);renderReadlist();}

function moveToRead(i){
  const rl=getRl();const b=rl[i];
  set('b-name',b.name);set('b-author',b.author||'');
  rl.splice(i,1);saveRl(rl);renderReadlist();
  switchBookTab('read',document.getElementById('btab-read'));
  document.getElementById('bf').style.display='block';
}

function renderReadlist(){
  const rl=getRl();
  const counter=document.getElementById('rl-counter');if(counter)counter.textContent=rl.length;
  const el=document.getElementById('readlist-list');if(!el)return;
  el.innerHTML=rl.length?rl.map((b,i)=>{

    return `<div class="card">
      <div style="padding:12px 13px">
        <div class="card-top"><div style="flex:1;min-width:0">
          <div class="card-title">${esc(b.name)}</div>
          <div class="card-meta">${b.author?esc(b.author):''}</div>
        </div><div class="card-actions">
          <button class="del-btn" style="font-size:13px;color:#237F52;opacity:.9" onclick="moveToRead(${i})" title="Okudum — taşı">✓</button>
          <button class="del-btn" style="font-size:13px;color:var(--accent);opacity:.7" onclick="editRl(${i})">✎</button>
          <button class="del-btn" onclick="delRl(${i})">×</button>
        </div></div>
      </div>
    </div>`;
  }).join('')
    :`<div class="empty"><div class="empty-icon">📚</div>Okuyacak kitap listesi boş</div>`;
}

