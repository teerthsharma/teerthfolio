'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

interface LoaderProps {
  isLoading: boolean;
}

const loadingTexts = [
  "INITIALIZING KERNEL...",
  "LOADING NEURAL TEXTURES...",
  "CALIBRATING EVENT HORIZON...",
  "ESTABLISHING UPLINK...",
  "QUANTUM COHERENCE: 100%"
];

export function Loader({ isLoading }: LoaderProps) {
  const [textIndex, setTextIndex] = useState(0);

  useEffect(() => {
    if (!isLoading) return;
    
    const interval = setInterval(() => {
      setTextIndex((prev) => (prev < loadingTexts.length - 1 ? prev + 1 : prev));
    }, 800);

    return () => clearInterval(interval);
  }, [isLoading]);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 1.5, ease: "easeInOut" } }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black font-mono"
        >
          {/* Central Logo / Glitch Text */}
          <div className="relative mb-12">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="text-4xl md:text-6xl font-bold text-white tracking-tighter"
            >
              TEERTH SHARMA
            </motion.div>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 2, ease: "circOut" }}
              className="h-1 bg-terminal-green mt-2"
            />
          </div>

          {/* System Status Lines */}
          <div className="w-64 h-24 flex flex-col items-start justify-end overflow-hidden">
             <motion.div
               key={textIndex}
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="text-xs text-terminal-green/80"
             >
               {`> ${loadingTexts[textIndex]}`}
             </motion.div>
             {/* Previous lines visual clutter */}
             {textIndex > 0 && (
               <div className="text-xs text-terminal-green/40 opacity-50">
                 {`> ${loadingTexts[textIndex - 1]} [OK]`}
               </div>
             )}
          </div>

          {/* Progress Bar */}
          <div className="w-64 h-1 bg-gray-900 mt-4 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-terminal-green shadow-[0_0_10px_#00FF41]"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 4, ease: "easeInOut" }}
            />
          </div>

          {/* Bottom Right detail */}
          <div className="absolute bottom-8 right-8 text-[10px] text-gray-500">
            SYSTEM_V2.0.4 // BOOT_SEQ
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
