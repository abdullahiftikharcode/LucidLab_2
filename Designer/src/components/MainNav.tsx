import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { getAuth, signOut } from 'firebase/auth';
import { useFirebaseApp } from 'reactfire';
import { useAuth } from '../contexts/AuthContext';

const NAV_LINKS = [
  { to: '/dashboard',   label: 'Dashboard' },
  { to: '/experiments', label: 'Experiments' },
];

export default function MainNav() {
  const app = useFirebaseApp();

  // Fix: memoize Firebase instances so they're not recreated on every render
  const db   = useMemo(() => getFirestore(app), [app]);
  const auth = useMemo(() => getAuth(app),       [app]);

  const { currentUser } = useAuth();
  const location        = useLocation();
  const navigate        = useNavigate();

  const [displayName, setDisplayName] = useState('Instructor');
  const [showMenu,    setShowMenu]    = useState(false);
  const [showMobile,  setShowMobile]  = useState(false);  // Fix: mobile nav state

  useEffect(() => {
    if (!currentUser) return;
    let mounted = true;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', currentUser.uid));
        const data = snap.exists() ? snap.data() : null;
        const name =
          data?.displayName ||
          data?.name        ||
          currentUser.displayName ||
          currentUser.email ||
          'Instructor';
        if (mounted) setDisplayName(name);
      } catch {
        if (mounted)
          setDisplayName(currentUser.displayName || currentUser.email || 'Instructor');
      }
    })();
    return () => { mounted = false; };
  }, [currentUser, db]);

  // Fix: close mobile menu on route change
  useEffect(() => {
    setShowMobile(false);
    setShowMenu(false);
  }, [location.pathname]);

  const isActive = useCallback(
    (path: string) =>
      location.pathname === path || location.pathname.startsWith(path + '/'),
    [location.pathname],
  );

  const initial = (displayName || 'I').trim().charAt(0).toUpperCase();

  const handleLogout = useCallback(async () => {
    await signOut(auth);
    setShowMenu(false);
    setShowMobile(false);
    navigate('/login');
  }, [auth, navigate]);

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-emerald-100 px-4 sm:px-6 py-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center gap-4">

        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-10 h-10 bg-[#14b8a6] rounded-full flex items-center justify-center text-white shadow-lg">
            <span className="material-symbols-outlined text-2xl">deployed_code</span>
          </div>
          <span className="text-2xl font-bold tracking-tight text-[#14b8a6]">Lucid Lab</span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex gap-8 items-center font-semibold">
          {NAV_LINKS.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`transition-colors ${
                isActive(to)
                  ? 'text-[#14b8a6] underline underline-offset-8 decoration-4'
                  : 'hover:text-[#14b8a6]'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/* Fix: hamburger button — only visible on mobile */}
          <button
            onClick={() => setShowMobile(v => !v)}
            aria-label="Toggle navigation menu"
            aria-expanded={showMobile}
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-full border border-emerald-100 bg-white shadow-sm"
          >
            <span className="material-symbols-outlined text-xl text-slate-600">
              {showMobile ? 'close' : 'menu'}
            </span>
          </button>

          {/* Profile dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(v => !v)}
              aria-label="Open user menu"
              aria-expanded={showMenu}
              className="flex items-center gap-3 bg-white border border-emerald-100 rounded-full py-1.5 pl-4 pr-1.5 shadow-sm"
            >
              <span className="text-sm font-medium truncate max-w-[180px]">
                Hello, {displayName}!
              </span>
              <div className="w-8 h-8 rounded-full bg-[#fca5a5] flex items-center justify-center text-white font-bold">
                {initial}
              </div>
            </button>

            {showMenu && (
              <>
                {/* Fix: z-[49] so backdrop is just under the dropdown */}
                <div
                  className="fixed inset-0 z-[49]"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-44 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 py-1">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">logout</span>
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Fix: mobile nav drawer — slides in below the header */}
      {showMobile && (
        <nav className="md:hidden mt-3 pb-2 flex flex-col gap-1 font-semibold border-t border-emerald-100 pt-3">
          {NAV_LINKS.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setShowMobile(false)}
              className={`px-3 py-2 rounded-xl transition-colors ${
                isActive(to)
                  ? 'text-[#14b8a6] bg-emerald-50'
                  : 'text-slate-700 hover:text-[#14b8a6] hover:bg-emerald-50'
              }`}
            >
              {label}
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="mt-1 px-3 py-2 rounded-xl text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
          >
            <span className="material-symbols-outlined text-base">logout</span>
            Logout
          </button>
        </nav>
      )}
    </header>
  );
}