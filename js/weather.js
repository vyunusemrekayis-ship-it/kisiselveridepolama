let wxCities=[],wxActive=0,wxData=null;
function wxLS(){try{wxCities=JSON.parse(localStorage.getItem('wx_v4')||'[]')}catch(e){wxCities=[]}}
function wxSave(){localStorage.setItem('wx_v4',JSON.stringify(wxCities))}

const WXC={
  0:{t:'Açık',e:'☀️',o:['#c86820','#1a4a7a']},1:{t:'Az Bulutlu',e:'🌤️',o:['#b05818','#1a4570']},
  2:{t:'Parçalı Bulutlu',e:'⛅',o:['#607090','#2a3a50']},3:{t:'Kapalı',e:'☁️',o:['#404860','#1a2030']},
  45:{t:'Sisli',e:'🌫️',o:['#606870','#353840']},48:{t:'Kırağılı Sis',e:'🌫️',o:['#606870','#353840']},
  51:{t:'Hafif Çiseleme',e:'🌦️',o:['#305070','#101820']},53:{t:'Çiseleme',e:'🌦️',o:['#305070','#101820']},
  55:{t:'Yoğun Çise',e:'🌧️',o:['#204060','#080e18']},61:{t:'Yağmurlu',e:'🌧️',o:['#204060','#080e18']},
  63:{t:'Orta Yağmur',e:'🌧️',o:['#182838','#060c12']},65:{t:'Şiddetli Yağmur',e:'🌧️',o:['#102030','#040810']},
  71:{t:'Hafif Kar',e:'🌨️',o:['#6080a0','#2a3848']},73:{t:'Kar',e:'❄️',o:['#7090b0','#303e50']},
  75:{t:'Yoğun Kar',e:'❄️',o:['#80a0c0','#404e60']},80:{t:'Sağanak',e:'🌦️',o:['#254560','#0a1018']},
  81:{t:'Kuvvetli Sağanak',e:'🌧️',o:['#1a3050','#060c10']},82:{t:'Şiddetli Sağanak',e:'⛈️',o:['#102030','#040810']},
  95:{t:'Fırtına',e:'⛈️',o:['#1a1e28','#060810']},96:{t:'Dolulu Fırtına',e:'⛈️',o:['#14181e','#040608']},
  99:{t:'Şiddetli Fırtına',e:'⛈️',o:['#10141a','#030508']}
};
function wxc(code,isDay=1){const b=WXC[code]||WXC[3];if(!isDay)return{...b,e:'🌙',o:['#1a2050','#050810']};return b}
function wxSetAtmo(code,isDay){
  const{o}=wxc(code,isDay);
  const o1=document.getElementById('wx-orb1'),o2=document.getElementById('wx-orb2');
  if(o1){o1.style.background=o[0];o1.style.opacity='0.2'}
  if(o2){o2.style.background=o[1];o2.style.opacity='0.15'}
}

// ── TABS ─────────────────────────────────────────────────────────────
function wxRenderTabs(){
  const el=document.getElementById('wx-tabs');
  if(!el) return;
  if(!wxCities.length){el.innerHTML='';return}
  el.innerHTML=wxCities.map((c,i)=>`
    <div class="wx-tab${i===wxActive?' on':''}" onclick="wxSelect(${i})">
      ${c.name}${c.gps?' 📍':''}
      ${c.temp!==undefined?`<span style="opacity:.6;font-size:11px">${Math.round(c.temp)}°</span>`:''}
      <button class="wx-tab-del" onclick="wxDel(${i},event)">×</button>
    </div>`).join('');
}
function wxSelect(i){wxActive=i;wxRenderTabs();wxFetch(i)}
function wxDel(i,e){
  e.stopPropagation();wxCities.splice(i,1);wxSave();
  if(wxActive>=wxCities.length)wxActive=Math.max(0,wxCities.length-1);
  wxRenderTabs();
  if(wxCities.length)wxFetch(wxActive);
  else{document.getElementById('wx-welcome').style.display='flex';document.getElementById('wx-content').style.display='none'}
}

// ── POPUP ─────────────────────────────────────────────────────────────
function wxToggleSearch(e){
  e.stopPropagation();
  const p=document.getElementById('wx-popup');
  if(!p) return;
  // Popup'ı fixed konumda göster — wx-root overflow:hidden'dan etkilenmemesi için
  const btn=e.currentTarget||e.target.closest('.wx-add-btn')||e.target;
  const rect=btn.getBoundingClientRect();
  p.style.position='fixed';
  p.style.top=(rect.bottom+8)+'px';
  p.style.right=(window.innerWidth-rect.right)+'px';
  p.style.left='auto';
  p.classList.toggle('vis');
  if(p.classList.contains('vis'))setTimeout(()=>{const inp=document.getElementById('wx-inp');if(inp)inp.focus()},50);
}
document.addEventListener('click',function(e){
  if(!e.target.closest('#wx-popup')&&!e.target.closest('.wx-add-btn'))
    document.getElementById('wx-popup')?.classList.remove('vis');
});

// ── ARAMA ─────────────────────────────────────────────────────────────
let wxSugT=null;
async function wxSuggest(q){
  clearTimeout(wxSugT);
  const el=document.getElementById('wx-suggest');
  if(!q||q.length<2){el.style.display='none';return}
  wxSugT=setTimeout(async()=>{
    try{
      const r=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=tr&format=json`);
      const d=await r.json();
      if(!d.results?.length){el.style.display='none';return}
      el.style.display='block';
      el.innerHTML=d.results.map(c=>`
        <div class="wx-sug-item" onclick="wxPickSug(${c.latitude},${c.longitude},'${(c.name||'').replace(/'/g,"\\'")}','${(c.country||'').replace(/'/g,"\\'")}','${(c.admin1||'').replace(/'/g,"\\'")}')">
          <div class="wx-sug-name">${c.name}</div>
          <div class="wx-sug-sub">${[c.admin1,c.country].filter(Boolean).join(', ')}</div>
        </div>`).join('');
    }catch(e){}
  },280);
}
function wxPickSug(lat,lon,name,country,admin1){
  const full=(admin1&&admin1!==name)?`${name}, ${admin1}`:name;
  wxAddCity({name:full,country,lat,lon});
  document.getElementById('wx-inp').value='';
  document.getElementById('wx-suggest').style.display='none';
  document.getElementById('wx-popup')?.classList.remove('vis');
}
async function wxAddByEnter(){
  const inp=document.getElementById('wx-inp');const q=inp?inp.value.trim():'';if(!q)return;
  try{
    const r=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=tr&format=json`);
    const d=await r.json();if(!d.results?.length)return;
    const c=d.results[0];wxPickSug(c.latitude,c.longitude,c.name,c.country||'',c.admin1||'');
  }catch(e){}
}
function wxAddCity(city){
  const ex=wxCities.findIndex(c=>Math.abs(c.lat-city.lat)<0.01&&Math.abs(c.lon-city.lon)<0.01);
  if(ex>=0){wxActive=ex;wxRenderTabs();wxFetch(ex);return}
  wxCities.push(city);wxSave();wxActive=wxCities.length-1;wxRenderTabs();wxFetch(wxActive);
}
async function wxGPS(){
  if(!navigator.geolocation){alert('Konum desteklenmiyor.');return}
  wxShowLoad();
  navigator.geolocation.getCurrentPosition(async pos=>{
    try{
      const{latitude:lat,longitude:lon}=pos.coords;
      const r=await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
      const d=await r.json();
      const name=d.address?.city||d.address?.town||d.address?.village||'Konumum';
      wxAddCity({name,lat,lon,gps:true});
      document.getElementById('wx-popup').classList.remove('vis');
    }catch(e){wxHideLoad()}
  },()=>wxHideLoad());
}

function wxShowLoad(){
  const w=document.getElementById('wx-welcome'),c=document.getElementById('wx-content'),l=document.getElementById('wx-loading');
  if(w)w.style.display='none'; if(c)c.style.display='none'; if(l)l.style.display='flex';
}
function wxHideLoad(){const l=document.getElementById('wx-loading');if(l)l.style.display='none';}

// ── VERİ ─────────────────────────────────────────────────────────────
async function wxFetch(idx){
  const city=wxCities[idx];if(!city)return;
  wxShowLoad();
  const url=`https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}`
    +`&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,visibility,wind_gusts_10m`
    +`&hourly=temperature_2m,apparent_temperature,weather_code,precipitation_probability,precipitation,rain,snowfall,showers,wind_speed_10m,wind_direction_10m,is_day`
    +`&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,snowfall_sum`
    +`&timezone=auto&wind_speed_unit=kmh&forecast_days=10`;
  try{
    const r=await fetch(url);const d=await r.json();
    wxData=d;
    wxCities[idx].temp=d.current.temperature_2m;
    wxCities[idx].cond=wxc(d.current.weather_code,d.current.is_day).t;
    wxSave();wxRenderTabs();wxHideLoad();wxRender(d,city);
  }catch(e){wxHideLoad()}
}

// ── YARDIMCILAR ───────────────────────────────────────────────────────
function wxFmtTime(s){const d=new Date(s);return d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0')}
function wxFmtDay(s){const d=new Date(s+'T12:00:00');return['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'][d.getDay()]}
function wxWindDir(deg){return['K','KKD','KD','DKD','D','DGD','GD','GGD','G','GGB','GB','BGB','B','BKB','KB','KKB'][Math.round(deg/22.5)%16]}
function wxUvLbl(v){if(v<=2)return'Düşük';if(v<=5)return'Orta';if(v<=7)return'Yüksek';if(v<=10)return'Çok Yüksek';return'Aşırı'}
function wxDew(T,RH){return Math.round(T-(100-RH)/5)}
function wxHumD(h){if(h<30)return'Kuru';if(h<60)return'Konforlu';if(h<80)return'Nemli';return'Çok Nemli'}
function wxVisD(v){if(v>=10000)return'Mükemmel';if(v>=5000)return'İyi';if(v>=2000)return'Orta';return'Düşük'}
function wxPresD(p){if(p>1020)return'Yüksek basınç';if(p>1013)return'Normal';return'Düşük basınç'}

// ── SAATLİK: gün doğumu/batımı mini CSS animasyonu ────────────────────
function wxMiniSun(type){
  return `<div class="wx-mini-sun wx-mini-${type}">
    <div class="wx-mini-disc"></div>
    <div class="wx-mini-horizon"></div>
  </div>`;
}

// ── SAATLİK HTML ─────────────────────────────────────────────────────
function wxHourlyHTML(hourly,daily,dayIdx,isToday){
  const now=Date.now();
  const dayStr=daily.time[dayIdx];
  const sunrise=daily.sunrise[dayIdx],sunset=daily.sunset[dayIdx];
  const items=[];
  for(let i=0;i<hourly.time.length;i++){
    if(hourly.time[i].split('T')[0]!==dayStr)continue;
    const ht=new Date(hourly.time[i]);
    if(isToday&&ht.getTime()<now-1800000)continue;
    items.push({ts:ht.getTime(),time:ht,code:hourly.weather_code[i],isDay:hourly.is_day[i],temp:hourly.temperature_2m[i],feels:(hourly.apparent_temperature||[])[i]??null,rain:hourly.precipitation_probability[i],precip:(hourly.precipitation||[])[i]||0,snow:(hourly.snowfall||[])[i]||0,wind:(hourly.wind_speed_10m||[])[i]??null,windDir:(hourly.wind_direction_10m||[])[i]??null,isNow:isToday&&items.length===0});
  }
  const extras=[];
  if(sunrise)extras.push({ts:new Date(sunrise).getTime(),isSol:true,type:'rise',time:sunrise});
  if(sunset) extras.push({ts:new Date(sunset).getTime(),isSol:true,type:'set',time:sunset});
  const cardHTML = [...items,...extras].sort((a,b)=>a.ts-b.ts).map(h=>{
    if(h.isSol) return '';
    const feelsStr  = h.feels!=null && Math.round(h.feels)!==Math.round(h.temp) ? `<div class="wx-h-feels">${Math.round(h.feels)}°</div>` : `<div class="wx-h-feels" style="visibility:hidden">-</div>`;
    const precipStr = (h.precip+h.snow)>=0.1 ? `<div class="wx-h-mm">${(h.precip+h.snow)>=10?(h.precip+h.snow).toFixed(0):(h.precip+h.snow).toFixed(1)}<span style="font-size:7px;opacity:.6"> mm</span></div>` : `<div class="wx-h-mm" style="visibility:hidden">-</div>`;
    const rainProb  = h.rain>10 ? `<div class="wx-h-rain">${h.rain}%</div>` : `<div class="wx-h-rain" style="visibility:hidden">-</div>`;
    return `<div class="wx-h${h.isNow?' now':''}">
      <div class="wx-h-t">${h.isNow?'Şu An':h.time.getHours().toString().padStart(2,'0')+':00'}</div>
      <div class="wx-h-ico">${wxc(h.code,h.isDay).e}</div>
      <div class="wx-h-temp">${Math.round(h.temp)}°</div>
      ${feelsStr}
      ${rainProb}
      ${precipStr}
    </div>`;
  }).join('');

  const precipSection = !isToday ? wxDayPrecipChart(hourly, daily, dayIdx) : '';

  // Gün doğumu/batımı bilgisi
  const fmtT = s => { const d=new Date(s); return d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0'); };
  // Mini gün doğumu/batımı — büyük wx-rise/set-wrap animasyonunun ölçekli SVG hali
  function miniSunSVG(type){
    const isRise = type==='rise';
    const gc1 = isRise?'#fde68a':'#fca5a5', gc2 = isRise?'#f59e0b':'#f97316';
    const glow = isRise?'rgba(251,191,36,.5)':'rgba(249,115,22,.4)';
    const horiz = isRise?'rgba(251,191,36,.35)':'rgba(249,115,22,.35)';
    const ray  = isRise?'rgba(253,230,138,.5)':'rgba(252,165,165,.4)';
    const uid = type+dayIdx;
    // Güneş yukarı çıkıyor (rise) ya da aşağı iniyor (set)
    const discY = isRise?20:12;
    const anim = isRise
      ? `@keyframes msr${uid}{from{transform:translateY(6px);opacity:.3}to{transform:translateY(0);opacity:1}}`
      : `@keyframes msr${uid}{from{transform:translateY(0);opacity:1}to{transform:translateY(6px);opacity:.3}}`;
    // 5 ışın
    const angles = [-50,-25,0,25,50];
    const rays = angles.map(a=>{
      const r=a*Math.PI/180, cx=16, cy=16;
      const x1=(cx+Math.sin(r)*7).toFixed(1), y1=(cy-Math.cos(r)*7).toFixed(1);
      const x2=(cx+Math.sin(r)*11).toFixed(1), y2=(cy-Math.cos(r)*11).toFixed(1);
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${ray}" stroke-width="1.2" stroke-linecap="round"/>`;
    }).join('');
    return `<div style="width:32px;height:32px;position:relative;flex-shrink:0">
      <style>${anim}</style>
      <svg width="32" height="32" viewBox="0 0 32 32" overflow="visible">
        <defs><radialGradient id="rg${uid}"><stop offset="0%" stop-color="${gc1}"/><stop offset="100%" stop-color="${gc2}"/></radialGradient></defs>
        ${rays}
        <line x1="5" y1="18" x2="27" y2="18" stroke="${horiz}" stroke-width="1" stroke-linecap="round"/>
        <circle cx="16" cy="${discY}" r="5" fill="url(#rg${uid})" style="filter:drop-shadow(0 0 3px ${glow});animation:msr${uid} 1.5s cubic-bezier(.22,1,.36,1) forwards"/>
      </svg>
    </div>`;
  }
  // Gün doğumu / batımı — ayrı kutular, SVG animasyonlu
  function sunBox(type){
    const isRise = type==='rise';
    const time   = isRise ? sunrise : sunset;
    if(!time) return '';
    const gc1   = isRise?'#fde68a':'#fca5a5', gc2 = isRise?'#f59e0b':'#f97316';
    const glow  = isRise?'rgba(251,191,36,.55)':'rgba(249,115,22,.45)';
    const horiz = isRise?'rgba(251,191,36,.4)':'rgba(249,115,22,.4)';
    const rayC  = isRise?'rgba(253,230,138,.55)':'rgba(252,165,165,.45)';
    const uid   = type+dayIdx;
    const discY = isRise?22:10;
    const anim  = isRise
      ? `@keyframes msr${uid}{from{transform:translateY(7px);opacity:.2}to{transform:translateY(0);opacity:1}}`
      : `@keyframes msr${uid}{from{transform:translateY(0);opacity:1}to{transform:translateY(7px);opacity:.2}}`;
    const angles = [-55,-28,0,28,55];
    const rays = angles.map(a=>{
      const r=a*Math.PI/180, cx=20, cy=18;
      const x1=(cx+Math.sin(r)*9).toFixed(1),  y1=(cy-Math.cos(r)*9).toFixed(1);
      const x2=(cx+Math.sin(r)*14).toFixed(1), y2=(cy-Math.cos(r)*14).toFixed(1);
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${rayC}" stroke-width="1.3" stroke-linecap="round"/>`;
    }).join('');
    const label = isRise ? 'Gün Doğumu' : 'Gün Batımı';
    const textColor = isRise ? 'rgba(253,230,138,.9)' : 'rgba(252,165,165,.85)';
    const subColor  = isRise ? 'rgba(253,230,138,.45)' : 'rgba(252,165,165,.4)';
    return `<div style="flex:0 0 auto;width:72px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:8px 6px;background:rgba(255,255,255,.035);border-radius:10px">
      <style>${anim}</style>
      <svg width="20" height="18" viewBox="0 0 40 36" overflow="visible" style="overflow:visible">
        <defs><radialGradient id="rg${uid}"><stop offset="0%" stop-color="${gc1}"/><stop offset="100%" stop-color="${gc2}"/></radialGradient></defs>
        ${rays}
        <line x1="4" y1="22" x2="36" y2="22" stroke="${horiz}" stroke-width="1" stroke-linecap="round"/>
        <circle cx="20" cy="${discY}" r="6" fill="url(#rg${uid})" style="filter:drop-shadow(0 0 4px ${glow});animation:msr${uid} 1.5s cubic-bezier(.22,1,.36,1) forwards"/>
      </svg>
      <div style="font-size:11px;font-weight:700;color:${textColor};letter-spacing:.3px">${fmtT(time)}</div>
      <div style="font-size:8px;text-transform:uppercase;letter-spacing:.8px;color:${subColor}">${label}</div>
    </div>`;
  }

  if(!precipSection && isToday) return cardHTML;
  const riseBox = !isToday ? sunBox('rise') : '';
  const setBox  = !isToday ? sunBox('set')  : '';
  const hasSun  = riseBox || setBox;
  if(!precipSection && !hasSun) return cardHTML;

  // 2. satır: [doğum] [batım] [──── grafik (flex:1) ────]
  return `<div style="display:flex;flex-direction:column;gap:0">
    <div style="display:flex;gap:2px;overflow-x:auto;scrollbar-width:none;padding:2px">${cardHTML}</div>
    <div style="padding:10px 2px 2px;display:flex;gap:6px;align-items:stretch">
      ${riseBox}
      ${setBox}
      ${precipSection ? `<div style="flex:1;min-width:0">${precipSection}</div>` : ''}
    </div>
  </div>`;
}


// ── ANİMASYONLU İKON HTML'LERİ ───────────────────────────────────────
const wxIcoHum=`<div class="wx-ico-hum"><div class="wx-ico-hum-drop"></div></div>`;
const wxIcoWind=`<div class="wx-ico-wind"><div class="wx-ico-wind-line"></div><div class="wx-ico-wind-line"></div><div class="wx-ico-wind-line"></div></div>`;
const wxIcoPress=`<div class="wx-ico-press"><div class="wx-ico-press-ring"></div><div class="wx-ico-press-ring"></div><div class="wx-ico-press-ring"></div></div>`;
const wxIcoVis=`<div class="wx-ico-vis"><div class="wx-ico-vis-dot"></div><div class="wx-ico-vis-beam"></div><div class="wx-ico-vis-beam"></div><div class="wx-ico-vis-beam"></div></div>`;
const wxIcoRain=`<div class="wx-ico-rain"><div class="wx-ico-rain-cloud"></div><div class="wx-ico-rain-drop"></div><div class="wx-ico-rain-drop"></div><div class="wx-ico-rain-drop"></div></div>`;
const wxIcoUV=`<div class="wx-ico-uv"><div class="wx-ico-uv-disc"></div><div class="wx-ico-uv-rays"><div class="wx-ico-uv-ray"></div><div class="wx-ico-uv-ray"></div><div class="wx-ico-uv-ray"></div><div class="wx-ico-uv-ray"></div><div class="wx-ico-uv-ray"></div><div class="wx-ico-uv-ray"></div><div class="wx-ico-uv-ray"></div><div class="wx-ico-uv-ray"></div></div></div>`;
const wxIcoFeels=`<div class="wx-ico-feels"><div class="wx-ico-feels-tube"><div class="wx-ico-feels-fill"></div></div><div class="wx-ico-feels-bulb"></div></div>`;

// Büyük güneş
function wxSunAnim(type){
  if(type==='rise') return `<div class="wx-rise-wrap">
    <div class="wx-ray"></div><div class="wx-ray"></div><div class="wx-ray"></div>
    <div class="wx-ray"></div><div class="wx-ray"></div>
    <div class="wx-sun-disc"></div><div class="wx-horizon-line"></div><div class="wx-glow"></div>
  </div>`;
  return `<div class="wx-set-wrap">
    <div class="wx-ray"></div><div class="wx-ray"></div><div class="wx-ray"></div>
    <div class="wx-ray"></div><div class="wx-ray"></div>
    <div class="wx-sun-disc"></div><div class="wx-horizon-line"></div><div class="wx-glow"></div>
  </div>`;
}


// ── UYARI MOTORU ─────────────────────────────────────────────────────
function wxAlerts(current, hourly, daily){
  const alerts = [];
  const ws   = current.wind_speed_10m;
  const wg   = current.wind_gusts_10m || 0;
  const code = current.weather_code;
  const vis  = current.visibility ?? 10000;
  const now  = Date.now();

  // ─── Saatlik yardımcılar ────────────────────────────────────────
  function hourMax(arr, hours){
    let m=0;
    for(let i=0;i<hourly.time.length;i++){
      const ht=new Date(hourly.time[i]).getTime();
      if(ht<now||ht>now+hours*3600000) continue;
      m=Math.max(m,(arr||[])[i]??0);
    }
    return m;
  }
  function hourSum(arr, hours){
    let s=0;
    for(let i=0;i<hourly.time.length;i++){
      const ht=new Date(hourly.time[i]).getTime();
      if(ht<now||ht>now+hours*3600000) continue;
      s+=(arr||[])[i]??0;
    }
    return s;
  }

  const maxRain6h  = hourMax(hourly.rain, 6);
  const maxSnow6h  = hourMax(hourly.snowfall, 6);
  const sumRain24h = hourSum(hourly.precipitation, 24);

  // ─── Saatlik durum geçmişi / geleceği ──────────────────────────
  // Şu anki saate karşılık gelen hourly index'i bul
  let nowIdx = 0;
  for(let i=0;i<hourly.time.length;i++){
    if(new Date(hourly.time[i]).getTime() <= now) nowIdx = i;
    else break;
  }

  // ─── 1. Saatlerce süren yağmur ─────────────────────────────────
  // Önümüzdeki saatlerde kaç saat kesintisiz yağış kodu var?
  let continuousRainHours = 0;
  for(let i=nowIdx;i<hourly.time.length;i++){
    const ht=new Date(hourly.time[i]).getTime();
    if(ht>now+12*3600000) break;
    if((hourly.weather_code||[])[i]>=51) continuousRainHours++;
    else if(continuousRainHours>0) break; // Kesinti → dur
  }

  // ─── 2. Ani bastıran yağış (1 saat içinde yüksek mm) ───────────
  let burstRain1h = 0;
  for(let i=nowIdx;i<hourly.time.length;i++){
    const ht=new Date(hourly.time[i]).getTime();
    if(ht>now+1*3600000) break;
    burstRain1h = Math.max(burstRain1h, (hourly.rain||[])[i]??0);
  }

  // ─── 3. Yağmur başlama ─────────────────────────────────────────
  // Şu an kuru, önümüzdeki 3 saat içinde yağmur başlıyor
  let rainStartsIn = null;
  const isRainingNow = code>=51 && code<=82;
  if(!isRainingNow){
    for(let i=nowIdx+1;i<hourly.time.length;i++){
      const ht=new Date(hourly.time[i]).getTime();
      if(ht>now+3*3600000) break;
      if((hourly.rain||[])[i]>=0.3){
        rainStartsIn = Math.round((ht-now)/60000);
        break;
      }
    }
  }

  // ─── 4. Yağmur bitiyor ─────────────────────────────────────────
  // Şu an yağıyor, önümüzdeki 2 saat içinde duruyor
  let rainStopsIn = null;
  if(isRainingNow){
    for(let i=nowIdx+1;i<hourly.time.length;i++){
      const ht=new Date(hourly.time[i]).getTime();
      if(ht>now+2*3600000) break;
      const c=(hourly.weather_code||[])[i]??0;
      if(c<51||(c>=71&&c<=77)){
        rainStopsIn = Math.round((ht-now)/60000);
        break;
      }
    }
  }

  // ─── 5. Detaylı hava bozulma özeti (3 saat içinde çoklu değişim) ─
  // Sıcaklık, rüzgar ve hava kodu birlikte değişiyorsa kullanıcı dostu özet üret
  let deteriorationMsg = null;
  if(code<=3){ // Şu an açık/bulutlu
    const futureIdx = hourly.time.findIndex((t,i)=>{
      const ht=new Date(t).getTime();
      return ht>now+2*3600000 && ht<=now+4*3600000 && (hourly.weather_code||[])[i]>=51;
    });
    if(futureIdx>=0){
      const futureTemp   = (hourly.temperature_2m||[])[futureIdx]??null;
      const futureWind   = null; // saatlik rüzgar yok — günlük kullanacağız
      const futureCode   = (hourly.weather_code||[])[futureIdx];
      const nowTemp      = (hourly.temperature_2m||[])[nowIdx]??current.temperature_2m;
      const tempDrop     = nowTemp!=null && futureTemp!=null ? Math.round(nowTemp - futureTemp) : null;
      const futureLabel  = futureCode>=95?'fırtına':futureCode>=80?'sağanak':futureCode>=61?'yağmurlu hava':futureCode>=51?'çiseleme':'yağış';
      const nowLabel     = code<=1?'açık hava':code<=2?'parçalı bulutlu':'bulutlu hava';
      const parts = [];
      parts.push(`${nowLabel} → ${futureLabel}`);
      if(tempDrop!=null && tempDrop>=5) parts.push(`sıcaklık ~${tempDrop}°C düşecek`);
      deteriorationMsg = `Hava ${Math.round((new Date(hourly.time[futureIdx]).getTime()-now)/3600000)} saat içinde belirgin şekilde değişecek: ${parts.join(', ')}`;
    }
  }

  // ─── 6. Fırtırmaya yaklaşan rüzgar (şu an orta, 3 saat içinde artıyor) ─
  let windRisingMsg = null;
  if(ws<45){
    for(let i=nowIdx+1;i<hourly.time.length;i++){
      const ht=new Date(hourly.time[i]).getTime();
      if(ht>now+3*3600000) break;
      // Saatlik wind_speed yok — ani esinti kodu 95+ ile yaklaşık tahmin
      const fc=(hourly.weather_code||[])[i]??0;
      if(fc>=95){
        windRisingMsg=`Önümüzdeki saatlerde fırtına gelişebilir`;
        break;
      }
    }
  }

  // ─── Günlük veriler ─────────────────────────────────────────────
  const isFogCode    = code===45||code===48;
  const tempDiff     = (daily.temperature_2m_max?.length>=2) ? daily.temperature_2m_max[1]-daily.temperature_2m_max[0] : 0;
  const feelsMax     = (daily.apparent_temperature_max||[])[0] ?? null;
  const minTemp      = daily.temperature_2m_min?.[0] ?? null;
  const maxTemp      = daily.temperature_2m_max?.[0] ?? null;
  const uv           = daily.uv_index_max?.[0] ?? 0;
  const next3DayRain = (daily.precipitation_sum||[]).slice(0,3).reduce((a,b)=>a+(b||0),0);
  const rainyDays    = (daily.precipitation_sum||[]).slice(0,5).filter(v=>(v||0)>=3).length;
  const snowSum3d    = (daily.snowfall_sum||[]).slice(0,3).reduce((a,b)=>a+(b||0),0);
  const humidity     = current.relative_humidity_2m ?? 50;

  // ══════════════════════════════════════════════════════════════
  //  UYARILAR
  // ══════════════════════════════════════════════════════════════

  // Şiddetli fırtına / yıldırım
  if(code>=95)
    alerts.push({lvl:'red',   ico:'⚡', msg:'Şiddetli fırtına ve yıldırım aktif — dışarı çıkmayın'});
  else if(code===96||code===99)
    alerts.push({lvl:'red',   ico:'⛈', msg:'Dolulu fırtına — araç ve cam yüzeyleri koruyun'});

  // SEL riski
  if(maxRain6h>=20)
    alerts.push({lvl:'red',   ico:'🌊', msg:`SEL RİSKİ — 6 saatte ${maxRain6h.toFixed(1)} mm yağış bekleniyor`});
  else if(maxRain6h>=12||sumRain24h>=40)
    alerts.push({lvl:'orange',ico:'🌧', msg:`Kuvvetli yağış — sel ihtimali (6sa: ${maxRain6h.toFixed(1)} mm)`});
  else if(maxRain6h>=5)
    alerts.push({lvl:'yellow',ico:'🌧', msg:`Yağış yoğunlaşıyor (${maxRain6h.toFixed(1)} mm/6sa)`});

  // Ani bastıran yağış (1 saat içinde yüksek mm)
  if(burstRain1h>=8)
    alerts.push({lvl:'orange',ico:'⛈', msg:`Ani bastıran yağış — 1 saat içinde ${burstRain1h.toFixed(1)} mm bekleniyor`});
  else if(burstRain1h>=4)
    alerts.push({lvl:'yellow',ico:'🌧', msg:`Yoğun yağış geliyor — 1 saat içinde ${burstRain1h.toFixed(1)} mm`});

  // Saatlerce süren yağmur
  if(continuousRainHours>=6)
    alerts.push({lvl:'orange',ico:'☔', msg:`${continuousRainHours} saat kesintisiz yağmur bekleniyor`});
  else if(continuousRainHours>=3)
    alerts.push({lvl:'yellow',ico:'☔', msg:`${continuousRainHours} saat boyunca yağışlı hava`});

  // Yağmur başlama bildirimi
  if(rainStartsIn!==null)
    alerts.push({lvl:'yellow',ico:'🌂', msg:`Yaklaşık ${rainStartsIn} dakika içinde yağmur başlıyor`});

  // Yağmur bitiyor bildirimi
  if(rainStopsIn!==null)
    alerts.push({lvl:'yellow',ico:'🌤', msg:`Yağmur yaklaşık ${rainStopsIn} dakika içinde duruyor`});

  // Detaylı hava bozulma özeti
  if(deteriorationMsg)
    alerts.push({lvl:'orange',ico:'⚠', msg:deteriorationMsg});
  else if(windRisingMsg)
    alerts.push({lvl:'yellow',ico:'⚠', msg:windRisingMsg});

  // Uzun süreli yağış (çok günlü)
  if(next3DayRain>=60)
    alerts.push({lvl:'orange',ico:'🌧', msg:`Uzun süreli yağış — 3 günde toplam ${next3DayRain.toFixed(0)} mm`});
  else if(rainyDays>=4)
    alerts.push({lvl:'yellow',ico:'🌧', msg:`${rainyDays} gün boyunca yağışlı hava`});

  // Kuvvetli rüzgar / fırtırmaya yaklaşan
  if(wg>=90)
    alerts.push({lvl:'red',   ico:'🌪', msg:`Tayfun şiddetinde rüzgar — ani esinti ${wg} km/sa`});
  else if(wg>=75||ws>=60)
    alerts.push({lvl:'orange',ico:'💨', msg:`Tehlikeli rüzgar — ani esinti ${wg} km/sa, ortalama ${Math.round(ws)} km/sa`});
  else if(wg>=55||ws>=45)
    alerts.push({lvl:'yellow',ico:'💨', msg:`Kuvvetli rüzgar ${Math.round(ws)} km/sa — ani ${wg} km/sa`});

  // Kar yağışı
  if(maxSnow6h>=10)
    alerts.push({lvl:'blue',  ico:'❄', msg:`Yoğun kar — 6 saatte ${maxSnow6h.toFixed(1)} cm bekleniyor`});
  else if(maxSnow6h>=3)
    alerts.push({lvl:'blue',  ico:'🌨', msg:`Kar yağışı bekleniyor (${maxSnow6h.toFixed(1)} cm/6sa) — yollar kaygan`});

  // Kar erimesi / çığ
  if(snowSum3d>=20 && (maxTemp??0)>=5)
    alerts.push({lvl:'orange',ico:'🏔', msg:`Kar erimesi riski — ${snowSum3d.toFixed(0)} cm kar birikimi, sıcaklık yükseliyor`});

  // Buzlanma / don
  if(minTemp!=null && minTemp<=-5)
    alerts.push({lvl:'blue',  ico:'🧊', msg:`Şiddetli don — gece ${Math.round(minTemp)}°C · buzlanma tehlikesi`});
  else if(minTemp!=null && minTemp<=0)
    alerts.push({lvl:'blue',  ico:'🧊', msg:`Don riski — gece ${Math.round(minTemp)}°C'ye düşecek`});
  else if(minTemp!=null && minTemp<=3)
    alerts.push({lvl:'yellow',ico:'🧊', msg:`Gece sıfıra yakın — ${Math.round(minTemp)}°C bekleniyor`});

  // Sis / düşük görüş
  if(isFogCode && vis<500)
    alerts.push({lvl:'orange',ico:'🌫', msg:`Yoğun sis — görüş ${vis} m · sürüş tehlikeli`});
  else if(isFogCode || vis<1000)
    alerts.push({lvl:'yellow',ico:'🌫', msg:`Sis / düşük görüş — ${(vis/1000).toFixed(1)} km`});

  // Ani sıcaklık değişimi
  if(tempDiff<=-12)
    alerts.push({lvl:'blue',  ico:'🌡', msg:`Yarın ani soğuma — ${Math.abs(tempDiff).toFixed(0)}°C düşüş`});
  else if(tempDiff<=-7)
    alerts.push({lvl:'yellow',ico:'🌡', msg:`Yarın sıcaklık ${Math.abs(tempDiff).toFixed(0)}°C düşecek`});
  else if(tempDiff>=12)
    alerts.push({lvl:'orange',ico:'🌡', msg:`Yarın ani ısınma — ${tempDiff.toFixed(0)}°C artış`});
  else if(tempDiff>=7)
    alerts.push({lvl:'yellow',ico:'🌡', msg:`Yarın sıcaklık ${tempDiff.toFixed(0)}°C yükselecek`});

  // Aşırı sıcak
  if(feelsMax!=null && feelsMax>=40)
    alerts.push({lvl:'red',   ico:'🔥', msg:`Tehlikeli sıcak — hissedilen ${Math.round(feelsMax)}°C · dışarı çıkmayın`});
  else if(feelsMax!=null && feelsMax>=35)
    alerts.push({lvl:'orange',ico:'🔥', msg:`Aşırı sıcak — hissedilen ${Math.round(feelsMax)}°C · bol su için`});
  else if(feelsMax!=null && feelsMax>=32)
    alerts.push({lvl:'yellow',ico:'🔥', msg:`Sıcak hava dalgası — hissedilen ${Math.round(feelsMax)}°C`});

  // Yüksek UV
  if(uv>=11)
    alerts.push({lvl:'red',   ico:'☀', msg:`Aşırı UV (${uv.toFixed(1)}) — güneş kremi ve gölge zorunlu`});
  else if(uv>=8)
    alerts.push({lvl:'orange',ico:'☀', msg:`Yüksek UV (${uv.toFixed(1)}) — güneş kremi kullanın`});
  else if(uv>=6)
    alerts.push({lvl:'yellow',ico:'☀', msg:`Orta-yüksek UV (${uv.toFixed(1)}) — öğlen saatlerinde dikkat`});

  // Toz taşınımı
  if(vis<3000 && ws>=30 && humidity<30 && code<=3)
    alerts.push({lvl:'orange',ico:'🏜', msg:`Toz fırtınası ihtimali — düşük nem, görüş ${(vis/1000).toFixed(1)} km`});
  else if(vis<5000 && ws>=20 && humidity<25 && code<=3)
    alerts.push({lvl:'yellow',ico:'🏜', msg:`Toz taşınımı olabilir — kuru ve rüzgarlı hava`});

  return alerts;
}

const WX_ALERT_COLORS = {
  red:    {bg:'rgba(239,68,68,.15)',  border:'rgba(239,68,68,.4)',   text:'#fca5a5'},
  orange: {bg:'rgba(249,115,22,.12)', border:'rgba(249,115,22,.35)', text:'#fdba74'},
  yellow: {bg:'rgba(234,179,8,.1)',   border:'rgba(234,179,8,.3)',   text:'#fde047'},
  blue:   {bg:'rgba(96,165,250,.12)', border:'rgba(96,165,250,.35)', text:'#93c5fd'},
};
function wxAlertHTML(alerts){
  if(!alerts.length) return '';
  return alerts.map(a=>{
    const col = WX_ALERT_COLORS[a.lvl]||WX_ALERT_COLORS.yellow;
    return `<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;background:${col.bg};border:1px solid ${col.border};margin-bottom:6px">
      <span style="font-size:18px">${a.ico}</span>
      <span style="font-size:12px;font-weight:500;color:${col.text}">${a.msg}</span>
    </div>`;
  }).join('');
}

// ── YAĞIŞ GRAFİĞİ ────────────────────────────────────────────────────
function wxPrecipChart(hourly, daily){
  const now = Date.now();
  const dayStr = daily.time[0];
  const bars = [];
  let maxMm = 0;
  for(let i=0;i<hourly.time.length;i++){
    if(hourly.time[i].split('T')[0] !== dayStr) continue;
    const rain = (hourly.rain||[])[i]||0;
    const snow = (hourly.snowfall||[])[i]||0;
    const precip = (hourly.precipitation||[])[i]||0;
    const total = Math.max(precip, rain+snow);
    const snowFrac = (rain+snow)>0 ? snow/(rain+snow) : 0;
    const rainDisp = total*(1-snowFrac);
    const snowDisp = total*snowFrac;
    maxMm = Math.max(maxMm, total);
    bars.push({h: hourly.time[i], rain: rainDisp, snow: snowDisp, total, prob: hourly.precipitation_probability[i]||0});
  }
  const hasData = maxMm>0 || bars.some(b=>b.prob>=10);
  const BAR_H = 44;
  const scale = maxMm>0 ? maxMm : 1;

  function niceRef(max){
    if(max<=0) return [];
    const candidates=[0.5,1,2,5,10,20,50];
    const step=candidates.find(c=>max/c<=3&&max/c>=1)||Math.ceil(max/2);
    const refs=[];
    for(let v=step;v<max*0.97;v+=step) refs.push(v);
    return refs.slice(0,2);
  }
  const refLines = maxMm>0 ? niceRef(maxMm) : [];

  const barsHTML = bars.map(b=>{
    const hour = new Date(b.h).getHours().toString().padStart(2,'0');
    const rainH = Math.max(b.rain/scale*BAR_H, b.rain>0?2:0);
    const snowH = Math.max(b.snow/scale*BAR_H, b.snow>0?2:0);
    const isNow = new Date(b.h).getTime() <= now && now < new Date(b.h).getTime()+3600000;
    const totalMm = b.rain + b.snow;
    const mmLabel = totalMm>=0.1
      ? `<div style="font-size:7px;color:rgba(56,189,248,.8);line-height:1">${totalMm>=10?totalMm.toFixed(0):totalMm.toFixed(1)}</div>`
      : `<div style="height:9px"></div>`;
    return `<div style="display:flex;flex-direction:column;align-items:center;flex:1;min-width:0;gap:1px">
      ${mmLabel}
      <div style="width:100%;display:flex;flex-direction:column;justify-content:flex-end;height:${BAR_H}px;position:relative">
        ${snowH>0?`<div style="width:65%;margin:0 auto;height:${snowH}px;background:rgba(147,197,253,.75);border-radius:1px"></div>`:''}
        ${rainH>0?`<div style="width:65%;margin:0 auto;height:${rainH}px;background:rgba(56,189,248,.85);border-radius:1px 1px 0 0"></div>`:''}
        ${!rainH&&!snowH&&b.prob>=10?`<div style="width:2px;margin:0 auto;height:2px;background:rgba(255,255,255,.15)"></div>`:''}
      </div>
      ${b.prob>=10?`<div style="font-size:7px;color:rgba(96,165,250,.65)">${b.prob}%</div>`:`<div style="height:10px"></div>`}
      <div style="font-size:8px;color:${isNow?'rgba(232,237,245,.85)':'rgba(232,237,245,.3)'};font-weight:${isNow?'600':'400'}">${isNow?'●':hour}</div>
    </div>`;
  }).join('');

  const refHTML = refLines.map(v=>{
    const bottom = v/scale*BAR_H;
    return `<div style="position:absolute;left:0;right:0;bottom:${bottom}px;display:flex;align-items:center;pointer-events:none">
      <div style="width:100%;height:1px;background:rgba(255,255,255,.08)"></div>
      <div style="position:absolute;right:0;font-size:7px;color:rgba(232,237,245,.25);white-space:nowrap;transform:translateY(-8px)">${v} mm</div>
    </div>`;
  }).join('');

  const totalToday = (daily.precipitation_sum||[])[0]||0;
  const hasSnow = bars.some(b=>b.snow>0.1);
  const hasRain = bars.some(b=>b.rain>0.1);
  const typeLabel = hasSnow&&hasRain?'Kar + Yağmur':hasSnow?'Kar':hasRain?'Yağmur':'Yağış Olasılığı';

  return `<div style="display:flex;flex-direction:column;height:100%">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <div class="wx-det-lbl" style="margin:0">${typeLabel}</div>
      <div style="font-size:9px;color:rgba(232,237,245,.3)">${totalToday.toFixed(1)} mm bugün</div>
    </div>
    ${hasSnow?`<div style="display:flex;gap:10px;margin-bottom:6px;font-size:9px;color:rgba(232,237,245,.35)">
      <span><span style="display:inline-block;width:6px;height:6px;border-radius:1px;background:rgba(56,189,248,.85);vertical-align:middle;margin-right:3px"></span>Yağmur</span>
      <span><span style="display:inline-block;width:6px;height:6px;border-radius:1px;background:rgba(147,197,253,.75);vertical-align:middle;margin-right:3px"></span>Kar</span>
    </div>`:''}
    ${!hasData
      ? `<div style="flex:1;display:flex;align-items:center;justify-content:center;font-size:11px;color:rgba(232,237,245,.2)">Yağış beklenmez</div>`
      : `<div style="position:relative;flex:1">
           <div style="position:absolute;bottom:20px;left:0;right:0;height:${BAR_H}px">${refHTML}</div>
           <div style="display:flex;gap:1px;align-items:flex-end">${barsHTML}</div>
         </div>`
    }
  </div>`;
}

// ── SONRAKI GÜNLER İÇİN YAĞIŞ GRAFİĞİ ──────────────────────────────
function wxDayPrecipChart(hourly, daily, dayIdx){
  const dayStr = daily.time[dayIdx];
  const bars = [];
  let maxMm = 0;
  for(let i=0;i<hourly.time.length;i++){
    if(hourly.time[i].split('T')[0] !== dayStr) continue;
    const rain  = (hourly.rain||[])[i]||0;
    const snow  = (hourly.snowfall||[])[i]||0;
    const precip = (hourly.precipitation||[])[i]||0;
    const total = Math.max(precip, rain+snow);
    const snowFrac = (rain+snow)>0 ? snow/(rain+snow) : 0;
    maxMm = Math.max(maxMm, total);
    bars.push({h:hourly.time[i], rain:total*(1-snowFrac), snow:total*snowFrac, prob:(hourly.precipitation_probability||[])[i]||0});
  }
  const hasData = maxMm>0 || bars.some(b=>b.prob>=10);
  if(!hasData) return '';

  const BAR_H = 56;
  const scale = maxMm>0 ? maxMm : 1;
  const totalDay = (daily.precipitation_sum||[])[dayIdx]||0;
  const hasSnow = bars.some(b=>b.snow>0.1);
  const hasRain = bars.some(b=>b.rain>0.1);
  const typeLabel = hasSnow&&hasRain?'Kar + Yağmur':hasSnow?'Kar':hasRain?'Yağmur':'Yağış Olasılığı';

  function niceRef(max){
    if(max<=0) return [];
    const candidates=[0.5,1,2,5,10,20,50];
    const step=candidates.find(c=>max/c<=3&&max/c>=1)||Math.ceil(max/2);
    const refs=[];
    for(let v=step;v<max*0.97;v+=step) refs.push(v);
    return refs.slice(0,2);
  }
  const refLines = maxMm>0 ? niceRef(maxMm) : [];

  const barsHTML = bars.map(b=>{
    const hour  = new Date(b.h).getHours().toString().padStart(2,'0');
    const rainH = Math.max(b.rain/scale*BAR_H, b.rain>0?2:0);
    const snowH = Math.max(b.snow/scale*BAR_H, b.snow>0?2:0);
    const totalMm = b.rain + b.snow;
    const mmLabel = totalMm>=0.1
      ? `<div style="font-size:8px;color:rgba(56,189,248,.9);line-height:1;font-weight:600">${totalMm>=10?totalMm.toFixed(0):totalMm.toFixed(1)}</div>`
      : `<div style="height:10px"></div>`;
    return `<div style="display:flex;flex-direction:column;align-items:center;flex:1;min-width:0;gap:1px">
      ${mmLabel}
      <div style="width:100%;display:flex;flex-direction:column;justify-content:flex-end;height:${BAR_H}px;position:relative">
        ${snowH>0?`<div style="width:70%;margin:0 auto;height:${snowH}px;background:rgba(147,197,253,.8);border-radius:2px"></div>`:''}
        ${rainH>0?`<div style="width:70%;margin:0 auto;height:${rainH}px;background:rgba(56,189,248,.9);border-radius:2px 2px 0 0"></div>`:''}
        ${!rainH&&!snowH&&b.prob>=10?`<div style="width:2px;margin:0 auto;height:2px;background:rgba(255,255,255,.15)"></div>`:''}
      </div>
      ${b.prob>=10?`<div style="font-size:8px;color:rgba(96,165,250,.75);font-weight:500">${b.prob}%</div>`:`<div style="height:11px"></div>`}
      <div style="font-size:9px;color:rgba(232,237,245,.35)">${hour}</div>
    </div>`;
  }).join('');

  const refHTML = refLines.map(v=>{
    const bottom = v/scale*BAR_H;
    return `<div style="position:absolute;left:0;right:0;bottom:${bottom}px;pointer-events:none;display:flex;align-items:center">
      <div style="width:100%;height:1px;background:rgba(255,255,255,.08)"></div>
      <div style="position:absolute;right:0;font-size:8px;color:rgba(232,237,245,.3);white-space:nowrap;transform:translateY(-9px)">${v} mm</div>
    </div>`;
  }).join('');

  return `<div style="background:rgba(255,255,255,.04);border-radius:10px;padding:12px 14px;height:100%;box-sizing:border-box">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,.45);font-weight:600">${typeLabel}</div>
      ${totalDay>0?`<div style="font-size:10px;color:rgba(56,189,248,.6);font-weight:600">${totalDay.toFixed(1)} mm</div>`:''}
    </div>
    ${hasSnow?`<div style="display:flex;gap:12px;margin-bottom:8px;font-size:9px;color:rgba(232,237,245,.35)">
      <span><span style="display:inline-block;width:7px;height:7px;border-radius:1px;background:rgba(56,189,248,.9);vertical-align:middle;margin-right:4px"></span>Yağmur</span>
      <span><span style="display:inline-block;width:7px;height:7px;border-radius:1px;background:rgba(147,197,253,.8);vertical-align:middle;margin-right:4px"></span>Kar</span>
    </div>`:''}
    <div style="position:relative">
      <div style="position:absolute;bottom:22px;left:0;right:0;height:${BAR_H}px">${refHTML}</div>
      <div style="display:flex;gap:2px;align-items:flex-end">${barsHTML}</div>
    </div>
  </div>`;
}

// ── YAĞIŞ — SAHNE İÇİ MİNİ GRAFİK ──────────────────────────────────
function wxPrecipInner(hourly, daily){
  const dayStr = daily.time[0];
  const now = Date.now();
  const bars = [];
  let maxMm = 0;
  for(let i=0;i<hourly.time.length;i++){
    if(hourly.time[i].split('T')[0]!==dayStr) continue;
    const rain=(hourly.rain||[])[i]||0;
    const snow=(hourly.snowfall||[])[i]||0;
    const prob=hourly.precipitation_probability[i]||0;
    maxMm=Math.max(maxMm,rain+snow);
    bars.push({h:hourly.time[i],rain,snow,prob,isNow:new Date(hourly.time[i]).getTime()<=now&&now<new Date(hourly.time[i]).getTime()+3600000});
  }
  if(maxMm<0.1 && bars.every(b=>b.prob<15)) return '';
  const scale=maxMm>0?maxMm:1;
  const maxBarH=36;
  const barsHTML=bars.map(b=>{
    const hour=new Date(b.h).getHours().toString().padStart(2,'0');
    const rainH=Math.max(b.rain/scale*maxBarH,b.rain>0?2:0);
    const snowH=Math.max(b.snow/scale*maxBarH,b.snow>0?2:0);
    const totalH=rainH+snowH;
    return `<div style="display:flex;flex-direction:column;align-items:center;flex:1;min-width:0;gap:2px">
      <div style="width:100%;display:flex;flex-direction:column;justify-content:flex-end;height:${maxBarH}px">
        ${snowH>0?`<div style="width:60%;margin:0 auto;height:${snowH}px;background:rgba(180,220,255,.75);border-radius:1px"></div>`:''}
        ${rainH>0?`<div style="width:60%;margin:0 auto;height:${rainH}px;background:rgba(56,189,248,.85);border-radius:${snowH?'0':'1px'} ${snowH?'0':'1px'} 0 0"></div>`:''}
        ${totalH===0&&b.prob>10?`<div style="width:2px;margin:0 auto;height:2px;background:rgba(255,255,255,.15)"></div>`:''}
      </div>
      <div style="font-size:8px;color:rgba(255,255,255,${b.isNow?'.9':'.4'});font-weight:${b.isNow?'600':'400'}">${b.isNow?'•':hour}</div>
    </div>`;
  }).join('');
  const totalToday=(daily.precipitation_sum||[])[0]||0;
  const hasSnow=bars.some(b=>b.snow>0.1);
  return `<div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px">
      <div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,.5)">${hasSnow?'Kar / Yağmur':'Yağış'}</div>
      <div style="font-size:9px;color:rgba(255,255,255,.4)">${totalToday.toFixed(1)} mm bugün</div>
    </div>
    <div style="display:flex;gap:1px;align-items:flex-end">${barsHTML}</div>
  </div>`;
}

// ── CANLI HAVA SAHNESİ ────────────────────────────────────────────────
function wxSceneHTML(code, isDay, temp, city){
  const scenes = {
    day_clear:    {sky:['#1a4a8a','#4a90d9','#87ceeb'], label:'Açık Hava'},
    day_cloud:    {sky:['#2a3a4a','#4a5a6a','#7a8a9a'], label:'Bulutlu'},
    day_rain:     {sky:['#1a2535','#2a3545','#3a4555'], label:'Yağmurlu'},
    day_storm:    {sky:['#0e1520','#1a2030','#252e38'], label:'Fırtına'},
    day_snow:     {sky:['#2a3848','#4a5868','#6a7888'], label:'Karlı'},
    night_clear:  {sky:['#020510','#04091a','#060e24'], label:'Açık Gece'},
    night_cloud:  {sky:['#0a0e18','#121620','#1a1e28'], label:'Bulutlu Gece'},
    night_rain:   {sky:['#080c14','#0e121c','#141820'], label:'Yağmurlu Gece'},
    night_storm:  {sky:['#040608','#080c10','#0c1014'], label:'Fırtınalı Gece'},
    night_snow:   {sky:['#0c1020','#141828','#1c2030'], label:'Karlı Gece'},
  };
  let key;
  if(code>=95) key = isDay?'day_storm':'night_storm';
  else if(code>=71&&code<=77||code===85||code===86) key = isDay?'day_snow':'night_snow';
  else if(code>=61) key = isDay?'day_rain':'night_rain';
  else if(code>=3) key = isDay?'day_cloud':'night_cloud';
  else key = isDay?'day_clear':'night_clear';

  const s = scenes[key];
  const [c1,c2,c3] = s.sky;

  let elements = '';

  // Yıldızlar (gece)
  if(!isDay){
    const stars = Array.from({length:40},(_,i)=>{
      const x=Math.random()*100, y=Math.random()*70;
      const sz=Math.random()*1.5+0.5;
      const dur=2+Math.random()*3;
      return `<circle cx="${x}%" cy="${y}%" r="${sz}" fill="white" opacity="${0.4+Math.random()*0.6}" style="animation:wxStarTwinkle ${dur}s ease-in-out ${Math.random()*3}s infinite"/>`;
    }).join('');
    elements += `<svg style="position:absolute;inset:0;width:100%;height:100%">${stars}</svg>`;
  }

  // Ay (gece açık)
  if(!isDay && code<=2){
    elements += `<div style="position:absolute;top:14px;right:18%;width:36px;height:36px">
      <div style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#fffde7,#ffd54f);box-shadow:0 0 20px rgba(255,213,79,.4);animation:wxMoonGlow 4s ease-in-out infinite"></div>
      <div style="position:absolute;top:4px;left:4px;width:8px;height:8px;border-radius:50%;background:rgba(0,0,0,.1)"></div>
      <div style="position:absolute;top:14px;left:8px;width:5px;height:5px;border-radius:50%;background:rgba(0,0,0,.08)"></div>
    </div>`;
  }

  // Güneş (gündüz açık/az bulutlu)
  if(isDay && code<=2){
    elements += `<div style="position:absolute;top:12px;right:14%;width:44px;height:44px">
      <div style="width:44px;height:44px;border-radius:50%;background:radial-gradient(circle,#fff9c4,#ffd600);box-shadow:0 0 30px rgba(255,214,0,.5);animation:wxSunPulse 3s ease-in-out infinite"></div>
    </div>`;
  }

  // Bulutlar
  if(code>=1){
    const opacity = code>=3?0.6:0.35;
    elements += `<div style="position:absolute;top:18px;left:8%;animation:wxCloudDrift 20s linear infinite">
      <div style="width:70px;height:22px;background:rgba(255,255,255,${opacity});border-radius:11px;position:relative">
        <div style="position:absolute;top:-10px;left:12px;width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,${opacity})"></div>
        <div style="position:absolute;top:-6px;left:30px;width:22px;height:22px;border-radius:50%;background:rgba(255,255,255,${opacity})"></div>
      </div>
    </div>
    <div style="position:absolute;top:36px;left:45%;animation:wxCloudDrift2 28s linear infinite">
      <div style="width:90px;height:26px;background:rgba(255,255,255,${opacity*.8});border-radius:13px;position:relative">
        <div style="position:absolute;top:-12px;left:18px;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,${opacity*.8})"></div>
        <div style="position:absolute;top:-7px;left:40px;width:26px;height:26px;border-radius:50%;background:rgba(255,255,255,${opacity*.8})"></div>
      </div>
    </div>`;
  }

  // Yağmur damlaları
  if(code>=51&&code<=82){
    const drops = Array.from({length:18},(_,i)=>{
      const x=4+i*5.5+Math.random()*4;
      const dur=0.7+Math.random()*0.6;
      const delay=Math.random()*1.5;
      return `<div style="position:absolute;left:${x}%;top:-8px;width:1.5px;height:${8+Math.random()*6}px;background:linear-gradient(to bottom,transparent,rgba(120,190,255,.8));border-radius:2px;animation:wxRainDrop ${dur}s linear ${delay}s infinite"></div>`;
    }).join('');
    elements += `<div style="position:absolute;inset:0;overflow:hidden">${drops}</div>`;
  }

  // Kar
  if((code>=71&&code<=77)||code===85||code===86){
    const flakes = Array.from({length:20},(_,i)=>{
      const x=Math.random()*100;
      const sz=4+Math.random()*5;
      const dur=2+Math.random()*3;
      return `<div style="position:absolute;left:${x}%;top:-10px;width:${sz}px;height:${sz}px;border-radius:50%;background:rgba(255,255,255,.8);animation:wxSnowFall ${dur}s linear ${Math.random()*4}s infinite"></div>`;
    }).join('');
    elements += `<div style="position:absolute;inset:0;overflow:hidden">${flakes}</div>`;
  }

  // Şimşek
  if(code>=95){
    elements += `<div style="position:absolute;top:20%;left:40%;animation:wxLightning 4s ease-in-out 2s infinite;opacity:0">
      <svg width="20" height="40" viewBox="0 0 20 40"><polyline points="12,0 4,20 10,20 2,40" fill="none" stroke="#fde047" stroke-width="2.5" stroke-linecap="round"/></svg>
    </div>`;
  }

  // Altta şehir silueti
  elements += `<div style="position:absolute;bottom:0;left:0;right:0">
    <svg viewBox="0 0 400 60" preserveAspectRatio="none" style="width:100%;height:50px;display:block">
      <rect x="0" y="30" width="400" height="30" fill="rgba(0,0,0,.35)"/>
      <rect x="10" y="18" width="18" height="42" fill="rgba(0,0,0,.4)"/>
      <rect x="14" y="22" width="4" height="4" fill="rgba(255,255,200,.15)"/>
      <rect x="14" y="28" width="4" height="4" fill="rgba(255,255,200,.1)"/>
      <rect x="35" y="10" width="22" height="50" fill="rgba(0,0,0,.45)"/>
      <rect x="39" y="15" width="5" height="5" fill="rgba(255,255,200,.2)"/>
      <rect x="47" y="15" width="5" height="5" fill="rgba(255,255,200,.12)"/>
      <rect x="39" y="24" width="5" height="5" fill="rgba(255,255,200,.08)"/>
      <rect x="65" y="22" width="16" height="38" fill="rgba(0,0,0,.35)"/>
      <rect x="85" y="14" width="28" height="46" fill="rgba(0,0,0,.42)"/>
      <rect x="88" y="18" width="6" height="6" fill="rgba(255,255,200,.18)"/>
      <rect x="98" y="18" width="6" height="6" fill="rgba(255,255,200,.1)"/>
      <rect x="120" y="26" width="14" height="34" fill="rgba(0,0,0,.3)"/>
      <rect x="140" y="8" width="32" height="52" fill="rgba(0,0,0,.48)"/>
      <rect x="144" y="12" width="7" height="7" fill="rgba(255,255,200,.22)"/>
      <rect x="155" y="12" width="7" height="7" fill="rgba(255,255,200,.15)"/>
      <rect x="144" y="23" width="7" height="7" fill="rgba(255,255,200,.1)"/>
      <rect x="180" y="20" width="20" height="40" fill="rgba(0,0,0,.36)"/>
      <rect x="208" y="16" width="26" height="44" fill="rgba(0,0,0,.44)"/>
      <rect x="240" y="24" width="18" height="36" fill="rgba(0,0,0,.32)"/>
      <rect x="265" y="12" width="30" height="48" fill="rgba(0,0,0,.46)"/>
      <rect x="268" y="16" width="6" height="6" fill="rgba(255,255,200,.2)"/>
      <rect x="278" y="16" width="6" height="6" fill="rgba(255,255,200,.14)"/>
      <rect x="302" y="22" width="20" height="38" fill="rgba(0,0,0,.34)"/>
      <rect x="328" y="10" width="28" height="50" fill="rgba(0,0,0,.44)"/>
      <rect x="362" y="26" width="16" height="34" fill="rgba(0,0,0,.3)"/>
    </svg>
  </div>`;

  return `<div class="wx-scene-wrap">
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,${c1} 0%,${c2} 55%,${c3} 100%)"></div>
    ${elements}
    <div style="position:absolute;bottom:0;left:0;right:0;height:3px;background:linear-gradient(to right,transparent,rgba(255,255,255,.06),transparent)"></div>
    <div style="position:absolute;top:10px;left:14px;z-index:10">
      <div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.4);margin-bottom:2px">${city.name.toUpperCase()}</div>
      <div style="font-size:22px;font-weight:200;color:#fff">${Math.round(temp)}°</div>
      <div style="font-size:11px;color:rgba(255,255,255,.5);margin-top:1px">${s.label}</div>
    </div>
  </div>`;
}

// ── ANA RENDER ────────────────────────────────────────────────────────
function wxRender(d,city){
  const c=d.current,daily=d.daily,hourly=d.hourly;
  const info=wxc(c.weather_code,c.is_day);
  wxSetAtmo(c.weather_code,c.is_day);
  // Genişletilmiş saatlik kart CSS'i
  if(!document.getElementById('wx-h-extra-css')){
    const s=document.createElement('style');s.id='wx-h-extra-css';
    s.textContent=`
      .wx-h{min-width:62px;gap:3px;padding:9px 8px}
      .wx-h-feels{font-size:9px;color:rgba(232,237,245,.38);line-height:1}
      .wx-h.now .wx-h-feels{color:rgba(232,237,245,.6)}
      .wx-h-rain{font-size:9px;color:#7ab8f5;font-weight:600;height:11px;line-height:11px}
      .wx-h-mm{font-size:9px;color:#38bdf8;font-weight:600;height:11px;line-height:11px}
      .wx-h-wind{font-size:9px;color:rgba(200,220,255,.45);height:11px;line-height:11px}
    `;
    document.head.appendChild(s);
  }

  const dailyHTML=daily.time.map((dt,i)=>{
    const rain=daily.precipitation_probability_max[i];
    return `
      <div class="wx-day-row${i===0?' open':''}" onclick="wxToggleDay(this,${i})">
        <div class="wx-day-name${i===0?' today':''}">${i===0?'Bugün':wxFmtDay(dt)}</div>
        <div class="wx-day-ico">${wxc(daily.weather_code[i],1).e}</div>
        <div class="wx-day-rain">${rain>15?'💧'+rain+'%':''}</div>
        <div class="wx-day-lo">${Math.round(daily.temperature_2m_min[i])}°</div>
        <div class="wx-day-spacer"></div>
        <div class="wx-day-hi">${Math.round(daily.temperature_2m_max[i])}°</div>
        <div class="wx-day-arr">›</div>
      </div>
      <div class="wx-day-expand${i===0?' vis':''}" id="wxde-${i}">
        <div class="wx-day-exp-track">${wxHourlyHTML(hourly,daily,i,i===0)}</div>
      </div>`;
  }).join('');

  // Uyarılar
  const alerts = wxAlerts(c, hourly, daily);
  const alertHTML = wxAlertHTML(alerts);

  const sceneHTML2 = wxSceneHTML(c.weather_code, c.is_day, c.temperature_2m, city);
  const precipHTML = wxPrecipChart(hourly, daily);

  const wxContentEl=document.getElementById('wx-content');if(!wxContentEl)return;wxContentEl.innerHTML=`<div class="wx-stream">
    ${alertHTML}
    <div class="wx-hero-scene-row">
      <div class="wx-hero">
        <div class="wx-hero-loc">Hava Durumu</div>
        <div class="wx-hero-city">${city.name}</div>
        <div class="wx-hero-row">
          <div class="wx-hero-temp">${Math.round(c.temperature_2m)}°</div>
          <div class="wx-hero-meta">
            <div class="wx-hero-cond">${info.t}</div>
            <div class="wx-hero-feels">Hissedilen ${Math.round(c.apparent_temperature)}°</div>
            <div class="wx-hero-range">En yüksek ${Math.round(daily.temperature_2m_max[0])}° · En düşük ${Math.round(daily.temperature_2m_min[0])}°</div>
          </div>
        </div>
      </div>
      ${sceneHTML2}
    </div>

    <div class="wx-sec-lbl">Saatlik Tahmin</div>
    <div class="wx-hourly-track">${wxHourlyHTML(hourly,daily,0,true)}</div>

    <div class="wx-sun-row">
      <div class="wx-sun-card">
        <div class="wx-sun-anim">${wxSunAnim('rise')}</div>
        <div class="wx-sun-info">
          <div class="wx-sun-lbl">Gün Doğumu</div>
          <div class="wx-sun-val">${wxFmtTime(daily.sunrise[0])}</div>
          <div class="wx-sun-sub">İlk ışık</div>
        </div>
      </div>
      <div class="wx-sun-card">
        <div class="wx-sun-anim">${wxSunAnim('set')}</div>
        <div class="wx-sun-info">
          <div class="wx-sun-lbl">Gün Batımı</div>
          <div class="wx-sun-val">${wxFmtTime(daily.sunset[0])}</div>
          <div class="wx-sun-sub">Son ışık</div>
        </div>
      </div>
    </div>

    <div class="wx-det-grid">
      <div class="wx-det">
        ${wxIcoHum}
        <div class="wx-det-lbl">Nem</div>
        <div class="wx-det-val">%${c.relative_humidity_2m}</div>
        <div class="wx-hum-bar"><div class="wx-hum-fill" style="width:${c.relative_humidity_2m}%"></div></div>
        <div class="wx-det-sub">${wxHumD(c.relative_humidity_2m)}<br>Çiğ noktası ${wxDew(c.temperature_2m,c.relative_humidity_2m)}°</div>
      </div>
      <div class="wx-det">
        ${wxIcoWind}
        <div class="wx-det-lbl">Rüzgar</div>
        <div class="wx-det-val">${Math.round(c.wind_speed_10m)}<span style="font-size:13px;opacity:.4"> km/sa</span></div>
        <div class="wx-det-sub">${wxWindDir(c.wind_direction_10m)} yönünden<br>Ani: ${(c.wind_gusts_10m||0).toFixed(0)} km/sa</div>
      </div>
      <div class="wx-det">
        ${wxIcoRain}
        <div class="wx-det-lbl">Yağış</div>
        <div class="wx-det-val">${c.precipitation.toFixed(1)}<span style="font-size:13px;opacity:.4"> mm</span></div>
        <div class="wx-det-sub">Son 1 saat<br>Bugün: ${daily.precipitation_sum[0].toFixed(1)} mm</div>
      </div>
      <div class="wx-det wx-det-precip">
        ${precipHTML}
      </div>
      <div class="wx-det">
        ${wxIcoUV}
        <div class="wx-det-lbl">UV İndeksi</div>
        <div class="wx-det-val">${daily.uv_index_max[0].toFixed(1)}</div>
        <div class="wx-uv-bar"><div class="wx-uv-pin" style="left:${Math.min(94,daily.uv_index_max[0]/11*100)}%"></div></div>
        <div class="wx-det-sub">${wxUvLbl(daily.uv_index_max[0])}</div>
      </div>
      <div class="wx-det">
        ${wxIcoFeels}
        <div class="wx-det-lbl">Hissedilen Sıcaklık</div>
        <div class="wx-det-val">${Math.round(c.apparent_temperature)}°</div>
        <div class="wx-det-sub">${c.apparent_temperature>c.temperature_2m?'Gerçek sıcaklıktan daha sıcak hissettiriyor.':'Gerçek sıcaklıktan daha serin hissettiriyor.'}</div>
      </div>
    </div>

    <div class="wx-sec-lbl">10 Günlük Tahmin</div>
    <div class="wx-daily-wrap">${dailyHTML}</div>
    <div class="wx-foot">Güncellendi ${new Date().getHours().toString().padStart(2,'0')}:${new Date().getMinutes().toString().padStart(2,'0')} · Open-Meteo</div>
  </div>`;

  if(wxContentEl)wxContentEl.style.display='block';
}

function wxToggleDay(row,idx){
  const exp=document.getElementById('wxde-'+idx);
  const isOpen=exp.classList.contains('vis');
  document.querySelectorAll('.wx-day-expand').forEach(e=>e.classList.remove('vis'));
  document.querySelectorAll('.wx-day-row').forEach(e=>e.classList.remove('open'));
  if(!isOpen){exp.classList.add('vis');row.classList.add('open')}
}

window._weatherInit=function(){wxLS();wxRenderTabs();if(wxCities.length)wxFetch(wxActive)};
function refreshWeather(){if(wxCities.length)wxFetch(wxActive)}
setInterval(()=>{if(wxCities.length)wxFetch(wxActive)},15*60*1000);
