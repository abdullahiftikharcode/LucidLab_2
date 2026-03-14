import React, { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { getAuth, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, updateProfile } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useFirebaseApp } from 'reactfire';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginPage() {
  const app = useFirebaseApp();
  const auth = getAuth(app);
  const db = getFirestore(app);
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!authLoading && currentUser) return <Navigate to="/dashboard" replace />;

  if (authLoading) {
    return (
      <div className="dark min-h-screen flex items-center justify-center bg-background-dark">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 rounded-lg flex items-center justify-center text-white skeleton-shimmer">
            <span className="material-symbols-outlined text-3xl">science</span>
          </div>
          <p className="text-slate-400 text-sm font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  async function handleGoogleSSO() {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || '',
          role: 'instructor',
          institution: '',
          classroomIds: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      navigate('/dashboard');
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        // User closed the popup, not a real error
      } else {
        setError(err.message || 'Failed to sign in with Google.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      // Sync displayName from Firestore to Auth so TopBar shows correct initials immediately
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const firestoreName = data?.displayName?.trim?.();
        if (firestoreName && !user.displayName) {
          await updateProfile(user, { displayName: firestoreName });
        }
      }
      navigate('/dashboard');
    } catch (err: any) {
      const code = err.code || '';
      if (code === 'auth/wrong-password' || code === 'auth/user-not-found' || code === 'auth/invalid-credential' || code === 'auth/invalid-login-credentials') {
        setError('Invalid email or password. Please check your credentials and try again.');
      } else if (code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (code === 'auth/user-disabled') {
        setError('This account has been disabled. Please contact support.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please wait a moment and try again.');
      } else if (code === 'auth/network-request-failed') {
        setError('Network error. Please check your internet connection.');
      } else {
        setError('Something went wrong. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dark bg-background-dark font-display text-slate-100 min-h-screen flex flex-col bg-mesh"
      style={{
        fontFamily: "'Inter', sans-serif",
        backgroundImage: 'radial-gradient(at 0% 0%, rgba(36, 99, 235, 0.15) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(36, 99, 235, 0.1) 0px, transparent 50%)',
      }}
    >
      {/* Header */}
      <header className="w-full px-6 lg:px-20 py-6 flex items-center justify-between z-50">
        <div className="flex items-center gap-3">
          <div className="bg-primary p-2 rounded-lg">
            <span className="material-symbols-outlined text-white text-2xl">science</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">LucidLab</h2>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden md:inline text-slate-400 text-sm">Don&apos;t have an account?</span>
          <Link to="/register" className="px-5 py-2 text-sm font-semibold text-primary border border-primary/30 rounded-lg hover:bg-primary/10 transition-colors">
            Request Access
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12 relative overflow-hidden">
        {/* Background glows */}
        <div className="absolute top-1/4 -left-20 w-64 h-64 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="w-full max-w-5xl flex flex-col lg:flex-row items-center gap-12 z-10">
          {/* Left Side illustration */}
          <div className="hidden lg:flex flex-col flex-1 space-y-8">
            <div className="space-y-4">
              <span className="px-4 py-1.5 bg-primary/20 text-primary text-xs font-bold uppercase tracking-widest rounded-full inline-block">New Era of Education</span>
              <h1 className="text-5xl font-extrabold leading-tight text-white">
                Welcome back to <br />
                <span className="text-primary">the Studio</span>
              </h1>
              <p className="text-lg text-slate-400 max-w-md">
                Continue building immersive 3D lessons for your students. The future of interactive learning is in your hands.
              </p>
            </div>
            <div className="relative w-full aspect-square max-w-sm">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent rounded-3xl transform rotate-3" />
              <div className="absolute inset-0 rounded-3xl flex items-center justify-center p-8 overflow-hidden border border-white/10"
                style={{ background: 'rgba(26, 34, 51, 0.7)', backdropFilter: 'blur(12px)' }}>
                <div className="relative w-full h-full flex items-center justify-center">
                  <div className="absolute w-48 h-48 border-2 border-primary/40 border-dashed rounded-full" style={{ animation: 'spin 20s linear infinite' }} />
                  <div className="absolute w-32 h-32 border border-primary/60 rounded-xl transform rotate-45" />
                  <span className="material-symbols-outlined text-primary opacity-80" style={{ fontSize: '7rem' }}>deployed_code</span>
                  <div className="absolute top-4 left-4 px-3 py-2 rounded-lg flex items-center gap-2 border border-white/10"
                    style={{ background: 'rgba(26, 34, 51, 0.7)', backdropFilter: 'blur(12px)' }}>
                    <span className="material-symbols-outlined text-primary text-sm">lightbulb</span>
                    <span className="text-[10px] font-bold">INTERACTIVE</span>
                  </div>
                  <div className="absolute bottom-10 right-0 px-3 py-2 rounded-lg flex items-center gap-2 border border-white/10"
                    style={{ background: 'rgba(26, 34, 51, 0.7)', backdropFilter: 'blur(12px)' }}>
                    <span className="material-symbols-outlined text-green-400 text-sm">check_circle</span>
                    <span className="text-[10px] font-bold">READY TO DEPLOY</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Login Card */}
          <div className="w-full max-w-md">
            <div className="p-8 lg:p-10 rounded-3xl shadow-2xl space-y-8 border border-white/10"
              style={{ background: 'rgba(26, 34, 51, 0.7)', backdropFilter: 'blur(12px)' }}>
              <div className="text-center lg:text-left space-y-2">
                <h3 className="text-2xl font-bold text-white">Sign In</h3>
                <p className="text-slate-400">Enter your credentials to access your studio</p>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-center gap-3">
                  <span className="material-symbols-outlined text-red-400 text-sm">error</span>
                  <p className="text-xs text-red-300 font-medium">{error}</p>
                </div>
              )}

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-4">
                  {/* Email */}
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1 mb-1 block" htmlFor="email">Email Address</label>
                    <div className="flex items-center bg-slate-800/50 border border-slate-700/50 rounded-xl focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all px-4">
                      <span className="material-symbols-outlined text-slate-400 text-xl">mail</span>
                      <input
                        id="email"
                        className="w-full bg-transparent border-none focus:ring-0 text-white py-4 placeholder:text-slate-500 outline-none"
                        placeholder="name@lucidlab.com"
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1 mb-1 block" htmlFor="password">Password</label>
                      <a className="text-xs text-primary hover:underline mb-1 mr-1" href="#">Forgot password?</a>
                    </div>
                    <div className="flex items-center bg-slate-800/50 border border-slate-700/50 rounded-xl focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all px-4">
                      <span className="material-symbols-outlined text-slate-400 text-xl">lock</span>
                      <input
                        id="password"
                        className="w-full bg-transparent border-none focus:ring-0 text-white py-4 placeholder:text-slate-500 outline-none"
                        placeholder="••••••••"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-slate-400 hover:text-slate-200">
                        <span className="material-symbols-outlined text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                  ) : (
                    <>
                      <span>Sign In to Studio</span>
                      <span className="material-symbols-outlined text-lg">arrow_forward</span>
                    </>
                  )}
                </button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-700/50" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="px-2 text-slate-500" style={{ backgroundColor: 'rgba(26, 34, 51, 0.9)' }}>Or continue with</span>
                </div>
              </div>

              <button
                className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-slate-700/50 hover:bg-slate-800 transition-colors disabled:opacity-60"
                type="button"
                onClick={handleGoogleSSO}
                disabled={loading}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span className="text-sm font-semibold">Google</span>
              </button>

              <p className="text-center text-sm text-slate-400">
                New to the platform?{' '}
                <Link className="text-primary font-bold hover:underline" to="/register">
                  Create an account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full py-8 text-center text-slate-500 text-xs tracking-wide">
        © 2026 LucidLab. All rights reserved.
      </footer>
    </div>
  );
}
