import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getFirestore, collection, query, where, getDocs, addDoc, deleteDoc, doc, getDoc, serverTimestamp, updateDoc, arrayRemove, setDoc } from 'firebase/firestore';
import { useFirebaseApp } from 'reactfire';
import { useAuth } from '../../contexts/AuthContext';
import TopBar from '../../components/TopBar';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import ConfirmDialog from '../../components/ConfirmDialog';

interface Experiment {
  id: string; title: string; category: string; status: string;
  experimentCode: string; classroomIds: string[]; updatedAt: any; thumbnailUrl: string;
}

const CATEGORY_COLORS: Record<string, { badge: string; label: string }> = {
  Chemistry: { badge: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', label: 'Chemistry' },
  Physics: { badge: 'bg-amber-500/10 text-amber-600 border-amber-500/20', label: 'Physics' },
  Biology: { badge: 'bg-blue-500/10 text-blue-600 border-blue-500/20', label: 'Biology' },
  Engineering: { badge: 'bg-purple-500/10 text-purple-600 border-purple-500/20', label: 'Engineering' },
  Geology: { badge: 'bg-orange-500/10 text-orange-600 border-orange-500/20', label: 'Geology' },
};

const CATEGORY_ICONS: Record<string, string> = {
  Chemistry: 'science', Physics: 'speed', Biology: 'biotech',
  Engineering: 'engineering', Geology: 'landscape', Other: 'science',
};

export default function ExperimentsList() {
  const app = useFirebaseApp();
  const db = getFirestore(app);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string; title: string }>({ open: false, id: '', title: '' });
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => { if (currentUser) loadExperiments(); }, [currentUser]);

  async function loadExperiments() {
    setLoading(true);
    try {
      // Single where clause — sort client-side to avoid composite index
      const q = query(collection(db, 'experiments'), where('instructorId', '==', currentUser!.uid));
      const snap = await getDocs(q);
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Experiment));
      all.sort((a, b) => {
        const aTime = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0;
        const bTime = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0;
        return bTime - aTime;
      });
      setExperiments(all);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function createExperiment() {
    try {
      // Pre-generate the experiment ID so we can store it as `name` (used by the editor hooks)
      const expRef = doc(collection(db, 'experiments'));
      await setDoc(expRef, {
        name: expRef.id,
        title: 'Untitled Experiment',
        category: 'General Science',
        status: 'draft',
        instructorId: currentUser!.uid,
        experimentCode: '',
        classroomIds: [],
        thumbnailUrl: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      navigate(`/experiment/${expRef.id}`);
    } catch (e) { console.error(e); }
  }

  async function deleteExperiment(id: string) {
    try {
      const exp = experiments.find(e => e.id === id);

      // Clean up references in assigned classrooms
      if (exp && exp.classroomIds && exp.classroomIds.length > 0) {
        // Use Promise.all to fetch and update in parallel
        await Promise.all(
          exp.classroomIds.map(cId =>
            // We use updateDoc and arrayRemove to safely pull out the experiment ID
            updateDoc(doc(db, 'classrooms', cId), {
              experimentIds: arrayRemove(id)
            }).catch((e: any) => console.warn('Failed to clean up classroom reference:', e))
          )
        );
      }

      await deleteDoc(doc(db, 'experiments', id));
      setExperiments(prev => prev.filter(e => e.id !== id));
    } catch (e) { console.error(e); }
    setConfirmDelete({ open: false, id: '', title: '' });
  }

  async function duplicateExperiment(exp: Experiment) {
    try {
      const origSnap = await getDoc(doc(db, 'experiments', exp.id));
      if (!origSnap.exists()) return;
      const data = origSnap.data();
      await addDoc(collection(db, 'experiments'), {
        ...data,
        title: (data.title || 'Untitled') + ' (copy)',
        status: 'draft',
        experimentCode: '',
        classroomIds: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      loadExperiments();
    } catch (e) { console.error(e); }
    setOpenMenuId(null);
  }

  async function togglePublish(exp: Experiment) {
    try {
      const newStatus = exp.status === 'published' ? 'draft' : 'published';
      await updateDoc(doc(db, 'experiments', exp.id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      await loadExperiments();
    } catch (e) {
      console.error('Failed to toggle publish state', e);
    }
    setOpenMenuId(null);
  }

  function formatTimeAgo(ts: any) {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  let filtered = [...experiments];
  if (statusFilter !== 'all') filtered = filtered.filter(e => e.status === statusFilter);
  if (categoryFilter !== 'all') filtered = filtered.filter(e => e.category === categoryFilter);
  if (sortBy === 'oldest') filtered.reverse();
  if (sortBy === 'name') filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));

  const catColor = (c: string) => CATEGORY_COLORS[c] || { badge: 'bg-slate-100 text-slate-600 border-slate-200', label: c };

  return (
    <div className="bg-background-light min-h-screen" style={{ fontFamily: "'Inter', sans-serif" }}>
      <TopBar />
      <main className="px-6 lg:px-10 py-8 flex-1 flex flex-col max-w-[1440px] mx-auto w-full">
        {/* Title + CTA */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight">My Experiments</h1>
            <p className="text-slate-500 mt-1">Manage and design your interactive AR science curriculum</p>
          </div>
          <button onClick={createExperiment} className="flex items-center gap-2 rounded-lg h-11 px-6 bg-primary text-white text-sm font-bold shadow-sm shadow-primary/20 hover:bg-primary/90 transition-all">
            <span className="material-symbols-outlined text-lg">add</span> New Experiment
          </button>
        </div>

        {/* Filters Bar */}
        <div className="flex gap-3 mb-8 items-center bg-white p-2 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <div className="px-3 border-r border-slate-200">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Filters</span>
          </div>
          <select className="h-9 rounded-lg bg-slate-100 px-4 text-sm font-medium text-slate-700 border-none focus:ring-primary" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">Status: All</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
          <select className="h-9 rounded-lg bg-slate-100 px-4 text-sm font-medium text-slate-700 border-none focus:ring-primary" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
            <option value="all">Category: All</option>
            <option value="Chemistry">Chemistry</option>
            <option value="Physics">Physics</option>
            <option value="Biology">Biology</option>
            <option value="Engineering">Engineering</option>
            <option value="Geology">Geology</option>
          </select>
          <div className="ml-auto">
            <select className="h-9 rounded-lg bg-slate-100 px-4 text-sm font-medium text-slate-700 border-none focus:ring-primary" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="newest">Sort: Recent</option>
              <option value="oldest">Oldest First</option>
              <option value="name">Name A-Z</option>
            </select>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => <div key={i} className="animate-pulse rounded-xl border border-slate-200 bg-white h-72" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200">
            <EmptyState icon="science" title="No experiments found" description={experiments.length === 0 ? 'Create your first experiment to start building AR content.' : 'No experiments match the current filters.'} actionLabel={experiments.length === 0 ? 'New Experiment' : undefined} onAction={experiments.length === 0 ? createExperiment : undefined} />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filtered.map(exp => (
              <div key={exp.id} className="group flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all">
                <Link to={`/experiment/${exp.id}`} className="relative w-full aspect-video bg-slate-200 overflow-hidden flex items-center justify-center">
                  {exp.thumbnailUrl ? (
                    <img className="w-full h-full object-cover transition-transform group-hover:scale-105" src={exp.thumbnailUrl} alt={exp.title} />
                  ) : (
                    <span className="material-symbols-outlined text-5xl text-slate-300">{CATEGORY_ICONS[exp.category] || 'science'}</span>
                  )}
                  <div className="absolute top-3 left-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border backdrop-blur-sm ${exp.status === 'published' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}`}>
                      {exp.status || 'Draft'}
                    </span>
                  </div>
                </Link>
                <div className="p-4 flex flex-col gap-1 relative">
                  <div className="flex items-start justify-between gap-2">
                    <Link to={`/experiment/${exp.id}`}>
                      <h3 className="text-base font-bold leading-tight line-clamp-1 hover:text-primary transition-colors">{exp.title || 'Untitled'}</h3>
                    </Link>
                    <div className="relative">
                      <button onClick={() => setOpenMenuId(openMenuId === exp.id ? null : exp.id)} className="text-slate-400 hover:text-slate-600">
                        <span className="material-symbols-outlined text-lg">more_vert</span>
                      </button>
                      {openMenuId === exp.id && (
                        <>
                          <div className="fixed inset-0 z-30" onClick={() => setOpenMenuId(null)} />
                          <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-xl border border-slate-200 z-40 py-1">
                            <button onClick={() => duplicateExperiment(exp)} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                              <span className="material-symbols-outlined text-base">content_copy</span> Duplicate
                            </button>
                            <button onClick={() => togglePublish(exp)} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                              <span className="material-symbols-outlined text-base">{exp.status === 'published' ? 'unpublished' : 'cloud_upload'}</span>
                              {exp.status === 'published' ? 'Unpublish' : 'Publish'}
                            </button>
                            <button onClick={() => { setConfirmDelete({ open: true, id: exp.id, title: exp.title }); setOpenMenuId(null); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                              <span className="material-symbols-outlined text-base">delete</span> Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="text-slate-500 text-sm">{exp.category || 'Science'}</p>
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-400">Edited {formatTimeAgo(exp.updatedAt)}</span>
                    {(exp.classroomIds?.length || 0) > 0 && (
                      <span className="text-xs text-slate-400">{exp.classroomIds.length} classroom{exp.classroomIds.length > 1 ? 's' : ''}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <ConfirmDialog open={confirmDelete.open} title="Delete Experiment" message={`Are you sure you want to delete "${confirmDelete.title}"? This action cannot be undone.`} confirmLabel="Delete" danger onConfirm={() => deleteExperiment(confirmDelete.id)} onCancel={() => setConfirmDelete({ open: false, id: '', title: '' })} />
    </div>
  );
}
