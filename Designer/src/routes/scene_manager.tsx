import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import useExperiment from '../core/hooks/useExperiment';
import ObjectModelManager from './object_model_manager';
import { uploadExperimentThumbnail } from '../utils/storageHelpers';

function ExperimentDetailsModal({
  isOpen,
  onClose,
  initialTitle,
  initialDescription,
  initialCategory,
  initialThumbnailUrl,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialTitle: string;
  initialDescription: string;
  initialCategory: string;
  initialThumbnailUrl: string;
  onSave: (title: string, description: string, category: string, thumbnailFile: File | null) => Promise<void>;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [category, setCategory] = useState(initialCategory || 'General Science');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(initialThumbnailUrl || '');
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const objectPreviewRef = useRef<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle);
      setDescription(initialDescription);
      setCategory(initialCategory || 'General Science');
      setThumbnailFile(null);
      setThumbnailPreview(initialThumbnailUrl || '');
      setSaveError('');
      if (objectPreviewRef.current) {
        URL.revokeObjectURL(objectPreviewRef.current);
        objectPreviewRef.current = null;
      }
    }
  }, [isOpen, initialTitle, initialDescription, initialCategory, initialThumbnailUrl]);

  useEffect(() => {
    return () => {
      if (objectPreviewRef.current) {
        URL.revokeObjectURL(objectPreviewRef.current);
        objectPreviewRef.current = null;
      }
    };
  }, []);

  if (!isOpen) return null;

  const handleThumbnailSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (objectPreviewRef.current) {
      URL.revokeObjectURL(objectPreviewRef.current);
      objectPreviewRef.current = null;
    }

    const nextPreview = URL.createObjectURL(file);
    objectPreviewRef.current = nextPreview;
    setThumbnailFile(file);
    setThumbnailPreview(nextPreview);
    setSaveError('');
  };

  const handleClose = () => {
    if (isSaving) return;
    if (objectPreviewRef.current) {
      URL.revokeObjectURL(objectPreviewRef.current);
      objectPreviewRef.current = null;
    }
    setThumbnailFile(null);
    setSaveError('');
    onClose();
  };

  const handleSave = async () => {
    if (!title.trim() || isSaving) return;

    setIsSaving(true);
    setSaveError('');
    try {
      await onSave(title.trim(), description.trim(), category, thumbnailFile);
      if (objectPreviewRef.current) {
        URL.revokeObjectURL(objectPreviewRef.current);
        objectPreviewRef.current = null;
      }
      setThumbnailFile(null);
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save experiment details.';
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto py-4 px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[calc(100dvh-1rem)] bg-white border border-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col my-2">
        <div className="h-28 sm:h-32 px-8 flex items-center justify-between shrink-0 bg-[#E6F9F5]">
          <h2 className="text-2xl font-bold text-slate-900">Experiment Details</h2>
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-[#169A92]">edit_square</span>
          </div>
        </div>

        <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar">
          {/* Header */}
          <p className="text-sm text-slate-600 mb-6">Give your experiment a clear name, category, and thumbnail.</p>

          {/* Fields */}
          <div className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold tracking-[0.1em] text-[#169A92] mb-2 ml-4">
                NAME <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Acid-Base Titration"
                className="w-full px-6 py-4 bg-white border-2 border-[#bfe9e2] rounded-full text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#169A92] transition-colors text-sm"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-[0.1em] text-[#169A92] mb-2 ml-4">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe what students will explore in this experiment..."
                rows={4}
                className="w-full px-6 py-4 bg-white border-2 border-[#bfe9e2] rounded-3xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#169A92] transition-colors text-sm resize-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-[0.1em] text-[#169A92] mb-2 ml-4">
                Category
              </label>
              <div className="relative">
                <button
                  onClick={() => setCategoryOpen(!categoryOpen)}
                  className="w-full px-6 py-4 bg-white border-2 border-[#bfe9e2] rounded-full text-slate-900 focus:outline-none focus:border-[#169A92] transition-colors text-sm flex items-center justify-between"
                >
                  <span>{category}</span>
                  <span className="material-symbols-outlined text-base">expand_more</span>
                </button>
                {categoryOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setCategoryOpen(false)} />
                    <div className="absolute mt-2 w-full bg-white rounded-2xl border border-[#bfe9e2] shadow-xl z-40 py-1 max-h-60 overflow-y-auto overflow-x-hidden thin-scrollbar">
                      {['Chemistry','Physics','Biology','Engineering','Geology','Environmental Science','General Science','Quantum'].map(opt => (
                        <button
                          key={opt}
                          onClick={() => { setCategory(opt); setCategoryOpen(false); }}
                          className={`w-full text-left px-4 py-2 text-sm ${category === opt ? 'text-[#169A92] font-semibold' : 'text-slate-700'} hover:bg-[#E6F9F5]`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-[0.1em] text-[#169A92] mb-2 ml-4">
                Thumbnail
              </label>
              <input
                ref={thumbnailInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleThumbnailSelect}
              />
              <button
                type="button"
                onClick={() => thumbnailInputRef.current?.click()}
                className="w-full h-40 rounded-3xl border-2 border-dashed border-[#9ddfd5] bg-[#f3fcfa] hover:bg-[#e9f9f6] transition-colors overflow-hidden relative"
              >
                {thumbnailPreview ? (
                  <>
                    <img src={thumbnailPreview} alt="Experiment thumbnail preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="text-white text-sm font-semibold">Change Thumbnail</span>
                    </div>
                  </>
                ) : (
                  <div className="h-full w-full flex flex-col items-center justify-center gap-2 text-slate-500">
                    <span className="material-symbols-outlined text-3xl">add_photo_alternate</span>
                    <span className="text-sm font-medium">Upload Thumbnail</span>
                  </div>
                )}
              </button>
              <p className="text-xs text-slate-500 mt-2">JPEG, PNG, WebP, or GIF. Max size 2 MB.</p>
            </div>
          </div>

          {saveError && <p className="text-sm text-red-500 mt-4">{saveError}</p>}
        </div>

        <div className="px-6 sm:px-8 pb-6 sm:pb-8 pt-2 flex justify-end gap-3 border-t border-slate-100 bg-white shrink-0 sticky bottom-0">
          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={handleClose}
              disabled={isSaving}
              className="px-5 py-3 rounded-full text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!title.trim() || isSaving}
              className="px-6 py-3 rounded-full text-sm font-bold text-white bg-[#1FB6AB] hover:bg-[#169A92] shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SceneManager() {
  const { expName } = useParams();
  const { createScene, scenes, experiment, updateExperiment, loading } = useExperiment(expName!);
  const navigate = useNavigate();
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [hasCheckedInitial, setHasCheckedInitial] = useState(false);

  // Show modal on first load if experiment has no title yet (new experiment)
  useEffect(() => {
    if (hasCheckedInitial || !experiment) return;
    setHasCheckedInitial(true);
    if (!experiment.title) {
      setShowDetailsModal(true);
    }
  }, [experiment, hasCheckedInitial]);

  const handleSaveDetails = useCallback(
    async (title: string, description: string, category: string, thumbnailFile: File | null) => {
      if (!expName) throw new Error('Missing experiment identifier.');

      const fields: { title: string; description: string; category: string; thumbnailUrl?: string } = {
        title,
        description,
        category,
      };

      if (thumbnailFile) {
        const thumbnailUrl = await uploadExperimentThumbnail(expName, thumbnailFile);
        fields.thumbnailUrl = thumbnailUrl;
      }

      await updateExperiment(fields);
    },
    [updateExperiment, expName],
  );

  const addScene = () => {
    const sceneName = prompt('Enter a name for the new scene:');
    if (sceneName && sceneName.trim() !== '') {
      createScene(sceneName.trim());
    }
  };

  const displayTitle = experiment?.title || expName;

  return (
    <div
      className="min-h-screen font-display flex flex-col"
      style={{
        fontFamily: "'Quicksand', 'Inter', sans-serif",
        backgroundColor: '#FEF9F6',
      }}
    >
      <div className="relative z-10 flex flex-col text-slate-800 min-h-screen">
        {/* Header Navigation */}
        <header className="shrink-0 h-20 border-b border-slate-100 bg-white/95 backdrop-blur-xl px-8 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-6 min-w-0">
            <Link to="/dashboard" className="shrink-0 w-10 h-10 rounded-full bg-[#E6F9F5] hover:bg-[#d8f6f0] flex items-center justify-center border border-[#bfe9e2] transition-colors text-[#169A92]">
              <span className="material-symbols-outlined">arrow_back</span>
            </Link>
            
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold uppercase tracking-widest text-[#169A92] flex items-center gap-2 mb-0.5 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1FB6AB] animate-pulse" />
                Experiment Workspace
              </span>
              <h1 className="text-2xl font-black tracking-tight flex items-center gap-3 truncate" title={displayTitle}>
                {displayTitle}
                <button
                  onClick={() => setShowDetailsModal(true)}
                  className="shrink-0 w-8 h-8 rounded-lg bg-[#E6F9F5] hover:bg-[#d8f6f0] flex items-center justify-center border border-[#bfe9e2] transition-colors text-[#169A92]"
                  title="Edit experiment details"
                >
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                </button>
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {experiment?.description && (
              <p className="hidden lg:block text-sm text-slate-500 max-w-sm truncate" title={experiment.description}>
                {experiment.description}
              </p>
            )}
            <div className="hidden md:flex items-center gap-2 bg-[#E6F9F5] border border-[#bfe9e2] py-1.5 px-4 rounded-full text-sm text-[#169A92] font-semibold">
              <span className="material-symbols-outlined text-[18px]">cloud_done</span>
              Auto-saved
            </div>
          </div>
        </header>

        {/* Dashboard Grid */}
        <div className="flex-1 p-6 lg:p-8 flex flex-col lg:flex-row gap-6 lg:gap-8 min-h-0">
          
          {/* Left Panel: Assets Library */}
          <div className="w-full lg:w-[390px] shrink-0 flex flex-col min-h-0">
            <ObjectModelManager />
          </div>

          {/* Right Panel: Scene Directory */}
          <div className="flex-grow flex flex-col bg-white border border-slate-100 rounded-[2rem] p-6 lg:p-8 shadow-sm relative min-h-0">
            <div className="flex justify-between items-center mb-8 shrink-0">
              <div>
                <h2 className="text-2xl font-bold mb-1 text-slate-800">Scenes</h2>
                <p className="text-slate-500 text-sm">Manage and build interaction scenarios for this experiment.</p>
              </div>
              
              <button 
                onClick={addScene}
                className="bg-[#1FB6AB] hover:bg-[#169A92] text-white font-bold py-3 px-6 rounded-full shadow-lg transition-all flex items-center gap-2 transform hover:-translate-y-0.5"
              >
                <span className="material-symbols-outlined font-bold">add</span>
                New Scene
              </button>
            </div>

            {/* Scenes Grid */}
            <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 min-h-0">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-48 rounded-2xl skeleton-shimmer" />
                  ))}
                </div>
              ) : scenes.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-[#bfe9e2] rounded-2xl bg-[#f7fcfb] text-center">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-inner border border-[#bfe9e2]">
                    <span className="material-symbols-outlined text-4xl text-[#169A92]">movie_creation</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-700 mb-2">No Scenes Yet</h3>
                  <p className="text-slate-500 max-w-sm mb-6">Start building your educational experience by creating the first interactive scene.</p>
                  <button 
                    onClick={addScene}
                    className="text-[#169A92] hover:text-[#0f766e] font-semibold flex items-center gap-1 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">add_circle</span>
                    Create First Scene
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {scenes
                    .sort((a, b) => a.index - b.index)
                    .map((scene, idx) => (
                      <div 
                        key={scene.name}
                        className="group bg-white border border-slate-200 hover:border-[#9ddfd5] rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex flex-col"
                      >
                        {/* Scene Preview Placeholder */}
                        <div className="h-32 bg-[#E1F5FE] relative overflow-hidden flex items-center justify-center">
                          {/* Abstract background for thumbnail */}
                          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#a7f3d0] via-[#e0f2fe] to-white" />
                          <span className="material-symbols-outlined text-5xl text-[#169A92]/40 group-hover:scale-110 group-hover:text-[#169A92]/70 transition-transform duration-500 relative z-10">
                            architecture
                          </span>
                          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2 py-1 rounded text-xs font-mono text-slate-500 border border-[#bfe9e2]">
                            #{idx + 1}
                          </div>
                        </div>
                        
                        {/* Scene Info */}
                        <div className="p-5 flex-grow flex flex-col justify-between border-t border-slate-100">
                          <h3 className="text-lg font-bold text-slate-800 mb-4 truncate group-hover:text-[#169A92] transition-colors">
                            {scene.name}
                          </h3>
                          
                          <button
                            onClick={() => navigate('scene/' + scene.name)}
                            className="w-full py-2.5 rounded-full bg-[#E6F9F5] text-sm font-semibold text-[#169A92] hover:bg-[#1FB6AB] hover:text-white transition-colors flex items-center justify-center gap-2 border border-[#bfe9e2]"
                          >
                            <span className="material-symbols-outlined text-[18px]">drive_file_rename_outline</span>
                            Open Editor
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
      
      {/* Experiment Details Modal */}
      <ExperimentDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        initialTitle={experiment?.title || ''}
        initialDescription={experiment?.description || ''}
        initialCategory={(experiment?.category as string) || 'General Science'}
        initialThumbnailUrl={(experiment?.thumbnailUrl as string) || ''}
        onSave={handleSaveDetails}
      />
      
      {/* Scrollbar styling for this specific page component scope */}
      <style>{`
        /* Inner scrollable areas (e.g. scenes grid) */
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 20px;
          border: 2px solid transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #94a3b8; }

        /* Page-level scrollbar, matching dark slate theme */
        body {
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 transparent;
        }
        body::-webkit-scrollbar {
          width: 10px;
        }
        body::-webkit-scrollbar-track {
          background: transparent;
        }
        body::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 9999px;
          border: 2px solid transparent;
        }
        body::-webkit-scrollbar-thumb:hover {
          background-color: #94a3b8;
        }
        /* Dropdown thin scrollbar */
        .thin-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .thin-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .thin-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 9999px;
          border: 2px solid transparent;
        }
        .thin-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #94a3b8; }
        .thin-scrollbar { scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent; }
      `}</style>
    </div>
  );
}
