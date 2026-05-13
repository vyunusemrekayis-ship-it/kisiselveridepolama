// ── WEATHER.JS v2 ────────────────────────────────────────────────────

let weatherLat = null, weatherLon = null, weatherCityName = '';
let weatherRefreshTimer = null;


// ── HAVA DURUMU SVG İKONLARI ─────────────────────────────────────────
function weatherSVG(code, isDay, size=32){
  const s = size;
  const h = s * 0.9;
  
  // Gece kontrolü
  if(!isDay && (code<=2)){
    return `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" fill="none">
      <path d="M${s*.62} ${s*.18} A${s*.28} ${s*.28} 0 1 1 ${s*.32} ${s*.68} A${s*.22} ${s*.22} 0 0 0 ${s*.62} ${s*.18}Z" fill="url(#moon${s})" style="filter:drop-shadow(0 1px 4px rgba(180,200,255,.5))"/>
      <circle cx="${s*.72}" cy="${s*.22}" r="${s*.04}" fill="rgba(255,255,255,.5)"/>
      <circle cx="${s*.6}" cy="${s*.12}" r="${s*.025}" fill="rgba(255,255,255,.4)"/>
      <defs><radialGradient id="moon${s}" cx="40%" cy="30%" r="60%"><stop offset="0%" stop-color="#e8f0ff"/><stop offset="100%" stop-color="#b0c4de"/></radialGradient></defs>
    </svg>`;
  }
  
  // Güneş (açık)
  if(code === 0){
    return `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" fill="none">
      <g style="animation:sunRay ${isDay?'2':'0'}s ease-in-out infinite;transform-origin:${s/2}px ${s/2}px">
        ${[0,45,90,135,180,225,270,315].map(a=>{
          const r=s/2, cx=s/2, cy=s/2, r1=s*.38, r2=s*.46;
          const x1=cx+r1*Math.cos(a*Math.PI/180), y1=cy+r1*Math.sin(a*Math.PI/180);
          const x2=cx+r2*Math.cos(a*Math.PI/180), y2=cy+r2*Math.sin(a*Math.PI/180);
          return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="rgba(255,210,0,.9)" stroke-width="${s*.06}" stroke-linecap="round"/>`;
        }).join('')}
      </g>
      <circle cx="${s/2}" cy="${s/2}" r="${s*.28}" fill="url(#sun${s})"/>
      <defs><radialGradient id="sun${s}" cx="40%" cy="35%" r="60%"><stop offset="0%" stop-color="#fff8a0"/><stop offset="50%" stop-color="#ffd200"/><stop offset="100%" stop-color="#ff9500"/></radialGradient></defs>
    </svg>`;
  }
  
  // Parçalı bulutlu (1-2)
  if(code === 1 || code === 2){
    return `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" fill="none">
      <g style="animation:sunRay 2.5s ease-in-out infinite;transform-origin:${s*.35}px ${s*.35}px">
        <circle cx="${s*.35}" cy="${s*.35}" r="${s*.18}" fill="url(#psun${s})" opacity=".9"/>
      </g>
      <path d="M${s*.18} ${s*.72} Q${s*.18} ${s*.48} ${s*.38} ${s*.48} Q${s*.4} ${s*.36} ${s*.56} ${s*.38} Q${s*.7} ${s*.28} ${s*.78} ${s*.42} Q${s*.9} ${s*.42} ${s*.88} ${s*.56} Q${s*.9} ${s*.7} ${s*.78} ${s*.72}Z" fill="url(#cloud${s})" style="animation:cloudDrift 3s ease-in-out infinite"/>
      <defs>
        <radialGradient id="psun${s}" cx="40%" cy="35%" r="60%"><stop offset="0%" stop-color="#fff8a0"/><stop offset="100%" stop-color="#ffd200"/></radialGradient>
        <linearGradient id="cloud${s}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#f0f8ff"/><stop offset="100%" stop-color="#d0e8f0"/></linearGradient>
      </defs>
    </svg>`;
  }
  
  // Kapalı (3)
  if(code === 3){
    return `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" fill="none">
      <path d="M${s*.08} ${s*.75} Q${s*.08} ${s*.52} ${s*.3} ${s*.5} Q${s*.32} ${s*.35} ${s*.5} ${s*.36} Q${s*.65} ${s*.24} ${s*.74} ${s*.4} Q${s*.88} ${s*.4} ${s*.86} ${s*.56} Q${s*.9} ${s*.74} ${s*.76} ${s*.76}Z" fill="url(#grey1${s})" style="animation:cloudDrift 4s ease-in-out infinite"/>
      <path d="M${s*.2} ${s*.85} Q${s*.2} ${s*.68} ${s*.36} ${s*.66} Q${s*.38} ${s*.54} ${s*.52} ${s*.55} Q${s*.64} ${s*.46} ${s*.7} ${s*.58} Q${s*.8} ${s*.58} ${s*.78} ${s*.7} Q${s*.8} ${s*.84} ${s*.7} ${s*.86}Z" fill="url(#grey2${s})" style="animation:cloudDrift 4s ease-in-out .5s infinite"/>
      <defs>
        <linearGradient id="grey1${s}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#c8d8e8"/><stop offset="100%" stop-color="#98b0c0"/></linearGradient>
        <linearGradient id="grey2${s}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#b8c8d8"/><stop offset="100%" stop-color="#88a0b0"/></linearGradient>
      </defs>
    </svg>`;
  }
  
  // Sis (45-48)
  if(code === 45 || code === 48){
    return `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" fill="none">
      ${[.3,.45,.6,.75].map((y,i)=>`<line x1="${s*.1}" y1="${s*y}" x2="${s*.9}" y2="${s*y}" stroke="rgba(180,190,200,.7)" stroke-width="${s*.04}" stroke-linecap="round" style="animation:windFlow 2s ease-in-out ${i*.2}s infinite"/>`).join('')}
    </svg>`;
  }
  
  // Yağmur (51-67, 80-82)
  if((code>=51&&code<=67)||(code>=80&&code<=82)){
    const heavy = code>=65||code===82;
    const drops = heavy ? [.25,.42,.58,.75,.33,.67] : [.3,.5,.7];
    return `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" fill="none">
      <path d="M${s*.12} ${s*.58} Q${s*.12} ${s*.35} ${s*.32} ${s*.33} Q${s*.35} ${s*.18} ${s*.52} ${s*.2} Q${s*.68} ${s*.1} ${s*.76} ${s*.26} Q${s*.9} ${s*.26} ${s*.88} ${s*.42} Q${s*.9} ${s*.58} ${s*.76} ${s*.6}Z" fill="url(#rainCloud${s})"/>
      ${drops.map((x,i)=>`<line x1="${s*x}" y1="${s*.66}" x2="${s*(x-.04)}" y2="${s*.82}" stroke="url(#rainDrop${s})" stroke-width="${s*.05}" stroke-linecap="round" style="animation:rainDrop ${heavy?.9:1.2}s ease-in ${i*.15}s infinite"/>`).join('')}
      <defs>
        <linearGradient id="rainCloud${s}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#b8d4e8"/><stop offset="100%" stop-color="#7898b0"/></linearGradient>
        <linearGradient id="rainDrop${s}" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#4facfe"/><stop offset="100%" stop-color="#0066cc"/></linearGradient>
      </defs>
    </svg>`;
  }
  
  // Kar (71-77, 85-86)
  if((code>=71&&code<=77)||(code>=85&&code<=86)){
    return `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" fill="none">
      <path d="M${s*.1} ${s*.5} Q${s*.1} ${s*.28} ${s*.3} ${s*.26} Q${s*.33} ${s*.12} ${s*.5} ${s*.14} Q${s*.66} ${s*.04} ${s*.74} ${s*.2} Q${s*.88} ${s*.2} ${s*.86} ${s*.36} Q${s*.88} ${s*.5} ${s*.74} ${s*.52}Z" fill="url(#snowCloud${s})"/>
      ${[.25,.42,.58,.75,.33,.67].map((x,i)=>`<text x="${s*x}" y="${s*(.68+((i%2)*.08))}" text-anchor="middle" font-size="${s*.14}" fill="rgba(180,220,255,.9)" style="animation:snowFall ${1.5+i*.2}s linear ${i*.25}s infinite">❄</text>`).join('')}
      <defs>
        <linearGradient id="snowCloud${s}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ddeeff"/><stop offset="100%" stop-color="#aaccdd"/></linearGradient>
      </defs>
    </svg>`;
  }
  
  // Fırtına (95-99)
  if(code>=95){
    return `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" fill="none">
      <path d="M${s*.08} ${s*.55} Q${s*.08} ${s*.32} ${s*.28} ${s*.3} Q${s*.3} ${s*.15} ${s*.48} ${s*.16} Q${s*.64} ${s*.06} ${s*.72} ${s*.22} Q${s*.86} ${s*.22} ${s*.84} ${s*.38} Q${s*.86} ${s*.55} ${s*.72} ${s*.57}Z" fill="url(#stormCloud${s})"/>
      <path d="M${s*.48} ${s*.58} L${s*.38} ${s*.76} L${s*.5} ${s*.74} L${s*.4} ${s*.92}" stroke="url(#lightning${s})" stroke-width="${s*.07}" stroke-linecap="round" stroke-linejoin="round" fill="none" style="animation:lightning 2.5s ease-in-out infinite"/>
      <defs>
        <linearGradient id="stormCloud${s}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#7a8898"/><stop offset="100%" stop-color="#4a5868"/></linearGradient>
        <linearGradient id="lightning${s}" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#ffe066"/><stop offset="100%" stop-color="#ff9900"/></linearGradient>
      </defs>
    </svg>`;
  }
  
  // Default - bulutlu
  return `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" fill="none">
    <path d="M${s*.12} ${s*.72} Q${s*.12} ${s*.48} ${s*.32} ${s*.46} Q${s*.35} ${s*.3} ${s*.52} ${s*.32} Q${s*.68} ${s*.22} ${s*.76} ${s*.38} Q${s*.9} ${s*.38} ${s*.88} ${s*.54} Q${s*.9} ${s*.72} ${s*.76} ${s*.74}Z" fill="url(#defCloud${s})" style="animation:cloudDrift 3s ease-in-out infinite"/>
    <defs><linearGradient id="defCloud${s}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#d0e8f8"/><stop offset="100%" stop-color="#90b8d0"/></linearGradient></defs>
  </svg>`;
}

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

function setStatText(id, val, lbl){
  const el = document.getElementById(id);
  if(!el) return;
  el.innerHTML = `<div class="ws-val" style="margin-top:4px">${val}</div><div class="ws-lbl">${lbl}</div>`;
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
  document.getElementById('weather-icon-big').innerHTML = weatherSVG(c.weather_code, c.is_day, 64);
  document.getElementById('weather-temp-big').textContent = Math.round(c.temperature_2m)+'°';
  document.getElementById('weather-feels-lbl').textContent = `Hissedilen ${Math.round(c.apparent_temperature)}°C`;
  document.getElementById('weather-condition-big').textContent = info.t;
  const locEl = document.querySelector('#weather-location-big span'); if(locEl) locEl.textContent = weatherCityName;

  // Hero istatistikler
  heroStat('hs-humidity', 'humidity', c.relative_humidity_2m+'%', 'Bağıl Nem');
  heroStat('hs-wind', 'wind', c.wind_speed_10m.toFixed(1)+' km/s', 'Rüzgar · '+windArrow(c.wind_direction_10m)+' '+windDir(c.wind_direction_10m));
  heroStat('hs-uv', 'uv', daily.uv_index_max[0].toFixed(1)+' — '+uvCat(daily.uv_index_max[0]), 'UV');
  heroStat('hs-precip', 'precip', c.precipitation.toFixed(1)+' mm', 'Yağış');

  document.getElementById('hs-sunrise').textContent = fmtTime(daily.sunrise[0]);
  document.getElementById('hs-sunset').textContent = fmtTime(daily.sunset[0]);
  setStatText('hs-pressure', c.surface_pressure.toFixed(1)+' hPa', 'Basınç');
  setStatText('hs-visibility', c.visibility>=1000 ? (c.visibility/1000).toFixed(1)+' km' : c.visibility+' m', 'Görünürlük');

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
      <div class="h-icon">${weatherSVG(hourly.weather_code[i], hourly.is_day[i], 28)}</div>
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

const WEATHER_SVGS = {'humidity': '<svg width="36" height="40" viewBox="0 0 36 40" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 6px rgba(74,175,254,.5))">\n  <path d="M18 4 C18 4 6 18 6 26 A12 12 0 0 0 30 26 C30 18 18 4 18 4Z" fill="url(#dropGrad)" style="animation:dropPulse 2s ease-in-out infinite;transform-origin:18px 26px"/>\n  <ellipse cx="14" cy="22" rx="3" ry="4" fill="rgba(255,255,255,.25)" transform="rotate(-20 14 22)"/>\n  <defs>\n    <radialGradient id="dropGrad" cx="40%" cy="40%" r="60%">\n      <stop offset="0%" stop-color="#a8edff"/>\n      <stop offset="60%" stop-color="#4facfe"/>\n      <stop offset="100%" stop-color="#0066cc"/>\n    </radialGradient>\n  </defs>\n  <style>@keyframes dropPulse{0%,100%{transform:scaleY(1)}50%{transform:scaleY(1.06)}}</style>\n</svg>', 'wind': '<svg width="44" height="36" viewBox="0 0 44 36" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 5px rgba(255,255,255,.3))">\n  <path d="M4 10 Q16 10 22 10 Q30 10 32 6 A6 6 0 1 1 32 18 Q28 18 4 18" stroke="rgba(255,255,255,.9)" stroke-width="2.5" stroke-linecap="round" fill="none" style="animation:windFlow 1.8s ease-in-out infinite"/>\n  <path d="M4 18 Q14 18 20 18 Q26 18 28 22 A5 5 0 1 0 28 32 Q24 32 4 26" stroke="rgba(255,255,255,.6)" stroke-width="2" stroke-linecap="round" fill="none" style="animation:windFlow 1.8s ease-in-out .3s infinite"/>\n  <path d="M4 28 Q10 28 16 28" stroke="rgba(255,255,255,.4)" stroke-width="1.5" stroke-linecap="round" fill="none" style="animation:windFlow 1.8s ease-in-out .6s infinite"/>\n  <style>@keyframes windFlow{0%{stroke-dashoffset:100;stroke-dasharray:120}50%{stroke-dashoffset:0;stroke-dasharray:120}100%{stroke-dashoffset:-100;stroke-dasharray:120}}</style>\n</svg>', 'uv': '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 8px rgba(255,200,0,.6))">\n  <g style="animation:uvSpin 4s linear infinite;transform-origin:20px 20px">\n    <line x1="20" y1="2" x2="20" y2="8" stroke="rgba(255,230,0,.9)" stroke-width="2.5" stroke-linecap="round"/>\n    <line x1="33" y1="7" x2="28.7" y2="11.2" stroke="rgba(255,230,0,.9)" stroke-width="2.5" stroke-linecap="round"/>\n    <line x1="38" y1="20" x2="32" y2="20" stroke="rgba(255,230,0,.9)" stroke-width="2.5" stroke-linecap="round"/>\n    <line x1="33" y1="33" x2="28.7" y2="28.8" stroke="rgba(255,230,0,.9)" stroke-width="2.5" stroke-linecap="round"/>\n    <line x1="20" y1="38" x2="20" y2="32" stroke="rgba(255,230,0,.9)" stroke-width="2.5" stroke-linecap="round"/>\n    <line x1="7" y1="33" x2="11.3" y2="28.8" stroke="rgba(255,230,0,.9)" stroke-width="2.5" stroke-linecap="round"/>\n    <line x1="2" y1="20" x2="8" y2="20" stroke="rgba(255,230,0,.9)" stroke-width="2.5" stroke-linecap="round"/>\n    <line x1="7" y1="7" x2="11.3" y2="11.2" stroke="rgba(255,230,0,.9)" stroke-width="2.5" stroke-linecap="round"/>\n  </g>\n  <circle cx="20" cy="20" r="9" fill="url(#uvGrad)"/>\n  <text x="20" y="25" text-anchor="middle" font-size="10" font-weight="800" fill="#1a1a00" font-family="sans-serif">UV</text>\n  <defs>\n    <radialGradient id="uvGrad" cx="40%" cy="35%" r="65%">\n      <stop offset="0%" stop-color="#fff9a0"/>\n      <stop offset="50%" stop-color="#ffd200"/>\n      <stop offset="100%" stop-color="#ff8c00"/>\n    </radialGradient>\n  </defs>\n  <style>@keyframes uvSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}</style>\n</svg>', 'precip': '<svg width="38" height="42" viewBox="0 0 38 42" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 6px rgba(74,175,254,.4))">\n  <path d="M19 4 Q8 12 6 18 A13 13 0 0 0 32 18 Q30 12 19 4Z" fill="url(#cloudRainGrad)"/>\n  <line x1="13" y1="30" x2="11" y2="38" stroke="rgba(74,175,254,.9)" stroke-width="2" stroke-linecap="round" style="animation:rainDrop 1.2s ease-in infinite"/>\n  <line x1="19" y1="30" x2="17" y2="38" stroke="rgba(74,175,254,.9)" stroke-width="2" stroke-linecap="round" style="animation:rainDrop 1.2s ease-in .2s infinite"/>\n  <line x1="25" y1="30" x2="23" y2="38" stroke="rgba(74,175,254,.9)" stroke-width="2" stroke-linecap="round" style="animation:rainDrop 1.2s ease-in .4s infinite"/>\n  <defs>\n    <linearGradient id="cloudRainGrad" x1="0%" y1="0%" x2="100%" y2="100%">\n      <stop offset="0%" stop-color="rgba(200,230,255,.9)"/>\n      <stop offset="100%" stop-color="rgba(100,160,220,.9)"/>\n    </linearGradient>\n  </defs>\n  <style>@keyframes rainDrop{0%{opacity:0;transform:translateY(-4px)}30%{opacity:1}100%{opacity:0;transform:translateY(6px)}}</style>\n</svg>', 'pressure': '', 'visibility': ''};

function heroStat(id, iconKey, val, lbl){
  const el = document.getElementById(id);
  if(!el) return;
  const svg = WEATHER_SVGS[iconKey] || iconKey;
  el.innerHTML = `<div class="ws-icon">${svg}</div><div class="ws-val">${val}</div><div class="ws-lbl">${lbl}</div>`;
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
      <div style="width:32px">${weatherSVG(daily.weather_code[i], 1, 28)}</div>
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
        <div style="margin:3px 0">${weatherSVG(hourly.weather_code[j], hourly.is_day[j], 26)}</div>
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
