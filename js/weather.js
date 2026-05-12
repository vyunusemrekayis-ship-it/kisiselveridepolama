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
  return ['K','KKD','KD','DKD','D','DGD','GD','GGD','G','GGB','GB','BGB','B','BKB','KB','KKB'][Math.round(deg/22.5)%16];
}
function uvLabel(v){
  if(v<=2) return v+' Düşük'; if(v<=5) return v+' Orta';
  if(v<=7) return v+' Yüksek'; if(v<=10) return v+' Çok Y.';
  return v+' Aşırı';
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
  document.querySelector('#weather-location-big span').textContent = weatherCityName;

  // Hero istatistikler
  heroStat('hs-humidity', '💧', c.relative_humidity_2m+'%', 'Nem');
  heroStat('hs-wind', '💨', Math.round(c.wind_speed_10m)+' km/s '+windDir(c.wind_direction_10m), 'Rüzgar');
  heroStat('hs-uv', '☀️', uvLabel(daily.uv_index_max[0]), 'UV');
  heroStat('hs-precip', '🌧️', c.precipitation+' mm', 'Yağış');

  document.getElementById('hs-sunrise').textContent = fmtTime(daily.sunrise[0]);
  document.getElementById('hs-sunset').textContent = fmtTime(daily.sunset[0]);
  document.getElementById('hs-pressure').textContent = Math.round(c.surface_pressure)+' hPa';
  document.getElementById('hs-visibility').textContent = c.visibility>=1000 ? Math.round(c.visibility/1000)+' km' : c.visibility+' m';

  const now = new Date();
  document.getElementById('weather-updated').textContent = `Güncellendi: ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;

  // Saatlik
  const hourlyEl = document.getElementById('weather-hourly');
  let hHtml = '';
  let shown = 0;
  const nowTs = Date.now();
  for(let i=0; i<hourly.time.length && shown<24; i++){
    const ht = new Date(hourly.time[i]);
    if(ht.getTime() < nowTs - 1800000) continue;
    const hi = wcInfo(hourly.weather_code[i], hourly.is_day[i]);
    const isCur = shown === 0;
    hHtml += `<div class="hourly-item${isCur?' now':''}">
      <div class="h-time">${ht.getHours().toString().padStart(2,'0')}:00</div>
      <div class="h-icon">${hi.e}</div>
      <div class="h-temp">${Math.round(hourly.temperature_2m[i])}°</div>
      <div class="h-rain">${hourly.precipitation_probability[i]}%</div>
    </div>`;
    shown++;
  }
  hourlyEl.innerHTML = hHtml;

  // 7 Günlük
  const dailyEl = document.getElementById('weather-daily');
  const TR_DAYS = ['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'];
  const tMin = Math.min(...daily.temperature_2m_min);
  const tMax = Math.max(...daily.temperature_2m_max);
  const range = tMax - tMin || 1;
  let dHtml = '';
  for(let i=0; i<daily.time.length; i++){
    const dt = new Date(daily.time[i]+'T12:00:00');
    const di = wcInfo(daily.weather_code[i]);
    const isToday = i===0;
    const barLeft = ((daily.temperature_2m_min[i]-tMin)/range*100).toFixed(0);
    const barWidth = ((daily.temperature_2m_max[i]-daily.temperature_2m_min[i])/range*100).toFixed(0);
    dHtml += `<div class="daily-row${isToday?' today':''}">
      <div style="width:40px;font-size:12px;color:var(--muted);font-weight:${isToday?600:400}">${isToday?'Bugün':TR_DAYS[dt.getDay()]}</div>
      <div style="font-size:22px;width:30px">${di.e}</div>
      <div style="flex:1;font-size:12px;color:var(--muted)">${di.t}</div>
      <div style="font-size:11px;color:var(--muted);width:40px;text-align:right">☔${daily.precipitation_sum[i]}mm</div>
      <div style="width:100px;display:flex;align-items:center;gap:6px;margin:0 8px">
        <span style="font-size:12px;color:var(--muted);width:24px;text-align:right">${Math.round(daily.temperature_2m_min[i])}°</span>
        <div style="flex:1;height:5px;border-radius:3px;background:var(--surface2);position:relative">
          <div style="position:absolute;top:0;left:${barLeft}%;width:${barWidth}%;height:100%;border-radius:3px;background:linear-gradient(to right,#4facfe,#f7971e)"></div>
        </div>
        <span style="font-size:12px;font-weight:600;color:var(--text);width:24px">${Math.round(daily.temperature_2m_max[i])}°</span>
      </div>
    </div>`;
  }
  dailyEl.innerHTML = dHtml;

  document.getElementById('weather-welcome').style.display = 'none';
  document.getElementById('weather-main-card').style.display = 'block';
  document.getElementById('weather-main-card').classList.add('weather-anim');

  updateWeatherWidget(c, info, daily);
}

function heroStat(id, icon, val, lbl){
  document.getElementById(id).innerHTML = `<div class="hs-val">${icon} ${val}</div><div class="hs-lbl">${lbl}</div>`;
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
