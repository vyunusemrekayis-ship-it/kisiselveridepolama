// ── WEATHER.JS ───────────────────────────────────────────────────────

let weatherLat = null;
let weatherLon = null;
let weatherCityName = '';
let weatherRefreshTimer = null;

// Hava kodu → emoji + açıklama
function weatherCodeInfo(code, isDay=1){
  const night = isDay === 0;
  const map = {
    0: {e: night?'🌙':'☀️', t:'Açık'},
    1: {e: night?'🌙':'🌤️', t:'Çoğunlukla Açık'},
    2: {e:'⛅', t:'Parçalı Bulutlu'},
    3: {e:'☁️', t:'Kapalı'},
    45:{e:'🌫️', t:'Sisli'},
    48:{e:'🌫️', t:'Kırağı Sisi'},
    51:{e:'🌦️', t:'Hafif Çiseleyen'},
    53:{e:'🌦️', t:'Çiseleyen'},
    55:{e:'🌧️', t:'Yoğun Çiseleyen'},
    61:{e:'🌧️', t:'Hafif Yağmur'},
    63:{e:'🌧️', t:'Yağmur'},
    65:{e:'🌧️', t:'Yoğun Yağmur'},
    71:{e:'🌨️', t:'Hafif Kar'},
    73:{e:'❄️', t:'Kar'},
    75:{e:'❄️', t:'Yoğun Kar'},
    80:{e:'🌦️', t:'Hafif Sağanak'},
    81:{e:'🌧️', t:'Sağanak'},
    82:{e:'⛈️', t:'Şiddetli Sağanak'},
    85:{e:'🌨️', t:'Kar Sağanağı'},
    95:{e:'⛈️', t:'Gök Gürültülü Fırtına'},
    96:{e:'⛈️', t:'Dolu ile Fırtına'},
    99:{e:'⛈️', t:'Şiddetli Dolu Fırtınası'},
  };
  return map[code] || {e:'🌡️', t:'Bilinmiyor'};
}

function windDirection(deg){
  const dirs = ['K','KKD','KD','DKD','D','DGD','GD','GGD','G','GGB','GB','BGB','B','BKB','KB','KKB'];
  return dirs[Math.round(deg/22.5) % 16];
}

function uvLabel(uv){
  if(uv <= 2) return uv + ' (Düşük)';
  if(uv <= 5) return uv + ' (Orta)';
  if(uv <= 7) return uv + ' (Yüksek)';
  if(uv <= 10) return uv + ' (Çok Yüksek)';
  return uv + ' (Aşırı)';
}

// ── KONUm ────────────────────────────────────────────────────────────

async function getWeatherByGPS(){
  if(!navigator.geolocation){
    showWeatherError('Tarayıcınız konum özelliğini desteklemiyor.');
    return;
  }
  showWeatherLoading();
  navigator.geolocation.getCurrentPosition(async pos => {
    weatherLat = pos.coords.latitude;
    weatherLon = pos.coords.longitude;
    // Reverse geocode
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${weatherLat}&lon=${weatherLon}&format=json`);
      const d = await r.json();
      weatherCityName = d.address?.city || d.address?.town || d.address?.village || d.address?.county || 'Bilinmiyor';
    } catch(e){ weatherCityName = `${weatherLat.toFixed(2)}, ${weatherLon.toFixed(2)}`; }
    fetchWeatherData();
  }, err => {
    hideWeatherLoading();
    showWeatherError('Konum alınamadı: ' + err.message);
  });
}

async function searchWeatherCity(){
  const q = document.getElementById('weather-city-input').value.trim();
  if(!q) return;
  showWeatherLoading();
  try {
    const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=tr&format=json`);
    const d = await r.json();
    if(!d.results || !d.results.length){
      hideWeatherLoading();
      showWeatherError('Şehir bulunamadı. Farklı bir isim deneyin.');
      return;
    }
    const city = d.results[0];
    weatherLat = city.latitude;
    weatherLon = city.longitude;
    weatherCityName = city.name + (city.country ? ', ' + city.country : '');
    fetchWeatherData();
  } catch(e){
    hideWeatherLoading();
    showWeatherError('Arama başarısız: ' + e.message);
  }
}

// ── VERİ ÇEKME ───────────────────────────────────────────────────────

async function fetchWeatherData(){
  if(!weatherLat || !weatherLon) return;
  showWeatherLoading();

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${weatherLat}&longitude=${weatherLon}`
    + `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,visibility`
    + `&hourly=temperature_2m,weather_code,precipitation_probability,precipitation,is_day`
    + `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,wind_speed_10m_max`
    + `&timezone=auto&wind_speed_unit=kmh&forecast_days=7`;

  try {
    const r = await fetch(url);
    const d = await r.json();
    hideWeatherLoading();
    renderWeatherData(d);
    // 15 dakikada bir otomatik güncelle
    if(weatherRefreshTimer) clearInterval(weatherRefreshTimer);
    weatherRefreshTimer = setInterval(fetchWeatherData, 15 * 60 * 1000);
  } catch(e){
    hideWeatherLoading();
    showWeatherError('Veri alınamadı: ' + e.message);
  }
}

function refreshWeather(){
  if(weatherLat) fetchWeatherData();
  else getWeatherByGPS();
}

// ── RENDER ───────────────────────────────────────────────────────────

function renderWeatherData(d){
  const c = d.current;
  const daily = d.daily;
  const hourly = d.hourly;

  const info = weatherCodeInfo(c.weather_code, c.is_day);

  // Anlık
  document.getElementById('weather-icon').textContent = info.e;
  document.getElementById('weather-temp').textContent = Math.round(c.temperature_2m) + '°C';
  document.getElementById('weather-feels').textContent = `Hissedilen: ${Math.round(c.apparent_temperature)}°C`;
  document.getElementById('weather-condition').textContent = info.t;
  document.getElementById('weather-location-name').textContent = weatherCityName;

  // Detaylar
  document.getElementById('wd-humidity').textContent = c.relative_humidity_2m + '%';
  document.getElementById('wd-wind').textContent = Math.round(c.wind_speed_10m) + ' km/s';
  document.getElementById('wd-pressure').textContent = Math.round(c.surface_pressure) + ' hPa';
  document.getElementById('wd-visibility').textContent = c.visibility >= 1000 ? Math.round(c.visibility/1000) + ' km' : c.visibility + ' m';
  document.getElementById('wd-uv').textContent = uvLabel(daily.uv_index_max[0]);
  document.getElementById('wd-precip').textContent = c.precipitation + ' mm';
  document.getElementById('wd-winddir').textContent = windDirection(c.wind_direction_10m) + ' (' + Math.round(c.wind_direction_10m) + '°)';

  // Gündoğumu/Günbatımı
  const fmtTime = s => {
    const d = new Date(s);
    return d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
  };
  document.getElementById('wd-sunrise').textContent = fmtTime(daily.sunrise[0]);
  document.getElementById('wd-sunset').textContent = fmtTime(daily.sunset[0]);

  // Güncelleme zamanı
  const now = new Date();
  document.getElementById('weather-updated').textContent = `Güncellendi: ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;

  // Saatlik
  const hourlyEl = document.getElementById('weather-hourly');
  const nowHour = new Date().getHours();
  let hHtml = '';
  let shown = 0;
  for(let i = 0; i < hourly.time.length && shown < 24; i++){
    const h = new Date(hourly.time[i]);
    if(h < new Date()) continue;
    const hi = weatherCodeInfo(hourly.weather_code[i], hourly.is_day[i]);
    const isNowHour = h.getHours() === nowHour;
    hHtml += `<div style="flex-shrink:0;text-align:center;padding:8px 10px;border-radius:10px;background:${isNowHour?'var(--accent)':'var(--surface2)'};min-width:56px">
      <div style="font-size:10px;color:${isNowHour?'#1a1a00':'var(--muted)'}">${h.getHours().toString().padStart(2,'0')}:00</div>
      <div style="font-size:20px;margin:4px 0">${hi.e}</div>
      <div style="font-size:12px;font-weight:600;color:${isNowHour?'#1a1a00':'var(--text)'}">${Math.round(hourly.temperature_2m[i])}°</div>
      <div style="font-size:10px;color:${isNowHour?'rgba(0,0,0,.5)':'var(--muted)'}">${hourly.precipitation_probability[i]}%</div>
    </div>`;
    shown++;
  }
  hourlyEl.innerHTML = hHtml;

  // 7 Günlük
  const dailyEl = document.getElementById('weather-daily');
  const days = ['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'];
  let dHtml = '';
  for(let i = 0; i < daily.time.length; i++){
    const dt = new Date(daily.time[i]+'T12:00:00');
    const di = weatherCodeInfo(daily.weather_code[i]);
    const isToday = i === 0;
    dHtml += `<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:10px;background:${isToday?'var(--surface2)':'transparent'};border:0.5px solid ${isToday?'var(--border)':'transparent'}">
      <div style="width:36px;font-size:12px;color:var(--muted);font-weight:${isToday?600:400}">${isToday?'Bugün':days[dt.getDay()]}</div>
      <div style="font-size:22px">${di.e}</div>
      <div style="flex:1;font-size:12px;color:var(--muted)">${di.t}</div>
      <div style="font-size:11px;color:var(--muted)">☔ ${daily.precipitation_sum[i]}mm</div>
      <div style="font-size:13px;color:var(--muted)">${Math.round(daily.temperature_2m_min[i])}°</div>
      <div style="width:60px;height:4px;border-radius:2px;background:linear-gradient(to right,#74b9ff,#fd79a8);margin:0 4px"></div>
      <div style="font-size:13px;font-weight:600;color:var(--text)">${Math.round(daily.temperature_2m_max[i])}°</div>
    </div>`;
  }
  dailyEl.innerHTML = dHtml;

  // Göster
  document.getElementById('weather-welcome').style.display = 'none';
  document.getElementById('weather-main-card').style.display = 'block';

  // Widget güncelle
  updateWeatherWidget(c, info, daily);
}

// ── WIDGET ───────────────────────────────────────────────────────────

function updateWeatherWidget(c, info, daily){
  const el = document.getElementById('hw-weather-body');
  if(!el) return;
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <span style="font-size:28px">${info.e}</span>
      <div>
        <div style="font-size:22px;font-weight:700;line-height:1">${Math.round(c.temperature_2m)}°C</div>
        <div style="font-size:10px;opacity:.7">${info.t}</div>
      </div>
    </div>
    <div style="font-size:10px;opacity:.6;margin-bottom:2px">${weatherCityName}</div>
    <div style="font-size:10px;opacity:.7">↑${Math.round(daily.temperature_2m_max[0])}° ↓${Math.round(daily.temperature_2m_min[0])}° · 💧${c.relative_humidity_2m}%</div>
  `;
}

// ── YARDIMCI ─────────────────────────────────────────────────────────

function showWeatherLoading(){
  document.getElementById('weather-loading').style.display = 'block';
  document.getElementById('weather-main-card').style.display = 'none';
  document.getElementById('weather-welcome').style.display = 'none';
  document.getElementById('weather-error').style.display = 'none';
}

function hideWeatherLoading(){
  document.getElementById('weather-loading').style.display = 'none';
}

function showWeatherError(msg){
  const el = document.getElementById('weather-error');
  el.textContent = '⚠️ ' + msg;
  el.style.display = 'block';
  document.getElementById('weather-welcome').style.display = 'none';
}

// Sayfa açılınca son konumu yükle
window._weatherInit = function(){
  const saved = localStorage.getItem('gn_weather_loc');
  if(saved){
    try {
      const {lat, lon, name} = JSON.parse(saved);
      weatherLat = lat; weatherLon = lon; weatherCityName = name;
      document.getElementById('weather-city-input').value = name;
      fetchWeatherData();
    } catch(e){}
  }
};

// Konumu kaydet
const _origFetchWeather = fetchWeatherData;
fetchWeatherData = async function(){
  await _origFetchWeather();
  if(weatherLat && weatherLon){
    localStorage.setItem('gn_weather_loc', JSON.stringify({lat:weatherLat, lon:weatherLon, name:weatherCityName}));
  }
};
