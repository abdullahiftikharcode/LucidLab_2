import React, { useState, useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getFirestore, collection, query, where, getDocs, doc, getDoc, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { useFirebaseApp } from 'reactfire';
import { useAuth } from '../../contexts/AuthContext';
import MainNav from '../../components/MainNav';
import PatternPage from '../../components/layout/PatternPage';
import AppFooter from '../../components/layout/AppFooter';
import { generateInitials } from '../../utils/storageHelpers';
import '../../styles/pages/evaluation.css';

interface SceneSubmission {
  sceneKey?: string;
  sceneName?: string;
  status?: string;
  grade?: string;
  instructorFeedback?: string;
  completionPct?: number;
  completionPercentage?: number;
  variables?: Record<string, string>;
  experimentState?: {
    completionPercentage?: number;
    variables?: Record<string, string>;
    completedSteps?: number;
    totalSteps?: number;
  };
  stateJson?: string;
  quizScore?: number;
  quizTotal?: number;
  submittedAt?: any;
  updatedAt?: any;
}

interface SceneSummary {
  totalSceneCount: number;
  submittedWaitingCount: number;
  gradedCount: number;
  needsRevisionCount: number;
  inProgressCount: number;
  submittedOrDoneCount: number;
  averageCompletionPct?: number;
}

interface Submission {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  submittedAt: any;
  status: string;
  quizScore: number;
  quizTotal: number;
  quizAnswers: { question: string; answer: string; correct: boolean; correctAnswer?: string }[];
  completedSteps: number;
  totalSteps: number;
  completionPercentage: number;
  completionPct?: number;
  variables: Record<string, string>;
  recordingUrl: string;
  experimentState?: {
    completionPercentage?: number;
    variables?: Record<string, string>;
    completedSteps?: number;
    totalSteps?: number;
  };
  stateJson?: string;
  instructorFeedback: string;
  grade: string;
  sceneSubmissions?: Record<string, SceneSubmission>;
  sceneSummary?: SceneSummary;
  totalSceneCount?: number;
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

function normalizeStatus(status?: string) {
  const s = String(status || '').trim().toLowerCase();
  if (!s) return 'in_progress';
  if (s === 'in progress') return 'in_progress';
  if (s === 'needs revision') return 'needs_revision';
  return s;
}

function clampPct(value: any) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function createSyntheticScene(sub: Submission): { key: string; scene: SceneSubmission } {
  const sceneName = ((sub as any).sceneName && String((sub as any).sceneName).trim()) || 'Scene';
  return {
    key: 'default_scene',
    scene: {
      sceneKey: 'default_scene',
      sceneName,
      status: sub.status || 'submitted',
      grade: sub.grade || '',
      instructorFeedback: sub.instructorFeedback || '',
      completionPct: sub.completionPercentage ?? sub.completionPct ?? sub.experimentState?.completionPercentage ?? 0,
      completionPercentage: sub.completionPercentage ?? sub.completionPct ?? sub.experimentState?.completionPercentage ?? 0,
      variables: sub.variables || sub.experimentState?.variables || {},
      experimentState: sub.experimentState,
      stateJson: sub.stateJson,
      quizScore: sub.quizScore,
      quizTotal: sub.quizTotal,
      submittedAt: sub.submittedAt,
      updatedAt: sub.submittedAt,
    },
  };
}

function getSceneEntries(sub: Submission): Array<{ key: string; scene: SceneSubmission }> {
  if (sub.sceneSubmissions && typeof sub.sceneSubmissions === 'object') {
    const keys = Object.keys(sub.sceneSubmissions);
    if (keys.length > 0) {
      return keys
        .map((key) => ({
          key,
          scene: {
            ...sub.sceneSubmissions![key],
            sceneKey: sub.sceneSubmissions![key]?.sceneKey || key,
            sceneName: sub.sceneSubmissions![key]?.sceneName || decodeURIComponent(key),
          },
        }))
        .sort((a, b) => String(a.scene.sceneName || '').localeCompare(String(b.scene.sceneName || '')));
    }
  }
  return [createSyntheticScene(sub)];
}

function summarizeSceneEntries(entries: Array<{ key: string; scene: SceneSubmission }>, totalSceneCountHint?: number): SceneSummary {
  let submittedWaitingCount = 0;
  let gradedCount = 0;
  let needsRevisionCount = 0;
  let completionTotal = 0;
  let completionCount = 0;

  entries.forEach(({ scene }) => {
    const status = normalizeStatus(scene.status);
    if (status === 'submitted') submittedWaitingCount += 1;
    else if (status === 'graded' || status === 'correct' || status === 'incorrect') gradedCount += 1;
    else if (status === 'needs_revision') needsRevisionCount += 1;

    const pct = scene.completionPct ?? scene.completionPercentage ?? scene.experimentState?.completionPercentage;
    const num = Number(pct);
    if (Number.isFinite(num)) {
      completionTotal += Math.max(0, Math.min(100, num));
      completionCount += 1;
    }
  });

  const submittedOrDoneCount = submittedWaitingCount + gradedCount + needsRevisionCount;
  const rawTotal = Number(totalSceneCountHint ?? entries.length);
  const totalSceneCount = Number.isFinite(rawTotal) && rawTotal > 0 ? Math.round(rawTotal) : Math.max(1, entries.length);
  const inProgressCount = Math.max(0, totalSceneCount - submittedOrDoneCount);

  return {
    totalSceneCount,
    submittedWaitingCount,
    gradedCount,
    needsRevisionCount,
    inProgressCount,
    submittedOrDoneCount,
    averageCompletionPct: completionCount > 0 ? Math.round(completionTotal / completionCount) : 0,
  };
}

function deriveSubmissionStatus(sub: Submission, summary?: SceneSummary) {
  const effectiveSummary = summary || summarizeSceneEntries(getSceneEntries(sub), sub.totalSceneCount);
  if (effectiveSummary.needsRevisionCount > 0) return 'needs_revision';
  if (effectiveSummary.submittedOrDoneCount < effectiveSummary.totalSceneCount) return 'in_progress';
  if (effectiveSummary.submittedWaitingCount > 0) return 'submitted';
  if (effectiveSummary.gradedCount >= effectiveSummary.totalSceneCount) return 'graded';
  return normalizeStatus(sub.status);
}

function sceneSummaryText(summary: SceneSummary) {
  const base = `${summary.submittedOrDoneCount}/${summary.totalSceneCount} scenes submitted`;
  if (summary.needsRevisionCount > 0) return `${base} • ${summary.needsRevisionCount} need revision`;
  if (summary.submittedWaitingCount > 0) return `${base} • awaiting review`;
  if (summary.gradedCount >= summary.totalSceneCount) return `${base} • fully graded`;
  return base;
}

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

  const [selectedSceneKey, setSelectedSceneKey] = useState<string>('');
  const [gradeStatus, setGradeStatus] = useState('pending');
  const [feedback, setFeedback]       = useState('');
  const [gradeText, setGradeText]     = useState('');   // e.g. "85%" or "A"

  useEffect(() => { loadAll(); }, [classroomId, experimentId]);

  function hydrateEditorFromSubmission(sub: Submission | null, preferredSceneKey?: string) {
    if (!sub) {
      setSelectedSceneKey('');
      setGradeStatus('pending');
      setFeedback('');
      setGradeText('');
      return;
    }

    const entries = getSceneEntries(sub);
    const resolvedKey = preferredSceneKey && entries.some((entry) => entry.key === preferredSceneKey)
      ? preferredSceneKey
      : (entries[0]?.key || '');

    const scene = entries.find((entry) => entry.key === resolvedKey)?.scene;
    const status = normalizeStatus(scene?.status || sub.status || 'submitted');

    setSelectedSceneKey(resolvedKey);
    setGradeStatus(status);
    setFeedback(scene?.instructorFeedback ?? sub.instructorFeedback ?? '');
    setGradeText(scene?.grade ?? sub.grade ?? '');
  }

  async function loadAll() {
    setLoading(true);
    try {
      // Load classroom
      if (classroomId) {
        const cSnap = await getDoc(doc(db, 'classrooms', classroomId));
        if (cSnap.exists()) setClassroom(cSnap.data() as ClassroomData);

        const memberLookup = {} as Record<string, { displayName?: string; email?: string }>;
        try {
          const membersSnap = await getDocs(collection(db, 'classrooms', classroomId, 'members'));
          setTotalStudents(membersSnap.size || (cSnap.data() as ClassroomData)?.studentCount || 0);
          membersSnap.forEach((memberDoc) => {
            const data = memberDoc.data() as any;
            const uid = data.uid || memberDoc.id;
            if (!uid) return;
            memberLookup[uid] = {
              displayName: data.displayName,
              email: data.email,
            };
          });
        } catch (memberError) {
          console.warn('Failed to load classroom members, continuing with submission fallback fields.', memberError);
          setTotalStudents((cSnap.data() as ClassroomData)?.studentCount || 0);
        }

        if (classroomId && experimentId) {
          const q = query(
            collection(db, 'submissions'),
            where('classroomId', '==', classroomId),
            where('experimentId', '==', experimentId)
          );
          const snap = await getDocs(q);
          const subs = snap.docs.map(d => {
            const raw = d.data() as any;
            const member = raw.studentId ? memberLookup[raw.studentId] : undefined;
            const normalizedCompletion = Number(
              raw.completionPercentage ?? raw.completionPct ?? raw.experimentState?.completionPercentage ?? 0
            );

            const baseSubmission = {
              id: d.id,
              ...raw,
              submittedAt: raw.submittedAt ?? raw.updatedAt ?? null,
              status: normalizeStatus(raw.status || 'submitted'),
              studentName: raw.studentName || member?.displayName || 'Unknown Student',
              studentEmail: raw.studentEmail || member?.email || '',
              completionPercentage: Number.isFinite(normalizedCompletion) ? normalizedCompletion : 0,
              variables: raw.variables || raw.experimentState?.variables || {},
              sceneSubmissions: raw.sceneSubmissions || undefined,
              sceneSummary: raw.sceneSummary || undefined,
              totalSceneCount: raw.totalSceneCount,
            } as Submission;

            const entries = getSceneEntries(baseSubmission);
            const summary = summarizeSceneEntries(entries, raw.totalSceneCount ?? raw.sceneSummary?.totalSceneCount);

            return {
              ...baseSubmission,
              status: deriveSubmissionStatus(baseSubmission, summary),
              sceneSummary: summary,
              totalSceneCount: summary.totalSceneCount,
              completionPercentage: clampPct(summary.averageCompletionPct ?? baseSubmission.completionPercentage),
            } as Submission;
          });
          
          // Sort in memory to avoid needing a composite index
          subs.sort((a, b) => {
            const tA = a.submittedAt?.toMillis ? a.submittedAt.toMillis() : new Date(a.submittedAt).getTime();
            const tB = b.submittedAt?.toMillis ? b.submittedAt.toMillis() : new Date(b.submittedAt).getTime();
            return tB - tA;
          });

          setSubmissions(subs);
          if (subs.length > 0) {
            setSelectedId(subs[0].id);
            hydrateEditorFromSubmission(subs[0]);
          } else {
            hydrateEditorFromSubmission(null);
          }
        }
      }
      // Load experiment
      if (experimentId) {
        const eSnap = await getDoc(doc(db, 'experiments', experimentId));
        if (eSnap.exists()) setExperiment(eSnap.data() as ExperimentData);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  function selectSubmission(sub: Submission) {
    setSelectedId(sub.id);
    hydrateEditorFromSubmission(sub);
  }

  function selectScene(sceneKey: string) {
    if (!selected) return;
    hydrateEditorFromSubmission(selected, sceneKey);
  }

  async function saveGrade() {
    if (!selectedId || !selected) return;
    const sceneEntries = getSceneEntries(selected);
    const activeScene = sceneEntries.find((entry) => entry.key === selectedSceneKey) || sceneEntries[0];
    if (!activeScene) return;

    setSaving(true);
    try {
      const finalSceneStatus = gradeStatus === 'pending' && gradeText ? 'graded' : normalizeStatus(gradeStatus);

      const sceneMapForWrite: Record<string, SceneSubmission> = {};
      sceneEntries.forEach(({ key, scene }) => {
        sceneMapForWrite[key] = { ...scene };
      });

      const previousScene = sceneMapForWrite[activeScene.key] || activeScene.scene;
      const updatedScene: SceneSubmission = {
        ...previousScene,
        sceneKey: activeScene.key,
        sceneName: previousScene.sceneName || activeScene.scene.sceneName || 'Scene',
        status: finalSceneStatus,
        grade: gradeText,
        instructorFeedback: feedback,
        updatedAt: serverTimestamp(),
      };

      if (!previousScene?.submittedAt) {
        updatedScene.submittedAt = selected.submittedAt || serverTimestamp();
      }

      sceneMapForWrite[activeScene.key] = updatedScene;

      const updatedSceneEntries = Object.keys(sceneMapForWrite).map((key) => ({ key, scene: sceneMapForWrite[key] }));
      const updatedSummary = summarizeSceneEntries(updatedSceneEntries, selected.totalSceneCount);
      const aggregateStatus = deriveSubmissionStatus(
        { ...selected, sceneSubmissions: sceneMapForWrite, sceneSummary: updatedSummary, totalSceneCount: updatedSummary.totalSceneCount },
        updatedSummary
      );
      const aggregateCompletion = clampPct(updatedSummary.averageCompletionPct ?? selected.completionPercentage);

      const updatePayload: Record<string, any> = {
        sceneSubmissions: sceneMapForWrite,
        sceneSummary: updatedSummary,
        totalSceneCount: updatedSummary.totalSceneCount,
        status: aggregateStatus,
        completionPercentage: aggregateCompletion,
        completionPct: aggregateCompletion,
        latestSceneKey: activeScene.key,
        latestSceneName: updatedScene.sceneName || activeScene.scene.sceneName || 'Scene',
        updatedAt: serverTimestamp(),
      };

      if (updatedSummary.totalSceneCount <= 1) {
        updatePayload.grade = gradeText;
        updatePayload.instructorFeedback = feedback;
      }

      await updateDoc(doc(db, 'submissions', selectedId), updatePayload);

      // Create notification for the student
      if (finalSceneStatus === 'graded' || finalSceneStatus === 'correct' || finalSceneStatus === 'incorrect' || finalSceneStatus === 'needs_revision') {
        const sceneName = updatedScene.sceneName || activeScene.scene.sceneName || 'Scene';
        await addDoc(collection(db, 'notifications'), {
          userId: selected.studentId,
          type: 'grade_received',
          title: 'Scene Graded',
          message: `Your scene "${sceneName}" for ${experiment?.title || 'this experiment'} has been graded: ${gradeText || finalSceneStatus}`,
          link: `/classroom/${classroomId}`, 
          isRead: false,
          createdAt: serverTimestamp(),
          data: { classroomId, experimentId, submissionId: selectedId, sceneKey: activeScene.key, sceneName }
        });
      }

      setSubmissions(prev =>
        prev.map(s =>
          s.id === selectedId
            ? (() => {
                const nextSceneMap: Record<string, SceneSubmission> = {};
                getSceneEntries(s).forEach(({ key, scene }) => {
                  nextSceneMap[key] = { ...scene };
                });
                nextSceneMap[activeScene.key] = {
                  ...nextSceneMap[activeScene.key],
                  sceneKey: activeScene.key,
                  sceneName: updatedScene.sceneName || activeScene.scene.sceneName || 'Scene',
                  status: finalSceneStatus,
                  grade: gradeText,
                  instructorFeedback: feedback,
                  updatedAt: new Date(),
                };

                const nextEntries = Object.keys(nextSceneMap).map((key) => ({ key, scene: nextSceneMap[key] }));
                const nextSummary = summarizeSceneEntries(nextEntries, s.totalSceneCount);
                const nextStatus = deriveSubmissionStatus(
                  { ...s, sceneSubmissions: nextSceneMap, sceneSummary: nextSummary, totalSceneCount: nextSummary.totalSceneCount },
                  nextSummary
                );
                const nextCompletion = clampPct(nextSummary.averageCompletionPct ?? s.completionPercentage);

                return {
                  ...s,
                  sceneSubmissions: nextSceneMap,
                  sceneSummary: nextSummary,
                  totalSceneCount: nextSummary.totalSceneCount,
                  status: nextStatus,
                  completionPercentage: nextCompletion,
                  completionPct: nextCompletion,
                  grade: nextSummary.totalSceneCount <= 1 ? gradeText : s.grade,
                  instructorFeedback: nextSummary.totalSceneCount <= 1 ? feedback : s.instructorFeedback,
                } as Submission;
              })()
            : s
        )
      );
      setGradeStatus(finalSceneStatus);
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
    const summary = s.sceneSummary || summarizeSceneEntries(getSceneEntries(s), s.totalSceneCount);
    const status = deriveSubmissionStatus(s, summary);
    // 'pending' includes in-progress, submitted, and needs-revision scene sets.
    if (filterTab === 'pending') return status === 'pending' || status === 'submitted' || status === 'in_progress' || status === 'needs_revision' || !status;
    if (filterTab === 'graded')  return status === 'graded' || status === 'correct' || status === 'incorrect';
    return true;
  });

  const selected = submissions.find(s => s.id === selectedId) || null;
  const selectedSceneEntries = useMemo(() => (selected ? getSceneEntries(selected) : []), [selected]);
  const activeSceneEntry = selectedSceneEntries.find((entry) => entry.key === selectedSceneKey) || selectedSceneEntries[0] || null;
  const selectedScene = activeSceneEntry?.scene || null;
  const selectedSummary = selected
    ? (selected.sceneSummary || summarizeSceneEntries(selectedSceneEntries, selected.totalSceneCount))
    : null;

  const statusStyle = (s: string) => STATUS_STYLES[s?.toLowerCase()?.replace(/\s+/g, '_')] || STATUS_STYLES.pending;
  const selectedCompletion = clampPct(
    selectedScene?.completionPercentage
      ?? selectedScene?.completionPct
      ?? selectedScene?.experimentState?.completionPercentage
      ?? selected?.completionPercentage
      ?? selected?.completionPct
      ?? selected?.experimentState?.completionPercentage
      ?? 0
  );
  const selectedVariables = selectedScene?.variables && Object.keys(selectedScene.variables).length > 0
    ? selectedScene.variables
    : (selectedScene?.experimentState?.variables && Object.keys(selectedScene.experimentState.variables).length > 0
      ? selectedScene.experimentState.variables
      : (selected?.variables && Object.keys(selected.variables).length > 0
        ? selected.variables
        : (selected?.experimentState?.variables || {})));
  const selectedCompletedSteps = selectedScene?.experimentState?.completedSteps ?? selected?.completedSteps ?? 0;
  const selectedTotalSteps = selectedScene?.experimentState?.totalSteps ?? selected?.totalSteps ?? 0;
  const selectedQuizScore = selectedScene?.quizScore ?? selected?.quizScore;
  const selectedQuizTotal = selectedScene?.quizTotal ?? selected?.quizTotal;
  const selectedStateJson = selectedScene?.stateJson ?? selected?.stateJson;

  if (loading) return (
    <PatternPage className="evaluation-shell flex flex-col" fontFamily="'Quicksand', 'Inter', sans-serif">
      <MainNav />
      <div className="flex flex-1 overflow-hidden">
          <aside className="w-96 border-r border-slate-200 bg-white p-4 space-y-4">
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
      <AppFooter />
    </PatternPage>
  );

  return (
    <PatternPage className="evaluation-shell flex flex-col" fontFamily="'Quicksand', 'Inter', sans-serif">
      <MainNav />
        <main className="evaluation-main overflow-hidden relative">
          {/* Left Panel — Submission List */}
          <aside 
            className={`evaluation-sidebar flex flex-col shrink-0 transition-[width,transform] duration-300 ease-in-out relative ${isSidebarCollapsed ? '-translate-x-full' : 'translate-x-0'}`}
            style={{ width: isSidebarCollapsed ? '0' : `${sidebarWidth}px` }}
          >
            <div className={`flex flex-col h-full w-full ${isSidebarCollapsed ? 'invisible opacity-0' : 'visible opacity-100'}`} style={{ width: `${sidebarWidth}px` }}>
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex flex-col">
                  <h3 className="font-bold text-slate-900">Submissions</h3>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{submissions.length} total</span>
                </div>
                <button 
                  onClick={toggleSidebar}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
                  title="Collapse Sidebar"
                >
                  <span className="material-symbols-outlined text-xl">menu_open</span>
                </button>
              </div>
              
              <div className="p-4 bg-slate-50/60 border-b border-slate-200">
                <div className="flex gap-2">
                  {(['all', 'pending', 'graded'] as const).map(tab => (
                    <button 
                      key={tab} 
                      onClick={() => setFilterTab(tab)} 
                      className={`flex-1 text-[10px] font-bold py-1.5 px-2 rounded-md capitalize transition-all ${
                        filterTab === tab 
                          ? 'bg-[#14b8a6] text-white shadow-md'
                          : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
            <div className="flex-1 overflow-y-auto">
              {filteredSubmissions.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">No submissions found.</div>
              ) : (
                filteredSubmissions.map(sub => {
                  const summary = sub.sceneSummary || summarizeSceneEntries(getSceneEntries(sub), sub.totalSceneCount);
                  const aggregateStatus = deriveSubmissionStatus(sub, summary);
                  const ss = statusStyle(aggregateStatus);
                  return (
                    <div 
                      key={sub.id} 
                      onClick={() => selectSubmission(sub)} 
                      className={`p-4 border-b border-slate-100 cursor-pointer transition-colors ${
                        selectedId === sub.id 
                          ? 'bg-[#14b8a6]/10 border-l-4 border-l-[#14b8a6]'
                          : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-slate-900 text-sm">{sub.studentName || 'Unknown Student'}</span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${ss.text} ${ss.bg} px-1.5 py-0.5 rounded`}>{ss.label}</span>
                      </div>
                      <p className="text-xs text-slate-500 mb-2">{classroom?.name || 'Classroom'}</p>
                      <p className="text-[11px] text-slate-500 mb-2">{sceneSummaryText(summary)}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-slate-400">
                          <span className="material-symbols-outlined text-sm">quiz</span>
                          <span className="text-xs font-medium">{summary.gradedCount}/{summary.totalSceneCount} graded</span>
                        </div>
                        <span className="text-[10px] text-slate-400">{formatDate(sub.submittedAt)}</span>
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
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-8 bg-slate-300 rounded-full opacity-0 hover:opacity-100 transition-opacity" />
            </div>
          )}

          {/* Floating Expand Button when collapsed */}
          {isSidebarCollapsed && (
            <button 
              onClick={toggleSidebar}
              className="absolute left-4 top-4 z-20 size-10 bg-[#14b8a6] text-white rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all flex items-center justify-center group"
            >
              <span className="material-symbols-outlined group-hover:rotate-180 transition-transform">menu_open</span>
            </button>
          )}

          {/* Right Panel — Detail Workspace */}
          <section className="flex-1 flex flex-col overflow-y-auto p-6">
            {!selected ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                <span className="material-symbols-outlined text-5xl mb-4">assignment</span>
                <p className="font-medium">{submissions.length === 0 ? 'No submissions yet for this experiment' : 'Select a submission to view details'}</p>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-1 text-sm text-slate-500">
                      <Link to="/dashboard" className="hover:text-[#14b8a6] transition-colors">Dashboard</Link>
                      <span className="material-symbols-outlined text-xs">chevron_right</span>
                      <Link to={`/classrooms/${classroomId}`} className="hover:text-[#14b8a6] transition-colors">{classroom?.name || 'Classroom'}</Link>
                      <span className="material-symbols-outlined text-xs">chevron_right</span>
                      <span className="text-[#14b8a6] font-medium">{selected.studentName}</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Submission Review: {experiment?.title || 'Experiment'}</h1>
                    {activeSceneEntry && (
                      <p className="text-sm text-slate-500 mt-1">Scene: {activeSceneEntry.scene.sceneName || activeSceneEntry.key}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {(() => {
                      const idx = filteredSubmissions.findIndex(s => s.id === selectedId);
                      return <>
                        <button 
                          onClick={() => idx > 0 && selectSubmission(filteredSubmissions[idx - 1])} 
                          disabled={idx <= 0} 
                          className="evaluation-pill-btn px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-all shadow-sm"
                        >
                          Previous
                        </button>
                        <button 
                          onClick={() => idx < filteredSubmissions.length - 1 && selectSubmission(filteredSubmissions[idx + 1])} 
                          disabled={idx >= filteredSubmissions.length - 1} 
                          className="evaluation-pill-btn px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-all shadow-sm"
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
                    {selectedStateJson && (
                      <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-900 shadow-xl" style={{ aspectRatio: '16/9' }}>
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
                                stateJson: selectedStateJson,
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
                      <div className="bg-slate-900 rounded-xl overflow-hidden aspect-video relative shadow-xl border border-slate-200">
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
                      <div className="evaluation-panel border-2 border-[#14b8a6]/20 p-6">
                        <h3 className="text-lg font-bold mb-4 text-slate-900 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[#14b8a6]">grading</span>
                          Evaluation
                        </h3>
                        <div className="space-y-4">
                          {selectedSummary && (
                            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                              <p className="text-xs font-semibold text-slate-600">{sceneSummaryText(selectedSummary)}</p>
                            </div>
                          )}

                          <div>
                            <label className="block text-sm font-semibold mb-1.5 text-slate-700">Scene</label>
                            <select
                              value={activeSceneEntry?.key || ''}
                              onChange={(e) => selectScene(e.target.value)}
                              className="evaluation-input w-full text-sm text-slate-900"
                            >
                              {selectedSceneEntries.map((entry, index) => (
                                <option key={entry.key} value={entry.key}>
                                  {(entry.scene.sceneName || `Scene ${index + 1}`)}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-semibold mb-1.5 text-slate-700">Status</label>
                              <select
                                value={gradeStatus}
                                onChange={e => setGradeStatus(e.target.value)}
                                className="evaluation-input w-full text-sm text-slate-900"
                              >
                                <option value="pending">Pending</option>
                                <option value="in_progress">In Progress</option>
                                <option value="submitted">Submitted — Awaiting Review</option>
                                <option value="graded">Graded</option>
                                <option value="correct">Correct</option>
                                <option value="incorrect">Incorrect</option>
                                <option value="needs_revision">Needs Revision</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-semibold mb-1.5 text-slate-700">
                                Grade <span className="text-xs text-slate-400 font-normal">(e.g. 85%, A, Pass)</span>
                              </label>
                              <input
                                type="text"
                                value={gradeText}
                                onChange={e => setGradeText(e.target.value)}
                                placeholder="Enter grade..."
                                className="evaluation-input w-full text-sm px-3 py-2 text-slate-900"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold mb-1.5 text-slate-700">Instructor Feedback</label>
                            <textarea
                              value={feedback}
                              onChange={e => setFeedback(e.target.value)}
                              className="evaluation-input w-full text-sm placeholder:text-slate-400 text-slate-900"
                              placeholder="Provide constructive feedback..."
                              rows={4}
                            />
                          </div>
                          <button
                            onClick={saveGrade}
                            disabled={saving}
                            className="evaluation-primary-btn w-full font-bold py-3 rounded-lg shadow-lg shadow-[#14b8a6]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
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
                        <div className="evaluation-panel p-6">
                          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#14b8a6]">quiz</span> Quiz Performance
                            <span className="ml-auto text-sm font-medium text-slate-500">Score: {selected.quizScore}/{selected.quizTotal}</span>
                          </h3>
                          <div className="space-y-4">
                            {selected.quizAnswers.map((qa, i) => (
                              <div key={i} className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                                <div className="flex justify-between mb-2">
                                  <p className="text-sm font-semibold text-slate-900">Q{i + 1}: {qa.question}</p>
                                  <span className={`material-symbols-outlined ${qa.correct ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {qa.correct ? 'check_circle' : 'cancel'}
                                  </span>
                                </div>
                                <p className="text-sm text-slate-600 italic">&ldquo;{qa.answer}&rdquo;</p>
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
                      <div className="evaluation-panel p-6">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Student Info</h3>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="size-12 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold border border-slate-200">
                            {generateInitials(selected.studentName || '', selected.studentEmail)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{selected.studentName || 'Unknown'}</p>
                            <p className="text-xs text-slate-500 truncate max-w-[150px]">{selected.studentEmail || classroom?.name || '—'}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase font-bold">Progress</p>
                            <p className="text-sm font-bold text-slate-900">{selectedCompletion}% Complete</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase font-bold">Quiz Score</p>
                            <p className="text-sm font-bold text-slate-900">{selectedQuizScore ?? '—'}/{selectedQuizTotal ?? '—'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Experiment State / Progress */}
                      {(selectedCompletedSteps || selectedTotalSteps || selectedCompletion > 0 || Object.keys(selectedVariables).length > 0) && (
                        <div className="evaluation-panel p-6">
                          <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#14b8a6] text-lg">analytics</span> Progress Details
                          </h3>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-slate-600">{selectedCompletedSteps || 0} / {selectedTotalSteps || 0} Steps</span>
                            <span className="text-xs font-bold text-[#14b8a6]">{selectedCompletion}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-4">
                            <div className="bg-[#14b8a6] h-full transition-all" style={{ width: `${selectedCompletion}%` }} />
                          </div>
                          
                          {Object.keys(selectedVariables).length > 0 && (
                            <div className="space-y-2 mt-4 pt-4 border-t border-slate-100">
                              <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Variables</p>
                              {Object.entries(selectedVariables).map(([key, val]) => (
                                <div key={key} className="flex justify-between items-center bg-slate-50 rounded-lg px-2 py-1.5 border border-slate-100">
                                  <span className="text-[10px] text-slate-500 font-medium">{key}</span>
                                  <span className="text-xs font-bold text-slate-900">{val}</span>
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
      <AppFooter />
    </PatternPage>
  );
}
