'use client';

import { motion } from 'framer-motion';
import { ExternalLink, Github, Waves, Database, FileText } from 'lucide-react';
import Link from 'next/link';

interface ProjectCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  visualElement?: React.ReactNode;
  links: Array<{ label: string; href: string; icon: 'external' | 'github' | 'research' }>;
  delay?: number;
}

function ProjectCard({ title, description, icon, visualElement, links, delay = 0 }: ProjectCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay }}
      className="glass-card p-6 md:p-8 group relative overflow-hidden"
    >
      {/* Background glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              {icon}
            </div>
            <h3 className="text-xl font-bold">{title}</h3>
          </div>
        </div>
        
        {/* Description */}
        <p className="text-muted-foreground mb-6 leading-relaxed">
          {description}
        </p>
        
        {/* Visual element (if provided) */}
        {visualElement && (
          <div className="mb-6 rounded-lg overflow-hidden border border-border/50">
            {visualElement}
          </div>
        )}
        
        {/* Links */}
        <div className="flex flex-wrap gap-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 text-sm font-medium hover:bg-primary/20 hover:text-primary transition-colors"
            >
              {link.icon === 'external' && <ExternalLink className="w-4 h-4" />}
              {link.icon === 'github' && <Github className="w-4 h-4" />}
              {link.icon === 'research' && <FileText className="w-4 h-4" />}
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// Simple audio waveform visualization
function AudioWaveform() {
  return (
    <div className="h-20 bg-black/50 flex items-center justify-center gap-1 p-4">
      {Array.from({ length: 32 }).map((_, i) => (
        <motion.div
          key={i}
          className="w-1 bg-primary rounded-full"
          initial={{ height: 8 }}
          animate={{ 
            height: [8, Math.random() * 40 + 20, 8],
          }}
          transition={{
            duration: 0.5 + Math.random() * 0.5,
            repeat: Infinity,
            repeatType: 'reverse',
            delay: i * 0.05,
          }}
        />
      ))}
    </div>
  );
}

// Data pipeline visualization
function DataPipeline() {
  return (
    <div className="h-20 bg-black/50 flex items-center justify-between p-4 overflow-hidden">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-terminal-green animate-pulse" />
        <span className="text-xs font-mono text-terminal-green">SRC</span>
      </div>
      
      <div className="flex-1 mx-4 relative h-2 bg-secondary/30 rounded-full overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute top-0 bottom-0 w-8 bg-gradient-to-r from-transparent via-primary to-transparent"
            initial={{ left: '-20%' }}
            animate={{ left: '120%' }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.3,
              ease: 'linear',
            }}
          />
        ))}
      </div>
      
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-terminal-amber">DST</span>
        <div className="w-3 h-3 rounded-full bg-terminal-amber animate-pulse" />
      </div>
    </div>
  );
}

export function ProjectsSection() {
  return (
    <section className="section relative z-10 py-32">
      <div className="max-w-5xl mx-auto px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <h2 className="text-sm font-mono text-primary mb-4 tracking-wider uppercase">
            // Projects
          </h2>
          <h3 className="text-3xl md:text-5xl font-bold mb-6">
            Selected <span className="gradient-text">Constellations</span>
          </h3>
          <p className="text-muted-foreground max-w-2xl">
            Projects orbiting the core themes of performance, scalability, and elegant solutions.
          </p>
        </motion.div>
        
        {/* Project cards */}
        <div className="grid gap-8">
          <ProjectCard
            title="NeuralWhisper"
            description="82M-parameter neural Text-to-Speech running 100% in-browser via WebGPU/WASM. Zero server dependencies, instant voice synthesis at the edge. A living sanctuary for browser-native AI."
            icon={<Waves className="w-5 h-5" />}
            visualElement={<AudioWaveform />}
            links={[
              { label: 'Live Demo', href: 'https://frontend-kappa-orpin-47.vercel.app/', icon: 'external' },
              { label: 'GitHub', href: 'https://github.com/teerthsharma/neuralwhisper', icon: 'github' },
            ]}
            delay={0}
          />
          
          <ProjectCard
            title="AETHER-Link"
            description="High-Performance I/O Prefetch Kernel for DirectStorage, WSL2. Optimized for high-frequency trading workloads with predictive prefetching and zero-copy transfers."
            icon={<Database className="w-5 h-5" />}
            visualElement={<DataPipeline />}
            links={[
               { label: 'ResearchGate (Paper)', href: 'https://www.researchgate.net/publication/398493933_AETHER_-_Adaptive_Event-driven_Threshold_Hybrid_Entangled_Rendering', icon: 'research' },
               { label: 'GitHub', href: 'https://github.com/teerthsharma/aether-link', icon: 'github' },
            ]}
            delay={0.15}
          />
          
          <ProjectCard
            title="Research & TensorRT-LLM"
            description="Sparse attention implementation (A.E.T.H.E.R. Algorithm) and custom CUDA kernel optimization for large language model inference. Published research on efficient transformer architectures."
            icon={<FileText className="w-5 h-5" />}
            links={[
              { label: 'ResearchGate', href: 'https://www.researchgate.net/profile/Teerth-Sharma', icon: 'research' },
            ]}
            delay={0.3}
          />
        </div>
      </div>
    </section>
  );
}
