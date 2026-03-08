import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { useFirebaseApp } from 'reactfire';
import { useAuth } from '../contexts/AuthContext';
import { getAvatarDisplay } from '../utils/storageHelpers';

export default function TopBar() {
  const app = useFirebaseApp();
  const auth = getAuth(app);
  const db = getFirestore(app);
  const { currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [avatarImageFailed, setAvatarImageFailed] = useState(false);

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', currentUser.uid));
        if (snap.exists()) {
          const data = snap.data();
          setUserData(data);
          if (data.photoURL) {
            setPhotoURL(data.photoURL);
            setAvatarImageFailed(false); // Reset when we get new photoURL
          }
        }
      } catch (e) { /* ignore */ }
    })();
  }, [currentUser, db]);

  async function handleLogout() {
    await signOut(auth);
    navigate('/login');
  }

  const displayName = userData?.displayName || userData?.name || currentUser?.displayName || currentUser?.email || 'Instructor';
  const emailFallback = currentUser?.email || 'Instructor';
  const useImage = photoURL && !avatarImageFailed;
  const avatarDisplay = getAvatarDisplay(useImage ? photoURL : null, displayName, 'md', emailFallback);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-md px-6 lg:px-20 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-10">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
              <span className="material-symbols-outlined">science</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">LucidLab</h2>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link
              to="/dashboard"
              className={`text-sm font-semibold pb-1 ${isActive('/dashboard') ? 'text-primary border-b-2 border-primary' : 'text-slate-500 dark:text-slate-400 hover:text-primary transition-colors'}`}
            >
              Dashboard
            </Link>
            <Link
              to="/experiments"
              className={`text-sm font-semibold pb-1 ${isActive('/experiments') ? 'text-primary border-b-2 border-primary' : 'text-slate-500 dark:text-slate-400 hover:text-primary transition-colors'}`}
            >
              Experiments
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <button className="flex items-center justify-center rounded-lg size-10 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="size-10 rounded-full overflow-hidden flex items-center justify-center border border-primary/20 font-bold text-sm bg-primary/10"
            >
              {avatarDisplay.type === 'image' ? (
                <img
                  src={avatarDisplay.src}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                  onError={() => setAvatarImageFailed(true)}
                />
              ) : (
                <span className={avatarDisplay.className}>{avatarDisplay.initials}</span>
              )}
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 z-50 py-2">
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                    <div className="size-9 rounded-full overflow-hidden flex items-center justify-center bg-primary/10 text-primary font-bold text-xs shrink-0">
                      {avatarDisplay.type === 'image' ? (
                        <img
                          src={avatarDisplay.src}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={() => setAvatarImageFailed(true)}
                        />
                      ) : (
                        <span className={getAvatarDisplay(useImage ? photoURL : null, displayName, 'sm', emailFallback).className}>{avatarDisplay.initials}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{displayName || 'Instructor'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{currentUser?.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">logout</span>
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
