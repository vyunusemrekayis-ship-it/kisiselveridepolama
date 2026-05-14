// ── WEATHER v4 ────────────────────────────────────────────────────────
let wxCities=[], wxActive=0, wxData=null;

function wxLS(){ try{wxCities=JSON.parse(localStorage.getItem('wx_v4')||'[]')}catch(e){wxCities=[]} }
function wxSave(){ localStorage.setItem('wx_v4',JSON.stringify(wxCities)) }

const WXC={
  0:{t:'Açık',e:'☀️',o:['#c86820','#1a4a7a']},
  1:{t:'Az Bulutlu',e:'🌤️',o:['#b05818','#1a4570']},
  2:{t:'Parçalı Bulutlu',e:'⛅',o:['#607090','#2a3a50']},
  3:{t:'Kapalı',e:'☁️',o:['#404860','#1a2030']},
  45:{t:'Sisli',e:'🌫️',o:['#606870','#353840']},
  48:{t:'Kırağılı Sis',e:'🌫️',o:['#606870','#353840']},
  51:{t:'Hafif Çiseleme',e:'🌦️',o:['#305070','#101820']},
  53:{t:'Çiseleme',e:'🌦️',o:['#305070','#101820']},
  55:{t:'Yoğun Çise',e:'🌧️',o:['#204060','#080e18']},
  61:{t:'Yağmurlu',e:'🌧️',o:['#204060','#080e18']},
  63:{t:'Orta Yağmur',e:'🌧️',o:['#182838','#060c12']},
  65:{t:'Şiddetli Yağmur',e:'🌧️',o:['#102030','#040810']},
  71:{t:'Hafif Kar',e:'🌨️',o:['#6080a0','#2a3848']},
  73:{t:'Kar',e:'❄️',o:['#7090b0','#303e50']},
  75:{t:'Yoğun Kar',e:'❄️',o:['#80a0c0','#404e60']},
  80:{t:'Sağanak',e:'🌦️',o:['#254560','#0a1018']},
  81:{t:'Kuvvetli Sağanak',e:'🌧️',o:['#1a3050','#060c10']},
  82:{t:'Şiddetli Sağanak',e:'⛈️',o:['#102030','#040810']},
  95:{t:'Fırtına',e:'⛈️',o:['#1a1e28','#060810']},
  96:{t:'Dolulu Fırtına',e:'⛈️',o:['#14181e','#040608']},
  99:{t:'Şiddetli Fırtına',e:'⛈️',o:['#10141a','#030508']},
};
function wxc(code,isDay=1){
  const b=WXC[code]||WXC[3];
  if(!isDay) return{...b,e:'🌙',o:['#1a2050','#050810']};
  return b;
}

function wxSetAtmo(code,isDay){
  const{o}=wxc(code,isDay);
  const o1=document.getElementById('wx-orb1'),o2=document.getElementById('wx-orb2');
  if(o1){o1.style.background=o[0];o1.style.opacity='0.2'}
  if(o2){o2.style.background=o[1];o2.style.opacity='0.15'}
}

// ── TABS ─────────────────────────────────────────────────────────────
function wxRenderTabs(){
  const el=document.getElementById('wx-tabs');
  if(!wxCities.length){el.innerHTML='';return}
  el.innerHTML=wxCities.map((c,i)=>`
    <div class="wx-tab${i===wxActive?' on':''}" onclick="wxSelect(${i})">
      ${c.name}${c.gps?' 📍':''}
      ${c.temp!==undefined?`<span style="opacity:.6;font-size:11px">${Math.round(c.temp)}°</span>`:''}
      <button class="wx-tab-del" onclick="wxDel(${i},event)">×</button>
    </div>`).join('');
}

function wxSelect(i){
  wxActive=i; wxRenderTabs(); wxFetch(i);
}
function wxDel(i,e){
  e.stopPropagation();
  wxCities.splice(i,1); wxSave();
  if(wxActive>=wxCities.length) wxActive=Math.max(0,wxCities.length-1);
  wxRenderTabs();
  if(wxCities.length) wxFetch(wxActive);
  else{
    document.getElementById('wx-welcome').style.display='flex';
    document.getElementById('wx-content').style.display='none';
  }
}

// ── POPUP ────────────────────────────────────────────────────────────
function wxToggleSearch(e){
  e.stopPropagation();
  const p=document.getElementById('wx-popup');
  p.classList.toggle('vis');
  if(p.classList.contains('vis')) setTimeout(()=>document.getElementById('wx-inp').focus(),50);
}
document.addEventListener('click',function(e){
  if(!e.target.closest('#wx-popup')&&!e.target.closest('.wx-add-btn')){
    document.getElementById('wx-popup')?.classList.remove('vis');
  }
});

// ── ARAMA ────────────────────────────────────────────────────────────
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
  document.getElementById('wx-popup').classList.remove('vis');
}
async function wxAddByEnter(){
  const q=document.getElementById('wx-inp').value.trim();
  if(!q)return;
  try{
    const r=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=tr&format=json`);
    const d=await r.json();
    if(!d.results?.length)return;
    const c=d.results[0];
    wxPickSug(c.latitude,c.longitude,c.name,c.country||'',c.admin1||'');
  }catch(e){}
}
function wxAddCity(city){
  const ex=wxCities.findIndex(c=>Math.abs(c.lat-city.lat)<0.01&&Math.abs(c.lon-city.lon)<0.01);
  if(ex>=0){wxActive=ex;wxRenderTabs();wxFetch(ex);return}
  wxCities.push(city); wxSave();
  wxActive=wxCities.length-1; wxRenderTabs(); wxFetch(wxActive);
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

// ── LOADING ──────────────────────────────────────────────────────────
function wxShowLoad(){
  document.getElementById('wx-welcome').style.display='none';
  document.getElementById('wx-content').style.display='none';
  document.getElementById('wx-loading').style.display='flex';
}
function wxHideLoad(){document.getElementById('wx-loading').style.display='none'}

// ── VERİ ─────────────────────────────────────────────────────────────
async function wxFetch(idx){
  const city=wxCities[idx];if(!city)return;
  wxShowLoad();
  const url=`https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}`
    +`&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,visibility,wind_gusts_10m`
    +`&hourly=temperature_2m,weather_code,precipitation_probability,precipitation,is_day`
    +`&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max`
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

// ── GÜNEŞ SVG ANİMASYONU ─────────────────────────────────────────────
function wxSunSVG(type){
  // type: 'rise' | 'set'
  if(type==='rise') return `
    <svg class="wx-rise-svg" width="64" height="64" viewBox="0 0 64 64" fill="none">
      <!-- ufuk -->
      <line class="horizon" x1="8" y1="46" x2="56" y2="46" stroke="rgba(255,160,50,.5)" stroke-width="1.5" stroke-linecap="round"/>
      <!-- güneş gövdesi -->
      <circle class="sun-body" cx="32" cy="36" r="10" fill="#fbbf24" opacity=".95"/>
      <!-- ışınlar -->
      <g class="ray">
        <line x1="32" y1="12" x2="32" y2="18" stroke="#fbbf24" stroke-width="2" stroke-linecap="round"/>
        <line x1="32" y1="54" x2="32" y2="60" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" opacity=".3"/>
        <line x1="14" y1="18" x2="18" y2="22" stroke="#fbbf24" stroke-width="2" stroke-linecap="round"/>
        <line x1="50" y1="18" x2="46" y2="22" stroke="#fbbf24" stroke-width="2" stroke-linecap="round"/>
        <line x1="8" y1="36" x2="14" y2="36" stroke="#fbbf24" stroke-width="2" stroke-linecap="round"/>
        <line x1="56" y1="36" x2="50" y2="36" stroke="#fbbf24" stroke-width="2" stroke-linecap="round"/>
      </g>
      <!-- alçak ufuk parlaması -->
      <ellipse cx="32" cy="46" rx="22" ry="6" fill="url(#riseGlow)" opacity=".6"/>
      <defs>
        <radialGradient id="riseGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#f97316" stop-opacity=".8"/>
          <stop offset="100%" stop-color="#f97316" stop-opacity="0"/>
        </radialGradient>
      </defs>
    </svg>`;

  // set
  return `
    <svg class="wx-set-svg" width="64" height="64" viewBox="0 0 64 64" fill="none">
      <line class="horizon" x1="8" y1="46" x2="56" y2="46" stroke="rgba(255,120,30,.4)" stroke-width="1.5" stroke-linecap="round"/>
      <circle class="sun-body" cx="32" cy="40" r="10" fill="#f97316" opacity=".85"/>
      <g class="ray">
        <line x1="32" y1="14" x2="32" y2="20" stroke="#f97316" stroke-width="2" stroke-linecap="round"/>
        <line x1="14" y1="22" x2="18" y2="26" stroke="#f97316" stroke-width="2" stroke-linecap="round"/>
        <line x1="50" y1="22" x2="46" y2="26" stroke="#f97316" stroke-width="2" stroke-linecap="round"/>
        <line x1="8" y1="38" x2="14" y2="38" stroke="#f97316" stroke-width="2" stroke-linecap="round"/>
        <line x1="56" y1="38" x2="50" y2="38" stroke="#f97316" stroke-width="2" stroke-linecap="round"/>
      </g>
      <ellipse class="sky-glow" cx="32" cy="44" rx="28" ry="10" fill="url(#setGlow)"/>
      <defs>
        <radialGradient id="setGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ea580c" stop-opacity=".7"/>
          <stop offset="100%" stop-color="#ea580c" stop-opacity="0"/>
        </radialGradient>
      </defs>
    </svg>`;
}

// ── SAATLİK HTML ─────────────────────────────────────────────────────
function wxHourlyHTML(hourly,daily,dayIdx,isToday){
  const now=Date.now();
  const dayStr=daily.time[dayIdx];
  const sunrise=daily.sunrise[dayIdx], sunset=daily.sunset[dayIdx];
  const items=[];
  for(let i=0;i<hourly.time.length;i++){
    const htDay=hourly.time[i].split('T')[0];
    if(htDay!==dayStr)continue;
    const ht=new Date(hourly.time[i]);
    if(isToday&&ht.getTime()<now-1800000)continue;
    items.push({ts:ht.getTime(),time:ht,code:hourly.weather_code[i],isDay:hourly.is_day[i],temp:hourly.temperature_2m[i],rain:hourly.precipitation_probability[i],isNow:isToday&&items.length===0});
  }
  const extras=[];
  if(sunrise) extras.push({ts:new Date(sunrise).getTime(),isSol:true,type:'rise',time:sunrise});
  if(sunset)  extras.push({ts:new Date(sunset).getTime(),isSol:true,type:'set',time:sunset});
  const merged=[...items,...extras].sort((a,b)=>a.ts-b.ts);
  return merged.map(h=>{
    if(h.isSol) return `<div class="wx-h sol">
      <div class="wx-h-t">${wxFmtTime(h.time)}</div>
      <div class="wx-h-ico">${h.type==='rise'?'🌅':'🌇'}</div>
      <div class="wx-h-rain"></div>
      <div class="wx-h-temp">${h.type==='rise'?'Doğuyor':'Batıyor'}</div>
    </div>`;
    return `<div class="wx-h${h.isNow?' now':''}">
      <div class="wx-h-t">${h.isNow?'Şu An':h.time.getHours().toString().padStart(2,'0')+':00'}</div>
      <div class="wx-h-ico">${wxc(h.code,h.isDay).e}</div>
      <div class="wx-h-rain">${h.rain>15?'💧'+h.rain+'%':''}</div>
      <div class="wx-h-temp">${Math.round(h.temp)}°</div>
    </div>`;
  }).join('');
}

// ── ANA RENDER ────────────────────────────────────────────────────────
function wxRender(d,city){
  const c=d.current,daily=d.daily,hourly=d.hourly;
  const info=wxc(c.weather_code,c.is_day);
  wxSetAtmo(c.weather_code,c.is_day);

  const dMin=Math.min(...daily.temperature_2m_min);
  const dMax=Math.max(...daily.temperature_2m_max);
  const dRange=dMax-dMin||1;

  const dailyHTML=daily.time.map((dt,i)=>{
    const bL=((daily.temperature_2m_min[i]-dMin)/dRange*100).toFixed(1);
    const bW=((daily.temperature_2m_max[i]-daily.temperature_2m_min[i])/dRange*100).toFixed(1);
    const rain=daily.precipitation_probability_max[i];
    return `
      <div class="wx-day-row${i===0?' open':''}" onclick="wxToggleDay(this,${i})">
        <div class="wx-day-name${i===0?' today':''}">${i===0?'Bugün':wxFmtDay(dt)}</div>
        <div class="wx-day-ico">${wxc(daily.weather_code[i],1).e}</div>
        <div class="wx-day-rain">${rain>15?'💧'+rain+'%':''}</div>
        <div class="wx-day-lo">${Math.round(daily.temperature_2m_min[i])}°</div>
        <div class="wx-day-bar-wrap"><div class="wx-day-bar-fill" style="left:${bL}%;width:${bW}%"></div></div>
        <div class="wx-day-hi">${Math.round(daily.temperature_2m_max[i])}°</div>
        <div class="wx-day-arr">›</div>
      </div>
      <div class="wx-day-expand${i===0?' vis':''}" id="wxde-${i}">
        <div class="wx-day-exp-track">${wxHourlyHTML(hourly,daily,i,i===0)}</div>
      </div>`;
  }).join('');

  document.getElementById('wx-content').innerHTML=`<div class="wx-stream">
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

    <div class="wx-sec-lbl">Saatlik Tahmin</div>
    <div class="wx-hourly-track">${wxHourlyHTML(hourly,daily,0,true)}</div>

    <div class="wx-sun-row">
      <div class="wx-sun-card">
        <div class="wx-sun-anim">${wxSunSVG('rise')}</div>
        <div class="wx-sun-info">
          <div class="wx-sun-lbl">Gün Doğumu</div>
          <div class="wx-sun-val">${wxFmtTime(daily.sunrise[0])}</div>
          <div class="wx-sun-sub">İlk ışık</div>
        </div>
      </div>
      <div class="wx-sun-card">
        <div class="wx-sun-anim">${wxSunSVG('set')}</div>
        <div class="wx-sun-info">
          <div class="wx-sun-lbl">Gün Batımı</div>
          <div class="wx-sun-val">${wxFmtTime(daily.sunset[0])}</div>
          <div class="wx-sun-sub">Son ışık</div>
        </div>
      </div>
    </div>

    <div class="wx-det-grid">
      <div class="wx-det">
        <div class="wx-det-ico">💧</div>
        <div class="wx-det-lbl">Nem</div>
        <div class="wx-det-val">%${c.relative_humidity_2m}</div>
        <div class="wx-hum-bar"><div class="wx-hum-fill" style="width:${c.relative_humidity_2m}%"></div></div>
        <div class="wx-det-sub">${wxHumD(c.relative_humidity_2m)}<br>Çiğ noktası ${wxDew(c.temperature_2m,c.relative_humidity_2m)}°</div>
      </div>
      <div class="wx-det">
        <div class="wx-det-ico">💨</div>
        <div class="wx-det-lbl">Rüzgar</div>
        <div class="wx-det-val">${Math.round(c.wind_speed_10m)}<span style="font-size:13px;opacity:.45"> km/sa</span></div>
        <div class="wx-det-sub">${wxWindDir(c.wind_direction_10m)} yönünden<br>Ani: ${(c.wind_gusts_10m||0).toFixed(0)} km/sa</div>
      </div>
      <div class="wx-det">
        <div class="wx-det-ico">🌡️</div>
        <div class="wx-det-lbl">Basınç</div>
        <div class="wx-det-val">${Math.round(c.surface_pressure)}<span style="font-size:13px;opacity:.45"> hPa</span></div>
        <div class="wx-det-sub">${wxPresD(c.surface_pressure)}</div>
      </div>
      <div class="wx-det">
        <div class="wx-det-ico">👁️</div>
        <div class="wx-det-lbl">Görüş Mesafesi</div>
        <div class="wx-det-val">${c.visibility>=1000?(c.visibility/1000).toFixed(0)+'<span style="font-size:13px;opacity:.45"> km</span>':c.visibility+'<span style="font-size:13px;opacity:.45"> m</span>'}</div>
        <div class="wx-det-sub">${wxVisD(c.visibility)}</div>
      </div>
      <div class="wx-det">
        <div class="wx-det-ico">🌧️</div>
        <div class="wx-det-lbl">Yağış</div>
        <div class="wx-det-val">${c.precipitation.toFixed(1)}<span style="font-size:13px;opacity:.45"> mm</span></div>
        <div class="wx-det-sub">Son 1 saat<br>Bugün: ${daily.precipitation_sum[0].toFixed(1)} mm</div>
      </div>
      <div class="wx-det">
        <div class="wx-det-ico">☀️</div>
        <div class="wx-det-lbl">UV İndeksi</div>
        <div class="wx-det-val">${daily.uv_index_max[0].toFixed(1)}</div>
        <div class="wx-uv-bar"><div class="wx-uv-pin" style="left:${Math.min(94,daily.uv_index_max[0]/11*100)}%"></div></div>
        <div class="wx-det-sub">${wxUvLbl(daily.uv_index_max[0])}</div>
      </div>
      <div class="wx-det" style="grid-column:span 2">
        <div class="wx-det-ico">🌡️</div>
        <div class="wx-det-lbl">Hissedilen Sıcaklık</div>
        <div class="wx-det-val">${Math.round(c.apparent_temperature)}°</div>
        <div class="wx-det-sub">${c.apparent_temperature>c.temperature_2m?'Gerçek sıcaklıktan daha sıcak hissettiriyor.':'Gerçek sıcaklıktan daha serin hissettiriyor.'}</div>
      </div>
    </div>

    <div class="wx-sec-lbl">10 Günlük Tahmin</div>
    <div class="wx-daily-wrap">${dailyHTML}</div>
    <div class="wx-foot">Güncellendi ${new Date().getHours().toString().padStart(2,'0')}:${new Date().getMinutes().toString().padStart(2,'0')} · Open-Meteo</div>
  </div>`;

  document.getElementById('wx-content').style.display='block';
}

function wxToggleDay(row,idx){
  const exp=document.getElementById('wxde-'+idx);
  const isOpen=exp.classList.contains('vis');
  document.querySelectorAll('.wx-day-expand').forEach(e=>e.classList.remove('vis'));
  document.querySelectorAll('.wx-day-row').forEach(e=>e.classList.remove('open'));
  if(!isOpen){exp.classList.add('vis');row.classList.add('open')}
}

window._weatherInit=function(){
  wxLS(); wxRenderTabs();
  if(wxCities.length) wxFetch(wxActive);
};
function refreshWeather(){ if(wxCities.length) wxFetch(wxActive); }
setInterval(()=>{if(wxCities.length)wxFetch(wxActive)},15*60*1000);
