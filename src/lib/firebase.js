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
