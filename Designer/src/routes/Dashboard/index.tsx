import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getFirestore, collection, query, where, getDocs, addDoc, doc, setDoc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { useFirebaseApp } from 'reactfire';
import { useAuth } from '../../contexts/AuthContext';
import { uploadCoverImage } from '../../utils/storageHelpers';
import MainNav from '../../components/MainNav';
import PatternPage from '../../components/layout/PatternPage';
import AppFooter from '../../components/layout/AppFooter';
import '../../styles/pages/dashboard.css';

interface Classroom {
  id: string;
  name: string;
  subject: string;
  description: string;
  joinCode: string;
  studentCount: number;
  experimentIds: string[];
  coverImageURL?: string;
}

interface Experiment {
  id: string;
  title: string;
  category: string;
  status: string;
  experimentCode: string;
  updatedAt: any;
}

const SUBJECTS = ['Chemistry', 'Physics', 'Biology', 'Environmental Science', 'General Science', 'Other'];

const SUBJECT_ICON_POOLS: Record<string, string[]> = {
  Chemistry: ['science', 'biotech', 'water_drop', 'calculate', 'shield', 'memory', 'graphic_eq', 'flare', 'device_thermostat'],
  Physics: ['speed', 'rocket_launch', 'satellite_alt', 'waves', 'lightbulb', 'data_object', 'category', 'cell_tower', 'timeline'],
  Biology: ['biotech', 'eco', 'water_drop', 'landscape', 'bug_report', 'memory', 'graphic_eq', 'shield', 'device_thermostat'],
  'Environmental Science': ['eco', 'globe', 'landscape', 'water_drop', 'waves', 'flare', 'shield', 'category'],
  'General Science': ['science', 'category', 'lightbulb', 'calculate', 'graphic_eq', 'timeline', 'shield', 'data_object', 'school'],
  Other: ['school', 'category', 'lightbulb', 'timeline', 'shield', 'graphic_eq', 'data_object', 'memory'],
};

function pickSubjectIcon(subject: string, seed: string): string {
  const pool = SUBJECT_ICON_POOLS[subject] || SUBJECT_ICON_POOLS.Other;
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h |= 0;
  }
  const idx = Math.abs(h) % pool.length;
  return pool[idx] || 'science';
}

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export default function DashboardHome() {
  const app = useFirebaseApp();
  const db = getFirestore(app);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loadingClassrooms, setLoadingClassrooms] = useState(true);
  const [loadingExperiments, setLoadingExperiments] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newClassroom, setNewClassroom] = useState({ name: '', subject: 'Chemistry', description: '' });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!currentUser) return;
    loadClassrooms();
    loadExperiments();
  }, [currentUser]);

  async function loadClassrooms() {
    setLoadingClassrooms(true);
    try {
      // Single where clause to avoid requiring a composite index
      const q = query(
        collection(db, 'classrooms'),
        where('instructorId', '==', currentUser!.uid)
      );
      const snap = await getDocs(q);
      // Filter archived client-side
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Classroom));
      setClassrooms(all.filter(c => !(c as any).archived));
    } catch (e) { console.error(e); }
    setLoadingClassrooms(false);
  }

  async function loadExperiments() {
    setLoadingExperiments(true);
    try {
      // Single where clause only — sort client-side to avoid composite index
      const q = query(
        collection(db, 'experiments'),
        where('instructorId', '==', currentUser!.uid)
      );
      const snap = await getDocs(q);
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Experiment));
      // Sort by updatedAt descending, take latest 10
      all.sort((a, b) => {
        const aTime = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0;
        const bTime = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0;
        return bTime - aTime;
      });
      setExperiments(all.slice(0, 10));
    } catch (e) { console.error(e); }
    setLoadingExperiments(false);
  }

  async function handleCreateClassroom() {
    if (!newClassroom.name.trim()) return;
    setCreating(true);
    try {
      let joinCode = generateJoinCode();
      // Check uniqueness (simple approach)
      const codeCheck = await getDocs(query(collection(db, 'classrooms'), where('joinCode', '==', joinCode)));
      if (!codeCheck.empty) joinCode = generateJoinCode();

      const docRef = await addDoc(collection(db, 'classrooms'), {
        name: newClassroom.name.trim(),
        subject: newClassroom.subject,
        description: newClassroom.description.trim(),
        instructorId: currentUser!.uid,
        joinCode,
        joinCodeActive: true,
        studentCount: 0,
        experimentIds: [],
        coverImageURL: '',
        archived: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      // Upload cover image if selected
      if (coverFile) {
        try {
          const url = await uploadCoverImage(docRef.id, coverFile);
          await setDoc(doc(db, 'classrooms', docRef.id), { coverImageURL: url }, { merge: true });
        } catch (e) { console.warn('Cover upload failed:', e); }
      }
      // Add new classroom to instructor's classroomIds without overwriting existing ones
      await updateDoc(doc(db, 'users', currentUser!.uid), {
        classroomIds: arrayUnion(docRef.id),
        updatedAt: serverTimestamp(),
      });
      setShowCreateModal(false);
      setNewClassroom({ name: '', subject: 'Chemistry', description: '' });
      setCoverFile(null); setCoverPreview(null);
      loadClassrooms();
    } catch (e) { console.error(e); }
    setCreating(false);
  }

  function formatDate(ts: any) {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function statusLabel(status?: string) {
    const s = (status || '').toLowerCase();
    if (s === 'published' || s === 'ready') return 'READY TO PLAY';
    if (s === 'draft') return 'DRAFT';
    return (status || 'Loading...').toUpperCase();
  }

  function statusClasses(status?: string) {
    const s = (status || '').toLowerCase();
    if (s === 'published' || s === 'ready') return 'bg-[#e6fcf9] text-[#0f766e] border border-[#99f6e4]';
    if (s === 'draft') return 'bg-[#fff2f0] text-[#ff8e7a] border border-[#ff8e7a]/20';
    return 'bg-slate-100 text-slate-500 border border-slate-200';
  }

  function experimentCardTone(exp: Experiment) {
    const category = (exp.category || '').toLowerCase();
    if (category.includes('bio')) return { bg: 'bg-[#e6fcf9]', iconClass: 'text-[#0f766e]', icon: 'biotech' };
    if (category.includes('chem')) return { bg: 'bg-[#fffbeb]', iconClass: 'text-yellow-500', icon: 'science' };
    if (category.includes('physics')) return { bg: 'bg-[#fff2f0]', iconClass: 'text-[#ff8e7a]', icon: 'rocket_launch' };
    if (category.includes('earth') || category.includes('environment')) return { bg: 'bg-[#fff2f0]', iconClass: 'text-[#ff8e7a]', icon: 'public' };
    return { bg: 'bg-[#e6fcf9]', iconClass: 'text-[#0f766e]', icon: pickSubjectIcon(exp.category || 'Other', exp.id) };
  }

  function classroomCardTone(subject: string, seed: string) {
    const s = (subject || '').toLowerCase();
    if (s.includes('physics')) return { bg: 'bg-[#e6fcf9]', iconClass: 'text-[#13ecc8]', icon: 'rocket_launch', hoverColor: '#13ecc8', softColor: '#e6fcf9' };
    if (s.includes('bio')) return { bg: 'bg-[#f4f3ff]', iconClass: 'text-indigo-400', icon: 'biotech', hoverColor: '#818cf8', softColor: '#f4f3ff' };
    if (s.includes('chem')) return { bg: 'bg-[#fffbeb]', iconClass: 'text-yellow-500', icon: 'chemistry', hoverColor: '#eab308', softColor: '#fffbeb' };
    if (s.includes('environment')) return { bg: 'bg-[#fff2f0]', iconClass: 'text-[#ff8e7a]', icon: 'public', hoverColor: '#ff8e7a', softColor: '#fff2f0' };
    return { bg: 'bg-[#e6fcf9]', iconClass: 'text-[#13ecc8]', icon: pickSubjectIcon(subject, seed), hoverColor: '#13ecc8', softColor: '#e6fcf9' };
  }

  return (
    <PatternPage className="font-display text-slate-800 antialiased" fontFamily="'Spline Sans', 'Inter', sans-serif">
      <div className="min-h-screen themed-scrollbar overflow-y-auto">
        <MainNav />

        <main className="min-w-0">
          <div className="px-4 py-6 pb-12 sm:px-6 lg:px-8 sm:py-8 sm:pb-14 space-y-10 sm:space-y-12">
            <section id="classrooms">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-slate-900">My Classrooms</h2>
                  <p className="text-slate-500 text-sm mt-1 font-medium">Where the magic happens!</p>
                </div>
                <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-6 py-3 bg-[#ff8e7a] text-white text-sm font-bold rounded-full hover:shadow-lg hover:shadow-[#ff8e7a]/30 transition-all">
                  <span className="material-symbols-outlined text-lg">add</span>
                  New Room
                </button>
              </div>

              {loadingClassrooms ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="bg-white rounded-xl p-6 shadow-sm space-y-5">
                      <div className="aspect-[4/3] rounded-xl skeleton-shimmer" />
                      <div className="h-5 w-2/3 skeleton-shimmer rounded" />
                      <div className="h-4 w-full skeleton-shimmer rounded" />
                    </div>
                  ))}
                </div>
              ) : classrooms.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-100 p-10 text-center">
                  <span className="material-symbols-outlined text-5xl text-slate-300">school</span>
                  <h3 className="mt-3 text-lg font-bold text-slate-900">No classrooms yet</h3>
                  <p className="mt-1 text-sm text-slate-500">Create your first classroom to start organizing students and assigning experiments.</p>
                  <button onClick={() => setShowCreateModal(true)} className="mt-5 px-6 py-3 bg-[#13ecc8] text-white text-sm font-bold rounded-full hover:bg-[#10d7b7] transition-colors">Create Classroom</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
                  {classrooms.map(c => {
                    const tone = classroomCardTone(c.subject, c.id || c.name || c.joinCode);
                    return (
                      <Link
                        key={c.id}
                        to={`/classrooms/${c.id}`}
                        className="bg-white rounded-xl dashboard-bubbly-card p-6 flex flex-col group shadow-sm"
                        style={{
                          ['--card-hover-color' as any]: tone.hoverColor,
                          ['--card-soft-color' as any]: tone.softColor,
                          ['--card-text-color' as any]: tone.hoverColor,
                        }}
                      >
                        <div className={`relative aspect-[4/3] rounded-xl overflow-hidden mb-5 flex items-center justify-center ${c.coverImageURL ? '' : tone.bg}`}>
                          {c.coverImageURL ? (
                            <img src={c.coverImageURL} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                          ) : (
                            <span className={`material-symbols-outlined text-6xl opacity-40 group-hover:scale-110 transition-transform ${tone.iconClass}`}>{tone.icon}</span>
                          )}
                        </div>
                        <h3 className="font-bold text-lg text-slate-900 mb-2 truncate">{c.name}</h3>
                        <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-6">
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm">face</span>
                            <span>{c.studentCount} Friends</span>
                          </div>
                          <span className="bg-slate-50 px-2 py-1 rounded-lg">{c.joinCode}</span>
                        </div>
                        <div className="w-full py-3.5 text-sm font-bold rounded-full text-center dashboard-card-jump-btn">Jump In</div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>

            <section id="experiments">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-slate-900">Fun Experiments</h2>
                  <p className="text-slate-500 text-sm mt-1 font-medium">Pick a topic and start exploring!</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/experiments')}
                  className="px-5 py-2.5 rounded-full bg-white border border-slate-200 text-slate-600 hover:text-[#13ecc8] hover:border-[#13ecc8]/40 transition-all text-sm font-semibold shadow-sm"
                >
                  View all
                </button>
              </div>

              {loadingExperiments ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white rounded-xl p-5 shadow-sm space-y-4 min-w-0">
                      <div className="w-full h-44 rounded-xl skeleton-shimmer" />
                      <div className="h-4 w-1/2 rounded skeleton-shimmer" />
                      <div className="h-3 w-2/3 rounded skeleton-shimmer" />
                    </div>
                  ))}
                </div>
              ) : experiments.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-100 p-10 text-center">
                  <span className="material-symbols-outlined text-5xl text-slate-300">science</span>
                  <h3 className="mt-3 text-lg font-bold text-slate-900">No experiments yet</h3>
                  <p className="mt-1 text-sm text-slate-500">Create your first experiment to get started with AR science content.</p>
                  <button onClick={() => navigate('/experiments')} className="mt-5 px-6 py-3 bg-[#13ecc8] text-white text-sm font-bold rounded-full hover:bg-[#10d7b7] transition-colors">Go to Experiments</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
                  {experiments.map(exp => {
                    const tone = experimentCardTone(exp);
                    return (
                      <Link key={exp.id} to={`/experiment/${exp.id}`} className="block bg-white rounded-xl dashboard-bubbly-card p-5 shadow-sm min-w-0 overflow-hidden">
                        <div className={`w-full h-44 rounded-xl mb-5 flex items-center justify-center overflow-hidden ${tone.bg}`}>
                          <span className={`material-symbols-outlined text-7xl opacity-40 ${tone.iconClass}`}>{tone.icon}</span>
                        </div>
                        <div className="flex items-center justify-between mb-3">
                          <span className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${statusClasses(exp.status)}`}>{statusLabel(exp.status)}</span>
                          <span className="text-[10px] font-bold text-slate-400">{formatDate(exp.updatedAt)}</span>
                        </div>
                        <h4 className="font-bold text-base text-slate-900 mb-1 truncate">{exp.title || 'Untitled Experiment'}</h4>
                        <p className="text-xs font-medium text-slate-500">{exp.category || 'General Science'}</p>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>


          </div>
        </main>

        <AppFooter className="lg:px-8" />
      </div>

        {/* Create Classroom Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 sm:p-6 overflow-y-auto">
            <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
            <div
              className="relative bg-white w-full max-w-xl rounded-[2rem] shadow-2xl overflow-hidden border border-white flex flex-col z-10 min-h-0 my-2"
              style={{ maxHeight: 'calc(var(--app-vh, 1vh) * 100 - 1rem)' }}
            >
              <div className="bg-[#13ecc8]/20 h-40 flex flex-col items-center justify-center relative overflow-hidden shrink-0">
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#13ecc8]/30 rounded-full blur-3xl" />
                <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-[#fc8c78]/20 rounded-full blur-2xl" />
                <div className="w-16 h-16 bg-white rounded-full shadow-lg shadow-[#13ecc8]/50 flex items-center justify-center mb-4 z-10">
                  <span className="material-symbols-outlined text-[#006b59] text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>science</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 z-10 px-8 text-center tracking-tight">Start a New Classroom Adventure</h3>
              </div>

              <div className="p-6 sm:p-10 space-y-6 overflow-y-auto pr-2 flex-1 min-h-0">
                <p className="text-sm font-medium text-slate-600 text-center max-w-sm mx-auto">
                  Classrooms are your digital spaces to organize AR lab sessions, track student discoveries, and share exciting scientific experiments.
                </p>

                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-bold tracking-[0.1em] text-[#006b59] ml-4 mb-2">CLASSROOM NAME</label>
                    <input
                      className="w-full bg-white border-2 border-[#e1eae6] rounded-full px-6 py-4 text-sm font-medium text-slate-900 outline-none focus:border-[#13ecc8] transition-all"
                      placeholder="e.g., Chemistry Grade 10-A"
                      value={newClassroom.name}
                      onChange={e => setNewClassroom({ ...newClassroom, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold tracking-[0.1em] text-[#006b59] ml-4 mb-2">SUBJECT</label>
                    <select
                      className="w-full appearance-none bg-white border-2 border-[#e1eae6] rounded-full px-6 py-4 text-sm font-medium text-slate-900 outline-none focus:border-[#13ecc8] transition-all"
                      value={newClassroom.subject}
                      onChange={e => setNewClassroom({ ...newClassroom, subject: e.target.value })}
                    >
                      {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold tracking-[0.1em] text-[#006b59] ml-4 mb-2">DESCRIPTION <span className="text-slate-400 font-semibold tracking-normal">(Optional)</span></label>
                    <textarea
                      className="w-full px-6 py-4 bg-white border-2 border-[#e1eae6] rounded-3xl text-sm font-medium text-slate-900 outline-none focus:border-[#13ecc8] transition-all"
                      placeholder="Brief description of this classroom..."
                      rows={3}
                      value={newClassroom.description}
                      onChange={e => setNewClassroom({ ...newClassroom, description: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold tracking-[0.1em] text-[#006b59] ml-4 mb-2">COVER IMAGE <span className="text-slate-400 font-semibold tracking-normal">(Optional)</span></label>
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      className="w-full h-32 rounded-3xl border-2 border-dashed border-[#13ecc8]/50 bg-[#f3fbf7] hover:border-[#13ecc8] hover:bg-[#13ecc8]/10 transition-all flex flex-col items-center justify-center gap-2 overflow-hidden relative"
                    >
                      {coverPreview ? (
                        <>
                          <img src={coverPreview} alt="Cover" className="w-full h-full object-cover absolute inset-0" />
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                            <span className="text-white text-sm font-semibold">Change Image</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-slate-400 text-2xl">add_photo_alternate</span>
                          <span className="text-xs text-slate-400">Click to upload cover image</span>
                        </>
                      )}
                    </button>
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) { setCoverFile(f); setCoverPreview(URL.createObjectURL(f)); }
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 sm:px-10 pb-6 sm:pb-10 pt-2 flex items-center justify-between gap-4 bg-white shrink-0 border-t border-[#e1eae6] z-20 mt-auto">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="font-button text-button text-on-surface-variant hover:text-on-surface px-6 py-3 rounded-full transition-colors bubbly-pop"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateClassroom}
                  disabled={creating || !newClassroom.name.trim()}
                  className="bg-[#fc8c78] text-[#742418] font-button text-button px-8 py-4 rounded-full shadow-lg shadow-[#fc8c78]/20 bubbly-pop flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-lg">magic_button</span>
                  Create Classroom
                </button>
              </div>
            </div>
          </div>
        )}
    </PatternPage>
  );
}
