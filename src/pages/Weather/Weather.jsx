import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { buildWeatherAlerts } from '../../lib/utils';

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

  const css = `
    @keyframes wxSpin{to{transform:rotate(360deg)}}
    @keyframes wxBob{0%,100%{transform:translateY(0)}50%{transform:translateY(${-s*.05}px)}}
    @keyframes wxDrift{0%,100%{transform:translateX(0)}50%{transform:translateX(${s*.05}px)}}
    @keyframes wxDrizzle{0%{transform:translateY(0);opacity:0}15%{opacity:.55}85%{opacity:.55}100%{transform:translateY(${s*.22}px);opacity:0}}
    @keyframes wxRain{0%{transform:translateY(0);opacity:0}10%{opacity:1}90%{opacity:1}100%{transform:translateY(${s*.3}px);opacity:0}}
    @keyframes wxShower{0%{transform:translateY(0);opacity:0}8%{opacity:1}92%{opacity:1}100%{transform:translateY(${s*.34}px);opacity:0}}
    @keyframes wxSplash{0%{transform:scale(.2);opacity:.9}100%{transform:scale(1.8);opacity:0}}
    @keyframes wxSnow{0%{transform:translateY(-${s*.04}px);opacity:0}15%{opacity:.85}85%{opacity:.85}100%{transform:translateY(${s*.32}px);opacity:0}}
    @keyframes wxHSnow{0%{transform:translateY(-${s*.04}px);opacity:0}12%{opacity:1}88%{opacity:1}100%{transform:translateY(${s*.36}px);opacity:0}}
    @keyframes wxFog1{0%,100%{transform:translateX(0);opacity:.55}50%{transform:translateX(${s*.1}px);opacity:.8}}
    @keyframes wxFog2{0%,100%{transform:translateX(0);opacity:.4}50%{transform:translateX(${-s*.08}px);opacity:.7}}
    @keyframes wxFog3{0%,100%{transform:translateX(0);opacity:.45}50%{transform:translateX(${s*.12}px);opacity:.75}}
    @keyframes wxBolt{0%,60%,100%{opacity:0}62%,64%{opacity:1}63%,65%{opacity:.3}67%{opacity:1}68%{opacity:0}}
    @keyframes wxHail{0%{transform:translateY(0);opacity:0}15%{opacity:1}85%{opacity:1}100%{transform:translateY(${s*.28}px);opacity:0}}
    @keyframes wxTwinkle{0%,100%{opacity:.8;transform:scale(1)}50%{opacity:.2;transform:scale(.7)}}
  `;

  // ── Ortak bileşenler ──────────────────────────────────────────────
  const Sun = ({ cx=s*.5, cy=s*.45, rs=s*.18 }) => (
    <g style={{ animation:`wxSpin 12s linear infinite`, transformOrigin:`${cx}px ${cy}px` }}>
      <circle cx={cx} cy={cy} r={rs} fill="#fde68a"/>
      {[0,45,90,135,180,225,270,315].map((deg,i) => {
        const rad = deg*Math.PI/180;
        return <line key={i}
          x1={cx+(rs+s*.04)*Math.cos(rad)} y1={cy+(rs+s*.04)*Math.sin(rad)}
          x2={cx+(rs+s*.11)*Math.cos(rad)} y2={cy+(rs+s*.11)*Math.sin(rad)}
          stroke="#fbbf24" strokeWidth={s*.028} strokeLinecap="round" opacity=".85"/>;
      })}
    </g>
  );

  const Moon = ({ cx=s*.52, cy=s*.44 }) => (
    <g>
      <circle cx={cx} cy={cy} r={s*.2} fill="#fef3c7"/>
      <circle cx={cx+s*.11} cy={cy-s*.07} r={s*.16} fill="#0d1117"/>
    </g>
  );

  const Stars = () => (
    <g>
      {[[s*.12,s*.12],[s*.82,s*.15],[s*.9,s*.55],[s*.08,s*.62],[s*.45,s*.08]].map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r={s*.025} fill="#fde68a"
          style={{ animation:`wxTwinkle 2s ease-in-out infinite ${i*.4}s` }}/>
      ))}
    </g>
  );

  // Bulut: fill ve opacity parametreli
  const Cloud = ({ x=0, y=s*.38, w=s*.9, fill='rgba(185,210,232,.88)', op=1 }) => {
    const ch = w*.38;
    return (
      <g opacity={op} style={{ animation:`wxDrift 5s ease-in-out infinite` }}>
        <ellipse cx={x+w*.25} cy={y} rx={w*.17} ry={ch*.55} fill={fill}/>
        <ellipse cx={x+w*.48} cy={y-ch*.18} rx={w*.24} ry={ch*.68} fill={fill}/>
        <ellipse cx={x+w*.72} cy={y} rx={w*.17} ry={ch*.5} fill={fill}/>
        <rect x={x+w*.08} y={y} width={w*.84} height={ch*.52} fill={fill}/>
      </g>
    );
  };

  // Yağmur çizgileri: kalınlık, uzunluk, renk, hız, adet, animasyon
  const RainLines = ({ xs, color='#3b82f6', sw=1.8, len=s*.28, anim='wxRain', dur='1.2s', delays=[0,.3,.6,.15] }) => (
    <g>
      {xs.map((x,i) => (
        <line key={i} x1={x} y1={s*.58} x2={x-len*.15} y2={s*.58+len}
          stroke={color} strokeWidth={sw} strokeLinecap="round" opacity="0"
          style={{ animation:`${anim} ${dur} ease-in infinite ${delays[i]||0}s` }}/>
      ))}
    </g>
  );

  // Kar taneleri: küçük veya büyük
  const SnowFlakes = ({ xs, yBase=s*.62, fontSize=s*.28, anim='wxSnow', dur='2.4s', delays=[0,.8,1.6,.3] }) => (
    <g>
      {xs.map((x,i) => (
        <text key={i} x={x} y={yBase+(i%2)*s*.08} fontSize={fontSize}
          fill="#bae6fd" textAnchor="middle" opacity="0"
          style={{ animation:`${anim} ${dur} ease-in-out infinite ${delays[i]||0}s` }}>*</text>
      ))}
    </g>
  );

  const SnowAccum = ({ cx=s*.5, y=s*.92 }) => (
    <g>
      <ellipse cx={cx} cy={y} rx={s*.38} ry={s*.06} fill="#c8e6f8" opacity=".28"/>
      <ellipse cx={cx} cy={y-.01*s} rx={s*.28} ry={s*.04} fill="#daeefa" opacity=".32"/>
    </g>
  );

  const Lightning = ({ x=s*.46, y=s*.6, delay='0s' }) => (
    <g style={{ animation:`wxBolt 2.5s ease-in-out infinite ${delay}` }}>
      <polygon points={`${x},${y} ${x-s*.1},${y+s*.16} ${x+s*.02},${y+s*.16} ${x-s*.08},${y+s*.32}`}
        fill="#fbbf24" stroke="#fde68a" strokeWidth={s*.018} strokeLinejoin="round"/>
    </g>
  );

  const HailBalls = ({ xs }) => (
    <g>
      {xs.map((x,i) => (
        <circle key={i} cx={x} cy={s*.5} r={s*.04} fill="#bae6fd" stroke="rgba(147,197,253,.8)" strokeWidth={s*.016} opacity="0"
          style={{ animation:`wxHail 1.1s ease-in infinite ${[0,.2,.42,.1,.32][i]||0}s` }}/>
      ))}
    </g>
  );

  // Sis: katmanlı yatay şeritler farklı hızda kayıyor
  const FogLayers = ({ dark=false }) => {
    const base = dark ? 'rgba(50,70,90,' : 'rgba(130,155,178,';
    const layers = [
      { y:s*.3,  w:s*.7,  x:s*.05, op:.55, anim:'wxFog1', dur:'3.5s' },
      { y:s*.42, w:s*.55, x:s*.2,  op:.65, anim:'wxFog2', dur:'4.2s' },
      { y:s*.54, w:s*.8,  x:s*.02, op:.6,  anim:'wxFog1', dur:'5s'   },
      { y:s*.65, w:s*.6,  x:s*.15, op:.5,  anim:'wxFog3', dur:'3.8s' },
      { y:s*.76, w:s*.75, x:s*.05, op:.45, anim:'wxFog2', dur:'4.5s' },
    ];
    return (
      <g>
        {layers.map((l,i) => (
          <rect key={i} x={l.x} y={l.y} width={l.w} height={s*.055} rx={s*.028}
            fill={`${base}${l.op})`}
            style={{ animation:`${l.anim} ${l.dur} ease-in-out infinite ${i*.2}s` }}/>
        ))}
      </g>
    );
  };

  const SplashRings = ({ xs }) => (
    <g>
      {xs.map((x,i) => (
        <ellipse key={i} cx={x} cy={s*.9} rx={s*.08} ry={s*.03}
          fill="none" stroke="#60a5fa" strokeWidth={s*.02} opacity="0"
          style={{ animation:`wxSplash ${.65}s ease-out infinite ${[.1,.34,.21][i]||0}s` }}/>
      ))}
    </g>
  );

  // ── İkon tanımları ────────────────────────────────────────────────
  const CL  = 'rgba(185,210,232,.88)';   // açık bulut
  const CM  = 'rgba(100,135,160,.92)';   // orta bulut
  const CDK = 'rgba(42,58,76,.95)';      // koyu bulut
  const CNK = 'rgba(28,40,55,.95)';      // gece koyu bulut

  const icons = {
    // ── GÜNEŞLILER ──
    'sunny': (
      <Sun/>
    ),
    'partly': (
      <>
        <g style={{ animation:`wxBob 3s ease-in-out infinite` }}>
          <Sun cx={s*.65} cy={s*.3} rs={s*.15}/>
        </g>
        <Cloud x={s*.03} y={s*.5} w={s*.85} fill={CL}/>
      </>
    ),
    'cloudy': (
      <>
        <Cloud x={s*.05} y={s*.28} w={s*.82} fill={CM} op={.55}/>
        <Cloud x={0}     y={s*.48} w={s*.98} fill={CL}/>
      </>
    ),

    // ── SİS: katmanlı yatay şeritler, farklı hızda ──
    'fog': (
      <>
        <circle cx={s*.5} cy={s*.12} r={s*.1} fill="#fde68a" opacity=".1"/>
        <FogLayers/>
      </>
    ),

    // ── ÇİSELEME: 3 ince nokta, yavaş, soluk, açık bulut ──
    'drizzle': (
      <>
        <Cloud x={0} y={s*.3} w={s*.98} fill={CL} op={.8}/>
        <RainLines xs={[s*.25,s*.5,s*.74]} color="#93c5fd" sw={s*.03} len={s*.16} anim="wxDrizzle" dur="2.8s" delays={[0,.9,1.7]}/>
      </>
    ),

    // ── YAĞMUR: 4 orta çizgi, düzenli, orta bulut ──
    'rain': (
      <>
        <Cloud x={0} y={s*.28} w={s*.98} fill={CM}/>
        <RainLines xs={[s*.18,s*.34,s*.54,s*.72]} color="#3b82f6" sw={s*.045} len={s*.28} anim="wxRain" dur="1.2s" delays={[0,.3,.6,.15]}/>
      </>
    ),

    // ── SAĞANAK: 5 kalın eğimli çizgi, hızlı, koyu bulut + çarpma ──
    'shower': (
      <>
        <Cloud x={0} y={s*.22} w={s*.98} fill={CDK}/>
        <Cloud x={s*.05} y={s*.36} w={s*.85} fill={CDK} op={.6}/>
        <RainLines xs={[s*.12,s*.26,s*.42,s*.58,s*.74]} color="#1d4ed8" sw={s*.06} len={s*.34} anim="wxShower" dur=".65s" delays={[0,.13,.26,.07,.2]}/>
        <SplashRings xs={[s*.14,s*.44,s*.74]}/>
      </>
    ),

    // ── KARLI: 3 küçük tanecik, yavaş, açık bulut ──
    'snow': (
      <>
        <Cloud x={0} y={s*.3} w={s*.98} fill={CL} op={.85}/>
        <SnowFlakes xs={[s*.22,s*.5,s*.76]} fontSize={s*.28} anim="wxSnow" dur="2.4s" delays={[0,.8,1.6]}/>
      </>
    ),

    // ── YOĞUN KAR: 6 büyük tanecik, hızlı, koyu ağır bulut + birikim ──
    'heavysnow': (
      <>
        <Cloud x={0}     y={s*.2} w={s*.98} fill={CDK}/>
        <Cloud x={s*.05} y={s*.34} w={s*.85} fill={CDK} op={.65}/>
        <SnowFlakes xs={[s*.14,s*.32,s*.52,s*.72]} fontSize={s*.3} anim="wxHSnow" dur="1.3s" delays={[0,.22,.45,.11]}/>
        <SnowFlakes xs={[s*.22,s*.62]} yBase={s*.75} fontSize={s*.26} anim="wxHSnow" dur="1.3s" delays={[.33,.55]}/>
        <SnowAccum/>
      </>
    ),

    // ── FIRTINA ──
    'storm': (
      <>
        <Cloud x={0} y={s*.2} w={s*.98} fill={CDK}/>
        <RainLines xs={[s*.15,s*.72]} color="#3b82f6" sw={s*.04} len={s*.24} anim="wxRain" dur="1.1s" delays={[0,.3]}/>
        <Lightning x={s*.38} delay="0s"/>
        <Lightning x={s*.6}  delay="1.4s"/>
      </>
    ),

    // ── DOLU: yıldırım yok, 5 küçük top düz aşağı ──
    'hail': (
      <>
        <Cloud x={0} y={s*.2} w={s*.98} fill={CDK}/>
        <HailBalls xs={[s*.12,s*.28,s*.48,s*.66,s*.86]}/>
      </>
    ),
    'night-hail': (
      <>
        <Cloud x={0} y={s*.2} w={s*.98} fill={CNK}/>
        <HailBalls xs={[s*.12,s*.28,s*.48,s*.66,s*.86]}/>
      </>
    ),
    'night': (
      <>
        <Stars/>
        <Moon/>
      </>
    ),
    'night-partly': (
      <>
        <Stars/>
        <g style={{ animation:`wxBob 4s ease-in-out infinite` }}>
          <Moon cx={s*.64} cy={s*.28}/>
        </g>
        <Cloud x={s*.03} y={s*.5} w={s*.85} fill={CNK}/>
      </>
    ),
    'night-cloudy': (
      <>
        <Stars/>
        <Cloud x={s*.05} y={s*.28} w={s*.82} fill={CNK} op={.5}/>
        <Cloud x={0}     y={s*.48} w={s*.98} fill={CNK}/>
      </>
    ),
    'night-drizzle': (
      <>
        <Stars/>
        <Cloud x={0} y={s*.3} w={s*.98} fill={CNK} op={.9}/>
        <RainLines xs={[s*.25,s*.5,s*.74]} color="#93c5fd" sw={s*.03} len={s*.16} anim="wxDrizzle" dur="2.8s" delays={[0,.9,1.7]}/>
      </>
    ),
    'night-rain': (
      <>
        <Cloud x={0} y={s*.28} w={s*.98} fill={CNK}/>
        <RainLines xs={[s*.18,s*.34,s*.54,s*.72]} color="#3b82f6" sw={s*.045} len={s*.28} anim="wxRain" dur="1.2s" delays={[0,.3,.6,.15]}/>
      </>
    ),
    'night-shower': (
      <>
        <Cloud x={0}     y={s*.22} w={s*.98} fill={CNK}/>
        <Cloud x={s*.05} y={s*.36} w={s*.85} fill={CNK} op={.6}/>
        <RainLines xs={[s*.12,s*.26,s*.42,s*.58,s*.74]} color="#1d4ed8" sw={s*.06} len={s*.34} anim="wxShower" dur=".65s" delays={[0,.13,.26,.07,.2]}/>
        <SplashRings xs={[s*.14,s*.44,s*.74]}/>
      </>
    ),
    'night-snow': (
      <>
        <Stars/>
        <Cloud x={0} y={s*.3} w={s*.98} fill={CNK} op={.9}/>
        <SnowFlakes xs={[s*.22,s*.5,s*.76]} fontSize={s*.28} anim="wxSnow" dur="2.4s" delays={[0,.8,1.6]}/>
      </>
    ),
    'night-storm': (
      <>
        <Cloud x={0} y={s*.2} w={s*.98} fill={CNK}/>
        <RainLines xs={[s*.15,s*.72]} color="#3b82f6" sw={s*.04} len={s*.24} anim="wxRain" dur="1.1s" delays={[0,.3]}/>
        <Lightning x={s*.38} delay="0s"/>
        <Lightning x={s*.6}  delay="1.4s"/>
      </>
    ),
  };

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} style={{ overflow:'visible', flexShrink:0 }}>
      <defs>
        <style>{css}</style>
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
  const { db, setDb } = useStore();
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

      // Akıllı bilgi şeridi için hava durumu özetini Firestore'a yaz (db.wx)
      const c = json.current || {};
      setDb({ ...db, wx: { temp: c.temperature_2m, uv: c.uv_index, code: c.weather_code, city: city.name, ts: Date.now() } });
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
              const alerts = buildWeatherAlerts(data);
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
              alerts={buildWeatherAlerts(data)}
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
