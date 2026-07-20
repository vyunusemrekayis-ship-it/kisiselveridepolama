// KONUM: src/lib/WxIcon.jsx (mevcut dosyanın TAMAMININ yerine geçer)

export function WxIcon({ bg, size = 20 }) {
  const s = size;

  const css = `
    @keyframes wxSpin { to { transform:rotate(360deg); } }
    @keyframes wxTwinkle { 0%,100%{opacity:1;} 50%{opacity:.25;} }
    @keyframes wxDrift { 0%,100%{transform:translateX(0);} 50%{transform:translateX(${s*.03}px);} }
    @keyframes wxBob { 0%,100%{transform:translateY(0);} 50%{transform:translateY(${-s*.03}px);} }
    @keyframes wxRain { 0%{opacity:0;transform:translateY(${-s*.05}px);} 40%{opacity:1;} 100%{opacity:0;transform:translateY(${s*.22}px);} }
    @keyframes wxDrizzle { 0%{opacity:0;transform:translateY(${-s*.04}px);} 40%{opacity:.8;} 100%{opacity:0;transform:translateY(${s*.14}px);} }
    @keyframes wxShower { 0%{opacity:0;transform:translateY(${-s*.05}px) translateX(${-s*.02}px);} 35%{opacity:1;} 100%{opacity:0;transform:translateY(${s*.28}px) translateX(${s*.04}px);} }
    @keyframes wxSnow { 0%{opacity:0;transform:translateY(${-s*.04}px) rotate(0deg);} 40%{opacity:1;} 100%{opacity:0;transform:translateY(${s*.24}px) rotate(90deg);} }
    @keyframes wxHail { 0%{opacity:0;transform:translateY(${-s*.05}px);} 35%{opacity:1;} 100%{opacity:0;transform:translateY(${s*.3}px);} }
    @keyframes wxBolt { 0%,100%{opacity:.4;} 45%{opacity:1;} 55%{opacity:1;} 60%{opacity:.4;} }
    @keyframes wxFog1 { 0%,100%{transform:translateX(0);opacity:.55;} 50%{transform:translateX(${s*.06}px);opacity:.75;} }
    @keyframes wxFog2 { 0%,100%{transform:translateX(0);opacity:.65;} 50%{transform:translateX(${-s*.05}px);opacity:.4;} }
    @keyframes wxFog3 { 0%,100%{transform:translateX(0);opacity:.5;} 50%{transform:translateX(${s*.04}px);opacity:.7;} }
    @keyframes wxSplash { 0%{opacity:.8;transform:scale(.4);} 100%{opacity:0;transform:scale(1.3);} }
  `;

  const Sun = ({ cx = s*.5, cy = s*.45, rs = s*.18 }) => (
    <g style={{ animation:'wxSpin 12s linear infinite', transformOrigin:`${cx}px ${cy}px` }}>
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

  const Moon = ({ cx = s*.52, cy = s*.44 }) => (
    <g>
      <circle cx={cx} cy={cy} r={s*.2} fill="#fef3c7"/>
      <circle cx={cx+s*.11} cy={cy-s*.07} r={s*.16} fill="#14161c"/>
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

  const Cloud = ({ x = 0, y = s*.38, w = s*.9, fill = 'rgba(185,210,232,.88)', op = 1 }) => {
    const ch = w*.38;
    return (
      <g opacity={op} style={{ animation:'wxDrift 5s ease-in-out infinite' }}>
        <ellipse cx={x+w*.25} cy={y} rx={w*.17} ry={ch*.55} fill={fill}/>
        <ellipse cx={x+w*.48} cy={y-ch*.18} rx={w*.24} ry={ch*.68} fill={fill}/>
        <ellipse cx={x+w*.72} cy={y} rx={w*.17} ry={ch*.5} fill={fill}/>
        <rect x={x+w*.08} y={y} width={w*.84} height={ch*.52} fill={fill}/>
      </g>
    );
  };

  const RainLines = ({ xs, color='#3b82f6', sw=1.8, len=s*.28, anim='wxRain', dur='1.2s', delays=[0,.3,.6,.15] }) => (
    <g>
      {xs.map((x,i) => (
        <line key={i} x1={x} y1={s*.58} x2={x-len*.15} y2={s*.58+len}
          stroke={color} strokeWidth={sw} strokeLinecap="round" opacity="0"
          style={{ animation:`${anim} ${dur} ease-in infinite ${delays[i]||0}s` }}/>
      ))}
    </g>
  );

  const SnowFlakes = ({ xs, yBase=s*.62, fontSize=s*.28, anim='wxSnow', dur='2.4s', delays=[0,.8,1.6,.3] }) => (
    <g>
      {xs.map((x,i) => (
        <text key={i} x={x} y={yBase+(i%2)*s*.08} fontSize={fontSize}
          fill="#bae6fd" textAnchor="middle" opacity="0"
          style={{ animation:`${anim} ${dur} ease-in-out infinite ${delays[i]||0}s` }}>*</text>
      ))}
    </g>
  );

  const Lightning = ({ x = s*.46, y = s*.6, delay = '0s' }) => (
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

  const FogLayers = ({ dark = false }) => {
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
          style={{ animation:`wxSplash .65s ease-out infinite ${[.1,.34,.21][i]||0}s` }}/>
      ))}
    </g>
  );

  const CL  = 'rgba(185,210,232,.88)';
  const CM  = 'rgba(100,135,160,.92)';
  const CDK = 'rgba(42,58,76,.95)';
  const CNK = 'rgba(28,40,55,.95)';

  const icons = {
    sunny: <Sun/>,
    partly: (<><g style={{ animation:'wxBob 3s ease-in-out infinite' }}><Sun cx={s*.65} cy={s*.3} rs={s*.15}/></g><Cloud x={s*.03} y={s*.5} w={s*.85} fill={CL}/></>),
    cloudy: (<><Cloud x={s*.05} y={s*.28} w={s*.82} fill={CM} op={.55}/><Cloud x={0} y={s*.48} w={s*.98} fill={CL}/></>),
    fog: (<><circle cx={s*.5} cy={s*.12} r={s*.1} fill="#fde68a" opacity=".1"/><FogLayers/></>),
    drizzle: (<><Cloud x={0} y={s*.3} w={s*.98} fill={CL} op={.8}/><RainLines xs={[s*.25,s*.5,s*.74]} color="#93c5fd" sw={s*.03} len={s*.16} anim="wxDrizzle" dur="2.8s" delays={[0,.9,1.7]}/></>),
    rain: (<><Cloud x={0} y={s*.28} w={s*.98} fill={CM}/><RainLines xs={[s*.18,s*.34,s*.54,s*.72]} color="#3b82f6" sw={s*.045} len={s*.28} anim="wxRain" dur="1.2s" delays={[0,.3,.6,.15]}/></>),
    shower: (<><Cloud x={0} y={s*.22} w={s*.98} fill={CDK}/><Cloud x={s*.05} y={s*.36} w={s*.85} fill={CDK} op={.6}/><RainLines xs={[s*.12,s*.26,s*.42,s*.58,s*.74]} color="#1d4ed8" sw={s*.06} len={s*.34} anim="wxShower" dur=".65s" delays={[0,.13,.26,.07,.2]}/><SplashRings xs={[s*.14,s*.44,s*.74]}/></>),
    snow: (<><Cloud x={0} y={s*.3} w={s*.98} fill={CL} op={.85}/><SnowFlakes xs={[s*.22,s*.5,s*.76]} fontSize={s*.28} anim="wxSnow" dur="2.4s" delays={[0,.8,1.6]}/></>),
    heavysnow: (<><Cloud x={0} y={s*.2} w={s*.98} fill={CDK}/><Cloud x={s*.05} y={s*.34} w={s*.85} fill={CDK} op={.65}/><SnowFlakes xs={[s*.14,s*.32,s*.52,s*.72]} fontSize={s*.3} anim="wxSnow" dur="1.3s" delays={[0,.22,.45,.11]}/></>),
    storm: (<><Cloud x={0} y={s*.2} w={s*.98} fill={CDK}/><RainLines xs={[s*.15,s*.72]} color="#3b82f6" sw={s*.04} len={s*.24} anim="wxRain" dur="1.1s" delays={[0,.3]}/><Lightning x={s*.38} delay="0s"/><Lightning x={s*.6} delay="1.4s"/></>),
    hail: (<><Cloud x={0} y={s*.2} w={s*.98} fill={CDK}/><HailBalls xs={[s*.12,s*.28,s*.48,s*.66,s*.86]}/></>),
    night: (<><Stars/><Moon/></>),
    'night-partly': (<><Stars/><g style={{ animation:'wxBob 4s ease-in-out infinite' }}><Moon cx={s*.64} cy={s*.28}/></g><Cloud x={s*.03} y={s*.5} w={s*.85} fill={CNK}/></>),
    'night-cloudy': (<><Stars/><Cloud x={s*.05} y={s*.28} w={s*.82} fill={CNK} op={.5}/><Cloud x={0} y={s*.48} w={s*.98} fill={CNK}/></>),
    'night-drizzle': (<><Stars/><Cloud x={0} y={s*.3} w={s*.98} fill={CNK} op={.9}/><RainLines xs={[s*.25,s*.5,s*.74]} color="#93c5fd" sw={s*.03} len={s*.16} anim="wxDrizzle" dur="2.8s" delays={[0,.9,1.7]}/></>),
    'night-rain': (<><Cloud x={0} y={s*.28} w={s*.98} fill={CNK}/><RainLines xs={[s*.18,s*.34,s*.54,s*.72]} color="#3b82f6" sw={s*.045} len={s*.28} anim="wxRain" dur="1.2s" delays={[0,.3,.6,.15]}/></>),
    'night-shower': (<><Cloud x={0} y={s*.22} w={s*.98} fill={CNK}/><Cloud x={s*.05} y={s*.36} w={s*.85} fill={CNK} op={.6}/><RainLines xs={[s*.12,s*.26,s*.42,s*.58,s*.74]} color="#1d4ed8" sw={s*.06} len={s*.34} anim="wxShower" dur=".65s" delays={[0,.13,.26,.07,.2]}/><SplashRings xs={[s*.14,s*.44,s*.74]}/></>),
    'night-snow': (<><Stars/><Cloud x={0} y={s*.3} w={s*.98} fill={CNK} op={.9}/><SnowFlakes xs={[s*.22,s*.5,s*.76]} fontSize={s*.28} anim="wxSnow" dur="2.4s" delays={[0,.8,1.6]}/></>),
    'night-storm': (<><Cloud x={0} y={s*.2} w={s*.98} fill={CNK}/><RainLines xs={[s*.15,s*.72]} color="#3b82f6" sw={s*.04} len={s*.24} anim="wxRain" dur="1.1s" delays={[0,.3]}/><Lightning x={s*.38} delay="0s"/><Lightning x={s*.6} delay="1.4s"/></>),
    'night-hail': (<><Cloud x={0} y={s*.2} w={s*.98} fill={CNK}/><HailBalls xs={[s*.12,s*.28,s*.48,s*.66,s*.86]}/></>),
  };

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} style={{ overflow:'visible', flexShrink:0 }}>
      <defs><style>{css}</style></defs>
      {icons[bg] || icons['cloudy']}
    </svg>
  );
}

// ── RÜZGAR PUSULASI ─────────────────────────────────────────────────
export function degToCompass(deg) {
  const dirs = ['K','KD','D','GD','G','GB','B','KB'];
  return dirs[Math.round(((deg % 360) / 45)) % 8];
}

export function WindCompass({ deg = 0, size = 18 }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" style={{ flexShrink:0 }}>
      <circle cx="12" cy="12" r="10.5" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="1.3"/>
      <text x="12" y="5.4" textAnchor="middle" fontSize="4.4" fill="rgba(255,255,255,.6)">K</text>
      <text x="12" y="21.2" textAnchor="middle" fontSize="4.4" fill="rgba(255,255,255,.5)">G</text>
      <text x="4.3" y="13.5" textAnchor="middle" fontSize="4.4" fill="rgba(255,255,255,.5)">B</text>
      <text x="19.7" y="13.5" textAnchor="middle" fontSize="4.4" fill="rgba(255,255,255,.5)">D</text>
      <g style={{ transform:`rotate(${deg}deg)`, transformOrigin:'12px 12px', transition:'transform .4s ease' }}>
        <line x1="12" y1="12" x2="12" y2="4.3" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/>
        <polygon points="12,3 9.6,7.3 14.4,7.3" fill="#fff"/>
      </g>
    </svg>
  );
}

// ── ARKA PLAN: HAVA DURUMUNA VE IŞIK SEVİYESİNE GÖRE GRADYAN ────────
const WX_BG_GRAD = {
  sunny: ['#0f3d7a','#1c5aa8','#5b96cc'],
  partly: ['#1c4d80','#2f6ba8','#6099c8'],
  cloudy: ['#2a3648','#425268','#647488'],
  fog: ['#3a4650','#5a6a74','#7a8a94'],
  drizzle: ['#1c4560','#3a6484','#4a7898'],
  rain: ['#101c2a','#1c3448','#2c4a60'],
  shower: ['#0a1420','#152a3e','#22405a'],
  snow: ['#3a4658','#5c6a78','#8492a0'],
  heavysnow: ['#2a3848','#4a5868','#6a7888'],
  storm: ['#0a0e16','#141c26','#1e2a36'],
  hail: ['#0c1018','#141c28','#1c2838'],
  night: ['#020510','#070d1c','#0c1830'],
  'night-partly': ['#020510','#070d1c','#0c1830'],
  'night-cloudy': ['#0a0e18','#141a24','#1a1e28'],
  'night-drizzle': ['#050a14','#0c1826','#142230'],
  'night-rain': ['#050a14','#0c1826','#142230'],
  'night-shower': ['#050a14','#0c1826','#142230'],
  'night-snow': ['#0c1420','#1a2c3c','#2e4658'],
  'night-storm': ['#08060e','#0e0c16','#141220'],
  'night-hail': ['#08060e','#0e0c16','#141220'],
};

export function wxBackground(bg, brightness) {
  const [c1,c2,c3] = WX_BG_GRAD[bg] || WX_BG_GRAD.cloudy;
  const darken = Math.round((1 - brightness) * 45);
  const overlay = `linear-gradient(rgba(0,0,0,${darken/100}), rgba(0,0,0,${darken/100}))`;
  return `${overlay}, linear-gradient(165deg, ${c1} 0%, ${c2} 50%, ${c3} 100%)`;
}

// ── ARKA PLANDA GERÇEK YAĞIŞ / KAR / ŞİMŞEK ─────────────────────────
export function BgPrecip({ bg }) {
  const rainCss = `@keyframes wxBgRain{0%{opacity:0;transform:translateY(-8px);}30%{opacity:.9;}100%{opacity:0;transform:translateY(115px);}}`;
  const snowCss = `@keyframes wxBgSnow{0%{opacity:0;transform:translateY(-8px);}20%{opacity:1;}100%{opacity:0;transform:translateY(115px);}}`;
  const flashCss = `@keyframes wxBgFlash{0%,100%{opacity:.14;}47%{opacity:.14;}50%{opacity:.45;}53%{opacity:.14;}}`;

  if (['drizzle','rain','shower','night-drizzle','night-rain','night-shower'].includes(bg)) {
    const dense = bg.includes('shower');
    const xs = dense ? [8,22,36,50,64,78,92] : [12,32,52,72,90];
    return (
      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%' }} preserveAspectRatio="none" viewBox="0 0 100 100">
        <defs><style>{rainCss}</style></defs>
        <g stroke="#5b9bf5" strokeWidth="1.3" strokeLinecap="round" opacity=".7">
          {xs.map((x,i) => (
            <line key={i} x1={x} y1="0" x2={x-2} y2="9"
              style={{ animation:`wxBgRain ${dense?0.7:1.1}s ease-in infinite ${(i*0.17)%1}s` }}/>
          ))}
        </g>
      </svg>
    );
  }
  if (['snow','heavysnow','night-snow'].includes(bg)) {
    const dense = bg === 'heavysnow';
    const xs = dense ? [8,22,36,50,64,78,92] : [14,38,62,86];
    return (
      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%' }} preserveAspectRatio="none" viewBox="0 0 100 100">
        <defs><style>{snowCss}</style></defs>
        <g fill="#e6f4ff" opacity=".85">
          {xs.map((x,i) => (
            <circle key={i} cx={x} cy="0" r={dense?1.6:1.3}
              style={{ animation:`wxBgSnow ${2+(i%3)*0.4}s linear infinite ${(i*0.4)%2}s` }}/>
          ))}
        </g>
      </svg>
    );
  }
  if (bg === 'storm' || bg === 'night-storm' || bg === 'hail' || bg === 'night-hail') {
    return (
      <>
        <style>{flashCss}</style>
        <div style={{ position:'absolute', inset:0, background:'rgba(180,200,240,.14)', animation:'wxBgFlash 3.2s ease-in-out infinite' }}/>
      </>
    );
  }
  return null;
}
