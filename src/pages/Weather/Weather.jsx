import { useState, useEffect, useRef } from 'react';

// ── WMO KOD ──────────────────────────────────────────────────────────
function wxc(code, isDay) {
  const d = [
    { c:[0],           t:'Açık',           bg:'sunny'   },
    { c:[1,2],         t:'Az Bulutlu',      bg:'partly'  },
    { c:[3],           t:'Çok Bulutlu',     bg:'cloudy'  },
    { c:[45,48],       t:'Sisli',           bg:'fog'     },
    { c:[51,53,55],    t:'Çiseleme',        bg:'drizzle' },
    { c:[61,63,65],    t:'Yağmurlu',        bg:'rain'    },
    { c:[71,73,75,77], t:'Karlı',           bg:'snow'    },
    { c:[80,81,82],    t:'Sağanak',         bg:'shower'  },
    { c:[85,86],       t:'Yoğun Kar',       bg:'heavysnow'},
    { c:[95],          t:'Fırtına',         bg:'storm'   },
    { c:[96,99],       t:'Dolu',            bg:'hail'    },
  ];
  const m = d.find(x => x.c.includes(code)) || d[0];
  const night = !isDay;
  if (night && m.bg === 'sunny')  return { ...m, bg:'night',        t:'Açık Gece' };
  if (night && m.bg === 'partly') return { ...m, bg:'night-partly', t:'Parçalı Bulutlu Gece' };
  if (night && m.bg === 'rain')   return { ...m, bg:'night-rain',   t:'Gece Yağmuru' };
  if (night && m.bg === 'shower') return { ...m, bg:'night-shower', t:'Gece Sağanağı' };
  if (night && m.bg === 'drizzle')return { ...m, bg:'night-drizzle',t:'Gece Çiselemesi' };
  if (night && m.bg === 'snow')   return { ...m, bg:'night-snow',   t:'Gece Karı' };
  if (night && m.bg === 'cloudy') return { ...m, bg:'night-cloudy', t:'Bulutlu Gece' };
  if (night && m.bg === 'storm')  return { ...m, bg:'night-storm',  t:'Gece Fırtınası' };
  if (night && m.bg === 'hail')   return { ...m, bg:'night-hail',   t:'Gece Dolulu Fırtına' };
  return m;
}

// ── CSS İKON KOMPOZİSYONU ─────────────────────────────────────────────
function WxIcon({ bg, size = 28 }) {
  const s = size;
  const h = s * 0.7;   // bulut yüksekliği
  const r = s * 0.22;  // damla boyutu

  // Ortak şekiller
  const Sun = ({ cx=s*.62, cy=s*.28, rs=s*.16 }) => (
    <g>
      <circle cx={cx} cy={cy} r={rs} fill="#facc15" filter="url(#glow)"/>
      {[0,45,90,135,180,225,270,315].map((deg,i) => {
        const rad = deg*Math.PI/180;
        return <line key={i}
          x1={cx+( rs+s*.04)*Math.cos(rad)} y1={cy+(rs+s*.04)*Math.sin(rad)}
          x2={cx+(rs+s*.10)*Math.cos(rad)} y2={cy+(rs+s*.10)*Math.sin(rad)}
          stroke="#facc15" strokeWidth={s*.025} strokeLinecap="round" opacity=".8"/>;
      })}
    </g>
  );

  const Moon = ({ cx=s*.64, cy=s*.28 }) => (
    <g>
      <circle cx={cx} cy={cy} r={s*.18} fill="#e2d97a" filter="url(#glow-moon)"/>
      <circle cx={cx+s*.1} cy={cy-s*.06} r={s*.14} fill="#0a0e1a"/>
    </g>
  );

  const Cloud = ({ x=0, y=s*.38, w=s*.82, dark=false, opacity=1 }) => {
    const fill = dark ? 'rgba(60,80,110,.9)' : 'rgba(200,215,235,.85)';
    const ch = w*0.38;
    return (
      <g opacity={opacity}>
        <ellipse cx={x+w*.25} cy={y} rx={w*.18} ry={ch*.55} fill={fill}/>
        <ellipse cx={x+w*.48} cy={y-ch*.18} rx={w*.25} ry={ch*.7} fill={fill}/>
        <ellipse cx={x+w*.72} cy={y} rx={w*.18} ry={ch*.5} fill={fill}/>
        <rect x={x+w*.07} y={y} width={w*.86} height={ch*.55} fill={fill}/>
      </g>
    );
  };

  const Drops = ({ count=3, color='#60a5fa', yBase=s*.76, xs }) => {
    const defaultXs = [s*.22, s*.46, s*.70];
    const pts = xs || defaultXs.slice(0, count);
    return (
      <g>
        {pts.map((x,i) => (
          <ellipse key={i} cx={x} cy={yBase+i%2*s*.06} rx={r*.5} ry={r*.75}
            fill={color} opacity={.8+i*.05}/>
        ))}
      </g>
    );
  };

  const Snow = ({ count=3, yBase=s*.76, xs }) => {
    const defaultXs = [s*.22, s*.46, s*.70];
    const pts = xs || defaultXs.slice(0, count);
    return (
      <g>
        {pts.map((x,i) => (
          <g key={i} transform={`translate(${x},${yBase+i%2*s*.06})`}>
            <line x1={-r*.6} y1={0} x2={r*.6} y2={0} stroke="#bae6fd" strokeWidth={s*.025} strokeLinecap="round"/>
            <line x1={0} y1={-r*.6} x2={0} y2={r*.6} stroke="#bae6fd" strokeWidth={s*.025} strokeLinecap="round"/>
            <line x1={-r*.45} y1={-r*.45} x2={r*.45} y2={r*.45} stroke="#bae6fd" strokeWidth={s*.022} strokeLinecap="round"/>
            <line x1={r*.45} y1={-r*.45} x2={-r*.45} y2={r*.45} stroke="#bae6fd" strokeWidth={s*.022} strokeLinecap="round"/>
          </g>
        ))}
      </g>
    );
  };

  const Lightning = ({ x=s*.46, y=s*.72, delay='0s' }) => (
    <g style={{ animation:`boltFlash 2.8s ease-in-out infinite ${delay}` }}>
      <polygon points={`${x},${y} ${x-s*.08},${y+s*.14} ${x+s*.02},${y+s*.14} ${x-s*.06},${y+s*.28}`}
        fill="#fbbf24"/>
      {/* Parıltı */}
      <polygon points={`${x},${y} ${x-s*.08},${y+s*.14} ${x+s*.02},${y+s*.14} ${x-s*.06},${y+s*.28}`}
        fill="white" opacity=".4" style={{ filter:'blur(1px)' }}/>
    </g>
  );

  const FogLines = () => (
    <g>
      {[0,1,2].map(i => (
        <line key={i} x1={s*.1} y1={s*(.52+i*.12)} x2={s*.9} y2={s*(.52+i*.12)}
          stroke="rgba(180,200,220,.5)" strokeWidth={s*.03} strokeLinecap="round"
          strokeDasharray={`${s*.15} ${s*.08}`}/>
      ))}
    </g>
  );

  const Hail = ({ xs }) => {
    const pts = xs || [s*.22, s*.46, s*.70];
    return (
      <g>
        {pts.map((x,i) => (
          <circle key={i} cx={x} cy={s*.78+i%2*s*.06} r={r*.6}
            fill="rgba(186,230,253,.9)" stroke="rgba(147,197,253,.6)" strokeWidth={s*.015}/>
        ))}
      </g>
    );
  };

  const icons = {
    'sunny':         <><Sun cx={s*.5} cy={s*.45}/></>,
    'night':         <><Moon cx={s*.52} cy={s*.44}/></>,
    'partly':        <><Sun cx={s*.62} cy={s*.28}/><Cloud x={s*.04} y={s*.54} w={s*.78} opacity={.95}/></>,
    'night-partly':  <><Moon cx={s*.64} cy={s*.28}/><Cloud x={s*.04} y={s*.54} w={s*.78} dark opacity={.9}/></>,
    'cloudy':        <><Cloud x={s*.05} y={s*.32} w={s*.88} opacity={.5}/><Cloud x={0} y={s*.52} w={s*.98}/></>,
    'night-cloudy':  <><Cloud x={s*.05} y={s*.32} w={s*.88} dark opacity={.5}/><Cloud x={0} y={s*.52} w={s*.98} dark/></>,
    'fog':           <><Cloud x={0} y={s*.36} w={s*.98} opacity={.6}/><FogLines/></>,
    'drizzle':       <><Cloud x={0} y={s*.38} w={s*.98}/><Drops count={3} color="rgba(147,197,253,.7)" xs={[s*.28,s*.52,s*.74]}/></>,
    'night-drizzle': <><Cloud x={0} y={s*.38} w={s*.98} dark/><Drops count={3} color="rgba(147,197,253,.6)" xs={[s*.28,s*.52,s*.74]}/></>,
    'rain':          <><Cloud x={0} y={s*.34} w={s*.98}/><Drops count={3} xs={[s*.2,s*.46,s*.72]}/><Drops count={2} color="rgba(96,165,250,.7)" xs={[s*.33,s*.59]} yBase={s*.85}/></>,
    'night-rain':    <><Moon cx={s*.7} cy={s*.22}/><Cloud x={0} y={s*.38} w={s*.92} dark/><Drops count={3} xs={[s*.2,s*.46,s*.72]}/></>,
    'shower':        <><Cloud x={0} y={s*.3} w={s*.98}/><Drops count={3} xs={[s*.18,s*.46,s*.74]}/><Drops count={2} xs={[s*.32,s*.6]} yBase={s*.85}/></>,
    'night-shower':  <><Moon cx={s*.7} cy={s*.2}/><Cloud x={0} y={s*.36} w={s*.9} dark/><Drops count={3} xs={[s*.18,s*.46,s*.74]}/></>,
    'snow':          <><Cloud x={0} y={s*.34} w={s*.98}/><Snow count={3} xs={[s*.22,s*.5,s*.76]}/></>,
    'night-snow':    <><Cloud x={0} y={s*.34} w={s*.98} dark/><Snow count={3} xs={[s*.22,s*.5,s*.76]}/></>,
    'heavysnow':     <><Cloud x={0} y={s*.28} w={s*.98}/><Snow count={3} xs={[s*.18,s*.46,s*.74]}/><Snow count={2} xs={[s*.32,s*.62]} yBase={s*.88}/></>,
    'storm':         <><Cloud x={0} y={s*.28} w={s*.98} dark/><Lightning x={s*.38} delay="0s"/><Lightning x={s*.62} delay="1.4s"/><Drops count={2} xs={[s*.2,s*.7]}/></>,
    'night-storm':   <><Moon cx={s*.78} cy={s*.18}/><Cloud x={0} y={s*.32} w={s*.98} dark/><Lightning x={s*.38} delay="0s"/><Lightning x={s*.62} delay="1.4s"/><Drops count={2} xs={[s*.2,s*.7]}/></>,
    'hail':          <><Cloud x={0} y={s*.28} w={s*.98} dark/><Lightning x={s*.46} delay="0s"/><Hail xs={[s*.18,s*.46,s*.74]}/></>,
    'night-hail':    <><Moon cx={s*.78} cy={s*.18}/><Cloud x={0} y={s*.32} w={s*.98} dark/><Lightning x={s*.46} delay=".6s"/><Hail xs={[s*.18,s*.46,s*.74]}/></>,
  };

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} style={{ overflow:'visible', flexShrink:0 }}>
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={s*.06} result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="glow-moon" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={s*.04} result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <style>{`
          @keyframes boltFlash{0%,60%,100%{opacity:0}62%,64%{opacity:1}63%,65%{opacity:.3}67%{opacity:1}68%{opacity:0}}
        `}</style>
      </defs>
      {icons[bg] || icons['cloudy']}
    </svg>
  );
}

// ── HAVA SAHNESİ — büyük dinamik ekran ──────────────────────────────
function WeatherScene({ code, isDay, current, daily, alerts, air }) {
  const temp = current?.temperature_2m ?? 0;
  const feels = current?.apparent_temperature ?? temp;
  const cityName = current?.cityName ?? '';

  const getScene = () => {
    if (code >= 95) return { bg:['#0c1018','#141c28','#1c2838'], type:'storm', accent:'rgba(147,197,253,.7)' };
    if ((code>=71&&code<=77)||code===85||code===86) return { bg:isDay?['#2a3848','#4a5868','#6a7888']:['#0c1020','#141828','#1c2030'], type:'snow', accent:'rgba(186,230,253,.7)' };
    if (code>=51&&code<=67) return { bg:isDay?['#162030','#243040','#324050']:['#080c14','#0e121c','#141820'], type:'rain', accent:'rgba(96,165,250,.7)' };
    if (code>=80&&code<=82) return { bg:isDay?['#1a2535','#283545','#364555']:['#080c14','#0e121c','#141820'], type:'shower', accent:'rgba(96,165,250,.8)' };
    if (code===45||code===48) return { bg:['#1a2030','#283040','#364050'], type:'fog', accent:'rgba(148,163,184,.6)' };
    if (code>=3) return { bg:isDay?['#243040','#3a4858','#506070']:['#0a0e18','#121620','#1a1e28'], type:'cloud', accent:'rgba(148,163,184,.5)' };
    return { bg:isDay?['#1a4a8a','#2a6ab0','#4a8ad0']:['#020510','#04091a','#060e24'], type:isDay?'clear':'night', accent:'rgba(250,204,21,.8)' };
  };

  const scene = getScene();
  const [c1,c2,c3] = scene.bg;
  const maxTemp = daily?.temperature_2m_max?.[0];
  const minTemp = daily?.temperature_2m_min?.[0];
  const feelsDiff = Math.round(feels) - Math.round(temp);
  const info = wxc(code, isDay);

  // Animasyon elemanları
  const particles = () => {
    if (scene.type === 'clear') return (
      <>
        <div style={{ position:'absolute', top:20, right:28, width:70, height:70, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,214,0,.9) 20%,rgba(255,180,0,.4) 55%,transparent 75%)', animation:'wxSunPulse 3s ease-in-out infinite', zIndex:1 }}/>
        <div style={{ position:'absolute', top:8, right:16, width:94, height:94, borderRadius:'50%', background:'radial-gradient(circle,transparent 40%,rgba(255,214,0,.08) 70%,transparent)', animation:'wxSunPulse 3s ease-in-out infinite .5s', zIndex:1 }}/>
      </>
    );
    if (scene.type === 'night') return (
      <>
        {[...Array(14)].map((_,i) => (
          <div key={i} style={{ position:'absolute', borderRadius:'50%', background:'#fff',
            width:i%4===0?2.5:1.5, height:i%4===0?2.5:1.5,
            top:`${8+i*6}%`, left:`${6+i*7}%`,
            animation:`wxStarTwinkle ${1.4+i*0.25}s ease-in-out infinite ${i*0.18}s`, zIndex:1 }}/>
        ))}
        <div style={{ position:'absolute', top:18, right:30, width:48, height:48, borderRadius:'50%', background:'radial-gradient(circle,#f0e8c8 40%,rgba(240,232,200,.3) 70%,transparent)', boxShadow:'0 0 24px rgba(240,220,120,.25)', animation:'wxMoonGlow 4s ease-in-out infinite', zIndex:1 }}/>
      </>
    );
    if (scene.type === 'cloud' || scene.type === 'fog') return (
      <>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ position:'absolute', top:`${15+i*20}%`, left:'-60px',
            width:`${200+i*50}px`, height:`${40+i*14}px`, borderRadius:'60px',
            background:`rgba(255,255,255,${0.05-i*0.01})`,
            animation:`wxCloudDrift ${20+i*7}s linear infinite ${i*4}s`, zIndex:1 }}/>
        ))}
      </>
    );
    if (['rain','shower','drizzle'].includes(scene.type)) return (
      <>
        {[0,1,2].map(i => (
          <div key={i} style={{ position:'absolute', top:`${10+i*20}%`, left:'-50px',
            width:`${180+i*40}px`, height:`${35+i*10}px`, borderRadius:'50px',
            background:`rgba(100,150,200,${0.06-i*0.01})`,
            animation:`wxCloudDrift ${16+i*5}s linear infinite ${i*3}s`, zIndex:1 }}/>
        ))}
        {[...Array(18)].map((_,i) => (
          <div key={i+10} style={{ position:'absolute', top:'-12px', left:`${3+i*5.5}%`,
            width: scene.type==='drizzle'?'1px':'1.5px',
            height: scene.type==='drizzle'?'9px':'16px',
            background:`rgba(147,197,253,${0.35+i%3*0.1})`, borderRadius:'1px',
            animation:`wxRainDrop ${0.55+i*0.06}s linear infinite ${i*0.07}s`, zIndex:2 }}/>
        ))}
      </>
    );
    if (scene.type === 'snow') return (
      <>
        {[...Array(14)].map((_,i) => (
          <div key={i} style={{ position:'absolute', top:'-10px', left:`${3+i*7}%`,
            width:`${4+i%3}px`, height:`${4+i%3}px`, borderRadius:'50%',
            background:`rgba(220,240,255,${0.55+i%4*0.1})`,
            animation:`wxSnowFall ${2.2+i*0.28}s linear infinite ${i*0.22}s`, zIndex:2 }}/>
        ))}
      </>
    );
    if (scene.type === 'storm') return (
      <>
        {[...Array(20)].map((_,i) => (
          <div key={i} style={{ position:'absolute', top:'-12px', left:`${2+i*5}%`,
            width:'1.5px', height:'16px', background:`rgba(147,197,253,${0.3+i%4*0.08})`, borderRadius:'1px',
            animation:`wxRainDrop ${0.48+i*0.05}s linear infinite ${i*0.06}s`, zIndex:2 }}/>
        ))}
        <div style={{ position:'absolute', inset:0, background:'rgba(255,255,255,0)', animation:'wxLightning 5s ease infinite 1.5s', zIndex:3 }}/>
      </>
    );
    return null;
  };

  return (
    <div style={{ position:'relative', borderRadius:16, overflow:'hidden',
      border:'1px solid rgba(255,255,255,.08)',
      background:`linear-gradient(160deg,${c1} 0%,${c2} 55%,${c3} 100%)`,
      width:'100%', marginBottom:12 }}>
      <style>{`
        @keyframes wxSunPulse{0%,100%{opacity:.85;transform:scale(1)}50%{opacity:1;transform:scale(1.06)}}
        @keyframes wxMoonGlow{0%,100%{box-shadow:0 0 20px rgba(240,220,120,.2)}50%{box-shadow:0 0 40px rgba(240,220,120,.5)}}
        @keyframes wxStarTwinkle{0%,100%{opacity:.25}50%{opacity:1}}
        @keyframes wxCloudDrift{from{transform:translateX(-260px)}to{transform:translateX(110vw)}}
        @keyframes wxRainDrop{from{transform:translateY(-10px)}to{transform:translateY(260px)}}
        @keyframes wxSnowFall{from{transform:translateY(-10px) rotate(0deg)}to{transform:translateY(260px) rotate(420deg)}}
        @keyframes wxLightning{0%,82%,100%{opacity:0}84%,86%{opacity:.7}85%,87%{opacity:0}89%{opacity:.4}90%{opacity:0}}
        @keyframes wxFadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* Arkaplan partikülleri */}
      {particles()}

      {/* İçerik */}
      <div style={{ position:'relative', zIndex:10, padding:'20px 22px' }}>

        {/* Üst satır: şehir + durum */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
          <div style={{ animation:'wxFadeUp .5s ease both' }}>
            <div style={{ fontSize:9, letterSpacing:'2px', textTransform:'uppercase', color:'rgba(255,255,255,.35)', marginBottom:6 }}>
              Hava Durumu
            </div>
            <div style={{ display:'flex', alignItems:'flex-end', gap:14 }}>
              <WxIcon bg={info.bg} size={68}/>
              <div style={{ fontSize:72, fontWeight:200, lineHeight:1, color:'#fff', textShadow:'0 2px 20px rgba(0,0,0,.3)', fontFamily:"'Playfair Display',serif" }}>
                {Math.round(temp)}°
              </div>
              <div style={{ paddingBottom:6 }}>
                <div style={{ fontSize:18, fontWeight:400, color:'rgba(255,255,255,.9)', marginBottom:3 }}>{info.t}</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,.5)' }}>
                  Hissedilen {Math.round(feels)}°
                  {Math.abs(feelsDiff) >= 4 && (
                    <span style={{ marginLeft:6, color: feelsDiff < 0 ? 'rgba(147,197,253,.9)' : 'rgba(251,191,36,.9)', fontSize:11 }}>
                      ({feelsDiff > 0 ? '+' : ''}{feelsDiff}°)
                    </span>
                  )}
                </div>
                {maxTemp != null && (
                  <div style={{ fontSize:11, color:'rgba(255,255,255,.4)', marginTop:2 }}>
                    <span style={{ color:'rgba(248,113,113,.7)' }}>↑{Math.round(maxTemp)}°</span>
                    <span style={{ margin:'0 4px', opacity:.4 }}>·</span>
                    <span style={{ color:'rgba(147,197,253,.7)' }}>↓{Math.round(minTemp)}°</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sağ: nem + rüzgar küçük bilgiler */}
          <div style={{ display:'flex', flexDirection:'column', gap:6, alignItems:'flex-end', animation:'wxFadeUp .5s ease .1s both' }}>
            {current?.relative_humidity_2m != null && (
              <div style={{ fontSize:11, color:'rgba(255,255,255,.45)', display:'flex', alignItems:'center', gap:5 }}>
                <span style={{ fontSize:10, opacity:.7 }}>💧</span> {current.relative_humidity_2m}%
              </div>
            )}
            {current?.wind_speed_10m != null && (
              <div style={{ fontSize:11, color:'rgba(255,255,255,.45)', display:'flex', alignItems:'center', gap:5 }}>
                <span style={{ fontSize:10, opacity:.7 }}>💨</span> {Math.round(current.wind_speed_10m)} km/s
              </div>
            )}
            {current?.uv_index != null && current.uv_index >= 3 && (
              <div style={{ fontSize:11, color:'rgba(255,255,255,.45)', display:'flex', alignItems:'center', gap:5 }}>
                <span style={{ fontSize:10, opacity:.7 }}>☀️</span> UV {current.uv_index}
              </div>
            )}
          </div>
        </div>

        {/* Hava kalitesi */}
        {air?.current?.us_aqi != null && (() => {
          const aqi = air.current.us_aqi;
          const pm25 = air.current.pm2_5 ?? 0;
          const aqiInfo = aqi<=50?{label:'İyi',color:'#22c55e'}:aqi<=100?{label:'Orta',color:'#facc15'}:aqi<=150?{label:'Hassas',color:'#fb923c'}:aqi<=200?{label:'Sağlıksız',color:'#f87171'}:{label:'Tehlikeli',color:'#a855f7'};
          return (
            <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:12, paddingTop:10, borderTop:'1px solid rgba(255,255,255,.08)' }}>
              <div style={{ fontSize:9, color:'rgba(255,255,255,.3)', letterSpacing:'1px', textTransform:'uppercase', whiteSpace:'nowrap' }}>Hava Kal.</div>
              <div style={{ flex:1, height:3, borderRadius:2, background:'rgba(255,255,255,.1)', overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${Math.min(aqi/300*100,100)}%`, background:aqiInfo.color, borderRadius:2, transition:'width 1.2s ease' }}/>
              </div>
              <div style={{ fontSize:10, color:aqiInfo.color, fontWeight:500, whiteSpace:'nowrap' }}>AQI {aqi} · {aqiInfo.label}</div>
              <div style={{ fontSize:9, color:'rgba(255,255,255,.25)', whiteSpace:'nowrap' }}>PM2.5: {pm25.toFixed(0)}</div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ── HOURLY BAR ───────────────────────────────────────────────────────
function HourlyCard({ h, isNow }) {
  const info = wxc(h.code, h.isDay);

  // Yağış tipi ikonu
  const precipIcon = () => {
    if (!h || h.rainProb <= 10) return null;
    if (h.snow > 0 || (h.code >= 71 && h.code <= 77) || h.code === 85 || h.code === 86)
      return { icon:'❄️', color:'#bae6fd', val:`${h.snow > 0 ? h.snow.toFixed(1)+'cm' : h.rainProb+'%'}` };
    if (h.code >= 95)
      return { icon:'⚡', color:'#fbbf24', val:`${h.rainProb}%` };
    if (h.precip >= 2)
      return { icon:'🌧', color:'#60a5fa', val:`${h.precip.toFixed(1)}mm` };
    return { icon:'💧', color:'#93c5fd', val:`${h.rainProb}%` };
  };

  // Rüzgar ikonu
  const windIcon = () => {
    if (!h.wind || h.wind < 15) return null;
    const c = h.wind >= 50 ? '#f87171' : h.wind >= 30 ? '#fb923c' : '#94a3b8';
    return { color:c, val:`${Math.round(h.wind)}` };
  };

  // Hissedilen fark
  const feelsDelta = h.feels != null ? Math.round(h.feels) - Math.round(h.temp) : 0;

  const precip = precipIcon();
  const wind = windIcon();
  const isNight = !h.isDay;

  return (
    <div style={{
      flex:1, minWidth:0, padding:'6px 3px 5px', borderRadius:10,
      background: isNow ? 'rgba(58,123,213,.15)' : isNight ? 'rgba(10,15,35,.4)' : 'rgba(255,255,255,.03)',
      border:`1px solid ${isNow ? 'rgba(58,123,213,.35)' : isNight ? 'rgba(100,120,200,.1)' : 'rgba(255,255,255,.06)'}`,
      display:'flex', flexDirection:'column', alignItems:'center', gap:2,
    }}>
      {/* Saat */}
      <div style={{ fontSize:9, lineHeight:1, color: isNow ? '#93c5fd' : 'rgba(232,237,245,.38)', fontWeight: isNow ? 700 : 400 }}>
        {isNow ? 'Şimdi' : h.hour}
      </div>

      {/* Hava ikonu */}
      <WxIcon bg={info.bg} size={22}/>

      {/* Sıcaklık */}
      <div style={{ fontSize:11, fontWeight:600, lineHeight:1 }}>{Math.round(h.temp)}°</div>

      {/* Hissedilen — sadece fark ≥3 ise */}
      {Math.abs(feelsDelta) >= 3 && (
        <div style={{ fontSize:8, lineHeight:1, color: feelsDelta < 0 ? 'rgba(147,197,253,.7)' : 'rgba(251,191,36,.7)' }}>
          {feelsDelta > 0 ? '+' : ''}{feelsDelta}°
        </div>
      )}

      {/* Yağış */}
      {precip && (
        <div style={{ fontSize:8, lineHeight:1, color:precip.color, display:'flex', alignItems:'center', gap:1 }}>
          {precip.icon} {precip.val}
        </div>
      )}

      {/* Rüzgar — sadece belirgin ise */}
      {wind && (
        <div style={{ fontSize:8, lineHeight:1, color:wind.color }}>
          ↗ {wind.val}
        </div>
      )}
    </div>
  );
}

// ── DAILY ROW ────────────────────────────────────────────────────────
function DailyRow({ day, isToday, expanded, onToggle, hourly }) {
  const info = wxc(day.code, 1);
  return (
    <div>
      <div onClick={onToggle} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 4px', borderBottom:'1px solid rgba(255,255,255,.04)', cursor:'pointer' }}>
        <div style={{ width:44, fontSize:12, color: isToday ? '#e8edf5' : 'rgba(232,237,245,.55)', fontWeight: isToday ? 600 : 400 }}>{isToday ? 'Bugün' : day.label}</div>
        <div style={{ width:26 }}><WxIcon bg={info.bg} size={22}/></div>
        <div style={{ fontSize:10, color:'#7ab8f5', width:36 }}>{day.rainProb > 15 ? `💧${day.rainProb}%` : ''}</div>
        <div style={{ fontSize:12, color:'rgba(232,237,245,.32)', width:28, textAlign:'right' }}>{Math.round(day.min)}°</div>
        <div style={{ flex:1 }} />
        <div style={{ fontSize:13, fontWeight:600 }}>{Math.round(day.max)}°</div>
        <div style={{ fontSize:11, color:'rgba(232,237,245,.2)', marginLeft:6, transition:'transform .2s', transform: expanded ? 'rotate(90deg)' : 'none' }}>›</div>
      </div>
      {expanded && hourly && (
        <div style={{ display:'flex', gap:2, paddingTop:8, paddingBottom:4 }}>
          {hourly.map((h, i) => <HourlyCard key={i} h={h} isNow={h.isNow} />)}
        </div>
      )}
    </div>
  );
}

// ── DETAIL CARDS (görselleştirmeli) ─────────────────────────────────
function HumidityCard({ value }) {
  const pct = Math.min(value, 100);
  const color = pct > 80 ? '#60a5fa' : pct > 50 ? '#7ab8f5' : '#94a3b8';
  return (
    <div style={{ background:'#080c14', padding:'16px 14px', transition:'background .15s' }}
         onMouseEnter={e => e.currentTarget.style.background='#0c1020'}
         onMouseLeave={e => e.currentTarget.style.background='#080c14'}>
      <div style={{ fontSize:9, letterSpacing:'1.5px', textTransform:'uppercase', color:'rgba(232,237,245,.28)', marginBottom:10 }}>Nem</div>
      <div style={{ position:'relative', height:56, display:'flex', alignItems:'flex-end', gap:2 }}>
        {/* Dairesel nem göstergesi */}
        <svg width="56" height="56" viewBox="0 0 56 56" style={{ flexShrink:0 }}>
          <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="4"/>
          <circle cx="28" cy="28" r="22" fill="none" stroke={color} strokeWidth="4"
            strokeDasharray={`${2*Math.PI*22}`}
            strokeDashoffset={`${2*Math.PI*22*(1-pct/100)}`}
            strokeLinecap="round"
            transform="rotate(-90 28 28)"
            style={{ transition:'stroke-dashoffset 1s ease', filter:`drop-shadow(0 0 4px ${color}66)` }}/>
          <text x="28" y="33" textAnchor="middle" fill="#e8edf5" fontSize="13" fontWeight="300">{value}%</text>
        </svg>
        <div style={{ marginLeft:8 }}>
          <div style={{ fontSize:10, color:'rgba(232,237,245,.35)', lineHeight:1.6 }}>Bağıl nem</div>
          <div style={{ fontSize:10, color, marginTop:2 }}>{pct > 80 ? 'Yüksek' : pct > 50 ? 'Orta' : 'Düşük'}</div>
        </div>
      </div>
    </div>
  );
}

function WindCard({ speed, gust }) {
  const maxSpd = 80;
  const pct = Math.min(speed / maxSpd, 1);
  const gustPct = Math.min(gust / maxSpd, 1);
  const color = speed > 50 ? '#f87171' : speed > 30 ? '#fb923c' : speed > 15 ? '#facc15' : '#7ab8f5';
  return (
    <div style={{ background:'#080c14', padding:'16px 14px', transition:'background .15s' }}
         onMouseEnter={e => e.currentTarget.style.background='#0c1020'}
         onMouseLeave={e => e.currentTarget.style.background='#080c14'}>
      <style>{`@keyframes windFlow{0%{opacity:.2;transform:translateX(-6px)}50%{opacity:1}100%{opacity:.2;transform:translateX(6px)}}`}</style>
      <div style={{ fontSize:9, letterSpacing:'1.5px', textTransform:'uppercase', color:'rgba(232,237,245,.28)', marginBottom:10 }}>Rüzgar</div>
      <div style={{ fontSize:22, fontWeight:300, lineHeight:1, marginBottom:6 }}>{Math.round(speed)} <span style={{ fontSize:11, opacity:.5 }}>km/s</span></div>
      {/* Rüzgar barı */}
      <div style={{ height:4, background:'rgba(255,255,255,.06)', borderRadius:2, marginBottom:4, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct*100}%`, background:`linear-gradient(90deg,${color}88,${color})`, borderRadius:2, transition:'width 1s ease', boxShadow:`0 0 6px ${color}66` }}/>
      </div>
      <div style={{ height:3, background:'rgba(255,255,255,.04)', borderRadius:2, overflow:'hidden', marginBottom:6 }}>
        <div style={{ height:'100%', width:`${gustPct*100}%`, background:'rgba(248,113,113,.4)', borderRadius:2, transition:'width 1s ease .2s' }}/>
      </div>
      {/* Animasyonlu rüzgar çizgileri */}
      <div style={{ display:'flex', gap:3, alignItems:'center' }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ height:2, borderRadius:1, background:color, opacity:.6,
            width: i===0?16:i===1?10:i===2?14:8,
            animation:`windFlow ${1.2+i*0.3}s ease-in-out infinite ${i*0.15}s` }}/>
        ))}
        <span style={{ fontSize:9, color:'rgba(232,237,245,.3)', marginLeft:4 }}>esinti {Math.round(gust)} km/s</span>
      </div>
    </div>
  );
}

function UVCard({ value }) {
  const max = 11;
  const pct = Math.min(value / max, 1);
  const segments = [
    { label:'Düşük', range:[0,2], color:'#22c55e' },
    { label:'Orta', range:[3,5], color:'#facc15' },
    { label:'Yüksek', range:[6,7], color:'#fb923c' },
    { label:'Çok Yüksek', range:[8,10], color:'#f87171' },
    { label:'Aşırı', range:[11,11], color:'#a855f7' },
  ];
  const active = segments.find(s => value >= s.range[0] && value <= s.range[1]) || segments[0];
  const angle = -120 + pct * 240; // -120 ile +120 arası
  return (
    <div style={{ background:'#080c14', padding:'16px 14px', transition:'background .15s' }}
         onMouseEnter={e => e.currentTarget.style.background='#0c1020'}
         onMouseLeave={e => e.currentTarget.style.background='#080c14'}>
      <div style={{ fontSize:9, letterSpacing:'1.5px', textTransform:'uppercase', color:'rgba(232,237,245,.28)', marginBottom:8 }}>UV İndeksi</div>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        {/* Yarım daire gauge */}
        <svg width="64" height="36" viewBox="0 0 64 36">
          {/* Arka plan ark */}
          <path d="M 6 34 A 26 26 0 0 1 58 34" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="5" strokeLinecap="round"/>
          {/* Renkli ark */}
          {segments.map((s, i) => {
            const startPct = s.range[0] / max;
            const endPct = Math.min(s.range[1]+1, max) / max;
            const totalArc = 180;
            const startAngle = -180 + startPct * totalArc;
            const endAngle = -180 + endPct * totalArc;
            const startRad = (startAngle * Math.PI) / 180;
            const endRad = (endAngle * Math.PI) / 180;
            const x1 = 32 + 26 * Math.cos(startRad);
            const y1 = 34 + 26 * Math.sin(startRad);
            const x2 = 32 + 26 * Math.cos(endRad);
            const y2 = 34 + 26 * Math.sin(endRad);
            return <path key={i} d={`M ${x1} ${y1} A 26 26 0 0 1 ${x2} ${y2}`} fill="none" stroke={s.color} strokeWidth="5" opacity="0.5" strokeLinecap="butt"/>;
          })}
          {/* İbre */}
          <line
            x1="32" y1="34"
            x2={32 + 20 * Math.cos(((angle-90) * Math.PI)/180)}
            y2={34 + 20 * Math.sin(((angle-90) * Math.PI)/180)}
            stroke={active.color} strokeWidth="2" strokeLinecap="round"
            style={{ filter:`drop-shadow(0 0 3px ${active.color})`, transition:'all 1s ease' }}/>
          <circle cx="32" cy="34" r="3" fill={active.color} style={{ filter:`drop-shadow(0 0 4px ${active.color})` }}/>
        </svg>
        <div>
          <div style={{ fontSize:22, fontWeight:300, lineHeight:1, color:active.color }}>{value ?? '—'}</div>
          <div style={{ fontSize:10, color:active.color, marginTop:3, opacity:.7 }}>{active.label}</div>
        </div>
      </div>
    </div>
  );
}

function SunriseCard({ sunrise }) {
  const toMins = t => { const [h,m] = t.split(':').map(Number); return h*60+m; };
  const nowMins = new Date().getHours()*60 + new Date().getMinutes();
  const passed = nowMins >= toMins(sunrise);
  return (
    <div style={{ background:'#080c14', padding:'16px 14px', transition:'background .15s' }}
         onMouseEnter={e => e.currentTarget.style.background='#0c1020'}
         onMouseLeave={e => e.currentTarget.style.background='#080c14'}>
      <style>{`
        @keyframes riseArc{from{stroke-dashoffset:160}to{stroke-dashoffset:0}}
        @keyframes riseSun{0%{r:0;opacity:0}60%{r:9;opacity:1}100%{r:7;opacity:1}}
        @keyframes riseGlow{0%,100%{filter:drop-shadow(0 0 4px #facc15)}50%{filter:drop-shadow(0 0 10px #facc15)}}
        @keyframes riseBeam{0%{opacity:0;transform:scaleY(0)}100%{opacity:.6;transform:scaleY(1)}}
      `}</style>
      <div style={{ fontSize:9, letterSpacing:'1.5px', textTransform:'uppercase', color:'rgba(232,237,245,.28)', marginBottom:8 }}>Gün Doğumu</div>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <svg width="48" height="40" viewBox="0 0 48 40">
          {/* Ufuk */}
          <line x1="2" y1="30" x2="46" y2="30" stroke="rgba(250,204,21,.2)" strokeWidth="1"/>
          {/* Yarım daire yay — animasyonlu */}
          <path d="M 6 30 A 18 18 0 0 1 42 30" fill="none"
            stroke={passed ? 'rgba(250,204,21,.4)' : 'rgba(250,204,21,.15)'}
            strokeWidth="1.5" strokeDasharray="60" strokeDashoffset="0"
            style={{ animation: passed ? 'riseArc 1.2s ease forwards' : 'none' }}/>
          {/* Güneş */}
          <circle cx="24" cy="30" r={passed ? 7 : 5}
            fill={passed ? '#facc15' : 'rgba(250,204,21,.25)'}
            style={{ animation: passed ? 'riseSun 1s ease forwards, riseGlow 2.5s ease-in-out infinite 1s' : 'none',
              transformOrigin:'24px 30px' }}/>
          {/* Işın demetleri — yalnız doğduktan sonra */}
          {passed && [-40,-20,0,20,40].map((angle, i) => {
            const rad = (angle - 90) * Math.PI / 180;
            return <line key={i}
              x1={24 + 9*Math.cos(rad)} y1={30 + 9*Math.sin(rad)}
              x2={24 + 15*Math.cos(rad)} y2={30 + 15*Math.sin(rad)}
              stroke="#facc15" strokeWidth="1.2" strokeLinecap="round"
              style={{ animation:`riseBeam .6s ease ${i*0.1}s forwards`, opacity:0, transformOrigin:`24px 30px` }}/>;
          })}
        </svg>
        <div>
          <div style={{ fontSize:21, fontWeight:300, lineHeight:1, color: passed ? '#facc15' : 'rgba(232,237,245,.5)' }}>{sunrise}</div>
          <div style={{ fontSize:9, color:'rgba(232,237,245,.3)', marginTop:4 }}>{passed ? 'Doğdu ✓' : 'Doğacak'}</div>
        </div>
      </div>
    </div>
  );
}

function SunsetCard({ sunset }) {
  const toMins = t => { const [h,m] = t.split(':').map(Number); return h*60+m; };
  const nowMins = new Date().getHours()*60 + new Date().getMinutes();
  const passed = nowMins >= toMins(sunset);
  return (
    <div style={{ background:'#080c14', padding:'16px 14px', transition:'background .15s' }}
         onMouseEnter={e => e.currentTarget.style.background='#0c1020'}
         onMouseLeave={e => e.currentTarget.style.background='#080c14'}>
      <style>{`
        @keyframes sunSink{0%{transform:translateY(0);opacity:1}100%{transform:translateY(8px);opacity:.2}}
        @keyframes horizonPulse{0%,100%{opacity:.3}50%{opacity:.7}}
        @keyframes presetGlow{0%,100%{box-shadow:0 0 8px 2px rgba(251,146,60,.4)}50%{box-shadow:0 0 16px 6px rgba(251,146,60,.7)}}
      `}</style>
      <div style={{ fontSize:9, letterSpacing:'1.5px', textTransform:'uppercase', color:'rgba(232,237,245,.28)', marginBottom:10 }}>Gün Batımı</div>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ position:'relative', width:44, height:44, flexShrink:0 }}>
          {/* Ufuk parıltısı */}
          <div style={{ position:'absolute', bottom:6, left:2, right:2, height:4, borderRadius:2,
            background: passed?'rgba(251,146,60,.08)':'rgba(251,146,60,.2)',
            animation:'horizonPulse 2.5s ease-in-out infinite' }}/>
          {/* Ufuk çizgisi */}
          <div style={{ position:'absolute', bottom:8, left:0, right:0, height:1, background:'rgba(251,146,60,.3)', borderRadius:1 }}/>
          {/* Güneş */}
          <div style={{ position:'absolute',
            bottom: passed?4:15,
            left:'50%', transform:'translateX(-50%)',
            width: passed?12:18, height: passed?12:18, borderRadius:'50%',
            background: passed?'rgba(251,146,60,.15)':'#fb923c',
            transition:'all 1.4s ease',
            animation: passed?'sunSink 1.2s ease forwards':'presetGlow 2s ease-in-out infinite' }}/>
          {/* Batmadan önce hafif ışın izleri */}
          {!passed && [-20,0,20].map((deg,i) => (
            <div key={i} style={{ position:'absolute', bottom:22, left:`${50+deg*0.4}%`,
              width:1.5, height:5, borderRadius:1,
              background:'rgba(251,146,60,.4)',
              animation:`horizonPulse ${1.5+i*.3}s ease-in-out infinite ${i*.2}s` }}/>
          ))}
          {/* Yansıma çizgileri — battıktan sonra */}
          {passed && [0,1,2].map(i => (
            <div key={i} style={{ position:'absolute', bottom:6, left:8+i*12, width:8, height:1.5,
              borderRadius:1, background:`rgba(251,146,60,${.35-i*.08})`,
              animation:`horizonPulse ${1.4+i*.3}s ease-in-out infinite ${i*.25}s` }}/>
          ))}
        </div>
        <div>
          <div style={{ fontSize:21, fontWeight:300, lineHeight:1, color: passed?'rgba(232,237,245,.3)':'#fb923c' }}>{sunset}</div>
          <div style={{ fontSize:9, color: passed?'rgba(232,237,245,.2)':'rgba(251,146,60,.6)', marginTop:5 }}>{passed?'Battı':'Batacak'}</div>
        </div>
      </div>
    </div>
  );
}

function PrecipCard({ daily, hourlyData }) {
  const maxVal = Math.max(...hourlyData.map(h => h.precip), 0.1);
  const hasSnow = hourlyData.some(h => h.snow > 0);
  const hasRain = hourlyData.some(h => h.rain > 0);
  const totalPrecip = daily?.precipitation_sum?.[0] ?? 0;
  return (
    <div style={{ background:'#080c14', padding:'16px 14px', transition:'background .15s' }}
         onMouseEnter={e => e.currentTarget.style.background='#0c1020'}
         onMouseLeave={e => e.currentTarget.style.background='#080c14'}>
      <div style={{ fontSize:9, letterSpacing:'1.5px', textTransform:'uppercase', color:'rgba(232,237,245,.28)', marginBottom:8 }}>Yağış Miktarı</div>
      <div style={{ fontSize:18, fontWeight:300, marginBottom:8 }}>
        {totalPrecip > 0 ? `${totalPrecip.toFixed(1)} mm` : '—'}
        <span style={{ fontSize:9, color:'rgba(232,237,245,.3)', marginLeft:6 }}>bugün toplam</span>
      </div>
      {/* Saatlik bar grafik */}
      <div style={{ display:'flex', alignItems:'flex-end', gap:1, height:28 }}>
        {hourlyData.map((h, i) => {
          const rainH = h.rain / maxVal;
          const snowH = h.snow / maxVal;
          const totalH = Math.min(h.precip / maxVal, 1);
          return (
            <div key={i} style={{ flex:1, height:'100%', display:'flex', flexDirection:'column', justifyContent:'flex-end', alignItems:'center' }}>
              <div style={{ width:'100%', display:'flex', flexDirection:'column', borderRadius:'1px 1px 0 0', overflow:'hidden' }}>
                {snowH > 0 && <div style={{ height:`${snowH*28}px`, background:'rgba(147,197,253,.7)', transition:`height .8s ease ${i*0.02}s` }}/>}
                {rainH > 0 && <div style={{ height:`${rainH*28}px`, background:'rgba(96,165,250,.9)', transition:`height .8s ease ${i*0.02}s` }}/>}
                {totalH === 0 && <div style={{ height:1, background:'rgba(255,255,255,.06)' }}/>}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display:'flex', gap:10, marginTop:6 }}>
        {hasRain && <span style={{ fontSize:8, color:'rgba(96,165,250,.8)', display:'flex', alignItems:'center', gap:3 }}><span style={{ width:6, height:6, borderRadius:1, background:'rgba(96,165,250,.8)', display:'inline-block' }}/> Yağmur</span>}
        {hasSnow && <span style={{ fontSize:8, color:'rgba(147,197,253,.8)', display:'flex', alignItems:'center', gap:3 }}><span style={{ width:6, height:6, borderRadius:1, background:'rgba(147,197,253,.8)', display:'inline-block' }}/> Kar</span>}
        {!hasRain && !hasSnow && <span style={{ fontSize:8, color:'rgba(232,237,245,.2)' }}>Yağış beklenmyor</span>}
      </div>
    </div>
  );
}

export default function Weather() {
  const [cities, setCities] = useState(() => {
    try { return JSON.parse(localStorage.getItem('gn_wx_cities') || '[]'); } catch { return []; }
  });
  const [activeCity, setActiveCity] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [expandedDay, setExpandedDay] = useState(0);
  const searchRef = useRef(null);


  const saveCities = (list) => {
    localStorage.setItem('gn_wx_cities', JSON.stringify(list));
    setCities(list);
  };

  const fetchWeather = async (city) => {
    setLoading(true); setData(null);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_gusts_10m,relative_humidity_2m,uv_index,visibility,is_day,precipitation&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,precipitation_probability,precipitation,rain,snowfall,wind_speed_10m,wind_gusts_10m,visibility,uv_index,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,sunrise,sunset&timezone=auto&forecast_days=10`;
      const airUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${city.lat}&longitude=${city.lon}&current=pm2_5,pm10,us_aqi&hourly=pm2_5,us_aqi&timezone=auto&forecast_days=3`;
      const quakeUrl = `https://earthquake.usgs.gov/fdsnws/event/1.1/query?format=geojson&latitude=${city.lat}&longitude=${city.lon}&maxradiuskm=300&minmagnitude=3.5&limit=5&orderby=time`;
      const [airRes, quakeRes] = await Promise.allSettled([fetch(airUrl), fetch(quakeUrl)]);
      const airJson = airRes.status === 'fulfilled' ? await airRes.value.json() : null;
      const quakeJson = quakeRes.status === 'fulfilled' ? await quakeRes.value.json() : null;
      const res = await fetch(url);
      const json = await res.json();
      setData({ ...json, city, air: airJson, quake: quakeJson });
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => {
    if (cities.length > 0) fetchWeather(cities[activeCity]);
  }, [activeCity, cities.length]);

  const suggest = async (q) => {
    if (q.length < 2) { setSuggestions([]); return; }
    try {
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=tr`);
      const json = await res.json();
      setSuggestions(json.results || []);
    } catch { setSuggestions([]); }
  };

  const addCity = (r) => {
    const city = { name: r.name + (r.country_code ? `, ${r.country_code}` : ''), lat: r.latitude, lon: r.longitude };
    const list = [...cities.filter(c => !(Math.abs(c.lat-city.lat)<0.01 && Math.abs(c.lon-city.lon)<0.01)), city];
    saveCities(list);
    setActiveCity(list.length - 1);
    setShowSearch(false); setSearchQ(''); setSuggestions([]);
  };

  const gps = () => {
    navigator.geolocation?.getCurrentPosition(async pos => {
      const { latitude: lat, longitude: lon } = pos.coords;
      try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=tr`);
        const json = await res.json();
        const r = json.results?.[0];
        if (r) addCity({ ...r, latitude: lat, longitude: lon });
        else addCity({ name: `${lat.toFixed(2)}, ${lon.toFixed(2)}`, latitude: lat, longitude: lon });
      } catch { addCity({ name: `${lat.toFixed(2)}, ${lon.toFixed(2)}`, latitude: lat, longitude: lon }); }
    });
  };

  const buildHourly = (dayStr, dayIdx) => {
    if (!data?.hourly) return [];
    const { time, temperature_2m, apparent_temperature: ha, relative_humidity_2m: hrh, weather_code, precipitation_probability, is_day, rain, snowfall, precipitation, wind_speed_10m: hw, wind_gusts_10m: hg, visibility: hv, uv_index: huv } = data.hourly;
    const now = new Date().getHours();
    return time
      .map((t, i) => ({ t, temp: temperature_2m[i], feels: (ha||[])[i]??temperature_2m[i], rh: (hrh||[])[i]||0, code: weather_code[i], rainProb: (precipitation_probability||[])[i]||0, isDay: (is_day||[])[i], hour: new Date(t).getHours(), isNow: t.split('T')[0] === dayStr && new Date(t).getHours() === now, rain: (rain||[])[i]||0, snow: (snowfall||[])[i]||0, precip: (precipitation||[])[i]||0, wind: (hw||[])[i]||0, gust: (hg||[])[i]||0, vis: (hv||[])[i]??10000, uv: (huv||[])[i]||0 }))
      .filter(h => h.t.split('T')[0] === dayStr);
  };

  // ── UYARI SİSTEMİ ────────────────────────────────────────────────
  const buildAlerts = () => {
    if (!data?.hourly || !data?.daily) return [];
    const alerts = [];
    const h = data.hourly;
    const daily = data.daily;
    const now = new Date().getHours();
    const nowMin = new Date().getMinutes();
    const todayStr = daily.time[0];
    const todayIdx = h.time.findIndex(t => t.startsWith(todayStr));
    if (todayIdx < 0) return [];
    const hh = s => String(s).padStart(2,'0');
    const fmt = hour => `${hh(hour)}:00`;

    const allHours = h.time
      .map((t, i) => ({
        t, i,
        hour: new Date(t).getHours(),
        dayStr: t.split('T')[0],
        temp: (h.temperature_2m||[])[i]??0,
        code: (h.weather_code||[])[i]??0,
        wind: (h.wind_speed_10m||[])[i]??0,
        gust: (h.wind_gusts_10m||[])[i]??0,
        precip: (h.precipitation||[])[i]??0,
        rain: (h.rain||[])[i]??0,
        snow: (h.snowfall||[])[i]??0,
        vis: (h.visibility||[])[i]??10000,
        uv: (h.uv_index||[])[i]??0,
        isDay: (h.is_day||[])[i]??1,
      }))
      .filter((x,i) => i >= todayIdx && i < todayIdx + 48);

    const futureHours = allHours.filter(x => x.dayStr > todayStr || x.hour >= now);
    const next24 = futureHours.slice(0, 24);

    const isRainCode  = c => (c >= 51 && c <= 67) || (c >= 80 && c <= 82);
    const isSnowCode  = c => (c >= 71 && c <= 77) || c === 85 || c === 86;
    const isFogCode   = c => c === 45 || c === 48;
    const isStormCode = c => c >= 95;
    const currentCode = data.current?.weather_code ?? 0;
    const currentTemp = data.current?.temperature_2m ?? 0;
    const currentWind = data.current?.wind_speed_10m ?? 0;
    const currentVis  = data.current?.visibility ?? 10000;

    // 1. YAĞMUR PERİYOTLARI
    const rainPeriods = [];
    let inR = false, rStart = null, rDur = 0;
    next24.forEach(x => {
      const wet = isRainCode(x.code) || x.precip > 0.05;
      if (wet && !inR)      { inR = true;  rStart = x.hour; rDur = 1; }
      else if (wet && inR)  { rDur++; }
      else if (!wet && inR) { inR = false; rainPeriods.push({ start:rStart, dur:rDur, end:x.hour }); rDur = 0; }
    });
    if (inR) rainPeriods.push({ start:rStart, dur:rDur, end:null });

    const currentlyRaining = isRainCode(currentCode) || (data.current?.precipitation ?? 0) > 0.05;

    if (currentlyRaining) {
      // Şu an yağıyor — ne zaman duruyor
      const stopH = next24.find(x => !isRainCode(x.code) && x.precip <= 0.05);
      if (stopH) {
        const minsLeft = (stopH.hour - now) * 60 - nowMin;
        const stopStr = minsLeft < 60 ? `~${minsLeft} dakika içinde (${fmt(stopH.hour)})` : `${fmt(stopH.hour)}'de`;
        const p = rainPeriods[0];
        const lvl = p && p.dur >= 6 ? 'warning' : 'info';
        alerts.push({ level:lvl, icon:'🌦', title:`Yağmur ${fmt(stopH.hour)}'de duruyor`, detail:`Şu an yağmur var${p ? `, ${p.dur} saattir yağıyor` : ''}. ${stopStr} duracak.` });
      } else {
        const p = rainPeriods[0];
        if (p) alerts.push({ level:'warning', icon:'🌧', title:`${p.dur} saat aralıksız yağmur`, detail:`${fmt(p.start)} itibarıyla gece boyunca kesintisiz yağmur bekleniyor.` });
      }
    } else {
      // Şu an yağmıyor — ne zaman başlıyor
      rainPeriods.forEach(p => {
        const minsUntil = (p.start - now) * 60 - nowMin;
        if (minsUntil <= 0) return;
        const startStr = minsUntil < 60
          ? `${minsUntil} dakika içinde (${fmt(p.start)})`
          : `${fmt(p.start)}'de`;
        const endStr = p.end != null ? ` – ${fmt(p.end)}'de duruyor` : '';
        const lvl = p.dur >= 6 ? 'warning' : 'info';
        alerts.push({ level:lvl, icon:'🌧', title:`Yağmur ${startStr} başlıyor`, detail:`${p.dur} saat sürecek${endStr}.` });
      });
    }
    // 2. KUVVETLİ YAĞIŞ / SEL
    const totalPrecip3h = next24.slice(0, 3).reduce((s, x) => s + x.precip, 0);
    if (totalPrecip3h >= 30) {
      alerts.push({ level:'danger', icon:'🌊', title:'Sel / taşkın riski', detail:`Önümüzdeki 3 saatte ${totalPrecip3h.toFixed(0)} mm yağış bekleniyor. Dere yatakları ve alçak bölgelerden uzak durun.` });
    } else if (totalPrecip3h >= 15) {
      alerts.push({ level:'warning', icon:'💧', title:'Yoğun yağış / taşkın olasılığı', detail:`Önümüzdeki 3 saatte ${totalPrecip3h.toFixed(0)} mm yağış bekleniyor.` });
    }
    const heavyH = next24.find(x => x.precip >= 10);
    const modH   = next24.find(x => x.precip >= 5 && x.precip < 10);
    const lightH = next24.find(x => x.precip >= 2 && x.precip < 5);
    if (heavyH) alerts.push({ level:'danger',  icon:'⛈', title:'Çok kuvvetli yağış', detail:`${fmt(heavyH.hour)}'da saatte ${heavyH.precip.toFixed(1)} mm yağış bekleniyor.` });
    else if (modH)  alerts.push({ level:'warning', icon:'🌧', title:'Kuvvetli yağış', detail:`${fmt(modH.hour)}'da saatte ${modH.precip.toFixed(1)} mm yağış bekleniyor.` });
    else if (lightH) alerts.push({ level:'info',  icon:'🌦', title:'Bastıran yağış', detail:`${fmt(lightH.hour)}'da saatte ${lightH.precip.toFixed(1)} mm yağış bekleniyor.` });

    // 3. GÖK GÜRÜLTÜLÜ SAĞANAK / YILDIRIM
    const stormH = next24.find(x => isStormCode(x.code));
    if (stormH) {
      const dolu = stormH.code >= 96;
      alerts.push({ level:'danger', icon:'⚡', title: dolu ? 'Dolu / yıldırımlı fırtına' : 'Gök gürültülü sağanak', detail:`${fmt(stormH.hour)}'da ${dolu ? 'dolu eşlikli ' : ''}yıldırımlı fırtına bekleniyor. Açık alanda bulunmayın.` });
    }

    // 4. RÜZGAR / FIRTINA
    const gustH    = next24.find(x => x.gust >= 80);
    const stormW   = next24.find(x => x.wind >= 62);
    const strongW  = next24.find(x => x.wind >= 40 && x.wind < 62);
    const modW     = next24.find(x => x.wind >= 28 && x.wind < 40);
    if (gustH)   alerts.push({ level:'danger',  icon:'🌪', title:'Tayfun seviyesi rüzgar', detail:`${fmt(gustH.hour)}'da ${Math.round(gustH.gust)} km/s ani esinti bekleniyor. Ciddi hasar riski.` });
    else if (stormW)  alerts.push({ level:'danger',  icon:'💨', title:'Fırtına seviyesi rüzgar', detail:`${fmt(stormW.hour)}'da ${Math.round(stormW.wind)} km/s rüzgar bekleniyor.` });
    else if (strongW) alerts.push({ level:'warning', icon:'💨', title:'Kuvvetli rüzgar', detail:`${fmt(strongW.hour)}'da ${Math.round(strongW.wind)} km/s rüzgar bekleniyor.` });
    else if (modW)    alerts.push({ level:'info',    icon:'💨', title:'Orta şiddetli rüzgar', detail:`${fmt(modW.hour)}'da ${Math.round(modW.wind)} km/s rüzgar bekleniyor.` });

    // 5. ANİ SICAKLIK DEĞİŞİMLERİ
    for (let i = 0; i < next24.length - 3; i++) {
      const diff = next24[i+3].temp - next24[i].temp;
      if (diff <= -8) {
        alerts.push({ level:'warning', icon:'🌡', title:'Ani sıcaklık düşüşü', detail:`${fmt(next24[i].hour)} → ${fmt(next24[i+3].hour)}: ${Math.round(next24[i].temp)}° → ${Math.round(next24[i+3].temp)}° (${Math.abs(diff).toFixed(0)}° düşüş).` });
        break;
      }
      if (diff >= 8) {
        alerts.push({ level:'info', icon:'🌡', title:'Ani sıcaklık artışı', detail:`${fmt(next24[i].hour)} → ${fmt(next24[i+3].hour)}: ${Math.round(next24[i].temp)}° → ${Math.round(next24[i+3].temp)}° (${diff.toFixed(0)}° artış).` });
        break;
      }
    }

    // 6. KAR YAĞIŞI
    const snowH2 = next24.find(x => isSnowCode(x.code) || x.snow > 0.1);
    if (snowH2) {
      const heavy = snowH2.snow >= 2 || snowH2.code >= 73;
      alerts.push({ level: heavy ? 'warning' : 'info', icon:'❄️', title: heavy ? 'Yoğun kar yağışı' : 'Kar yağışı bekleniyor', detail:`${fmt(snowH2.hour)}'da kar yağışı başlayacak.${heavy ? ' Trafikte dikkatli olun.' : ''}` });
    }

    // 7. BUZLANMA / DON
    const iceH = next24.find(x => x.temp <= 2 && (isRainCode(x.code) || x.precip > 0));
    const donH = next24.find(x => x.temp <= 0);
    if (iceH)      alerts.push({ level:'danger',  icon:'🧊', title:'Buzlanma riski', detail:`${fmt(iceH.hour)}'da ${Math.round(iceH.temp)}°C'de yağış bekleniyor. Yollar kayganlaşabilir.` });
    else if (donH) alerts.push({ level:'warning', icon:'🥶', title:'Don riski', detail:`${fmt(donH.hour)}'da sıcaklık ${Math.round(donH.temp)}°C'ye düşüyor.` });

    // 8. SİS / DÜŞÜK GÖRÜŞ
    const fogH2 = next24.find(x => isFogCode(x.code) || x.vis < 1000);
    if (fogH2 || currentVis < 1000) {
      const visM = fogH2 ? fogH2.vis : currentVis;
      const visStr = visM < 200 ? `${visM} m` : `${(visM/1000).toFixed(1)} km`;
      alerts.push({ level:'warning', icon:'🌫', title:'Sis / düşük görüş', detail: currentVis < 1000 ? `Şu an görüş ${visStr}. Araç kullanırken dikkatli olun.` : `${fmt(fogH2.hour)}'da sis bekleniyor, görüş ${visStr}'ye düşebilir.` });
    }

    // 9. AŞIRI SICAK
    const extremeH = next24.find(x => x.temp >= 40);
    const hotH2    = next24.find(x => x.temp >= 35 && x.temp < 40);
    if (extremeH)    alerts.push({ level:'danger',  icon:'🔥', title:'Aşırı sıcak hava', detail:`${fmt(extremeH.hour)}'da ${Math.round(extremeH.temp)}°C bekleniyor. Güneş çarpması riski çok yüksek.` });
    else if (hotH2)  alerts.push({ level:'warning', icon:'☀️', title:'Yüksek sıcaklık', detail:`${fmt(hotH2.hour)}'da ${Math.round(hotH2.temp)}°C bekleniyor. Bol su için.` });

    // 10. YÜKSEK UV
    const uvExtreme = next24.find(x => x.uv >= 8);
    const uvHigh    = next24.find(x => x.uv >= 6 && x.uv < 8);
    if (uvExtreme)    alerts.push({ level:'warning', icon:'🕶', title:'Çok yüksek UV', detail:`${fmt(uvExtreme.hour)}'da UV indeksi ${uvExtreme.uv.toFixed(0)} bekleniyor. Güneş kremi şart.` });
    else if (uvHigh)  alerts.push({ level:'info',    icon:'🕶', title:'Yüksek UV', detail:`${fmt(uvHigh.hour)}'da UV indeksi ${uvHigh.uv.toFixed(0)} bekleniyor.` });

    // 11. HIZLI HAVA BOZULMASI
    const isClear = currentCode <= 3;
    if (isClear) {
      const det = next24.slice(1, 5).find(x => isRainCode(x.code) || isStormCode(x.code));
      if (det) {
        const detInfo = wxc(det.code, det.isDay);
        alerts.push({ level:'warning', icon:'🌦', title:'Hava hızla bozuluyor', detail:`Şu an: ${Math.round(currentTemp)}°, ${Math.round(currentWind)} km/s → ${fmt(det.hour)}'da ${detInfo.t} bekleniyor.` });
      }
    }

    // 12. HİSSEDİLEN SICAKLIK FARKI
    const feelsDiff = Math.round(currentTemp) - Math.round(data.current?.apparent_temperature ?? currentTemp);
    if (feelsDiff >= 8) {
      alerts.push({ level:'warning', icon:'🌡', title:'Gerçekten daha soğuk hissettiriyor', detail:`Hava ${Math.round(currentTemp)}° ama hissedilen ${Math.round(data.current.apparent_temperature)}° (${feelsDiff}° fark). Rüzgar şilti gerekebilir.` });
    } else if (feelsDiff <= -6) {
      alerts.push({ level:'info', icon:'🌡', title:'Hissedilen sıcaklık yüksek', detail:`Hava ${Math.round(currentTemp)}° ama hissedilen ${Math.round(data.current.apparent_temperature)}°. Nem etkisi yüksek.` });
    }

    // 13. NEM + SICAKLIK (Heat Index — bunaltıcı his)
    const curRH = data.current?.relative_humidity_2m ?? 0;
    if (currentTemp >= 27 && curRH >= 70) {
      const hi = -8.78469475556 + 1.61139411*currentTemp + 2.33854883889*curRH
        - 0.14611605*currentTemp*curRH - 0.012308094*currentTemp*currentTemp
        - 0.0164248277778*curRH*curRH + 0.002211732*currentTemp*currentTemp*curRH
        + 0.00072546*currentTemp*curRH*curRH - 0.000003582*currentTemp*currentTemp*curRH*curRH;
      if (hi >= 40) alerts.push({ level:'danger',  icon:'💦', title:'Aşırı bunaltıcı hava', detail:`Sıcaklık ${Math.round(currentTemp)}°, nem %${curRH} → his indeksi ${Math.round(hi)}°. Güneş çarpması ve dehidrasyon riski çok yüksek.` });
      else if (hi >= 32) alerts.push({ level:'warning', icon:'💦', title:'Bunaltıcı hava (nem + sıcaklık)', detail:`Sıcaklık ${Math.round(currentTemp)}°, nem %${curRH} → vücut ${Math.round(hi)}° gibi hissediyor. Bol su için.` });
    }

    // 14. YAĞMUR OLASILIK TRENDİ
    const probNow  = next24[0]?.rainProb ?? 0;
    const prob3h   = next24[3]?.rainProb ?? 0;
    const prob6h   = next24[6]?.rainProb ?? 0;
    if (probNow <= 30 && prob3h >= 70) {
      alerts.push({ level:'warning', icon:'📈', title:'Yağmur olasılığı hızla artıyor', detail:`Şu an %${probNow} → 3 saat içinde %${prob3h} yağmur ihtimali.` });
    } else if (probNow <= 30 && prob6h >= 70) {
      alerts.push({ level:'info', icon:'📈', title:'Yağmur olasılığı artıyor', detail:`Şu an %${probNow} → 6 saat içinde %${prob6h} yağmur ihtimali.` });
    }

    // 15. DEPREM (USGS)
    if (data.quake?.features?.length) {
      const q = data.quake.features[0];
      const mag = q.properties.mag;
      const place = q.properties.place;
      const qTime = new Date(q.properties.time);
      const hoursAgo = Math.round((Date.now() - qTime) / 3600000);
      const lvl = mag >= 5.5 ? 'danger' : mag >= 4.5 ? 'warning' : 'info';
      const timeStr = hoursAgo < 1 ? 'Az önce' : hoursAgo === 1 ? '1 saat önce' : `${hoursAgo} saat önce`;
      alerts.push({ level:lvl, icon:'🌍', title:`Deprem M${mag.toFixed(1)}`, detail:`${timeStr} — ${place}. Artçı sarsıntılara dikkat.` });
    }

    // 16. HAVA KALİTESİ (PM2.5 / AQI)
    if (data.air?.current) {
      const aqi = data.air.current.us_aqi ?? 0;
      const pm25 = data.air.current.pm2_5 ?? 0;
      if (aqi >= 200)      alerts.push({ level:'danger',  icon:'😷', title:'Çok kötü hava kalitesi', detail:`AQI ${aqi}, PM2.5: ${pm25.toFixed(0)} µg/m³. Dışarı çıkmaktan kaçının.` });
      else if (aqi >= 150) alerts.push({ level:'danger',  icon:'😷', title:'Sağlıksız hava kalitesi', detail:`AQI ${aqi}, PM2.5: ${pm25.toFixed(0)} µg/m³. Hassas gruplar dışarı çıkmamalı.` });
      else if (aqi >= 100) alerts.push({ level:'warning', icon:'😷', title:'Orta düzeyde kirli hava', detail:`AQI ${aqi}, PM2.5: ${pm25.toFixed(0)} µg/m³. Uzun süre dışarıda kalmaktan kaçının.` });
    }

    // Tekrar önleme + sıralama
    const seen = new Set();
    return alerts
      .filter(a => { if(seen.has(a.title)) return false; seen.add(a.title); return true; })
      .sort((a,b) => ({danger:0,warning:1,info:2}[a.level] - {danger:0,warning:1,info:2}[b.level]));
  };
  // ── GÜNÜN ÖZETİ ──────────────────────────────────────────────────
  const buildDaySummary = () => {
    if (!data?.hourly || !data?.daily) return null;
    const todayStr = data.daily.time[0];
    const todayH = buildHourly(todayStr, 0);
    if (!todayH.length) return null;

    const isRain  = c => (c >= 51 && c <= 67) || (c >= 80 && c <= 82);
    const isSnow  = c => (c >= 71 && c <= 77) || c === 85 || c === 86;
    const isStorm = c => c >= 95;
    const isClear = c => c <= 2;
    const isCloud = c => c === 3;

    // Sabah 06-12, öğle 12-17, akşam 17-21, gece 21-06
    const periods = [
      { label:'Sabah', hours: todayH.filter(h => h.hour >= 6  && h.hour < 12) },
      { label:'Öğle',  hours: todayH.filter(h => h.hour >= 12 && h.hour < 17) },
      { label:'Akşam', hours: todayH.filter(h => h.hour >= 17 && h.hour < 22) },
      { label:'Gece',  hours: todayH.filter(h => h.hour >= 22 || h.hour < 6)  },
    ].filter(p => p.hours.length > 0);

    const descPeriod = (hours) => {
      const codes = hours.map(h => h.code);
      const hasStorm = codes.some(isStorm);
      const hasRain  = codes.some(isRain);
      const hasSnow  = codes.some(isSnow);
      const allClear = codes.every(isClear);
      const mostlyClear = codes.filter(isClear).length > codes.length * 0.6;
      const maxTemp = Math.round(Math.max(...hours.map(h => h.temp)));
      const maxWind = Math.round(Math.max(...hours.map(h => h.wind)));
      const maxPrecip = Math.max(...hours.map(h => h.precip));
      if (hasStorm) return { text:'fırtına', icon:'⛈', temp:maxTemp, wind:maxWind, color:'#f87171' };
      if (hasRain && maxPrecip >= 3) return { text:'kuvvetli yağmur', icon:'🌧', temp:maxTemp, wind:maxWind, color:'#60a5fa' };
      if (hasRain) return { text:'yağmurlu', icon:'🌦', temp:maxTemp, wind:maxWind, color:'#93c5fd' };
      if (hasSnow) return { text:'karlı', icon:'❄️', temp:maxTemp, wind:maxWind, color:'#bae6fd' };
      if (allClear || mostlyClear) return { text:'açık', icon:'☀️', temp:maxTemp, wind:maxWind, color:'#facc15' };
      return { text:'bulutlu', icon:'☁️', temp:maxTemp, wind:maxWind, color:'#94a3b8' };
    };

    const described = periods.map(p => ({ label:p.label, ...descPeriod(p.hours) }));

    // Tek cümle özet
    const parts = described.map(p => `${p.label} ${p.text}`);
    const uniqueParts = parts.filter((v,i,a) => a.indexOf(v) === i);
    let summary;
    if (uniqueParts.length === 1) {
      summary = `Gün boyunca ${uniqueParts[0].split(' ')[1]} hava bekleniyor.`;
    } else {
      const last = uniqueParts.pop();
      summary = uniqueParts.join(', ') + ` ve ${last}.`;
      summary = summary.charAt(0).toUpperCase() + summary.slice(1);
    }

    const dailyMax = Math.round(data.daily.temperature_2m_max[0]);
    const dailyMin = Math.round(data.daily.temperature_2m_min[0]);
    const totalPrecip = data.daily.precipitation_sum?.[0] ?? 0;

    return { described, summary, dailyMax, dailyMin, totalPrecip };
  };

  const TR_D_S = ['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'];

  return (
    <div className="animate-fadeIn" style={{ minHeight:'100vh', display:'flex', flexDirection:'column', padding:'20px 24px' }}>
      {/* Top bar */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        <div style={{ display:'flex', gap:4, flex:1, overflowX:'auto', scrollbarWidth:'none' }}>
          {cities.map((c, i) => (
            <button key={i} onClick={() => setActiveCity(i)}
              style={{ padding:'5px 14px', borderRadius:20, border:`1px solid ${i===activeCity?'rgba(58,123,213,.5)':'rgba(255,255,255,.08)'}`, background: i===activeCity?'rgba(58,123,213,.12)':'transparent', color: i===activeCity?'#e8edf5':'rgba(232,237,245,.5)', fontSize:12, cursor:'pointer', whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:6 }}>
              {c.name}
              <span onClick={e => { e.stopPropagation(); const l=[...cities]; l.splice(i,1); saveCities(l); if(activeCity>=l.length) setActiveCity(Math.max(0,l.length-1)); }} style={{ opacity:.4, fontSize:13, lineHeight:1 }}>×</span>
            </button>
          ))}
        </div>
        <button onClick={() => setShowSearch(s => !s)}
          style={{ padding:'5px 12px', borderRadius:20, border:'1px solid rgba(255,255,255,.08)', background:'transparent', color:'rgba(232,237,245,.5)', fontSize:12, cursor:'pointer', whiteSpace:'nowrap' }}>
          + Şehir
        </button>
      </div>

      {/* Search popup */}
      {showSearch && (
        <div className="animate-slideUp" style={{ background:'#141720', border:'1px solid rgba(255,255,255,.08)', borderRadius:14, padding:14, marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" opacity=".4"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              ref={searchRef}
              autoFocus
              value={searchQ}
              onChange={e => { setSearchQ(e.target.value); suggest(e.target.value); }}
              onKeyDown={e => e.key === 'Enter' && suggestions[0] && addCity(suggestions[0])}
              placeholder="Şehir adı..."
              style={{ flex:1, background:'transparent', border:'none', outline:'none', color:'#e8edf5', fontSize:13 }}
            />
          </div>
          {suggestions.map((r, i) => (
            <div key={i} onClick={() => addCity(r)}
              style={{ padding:'7px 8px', cursor:'pointer', borderRadius:8, fontSize:13, color:'rgba(232,237,245,.7)' }}
              onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,.04)'}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}>
              {r.name}{r.admin1 ? `, ${r.admin1}` : ''}{r.country_code ? ` · ${r.country_code}` : ''}
            </div>
          ))}
          <button onClick={gps} style={{ marginTop:8, padding:'6px 12px', borderRadius:8, border:'1px solid rgba(255,255,255,.08)', background:'transparent', color:'rgba(232,237,245,.5)', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
            Konumumu Kullan
          </button>
        </div>
      )}

      {/* No cities */}
      {cities.length === 0 && !showSearch && (
        <div className="empty-state">
          <div style={{ fontSize:44, opacity:.2, marginBottom:12 }}>🌍</div>
          <div>Üstten şehir ekle ya da GPS konumunu kullan.</div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'40px 0', color:'rgba(232,237,245,.4)', fontSize:13 }}>
          <div style={{ width:20, height:20, border:'2px solid rgba(255,255,255,.1)', borderTopColor:'#3a7bd5', borderRadius:'50%', animation:'spin .8s linear infinite' }} />
          Yükleniyor...
        </div>
      )}

      {/* Data */}
      {data && !loading && (() => {
        const c = data.current;
        const daily = data.daily;
        return (
          <div style={{ animation:'wxfade .4s ease', minWidth:0, width:'100%' }}>
            <style>{`
              @keyframes wxfade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
              @keyframes alertPulse{0%,100%{opacity:1}50%{opacity:.5}}
              @keyframes alertSlide{from{opacity:0;transform:translateX(-4px)}to{opacity:1;transform:translateX(0)}}
            `}</style>

            {/* ── UYARILAR (dinamik ekranın üstünde, yan yana) ── */}
            {(() => {
              const alerts = buildAlerts();
              if (!alerts.length) return null;
              const ls = {
                danger:  { bg:'rgba(239,68,68,.13)',   border:'rgba(239,68,68,.35)',   dot:'#ef4444', title:'#fca5a5' },
                warning: { bg:'rgba(251,146,60,.11)',   border:'rgba(251,146,60,.3)',   dot:'#fb923c', title:'#fdba74' },
                info:    { bg:'rgba(96,165,250,.09)',   border:'rgba(96,165,250,.22)',  dot:'#60a5fa', title:'#93c5fd' },
              };
              return (
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:10 }}>
                  {alerts.map((a, i) => {
                    const s = ls[a.level];
                    return (
                      <div key={i} style={{
                        display:'flex', gap:8, alignItems:'flex-start',
                        padding:'8px 12px', borderRadius:10,
                        background:s.bg, border:`1px solid ${s.border}`,
                        animation:`alertSlide .3s ease ${i*.05}s both`,
                        maxWidth:320, minWidth:180,
                      }}>
                        <div style={{ position:'relative', width:6, height:6, flexShrink:0, marginTop:3 }}>
                          <div style={{ width:6, height:6, borderRadius:'50%', background:s.dot,
                            animation: a.level==='danger' ? 'alertPulse .9s ease-in-out infinite' : 'none' }}/>
                          {a.level==='danger' && (
                            <div style={{ position:'absolute', inset:-3, borderRadius:'50%',
                              border:`1px solid ${s.dot}`, opacity:.4,
                              animation:'alertPulse .9s ease-in-out infinite' }}/>
                          )}
                        </div>
                        <div style={{ minWidth:0 }}>
                          <div style={{ fontSize:11, fontWeight:600, color:s.title, marginBottom:2 }}>
                            {a.icon} {a.title}
                          </div>
                          <div style={{ fontSize:10, color:'rgba(232,237,245,.5)', lineHeight:1.4 }}>{a.detail}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Ana Hava Ekranı */}
            <WeatherScene
              code={c.weather_code}
              isDay={c.is_day}
              current={{ ...c, cityName: data.city.name }}
              daily={daily}
              alerts={buildAlerts()}
              air={data.air}
            />

            {/* Hourly - today */}
            <div style={{ fontSize:9, letterSpacing:'2px', textTransform:'uppercase', color:'rgba(232,237,245,.25)', marginBottom:8 }}>Saatlik Tahmin</div>
            <div style={{ display:'flex', gap:2, marginBottom:16 }}>
              {buildHourly(daily.time[0], 0).map((h, i) => <HourlyCard key={i} h={h} isNow={h.isNow} />)}
            </div>

            {/* Details */}
            {(() => {
              const sr = daily.sunrise?.[0]?.split('T')[1]?.slice(0,5) || '06:00';
              const ss = daily.sunset?.[0]?.split('T')[1]?.slice(0,5) || '20:00';
              const todayHourly = buildHourly(daily.time[0], 0);
              return (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:1, background:'rgba(255,255,255,.04)', borderRadius:16, overflow:'hidden', marginBottom:16 }}>
                  <HumidityCard value={c.relative_humidity_2m} />
                  <WindCard speed={c.wind_speed_10m} gust={c.wind_gusts_10m||0} />
                  <UVCard value={c.uv_index ?? 0} />
                  <SunriseCard sunrise={sr} sunset={ss} />
                  <SunsetCard sunset={ss} sunrise={sr} />
                  <PrecipCard daily={daily} hourlyData={todayHourly} />
                </div>
              );
            })()}

            {/* Saatlik Yağış Grafiği */}
            {(() => {
              const todayHourly = buildHourly(daily.time[0], 0);
              const maxPrecip = Math.max(...todayHourly.map(h => h.precip), 0.1);
              const hasAny = todayHourly.some(h => h.precip > 0);
              const hasSnow = todayHourly.some(h => h.snow > 0);
              const total = todayHourly.reduce((s, h) => s + h.precip, 0);
              const CHART_H = 56;
              const BAR_MIN = 2; // yağış varsa minimum görünür yükseklik
              return (
                <div style={{ background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.06)', borderRadius:16, padding:'14px 16px', marginBottom:16 }}>
                  {/* Başlık */}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:14 }}>
                    <div style={{ fontSize:9, letterSpacing:'2px', textTransform:'uppercase', color:'rgba(232,237,245,.25)' }}>Saatlik Yağış</div>
                    <div style={{ fontSize:11, fontWeight:300, color: hasAny ? '#7ab8f5' : 'rgba(232,237,245,.2)' }}>
                      {hasAny ? `${total.toFixed(1)} mm toplam` : 'Bugün yağış yok'}
                    </div>
                  </div>
                  {/* Her saat kendi bölmesinde */}
                  <div style={{ display:'flex', gap:1 }}>
                    {todayHourly.map((h, i) => {
                      const isCurrent = h.hour === new Date().getHours();
                      const totalMm = h.precip;
                      const snowH = maxPrecip > 0 ? Math.max(h.snow > 0 ? BAR_MIN : 0, (h.snow / maxPrecip) * CHART_H) : 0;
                      // rain yoksa precip'i rain olarak kullan (drizzle gibi durumlarda rain=0 ama precip>0)
                      const effectiveRain = h.rain > 0 ? h.rain : (h.precip - h.snow);
                      const rainH = maxPrecip > 0 ? Math.max(effectiveRain > 0 ? BAR_MIN : 0, (effectiveRain / maxPrecip) * CHART_H) : 0;
                      const hasVal = totalMm >= 0.1;
                      return (
                        <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:0,
                          background: isCurrent ? 'rgba(58,123,213,.08)' : 'transparent',
                          borderRadius:4, padding:'2px 0' }}>
                          {/* mm değeri — her zaman göster, yağış yoksa nokta */}
                          <div style={{
                            fontSize: hasVal ? 6 : 5.5,
                            fontWeight: hasVal ? 600 : 400,
                            color: hasVal
                              ? (h.snow > 0 ? 'rgba(186,230,253,.9)' : 'rgba(96,165,250,.9)')
                              : 'rgba(255,255,255,.1)',
                            lineHeight: 1,
                            marginBottom: 2,
                            height: 8,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            whiteSpace: 'nowrap',
                          }}>
                            {hasVal ? totalMm.toFixed(1) : '·'}
                          </div>
                          {/* Bar alanı */}
                          <div style={{ width:'100%', height:CHART_H, display:'flex', flexDirection:'column', justifyContent:'flex-end', position:'relative' }}>
                            {/* Şu an çizgisi */}
                            {isCurrent && <div style={{ position:'absolute', top:0, bottom:0, left:'50%', width:1,
                              background:'rgba(58,123,213,.5)', transform:'translateX(-50%)', zIndex:2 }}/>}
                            {/* Kar */}
                            {snowH > 0 && (
                              <div style={{ width:'100%', height:`${snowH}px`, background:'rgba(186,230,253,.8)',
                                borderRadius:'2px 2px 0 0',
                                transition:`height .8s cubic-bezier(.34,1.56,.64,1) ${i*0.02}s`,
                                boxShadow: snowH > 4 ? '0 0 5px rgba(186,230,253,.3)' : 'none' }}/>
                            )}
                            {/* Yağmur */}
                            {rainH > 0 && (
                              <div style={{ width:'100%', height:`${rainH}px`,
                                background:`rgba(96,165,250,${0.45 + Math.min(h.rain / maxPrecip, 0.55)})`,
                                borderRadius: snowH > 0 ? 0 : '2px 2px 0 0',
                                transition:`height .8s cubic-bezier(.34,1.56,.64,1) ${i*0.02}s`,
                                boxShadow: rainH > 8 ? '0 0 6px rgba(96,165,250,.3)' : 'none' }}/>
                            )}
                            {/* Sıfır çizgisi */}
                            {snowH === 0 && rainH === 0 && (
                              <div style={{ width:'100%', height:1, background:'rgba(255,255,255,.05)' }}/>
                            )}
                          </div>
                          {/* Saat etiketi — her saat */}
                          <div style={{ fontSize:6, color: isCurrent ? 'rgba(96,165,250,.8)' : 'rgba(232,237,245,.22)', marginTop:3, lineHeight:1, height:8, fontWeight: isCurrent ? 600 : 400 }}>
                            {h.hour}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Legend */}
                  {hasAny && (
                    <div style={{ display:'flex', gap:12, marginTop:10 }}>
                      <span style={{ fontSize:8, color:'rgba(96,165,250,.6)', display:'flex', alignItems:'center', gap:4 }}>
                        <span style={{ width:8, height:5, borderRadius:1, background:'rgba(96,165,250,.7)', display:'inline-block' }}/> Yağmur (mm)
                      </span>
                      {hasSnow && <span style={{ fontSize:8, color:'rgba(186,230,253,.6)', display:'flex', alignItems:'center', gap:4 }}>
                        <span style={{ width:8, height:5, borderRadius:1, background:'rgba(186,230,253,.7)', display:'inline-block' }}/> Kar (cm)
                      </span>}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* 10-day forecast */}
            <div style={{ fontSize:9, letterSpacing:'2px', textTransform:'uppercase', color:'rgba(232,237,245,.25)', marginBottom:8 }}>10 Günlük Tahmin</div>
            <div style={{ background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.06)', borderRadius:16, padding:'4px 12px', marginBottom:16 }}>
              {daily.time.map((dt, i) => {
                const d = new Date(dt + 'T12:00:00');
                const label = TR_D_S[d.getDay()];
                return (
                  <DailyRow
                    key={i} isToday={i===0}
                    day={{ label, code: daily.weather_code[i], min: daily.temperature_2m_min[i], max: daily.temperature_2m_max[i], rainProb: daily.precipitation_probability_max[i] }}
                    expanded={expandedDay === i}
                    onToggle={() => setExpandedDay(expandedDay === i ? -1 : i)}
                    hourly={buildHourly(dt, i)}
                  />
                );
              })}
            </div>

            <div style={{ fontSize:10, color:'rgba(232,237,245,.12)', textAlign:'right' }}>
              Güncellendi {String(new Date().getHours()).padStart(2,'0')}:{String(new Date().getMinutes()).padStart(2,'0')} · Open-Meteo
            </div>
          </div>
        );
      })()}
    </div>
  );
}
