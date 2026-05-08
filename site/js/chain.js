// CHAIN.JS

function getCh(){try{return JSON.parse(localStorage.getItem('gn_chains')||'[]')}catch(e){return[]}}

function saveCh(d){localStorage.setItem('gn_chains',JSON.stringify(d));window.saveToFirestore&&window.saveToFirestore();}

let chColor='#237F52', editingCh=-1;

function setChColor(c){
  chColor=c;
  document.querySelectorAll('#ch-color-picker [data-col]').forEach(el=>{
    el.style.border=el.getAttribute('data-col')===c?'2.5px solid var(--text)':'2px solid transparent';
  });
}

function saveChain(){
  const name=v('ch-name').trim();if(!name){alert('Zincir adı zorunludur');return}
  const count=parseInt(v('ch-count'));if(!count||count<1){alert('Zincir sayısı giriniz');return}
  const start=v('ch-start')||todayStr();
  const chs=getCh();
  const entry={name,count,start,color:chColor,done:[]};
  if(editingCh>=0){chs[editingCh]=entry;editingCh=-1;document.getElementById('chf-save-btn').textContent='Kaydet';}
  else chs.push(entry);
  saveCh(chs);
  ['ch-name','ch-count','ch-start'].forEach(id=>set(id,''));
  document.getElementById('chf').style.display='none';
  renderChains();
}

function cancelChForm(){
  editingCh=-1;['ch-name','ch-count','ch-start'].forEach(id=>set(id,''));
  document.getElementById('chf').style.display='none';
  document.getElementById('chf-save-btn').textContent='Kaydet';
}

function editCh(i){
  const chs=getCh();const c=chs[i];
  set('ch-name',c.name);set('ch-count',c.count);set('ch-start',c.start);
  chColor=c.color||'#237F52';setChColor(chColor);
  editingCh=i;document.getElementById('chf-save-btn').textContent='Güncelle';
  document.getElementById('chf').style.display='block';
}

function delCh(i){
  if(!confirm('Bu zincir silinsin mi?'))return;
  const chs=getCh();chs.splice(i,1);saveCh(chs);renderChains();
}

function toggleChLink(i,dayIdx){
  const chs=getCh();
  const idx=chs[i].done.indexOf(dayIdx);
  if(idx>=0)chs[i].done.splice(idx,1);else chs[i].done.push(dayIdx);
  saveCh(chs);renderChains();renderHomeWidgets();
}


function addDays(dateStr,n){
  const[y,m,d]=dateStr.split('-').map(Number);
  const dt=new Date(y,m-1,d+n);
  return dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0');
}


function renderChains(){
  const chs=getCh();
  const el=document.getElementById('chain-list');if(!el)return;
  if(!chs.length){el.innerHTML='<div class="empty"><div class="empty-icon">⛓️</div>Henüz zincir eklemediniz</div>';return}
  const today=todayStr();
  const TR_SHORT=['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'];

  el.innerHTML=chs.map((ch,ci)=>{
    const color=ch.color||'#237F52';
    const endDate=addDays(ch.start,ch.count-1);
    const doneSet=new Set(ch.done);
    const completedCount=ch.done.length;
    const pct=Math.min(100,Math.round(completedCount/ch.count*100));

    // İlerleme çubuğu
    const barHtml=`<div style="height:4px;background:var(--border);border-radius:2px;margin:10px 0 14px">
      <div style="height:100%;width:${pct}%;background:${color};border-radius:2px;transition:width .3s"></div>
    </div>`;

    // Izgara: her gün bir kare
    let gridHtml='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(46px,1fr));gap:6px">';
    for(let k=0;k<ch.count;k++){
      const ds=addDays(ch.start,k);
      const done=doneSet.has(k);
      const isToday=ds===today;
      const d=new Date(ds+'T00:00:00');
      const dayNum=d.getDate();
      const dayName=TR_SHORT[d.getDay()];
      const isFuture=ds>today;
      gridHtml+=`<div onclick="toggleChLink(${ci},${k})"
        title="${ds} · ${dayName}"
        style="
          aspect-ratio:1;
          border-radius:50%;
          display:flex;flex-direction:column;align-items:center;justify-content:center;
          cursor:pointer;
          font-size:11px;font-family:'DM Sans',sans-serif;
          border:1.5px solid ${done?color:'var(--border)'};
          background:${done?color:'transparent'};
          color:${done?'#fff':isToday?color:'var(--muted)'};
          opacity:${isFuture?.5:1};
          font-weight:${isToday?'600':'400'};
          ${isToday&&!done?'box-shadow:0 0 0 2px '+color+';':''}
          transition:all .15s;
        ">
        <span style="font-size:14px;line-height:1">${dayNum}</span>
        <span style="font-size:10px;opacity:.7;margin-top:2px">${dayName}</span>
      </div>`;
    }
    gridHtml+='</div>';

    return `<div class="ch-card">
      <div class="ch-header">
        <div>
          <div class="ch-name">${esc(ch.name)}</div>
          <div class="ch-meta">${fmtDate(ch.start)} → ${fmtDate(endDate)} · ${ch.count} gün · ${completedCount} tamamlandı · %${pct}</div>
        </div>
        <div style="display:flex;gap:4px">
          <button class="del-btn" style="font-size:13px;color:var(--accent);opacity:.7" onclick="editCh(${ci})">✎</button>
          <button class="del-btn" onclick="delCh(${ci})">×</button>
        </div>
      </div>
      ${barHtml}
      ${gridHtml}
    </div>`;
  }).join('');
}

let calNoteColor='#3a7bd5';
let calNoteEditIdx=-1;


