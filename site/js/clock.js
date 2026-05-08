// CLOCK.JS

function swFmt(ms){
  const ts=Math.floor(ms/1000),h=Math.floor(ts/3600),m=Math.floor((ts%3600)/60),s=ts%60,cs=Math.floor((ms%1000)/10);
  return{main:String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0'),ms:'.'+String(cs).padStart(2,'0')};
}

function swRender(){const f=swFmt(swElapsed);const d=document.getElementById('sw-display');const m=document.getElementById('sw-ms');if(d)d.textContent=f.main;if(m)m.textContent=f.ms;}

function swTimestamp(){const n=new Date();return String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0')+':'+String(n.getSeconds()).padStart(2,'0');}

function swDateStr(){const n=new Date();return String(n.getDate()).padStart(2,'0')+'.'+String(n.getMonth()+1).padStart(2,'0')+'.'+n.getFullYear();}

function swGetLog(){try{return JSON.parse(localStorage.getItem('gn_sw_log')||'[]')}catch(x){return[]}}

function swSaveLog(log){localStorage.setItem('gn_sw_log',JSON.stringify(log))}

function swRenderLog(){
  const log=swGetLog();const el=document.getElementById('sw-log');const cw=document.getElementById('sw-log-clear-wrap');
  if(!el)return;
  if(!log.length){el.innerHTML='';if(cw)cw.style.display='none';return;}
  if(cw)cw.style.display='block';
  el.innerHTML=log.slice().reverse().map((s,i)=>`
    <div class="sw-log-item">
      <div class="sw-log-num">${log.length-i}</div>
      <div class="sw-log-info">
        <div class="sw-log-time">${s.date?s.date+' · ':''} ${s.startAt} başladı → ${s.stopAt} durdu</div>
        <div class="sw-log-dur">${s.duration} süre çalışıldı</div>
      </div>
    </div>`).join('');
}

function swToggle(){
  const btn=document.getElementById('sw-btn');
  if(swRunning){
    clearInterval(swInterval);swRunning=false;
    const stopAt=swTimestamp();
    const f=swFmt(swElapsed);
    localStorage.setItem('gn_sw_elapsed',String(swElapsed));
    const log=swGetLog();
    log.push({startAt:swStartLabel,stopAt,duration:f.main,date:swDateStr()});
    swSaveLog(log);swStartTime=null;swStartLabel=null;
    if(btn)btn.textContent='Devam Et';
    const sv=document.getElementById('sw-saved');if(sv)sv.textContent='Kaydedildi: '+f.main;
    swRenderLog();
  }else{
    swStartLabel=swTimestamp();
    swStartTime=Date.now()-swElapsed;
    const st=swStartTime;
    swInterval=setInterval(()=>{swElapsed=Date.now()-st;swRender();},33);
    swRunning=true;if(btn)btn.textContent='Durdur';
    const sv=document.getElementById('sw-saved');if(sv)sv.textContent='';
  }
}

function swReset(){
  clearInterval(swInterval);swRunning=false;swElapsed=0;swStartTime=null;
  localStorage.setItem('gn_sw_elapsed','0');swRender();
  const btn=document.getElementById('sw-btn');if(btn)btn.textContent='Başlat';
  const sv=document.getElementById('sw-saved');if(sv)sv.textContent='';
}

function swClearLog(){if(confirm('Tüm geçmiş silinsin mi?')){localStorage.removeItem('gn_sw_log');swRenderLog();}}

// CALENDAR - Special Days
const SP=[
  {k:'01-01',n:'Yılbaşı',t:'h'},{k:'04-23',n:'Ulusal Egemenlik ve Çocuk Bayramı',t:'h'},
  {k:'05-01',n:'Emek ve Dayanışma Bayramı',t:'h'},{k:'05-19',n:"Atatürk'ü Anma, Gençlik ve Spor Bayramı",t:'h'},
  {k:'07-15',n:'Demokrasi ve Millî Birlik Günü',t:'h'},{k:'08-30',n:'Zafer Bayramı',t:'h'},{k:'10-29',n:'Cumhuriyet Bayramı',t:'h'},
  {k:'03-30',n:'Ramazan Bayramı 1.Gün',t:'r',y:[2025]},{k:'03-31',n:'Ramazan Bayramı 2.Gün',t:'r',y:[2025]},{k:'04-01',n:'Ramazan Bayramı 3.Gün',t:'r',y:[2025]},
  {k:'03-20',n:'Ramazan Bayramı 1.Gün',t:'r',y:[2026]},{k:'03-21',n:'Ramazan Bayramı 2.Gün',t:'r',y:[2026]},{k:'03-22',n:'Ramazan Bayramı 3.Gün',t:'r',y:[2026]},
  {k:'06-06',n:'Kurban Bayramı 1.Gün',t:'r',y:[2025]},{k:'06-07',n:'Kurban Bayramı 2.Gün',t:'r',y:[2025]},{k:'06-08',n:'Kurban Bayramı 3.Gün',t:'r',y:[2025]},{k:'06-09',n:'Kurban Bayramı 4.Gün',t:'r',y:[2025]},
  {k:'05-27',n:'Kurban Bayramı 1.Gün',t:'r',y:[2026]},{k:'05-28',n:'Kurban Bayramı 2.Gün',t:'r',y:[2026]},{k:'05-29',n:'Kurban Bayramı 3.Gün',t:'r',y:[2026]},{k:'05-30',n:'Kurban Bayramı 4.Gün',t:'r',y:[2026]},
  {k:'02-14',n:'Sevgililer Günü',t:'i'},{k:'03-08',n:'Dünya Kadınlar Günü',t:'i'},{k:'04-22',n:'Dünya Günü',t:'i'},
  {k:'06-01',n:'Dünya Çocuklar Günü',t:'i'},{k:'10-05',n:'Dünya Öğretmenler Günü',t:'i'},{k:'10-31',n:'Cadılar Bayramı',t:'i'},{k:'12-25',n:'Noel',t:'i'},{k:'12-31',n:'Yılbaşı Gecesi',t:'i'},
];

function tickClock(){
  const n=new Date();
  const hh=String(n.getHours()).padStart(2,'0'),mm=String(n.getMinutes()).padStart(2,'0');
  const sbe=document.getElementById('sb-date');if(sbe)sbe.textContent=n.getDate()+' '+TR_M[n.getMonth()];
  const ss=String(n.getSeconds()).padStart(2,'0');
  const cde=document.getElementById('clock-display');if(cde)cde.textContent=hh+':'+mm+':'+ss;
  const cdd=document.getElementById('clock-date-display');if(cdd)cdd.textContent=n.getDate()+' '+TR_M[n.getMonth()]+' '+n.getFullYear();
  const cdw=document.getElementById('clock-day-display');if(cdw)cdw.textContent=TR_D[n.getDay()];
  // Ana ekran kronometre — sidebar'daki sw ile eş zamanlı
  const hwd=document.getElementById('hw-sw-display');
  if(hwd){
    const elapsed=swRunning&&swStartTime?Date.now()-swStartTime:swElapsed;
    hwd.textContent=swFmt(elapsed).main;
  }
  // Ana ekran başlat/durdur butonunu güncelle
  const hwBtn=document.getElementById('hw-sw-btn');
  if(hwBtn)hwBtn.textContent=swRunning?'⏸':'▶';
}

// STOPWATCH
let swRunning=false,swInterval=null,swStartTime=null,swStartLabel=null;
let swElapsed=parseInt(localStorage.getItem('gn_sw_elapsed')||'0');

