import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  getFirestore, doc, getDoc, updateDoc, deleteDoc,
  collection, query, where, getDocs, addDoc,
  serverTimestamp, arrayUnion, arrayRemove, increment,
} from 'firebase/firestore';
import { useFirebaseApp } from 'reactfire';
import { useAuth } from '../../contexts/AuthContext';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import { uploadCoverImage, generateInitials } from '../../utils/storageHelpers';
import MainNav from '../../components/MainNav';
import PatternPage from '../../components/layout/PatternPage';
import AppFooter from '../../components/layout/AppFooter';
import ConfirmActionModal from '../../components/common/ConfirmActionModal';
import '../../styles/pages/classroom-detail.css';

interface ClassroomData {
  name: string; subject: string; description: string; instructorId: string;
  joinCode: string; joinCodeActive: boolean; studentCount: number;
  experimentIds: string[]; archived: boolean; coverImageURL?: string;
}
interface Member { id: string; displayName: string; email: string; joinedAt: any; status: string; }
interface ExperimentData { id: string; title: string; category: string; status: string; }

// Fix: moved outside component — was being recreated on every render
const SUBJECT_THEME: Record<string, { accent: string; soft: string; mint: string; tagText: string; icon: string }> = {
  Chemistry:              { accent: '#ec5b13', soft: '#ffedd5', mint: '#fff7ed', tagText: '#b45309', icon: 'science' },
  Physics:                { accent: '#2563eb', soft: '#e0f2fe', mint: '#eff6ff', tagText: '#1d4ed8', icon: 'rocket_launch' },
  Biology:                { accent: '#16a34a', soft: '#dcfce7', mint: '#f0fdf4', tagText: '#15803d', icon: 'biotech' },
  'Environmental Science':{ accent: '#0d9488', soft: '#ccfbf1', mint: '#f0fdfa', tagText: '#0f766e', icon: 'eco' },
  'General Science':      { accent: '#6366f1', soft: '#e0e7ff', mint: '#eef2ff', tagText: '#4f46e5', icon: 'category' },
  Other:                  { accent: '#64748b', soft: '#f1f5f9', mint: '#f8fafc', tagText: '#475569', icon: 'school' },
};

const SUBJECTS = ['Chemistry', 'Physics', 'Biology', 'Environmental Science', 'General Science', 'Other'];

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export default function ClassroomDetail() {
  const { classroomId } = useParams<{ classroomId: string }>();
  const app = useFirebaseApp();
  // Fix: memoize Firebase instance — was being recreated on every render
  const db = useMemo(() => getFirestore(app), [app]);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [classroom, setClassroom]               = useState<ClassroomData | null>(null);
  const [members, setMembers]                   = useState<Member[]>([]);
  const [experiments, setExperiments]           = useState<ExperimentData[]>([]);
  const [submissionCounts, setSubmissionCounts] = useState<Record<string, number>>({});
  const [loading, setLoading]                   = useState(true);
  const [activeTab, setActiveTab]               = useState<'students' | 'experiments'>('students');
  const [copiedCode, setCopiedCode]             = useState(false);

  const [showEditModal,   setShowEditModal]   = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean; title: string; message: string;
    confirmLabel: string; danger: boolean; onConfirm: () => void;
  }>({ open: false, title: '', message: '', confirmLabel: 'Confirm', danger: false, onConfirm: () => {} });
  const [editForm, setEditForm] = useState({ name: '', subject: '', description: '' });

  const [availableExperiments, setAvailableExperiments] = useState<ExperimentData[]>([]);
  const [selectedExpIds, setSelectedExpIds]             = useState<string[]>([]);
  const [searchFilter, setSearchFilter]                 = useState('');
  const [editCoverFile, setEditCoverFile]               = useState<File | null>(null);
  const [editCoverPreview, setEditCoverPreview]         = useState<string | null>(null);
  const editCoverRef = useRef<HTMLInputElement>(null);
  // Fix: track object URLs so we can revoke them and prevent memory leaks
  const coverObjectUrlRef = useRef<string | null>(null);

  // Fix: loadExperiments returns a promise and uses Promise.all instead of sequential awaits
  const loadExperiments = useCallback(async (ids: string[]) => {
    const [expSnaps, subSnaps] = await Promise.all([
      Promise.all(ids.map(eid => getDoc(doc(db, 'experiments', eid)))),
      Promise.all(ids.map(eid =>
        getDocs(query(
          collection(db, 'submissions'),
          where('classroomId', '==', classroomId),
          where('experimentId', '==', eid),
        ))
      )),
    ]);

    const exps: ExperimentData[] = [];
    const counts: Record<string, number> = {};
    ids.forEach((eid, i) => {
      if (expSnaps[i].exists()) exps.push({ id: expSnaps[i].id, ...expSnaps[i].data() } as ExperimentData);
      counts[eid] = subSnaps[i].size;
    });
    setExperiments(exps);
    setSubmissionCounts(counts);
  }, [db, classroomId]);

  const loadClassroom = useCallback(async () => {
    const snap = await getDoc(doc(db, 'classrooms', classroomId!));
    if (!snap.exists()) return;
    const data = snap.data() as ClassroomData;
    setClassroom(data);
    setEditForm({ name: data.name, subject: data.subject, description: data.description });
    setEditCoverPreview(data.coverImageURL || null);
    setEditCoverFile(null);
    // Fix: return the experiments promise so loadAll can await it properly
    if (data.experimentIds?.length) return loadExperiments(data.experimentIds);
  }, [db, classroomId, loadExperiments]);

  const loadMembers = useCallback(async () => {
    const snap = await getDocs(collection(db, 'classrooms', classroomId!, 'members'));
    setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Member)));
  }, [db, classroomId]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    // Fix: loadClassroom now returns the loadExperiments promise, so all three
    // settle before setLoading(false) — previously experiments arrived after loading ended
    await Promise.all([loadClassroom(), loadMembers()]);
    setLoading(false);
  }, [loadClassroom, loadMembers]);

  // Fix: added loadAll to deps array
  useEffect(() => {
    if (classroomId) loadAll();
  }, [classroomId, loadAll]);

  // Fix: revoke object URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (coverObjectUrlRef.current) URL.revokeObjectURL(coverObjectUrlRef.current);
    };
  }, []);

  function handleCoverFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    // Fix: revoke previous object URL before creating a new one
    if (coverObjectUrlRef.current) URL.revokeObjectURL(coverObjectUrlRef.current);
    const url = URL.createObjectURL(f);
    coverObjectUrlRef.current = url;
    setEditCoverFile(f);
    setEditCoverPreview(url);
  }

  function copyCode() {
    if (classroom) {
      navigator.clipboard.writeText(classroom.joinCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  }

  async function regenerateCode() {
    const newCode = generateJoinCode();
    await updateDoc(doc(db, 'classrooms', classroomId!), { joinCode: newCode, updatedAt: serverTimestamp() });
    loadClassroom();
  }

  async function toggleCodeActive() {
    if (!classroom) return;
    await updateDoc(doc(db, 'classrooms', classroomId!), { joinCodeActive: !classroom.joinCodeActive, updatedAt: serverTimestamp() });
    loadClassroom();
  }

  async function archiveClassroom() {
    await updateDoc(doc(db, 'classrooms', classroomId!), { archived: true, joinCodeActive: false, updatedAt: serverTimestamp() });
    navigate('/dashboard');
  }

  async function removeMember(member: Member) {
    await Promise.all([
      deleteDoc(doc(db, 'classrooms', classroomId!, 'members', member.id)),
      updateDoc(doc(db, 'classrooms', classroomId!), { studentCount: increment(-1), updatedAt: serverTimestamp() }),
      updateDoc(doc(db, 'users', member.id), { classroomIds: arrayRemove(classroomId) })
        .catch(e => console.warn('Could not update user doc', e)),
    ]);
    loadMembers();
    loadClassroom();
  }

  async function saveEdit() {
    const updates: any = {
      name: editForm.name, subject: editForm.subject,
      description: editForm.description, updatedAt: serverTimestamp(),
    };
    if (editCoverFile) {
      try {
        updates.coverImageURL = await uploadCoverImage(classroomId!, editCoverFile);
      } catch (e) { console.warn('Cover upload failed:', e); }
    }
    await updateDoc(doc(db, 'classrooms', classroomId!), updates);
    setShowEditModal(false);
    loadClassroom();
  }

  async function openAssignModal() {
    const q = query(
      collection(db, 'experiments'),
      where('instructorId', '==', currentUser!.uid),
      where('status', '==', 'published'),
    );
    const snap = await getDocs(q);
    const currentIds = classroom?.experimentIds || [];
    setAvailableExperiments(
      snap.docs
        .map(d => ({ id: d.id, ...d.data() } as ExperimentData))
        .filter(e => !currentIds.includes(e.id)),
    );
    setSelectedExpIds([]);
    setSearchFilter('');
    setShowAssignModal(true);
  }

  async function assignExperiments() {
    // Fix: batch all writes in parallel instead of sequential awaits in a loop
    await Promise.all(
      selectedExpIds.flatMap(eid => {
        const expTitle = availableExperiments.find(e => e.id === eid)?.title || 'New experiment';
        return [
          updateDoc(doc(db, 'classrooms', classroomId!), { experimentIds: arrayUnion(eid), updatedAt: serverTimestamp() }),
          updateDoc(doc(db, 'experiments', eid), { classroomIds: arrayUnion(classroomId!) }),
          ...members.map(student =>
            addDoc(collection(db, 'notifications'), {
              userId: student.id,
              type: 'assignment_assigned',
              title: 'New Experiment Assigned',
              message: `${expTitle} has been assigned to ${classroom?.name}`,
              link: `/classroom/${classroomId}`,
              isRead: false,
              createdAt: serverTimestamp(),
              data: { classroomId, experimentId: eid },
            })
          ),
        ];
      })
    );
    setShowAssignModal(false);
    loadClassroom();
  }

  async function unassignExperiment(eid: string) {
    await Promise.all([
      updateDoc(doc(db, 'classrooms', classroomId!), { experimentIds: arrayRemove(eid), updatedAt: serverTimestamp() }),
      updateDoc(doc(db, 'experiments', eid), { classroomIds: arrayRemove(classroomId!) }),
    ]);
    loadClassroom();
  }

  function formatDate(ts: any) {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  if (loading || !classroom) return (
    <PatternPage fontFamily="'Public Sans', 'Inter', sans-serif">
      <MainNav />
      <main className="max-w-6xl mx-auto p-6 lg:p-10">
        <div className="space-y-6">
          <div className="h-8 rounded w-64 skeleton-shimmer" />
          <div className="h-56 rounded-2xl skeleton-shimmer" />
          <div className="h-72 rounded-2xl skeleton-shimmer" />
        </div>
      </main>
    </PatternPage>
  );

  const subjectTheme = SUBJECT_THEME[classroom.subject] || SUBJECT_THEME.Other;
  const totalExpected = classroom.studentCount * Math.max(experiments.length, 1);
  const totalDone = Object.values(submissionCounts).reduce((sum, val) => sum + val, 0);
  const completionPct = classroom.studentCount > 0 && experiments.length > 0
    ? Math.round((totalDone / totalExpected) * 100)
    : 0;

  return (
    <PatternPage className="text-slate-900 overflow-y-auto" fontFamily="'Public Sans', 'Inter', sans-serif">
      <MainNav />

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row gap-8 items-start mb-12">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border" style={{ backgroundColor: subjectTheme.soft, color: subjectTheme.tagText, borderColor: `${subjectTheme.accent}33` }}>
              <span className="material-symbols-outlined text-sm">{subjectTheme.icon}</span>
              {classroom.subject}
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 leading-tight">{classroom.name}</h1>
            <p className="text-slate-500 max-w-lg mb-6 text-lg">{classroom.description || 'Master the laws of nature through interactive AR simulations and real-time collaboration.'}</p>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl classroom-bubbly-card border border-orange-50">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Enrollment</p>
                <p className="text-2xl font-black text-slate-900">{classroom.studentCount}</p>
              </div>
              <div className="bg-white p-5 rounded-2xl classroom-bubbly-card border border-orange-50">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Experiments</p>
                <p className="text-2xl font-black text-slate-900">{classroom.experimentIds?.length || 0}</p>
              </div>
              <div className="bg-white p-5 rounded-2xl classroom-bubbly-card border border-orange-50">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Completion</p>
                <p className="text-2xl font-black text-slate-900">{completionPct}%</p>
              </div>
            </div>
          </div>

          <div className="w-full md:w-80 rounded-2xl p-8 border relative overflow-hidden" style={{ backgroundColor: subjectTheme.soft, borderColor: `${subjectTheme.accent}22` }}>
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl" style={{ backgroundColor: `${subjectTheme.accent}22` }} />
            <h3 className="text-slate-900 font-bold text-lg mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ color: subjectTheme.accent }}>key</span>
              Class Access Code
            </h3>
            <p className="text-slate-600 text-sm mb-6">Share this code with your students to let them join the block.</p>
            <div className="bg-white rounded-xl p-4 border-2 border-dashed text-center mb-4" style={{ borderColor: `${subjectTheme.accent}4d` }}>
              <span className="text-2xl font-black tracking-widest" style={{ color: subjectTheme.accent }}>{classroom.joinCode}</span>
            </div>
            <div className="flex gap-2 mb-4">
              <button onClick={copyCode} className="flex-1 text-white font-bold py-3 px-4 rounded-full flex items-center justify-center gap-2 transition-all shadow-lg" style={{ backgroundColor: subjectTheme.accent, boxShadow: `0 12px 20px -12px ${subjectTheme.accent}` }}>
                <span className="material-symbols-outlined text-lg">{copiedCode ? 'check' : 'content_copy'}</span>
                {copiedCode ? 'Copied' : 'Copy Code'}
              </button>
              <button onClick={regenerateCode} className="px-3 rounded-full border font-bold text-xs" style={{ borderColor: `${subjectTheme.accent}66`, color: subjectTheme.accent }}>Regenerate</button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={toggleCodeActive} className="text-xs font-bold px-3 py-1 rounded-full" style={{ backgroundColor: classroom.joinCodeActive ? '#dcfce7' : '#f1f5f9', color: classroom.joinCodeActive ? '#166534' : '#475569' }}>
                {classroom.joinCodeActive ? 'Active' : 'Inactive'}
              </button>
              <button onClick={() => setShowEditModal(true)} className="text-xs font-bold px-3 py-1.5 rounded-full text-white" style={{ backgroundColor: subjectTheme.accent }}>Edit</button>
              <button
                onClick={() => setConfirmDialog({ open: true, title: 'Archive Classroom', message: 'Are you sure you want to archive this classroom? Students will no longer be able to access it.', confirmLabel: 'Archive', danger: true, onConfirm: archiveClassroom })}
                className="text-xs font-bold px-3 py-1.5 rounded-full border"
                style={{ borderColor: '#fecaca', color: '#b91c1c', backgroundColor: '#fff1f2' }}
              >Archive</button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex border-b border-slate-100 px-6">
            <button onClick={() => setActiveTab('students')} className="px-6 py-5 border-b-4 font-bold text-sm" style={{ borderColor: activeTab === 'students' ? subjectTheme.accent : 'transparent', color: activeTab === 'students' ? subjectTheme.accent : '#94a3b8' }}>Students</button>
            <button onClick={() => setActiveTab('experiments')} className="px-6 py-5 border-b-4 font-bold text-sm" style={{ borderColor: activeTab === 'experiments' ? subjectTheme.accent : 'transparent', color: activeTab === 'experiments' ? subjectTheme.accent : '#94a3b8' }}>Experiments</button>
          </div>

          {activeTab === 'students' && (
            <div className="p-6 overflow-x-auto">
              {members.length === 0 ? (
                <div className="rounded-xl border border-slate-100 p-6">
                  <EmptyState icon="groups" title="No students yet" description="Share the join code with your students so they can join this classroom." />
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                      <th className="px-4 py-4">Student</th>
                      <th className="px-4 py-4">Joined</th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-4 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {members.map(m => (
                      <tr key={m.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-5">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full flex items-center justify-center font-bold border" style={{ backgroundColor: subjectTheme.mint, color: subjectTheme.accent, borderColor: `${subjectTheme.accent}22` }}>
                              {generateInitials(m.displayName || '', m.email)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{m.displayName || 'Unknown'}</p>
                              <p className="text-xs text-slate-400">{m.email || '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-5 text-sm text-slate-500">{formatDate(m.joinedAt)}</td>
                        <td className="px-4 py-5"><StatusBadge status={m.status || 'active'} /></td>
                        <td className="px-4 py-5 text-right">
                          <button
                            onClick={() => setConfirmDialog({ open: true, title: 'Remove Student', message: `Remove ${m.displayName || 'this student'} from the classroom?`, confirmLabel: 'Remove', danger: true, onConfirm: () => { removeMember(m); setConfirmDialog(p => ({ ...p, open: false })); } })}
                            className="p-2 transition-colors"
                            style={{ color: subjectTheme.accent }}
                          >
                            <span className="material-symbols-outlined">more_vert</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'experiments' && (
            <div className="p-6">
              <div className="flex justify-end mb-5">
                <button onClick={openAssignModal} className="text-white font-bold py-3 px-6 rounded-full transition-all" style={{ backgroundColor: subjectTheme.accent }}>
                  Assign Experiment
                </button>
              </div>

              {experiments.length === 0 ? (
                <div className="rounded-2xl border border-[#bfe9e2] bg-[#f7fcfb] p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-white border border-[#bfe9e2] flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-[#169A92] text-3xl">science</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">No experiments assigned</h3>
                  <p className="text-sm text-slate-600">Assign published experiments from your library to this classroom.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {experiments.map(exp => (
                    <div key={exp.id} className="bg-white rounded-2xl p-5 border border-slate-100 classroom-bubbly-card">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-bold text-slate-900 mb-1">{exp.title || 'Untitled'}</h4>
                          <p className="text-xs text-slate-500">{exp.category || 'Science'}</p>
                        </div>
                        <StatusBadge status={exp.status || 'draft'} />
                      </div>
                      <div className="text-xs text-slate-500 mb-4">{submissionCounts[exp.id] || 0} / {classroom.studentCount} submitted</div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full mb-4">
                        <div className="h-full rounded-full" style={{ backgroundColor: subjectTheme.accent, width: `${classroom.studentCount > 0 ? ((submissionCounts[exp.id] || 0) / classroom.studentCount) * 100 : 0}%` }} />
                      </div>
                      <div className="flex items-center gap-2">
                        <Link to={`/evaluation/${classroomId}/${exp.id}`} className="flex-1 py-2 text-xs font-bold text-white rounded-full text-center transition-colors" style={{ backgroundColor: subjectTheme.accent }}>View Submissions</Link>
                        <Link to={`/experiment/${exp.id}`} className="flex-1 py-2 text-xs font-bold text-slate-700 bg-slate-100 rounded-full hover:bg-slate-200 text-center transition-colors">Open Editor</Link>
                        <button onClick={() => unassignExperiment(exp.id)} className="p-2 text-red-400 hover:text-red-600 transition-colors" title="Unassign">
                          <span className="material-symbols-outlined text-lg">link_off</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-16 flex flex-col items-center justify-center p-12 rounded-2xl border border-dashed" style={{ backgroundColor: `${subjectTheme.soft}88`, borderColor: `${subjectTheme.accent}33` }}>
          <div className="mb-4" style={{ color: subjectTheme.accent }}>
            <span className="material-symbols-outlined !text-6xl">school</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Ready for the next experiment?</h3>
          <p className="text-slate-500 text-center max-w-md mb-6">Explore the mechanics of fluid dynamics with your students in the new AR sandbox.</p>
          <button onClick={() => navigate('/experiments')} className="text-white font-bold py-3 px-10 rounded-full transition-all" style={{ backgroundColor: subjectTheme.accent }}>Launch Experiment Builder</button>
        </div>
      </main>

      <AppFooter className="px-6" />

      {/* Edit Classroom Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />
          <div
            className="relative bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden border border-white flex flex-col z-10 min-h-0 my-2"
            // Fix: replaced calc(var(--app-vh) * 100) with dvh/vh — immune to first-paint bug
            style={{ maxHeight: 'min(calc(100dvh - 1rem), calc(100vh - 1rem))' }}
          >
            <div className="h-28 sm:h-32 px-8 flex items-center justify-between shrink-0" style={{ backgroundColor: `${subjectTheme.accent}1a` }}>
              <h3 className="text-2xl font-bold text-slate-900">Edit Classroom</h3>
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                <span className="material-symbols-outlined" style={{ color: subjectTheme.accent }}>edit_square</span>
              </div>
            </div>
            <div className="p-6 sm:p-8 space-y-5 overflow-y-auto flex-1 min-h-0">
              <div>
                <label className="block text-[10px] font-bold tracking-[0.1em] mb-2 ml-4" style={{ color: subjectTheme.tagText }}>CLASSROOM NAME</label>
                <input className="w-full px-6 py-4 bg-white border-2 border-slate-200 rounded-full text-sm font-medium text-slate-900 outline-none transition-all" style={{ borderColor: `${subjectTheme.accent}33` }} value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-[0.1em] mb-2 ml-4" style={{ color: subjectTheme.tagText }}>SUBJECT</label>
                <select className="w-full px-6 py-4 bg-white border-2 border-slate-200 rounded-full text-sm font-medium text-slate-900 outline-none transition-all" style={{ borderColor: `${subjectTheme.accent}33` }} value={editForm.subject} onChange={e => setEditForm({ ...editForm, subject: e.target.value })}>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-[0.1em] mb-2 ml-4" style={{ color: subjectTheme.tagText }}>DESCRIPTION</label>
                <textarea className="w-full px-6 py-4 bg-white border-2 border-slate-200 rounded-3xl text-sm font-medium text-slate-900 outline-none transition-all" style={{ borderColor: `${subjectTheme.accent}33` }} rows={3} value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-[0.1em] mb-2 ml-4" style={{ color: subjectTheme.tagText }}>COVER IMAGE</label>
                <button
                  type="button"
                  onClick={() => editCoverRef.current?.click()}
                  className="w-full h-32 rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-1 overflow-hidden relative"
                  style={{ borderColor: `${subjectTheme.accent}66`, backgroundColor: `${subjectTheme.accent}0d` }}
                >
                  {editCoverPreview ? (
                    <>
                      <img src={editCoverPreview} alt="Cover" className="w-full h-full object-cover absolute inset-0" />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <span className="text-white text-sm font-semibold">Change Image</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-slate-400 text-xl">add_photo_alternate</span>
                      <span className="text-xs text-slate-500">Upload cover</span>
                    </>
                  )}
                </button>
                {/* Fix: use handleCoverFileChange to revoke previous object URL */}
                <input ref={editCoverRef} type="file" accept="image/*" className="hidden" onChange={handleCoverFileChange} />
              </div>
            </div>
            <div className="px-6 sm:px-8 pb-6 sm:pb-8 pt-3 flex justify-end gap-3 border-t border-slate-100 bg-white shrink-0 sticky bottom-0">
              <button onClick={() => setShowEditModal(false)} className="px-5 py-3 rounded-full border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={saveEdit} className="px-7 py-3 rounded-full text-sm font-bold text-white shadow-lg" style={{ backgroundColor: subjectTheme.accent, boxShadow: `0 12px 20px -12px ${subjectTheme.accent}` }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Experiment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAssignModal(false)} />
          <div
            className="relative bg-white rounded-[2rem] shadow-2xl max-w-xl w-full z-10 flex flex-col overflow-hidden my-2"
            // Fix: replaced calc(var(--app-vh) * 100) with dvh/vh
            style={{ maxHeight: 'min(calc(100dvh - 1rem), calc(100vh - 1rem))' }}
          >
            <div className="h-24 px-8 flex items-center justify-between shrink-0" style={{ backgroundColor: `${subjectTheme.accent}1a` }}>
              <h3 className="text-xl font-bold text-slate-900">Assign Experiments</h3>
              <span className="material-symbols-outlined" style={{ color: subjectTheme.accent }}>assignment</span>
            </div>
            <div className="p-6 sm:p-8 flex-1 min-h-0 overflow-y-auto">
              <input className="w-full px-5 py-3 bg-white border-2 rounded-full text-sm mb-4 outline-none" style={{ borderColor: `${subjectTheme.accent}33` }} placeholder="Search experiments..." value={searchFilter} onChange={e => setSearchFilter(e.target.value)} />
              <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                {availableExperiments
                  .filter(e => e.title?.toLowerCase().includes(searchFilter.toLowerCase()))
                  .map(exp => (
                    <label key={exp.id} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 cursor-pointer border border-transparent">
                      <input type="checkbox" className="rounded h-4 w-4" checked={selectedExpIds.includes(exp.id)} onChange={e => setSelectedExpIds(e.target.checked ? [...selectedExpIds, exp.id] : selectedExpIds.filter(id => id !== exp.id))} />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{exp.title}</p>
                        <p className="text-xs text-slate-500">{exp.category}</p>
                      </div>
                    </label>
                  ))
                }
                {availableExperiments.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-8">No published experiments available to assign.</p>
                )}
              </div>
            </div>
            <div className="px-6 sm:px-8 pb-6 sm:pb-8 pt-2 flex justify-end gap-3 border-t border-slate-100 bg-white shrink-0 sticky bottom-0">
              <button onClick={() => setShowAssignModal(false)} className="px-5 py-3 rounded-full border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={assignExperiments} disabled={selectedExpIds.length === 0} className="px-7 py-3 rounded-full text-sm font-bold text-white disabled:opacity-50" style={{ backgroundColor: subjectTheme.accent }}>Assign Selected ({selectedExpIds.length})</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmActionModal
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        danger={confirmDialog.danger}
        accentColor={subjectTheme.accent}
        onConfirm={() => {
          confirmDialog.onConfirm();
          setConfirmDialog(p => ({ ...p, open: false }));
        }}
        onCancel={() => setConfirmDialog(p => ({ ...p, open: false }))}
      />
    </PatternPage>
  );
}