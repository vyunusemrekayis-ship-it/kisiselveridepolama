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

export const SK = 'gunlugum_v3';

export async function loadFromFirestore(uid) {
  try {
    const ref = doc(fsdb, 'users', uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const d = snap.data();
      if (d.main) localStorage.setItem(SK, JSON.stringify(d.main));
      if (d.notes) localStorage.setItem('gn_notes', JSON.stringify(d.notes));
      if (d.todos) localStorage.setItem('gn_todos', JSON.stringify(d.todos));
      if (d.chains) localStorage.setItem('gn_chains', JSON.stringify(d.chains));
      if (d.wl) localStorage.setItem('gn_wl', JSON.stringify(d.wl));
      if (d.rl) localStorage.setItem('gn_rl', JSON.stringify(d.rl));
      if (d.sw_log) localStorage.setItem('gn_sw_log', JSON.stringify(d.sw_log));
    }
  } catch(e) { console.error('Firestore yükleme hatası:', e); }
}

export async function saveToFirestore(uid, data) {
  try {
    const ref = doc(fsdb, 'users', uid);
    await setDoc(ref, data, { merge: true });
  } catch(e) { console.error('Firestore kayıt hatası:', e); }
}
