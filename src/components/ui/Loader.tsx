'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

interface LoaderProps {
  isLoading: boolean;
}

const steps = [
  "INITIALIZING KERNEL...",
  "DECRYPTING BIOMETRICS...",
  "ALLOCATING NEURAL BUFFERS...",
  "BYPASSING SECURITY PROTOCOLS...",
  "ESTABLISHING UPLINK: SECURE"
];

const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*";

export function Loader({ isLoading }: LoaderProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [scrambleText, setScrambleText] = useState("TEERTH SHARMA");

  // Scramble effect for the title
  useEffect(() => {
    if (!isLoading) return;
    
    let iterations = 0;
    const interval = setInterval(() => {
      setScrambleText(prev => 
        prev.split("")
          .map((char, index) => {
            if (index < iterations) return "TEERTH SHARMA"[index];
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join("")
      );
      
      if (iterations >= 13) clearInterval(interval);
      iterations += 1/3; // Speed
    }, 30);
    
    return () => clearInterval(interval);
  }, [isLoading]);

  // Cycle through steps
  useEffect(() => {
    if (!isLoading) return;
    const interval = setInterval(() => {
      setCurrentStep(prev => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 600);
    return () => clearInterval(interval);
  }, [isLoading]);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center overflow-hidden"
        >
          {/* Background Matrix Rain / Hex Dump */}
          <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden text-[10px] font-mono text-terminal-green leading-3 break-all">
            {Array.from({ length: 4000 }).map(() => Math.random() > 0.5 ? '1' : '0').join('')}
          </div>
          
          {/* Scanline Overlay */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-terminal-green/5 to-transparent h-full w-full animate-scan" style={{ backgroundSize: '100% 3px' }} />

          {/* Main Content */}
          <div className="relative z-10 flex flex-col items-center">
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-5xl md:text-8xl font-black tracking-tighter text-white mb-2 mix-blend-difference"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {scrambleText}
            </motion.div>
            
            <motion.div 
              className="h-1 bg-terminal-green w-full mb-12 shadow-[0_0_20px_#00FF41]"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.8, ease: "circOut" }}
            />

            {/* Terminal Output */}
            <div className="w-full max-w-md font-mono text-xs md:text-sm text-terminal-green/80 space-y-1">
               {steps.map((step, idx) => (
                 idx <= currentStep && (
                   <motion.div key={idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                     <span className="text-terminal-amber mr-2">[{idx === currentStep && idx !== steps.length-1 ? "BUSY" : "OK"}]</span>
                     {step}
                   </motion.div>
                 )
               ))}
            </div>

            {/* Bottom Loader */}
            <div className="absolute bottom-10 left-0 right-0 px-10 flex justify-between items-end font-mono text-[10px] text-gray-500">
               <span>MEM: 64TB // QUBITS: 4096</span>
               <span className="animate-pulse text-terminal-green">SYSTEM READY</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
