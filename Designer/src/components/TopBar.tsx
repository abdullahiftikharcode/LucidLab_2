import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, query, where, orderBy, onSnapshot, limit, updateDoc, serverTimestamp } from 'firebase/firestore';
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
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(true);

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowMenu(false);
    }
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, []);

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

    // Listen for notifications
    setLoadingNotifications(true);
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // In-memory sort to avoid index requirement
      all.sort((a: any, b: any) => {
        const t1 = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const t2 = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return t2 - t1;
      });
      setNotifications(all.slice(0, 10));
      setUnreadCount(all.filter((n: any) => !n.isRead).length);
      setLoadingNotifications(false);
    }, (err) => {
      console.error("Notif listener error:", err);
      setLoadingNotifications(false);
    });

    return () => unsubscribe();
  }, [currentUser, db]);

  async function markAllAsRead() {
    for (const notif of notifications) {
      if (!notif.isRead) {
        await updateDoc(doc(db, 'notifications', notif.id), { isRead: true });
      }
    }
  }

  function formatRelativeTime(ts: any) {
    if (!ts) return '';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  }

  async function handleLogout() {
    await signOut(auth);
    navigate('/login');
  }

  const displayName = userData?.displayName || userData?.name || currentUser?.displayName || currentUser?.email || 'Instructor';
  const emailFallback = currentUser?.email || 'Instructor';
  const useImage = photoURL && !avatarImageFailed;
  const avatarDisplay = getAvatarDisplay(useImage ? photoURL : null, displayName, 'md', emailFallback);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-100 bg-white/90 backdrop-blur-md px-6 lg:px-20 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-10">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#13ecc8] text-white shadow-lg shadow-[#13ecc8]/20">
              <span className="material-symbols-outlined">deployed_code</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Lucid Lab</h2>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link
              to="/dashboard"
              className={`text-sm font-semibold pb-1 ${isActive('/dashboard') ? 'text-primary border-b-2 border-primary' : 'text-slate-500 hover:text-primary transition-colors'}`}
            >
              Dashboard
            </Link>
            <Link
              to="/experiments"
              className={`text-sm font-semibold pb-1 ${isActive('/experiments') ? 'text-primary border-b-2 border-primary' : 'text-slate-500 hover:text-primary transition-colors'}`}
            >
              Experiments
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <button 
              onClick={() => { setShowNotifications(!showNotifications); setShowMenu(false); if (!showNotifications) markAllAsRead(); }}
              className={`flex items-center justify-center rounded-full size-10 transition-colors relative ${showNotifications ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              <span className="material-symbols-outlined">notifications</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {showNotifications && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-bold text-sm">Notifications</h3>
                    <Link to="/notifications" onClick={() => setShowNotifications(false)} className="text-[11px] font-bold text-primary hover:underline">VIEW ALL</Link>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {loadingNotifications ? (
                      <div className="divide-y divide-slate-100">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="px-4 py-3 space-y-2 animate-pulse">
                            <div className="h-3 w-1/3 bg-slate-100 rounded" />
                            <div className="h-2 w-full bg-slate-100 rounded" />
                            <div className="h-2 w-2/3 bg-slate-100 rounded" />
                          </div>
                        ))}
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-500">
                        <span className="material-symbols-outlined text-4xl mb-2 opacity-20">notifications_off</span>
                        <p className="text-xs">No notifications yet</p>
                      </div>
                    ) : (
                      notifications.map(n => (
                        <Link 
                          key={n.id} 
                          to={n.link || '#'} 
                          onClick={() => { 
                            setShowNotifications(false); 
                            if (!n.isRead) updateDoc(doc(db, 'notifications', n.id), { isRead: true });
                          }}
                          className={`block px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 ${!n.isRead ? 'bg-primary/[0.04]' : ''}`}
                        >
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-xs font-bold text-slate-900 truncate">{n.title}</p>
                            {!n.isRead && <span className="size-1.5 rounded-full bg-primary shrink-0" />}
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{n.message}</p>
                          <p className="text-[10px] text-slate-400 mt-1 font-medium">{formatRelativeTime(n.createdAt)}</p>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
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
                <div className="fixed inset-0 z-[100]" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 z-[110] py-2">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
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
                      <p className="text-sm font-semibold text-slate-900 truncate">{displayName || 'Instructor'}</p>
                      <p className="text-xs text-slate-500 truncate">{currentUser?.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
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
