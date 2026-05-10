
// ── FIREBASE ──────────────────────────────────────────────────────
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAgdKifZBSTjf-IS76NpmR40BuDPQ1BXNA",
  authDomain: "veritoplama-919919.firebaseapp.com",
  projectId: "veritoplama-919919",
  storageBucket: "veritoplama-919919.firebasestorage.app",
  messagingSenderId: "586804494080",
  appId: "1:586804494080:web:57e869a02c5a26b55e3de5"
};

// Firebase SDK'yı CDN'den yükle
const fbScript = document.createElement('script');
fbScript.type = 'module';
fbScript.textContent = `
  import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
  import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
  import { getFirestore, doc, setDoc, getDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

  const app = initializeApp(${JSON.stringify(FIREBASE_CONFIG)});
  const auth = getAuth(app);
  const fsdb = getFirestore(app);
  const provider = new GoogleAuthProvider();

  window._fbAuth = auth;
  window._fbDb = fsdb;
  window._fbDoc = doc;
  window._fbSetDoc = setDoc;
  window._fbGetDoc = getDoc;
  window._fbOnSnapshot = onSnapshot;
  window._fbSignOut = signOut;

  window.signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch(e) {
      const err = document.getElementById('login-error');
      err.textContent = 'Google girişi başarısız, tekrar deneyin.';
      err.style.display = 'block';
    }
  };

  window.emailSignIn = async () => {
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-password').value;
    const err = document.getElementById('login-error');
    if(!email||!pass){err.textContent='E-posta ve şifre gerekli.';err.style.display='block';return;}
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      err.style.display='none';
    } catch(e) {
      err.textContent = 'Hatalı e-posta veya şifre.';
      err.style.display='block';
    }
  };

  window.emailSignUp = async () => {
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-password').value;
    const err = document.getElementById('login-error');
    if(!email||!pass){err.textContent='E-posta ve şifre gerekli.';err.style.display='block';return;}
    if(pass.length < 6){err.textContent='Şifre en az 6 karakter olmalı.';err.style.display='block';return;}
    try {
      await createUserWithEmailAndPassword(auth, email, pass);
      err.style.display='none';
    } catch(e) {
      err.textContent = 'Bu e-posta zaten kayıtlı veya geçersiz.';
      err.style.display='block';
    }
  };

  onAuthStateChanged(auth, async (user) => {
    document.getElementById('loading-screen').style.display='none';
    if (user) {
      window._fbUser = user;
      document.getElementById('login-screen').style.display = 'none';
      document.getElementById('app-wrapper').style.display = 'block';
      if(window.innerWidth<=1024){
        document.getElementById('mobile-topbar').style.cssText += ';display:flex!important';
      }
      const emailEl=document.getElementById('mobile-user-email');
      if(emailEl)emailEl.textContent=user.email||'';
      // API key'i yükle
      await window.loadApiKey();
      // Firestore'dan veriyi çek
      await window.loadFromFirestore(user.uid);
      // Gerçek zamanlı senkronizasyon
      window.setupSync(user.uid);
      if(window._appInit)window._appInit();
    } else {
      window._fbUser = null;
      document.getElementById('login-screen').style.display = 'flex';
      document.getElementById('app-wrapper').style.display = 'none';
    }
  });
`;
document.head.appendChild(fbScript);
const SK='gunlugum_v3';
let db=(function(){
  try{
    const v3=localStorage.getItem(SK);
    if(v3)return JSON.parse(v3);
    return{f:[],b:[],g:[],e:[]};
  }catch(x){return{f:[],b:[],g:[],e:[]};}
})();

// Firebase Firestore sync
let _syncUnsub=null;
window.loadFromFirestore=async function(uid){
  try{
    const ref=window._fbDoc(window._fbDb,'users',uid);
    const snap=await window._fbGetDoc(ref);
    if(snap.exists()){
      const d=snap.data();
      if(d.main){db=d.main;localStorage.setItem(SK,JSON.stringify(db));}
      if(d.notes)localStorage.setItem('gn_notes',JSON.stringify(d.notes));
      if(d.todos)localStorage.setItem('gn_todos',JSON.stringify(d.todos));
      if(d.chains)localStorage.setItem('gn_chains',JSON.stringify(d.chains));
      if(d.wl)localStorage.setItem('gn_wl',JSON.stringify(d.wl));
      if(d.rl)localStorage.setItem('gn_rl',JSON.stringify(d.rl));
      if(d.sw_log)localStorage.setItem('gn_sw_log',JSON.stringify(d.sw_log));
    }
    renderAll();updateBadges();
  }catch(e){console.error('Firestore yükleme:',e);}
};
window.setupSync=function(uid){
  if(_syncUnsub)_syncUnsub();
  const ref=window._fbDoc(window._fbDb,'users',uid);
  _syncUnsub=window._fbOnSnapshot(ref,(snap)=>{
    if(snap.exists()&&!snap.metadata.hasPendingWrites){
      const d=snap.data();
      if(d.main){db=d.main;localStorage.setItem(SK,JSON.stringify(db));}
      if(d.notes)localStorage.setItem('gn_notes',JSON.stringify(d.notes));
      if(d.todos)localStorage.setItem('gn_todos',JSON.stringify(d.todos));
      if(d.chains)localStorage.setItem('gn_chains',JSON.stringify(d.chains));
      if(d.wl)localStorage.setItem('gn_wl',JSON.stringify(d.wl));
      if(d.rl)localStorage.setItem('gn_rl',JSON.stringify(d.rl));
      if(d.sw_log)localStorage.setItem('gn_sw_log',JSON.stringify(d.sw_log));
      renderAll();updateBadges();
    }
  });
};
window.saveToFirestore=async function(){
  if(!window._fbUser)return;
  try{
    const ref=window._fbDoc(window._fbDb,'users',window._fbUser.uid);
    await window._fbSetDoc(ref,{
      main:db,
      notes:JSON.parse(localStorage.getItem('gn_notes')||'{}'),
      todos:JSON.parse(localStorage.getItem('gn_todos')||'{}'),
      chains:JSON.parse(localStorage.getItem('gn_chains')||'[]'),
      wl:JSON.parse(localStorage.getItem('gn_wl')||'[]'),
      rl:JSON.parse(localStorage.getItem('gn_rl')||'[]'),
      sw_log:JSON.parse(localStorage.getItem('gn_sw_log')||'[]'),
    });
  }catch(e){console.error('Firestore kayıt:',e);}
};


// COMMON.JS

function esc(s){if(!s)return'';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}

function todayStr(){const n=new Date();return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0')}

function v(id){const el=document.getElementById(id);return el?el.value:''}

function set(id,val){const el=document.getElementById(id);if(el)el.value=val}

function moodColor(m){return{'Harika':'#237F52','İyi':'#3d7a5a','Normal':'#b07a40','Kötü':'#b05a30','Berbat':'#c0392b'}[m]||'#888'}
const TR_M=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const TR_D=['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];

// NAV
const titles={home:'Giriş',chain:'Zincir Kırma',clock:'Saat & Kronometre',calendar:'Takvim',films:'Filmler',books:'Kitaplar',goals:'Hedefler'};



function toggleForm(id){const f=document.getElementById(id);f.style.display=f.style.display==='none'?'block':'none'}

function switchGTab(p,btn){
  document.querySelectorAll('.g-tab').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.g-tab-content').forEach(c=>c.classList.remove('active'));
  btn.classList.add('active');document.getElementById('gt-'+p).classList.add('active');
}

function navWidget(id){
  const navItem=document.querySelector(`.nav-item[onclick*="'${id}'"]`);
  if(navItem)navItem.click();
}

function toggleSidebar(){
  const sb=document.getElementById('sidebar');
  sb.classList.toggle('collapsed');
  document.getElementById('main-content').classList.toggle('expanded');
  const collapsed=sb.classList.contains('collapsed');
  const hw=document.getElementById('home-bg');
  if(hw)hw.style.left=collapsed?'58px':'220px';
}

// BADGES

function updateBadges(){
  document.getElementById('nb-film').textContent=db.f.length;
  document.getElementById('nb-book').textContent=db.b.length;
  document.getElementById('nb-goal').textContent=db.g.length;
  
  const fc=document.getElementById('film-counter');if(fc)fc.textContent=db.f.length;
  const bc=document.getElementById('book-counter');if(bc)bc.textContent=db.b.length;
}

// THEME

function doSignOut(){
  if(!confirm('Çıkış yapmak istediğinize emin misiniz?'))return;
  if(window._fbSignOut&&window._fbAuth)window._fbSignOut(window._fbAuth);
}

// MOBİL DRAWER

function toggleDrawer(){
  const drawer=document.getElementById('mobile-drawer');
  const overlay=document.getElementById('mobile-overlay');
  const isOpen=drawer.getAttribute('data-open')==='1';
  if(isOpen){closeDrawer();}
  else{
    drawer.style.display='flex';
    drawer.style.flexDirection='column';
    overlay.style.display='block';
    drawer.setAttribute('data-open','1');
    setTimeout(()=>{drawer.style.transform='translateX(0)';overlay.style.opacity='1';},10);
  }
}

function closeDrawer(){
  const drawer=document.getElementById('mobile-drawer');
  const overlay=document.getElementById('mobile-overlay');
  drawer.style.transform='translateX(-100%)';
  overlay.style.opacity='0';
  drawer.setAttribute('data-open','0');
  setTimeout(()=>{drawer.style.display='none';overlay.style.display='none';},250);
}

function mobileNav(id,title){
  // Desktop nav'ı da tetikle
  const navItem=document.querySelector(`.nav-item[onclick*="'${id}'"]`);
  if(navItem)navItem.click();
  else{
    document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
    const sec=document.getElementById('section-'+id);
    if(sec)sec.classList.add('active');
    if(id==='calendar')renderCal();
    if(id==='chain')setTimeout(renderChains,0);
    if(id==='films')switchFilmTab('watched',document.getElementById('ftab-watched'));
    if(id==='books')switchBookTab('read',document.getElementById('btab-read'));
  }
  // Başlık güncelle
  const titleEl=document.getElementById('mobile-page-title');
  if(titleEl)titleEl.textContent=title;
  // Aktif item güncelle
  document.querySelectorAll('.m-nav-item').forEach(i=>i.classList.remove('active'));
  event.currentTarget.classList.add('active');
  closeDrawer();
}



// RENDER

function renderAll(){renderFilms();renderBooks();renderGoals();renderWatchlist();renderReadlist();renderChains();renderHomeWidgets();}

const OMDB_KEY='97eb66bc';
const posterCache={};

function del(arr,i){if(!confirm('Silinsin mi?'))return;const a={'f':db.f,'b':db.b,'g':db.g,'e':db.e}[arr];if(a){a.splice(i,1);save()}}

function save(){localStorage.setItem(SK,JSON.stringify(db));renderAll();updateBadges();window.saveToFirestore&&window.saveToFirestore();}

async function waitForFirebase(timeout=5000){
  const start=Date.now();
  while(!window._fbDoc||!window._fbDb){
    if(Date.now()-start>timeout)throw new Error('Firebase hazır olmadı');
    await new Promise(r=>setTimeout(r,100));
  }
}
window.loadApiKey=async function(){
  if(window.ANTHROPIC_KEY)return;
  try{
    await waitForFirebase();
    const ref=window._fbDoc(window._fbDb,'config','app');
    const snap=await window._fbGetDoc(ref);
    if(snap.exists())window.ANTHROPIC_KEY=snap.data().anthropicKey||'';
  }catch(e){console.error('API key yüklenemedi:',e);}
};


function fmtDate(d){if(!d)return'';const p=d.split('-');return p.length===3?p[2]+'.'+p[1]+'.'+p[0]:d}


// ── PAGE LOADER ─────────────────────────────────────────────────────
const _pageCache = {};
const _pageInits = {
  home: () => { initHome(); },
  calendar: () => { renderCal(); },
  clock: () => {},
  films: () => { renderFilms(); renderWatchlist(); },
  books: () => { renderBooks(); renderReadlist(); },
  goals: () => { renderGoals(); },
  chain: () => { renderChains(); },
};
const _pageCss = {
  home: ['css/home.css'],
  films: ['css/films.css'],
  books: ['css/books.css'],
  goals: ['css/goals.css'],
  calendar: ['css/calendar.css'],
  clock: ['css/clock.css'],
  chain: ['css/chain.css'],
};
let _currentPage = null;

async function loadPage(pageId) {
  if (_currentPage === pageId) return;
  _currentPage = pageId;

  // Sidebar active güncelle
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`.nav-item[onclick*="'${pageId}'"]`)?.classList.add('active');

  // Sayfayı yükle
  const container = document.getElementById('page-container');
  if (!container) return;

  if (_pageCache[pageId]) {
    container.innerHTML = _pageCache[pageId];
  } else {
    try {
      const res = await fetch(`pages/${pageId}/${pageId}.html`);
      const html = await res.text();
      _pageCache[pageId] = html;
      container.innerHTML = html;
    } catch(e) {
      container.innerHTML = `<div style="padding:40px;color:var(--muted)">Sayfa yüklenemedi: ${pageId}</div>`;
      return;
    }
  }

  // Init fonksiyonunu çağır
  if (_pageInits[pageId]) _pageInits[pageId]();

  // Home için özel
  const hw = document.getElementById('home-bg');
  const sb = document.getElementById('sidebar');
  if (hw && sb) hw.style.left = sb.classList.contains('collapsed') ? '58px' : '220px';
}

function nav(id, el) {
  if (el) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    el.classList.add('active');
  }
  loadPage(id);
}

// ── INIT ─────────────────────────────────────────────────────────────
window._appInit = function() {
  loadPage('home');
  tickClock();
  setInterval(tickClock, 100);
  const _sb = document.getElementById('sidebar');
  const _hw = document.getElementById('home-bg');
  if(_sb && _hw) _hw.style.left = _sb.classList.contains('collapsed') ? '58px' : '220px';
  swRender(); swRenderLog();
  if(swElapsed > 0) {
    const f = swFmt(swElapsed);
    const sv = document.getElementById('sw-saved');
    if(sv) sv.textContent = 'Kaydedildi: ' + f.main;
    const btn = document.getElementById('sw-btn');
    if(btn) btn.textContent = 'Devam Et';
  }
  updateBadges();
};
