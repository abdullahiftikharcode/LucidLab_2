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
  description?: string;
}

const PUBLIC_IMAGE_BASE = '/Lucid_Lab%20images/';
const CATEGORY_IMAGES: Record<string, string[]> = {
  Chemistry: [
    'chemistry_beaker.png',
    'chemistry_bonds.png',
    'chemistry_intro.png',
    'chemistry3.png',
    'chemistry4.png',
    'molecular_bond_chemistry.png',
  ],
  Physics: ['Physics.png', 'Physics1.png', 'Physics_waves.png'],
  Biology: ['Biology_cell.png', 'biology_heart.png', 'biology_mitosis.png', 'biology_plantcell.png'],
  'General Science': ['General_science.png'],
  Quantum: ['quantam.png', 'quantam1.png'],
  Engineering: ['General_science.png'],
  Geology: ['General_science.png'],
  Other: ['General_science.png'],
};

function normalizeCategory(raw: string | undefined): string {
  const s = (raw || '').trim().toLowerCase();
  if (s.includes('chem')) return 'Chemistry';
  if (s.includes('phys')) return 'Physics';
  if (s.includes('bio')) return 'Biology';
  if (s.includes('env')) return 'Environmental Science';
  if (s === 'general' || s === 'science' || s.includes('general science')) return 'General Science';
  if (s.includes('quant') || s.includes('quatam') || s.includes('quantam')) return 'Quantum';
  if (s.includes('eng')) return 'Engineering';
  if (s.includes('geo')) return 'Geology';
  return raw && raw.length ? raw : 'General Science';
}

function pickCategoryImage(category: string, seed: string): string | null {
  const key = normalizeCategory(category);
  const list = CATEGORY_IMAGES[key] || CATEGORY_IMAGES['Other'];
  if (!list || list.length === 0) return null;
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h |= 0;
  }
  const idx = Math.abs(h) % list.length;
  return `${PUBLIC_IMAGE_BASE}${list[idx]}`;
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

const CATEGORY_PILL_STYLES: Record<string, string> = {
  Chemistry: 'bg-green-500/10 text-green-400 border-green-500/20',
  Physics: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Biology: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  Engineering: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Geology: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'Environmental Science': 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  'General Science': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  Quantum: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  Other: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
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
  const [isCreating, setIsCreating] = useState(false);
  const [openFilterId, setOpenFilterId] = useState<string | null>(null);

  useEffect(() => { if (currentUser) loadExperiments(); }, [currentUser]);
  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') { setOpenMenuId(null); setOpenFilterId(null); }
    }
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, []);

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
    setIsCreating(true);
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
    } catch (e) {
      console.error(e);
      setIsCreating(false);
    }
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
  if (categoryFilter !== 'all') filtered = filtered.filter(e => normalizeCategory(e.category) === categoryFilter);
  if (sortBy === 'oldest') filtered.reverse();
  if (sortBy === 'name') filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));

  const catColor = (c: string) => CATEGORY_COLORS[c] || { badge: 'bg-slate-100 text-slate-600 border-slate-200', label: c };

  return (
    <div className="dark">
      <div className="bg-background-light dark:bg-background-dark min-h-screen font-display text-slate-900 dark:text-slate-100" style={{ fontFamily: "'Inter', sans-serif" }}>
        <TopBar />
        <main className="px-6 lg:px-10 py-8 flex-1 flex flex-col max-w-[1440px] mx-auto w-full">
          <style>{`
            .glass-card {
              background: rgba(255, 255, 255, 0.03);
              backdrop-filter: blur(12px);
              -webkit-backdrop-filter: blur(12px);
              border: 1px solid rgba(255, 255, 255, 0.08);
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .glass-card:hover {
              background: rgba(255, 255, 255, 0.06);
              transform: translateY(-2px);
              border-color: rgba(36, 99, 235, 0.4);
              box-shadow: 0 0 14px rgba(36, 99, 235, 0.12);
            }
            .no-scrollbar::-webkit-scrollbar { display: none; }
            .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            .thin-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
            .thin-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .thin-scrollbar::-webkit-scrollbar-thumb {
              background-color: #334155; /* slate-700 */
              border-radius: 9999px;
              border: 2px solid transparent;
            }
            .thin-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #475569; /* slate-600 */ }
            .thin-scrollbar { scrollbar-width: thin; scrollbar-color: #334155 transparent; }
          `}</style>
          <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">My Experiments</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Manage and design your interactive AR science curriculum</p>
            </div>
            <button 
              onClick={createExperiment} 
              disabled={isCreating}
              className="flex items-center gap-2 rounded-lg h-11 px-6 bg-primary text-white text-sm font-bold shadow-sm shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-70"
            >
              {isCreating ? (
                <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
              ) : (
                <span className="material-symbols-outlined text-lg">add</span>
              )}
              {isCreating ? 'Creating...' : 'New Experiment'}
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 mb-8 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border backdrop-blur-sm text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800">Filters</span>
              <div className="relative">
                <button
                  onClick={() => setOpenFilterId(openFilterId === 'status' ? null : 'status')}
                  className="min-w-[180px] h-10 rounded-lg bg-slate-100 dark:bg-slate-800 px-4 text-sm font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 focus:outline-none flex items-center justify-between"
                >
                  <span>{statusFilter === 'all' ? 'Status: All' : statusFilter === 'published' ? 'Published' : 'Draft'}</span>
                  <span className="material-symbols-outlined text-base">expand_more</span>
                </button>
                {openFilterId === 'status' && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setOpenFilterId(null)} />
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl z-40 py-1 max-h-60 overflow-y-auto overflow-x-hidden thin-scrollbar">
                      {['all','published','draft'].map(opt => (
                        <button
                          key={opt}
                          onClick={() => { setStatusFilter(opt); setOpenFilterId(null); }}
                          className={`w-full text-left px-4 py-2 text-sm ${statusFilter === opt ? 'text-primary' : 'text-slate-700 dark:text-slate-300'} hover:bg-slate-50 dark:hover:bg-slate-800`}
                        >
                          {opt === 'all' ? 'Status: All' : opt === 'published' ? 'Published' : 'Draft'}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setOpenFilterId(openFilterId === 'sort' ? null : 'sort')}
                  className="min-w-[180px] h-10 rounded-lg bg-slate-100 dark:bg-slate-800 px-4 text-sm font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 focus:outline-none flex items-center justify-between"
                >
                  <span>{sortBy === 'newest' ? 'Sort: Recent' : sortBy === 'oldest' ? 'Oldest First' : 'Name A-Z'}</span>
                  <span className="material-symbols-outlined text-base">expand_more</span>
                </button>
                {openFilterId === 'sort' && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setOpenFilterId(null)} />
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl z-40 py-1 max-h-60 overflow-y-auto overflow-x-hidden thin-scrollbar">
                      {[
                        { value: 'newest', label: 'Sort: Recent' },
                        { value: 'oldest', label: 'Oldest First' },
                        { value: 'name', label: 'Name A-Z' },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => { setSortBy(opt.value); setOpenFilterId(null); }}
                          className={`w-full text-left px-4 py-2 text-sm ${sortBy === opt.value ? 'text-primary' : 'text-slate-700 dark:text-slate-300'} hover:bg-slate-50 dark:hover:bg-slate-800`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2 p-1 mb-8 overflow-x-auto no-scrollbar">
            <button onClick={() => setCategoryFilter('all')} className={`px-5 py-2 rounded-lg text-sm font-semibold ${categoryFilter === 'all' ? 'bg-primary text-white' : 'bg-slate-800/50 text-slate-300 hover:bg-slate-800 transition-colors'}`}>All Categories</button>
            {['Physics','Chemistry','Biology','Engineering','Geology'].map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${categoryFilter === cat ? 'bg-primary text-white' : 'bg-slate-800/50 text-slate-300 hover:bg-slate-800'}`}
              >
                {cat}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-72">
                  <div className="h-40 skeleton-shimmer" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 w-2/3 rounded skeleton-shimmer" />
                    <div className="h-3 w-1/2 rounded skeleton-shimmer" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <EmptyState icon="science" title="No experiments found" description={experiments.length === 0 ? 'Create your first experiment to start building AR content.' : 'No experiments match the current filters.'} actionLabel={experiments.length === 0 ? 'New Experiment' : undefined} onAction={experiments.length === 0 ? createExperiment : undefined} />
            </div>
          ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filtered.map(exp => (
                <div key={exp.id} className="glass-card flex flex-col rounded-2xl overflow-hidden">
                  <Link to={`/experiment/${exp.id}`} className="relative w-full aspect-video bg-slate-800/50 overflow-hidden flex items-center justify-center">
                    {(() => {
                      const fallback = pickCategoryImage(exp.category || 'Other', exp.id);
                      const imgSrc = exp.thumbnailUrl || fallback;
                      return imgSrc ? (
                        <img className="w-full h-full object-cover transition-transform group-hover:scale-105" src={imgSrc} alt={exp.title || exp.category || 'Experiment'} loading="lazy" decoding="async" />
                      ) : (
                        <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-500">{CATEGORY_ICONS[exp.category] || 'science'}</span>
                      );
                    })()}
                    <div className="absolute inset-0 bg-gradient-to-t from-background-dark/80 to-transparent" />
                    <div className="absolute top-3 left-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border backdrop-blur-sm ${exp.status === 'published' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                        {exp.status || 'Draft'}
                      </span>
                    </div>
                  </Link>
                  <div className="p-5 flex flex-col gap-2 relative">
                    <div className="flex items-start justify-between gap-2">
                      <Link to={`/experiment/${exp.id}`}>
                        <h3 className="text-base font-bold leading-tight line-clamp-1 hover:text-primary transition-colors text-slate-100">{exp.title || 'Untitled'}</h3>
                      </Link>
                      <div className="relative">
                        <button onClick={() => setOpenMenuId(openMenuId === exp.id ? null : exp.id)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400">
                          <span className="material-symbols-outlined text-lg">more_vert</span>
                        </button>
                        {openMenuId === exp.id && (
                          <>
                            <div className="fixed inset-0 z-30" onClick={() => setOpenMenuId(null)} />
                            <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 z-40 py-1">
                              <button onClick={() => duplicateExperiment(exp)} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2">
                                <span className="material-symbols-outlined text-base">content_copy</span> Duplicate
                              </button>
                              <button onClick={() => togglePublish(exp)} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2">
                                <span className="material-symbols-outlined text-base">{exp.status === 'published' ? 'unpublished' : 'cloud_upload'}</span>
                                {exp.status === 'published' ? 'Unpublish' : 'Publish'}
                              </button>
                              <button onClick={() => { setConfirmDelete({ open: true, id: exp.id, title: exp.title }); setOpenMenuId(null); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2">
                                <span className="material-symbols-outlined text-base">delete</span> Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold border ${CATEGORY_PILL_STYLES[normalizeCategory(exp.category)] || CATEGORY_PILL_STYLES.Other}`}>
                        {normalizeCategory(exp.category) || 'Science'}
                      </span>
                    </div>
                    {exp.description && (
                      <p className="text-slate-500 dark:text-slate-400 text-sm">
                        {exp.description}
                      </p>
                    )}
                    <div className="mt-4 pt-4 border-t border-glass-border flex items-center justify-between">
                      <span className="text-xs text-slate-400 dark:text-slate-500">Edited {formatTimeAgo(exp.updatedAt)}</span>
                      {(exp.classroomIds?.length || 0) > 0 && (
                        <span className="text-xs text-slate-400 dark:text-slate-500">{exp.classroomIds.length} classroom{exp.classroomIds.length > 1 ? 's' : ''}</span>
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
    </div>
  );
}
