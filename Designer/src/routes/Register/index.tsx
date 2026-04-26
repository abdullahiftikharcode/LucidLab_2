import React, { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import {
  getAuth, createUserWithEmailAndPassword,
  signInWithPopup, GoogleAuthProvider, updateProfile,
} from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useFirebaseApp } from 'reactfire';
import { useAuth } from '../../contexts/AuthContext';
import '../../styles/pages/register.css';

export default function RegisterPage() {
  const app       = useFirebaseApp();
  const auth      = getAuth(app);
  const db        = getFirestore(app);
  const navigate  = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();

  const [fullName,        setFullName]        = useState('');
  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms,   setAgreedToTerms]   = useState(false);
  const [error,           setError]           = useState('');
  const [loading,         setLoading]         = useState(false);

  if (!authLoading && currentUser) return <Navigate to="/dashboard" replace />;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f1fbf7]">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-4xl text-[#48c78e]">science</span>
          <p className="text-slate-400 text-sm font-medium" style={{ fontFamily: "'Quicksand', sans-serif" }}>Loading…</p>
        </div>
      </div>
    );
  }

  async function handleGoogleSSO() {
    setError(''); setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result   = await signInWithPopup(auth, provider);
      const user     = result.user;
      const ref      = doc(db, 'users', user.uid);
      if (!(await getDoc(ref)).exists()) {
        await setDoc(ref, {
          uid: user.uid, email: user.email,
          displayName: user.displayName || '', photoURL: user.photoURL || '',
          role: 'instructor', institution: '', classroomIds: [],
          createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        });
      }
      navigate('/dashboard');
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user')
        setError(err.message || 'Failed to sign in with Google.');
    } finally { setLoading(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (password.length < 6)          { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user   = result.user;
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid, email: user.email, displayName: fullName, photoURL: '',
        role: 'instructor', institution: '', classroomIds: [],
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      if (fullName.trim()) await updateProfile(user, { displayName: fullName.trim() });
      navigate('/dashboard');
    } catch (err: any) {
      const c = err.code || '';
      if      (c === 'auth/email-already-in-use')  setError('An account with this email already exists. Try logging in instead.');
      else if (c === 'auth/invalid-email')          setError('Please enter a valid email address.');
      else if (c === 'auth/weak-password')          setError('Password is too weak. Please use at least 6 characters.');
      else if (c === 'auth/operation-not-allowed')  setError('Email/password registration is not enabled. Please contact support.');
      else if (c === 'auth/too-many-requests')      setError('Too many attempts. Please wait a moment and try again.');
      else if (c === 'auth/network-request-failed') setError('Network error. Please check your internet connection.');
      else                                          setError('Something went wrong. Please try again later.');
    } finally { setLoading(false); }
  }

  return (
    <div className="rp-root" style={{ fontFamily: "'Quicksand', 'Public Sans', sans-serif" }}>
      {/* ── Nav ── */}
      <nav className="rp-nav">
        <span className="rp-logo">
          <span className="material-symbols-outlined">deployed_code</span>
          Lucid Lab
        </span>
      </nav>

      {/* ── Main ── */}
      <main className="rp-main">
        <div className="rp-content">

          {/* Left panel */}
          <div className="rp-left">
            <div className="rp-img-box">
              <img
                alt="Teacher and student with science model"
                // src="https://lh3.googleusercontent.com/aida-public/AB6AXuD5-He1fIy2bQ62U6o1IMfWpaZaO61_yzLuk-S42nszbMZ8cr0R9lZtSv220gWGxoXbw4u6zr9VoHDwIizdz834v-2kgk6wPm_wRoGPDlXrS7sBhuk8ZVLPMd0EZed7jATBVnCKcEpwj36twiady36sZw-aPHnp2eOA8loTxUEW8C5hWqQQOOsXKJz6iDW78Ltm_7A5TGcwqD131USc9sqRbX5pQLpI88XNemHK3hECy8EVeF9oZLk1lRJ0uEyBqi-_5LHufY6E1-UM"
                src="/register.png"
              />
            </div>
            <h1>Unlock the Micro-verse</h1>
            <p>Interactive AR experiences for the next generation of scientists.</p>
            <div className="rp-icons">
              <div className="rp-icon-pill" style={{ background: 'rgba(72,199,142,.12)' }}>
                <span className="material-symbols-outlined" style={{ color: '#48c78e' }}>biotech</span>
              </div>
              <div className="rp-icon-pill" style={{ background: 'rgba(255,127,97,.12)' }}>
                <span className="material-symbols-outlined" style={{ color: '#ff7f61' }}>rocket_launch</span>
              </div>
              <div className="rp-icon-pill" style={{ background: 'rgba(96,165,250,.15)' }}>
                <span className="material-symbols-outlined" style={{ color: '#60a5fa' }}>lightbulb</span>
              </div>
            </div>
          </div>

          {/* Form card */}
          <div className="rp-card">
            <span className="rp-card-bg-icon material-symbols-outlined">science</span>

            <div className="rp-title">
              <h2>Create Account</h2>
              <p>Start your scientific journey today!</p>
            </div>

            {error && (
              <div className="rp-error">
                <span className="material-symbols-outlined">error</span>
                <p>{error}</p>
              </div>
            )}

            <form className="rp-form" onSubmit={handleSubmit}>
              <div className="rp-field">
                <label>Full Name</label>
                <div className="rp-field-wrap">
                  <span className="material-symbols-outlined">person</span>
                  <input
                    className="rp-input" placeholder="Albert Einstein"
                    required type="text" value={fullName}
                    onChange={e => setFullName(e.target.value)}
                  />
                </div>
              </div>

              <div className="rp-field">
                <label>Email Address</label>
                <div className="rp-field-wrap">
                  <span className="material-symbols-outlined">mail</span>
                  <input
                    className="rp-input" placeholder="hello@eduar.com"
                    required type="email" value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="rp-field">
                <label>Password</label>
                <div className="rp-field-wrap">
                  <span className="material-symbols-outlined">lock</span>
                  <input
                    className="rp-input" minLength={6} placeholder="••••••••"
                    required type="password" value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="rp-field">
                <label>Confirm Password</label>
                <div className="rp-field-wrap">
                  <span className="material-symbols-outlined">lock</span>
                  <input
                    className="rp-input" minLength={6} placeholder="••••••••"
                    required type="password" value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="rp-terms">
                <input
                  checked={agreedToTerms} type="checkbox"
                  onChange={e => setAgreedToTerms(e.target.checked)}
                />
                <span>I agree to the <a href="#">Terms of Service</a></span>
              </div>

              <button className="rp-btn" disabled={loading} type="submit">
                {loading ? (
                  <span className="material-symbols-outlined spin">progress_activity</span>
                ) : (
                  <>
                    <span>Join the Adventure</span>
                    <span className="material-symbols-outlined">auto_awesome</span>
                  </>
                )}
              </button>
            </form>

            <div className="rp-post rp-login-row">
              Already have an account?{' '}
              <Link to="/login">Log in here</Link>
            </div>

            <div className="rp-post rp-divider">Or sign up with</div>

            <div className="rp-post rp-sso-grid">
              <button className="rp-sso-btn" disabled={loading} type="button" onClick={handleGoogleSSO}>
                <img
                  alt="Google"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDuqtuQBfXwd0XbIidj64UjH7tKt4mbvWongtvtsFh7m-sqE8mjFvqIdilN74ecQ-lXBKzOiwyCX54GgTgi6SQXn8Tc8iGCGez737rwgl0bFHTBLFHB2GkxvejlT_JP5i3hDL_wOwTcUmOS2RpGJQ7v-o3gH_uMxZw1d0FHv5pimnqf16bT4OZDhSq27zH-ArzBaWHYq4-HMkAuuyJo-8-Ucqtz7hO0D2Og5EeO3_gSpfiVNcpcx_0QbzAIZ4__dkt_XNocChVgPrit"
                />
                Google
              </button>
              <button className="rp-sso-btn" type="button">
                <span className="material-symbols-outlined" style={{ color: '#1e293b' }}>ios</span>
                Apple
              </button>
            </div>
          </div>

        </div>
      </main>

    </div>
  );
}