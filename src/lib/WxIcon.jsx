// ── CSS İKON KOMPOZİSYONU (ortak) ─────────────────────────────────────
// Weather.jsx ve Home.jsx (WeatherWidget) tarafından paylaşılan gerçek hava durumu SVG ikonu.
export function WxIcon({ bg, size = 28 }) {
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
