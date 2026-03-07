import { useToast } from '@chakra-ui/react';
import React, { useRef } from 'react';
import { ObjectTypesManagerContext } from './experiment_root';

export default function ObjectModelManager() {
  const objectTypesManager = React.useContext(ObjectTypesManagerContext);

  const [name, setName] = React.useState('');
  const [objFile, setObjFile] = React.useState<Blob | undefined>(undefined);
  const [isLoading, setIsLoading] = React.useState(false);
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!objFile || !name) {
      toast({
        title: 'Error',
        description: 'Please upload an object file and enter a name.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    setIsLoading(true);
    if (!(await objectTypesManager.uploadObject(name, objFile))) {
      toast({
        title: 'Error',
        description:
          'Failed to upload. Try again. Ensure the name is unique.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } else {
      toast({
        title: 'Success',
        description: 'Object added to library.',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
      // Reset form
      setName('');
      setObjFile(undefined);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-full max-h-full bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-2xl relative overflow-hidden min-h-0">
      {/* Subtle background glow */}
      <div className="absolute top-0 right-0 -m-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30 text-primary shadow-inner shadow-primary/20">
          <span className="material-symbols-outlined text-xl">view_in_ar</span>
        </div>
        <h2 className="text-xl font-bold bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent">
          3D Asset Library
        </h2>
      </div>

      <div className="flex flex-col gap-8 flex-grow">
        {/* Upload Form */}
        <div className="bg-slate-900/50 rounded-xl p-5 border border-slate-700/50 shrink-0">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-slate-400">upload</span>
            Upload New Asset
          </h3>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Asset Name</label>
              <input
                type="text"
                placeholder="e.g. Beaker_250ml"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
            
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">3D Model File (.glb)</label>
              <div 
                className="relative border-2 border-dashed border-slate-700 rounded-xl p-4 text-center hover:bg-slate-800/50 hover:border-primary/50 transition-all cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".glb"
                  onChange={e => setObjFile(e.target.files?.[0])}
                  className="hidden"
                />
                <span className="material-symbols-outlined text-2xl text-slate-500 group-hover:text-primary mb-2 block">
                  {objFile ? 'check_circle' : 'cloud_upload'}
                </span>
                <span className="text-sm text-slate-300 block truncate max-w-full">
                  {objFile ? (objFile as File).name : 'Click to select .glb file'}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full bg-primary hover:brightness-110 text-white font-semibold py-2.5 rounded-lg shadow-lg shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span className="material-symbols-outlined animate-spin text-sm">rotate_right</span>
              ) : (
                <span className="material-symbols-outlined text-sm">add</span>
              )}
              {isLoading ? 'Uploading...' : 'Add Asset'}
            </button>
          </form>
        </div>

        {/* Existing Assets List */}
        <div className="flex-1 flex flex-col min-h-0 max-h-full overflow-hidden mt-2">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2 justify-between shrink-0">
            <span className="flex items-center gap-2 uppercase tracking-wider">
              <span className="material-symbols-outlined text-sm text-slate-400">inventory_2</span>
              Available Assets
            </span>
            <span className="text-xs bg-slate-800 text-slate-400 py-0.5 px-2 rounded-full border border-slate-700/50">
              {objectTypesManager.objects.length}
            </span>
          </h3>

          <div className="flex-1 overflow-y-auto min-h-0 max-h-full hide-scrollbar">
            {objectTypesManager.objects.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center bg-slate-900/30 rounded-xl border border-slate-800/50 border-dashed">
                <span className="material-symbols-outlined text-slate-500 text-3xl mb-2">category</span>
                <p className="text-sm text-slate-500">No assets uploaded yet</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 pb-4">
                {objectTypesManager.objects.map(({ name }) => (
                  <div
                    key={name}
                    className="flex items-center gap-2 bg-slate-900 border border-slate-700 py-1.5 px-3 rounded-lg text-sm text-slate-300 hover:border-slate-500 hover:bg-slate-800 transition-colors group cursor-default max-w-full overflow-hidden"
                  >
                    <span className="material-symbols-outlined text-[16px] text-slate-500 group-hover:text-primary transition-colors">box</span>
                    <span className="truncate">{name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Hide scrollbar but keep scroll functionality */}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none; /* IE and Edge */
          scrollbar-width: none; /* Firefox */
        }
      `}</style>
    </div>
  );
}
