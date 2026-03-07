import React from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import useExperiment from '../core/hooks/useExperiment';
import ObjectModelManager from './object_model_manager';

export default function SceneManager() {
  const { expName } = useParams();
  const { createScene, scenes, experiment } = useExperiment(expName!);
  const navigate = useNavigate();

  const addScene = () => {
    const sceneName = prompt('Enter a name for the new scene:');
    if (sceneName && sceneName.trim() !== '') {
      createScene(sceneName.trim());
    }
  };

  const displayTitle = experiment?.title || expName;

  return (
    <div className="dark min-h-screen font-display bg-[#0f172a] flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4" />
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[1px]" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col text-slate-100 min-h-screen">
        
        {/* Header Navigation */}
        <header className="shrink-0 h-20 border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-xl px-8 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-6 min-w-0">
            <Link to="/dashboard" className="shrink-0 w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center border border-slate-700 transition-colors text-slate-400 hover:text-white">
              <span className="material-symbols-outlined">arrow_back</span>
            </Link>
            
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2 mb-0.5 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Experiment Workspace
              </span>
              <h1 className="text-2xl font-black tracking-tight flex items-center gap-3 truncate" title={displayTitle}>
                {displayTitle}
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 bg-slate-800/80 border border-slate-700 py-1.5 px-4 rounded-full text-sm text-slate-400 font-medium">
              <span className="material-symbols-outlined text-[18px]">cloud_done</span>
              Auto-saved
            </div>
          </div>
        </header>

        {/* Dashboard Grid */}
        <div className="flex-1 p-8 flex flex-col lg:flex-row gap-8 min-h-0">
          
          {/* Left Panel: Assets Library */}
          <div className="w-full lg:w-[400px] shrink-0 flex flex-col min-h-0">
            <ObjectModelManager />
          </div>

          {/* Right Panel: Scene Directory */}
          <div className="flex-grow flex flex-col bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl relative min-h-0">
            <div className="flex justify-between items-center mb-8 shrink-0">
              <div>
                <h2 className="text-2xl font-bold mb-1">Scenes</h2>
                <p className="text-slate-400 text-sm">Manage and build interaction scenarios for this experiment.</p>
              </div>
              
              <button 
                onClick={addScene}
                className="bg-primary hover:brightness-110 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all flex items-center gap-2 transform hover:-translate-y-0.5"
              >
                <span className="material-symbols-outlined font-bold">add</span>
                New Scene
              </button>
            </div>

            {/* Scenes Grid */}
            <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 min-h-0">
              {scenes.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-700/60 rounded-2xl bg-slate-800/20 text-center">
                  <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-inner border border-slate-700">
                    <span className="material-symbols-outlined text-4xl text-slate-500">movie_creation</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-300 mb-2">No Scenes Yet</h3>
                  <p className="text-slate-500 max-w-sm mb-6">Start building your educational experience by creating the first interactive scene.</p>
                  <button 
                    onClick={addScene}
                    className="text-primary hover:text-white font-semibold flex items-center gap-1 transition-colors"
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
                        className="group bg-slate-900/80 border border-slate-700 hover:border-primary/50 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 flex flex-col"
                      >
                        {/* Scene Preview Placeholder */}
                        <div className="h-32 bg-slate-800 relative overflow-hidden flex items-center justify-center">
                          {/* Abstract background for thumbnail */}
                          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary via-slate-900 to-black" />
                          <span className="material-symbols-outlined text-5xl text-slate-700 group-hover:scale-110 group-hover:text-primary/40 transition-transform duration-500 relative z-10">
                            architecture
                          </span>
                          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-xs font-mono text-slate-300 border border-slate-700">
                            #{idx + 1}
                          </div>
                        </div>
                        
                        {/* Scene Info */}
                        <div className="p-5 flex-grow flex flex-col justify-between border-t border-slate-800">
                          <h3 className="text-lg font-bold text-white mb-4 truncate group-hover:text-primary transition-colors">
                            {scene.name}
                          </h3>
                          
                          <button
                            onClick={() => navigate('scene/' + scene.name)}
                            className="w-full py-2.5 rounded-lg bg-slate-800 text-sm font-semibold text-slate-200 hover:bg-primary hover:text-white transition-colors flex items-center justify-center gap-2 border border-slate-700 group-hover:border-primary border-transparent"
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
      
      {/* Scrollbar styling for this specific page component scope */}
      <style>{`
        /* Inner scrollable areas (e.g. scenes grid) */
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #334155;
          border-radius: 20px;
          border: 2px solid #0f172a;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #475569; }

        /* Page-level scrollbar, matching dark slate theme */
        body {
          scrollbar-width: thin;
          scrollbar-color: #334155 transparent;
        }
        body::-webkit-scrollbar {
          width: 10px;
        }
        body::-webkit-scrollbar-track {
          background: transparent;
        }
        body::-webkit-scrollbar-thumb {
          background-color: #334155;
          border-radius: 9999px;
          border: 2px solid #020617;
        }
        body::-webkit-scrollbar-thumb:hover {
          background-color: #475569;
        }
      `}</style>
    </div>
  );
}
