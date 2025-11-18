import React, { useState } from 'react';
import { Header } from './components/Header';
import { UploadZone } from './components/UploadZone';
import { ModelViewer } from './components/ModelViewer';
import { generate3DModel } from './services/hyper3dService';
import { GenerationStatus } from './types';
import { AlertTriangle, ArrowRight, Box } from 'lucide-react';

export default function App() {
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<any>(null);
  
  // Progress State
  const [progress, setProgress] = useState<number>(0);
  const [progressMessage, setProgressMessage] = useState<string>("");

  const handleFileSelect = async (file: File) => {
    // Create a local preview of the image
    const objectUrl = URL.createObjectURL(file);
    setPreviewImage(objectUrl);
    
    setStatus('uploading');
    setProgress(0);
    setProgressMessage("Initializing upload...");
    setError(null);
    setMetadata(null);

    try {
        setTimeout(() => setStatus('processing'), 500);

        // Pass the progress callback to the service
        const result = await generate3DModel(file, (pct, msg) => {
            setProgress(pct);
            setProgressMessage(msg);
        });
        
        if (result.error) {
            throw new Error(result.error);
        }
        
        if (result.modelUrl) {
            setModelUrl(result.modelUrl);
            if (result.metadata) {
                setMetadata(result.metadata);
            }
            setStatus('success');
        } else {
            throw new Error("No model URL returned from API");
        }
    } catch (err: any) {
        console.error(err);
        setError(err.message || "Unknown error occurred");
        setStatus('error');
    }
  };

  const reset = () => {
    setStatus('idle');
    setModelUrl(null);
    setPreviewImage(null);
    setError(null);
    setProgress(0);
    setMetadata(null);
  };

  return (
    <div className="min-h-screen bg-avant-base text-avant-text flex flex-col font-sans">
      <Header />

      <main className="flex-1 flex flex-col items-center justify-start pt-16 p-6 w-full max-w-6xl mx-auto">
        
        {status === 'idle' && (
          <div className="flex flex-col items-center gap-10 w-full animate-fade-in-up">
            <div className="text-center space-y-6 max-w-2xl">
              <h2 className="text-5xl md:text-7xl font-bold tracking-tighter text-avant-primary">
                IMAGE TO 3D
              </h2>
              <p className="text-lg text-avant-muted font-light max-w-lg mx-auto leading-relaxed">
                Generate <span className="font-medium text-avant-text">Rodin Gen-1.5 Sketch</span> models with shaded style. High-fidelity geometry from single view images.
              </p>
            </div>
            
            <UploadZone onFileSelect={handleFileSelect} isProcessing={status !== 'idle'} />
            
            <div className="flex gap-8 mt-4 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                <div className="text-xs font-mono text-avant-muted">API: RODIN GEN-1.5 SKETCH (SHADED)</div>
            </div>
          </div>
        )}

        {(status === 'uploading' || status === 'processing') && (
            <div className="w-full max-w-2xl py-12 flex flex-col items-center gap-8 animate-fade-in">
                
                {/* Preview Card */}
                <div className="relative w-32 h-32 md:w-48 md:h-48 bg-white shadow-2xl rotate-3 border border-white p-2 rounded-sm">
                    {previewImage && (
                        <img src={previewImage} alt="Source" className="w-full h-full object-cover" />
                    )}
                    <div className="absolute -bottom-4 -right-4 bg-avant-primary text-white p-2 rounded-full shadow-lg">
                        <Box className="w-6 h-6 animate-pulse" />
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full space-y-4 mt-8">
                    <div className="flex justify-between items-end">
                        <span className="text-sm font-bold uppercase tracking-widest">{progressMessage || 'PROCESSING...'}</span>
                        <span className="text-4xl font-mono font-light text-avant-text">{progress}%</span>
                    </div>
                    <div className="h-1 w-full bg-avant-border rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-avant-primary transition-all duration-500 ease-out" 
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-avant-muted uppercase">
                        <span>Model: Gen-1.5 Sketch</span>
                        <span>Est. Time: ~30s</span>
                    </div>
                </div>
            </div>
        )}

        {status === 'success' && modelUrl && (
            <ModelViewer 
                src={modelUrl} 
                poster={previewImage || undefined} 
                metadata={metadata} 
                onReset={reset} 
            />
        )}

        {status === 'error' && (
            <div className="flex flex-col items-center justify-center py-12 gap-6 w-full max-w-md text-center animate-zoom-in">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-avant-text mb-2">Generation Interrupted</h3>
                    <p className="text-avant-muted text-sm mb-6">{error}</p>
                    <button 
                        onClick={reset}
                        className="group flex items-center gap-2 mx-auto px-6 py-3 bg-avant-primary text-white font-medium rounded-sm hover:bg-gray-900 transition-all"
                    >
                        Try Again <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        )}

      </main>

      <footer className="py-6 border-t border-avant-border">
          <div className="max-w-6xl mx-auto px-6 flex justify-between items-center text-xs text-avant-muted">
              <div className="font-mono">
                  API STATUS: <span className="text-green-600">● GEN-1.5 ONLINE</span>
              </div>
              <div className="flex gap-4">
                  <a href="https://hyper3d.ai/privacy" className="hover:text-avant-text">Privacy</a>
                  <a href="https://hyper3d.ai/terms" className="hover:text-avant-text">Terms</a>
              </div>
          </div>
      </footer>
    </div>
  );
}