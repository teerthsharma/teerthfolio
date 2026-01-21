'use client';

import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface HeroSectionProps {
  onScrollClick?: () => void;
}

export function HeroSection({ onScrollClick }: HeroSectionProps) {
  return (
    <section className="section relative z-10">
      <div className="max-w-4xl mx-auto text-center">
        {/* Main title */}
        <motion.h1 
          className="text-5xl md:text-7xl lg:text-8xl font-bold mb-4 tracking-tight"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <span className="gradient-text">Teerth Sharma</span>
        </motion.h1>
        
        {/* Role */}
        <motion.h2 
          className="text-xl md:text-2xl lg:text-3xl font-light text-foreground/90 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          Systems Researcher
        </motion.h2>
        
        {/* Location and specialization */}
        <motion.p 
          className="text-sm md:text-base text-muted-foreground mb-12 font-mono"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <span className="text-terminal-green">📍</span> Jaipur, India{' '}
          <span className="text-muted-foreground/50 mx-2">|</span>{' '}
          High-Performance Computing
        </motion.p>
        
        {/* Terminal-style tagline */}
        <motion.div 
          className="inline-block glass-card px-6 py-4 mb-16"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <code className="terminal-text text-sm md:text-base">
            <span className="text-muted-foreground">$</span>{' '}
            <span className="text-foreground">./init</span>{' '}
            <span className="text-accent">--mode</span>=research{' '}
            <span className="text-accent">--target</span>=gpu-optimization
            <span className="animate-cursor">_</span>
          </code>
        </motion.div>
        
        {/* Scroll indicator */}
        <motion.button
          onClick={onScrollClick}
          className="group flex flex-col items-center gap-2 mx-auto cursor-pointer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.2 }}
          whileHover={{ scale: 1.05 }}
        >
          <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
            Dive In
          </span>
          <ChevronDown className="w-6 h-6 text-primary animate-bounce" />
        </motion.button>
      </div>
    </section>
  );
}
