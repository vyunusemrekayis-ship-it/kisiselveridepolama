// ── APPLE WEATHER STYLE JS ───────────────────────────────────────────

// Şehir listesi state
let awCities = [];
let awActiveCityIdx = 0;
let awCurrentData = null;

// Kayıtlı şehirleri yükle
function awLoadCities(){
  try{ awCities = JSON.parse(localStorage.getItem('gn_aw_cities')||'[]'); }
  catch(e){ awCities = []; }
}
function awSaveCities(){ localStorage.setItem('gn_aw_cities', JSON.stringify(awCities)); }

// Hava kodu bilgisi
const AWC = {
  0:{e:'☀️',t:'Açık',bg:['#1a3a5c','#2d6a9f','#f7971e']},
  1:{e:'🌤️',t:'Az Bulutlu',bg:['#1a3a5c','#2d6a9f','#4a8ab0']},
  2:{e:'⛅',t:'Parçalı Bulutlu',bg:['#2a3f5c','#3a5070','#5a7080']},
  3:{e:'☁️',t:'Kapalı',bg:['#2a3240','#3a4250','#4a5260']},
  45:{e:'🌫️',t:'Sisli',bg:['#3a4248','#5a6268','#7a8288']},
  48:{e:'🌫️',t:'Kırağı',bg:['#3a4248','#5a6268','#7a8288']},
  51:{e:'🌦️',t:'Hafif Çiseleyen',bg:['#1a2a40','#2a4060','#3a6070']},
  53:{e:'🌦️',t:'Çiseleyen',bg:['#1a2a40','#2a4060','#3a6070']},
  55:{e:'🌧️',t:'Yoğun Çise',bg:['#151f30','#253050','#354060']},
  61:{e:'🌧️',t:'Yağmurlu',bg:['#151f30','#253050','#354060']},
  63:{e:'🌧️',t:'Orta Yağmur',bg:['#101828','#202838','#303848']},
  65:{e:'🌧️',t:'Şiddetli Yağmur',bg:['#0a1020','#1a2030','#2a3040']},
  71:{e:'🌨️',t:'Hafif Kar',bg:['#2a3848','#3a4858','#8a9aaa']},
  73:{e:'❄️',t:'Kar',bg:['#2a3848','#4a5868','#9aaaba']},
  75:{e:'❄️',t:'Yoğun Kar',bg:['#3a4858','#5a6878','#aabaca']},
  80:{e:'🌦️',t:'Sağanak',bg:['#151f30','#253050','#354060']},
  81:{e:'🌧️',t:'Kuvvetli Sağanak',bg:['#101828','#202838','#303848']},
  82:{e:'⛈️',t:'Şiddetli Sağanak',bg:['#0a1020','#1a2030','#2a3040']},
  95:{e:'⛈️',t:'Fırtına',bg:['#0a0f18','#141922','#242932']},
  96:{e:'⛈️',t:'Dolu',bg:['#0a0f18','#141922','#242932']},
  99:{e:'⛈️',t:'Şiddetli Fırtına',bg:['#060a10','#101518','#1a1f24']},
};

function awcInfo(code, isDay=1){
  const b = AWC[code] || AWC[3];
  if(!isDay) return {...b, e:'🌙', bg:['#0a0f20','#101828','#1a2238']};
  return b;
}

function awWindDir(deg){
  return ['K','KKD','KD','DKD','D','DGD','GD','GGD','G','GGB','GB','BGB','B','BKB','KB','KKB'][Math.round(deg/22.5)%16];
}

function awFmtTime(s){ const d=new Date(s); return d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0'); }

function awFmtDate(s){ 
  const d=new Date(s+'T12:00:00');
  const days=['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'];
  return days[d.getDay()];
}

// GPS ile konum al
async function awUseGPS(){
  if(!navigator.geolocation){ alert('Konum desteklenmiyor.'); return; }
  awShowLoading();
  navigator.geolocation.getCurrentPosition(async pos => {
    const lat = pos.coords.latitude, lon = pos.coords.longitude;
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
      const d = await r.json();
      const name = d.address?.city||d.address?.town||d.address?.village||'Konumum';
      const city = {name, lat, lon, isGPS:true};
      if(!awCities.find(c=>Math.abs(c.lat-lat)<0.01)){
        awCities.unshift(city);
        awSaveCities();
      }
      awActiveCityIdx = awCities.findIndex(c=>Math.abs(c.lat-lat)<0.01);
      awRenderCityList();
      awFetchCity(awActiveCityIdx);
    } catch(e){ awHideLoading(); }
  }, ()=> awHideLoading());
}

// Şehir arama önerisi
let awSuggestTimer = null;
async function awSearchSuggest(q){
  clearTimeout(awSuggestTimer);
  const el = document.getElementById('aw-suggest');
  if(!q||q.length<2){ el.style.display='none'; return; }
  awSuggestTimer = setTimeout(async()=>{
    try {
      const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=tr&format=json`);
      const d = await r.json();
      if(!d.results?.length){ el.style.display='none'; return; }
      el.style.display='block';
      el.innerHTML = d.results.map(c=>`
        <div onclick="awSelectSuggest(${c.latitude},${c.longitude},'${c.name.replace(/'/g,"\\'")}','${(c.country||'').replace(/'/g,"\\'")}','${(c.admin1||'').replace(/'/g,"\\'")}' )" 
          style="padding:8px 10px;border-radius:8px;cursor:pointer;transition:background .1s;color:#fff;font-size:12px" 
          onmouseenter="this.style.background='rgba(255,255,255,.1)'" 
          onmouseleave="this.style.background='transparent'">
          <div style="font-weight:600">${c.name}</div>
          <div style="font-size:10px;color:rgba(255,255,255,.45)">${c.admin1?c.admin1+', ':''}${c.country||''}</div>
        </div>`).join('');
    } catch(e){}
  }, 300);
}

function awSelectSuggest(lat, lon, name, country, admin1){
  const fullName = admin1 && admin1!==name ? `${name}, ${admin1}` : name;
  const city = {name:fullName, country, lat, lon};
  if(!awCities.find(c=>Math.abs(c.lat-lat)<0.01 && Math.abs(c.lon-lon)<0.01)){
    awCities.push(city);
    awSaveCities();
  }
  awActiveCityIdx = awCities.findIndex(c=>Math.abs(c.lat-lat)<0.01);
  document.getElementById('aw-search-input').value='';
  document.getElementById('aw-suggest').style.display='none';
  awRenderCityList();
  awFetchCity(awActiveCityIdx);
}

async function awAddCity(){
  const q = document.getElementById('aw-search-input').value.trim();
  if(!q) return;
  awShowLoading();
  try {
    const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=tr&format=json`);
    const d = await r.json();
    if(!d.results?.length){ awHideLoading(); return; }
    const c = d.results[0];
    awSelectSuggest(c.latitude, c.longitude, c.name, c.country||'', c.admin1||'');
  } catch(e){ awHideLoading(); }
}

function awSelectCity(idx){
  awActiveCityIdx = idx;
  awRenderCityList();
  awFetchCity(idx);
}

function awRemoveCity(idx, e){
  e.stopPropagation();
  awCities.splice(idx,1);
  awSaveCities();
  if(awActiveCityIdx >= awCities.length) awActiveCityIdx = Math.max(0, awCities.length-1);
  awRenderCityList();
  if(awCities.length) awFetchCity(awActiveCityIdx);
  else {
    document.getElementById('aw-welcome').style.display='flex';
    document.getElementById('aw-weather-content').style.display='none';
  }
}

function awRenderCityList(){
  const el = document.getElementById('aw-city-list');
  if(!awCities.length){
    el.innerHTML='<div style="padding:20px;text-align:center;font-size:12px;color:rgba(255,255,255,.3)">Henüz şehir eklenmedi</div>';
    return;
  }
  el.innerHTML = awCities.map((c,i)=>`
    <div class="aw-city-card${i===awActiveCityIdx?' active':''}" onclick="awSelectCity(${i})">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div class="aw-city-name">${c.name}${c.isGPS?' 📍':''}</div>
          <div class="aw-city-sub">${c.condition||''}</div>
        </div>
        <div style="text-align:right">
          <div class="aw-city-temp">${c.temp!==undefined?Math.round(c.temp)+'°':'—'}</div>
          <button onclick="awRemoveCity(${i},event)" style="background:none;border:none;color:rgba(255,255,255,.3);cursor:pointer;font-size:16px;padding:0;margin-top:4px">×</button>
        </div>
      </div>
      ${c.high!==undefined?`<div class="aw-city-range" style="margin-top:4px">Y:${Math.round(c.high)}° D:${Math.round(c.low)}°</div>`:''}
    </div>`).join('');
}

// Veri çek
async function awFetchCity(idx){
  const city = awCities[idx];
  if(!city) return;
  awShowLoading();
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}`
    +`&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,visibility,wind_gusts_10m`
    +`&hourly=temperature_2m,weather_code,precipitation_probability,precipitation,is_day,wind_speed_10m`
    +`&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,wind_speed_10m_max,precipitation_probability_max`
    +`&timezone=auto&wind_speed_unit=kmh&forecast_days=10`;
  try {
    const r = await fetch(url);
    const d = await r.json();
    awCurrentData = d;
    // Şehir bilgilerini güncelle
    awCities[idx].temp = d.current.temperature_2m;
    awCities[idx].high = d.daily.temperature_2m_max[0];
    awCities[idx].low = d.daily.temperature_2m_min[0];
    awCities[idx].condition = awcInfo(d.current.weather_code, d.current.is_day).t;
    awSaveCities();
    awRenderCityList();
    awHideLoading();
    awRenderWeather(d, city);
  } catch(e){ awHideLoading(); }
}

// Ana render
function awRenderWeather(d, city){
  const c = d.current, daily = d.daily, hourly = d.hourly;
  const info = awcInfo(c.weather_code, c.is_day);
  
  // Arka plan
  const bg = document.getElementById('aw-bg');
  if(bg) bg.style.background = `linear-gradient(to bottom, ${info.bg[0]}, ${info.bg[1]} 40%, ${info.bg[2]})`;
  
  // Saatlik veri - gündoğumu/batımı ekle
  const now = Date.now();
  const hourlyItems = [];
  let shown = 0;
  for(let i=0; i<hourly.time.length && shown<24; i++){
    const ht = new Date(hourly.time[i]);
    if(ht.getTime() < now - 1800000) continue;
    // Gündoğumu/batımı bu saate denk geliyor mu?
    const hStr = ht.getHours().toString().padStart(2,'0')+':';
    let special = null;
    if(daily.sunrise[0] && daily.sunrise[0].includes('T'+hStr)) special = {type:'rise',time:awFmtTime(daily.sunrise[0])};
    if(daily.sunset[0] && daily.sunset[0].includes('T'+hStr)) special = {type:'set',time:awFmtTime(daily.sunset[0])};
    hourlyItems.push({hour:ht, code:hourly.weather_code[i], isDay:hourly.is_day[i], temp:hourly.temperature_2m[i], rain:hourly.precipitation_probability[i], special, isNow:shown===0});
    shown++;
  }

  // Min/max sıcaklık (saatlik bar için)
  const hTemps = hourlyItems.map(h=>h.temp);
  const hMin = Math.min(...hTemps), hMax = Math.max(...hTemps), hRange = hMax-hMin||1;

  // 10 günlük min/max (bar için)
  const dMin = Math.min(...daily.temperature_2m_min);
  const dMax = Math.max(...daily.temperature_2m_max);
  const dRange = dMax-dMin||1;

  const html = `
  <div class="aw-fade">
    <!-- Hero -->
    <div class="aw-hero">
      <div class="aw-hero-loc">KONUMUM</div>
      <div class="aw-hero-city">${city.name}</div>
      <div class="aw-hero-temp">${Math.round(c.temperature_2m)}°</div>
      <div class="aw-hero-cond">${info.t}</div>
      <div class="aw-hero-range">Y:${Math.round(daily.temperature_2m_max[0])}° D:${Math.round(daily.temperature_2m_min[0])}°</div>
    </div>

    <!-- Özet -->
    <div class="aw-summary">
      ${awGetSummary(d)}
    </div>

    <!-- Saatlik -->
    <div class="aw-hourly-wrap">
      <div class="aw-section-title">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        SAATLİK TAHMİN
      </div>
      <div class="aw-hourly-scroll">
        ${hourlyItems.map((h,idx)=>h.special ? `
          <div class="aw-h-item special">
            <div class="aw-h-time">${h.special.time}</div>
            <div class="aw-h-icon">${h.special.type==='rise'?'🌅':'🌇'}</div>
            <div class="aw-h-rain"></div>
            <div class="aw-h-temp">${h.special.type==='rise'?'Gün Doğumu':'Gün Batımı'}</div>
          </div>` : `
          <div class="aw-h-item${h.isNow?' now':''}">
            <div class="aw-h-time">${h.isNow?'Şu An':h.hour.getHours().toString().padStart(2,'0')+':00'}</div>
            <div class="aw-h-icon">${weatherSVG(h.code, h.isDay, 26)}</div>
            <div class="aw-h-rain">${h.rain>20?'💧'+h.rain+'%':''}</div>
            <div class="aw-h-temp">${Math.round(h.temp)}°</div>
          </div>`).join('')}
      </div>
    </div>

    <!-- 10 Günlük -->
    <div class="aw-daily-wrap">
      <div class="aw-section-title">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        ${daily.time.length} GÜNLÜK TAHMİN
      </div>
      ${daily.time.map((dt,i)=>{
        const barL = ((daily.temperature_2m_min[i]-dMin)/dRange*100).toFixed(0);
        const barW = ((daily.temperature_2m_max[i]-daily.temperature_2m_min[i])/dRange*100).toFixed(0);
        const di = awcInfo(daily.weather_code[i]);
        return `<div class="aw-d-row">
          <div class="aw-d-day">${i===0?'Bugün':awFmtDate(dt)}</div>
          <div class="aw-d-icon">${weatherSVG(daily.weather_code[i],1,22)}</div>
          <div class="aw-d-rain">${daily.precipitation_probability_max[i]>20?'%'+daily.precipitation_probability_max[i]:''}</div>
          <div class="aw-d-low">${Math.round(daily.temperature_2m_min[i])}°</div>
          <div class="aw-d-bar"><div class="aw-d-bar-fill" style="left:${barL}%;width:${barW}%"></div></div>
          <div class="aw-d-high">${Math.round(daily.temperature_2m_max[i])}°</div>
        </div>`;
      }).join('')}
    </div>

    <!-- Detay kartları -->
    <div class="aw-detail-grid">
      <!-- UV -->
      <div class="aw-d-card">
        <div class="aw-d-card-title">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3" stroke="currentColor" stroke-width="2"/><line x1="12" y1="21" x2="12" y2="23" stroke="currentColor" stroke-width="2"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="currentColor" stroke-width="2"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="currentColor" stroke-width="2"/><line x1="1" y1="12" x2="3" y2="12" stroke="currentColor" stroke-width="2"/><line x1="21" y1="12" x2="23" y2="12" stroke="currentColor" stroke-width="2"/></svg>
          UV İNDEKSİ
        </div>
        <div class="aw-d-card-val">${daily.uv_index_max[0].toFixed(1)}</div>
        <div class="aw-uv-bar"><div class="aw-uv-marker" style="left:${Math.min(95,daily.uv_index_max[0]/11*100)}%"></div></div>
        <div class="aw-d-card-sub">${awUvLabel(daily.uv_index_max[0])}</div>
      </div>

      <!-- Gündoğumu/Batımı -->
      <div class="aw-d-card">
        <div class="aw-d-card-title">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 18a5 5 0 0 0-10 0"/><line x1="12" y1="2" x2="12" y2="9"/><line x1="4.22" y1="10.22" x2="5.64" y2="11.64"/><line x1="1" y1="18" x2="3" y2="18"/><line x1="21" y1="18" x2="23" y2="18"/><line x1="18.36" y1="11.64" x2="19.78" y2="10.22"/></svg>
          GÜN DOĞUMU
        </div>
        <div class="aw-d-card-val">${awFmtTime(daily.sunrise[0])}</div>
        ${awSunArc(daily.sunrise[0], daily.sunset[0])}
        <div class="aw-d-card-sub">Gün Batımı: ${awFmtTime(daily.sunset[0])}</div>
      </div>

      <!-- Rüzgar -->
      <div class="aw-d-card">
        <div class="aw-d-card-title">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/></svg>
          RÜZGAR
        </div>
        ${awWindDial(c.wind_direction_10m, c.wind_speed_10m)}
        <div class="aw-d-card-sub">Ani rüzgarlar: ${c.wind_gusts_10m.toFixed(1)} km/sa</div>
      </div>

      <!-- Yağış -->
      <div class="aw-d-card">
        <div class="aw-d-card-title">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" opacity=".7"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
          YAĞIŞ
        </div>
        <div class="aw-d-card-val">${c.precipitation.toFixed(1)} mm</div>
        <div class="aw-d-card-sub">Son 1 saat<br>24 saatte ${daily.precipitation_sum[0].toFixed(1)} mm bekleniyor.</div>
      </div>

      <!-- Hissedilen -->
      <div class="aw-d-card">
        <div class="aw-d-card-title">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>
          HİSSEDİLEN
        </div>
        <div class="aw-d-card-val">${Math.round(c.apparent_temperature)}°</div>
        <div class="aw-d-card-sub">${c.apparent_temperature > c.temperature_2m ? 'Gerçek sıcaklıktan daha sıcak hissettiriyor.' : 'Gerçek sıcaklıktan daha soğuk hissettiriyor.'}</div>
      </div>

      <!-- Nem -->
      <div class="aw-d-card">
        <div class="aw-d-card-title">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
          NEM ORANI
        </div>
        <div class="aw-d-card-val">%${c.relative_humidity_2m}</div>
        ${awHumidityBar(c.relative_humidity_2m)}
        <div class="aw-d-card-sub">Çiğ noktası ${awDewPoint(c.temperature_2m, c.relative_humidity_2m)}°</div>
      </div>

      <!-- Görünürlük -->
      <div class="aw-d-card">
        <div class="aw-d-card-title">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          GÖRÜŞ MESAFESİ
        </div>
        <div class="aw-d-card-val">${c.visibility>=1000?(c.visibility/1000).toFixed(1)+' km':c.visibility+' m'}</div>
        <div class="aw-d-card-sub">${c.visibility>=10000?'Açık.':c.visibility>=5000?'Orta görüş.':'Düşük görüş.'}</div>
      </div>

      <!-- Basınç -->
      <div class="aw-d-card">
        <div class="aw-d-card-title">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          BASINÇ
        </div>
        ${awPressureDial(c.surface_pressure)}
        <div style="display:flex;justify-content:space-between;margin-top:6px">
          <span style="font-size:11px;color:rgba(255,255,255,.4)">↓</span>
          <span style="font-size:11px;color:rgba(255,255,255,.4)">↑</span>
        </div>
      </div>
    </div>

    <div style="text-align:center;font-size:11px;color:rgba(255,255,255,.25);margin-top:8px">
      Güncellendi: ${new Date().getHours().toString().padStart(2,'0')}:${new Date().getMinutes().toString().padStart(2,'0')} · Open-Meteo
    </div>
  </div>`;

  document.getElementById('aw-weather-content').innerHTML = html;
  document.getElementById('aw-weather-content').style.display = 'block';
  document.getElementById('aw-welcome').style.display = 'none';
}

// Yardımcı fonksiyonlar
function awGetSummary(d){
  const c = d.current;
  const info = awcInfo(c.weather_code, c.is_day);
  const tmr = awcInfo(d.daily.weather_code[1]).t;
  return `${info.t}. Yarın ${tmr.toLowerCase()} bekleniyor. Yüksek sıcaklık ${Math.round(d.daily.temperature_2m_max[0])}°.`;
}

function awUvLabel(v){
  if(v<=2) return 'Düşük'; if(v<=5) return 'Orta';
  if(v<=7) return 'Yüksek'; if(v<=10) return 'Çok Yüksek';
  return 'Aşırı';
}

function awDewPoint(T, RH){
  return Math.round(T - (100-RH)/5);
}

function awHumidityBar(v){
  return `<div style="height:5px;border-radius:3px;background:rgba(255,255,255,.1);margin:8px 0 4px;position:relative;overflow:hidden">
    <div style="position:absolute;top:0;left:0;height:100%;width:${v}%;border-radius:3px;background:linear-gradient(to right,#30d158,#5ac8fa)"></div>
  </div>`;
}

function awSunArc(sunrise, sunset){
  const sr = new Date(sunrise), ss = new Date(sunset), now = new Date();
  const total = ss-sr, elapsed = Math.min(Math.max(now-sr,0),total);
  const pct = total>0 ? elapsed/total : 0;
  const cx=90, cy=55, r=40;
  const startAngle = Math.PI, endAngle = 0;
  const angle = startAngle + pct*(endAngle-startAngle);
  const sunX = cx + r*Math.cos(angle), sunY = cy + r*Math.sin(angle);
  return `<svg width="180" height="65" viewBox="0 0 180 65" style="margin:4px 0">
    <path d="M50 55 A40 40 0 0 1 130 55" stroke="rgba(255,255,255,.15)" stroke-width="2" fill="none"/>
    <path d="M50 55 A40 40 0 0 1 ${sunX.toFixed(1)} ${sunY.toFixed(1)}" stroke="rgba(255,200,50,.7)" stroke-width="2" fill="none"/>
    <circle cx="${sunX.toFixed(1)}" cy="${sunY.toFixed(1)}" r="5" fill="#ffd60a"/>
    <line x1="50" y1="55" x2="50" y2="60" stroke="rgba(255,255,255,.2)" stroke-width="1"/>
    <line x1="130" y1="55" x2="130" y2="60" stroke="rgba(255,255,255,.2)" stroke-width="1"/>
  </svg>`;
}

function awWindDial(deg, speed){
  const cx=55, cy=45, r=28;
  const rad = (deg-90)*Math.PI/180;
  const nx = cx+r*Math.cos(rad), ny = cy+r*Math.sin(rad);
  const sx = cx-r*0.6*Math.cos(rad), sy = cy-r*0.6*Math.sin(rad);
  return `<div style="display:flex;align-items:center;gap:12px;margin:4px 0">
    <svg width="110" height="90" viewBox="0 0 110 90">
      <circle cx="55" cy="45" r="35" stroke="rgba(255,255,255,.1)" stroke-width="1.5" fill="rgba(0,0,0,.2)"/>
      <circle cx="55" cy="45" r="28" stroke="rgba(255,255,255,.06)" stroke-width="1" fill="none"/>
      <text x="55" y="14" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">K</text>
      <text x="96" y="49" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">D</text>
      <text x="55" y="86" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">G</text>
      <text x="14" y="49" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="9" font-family="sans-serif">B</text>
      <line x1="${sx.toFixed(1)}" y1="${sy.toFixed(1)}" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
      <circle cx="${nx.toFixed(1)}" cy="${ny.toFixed(1)}" r="3" fill="#ffd60a"/>
      <text x="55" y="51" text-anchor="middle" fill="#fff" font-size="14" font-weight="600" font-family="sans-serif">${Math.round(speed)}</text>
      <text x="55" y="62" text-anchor="middle" fill="rgba(255,255,255,.5)" font-size="8" font-family="sans-serif">km/sa</text>
    </svg>
  </div>`;
}

function awPressureDial(hpa){
  const min=980, max=1040, pct=Math.min(1,Math.max(0,(hpa-min)/(max-min)));
  const angle = -130 + pct*260;
  return `<div style="text-align:center;margin:4px 0">
    <svg width="120" height="70" viewBox="0 0 120 70">
      <path d="M15 65 A50 50 0 0 1 105 65" stroke="rgba(255,255,255,.1)" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path d="M15 65 A50 50 0 0 1 105 65" stroke="url(#pressArc)" stroke-width="6" fill="none" stroke-linecap="round" stroke-dasharray="${pct*157} 157"/>
      <g transform="rotate(${angle} 60 65)">
        <line x1="60" y1="65" x2="60" y2="22" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
      </g>
      <circle cx="60" cy="65" r="4" fill="rgba(255,255,255,.8)"/>
      <text x="60" y="56" text-anchor="middle" fill="#fff" font-size="13" font-weight="600" font-family="sans-serif">${hpa.toFixed(0)}</text>
      <text x="60" y="67" text-anchor="middle" fill="rgba(255,255,255,.4)" font-size="8" font-family="sans-serif">hPa</text>
      <text x="18" y="72" fill="rgba(255,255,255,.3)" font-size="8" font-family="sans-serif">Düşük</text>
      <text x="72" y="72" fill="rgba(255,255,255,.3)" font-size="8" font-family="sans-serif">Yüksek</text>
      <defs><linearGradient id="pressArc" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#5ac8fa"/><stop offset="100%" stop-color="#ffd60a"/></linearGradient></defs>
    </svg>
  </div>`;
}

// Loading
function awShowLoading(){
  document.getElementById('aw-loading').style.display='flex';
  document.getElementById('aw-weather-content').style.display='none';
  document.getElementById('aw-welcome').style.display='none';
}
function awHideLoading(){ document.getElementById('aw-loading').style.display='none'; }

// Başlatma
function refreshWeather(){ if(awCities.length) awFetchCity(awActiveCityIdx); }

window._weatherInit = function(){
  awLoadCities();
  awRenderCityList();
  if(awCities.length){
    awFetchCity(awActiveCityIdx);
  }
};

// 15 dakikada bir güncelle
setInterval(()=>{ if(awCities.length) awFetchCity(awActiveCityIdx); }, 15*60*1000);
