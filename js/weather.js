// ── WEATHER.JS v2 ────────────────────────────────────────────────────

let weatherLat = null, weatherLon = null, weatherCityName = '';
let weatherRefreshTimer = null;

const WC = {
  0:{e:'☀️',t:'Açık',grad:['#f7971e','#ffd200'],night:{e:'🌙',grad:['#1a1a2e','#16213e']}},
  1:{e:'🌤️',t:'Çoğunlukla Açık',grad:['#f7971e','#ffd200'],night:{e:'🌙',grad:['#1a1a2e','#16213e']}},
  2:{e:'⛅',t:'Parçalı Bulutlu',grad:['#4ca1af','#c4e0e5']},
  3:{e:'☁️',t:'Kapalı',grad:['#757f9a','#d7dde8']},
  45:{e:'🌫️',t:'Sisli',grad:['#bdc3c7','#2c3e50']},
  48:{e:'🌫️',t:'Kırağı Sisi',grad:['#bdc3c7','#2c3e50']},
  51:{e:'🌦️',t:'Hafif Çiseleyen',grad:['#4facfe','#00f2fe']},
  53:{e:'🌦️',t:'Çiseleyen',grad:['#4facfe','#00f2fe']},
  55:{e:'🌧️',t:'Yoğun Çiseleyen',grad:['#3a7bd5','#3a6073']},
  61:{e:'🌧️',t:'Hafif Yağmur',grad:['#4facfe','#00f2fe']},
  63:{e:'🌧️',t:'Yağmur',grad:['#3a7bd5','#3a6073']},
  65:{e:'🌧️',t:'Yoğun Yağmur',grad:['#373b44','#4286f4']},
  71:{e:'🌨️',t:'Hafif Kar',grad:['#e0eafc','#cfdef3']},
  73:{e:'❄️',t:'Kar',grad:['#e0eafc','#cfdef3']},
  75:{e:'❄️',t:'Yoğun Kar',grad:['#c9d6ff','#e2e2e2']},
  80:{e:'🌦️',t:'Sağanak',grad:['#4facfe','#00f2fe']},
  81:{e:'🌧️',t:'Kuvvetli Sağanak',grad:['#3a7bd5','#3a6073']},
  82:{e:'⛈️',t:'Şiddetli Sağanak',grad:['#373b44','#4286f4']},
  85:{e:'🌨️',t:'Kar Sağanağı',grad:['#e0eafc','#cfdef3']},
  95:{e:'⛈️',t:'Fırtına',grad:['#232526','#414345']},
  96:{e:'⛈️',t:'Dolu Fırtınası',grad:['#232526','#414345']},
  99:{e:'⛈️',t:'Şiddetli Fırtına',grad:['#232526','#414345']},
};

function wcInfo(code, isDay=1){
  const base = WC[code] || {e:'🌡️',t:'Bilinmiyor',grad:['#4ca1af','#c4e0e5']};
  if(!isDay && base.night) return {...base, e:base.night.e, grad:base.night.grad};
  return base;
}

function windDir(deg){
  const dirs = ['K','KKD','KD','DKD','D','DGD','GD','GGD','G','GGB','GB','BGB','B','BKB','KB','KKB'];
  return dirs[Math.round(deg/22.5)%16];
}
function windArrow(deg){
  // Rüzgar yönü oku - rüzgar nereden esiyor
  return '↓↙←↖↑↗→↘'[Math.round(deg/45)%8];
}
function uvLabel(v){
  if(v<=2) return v.toFixed(1)+' Düşük'; if(v<=5) return v.toFixed(1)+' Orta';
  if(v<=7) return v.toFixed(1)+' Yüksek'; if(v<=10) return v.toFixed(1)+' Çok Yüksek';
  return v.toFixed(1)+' Aşırı';
}
function uvCat(v){
  if(v<=2) return 'Düşük'; if(v<=5) return 'Orta';
  if(v<=7) return 'Yüksek'; if(v<=10) return 'Çok Yüksek';
  return 'Aşırı';
}
function fmtTime(s){ const d=new Date(s); return d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0'); }

// ── KONUM ────────────────────────────────────────────────────────────
async function getWeatherByGPS(){
  if(!navigator.geolocation){ showWeatherError('Konum özelliği desteklenmiyor.'); return; }
  showWeatherLoading();
  navigator.geolocation.getCurrentPosition(async pos => {
    weatherLat = pos.coords.latitude; weatherLon = pos.coords.longitude;
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${weatherLat}&lon=${weatherLon}&format=json`);
      const d = await r.json();
      weatherCityName = d.address?.city||d.address?.town||d.address?.village||d.address?.county||'Bilinmiyor';
    } catch(e){ weatherCityName = `${weatherLat.toFixed(2)}, ${weatherLon.toFixed(2)}`; }
    fetchWeatherData();
  }, err => { hideWeatherLoading(); showWeatherError('Konum alınamadı: '+err.message); });
}

async function searchWeatherCity(){
  const q = document.getElementById('weather-city-input').value.trim();
  if(!q) return;
  showWeatherLoading();
  try {
    const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=tr&format=json`);
    const d = await r.json();
    if(!d.results?.length){ hideWeatherLoading(); showWeatherError('Şehir bulunamadı.'); return; }
    const city = d.results[0];
    weatherLat = city.latitude; weatherLon = city.longitude;
    weatherCityName = city.name + (city.country?', '+city.country:'');
    fetchWeatherData();
  } catch(e){ hideWeatherLoading(); showWeatherError('Arama başarısız: '+e.message); }
}

// ── VERİ ÇEKME ───────────────────────────────────────────────────────
async function fetchWeatherData(){
  if(!weatherLat||!weatherLon) return;
  showWeatherLoading();
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${weatherLat}&longitude=${weatherLon}`
    +`&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,visibility`
    +`&hourly=temperature_2m,weather_code,precipitation_probability,precipitation,is_day`
    +`&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,wind_speed_10m_max`
    +`&timezone=auto&wind_speed_unit=kmh&forecast_days=7`;
  try {
    const r = await fetch(url);
    const d = await r.json();
    hideWeatherLoading();
    renderWeather(d);
    localStorage.setItem('gn_weather_loc', JSON.stringify({lat:weatherLat,lon:weatherLon,name:weatherCityName}));
    if(weatherRefreshTimer) clearInterval(weatherRefreshTimer);
    weatherRefreshTimer = setInterval(fetchWeatherData, 15*60*1000);
  } catch(e){ hideWeatherLoading(); showWeatherError('Veri alınamadı: '+e.message); }
}

function refreshWeather(){ if(weatherLat) fetchWeatherData(); else getWeatherByGPS(); }

// ── RENDER ───────────────────────────────────────────────────────────
function renderWeather(d){
  const c = d.current, daily = d.daily, hourly = d.hourly;
  const info = wcInfo(c.weather_code, c.is_day);

  // Hero arka plan gradient + animasyon
  const hero = document.getElementById('weather-hero');
  if(!hero){ console.error('weather-hero bulunamadı'); return; }
  hero.style.background = `linear-gradient(135deg, ${info.grad[0]}, ${info.grad[1]})`;
  renderWeatherBgAnim(c.weather_code, c.is_day);

  // Anlık bilgiler
  document.getElementById('weather-icon-big').textContent = info.e;
  document.getElementById('weather-temp-big').textContent = Math.round(c.temperature_2m)+'°';
  document.getElementById('weather-feels-lbl').textContent = `Hissedilen ${Math.round(c.apparent_temperature)}°C`;
  document.getElementById('weather-condition-big').textContent = info.t;
  const locEl = document.querySelector('#weather-location-big span'); if(locEl) locEl.textContent = weatherCityName;

  // Hero istatistikler
  heroStat('hs-humidity', '💧', c.relative_humidity_2m+'%', 'Bağıl Nem');
  heroStat('hs-wind', '💨', c.wind_speed_10m.toFixed(1)+' km/s', 'Rüzgar · '+windArrow(c.wind_direction_10m)+' '+windDir(c.wind_direction_10m));
  heroStat('hs-uv', '☀️', daily.uv_index_max[0].toFixed(1)+' — '+uvCat(daily.uv_index_max[0]), 'UV');
  heroStat('hs-precip', '🌧️', c.precipitation.toFixed(1)+' mm', 'Yağış');

  document.getElementById('hs-sunrise').textContent = fmtTime(daily.sunrise[0]);
  document.getElementById('hs-sunset').textContent = fmtTime(daily.sunset[0]);
  document.getElementById('hs-pressure').textContent = c.surface_pressure.toFixed(1)+' hPa';
  document.getElementById('hs-visibility').textContent = c.visibility>=1000 ? (c.visibility/1000).toFixed(1)+' km' : c.visibility+' m';

  const now = new Date();
  document.getElementById('weather-updated').textContent = `Güncellendi: ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;

  // Saatlik - gelişmiş tasarım
  const hourlyEl = document.getElementById('weather-hourly');
  let hHtml = '';
  let shown = 0;
  const nowTs = Date.now();
  // Sıcaklık aralığı için min/max bul (gösterilecek saatler)
  const hTemps = [];
  for(let i=0; i<hourly.time.length; i++){
    const ht = new Date(hourly.time[i]);
    if(ht.getTime() >= nowTs - 1800000 && hTemps.length < 24) hTemps.push(hourly.temperature_2m[i]);
  }
  const hMin = Math.min(...hTemps), hMax = Math.max(...hTemps), hRange = hMax-hMin||1;
  
  for(let i=0; i<hourly.time.length && shown<24; i++){
    const ht = new Date(hourly.time[i]);
    if(ht.getTime() < nowTs - 1800000) continue;
    const hi = wcInfo(hourly.weather_code[i], hourly.is_day[i]);
    const isCur = shown === 0;
    const barH = Math.round(((hourly.temperature_2m[i]-hMin)/hRange)*28)+4;
    const rainPct = hourly.precipitation_probability[i];
    hHtml += `<div class="hourly-item${isCur?' now':''}" style="animation:fadeInUp .3s ease ${shown*.03}s both">
      <div class="h-time">${ht.getHours().toString().padStart(2,'0')}:00</div>
      <div class="h-icon">${hi.e}</div>
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:36px;margin:3px 0">
        <div style="width:4px;border-radius:2px;background:${isCur?'rgba(0,0,0,.25)':'var(--accent)'};opacity:.7;height:${barH}px;transition:height .3s"></div>
      </div>
      <div class="h-temp">${Math.round(hourly.temperature_2m[i])}°</div>
      ${rainPct>20?`<div class="h-rain" style="color:${isCur?'rgba(0,0,0,.5)':'#4facfe'}">💧${rainPct}%</div>`:'<div class="h-rain"></div>'}
    </div>`;
    shown++;
  }
  hourlyEl.innerHTML = hHtml;

  // 7 Günlük - tıklanabilir + detay paneli
  window._weatherDaily = daily;
  window._weatherHourly = hourly;
  renderDailyList(0);

  document.getElementById('weather-welcome').style.display = 'none';
  document.getElementById('weather-main-card').style.display = 'block';
  document.getElementById('weather-main-card').classList.add('weather-anim');

  updateWeatherWidget(c, info, daily);
}

function heroStat(id, icon, val, lbl){
  const el = document.getElementById(id);
  if(!el) return;
  el.innerHTML = `<div class="ws-icon">${icon}</div><div class="ws-val">${val}</div><div class="ws-lbl">${lbl}</div>`;
}

// ── ARKAPLAn ANİMASYONU ───────────────────────────────────────────────
function renderWeatherBgAnim(code, isDay){
  const el = document.getElementById('weather-bg-anim');
  if(!el) return;

  if(!isDay){
    el.innerHTML = `<div style="position:absolute;inset:0;overflow:hidden;opacity:.3">
      ${Array.from({length:20},(_,i)=>`<div style="position:absolute;width:2px;height:2px;background:#fff;border-radius:50%;top:${Math.random()*100}%;left:${Math.random()*100}%;opacity:${Math.random()*.7+.3};animation:sunRay ${1.5+Math.random()*2}s ease-in-out ${Math.random()}s infinite"></div>`).join('')}
    </div>`;
    return;
  }

  if(code===0||code===1){
    el.innerHTML = `<div style="position:absolute;top:-20px;right:-20px;width:120px;height:120px;background:rgba(255,220,100,.3);border-radius:50%;animation:sunRay 2s ease-in-out infinite"></div>
    <div style="position:absolute;top:10px;right:10px;width:80px;height:80px;background:rgba(255,230,100,.2);border-radius:50%;animation:sunRay 2.5s ease-in-out .5s infinite"></div>`;
  } else if(code>=61&&code<=82){
    const drops = Array.from({length:12},(_,i)=>`<div class="rain-drop" style="position:absolute;width:1.5px;height:12px;background:rgba(255,255,255,.5);border-radius:1px;left:${(i/12*100).toFixed(0)}%;top:${(Math.random()*50).toFixed(0)}%;animation-delay:${(Math.random()*1.2).toFixed(2)}s;animation-duration:${(.8+Math.random()*.4).toFixed(2)}s"></div>`).join('');
    el.innerHTML = `<div style="position:absolute;inset:0;overflow:hidden">${drops}</div>`;
  } else if(code>=71&&code<=75||code===85){
    const flakes = Array.from({length:10},(_,i)=>`<div class="snow-flake" style="position:absolute;font-size:14px;left:${(i/10*100).toFixed(0)}%;top:${(Math.random()*40).toFixed(0)}%;opacity:.7;animation-delay:${(Math.random()*2).toFixed(2)}s;animation-duration:${(1.5+Math.random()*1).toFixed(2)}s">❄</div>`).join('');
    el.innerHTML = `<div style="position:absolute;inset:0;overflow:hidden">${flakes}</div>`;
  } else if(code>=95){
    el.innerHTML = `<div class="lightning-anim" style="position:absolute;right:40px;top:10px;font-size:40px;opacity:0">⚡</div>`;
  } else {
    el.innerHTML = `<div class="cloud-anim" style="position:absolute;top:10px;right:20px;font-size:36px;opacity:.25">☁️</div>
    <div class="cloud-anim" style="position:absolute;bottom:15px;left:15px;font-size:28px;opacity:.2;animation-delay:.8s">☁️</div>`;
  }
}

// ── WIDGET ───────────────────────────────────────────────────────────
function updateWeatherWidget(c, info, daily){
  const el = document.getElementById('hw-weather-body');
  if(!el) return;
  el.innerHTML = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
    <span style="font-size:26px">${info.e}</span>
    <div><div style="font-size:20px;font-weight:700;line-height:1">${Math.round(c.temperature_2m)}°C</div>
    <div style="font-size:10px;opacity:.7">${info.t}</div></div>
  </div>
  <div style="font-size:10px;opacity:.65;margin-bottom:3px">${weatherCityName}</div>
  <div style="font-size:10px;opacity:.7">↑${Math.round(daily.temperature_2m_max[0])}° ↓${Math.round(daily.temperature_2m_min[0])}° · 💧${c.relative_humidity_2m}%</div>`;
}

// ── YARDIMCI ─────────────────────────────────────────────────────────
function showWeatherLoading(){
  document.getElementById('weather-loading').style.display='block';
  document.getElementById('weather-main-card').style.display='none';
  document.getElementById('weather-welcome').style.display='none';
  document.getElementById('weather-error').style.display='none';
}
function hideWeatherLoading(){ document.getElementById('weather-loading').style.display='none'; }
function showWeatherError(msg){
  document.getElementById('weather-error').textContent='⚠️ '+msg;
  document.getElementById('weather-error').style.display='block';
  const ww=document.getElementById('weather-welcome'); if(ww) ww.style.display='none';
  hideWeatherLoading();
}

window._weatherInit = function(){
  const saved = localStorage.getItem('gn_weather_loc');
  if(saved){ try{ const o=JSON.parse(saved); weatherLat=o.lat; weatherLon=o.lon; weatherCityName=o.name;
    document.getElementById('weather-city-input').value=o.name; fetchWeatherData(); }catch(e){} }
};

// ── 7 GÜNLÜK LİST + DETAY ───────────────────────────────────────────
const TR_DAYS = ['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'];
const TR_DAYS_FULL = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];

function renderDailyList(selectedIdx){
  const daily = window._weatherDaily;
  if(!daily) return;
  const dailyEl = document.getElementById('weather-daily');
  if(!dailyEl) return;

  const tMin = Math.min(...daily.temperature_2m_min);
  const tMax = Math.max(...daily.temperature_2m_max);
  const range = tMax - tMin || 1;

  let html = '';
  for(let i=0; i<daily.time.length; i++){
    const dt = new Date(daily.time[i]+'T12:00:00');
    const di = wcInfo(daily.weather_code[i]);
    const isToday = i===0;
    const isSel = i===selectedIdx;
    const barLeft = ((daily.temperature_2m_min[i]-tMin)/range*100).toFixed(0);
    const barWidth = ((daily.temperature_2m_max[i]-daily.temperature_2m_min[i])/range*100).toFixed(0);

    html += `<div class="daily-row${isToday?' today':''}${isSel?' selected':''}" 
      onclick="selectDailyDay(${i})"
      style="cursor:pointer;border-radius:12px;padding:11px 10px;transition:all .2s;${isSel?'background:linear-gradient(135deg,rgba(58,123,213,.15),rgba(58,123,213,.05));border:1.5px solid var(--accent);box-shadow:0 2px 12px rgba(58,123,213,.15)':'border:1.5px solid transparent'};animation:fadeInUp .3s ease ${i*.04}s both">
      <div style="width:44px;font-size:12px;color:var(--muted);font-weight:${isToday||isSel?600:400}">${isToday?'Bugün':TR_DAYS[dt.getDay()]}</div>
      <div style="font-size:24px;width:32px">${di.e}</div>
      <div style="flex:1;font-size:12px;color:var(--muted);min-width:80px">${di.t}</div>
      <div style="font-size:11px;color:#4facfe;width:48px;text-align:right">${daily.precipitation_sum[i]>0?'💧'+daily.precipitation_sum[i]+'mm':''}</div>
      <div style="width:120px;display:flex;align-items:center;gap:5px;margin-left:8px">
        <span style="font-size:12px;color:var(--muted);width:26px;text-align:right">${Math.round(daily.temperature_2m_min[i])}°</span>
        <div style="flex:1;height:6px;border-radius:3px;background:var(--surface2);position:relative;overflow:hidden">
          <div style="position:absolute;top:0;left:${barLeft}%;width:${barWidth}%;height:100%;border-radius:3px;background:linear-gradient(to right,#4facfe,#f7971e);transition:width .4s ease"></div>
        </div>
        <span style="font-size:13px;font-weight:600;color:var(--text);width:26px">${Math.round(daily.temperature_2m_max[i])}°</span>
      </div>
      <div style="width:16px;color:var(--muted);text-align:center;font-size:11px;margin-left:4px">${isSel?'▲':'▾'}</div>
    </div>`;

    // Seçili günün detay paneli
    if(isSel){
      html += renderDayDetail(i);
    }
  }
  dailyEl.innerHTML = html;
}

function renderDayDetail(i){
  const daily = window._weatherDaily;
  const hourly = window._weatherHourly;
  const dt = new Date(daily.time[i]+'T12:00:00');
  const dayName = i===0 ? 'Bugün' : TR_DAYS_FULL[dt.getDay()]+', '+dt.getDate()+' '+['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'][dt.getMonth()];

  // O güne ait saatlik verileri bul
  const dayStr = daily.time[i];
  let hHtml = '';
  if(hourly){
    let shown = 0;
    for(let j=0; j<hourly.time.length && shown<24; j++){
      if(!hourly.time[j].startsWith(dayStr)) continue;
      const ht = new Date(hourly.time[j]);
      const hi = wcInfo(hourly.weather_code[j], hourly.is_day[j]);
      const rainPct = hourly.precipitation_probability[j];
      hHtml += `<div style="flex-shrink:0;text-align:center;padding:8px 7px;border-radius:10px;background:var(--surface2);min-width:48px">
        <div style="font-size:10px;color:var(--muted)">${ht.getHours().toString().padStart(2,'0')}:00</div>
        <div style="font-size:18px;margin:3px 0">${hi.e}</div>
        <div style="font-size:12px;font-weight:600;color:var(--text)">${Math.round(hourly.temperature_2m[j])}°</div>
        ${rainPct>20?`<div style="font-size:10px;color:#4facfe">💧${rainPct}%</div>`:''}
      </div>`;
      shown++;
    }
  }

  return `<div style="margin:4px 0 8px;padding:14px;background:var(--surface);border:0.5px solid var(--border);border-radius:12px;animation:fadeInUp .25s ease both">
    <div style="font-size:12px;font-weight:600;color:var(--text);margin-bottom:10px">${dayName}</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px">
      <div style="background:var(--surface2);border-radius:10px;padding:8px;text-align:center">
        <div style="font-size:10px;color:var(--muted);margin-bottom:3px">En Yüksek</div>
        <div style="font-size:16px;font-weight:700;color:#f7971e">${Math.round(daily.temperature_2m_max[i])}°</div>
      </div>
      <div style="background:var(--surface2);border-radius:10px;padding:8px;text-align:center">
        <div style="font-size:10px;color:var(--muted);margin-bottom:3px">En Düşük</div>
        <div style="font-size:16px;font-weight:700;color:#4facfe">${Math.round(daily.temperature_2m_min[i])}°</div>
      </div>
      <div style="background:var(--surface2);border-radius:10px;padding:8px;text-align:center">
        <div style="font-size:10px;color:var(--muted);margin-bottom:3px">UV</div>
        <div style="font-size:13px;font-weight:600;color:var(--text)">${uvLabel(daily.uv_index_max[i])}</div>
      </div>
      <div style="background:var(--surface2);border-radius:10px;padding:8px;text-align:center">
        <div style="font-size:10px;color:var(--muted);margin-bottom:3px">Rüzgar</div>
        <div style="font-size:13px;font-weight:600;color:var(--text)">${Math.round(daily.wind_speed_10m_max[i])} km/s</div>
      </div>
    </div>
    ${hHtml?`<div style="font-size:11px;color:var(--muted);margin-bottom:6px">Saatlik</div>
    <div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:4px">${hHtml}</div>`:''}
  </div>`;
}

function selectDailyDay(i){
  const current = window._selectedDailyDay;
  window._selectedDailyDay = (current===i) ? -1 : i;
  renderDailyList(window._selectedDailyDay);
}
