import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getFirestore, collection, query, where, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { useFirebaseApp } from 'reactfire';
import { useAuth } from '../../contexts/AuthContext';
import TopBar from '../../components/TopBar';

export default function NotificationsPage() {
  const app = useFirebaseApp();
  const db = getFirestore(app);
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

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
      setNotifications(all);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, db]);

  async function markAsRead(id: string) {
    await updateDoc(doc(db, 'notifications', id), { isRead: true });
  }

  async function markAllAsRead() {
    for (const notif of notifications) {
      if (!notif.isRead) {
        await updateDoc(doc(db, 'notifications', notif.id), { isRead: true });
      }
    }
  }

  async function deleteNotification(id: string) {
    await deleteDoc(doc(db, 'notifications', id));
  }

  function formatFullTime(ts: any) {
    if (!ts) return '';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric', 
      hour: 'numeric', 
      minute: '2-digit' 
    });
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'assignment_assigned': return 'assignment';
      case 'submission_received': return 'inbox';
      case 'grade_received': return 'grade';
      case 'student_joined': return 'person_add';
      default: return 'notifications';
    }
  };

  return (
    <div className="dark">
      <div className="bg-background-light dark:bg-background-dark min-h-screen font-display text-slate-900 dark:text-slate-100" style={{ fontFamily: "'Inter', sans-serif" }}>
        <TopBar />
        <main className="mx-auto max-w-4xl p-6 lg:p-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">Notifications</h1>
              <p className="mt-2 text-slate-500 dark:text-slate-400">Stay updated with classroom activities and student submissions.</p>
            </div>
            {notifications.some(n => !n.isRead) && (
              <button 
                onClick={markAllAsRead}
                className="text-sm font-bold text-primary hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="relative overflow-hidden h-32 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 flex gap-4">
                  <div className="shrink-0 size-12 rounded-xl skeleton-shimmer" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 w-1/4 rounded skeleton-shimmer" />
                    <div className="h-3 w-3/4 rounded skeleton-shimmer" />
                    <div className="h-3 w-1/2 rounded skeleton-shimmer" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
              <div className="size-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-400">
                <span className="material-symbols-outlined text-4xl">notifications_off</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">No notifications found</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-2">We&apos;ll alert you when something important happens.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map(n => (
                <div 
                  key={n.id} 
                  onClick={() => !n.isRead && markAsRead(n.id)}
                  className={`group relative flex items-start gap-4 p-5 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${!n.isRead ? 'bg-primary/[0.03] dark:bg-primary/[0.05] border-primary/20 shadow-sm shadow-primary/5' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}
                >
                  <div className={`shrink-0 size-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${!n.isRead ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                    <span className="material-symbols-outlined">{getIcon(n.type)}</span>
                  </div>
                  <div className="flex-1 min-w-0 pr-10">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={`font-bold text-sm ${!n.isRead ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-200'}`}>{n.title}</h4>
                      {!n.isRead && <span className="size-2 rounded-full bg-primary animate-pulse" />}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-2">{n.message}</p>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">{formatFullTime(n.createdAt)}</span>
                      {n.link && (
                        <Link 
                          to={n.link} 
                          className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                        >
                          View Details
                          <span className="material-symbols-outlined text-xs">arrow_forward</span>
                        </Link>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                    className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 transition-all rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10"
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
