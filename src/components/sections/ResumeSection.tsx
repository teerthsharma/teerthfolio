'use client';

import { motion } from 'framer-motion';
import { Download, FileText, Cpu, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

export function ResumeSection() {
  const [isHovering, setIsHovering] = useState(false);

  return (
    <section className="section relative z-10 py-32 perspective-1000">
      <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
        
        {/* Left: Text & Action */}
        <motion.div
           initial={{ opacity: 0, x: -50 }}
           whileInView={{ opacity: 1, x: 0 }}
           viewport={{ once: true }}
           transition={{ duration: 0.8 }}
        >
          <div className="flex items-center gap-2 mb-6 text-terminal-green/80 font-mono text-sm tracking-widest uppercase">
            <Cpu className="w-4 h-4 animate-pulse" />
            <span>Classified Data</span>
          </div>
          
          <h2 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            System <span className="gradient-text">Manifest</span>
          </h2>
          
          <p className="text-lg text-muted-foreground mb-10 leading-relaxed max-w-lg">
            Access the full technical specifications and operational history. 
            This document contains classified data regarding mission parameters and system architecture.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <motion.a
              href="/Teerth Sharma - Systems Researcher.pdf"
              download="Teerth_Sharma_CV.pdf"
              className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-white text-black font-bold text-lg rounded-lg overflow-hidden hover:bg-terminal-green transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="relative z-10 flex items-center gap-2">
                <Download className="w-5 h-5" />
                EXTRACT DATA
              </span>
              <div className="absolute inset-0 bg-terminal-green/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </motion.a>
            
            <motion.button
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/5 border border-white/10 text-white font-mono rounded-lg hover:bg-white/10 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.open('/Teerth Sharma - Systems Researcher.pdf', '_blank')}
            >
              <FileText className="w-5 h-5" />
              VIEW_LOGS
            </motion.button>
          </div>
        </motion.div>
        
        {/* Right: Holographic Data Pad */}
        <motion.div
           initial={{ opacity: 0, rotateY: 30, rotateX: 10 }}
           whileInView={{ opacity: 1, rotateY: -10, rotateX: 5 }}
           viewport={{ once: true }}
           transition={{ duration: 1, type: "spring" }}
           className="relative hidden md:block" // Hide on mobile for performance/space
           style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Floating Elements */}
          <motion.div 
            animate={{ y: [0, -20, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="relative z-10"
          >
             {/* The Pad Container */}
             <div 
               className="relative aspect-[3/4] bg-black/80 rounded-xl border border-white/10 overflow-hidden shadow-[0_0_50px_rgba(0,255,65,0.1)] group"
               onMouseEnter={() => setIsHovering(true)}
               onMouseLeave={() => setIsHovering(false)}
             >
                {/* Header UI */}
                <div className="h-8 bg-white/5 border-b border-white/10 flex items-center justify-between px-3">
                   <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-red-500/50" />
                      <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                   </div>
                   <div className="text-[10px] font-mono text-white/30">ID: TS-2026-X</div>
                </div>

                {/* PDF Preview (IFrame) */}
                <div className="w-full h-full relative">
                   <iframe 
                      src="/Teerth Sharma - Systems Researcher.pdf#toolbar=0&navpanes=0&scrollbar=0" 
                      className="w-full h-full opacity-60 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
                      style={{ pointerEvents: 'none' }} // Disable interaction within iframe
                   />
                   
                   {/* Holographic Overlay (Scanlines) */}
                   <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-20 background-size-[100%_2px,3px_100%] pointer-events-none" />
                   
                   {/* Security badge overlay */}
                   <div className={`absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isHovering ? 'opacity-0' : 'opacity-100'}`}>
                      <div className="border border-terminal-green/50 p-4 rounded bg-black/80 text-center">
                         <ShieldCheck className="w-8 h-8 text-terminal-green mx-auto mb-2" />
                         <div className="text-xs font-mono text-terminal-green">SECURE DOCUMENT</div>
                         <div className="text-[9px] text-white/50">HOVER TO DECRYPT</div>
                      </div>
                   </div>
                </div>
             </div>
             
             {/* Backing Glow */}
             <div className="absolute -inset-4 bg-terminal-green/20 blur-3xl -z-10 rounded-full opacity-20" />
          </motion.div>
        </motion.div>

      </div>
    </section>
  );
}
