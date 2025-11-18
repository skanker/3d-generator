
import React, { Suspense, useEffect, useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stage, OrbitControls, useGLTF, Html, Grid } from '@react-three/drei';
import { Download, Maximize2, RotateCcw, AlertCircle, Loader2, WifiOff } from 'lucide-react';

interface ModelViewerProps {
  src: string;
  poster?: string;
  metadata?: any;
  onReset: () => void;
}

// --- Internal Components ---

const Model = ({ url }: { url: string }) => {
  const { scene } = useGLTF(url);
  const clonedScene = useMemo(() => scene.clone(), [scene]);
  
  // @ts-ignore
  return <primitive object={clonedScene} />;
};

const ViewerLoader = ({ message }: { message?: string }) => (
  <Html center>
    <div className="flex flex-col items-center gap-4 backdrop-blur-sm bg-white/80 p-6 rounded-xl shadow-lg border border-avant-border">
      <Loader2 className="w-12 h-12 text-avant-primary animate-spin" />
      <span className="text-xs font-mono text-avant-text tracking-widest font-bold animate-pulse">
        {message || "LOADING SCENE..."}
      </span>
    </div>
  </Html>
);

const ErrorDisplay = ({ error, onReset }: { error: any; onReset: () => void }) => (
    <div className="absolute inset-0 flex items-center justify-center bg-avant-surface z-20 p-4">
      <div className="flex flex-col items-center gap-4 text-center p-6 max-w-md bg-white rounded-lg border border-red-100 shadow-sm">
        <div className="p-3 bg-red-50 rounded-full">
             <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <div>
            <h3 className="text-avant-text font-bold mb-1">Rendering Failed</h3>
            <p className="text-xs text-avant-muted font-mono break-all opacity-70 max-h-24 overflow-y-auto">
            {error?.message || "Unknown error"}
            </p>
            {error?.message?.includes('Failed to fetch') && (
                <div className="mt-2 flex items-center justify-center gap-2 text-[10px] text-amber-600 bg-amber-50 p-2 rounded">
                    <WifiOff className="w-3 h-3" />
                    <span>Network/CORS blocked download. Used Proxy?</span>
                </div>
            )}
        </div>
        <button 
            onClick={onReset} 
            className="mt-2 px-4 py-2 bg-avant-text text-white text-xs font-bold uppercase tracking-wider rounded-sm hover:opacity-90"
        >
          Reset Viewer
        </button>
      </div>
    </div>
  );

export const ModelViewer: React.FC<ModelViewerProps> = ({ src, metadata, onReset }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loadingError, setLoadingError] = useState<Error | null>(null);
  const [isDownloading, setIsDownloading] = useState(true);
  const [usingProxy, setUsingProxy] = useState(false);

  useEffect(() => {
    let active = true;
    setBlobUrl(null);
    setLoadingError(null);
    setIsDownloading(true);
    setUsingProxy(false);

    const loadModelBlob = async () => {
        try {
            let response;
            let usedProxy = false;

            try {
                // 1. Try Direct Fetch
                // Attempt to fetch directly first. Some signed URLs support CORS.
                response = await fetch(src, { mode: 'cors', credentials: 'omit' });
                if (!response.ok) throw new Error('Direct fetch failed');
            } catch (directErr) {
                console.warn("[ModelViewer] Direct fetch failed, attempting proxy fallback...", directErr);
                
                // 2. Fallback: CORS Proxy
                // If the server blocks CORS (common with direct S3/OSS links), use a public proxy.
                const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(src)}`;
                response = await fetch(proxyUrl);
                usedProxy = true;
            }

            if (!response || !response.ok) {
                throw new Error(`Failed to download model: ${response?.status || 'Network Error'}`);
            }

            const blob = await response.blob();
            
            if (active) {
                const objectUrl = URL.createObjectURL(blob);
                setBlobUrl(objectUrl);
                setIsDownloading(false);
                setUsingProxy(usedProxy);
            }
        } catch (err: any) {
            console.error("Model download failed:", err);
            if (active) {
                setLoadingError(err);
                setIsDownloading(false);
            }
        }
    };

    if (src) {
        loadModelBlob();
    }

    return () => {
        active = false;
        if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [src]);

  // Render Logic
  if (loadingError) {
      return (
          <div className="w-full max-w-5xl mx-auto animate-fade-in-up">
             <div className="relative w-full aspect-[4/3] md:aspect-[16/9] bg-[#f0f0f0] rounded-sm border border-avant-border overflow-hidden">
                <ErrorDisplay error={loadingError} onReset={onReset} />
             </div>
          </div>
      );
  }

  return (
    <div className="w-full max-w-5xl mx-auto animate-fade-in-up">
      <div className="relative w-full aspect-[4/3] md:aspect-[16/9] bg-[#f0f0f0] rounded-sm border border-avant-border overflow-hidden group shadow-inner">
        
        {/* Header Overlay */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start pointer-events-none z-10">
           <div className="bg-white/80 backdrop-blur-sm px-3 py-1 rounded-sm border border-avant-border flex items-center gap-2 shadow-sm">
             <div className={`w-2 h-2 rounded-full ${isDownloading ? 'bg-amber-500' : 'bg-green-500'} animate-pulse`}></div>
             <span className="text-[10px] font-mono font-bold tracking-wider text-avant-text">
                {isDownloading ? 'DOWNLOADING...' : 'WEBGL RENDERER'}
             </span>
           </div>
           
           <div className="flex flex-col items-end gap-1">
               {metadata?.style && (
                <div className="bg-black/5 backdrop-blur-sm px-2 py-1 rounded-sm border border-transparent">
                    <span className="text-[10px] font-mono font-bold uppercase text-avant-text/50">{metadata.style} MODE</span>
                </div>
               )}
               {usingProxy && (
                 <div className="bg-amber-100/80 backdrop-blur-sm px-2 py-1 rounded-sm border border-amber-200">
                    <span className="text-[9px] font-mono font-bold uppercase text-amber-700">PROXY ACTIVE</span>
                </div>
               )}
           </div>
        </div>

        {/* Loading Overlay (Downloading Phase) */}
        {isDownloading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-avant-surface/50 backdrop-blur-sm z-20">
                <div className="flex flex-col items-center gap-4 p-6 bg-white/80 rounded-xl border border-avant-border shadow-sm">
                    <Loader2 className="w-8 h-8 text-avant-primary animate-spin" />
                    <span className="text-xs font-mono text-avant-text font-bold">RETRIEVING ASSET...</span>
                </div>
            </div>
        )}

        {/* Three.js Canvas (Parsing/Rendering Phase) */}
        {blobUrl && !isDownloading && (
            <Canvas 
                shadows 
                dpr={[1, 2]} 
                camera={{ fov: 45, position: [0, 0, 4] }} 
                className="w-full h-full bg-[#f8f9fa]"
                gl={{ preserveDrawingBuffer: true }}
            >
                <Suspense fallback={<ViewerLoader message="PARSING GEOMETRY..." />}>
                    <Stage environment="city" intensity={0.5} contactShadow={false} adjustCamera={1.2}>
                        <Model url={blobUrl} />
                    </Stage>
                    <Grid infiniteGrid fadeDistance={30} fadeStrength={5} sectionColor="#e5e7eb" cellColor="#f3f4f6" />
                </Suspense>
                <OrbitControls makeDefault autoRotate autoRotateSpeed={1.5} />
            </Canvas>
        )}

        {/* Controls Toolbar */}
        {!isDownloading && !loadingError && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1 rounded-full 
                bg-white/90 backdrop-blur-md border border-avant-border shadow-lg z-20 pointer-events-auto">
                <button 
                    onClick={onReset}
                    className="p-3 rounded-full hover:bg-avant-surface text-avant-muted hover:text-avant-text transition-colors"
                    title="New Generation"
                >
                    <RotateCcw className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-avant-border/50"></div>
                <a 
                    href={src} 
                    download={`hyper3d_${metadata?.job_id || 'model'}.glb`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 pl-3 pr-4 py-2 rounded-full bg-avant-primary text-white hover:bg-gray-800 transition-colors shadow-sm"
                    title="Download GLB"
                >
                    <Download className="w-4 h-4" />
                    <span className="text-xs font-bold">DOWNLOAD</span>
                </a>
                <div className="w-px h-4 bg-avant-border/50"></div>
                 <button className="p-3 rounded-full hover:bg-avant-surface text-avant-muted hover:text-avant-text transition-colors cursor-not-allowed opacity-50">
                    <Maximize2 className="w-4 h-4" />
                </button>
            </div>
        )}
      </div>
      
      {/* Metadata Footer */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-avant-border pt-6">
         <div>
             <h3 className="text-avant-text font-bold text-sm uppercase tracking-wide">Asset ID</h3>
             <p className="text-avant-muted text-xs font-mono mt-1 select-all">
                 {metadata?.job_id || 'UNKNOWN'}
             </p>
         </div>
         <div>
             <h3 className="text-avant-text font-bold text-sm uppercase tracking-wide">Parameters</h3>
             <div className="text-avant-muted text-xs font-mono mt-1 space-y-1">
                <p>Model: {metadata?.model_version || 'Gen-1.5-Sketch'}</p>
                <p>Style: {metadata?.style || 'PBR Shaded'}</p>
             </div>
         </div>
         <div className="flex md:justify-end items-center">
            <button onClick={onReset} className="text-xs font-bold uppercase tracking-wider border-b-2 border-avant-primary pb-0.5 hover:opacity-60 transition-opacity">
                Create New Model
            </button>
         </div>
      </div>
    </div>
  );
};
