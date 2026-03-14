import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getFirestore, collection, query, where, orderBy, getDocs, doc, getDoc, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { useFirebaseApp } from 'reactfire';
import { useAuth } from '../../contexts/AuthContext';
import TopBar from '../../components/TopBar';
import { generateInitials } from '../../utils/storageHelpers';

interface Submission {
  id: string; studentId: string; studentName: string; studentEmail: string;
  submittedAt: any; status: string; quizScore: number; quizTotal: number;
  quizAnswers: { question: string; answer: string; correct: boolean; correctAnswer?: string }[];
  completedSteps: number; totalSteps: number; completionPercentage: number;
  variables: Record<string, string>; recordingUrl: string;
  instructorFeedback: string; grade: string;
}

interface ClassroomData { name: string; subject: string; studentCount: number; }
interface ExperimentData { title: string; category: string; }

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending:        { bg: 'bg-amber-50',   text: 'text-amber-600',   label: 'Pending'       },
  submitted:      { bg: 'bg-cyan-50',    text: 'text-cyan-600',    label: 'Submitted'     },
  graded:         { bg: 'bg-emerald-50', text: 'text-emerald-600', label: 'Graded'        },
  correct:        { bg: 'bg-green-50',   text: 'text-green-600',   label: 'Correct'       },
  incorrect:      { bg: 'bg-red-50',     text: 'text-red-600',     label: 'Incorrect'     },
  needs_revision: { bg: 'bg-rose-50',    text: 'text-rose-600',    label: 'Needs Revision'},
  in_progress:    { bg: 'bg-blue-50',    text: 'text-blue-600',    label: 'In Progress'   },
};

export default function EvaluationPage() {
  const { classroomId, experimentId } = useParams<{ classroomId: string; experimentId: string }>();
  const app = useFirebaseApp();
  const db = getFirestore(app);
  const { currentUser } = useAuth();

  const [classroom, setClassroom] = useState<ClassroomData | null>(null);
  const [experiment, setExperiment] = useState<ExperimentData | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'graded'>('all');
  const [saving, setSaving] = useState(false);

  // Sidebar Interactivity State
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('evaluation_sidebar_width');
    return saved ? parseInt(saved) : 384; // default 384px (w-96)
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('evaluation_sidebar_collapsed') === 'true';
  });
  const [isResizing, setIsResizing] = useState(false);

  const [gradeStatus, setGradeStatus] = useState('pending');
  const [feedback, setFeedback]       = useState('');
  const [gradeText, setGradeText]     = useState('');   // e.g. "85%" or "A"

  useEffect(() => { loadAll(); }, [classroomId, experimentId]);

  async function loadAll() {
    setLoading(true);
    try {
      // Load classroom
      if (classroomId) {
        const cSnap = await getDoc(doc(db, 'classrooms', classroomId));
        if (cSnap.exists()) setClassroom(cSnap.data() as ClassroomData);
        const membersSnap = await getDocs(collection(db, 'classrooms', classroomId, 'members'));
        setTotalStudents(membersSnap.size || (cSnap.data() as ClassroomData)?.studentCount || 0);
      }
      // Load experiment
      if (experimentId) {
        const eSnap = await getDoc(doc(db, 'experiments', experimentId));
        if (eSnap.exists()) setExperiment(eSnap.data() as ExperimentData);
      }
      // Load submissions
      if (classroomId && experimentId) {
        const q = query(
          collection(db, 'submissions'),
          where('classroomId', '==', classroomId),
          where('experimentId', '==', experimentId)
        );
        const snap = await getDocs(q);
        const subs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Submission));
        
        // Sort in memory to avoid needing a composite index
        subs.sort((a, b) => {
          const tA = a.submittedAt?.toMillis ? a.submittedAt.toMillis() : new Date(a.submittedAt).getTime();
          const tB = b.submittedAt?.toMillis ? b.submittedAt.toMillis() : new Date(b.submittedAt).getTime();
          return tB - tA;
        });

        setSubmissions(subs);
        if (subs.length > 0) {
          setSelectedId(subs[0].id);
          setGradeStatus(subs[0].status || 'pending');
          setFeedback(subs[0].instructorFeedback || '');
        }
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  function selectSubmission(sub: Submission) {
    setSelectedId(sub.id);
    setGradeStatus(sub.status || 'pending');
    setFeedback(sub.instructorFeedback || '');
    setGradeText(sub.grade || '');
  }

  async function saveGrade() {
    if (!selectedId || !selected) return;
    setSaving(true);
    try {
      // When explicitly grading, mark status as 'graded' so the student apps
      // can distinguish a graded submission from one merely submitted.
      const finalStatus = gradeStatus === 'pending' && gradeText ? 'graded' : gradeStatus;
      await updateDoc(doc(db, 'submissions', selectedId), {
        status:            finalStatus,
        grade:             gradeText,            // instructor-authored grade text
        instructorFeedback: feedback,
        updatedAt:         serverTimestamp(),
      });

      // Create notification for the student
      if (finalStatus === 'graded' || finalStatus === 'correct' || finalStatus === 'incorrect' || finalStatus === 'needs_revision') {
        await addDoc(collection(db, 'notifications'), {
          userId: selected.studentId,
          type: 'grade_received',
          title: 'Experiment Graded',
          message: `Your submission for ${experiment?.title} has been graded: ${gradeText || finalStatus}`,
          link: `/classroom/${classroomId}`, 
          isRead: false,
          createdAt: serverTimestamp(),
          data: { classroomId, experimentId, submissionId: selectedId }
        });
      }

      setSubmissions(prev =>
        prev.map(s =>
          s.id === selectedId
            ? { ...s, status: finalStatus, grade: gradeText, instructorFeedback: feedback }
            : s
        )
      );
      setGradeStatus(finalStatus);
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  useEffect(() => {
    if (!isResizing) return;

    function handleMouseMove(e: MouseEvent) {
      const newWidth = Math.max(260, Math.min(600, e.clientX));
      setSidebarWidth(newWidth);
    }

    function handleMouseUp() {
      setIsResizing(false);
      localStorage.setItem('evaluation_sidebar_width', sidebarWidth.toString());
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, sidebarWidth]);

  function toggleSidebar() {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    localStorage.setItem('evaluation_sidebar_collapsed', newState.toString());
  }

  function formatDate(ts: any) {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  const filteredSubmissions = submissions.filter(s => {
    // 'pending' tab includes ungraded submissions and newly submitted ones
    if (filterTab === 'pending') return s.status === 'pending' || s.status === 'submitted' || !s.status;
    if (filterTab === 'graded')  return s.status === 'graded' || s.status === 'correct' || s.status === 'incorrect';
    return true;
  });

  const selected = submissions.find(s => s.id === selectedId) || null;
  const statusStyle = (s: string) => STATUS_STYLES[s?.toLowerCase()?.replace(/\s+/g, '_')] || STATUS_STYLES.pending;

  if (loading) return (
    <div className="dark">
      <div className="bg-background-light dark:bg-background-dark min-h-screen flex flex-col text-slate-900 dark:text-slate-100" style={{ fontFamily: "'Inter', sans-serif" }}>
        <TopBar />
        <div className="flex flex-1 overflow-hidden">
          <aside className="w-96 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4">
            <div className="h-8 w-1/2 rounded skeleton-shimmer" />
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-20 rounded-lg skeleton-shimmer opacity-50" />
            ))}
          </aside>
          <main className="flex-1 p-8 space-y-6">
             <div className="h-64 rounded-xl skeleton-shimmer" />
             <div className="grid grid-cols-3 gap-6">
               <div className="col-span-2 h-48 rounded-xl skeleton-shimmer" />
               <div className="h-48 rounded-xl skeleton-shimmer" />
             </div>
          </main>
        </div>
      </div>
    </div>
  );

  return (
    <div className="dark">
      <div className="bg-background-light dark:bg-background-dark font-display min-h-screen flex flex-col text-slate-900 dark:text-slate-100" style={{ fontFamily: "'Inter', sans-serif" }}>
        <TopBar />

        <main className="flex flex-1 overflow-hidden relative" style={{ height: 'calc(100vh - 65px)' }}>
          {/* Left Panel — Submission List */}
          <aside 
            className={`border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0 transition-[width,transform] duration-300 ease-in-out relative ${isSidebarCollapsed ? '-translate-x-full' : 'translate-x-0'}`}
            style={{ width: isSidebarCollapsed ? '0' : `${sidebarWidth}px` }}
          >
            <div className={`flex flex-col h-full w-full ${isSidebarCollapsed ? 'invisible opacity-0' : 'visible opacity-100'}`} style={{ width: `${sidebarWidth}px` }}>
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex flex-col">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">Submissions</h3>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{submissions.length} total</span>
                </div>
                <button 
                  onClick={toggleSidebar}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
                  title="Collapse Sidebar"
                >
                  <span className="material-symbols-outlined text-xl">menu_open</span>
                </button>
              </div>
              
              <div className="p-4 bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-800">
                <div className="flex gap-2">
                  {(['all', 'pending', 'graded'] as const).map(tab => (
                    <button 
                      key={tab} 
                      onClick={() => setFilterTab(tab)} 
                      className={`flex-1 text-[10px] font-bold py-1.5 px-2 rounded-md capitalize transition-all ${
                        filterTab === tab 
                          ? 'bg-primary text-white shadow-md' 
                          : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
            <div className="flex-1 overflow-y-auto">
              {filteredSubmissions.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">No submissions found.</div>
              ) : (
                filteredSubmissions.map(sub => {
                  const ss = statusStyle(sub.status);
                  return (
                    <div 
                      key={sub.id} 
                      onClick={() => selectSubmission(sub)} 
                      className={`p-4 border-b border-slate-100 dark:border-slate-800 cursor-pointer transition-colors ${
                        selectedId === sub.id 
                          ? 'bg-primary/5 dark:bg-primary/10 border-l-4 border-l-primary' 
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800 border-l-4 border-l-transparent'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{sub.studentName || 'Unknown Student'}</span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${ss.text} ${ss.bg} dark:bg-opacity-20 px-1.5 py-0.5 rounded`}>{ss.label}</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{classroom?.name || 'Classroom'}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                          <span className="material-symbols-outlined text-sm">quiz</span>
                          <span className="text-xs font-medium">{sub.quizScore ?? '—'}/{sub.quizTotal ?? '—'}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">{formatDate(sub.submittedAt)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </aside>

          {/* Resize Handle */}
          {!isSidebarCollapsed && (
            <div 
              onMouseDown={() => setIsResizing(true)}
              className={`w-1 hover:w-1.5 cursor-col-resize bg-transparent hover:bg-primary transition-all relative z-10 flex-shrink-0 ${isResizing ? 'bg-primary w-1.5' : ''}`}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-8 bg-slate-300 dark:bg-slate-700 rounded-full opacity-0 hover:opacity-100 transition-opacity" />
            </div>
          )}

          {/* Floating Expand Button when collapsed */}
          {isSidebarCollapsed && (
            <button 
              onClick={toggleSidebar}
              className="absolute left-4 top-4 z-20 size-10 bg-primary text-white rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all flex items-center justify-center group"
            >
              <span className="material-symbols-outlined group-hover:rotate-180 transition-transform">menu_open</span>
            </button>
          )}

          {/* Right Panel — Detail Workspace */}
          <section className="flex-1 flex flex-col overflow-y-auto bg-background-light dark:bg-background-dark p-6">
            {!selected ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
                <span className="material-symbols-outlined text-5xl mb-4">assignment</span>
                <p className="font-medium">{submissions.length === 0 ? 'No submissions yet for this experiment' : 'Select a submission to view details'}</p>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-1 text-sm text-slate-500 dark:text-slate-400">
                      <Link to="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link>
                      <span className="material-symbols-outlined text-xs">chevron_right</span>
                      <Link to={`/classrooms/${classroomId}`} className="hover:text-primary transition-colors">{classroom?.name || 'Classroom'}</Link>
                      <span className="material-symbols-outlined text-xs">chevron_right</span>
                      <span className="text-primary font-medium">{selected.studentName}</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Submission Review: {experiment?.title || 'Experiment'}</h1>
                  </div>
                  <div className="flex items-center gap-3">
                    {(() => {
                      const idx = filteredSubmissions.findIndex(s => s.id === selectedId);
                      return <>
                        <button 
                          onClick={() => idx > 0 && selectSubmission(filteredSubmissions[idx - 1])} 
                          disabled={idx <= 0} 
                          className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-semibold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-all shadow-sm"
                        >
                          Previous
                        </button>
                        <button 
                          onClick={() => idx < filteredSubmissions.length - 1 && selectSubmission(filteredSubmissions[idx + 1])} 
                          disabled={idx >= filteredSubmissions.length - 1} 
                          className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-semibold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-all shadow-sm"
                        >
                          Next
                        </button>
                      </>;
                    })()}
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Row 1: The Workspace (Viewer / Recording) */}
                  <div className="space-y-6">
                    {/* WebGL Submission Preview — shown when stateJson is present */}
                    {(selected as any).stateJson && (
                      <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 shadow-xl" style={{ aspectRatio: '16/9' }}>
                        <div className="relative w-full h-full">
                          <iframe
                            title="Submission Preview"
                            src="/renderer/index.html"
                            className="w-full h-full border-0"
                            allow="camera; microphone"
                            onLoad={(e) => {
                              // Send the serialised scene state to the WebGL viewer
                              const frame = e.currentTarget as HTMLIFrameElement;
                              frame.contentWindow?.postMessage({
                                type: 'load_submission_state',
                                stateJson: (selected as any).stateJson,
                              }, '*');
                            }}
                          />
                          <div className="absolute top-4 left-4">
                            <span className="bg-black/60 backdrop-blur text-white text-xs font-semibold px-4 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                              <span className="material-symbols-outlined text-sm text-primary">view_in_ar</span>
                              Submission Preview
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Recording Player — shown when recordingUrl is present */}
                    {selected.recordingUrl && (
                      <div className="bg-slate-900 rounded-xl overflow-hidden aspect-video relative shadow-xl border border-slate-200 dark:border-slate-800">
                        <video className="w-full h-full object-cover" src={selected.recordingUrl} controls />
                        <div className="absolute top-4 left-4">
                          <span className="bg-black/50 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-medium border border-white/10 flex items-center gap-2">
                            <span className="size-2 bg-red-500 rounded-full" /> AR Recording
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Row 2: Evaluation Info Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Review Column */}
                    <div className="lg:col-span-2 space-y-6">
                      {/* Grading Card */}
                      <div className="bg-white dark:bg-slate-900 rounded-xl border-2 border-primary/20 p-6 shadow-xl shadow-primary/5">
                        <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary">grading</span>
                          Evaluation
                        </h3>
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-semibold mb-1.5 text-slate-700 dark:text-slate-300">Status</label>
                              <select
                                value={gradeStatus}
                                onChange={e => setGradeStatus(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-primary focus:border-primary text-slate-900 dark:text-slate-100"
                              >
                                <option value="submitted">Submitted — Awaiting Review</option>
                                <option value="graded">Graded</option>
                                <option value="correct">Correct</option>
                                <option value="incorrect">Incorrect</option>
                                <option value="needs_revision">Needs Revision</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-semibold mb-1.5 text-slate-700 dark:text-slate-300">
                                Grade <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">(e.g. 85%, A, Pass)</span>
                              </label>
                              <input
                                type="text"
                                value={gradeText}
                                onChange={e => setGradeText(e.target.value)}
                                placeholder="Enter grade..."
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary outline-none text-slate-900 dark:text-slate-100"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold mb-1.5 text-slate-700 dark:text-slate-300">Instructor Feedback</label>
                            <textarea
                              value={feedback}
                              onChange={e => setFeedback(e.target.value)}
                              className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-primary focus:border-primary placeholder:text-slate-400 text-slate-900 dark:text-slate-100"
                              placeholder="Provide constructive feedback..."
                              rows={4}
                            />
                          </div>
                          <button
                            onClick={saveGrade}
                            disabled={saving}
                            className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-lg shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                          >
                            {saving ? (
                              <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                            ) : (
                              <><span className="material-symbols-outlined">save</span> Submit Grade</>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Quiz Results */}
                      {selected.quizAnswers && selected.quizAnswers.length > 0 && (
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">quiz</span> Quiz Performance
                            <span className="ml-auto text-sm font-medium text-slate-500 dark:text-slate-400">Score: {selected.quizScore}/{selected.quizTotal}</span>
                          </h3>
                          <div className="space-y-4">
                            {selected.quizAnswers.map((qa, i) => (
                              <div key={i} className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/50">
                                <div className="flex justify-between mb-2">
                                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Q{i + 1}: {qa.question}</p>
                                  <span className={`material-symbols-outlined ${qa.correct ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {qa.correct ? 'check_circle' : 'cancel'}
                                  </span>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-400 italic">&ldquo;{qa.answer}&rdquo;</p>
                                {!qa.correct && qa.correctAnswer && (
                                  <p className="text-xs text-rose-500 mt-2 font-medium">Correct answer: {qa.correctAnswer}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Context / Student Sidebar Column */}
                    <div className="space-y-6">
                      {/* Student Info */}
                      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                        <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Student Info</h3>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="size-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm font-bold border border-slate-200 dark:border-slate-700">
                            {generateInitials(selected.studentName || '', selected.studentEmail)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-slate-100">{selected.studentName || 'Unknown'}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[150px]">{selected.studentEmail || classroom?.name || '—'}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                          <div>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">Progress</p>
                            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{selected.completionPercentage || 0}% Complete</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">Quiz Score</p>
                            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{selected.quizScore ?? '—'}/{selected.quizTotal ?? '—'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Experiment State / Progress */}
                      {(selected.completedSteps || selected.totalSteps) && (
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                          <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-lg">analytics</span> Progress Details
                          </h3>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-slate-600 dark:text-slate-400">{selected.completedSteps || 0} / {selected.totalSteps || 0} Steps</span>
                            <span className="text-xs font-bold text-primary">{selected.completionPercentage || 0}%</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mb-4">
                            <div className="bg-primary h-full transition-all" style={{ width: `${selected.completionPercentage || 0}%` }} />
                          </div>
                          
                          {selected.variables && Object.keys(selected.variables).length > 0 && (
                            <div className="space-y-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold mb-1">Variables</p>
                              {Object.entries(selected.variables).map(([key, val]) => (
                                <div key={key} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 rounded-lg px-2 py-1.5 border border-slate-100 dark:border-slate-800/50">
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{key}</span>
                                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{val}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
