import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';

const app = initializeApp({
  apiKey: "AIzaSyAgdKifZBSTjf-IS76NpmR40BuDPQ1BXNA",
  authDomain: "veritoplama-919919.firebaseapp.com",
  projectId: "veritoplama-919919",
  storageBucket: "veritoplama-919919.firebasestorage.app",
  messagingSenderId: "586804494080",
  appId: "1:586804494080:web:57e869a02c5a26b55e3de5"
});

export const auth = getAuth(app);
export const fsdb = getFirestore(app);

export { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, doc, setDoc, getDoc, onSnapshot };

export const SK = 'gn_db';

export async function loadFromFirestore(uid) {
  try {
    const ref = doc(fsdb, 'users', uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const d = snap.data();
      if (d.main) localStorage.setItem('gn_db', JSON.stringify(d.main));
      if (d.gn_notes) localStorage.setItem('gn_notes', JSON.stringify(d.gn_notes));
      if (d.gn_todos) localStorage.setItem('gn_todos', JSON.stringify(d.gn_todos));
      if (d.gn_chains) localStorage.setItem('gn_chains', JSON.stringify(d.gn_chains));
      if (d.gn_sw_log) localStorage.setItem('gn_sw_log', JSON.stringify(d.gn_sw_log));
      if (d.gn_sw_elapsed !== undefined) localStorage.setItem('gn_sw_elapsed', String(d.gn_sw_elapsed));
      if (d.gn_widget_sizes) localStorage.setItem('gn_widget_sizes', JSON.stringify(d.gn_widget_sizes));
      if (d.gn_widget_positions) localStorage.setItem('gn_widget_positions', JSON.stringify(d.gn_widget_positions));
      if (d.gn_wx_cities) localStorage.setItem('gn_wx_cities', JSON.stringify(d.gn_wx_cities));
      // eski key göç
      if (!d.main && d.gunlugum_v3) localStorage.setItem('gn_db', JSON.stringify(d.gunlugum_v3));
      if (!d.gn_sw_log && d.sw_log) localStorage.setItem('gn_sw_log', JSON.stringify(d.sw_log));
    }
  } catch(e) { console.error('Firestore yükleme hatası:', e); }
}

export async function saveToFirestore(uid, data) {
  try {
    const ref = doc(fsdb, 'users', uid);
    await setDoc(ref, data, { merge: true });
  } catch(e) { console.error('Firestore kayıt hatası:', e); }
}

// ──────────────────────────────────────────────────────────────────
// Geriye dönük uyumluluk: index.html'deki eski CDN script'i bu window.*
// global'larını tanımlıyordu (Sidebar.jsx, App.jsx LoginScreen, FloatingAi.jsx,
// Ai.jsx, FinanceInvestments.jsx, Radar.jsx, financeStore.js bunları kullanıyor).
// CDN script'i kaldırıldığı için aynı global'ları burada — tek (bundle'lı)
// Firebase örneğiyle — tanımlıyoruz. Bu sayede o dosyalarda hiçbir değişiklik
// gerekmiyor.
// ──────────────────────────────────────────────────────────────────
window._fbAuth = auth;
window._fbDb = fsdb;
window._fbDoc = doc;
window._fbSetDoc = setDoc;
window._fbGetDoc = getDoc;
window._fbOnSnapshot = onSnapshot;
window._fbSignOut = signOut;
window._fbSignInWithEmailAndPassword = signInWithEmailAndPassword;
window._fbCreateUserWithEmailAndPassword = createUserWithEmailAndPassword;
window._fbGoogleAuthProvider = GoogleAuthProvider;
window._fbSignInWithPopup = signInWithPopup;
window._fbOnAuthStateChanged = onAuthStateChanged;

window.loadFromFirestore = loadFromFirestore;

window.saveToFirestore = async function() {
  if (!window._fbUser) return;
  try {
    const ref = doc(fsdb, 'users', window._fbUser.uid);
    await setDoc(ref, {
      main: JSON.parse(localStorage.getItem('gn_db') || '{}'),
      gn_notes: JSON.parse(localStorage.getItem('gn_notes') || '{}'),
      gn_todos: JSON.parse(localStorage.getItem('gn_todos') || '{}'),
      gn_chains: JSON.parse(localStorage.getItem('gn_chains') || '[]'),
      gn_wl: JSON.parse(localStorage.getItem('gn_wl') || '[]'),
      gn_rl: JSON.parse(localStorage.getItem('gn_rl') || '[]'),
      gn_sw_log: JSON.parse(localStorage.getItem('gn_sw_log') || '[]'),
      gn_wx_cities: JSON.parse(localStorage.getItem('gn_wx_cities') || '[]'),
    }, { merge: true });
  } catch(e) { console.error('Firestore kayıt:', e); }
};

window.loadApiKey = async function() {
  if (window.ANTHROPIC_KEY) return;
  try {
    const snap = await getDoc(doc(fsdb, 'config', 'app'));
    if (snap.exists()) window.ANTHROPIC_KEY = snap.data().anthropicKey || '';
  } catch(e) {}
};
