'use client';

import { motion, useMotionValue, useTransform } from 'framer-motion';
import { ChevronDown, MapPin, Cpu, Terminal } from 'lucide-react';
import { useEffect, useState } from 'react';

interface HeroSectionProps {
  onScrollClick?: () => void;
}

export function HeroSection({ onScrollClick }: HeroSectionProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useTransform(y, [-0.5, 0.5], [10, -10]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-10, 10]);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const name = "Teerth Sharma";

  return (
    <section 
      className="section relative z-10 min-h-screen flex flex-col justify-center items-center perspective-1000"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div 
        className="max-w-5xl mx-auto text-center relative pointer-events-none md:pointer-events-auto"
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      >
        
        {/* Semantic Overhead Element */}
        <motion.div
           initial={{ opacity: 0, y: -20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.8, delay: 0.1 }}
           className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md"
           style={{ transform: "translateZ(40px)" }}
        >
           <div className="w-2 h-2 rounded-full bg-terminal-green animate-pulse" />
           <span className="text-xs font-mono text-terminal-green tracking-widest uppercase">System Online</span>
        </motion.div>

        {/* Main Title - Character Stagger */}
        <h1 className="text-4xl sm:text-5xl md:text-8xl lg:text-9xl font-bold mb-6 tracking-tight relative z-20 font-display whitespace-nowrap animate-text-glow">
          {name.split("").map((char, index) => (
            <motion.span
              key={index}
              initial={{ opacity: 0, scale: 0, y: 50, rotateX: 90 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
              transition={{ 
                duration: 0.8, 
                delay: index * 0.05 + 0.2, 
                type: "spring", 
                damping: 12 
              }}
              className="inline-block gradient-text hover:scale-110 transition-transform duration-300 cursor-default"
              style={{ 
                 textShadow: "0 10px 30px rgba(255,59,48,0.3)"
              }}
            >
              {char === " " ? "\u00A0" : char}
            </motion.span>
          ))}
        </h1>
        
        {/* Role & Location */}
        <motion.div
           initial={{ opacity: 0, z: -100 }}
           animate={{ opacity: 1, z: 0 }}
           transition={{ duration: 1, delay: 0.8 }}
           className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 mb-12 text-lg md:text-xl font-light text-white/80"
           style={{ transform: "translateZ(20px)" }}
        >
           <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-lg border border-white/10">
              <Cpu className="w-5 h-5 text-terminal-amber" />
              <span>Systems Researcher</span>
           </div>
           <div className="hidden md:block w-px h-6 bg-white/20" />
           <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-lg border border-white/10">
              <MapPin className="w-5 h-5 text-terminal-green" />
              <span>Jaipur, India</span>
           </div>
        </motion.div>
        
        {/* Interactive Terminal Block */}
        <motion.div 
          className="inline-block text-left mb-20 relative group"
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: "auto" }}
          transition={{ duration: 0.8, delay: 1 }}
          style={{ transform: "translateZ(60px)" }}
        >
           <div className="absolute inset-0 bg-black/60 backdrop-blur-xl rounded-xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]" />
           
           <div className="relative p-6 md:p-8 font-mono text-sm md:text-base min-w-[300px] md:min-w-[500px]">
              <div className="flex gap-2 mb-4 border-b border-white/10 pb-4">
                 <div className="w-3 h-3 rounded-full bg-red-500/50" />
                 <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                 <div className="w-3 h-3 rounded-full bg-green-500/50" />
              </div>
              
              <div className="space-y-2">
                 <div className="flex animate-wave" style={{ animationDelay: '0s' }}>
                    <span className="text-terminal-green mr-2">➜</span>
                    <span className="text-terminal-amber">~/mission-control</span>
                    <span className="text-white ml-2">$ ./init_sequence.sh</span>
                 </div>
                 <div className="text-gray-400 pl-4 space-y-1">
                    <div className="animate-wave" style={{ animationDelay: '0.2s' }}>{`> Loading modules... [OK]`}</div>
                    <div className="animate-wave" style={{ animationDelay: '0.4s' }}>{`> Optimizing kernels... [OK]`}</div>
                    <div className="animate-wave" style={{ animationDelay: '0.6s' }}>{`> Establishing uplink... [READY]`}</div>
                 </div>
                 <div className="flex items-center mt-2 animate-wave" style={{ animationDelay: '0.8s' }}>
                    <span className="text-terminal-green mr-2">➜</span>
                    <span className="animate-pulse text-white">_</span>
                 </div>
              </div>
           </div>
           
           {/* Glow Removed as per request */}
        </motion.div>
        
        {/* Scroll Action */}
        <motion.button
          onClick={onScrollClick}
          className="flex flex-col items-center gap-2 mx-auto cursor-pointer text-white/50 hover:text-white transition-colors"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.5 }}
          whileHover={{ scale: 1.1 }}
          style={{ transform: "translateZ(30px)" }}
        >
          <span className="text-xs font-mono tracking-[0.2em] uppercase">Initialize</span>
          <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center bg-black/50 backdrop-blur-sm">
             <ChevronDown className="w-4 h-4 animate-bounce" />
          </div>
        </motion.button>

      </motion.div>
    </section>
  );
}
