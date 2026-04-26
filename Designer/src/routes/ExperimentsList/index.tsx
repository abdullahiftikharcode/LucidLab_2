import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFirestore, collection, query, where, getDocs, deleteDoc, doc, serverTimestamp, updateDoc, arrayRemove, setDoc } from 'firebase/firestore';
import { useFirebaseApp } from 'reactfire';
import { useAuth } from '../../contexts/AuthContext';
import { deleteExperimentThumbnail } from '../../utils/storageHelpers';
import MainNav from '../../components/MainNav';
import PatternPage from '../../components/layout/PatternPage';
import AppFooter from '../../components/layout/AppFooter';
import '../../styles/pages/experiments.css';
import ConfirmActionModal from '../../components/common/ConfirmActionModal';

interface Experiment {
  id: string;
  title: string;
  category: string;
  status: string;
  experimentCode: string;
  classroomIds: string[];
  updatedAt: any;
  thumbnailUrl: string;
  description?: string;
}

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

const CATEGORY_COLORS: Record<string, { badge: string; label: string; bg: string; emoji: string; icon: string; accent: string }> = {
  Chemistry: { badge: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', label: 'Chemistry', bg: 'bg-[#D1FAE5]', emoji: '🧪', icon: 'science', accent: '#14b8a6' },
  Physics: { badge: 'bg-amber-500/10 text-amber-600 border-amber-500/20', label: 'Physics', bg: 'bg-[#DBEAFE]', emoji: '🧲', icon: 'rocket_launch', accent: '#3b82f6' },
  Biology: { badge: 'bg-blue-500/10 text-blue-600 border-blue-500/20', label: 'Biology', bg: 'bg-[#FCE7F3]', emoji: '🧬', icon: 'biotech', accent: '#ec4899' },
  Engineering: { badge: 'bg-purple-500/10 text-purple-600 border-purple-500/20', label: 'Engineering', bg: 'bg-[#F3E8FF]', emoji: '⚙️', icon: 'precision_manufacturing', accent: '#a855f7' },
  Geology: { badge: 'bg-orange-500/10 text-orange-600 border-orange-500/20', label: 'Geology', bg: 'bg-[#FEF3C7]', emoji: '🪨', icon: 'landscape', accent: '#f59e0b' },
  'General Science': { badge: 'bg-sky-500/10 text-sky-600 border-sky-500/20', label: 'General Science', bg: 'bg-[#E0F2FE]', emoji: '🔬', icon: 'explore', accent: '#0ea5e9' },
  'Environmental Science': { badge: 'bg-teal-500/10 text-teal-600 border-teal-500/20', label: 'Environmental Science', bg: 'bg-[#D1FAE5]', emoji: '🌿', icon: 'eco', accent: '#10b981' },
  Quantum: { badge: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20', label: 'Quantum', bg: 'bg-[#CFFAFE]', emoji: '⚛️', icon: 'blur_on', accent: '#06b6d4' },
  Other: { badge: 'bg-slate-500/10 text-slate-600 border-slate-200', label: 'Other', bg: 'bg-[#F8FAFC]', emoji: '🔭', icon: 'category', accent: '#64748b' },
};

const FALLBACK_EMOJIS = ['🧪', '🧬', '🧲', '🌿', '⚛️', '🔬', '🪨', '⚙️', '🔭'];
const FALLBACK_ICONS = ['science', 'biotech', 'rocket_launch', 'eco', 'blur_on', 'explore', 'landscape', 'precision_manufacturing', 'category'];
const FALLBACK_BGS = ['bg-[#D1FAE5]', 'bg-[#DBEAFE]', 'bg-[#FCE7F3]', 'bg-[#CFFAFE]', 'bg-[#E0F2FE]', 'bg-[#F3E8FF]'];
const FALLBACK_ACCENTS = ['#14b8a6', '#3b82f6', '#ec4899', '#06b6d4', '#0ea5e9', '#a855f7'];

function hashString(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function toneForCategory(category: string | undefined, seed: string) {
  const normalized = normalizeCategory(category);
  const mapped = CATEGORY_COLORS[normalized];
  if (mapped) return mapped;

  const h = hashString(`${category || 'other'}-${seed}`);
  const idx = h % FALLBACK_ICONS.length;
  return {
    ...CATEGORY_COLORS.Other,
    label: category && category.trim().length ? category : 'Other',
    emoji: FALLBACK_EMOJIS[idx],
    icon: FALLBACK_ICONS[idx],
    bg: FALLBACK_BGS[h % FALLBACK_BGS.length],
    accent: FALLBACK_ACCENTS[h % FALLBACK_ACCENTS.length],
  };
}

export default function ExperimentsList() {
  const app = useFirebaseApp();
  const db = getFirestore(app);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string; title: string }>({ open: false, id: '', title: '' });
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [brokenThumbnailIds, setBrokenThumbnailIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (currentUser) loadExperiments();
  }, [currentUser]);

  async function loadExperiments() {
    setLoading(true);
    try {
      const q = query(collection(db, 'experiments'), where('instructorId', '==', currentUser!.uid));
      const snap = await getDocs(q);
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Experiment));
      all.sort((a, b) => {
        const aTime = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0;
        const bTime = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0;
        return bTime - aTime;
      });
      setExperiments(all);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function createExperiment() {
    setIsCreating(true);
    try {
      const expRef = doc(collection(db, 'experiments'));
      await setDoc(expRef, {
        name: expRef.id,
        title: '',
        category: 'General Science',
        status: 'draft',
        instructorId: currentUser!.uid,
        experimentCode: '',
        classroomIds: [],
        thumbnailUrl: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      navigate(`/experiment/${expRef.id}/setup`);
    } catch (e) {
      console.error(e);
      setIsCreating(false);
    }
  }

  async function deleteExperiment(id: string) {
    try {
      const exp = experiments.find(e => e.id === id);
      if (exp && exp.classroomIds && exp.classroomIds.length > 0) {
        await Promise.all(
          exp.classroomIds.map(cId =>
            updateDoc(doc(db, 'classrooms', cId), { experimentIds: arrayRemove(id) }).catch((err: any) => console.warn('Failed to clean up classroom reference:', err))
          )
        );
      }

      if (exp?.thumbnailUrl) {
        await deleteExperimentThumbnail(id, exp.thumbnailUrl);
      }

      await deleteDoc(doc(db, 'experiments', id));
      setExperiments(prev => prev.filter(e => e.id !== id));
    } catch (e) {
      console.error(e);
    }
    setConfirmDelete({ open: false, id: '', title: '' });
  }

  async function togglePublish(exp: Experiment) {
    try {
      const newStatus = exp.status === 'published' ? 'draft' : 'published';
      await updateDoc(doc(db, 'experiments', exp.id), { status: newStatus, updatedAt: serverTimestamp() });
      await loadExperiments();
    } catch (e) {
      console.error('Failed to toggle publish state', e);
    }
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

  const filtered = useMemo(() => {
    let next = [...experiments];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      next = next.filter(e => `${e.title || ''} ${e.category || ''}`.toLowerCase().includes(q));
    }
    if (categoryFilter !== 'all') next = next.filter(e => normalizeCategory(e.category) === categoryFilter);
    return next;
  }, [experiments, searchQuery, categoryFilter]);

  return (
    <PatternPage className="overflow-x-hidden text-slate-700" fontFamily="'Quicksand', sans-serif">
      <MainNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <section className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl mb-4 font-bold text-slate-700">Discover Your Next Adventure!</h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">Explore our collection of AR-powered science experiments designed to bring learning to life in your classroom.</p>
        </section>

        <section className="mb-8 sm:mb-12 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setCategoryFilter('all')} className={`px-6 py-2 rounded-full font-semibold shadow-md transition-colors ${categoryFilter === 'all' ? 'bg-[#14b8a6] text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-[#d1fae5]'}`}>All Labs</button>
            {['Chemistry', 'Biology', 'Physics'].map(cat => (
              <button key={cat} onClick={() => setCategoryFilter(cat)} className={`px-6 py-2 rounded-full font-semibold border transition-colors ${categoryFilter === cat ? 'bg-[#14b8a6] text-white border-[#14b8a6]' : 'bg-white text-slate-600 border-slate-200 hover:bg-white/90'}`}>
                {cat}
              </button>
            ))}
          </div>
          <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="relative w-full md:w-72">
              <input
                className="w-full pl-10 pr-4 py-3 rounded-full border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#14b8a6] shadow-inner bg-white/70 outline-none"
                placeholder="Search experiments..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                type="text"
              />
              <span className="material-symbols-outlined h-5 w-5 absolute left-3 top-3.5 text-slate-400">search</span>
            </div>
            <button
              onClick={createExperiment}
              disabled={isCreating}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-full text-white font-bold shadow-lg transition-transform hover:scale-[1.02] disabled:opacity-70 bg-[#14b8a6] whitespace-nowrap"
              style={{ boxShadow: '0 10px 25px -5px rgba(20,184,166,.35)' }}
            >
              {isCreating ? <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span> : <span className="material-symbols-outlined text-lg">add</span>}
              {isCreating ? 'Creating...' : 'New Experiment'}
            </button>
          </div>
        </section>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-[2rem] experiments-bubbly-shadow overflow-hidden flex flex-col min-h-[400px]">
                <div className="h-48 bg-slate-100" />
                <div className="p-8 space-y-4">
                  <div className="h-4 w-28 rounded-full bg-slate-100" />
                  <div className="h-6 w-3/4 rounded bg-slate-100" />
                  <div className="h-20 rounded-2xl bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-[2rem] experiments-bubbly-shadow p-10 text-center border border-[#bfe9e2]">
            <div className="w-20 h-20 rounded-full bg-[#E6F9F5] border border-[#bfe9e2] flex items-center justify-center mx-auto mb-5">
              <span className="material-symbols-outlined text-4xl text-[#169A92]">science</span>
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">No experiments found</h3>
            <p className="text-slate-500 mb-6">
              {experiments.length === 0 ? 'Create your first experiment to start building AR content.' : 'No experiments match the current filters.'}
            </p>
          </div>
        ) : (
          <div id="experiments-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map(exp => {
              const tone = toneForCategory(exp.category, exp.id);
              const hasThumb = Boolean(exp.thumbnailUrl) && !brokenThumbnailIds.has(exp.id);
              const imgSrc = hasThumb ? exp.thumbnailUrl : null;
              const categoryName = normalizeCategory(exp.category);
              return (
                <article key={exp.id} className="bg-white rounded-[2rem] experiments-bubbly-shadow flex flex-col hover:-translate-y-1 transition-transform duration-300 min-w-0">
                  <div className={`h-48 ${tone.bg} flex items-center justify-center relative overflow-hidden`}>
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/30 rounded-full" />
                    {imgSrc ? (
                      <img
                        src={imgSrc}
                        alt={exp.title || exp.category || 'Experiment'}
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                        onError={() => {
                          setBrokenThumbnailIds(prev => {
                            const next = new Set(prev);
                            next.add(exp.id);
                            return next;
                          });
                        }}
                      />
                    ) : (
                      <div className="z-10 text-6xl">{tone.emoji}</div>
                    )}
                    <div className="absolute inset-0 bg-white/10" />
                    <div className="absolute left-4 top-4 w-10 h-10 rounded-full bg-white/90 border border-white flex items-center justify-center shadow-sm z-20">
                      <span className="material-symbols-outlined text-base" style={{ color: tone.accent }}>{tone.icon}</span>
                    </div>
                  </div>
                  <div className="p-8 flex flex-col flex-grow">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider border ${tone.badge}`}>{tone.label}</span>
                        <span className="text-slate-400 text-xs">• {formatTimeAgo(exp.updatedAt)}</span>
                      </div>
                      <button
                        onClick={() => setConfirmDelete({ open: true, id: exp.id, title: exp.title })}
                        className="w-9 h-9 rounded-full bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 flex items-center justify-center shrink-0"
                        title="Delete experiment"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                    <h3 className="text-xl mb-4 leading-snug font-bold text-slate-700">{exp.title || 'Untitled Experiment'}</h3>
                    <p className="text-slate-600 text-sm mb-8 flex-grow">{exp.description || categoryName || 'General Science'}</p>
                    <div className="flex gap-3 mt-auto">
                      <button onClick={() => navigate(`/experiment/${exp.id}`)} className="flex-1 py-3 bg-[#fb7185] text-white font-bold rounded-full shadow-lg hover:brightness-105 transition-all">Edit</button>
                      <button onClick={() => togglePublish(exp)} className="flex-1 py-3 bg-[#14b8a6] text-white font-bold rounded-full shadow-lg hover:brightness-105 transition-all">
                        {exp.status === 'published' ? 'Unpublish' : 'Publish'}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

      </main>

      <AppFooter />

      <ConfirmActionModal
        open={confirmDelete.open}
        title={`Delete ${confirmDelete.title || 'experiment'}?`}
        message="This action cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={() => deleteExperiment(confirmDelete.id)}
        onCancel={() => setConfirmDelete({ open: false, id: '', title: '' })}
      />
    </PatternPage>
  );
}
