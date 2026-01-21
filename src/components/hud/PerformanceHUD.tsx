'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useLOD, tierDescriptions } from '@/hooks/useLOD';
import type { LODTier } from '@/hooks/useLOD';

interface PerformanceHUDProps {
  visible?: boolean;
}

export function PerformanceHUD({ visible = false }: PerformanceHUDProps) {
  const [isOpen, setIsOpen] = useState(visible);
  const [fps, setFps] = useState(60);
  const [drawCalls, setDrawCalls] = useState(0);
  const [memory, setMemory] = useState('--');
  const { tier, setTier, isAutoDetected } = useLOD();
  
  const frameTimesRef = useRef<number[]>([]);
  const lastTimeRef = useRef(performance.now());
  
  // FPS calculation
  useEffect(() => {
    let animationFrameId: number;
    
    const measureFPS = () => {
      const now = performance.now();
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;
      
      frameTimesRef.current.push(delta);
      if (frameTimesRef.current.length > 60) {
        frameTimesRef.current.shift();
      }
      
      const avgFrameTime = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
      setFps(Math.round(1000 / avgFrameTime));
      
      animationFrameId = requestAnimationFrame(measureFPS);
    };
    
    if (isOpen) {
      animationFrameId = requestAnimationFrame(measureFPS);
    }
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isOpen]);
  
  // Memory estimation (WebGL context)
  useEffect(() => {
    if (!isOpen) return;
    
    const estimateMemory = () => {
      // Estimate based on LOD tier
      const baseMemory = tier === 'A' ? 256 : tier === 'B' ? 128 : 64;
      setMemory(`~${baseMemory} MB`);
      
      // Simulated draw calls based on tier
      setDrawCalls(tier === 'A' ? 24 : tier === 'B' ? 16 : 8);
    };
    
    estimateMemory();
    const interval = setInterval(estimateMemory, 1000);
    return () => clearInterval(interval);
  }, [isOpen, tier]);
  
  const tierOptions: LODTier[] = ['A', 'B', 'C'];
  
  return (
    <>
      {/* Toggle button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-50 hud-panel hover:border-terminal-green/60 transition-colors"
      >
        {isOpen ? '✕ HUD' : '◌ HUD'}
      </motion.button>
      
      {/* HUD Panel */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-16 right-4 z-50 hud-panel min-w-[200px]"
        >
          <div className="text-terminal-amber text-xs mb-3 font-bold tracking-wider">
            // PERFORMANCE HUD
          </div>
          
          <div className="space-y-2 text-xs">
            {/* FPS */}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">FPS:</span>
              <span className={fps >= 55 ? 'text-terminal-green' : fps >= 30 ? 'text-terminal-amber' : 'text-red-500'}>
                {fps}
              </span>
            </div>
            
            {/* Draw Calls */}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Draw Calls:</span>
              <span className="text-terminal-green">{drawCalls}</span>
            </div>
            
            {/* Memory */}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">VRAM Est:</span>
              <span className="text-terminal-green">{memory}</span>
            </div>
            
            {/* LOD Tier */}
            <div className="pt-2 mt-2 border-t border-terminal-green/20">
              <div className="flex justify-between items-center mb-2">
                <span className="text-muted-foreground">LOD Tier:</span>
                <span className="text-primary">
                  {tier} {isAutoDetected && <span className="text-muted-foreground text-[10px]">(auto)</span>}
                </span>
              </div>
              
              {/* Tier selector */}
              <div className="flex gap-1">
                {tierOptions.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTier(t)}
                    className={`flex-1 py-1 px-2 rounded text-[10px] transition-colors ${
                      tier === t
                        ? 'bg-terminal-green text-black font-bold'
                        : 'bg-terminal-green/10 text-terminal-green hover:bg-terminal-green/20'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              
              <div className="mt-2 text-[10px] text-muted-foreground">
                {tierDescriptions[tier]}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
}
