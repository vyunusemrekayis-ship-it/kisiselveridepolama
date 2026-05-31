import { auth, fsdb, loadFromFirestore, onAuthStateChanged, doc, onSnapshot } from "./lib/firebase";
import { useEffect, useState } from 'react';
import Layout from './components/layout/Layout';
import FloatingAi from './pages/Ai/FloatingAi';
import { useStore } from './store/useStore';

function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center gap-3" style={{ background:'#0d0f13' }}>
      <div className="font-serif text-[22px] text-accent">Günlüğüm</div>
      <div style={{ width:32, height:32, border:'2.5px solid rgba(255,255,255,.1)', borderTopColor:'#3a7bd5', borderRadius:'50%', animation:'spin .8s linear infinite' }} />
    </div>
  );
}

function LoginScreen() {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!email || !pass) return;
    setLoading(true); setError('');
    try {
      await window._fbSignInWithEmailAndPassword(window._fbAuth, email, pass);
    } catch(e) {
      setError('Giriş başarısız. E-posta veya şifre hatalı.');
      setLoading(false);
    }
  };

  const register = async () => {
    if (!email || !pass) return;
    setLoading(true); setError('');
    try {
      await window._fbCreateUserWithEmailAndPassword(window._fbAuth, email, pass);
    } catch(e) {
      setError(e.code === 'auth/email-already-in-use' ? 'Bu e-posta zaten kullanımda.' : 'Kayıt başarısız.');
      setLoading(false);
    }
  };

  const googleLogin = async () => {
    try {
      const provider = new window._fbGoogleAuthProvider();
      await window._fbSignInWithPopup(window._fbAuth, provider);
    } catch(e) { setError('Google ile giriş başarısız.'); }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ background:'rgba(13,15,19,.95)' }}>
      <div className="w-[320px] animate-slideUp">
        <div className="text-center mb-6">
          <div className="font-serif text-2xl text-accent2 mb-1">Günlüğüm</div>
          <div className="text-xs text-muted">Kişisel dijital günlük</div>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-6">
          <div className="space-y-3 mb-4">
            <input className="form-input" type="email" placeholder="E-posta" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key==='Enter' && login()} />
            <input className="form-input" type="password" placeholder="Şifre" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key==='Enter' && login()} />
          </div>
          {error && <div className="text-xs text-red-400 mb-3">{error}</div>}
          <div className="flex gap-2 mb-3">
            <button className="btn-save flex-1" onClick={login} disabled={loading}>{loading ? '...' : 'Giriş Yap'}</button>
            <button className="btn-cancel flex-1" onClick={register} disabled={loading}>Kayıt Ol</button>
          </div>
          <button onClick={googleLogin} className="w-full py-2 rounded-lg border border-border bg-transparent text-muted text-sm cursor-pointer hover:bg-surface2 transition-colors flex items-center justify-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Google ile Giriş
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { reloadDb, setUserProfile } = useStore();
  const [authState, setAuthState] = useState('loading');

  useEffect(() => {
    let unsubscribeAuth;
    let unsubscribeSnapshot;

    const waitForFirebase = () => {
      if (window._fbOnAuthStateChanged && window._fbAuth) {
        unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
          // Önceki snapshot dinleyicisini temizle
          if (unsubscribeSnapshot) { unsubscribeSnapshot(); unsubscribeSnapshot = null; }

          if (user) {
            window._fbUser = user;
            // İlk yükleme
            await loadFromFirestore(user.uid);
            reloadDb();
            const profile = { name: user.displayName || user.email };
            setUserProfile(profile);
            window._userProfile = profile;
            setAuthState('logged-in');

            // Gerçek zamanlı sync — Firestore değişince React state güncellenir
            const ref = doc(fsdb, 'users', user.uid);
            unsubscribeSnapshot = onSnapshot(ref, (snap) => {
              if (snap.exists()) {
                reloadDb(snap.data());
              }
            });
          } else {
            window._fbUser = null;
            setAuthState('logged-out');
          }
        });
      } else {
        setTimeout(waitForFirebase, 100);
      }
    };
    waitForFirebase();
    return () => { unsubscribeAuth?.(); unsubscribeSnapshot?.(); };
  }, []);

  if (authState === 'loading') return <LoadingScreen />;
  if (authState === 'logged-out') return <LoginScreen />;
  return <>
    <Layout />
    <FloatingAi />
  </>;
}
