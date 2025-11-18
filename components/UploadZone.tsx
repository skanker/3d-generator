import React, { useCallback, useState } from 'react';
import { Upload, Image as ImageIcon, Loader2 } from 'lucide-react';

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onFileSelect, isProcessing }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (isProcessing) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        onFileSelect(file);
      }
    }
  }, [onFileSelect, isProcessing]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  }, [onFileSelect]);

  return (
    <div 
      className={`
        relative group w-full max-w-xl aspect-video 
        rounded-none border-2 border-dashed transition-all duration-300 ease-out
        flex flex-col items-center justify-center
        cursor-pointer overflow-hidden bg-avant-surface
        ${isDragging 
          ? 'border-avant-primary bg-avant-border/30' 
          : 'border-avant-border hover:border-avant-muted hover:bg-avant-base'}
        ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !isProcessing && document.getElementById('file-upload')?.click()}
    >
      <input 
        id="file-upload" 
        type="file" 
        accept="image/*" 
        className="hidden" 
        onChange={handleInputChange}
        disabled={isProcessing}
      />

      <div className="z-10 flex flex-col items-center gap-6 p-6 text-center">
        <div className={`
            w-16 h-16 flex items-center justify-center rounded-full border
            transition-all duration-300
            ${isDragging 
                ? 'bg-avant-primary text-white border-avant-primary scale-110' 
                : 'bg-white text-avant-text border-avant-border group-hover:border-avant-primary'}
        `}>
            {isProcessing ? (
                <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
                <Upload className="w-6 h-6" />
            )}
        </div>
        
        <div className="space-y-1">
          <h3 className="text-lg font-semibold tracking-tight text-avant-text">
            {isProcessing ? 'UPLOADING...' : 'Upload Reference'}
          </h3>
          <p className="text-sm text-avant-muted font-mono max-w-[200px] mx-auto">
            {isProcessing ? 'Please wait while we connect to Hyper3D nodes.' : 'Drag & drop or click to browse'}
          </p>
        </div>
      </div>
      
      {/* Minimal corner markings */}
      <div className="absolute top-4 left-4 w-2 h-2 border-t border-l border-avant-text/20"></div>
      <div className="absolute top-4 right-4 w-2 h-2 border-t border-r border-avant-text/20"></div>
      <div className="absolute bottom-4 left-4 w-2 h-2 border-b border-l border-avant-text/20"></div>
      <div className="absolute bottom-4 right-4 w-2 h-2 border-b border-r border-avant-text/20"></div>
    </div>
  );
};