import React from 'react';
import { Box, ExternalLink } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="w-full py-6 px-6 lg:px-12 flex justify-between items-center sticky top-0 z-50 bg-avant-base/90 backdrop-blur-sm border-b border-avant-border">
      <a 
        href="https://hyper3d.ai" 
        target="_blank" 
        rel="noopener noreferrer"
        className="flex items-center gap-3 group hover:opacity-70 transition-opacity"
      >
        <div className="p-2 bg-avant-primary text-white rounded-sm">
          <Box className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-avant-text flex items-center gap-2">
            HYPER3D.AI
            <ExternalLink className="w-3 h-3 text-avant-muted opacity-0 group-hover:opacity-100 transition-opacity" />
          </h1>
          <p className="text-[10px] font-mono text-avant-muted uppercase tracking-wider">Generative 3D Foundation</p>
        </div>
      </a>
      
      <div className="hidden md:flex items-center gap-6">
        <nav className="flex gap-4 text-sm font-medium text-avant-text">
            <a href="https://hyper3d.ai" target="_blank" className="hover:text-avant-muted transition-colors">Platform</a>
            <a href="https://developer.hyper3d.ai" target="_blank" className="hover:text-avant-muted transition-colors">Documentation</a>
        </nav>
        <div className="flex items-center gap-2 px-3 py-1 bg-avant-surface border border-avant-border rounded-full">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-xs font-mono text-avant-muted">VIBECODING_KEY_ACTIVE</span>
        </div>
      </div>
    </header>
  );
};