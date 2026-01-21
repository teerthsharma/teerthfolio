'use client';

import { motion } from 'framer-motion';
import { ExternalLink, Github, Database, Zap, BookOpen } from 'lucide-react';

interface Project {
  title: string;
  description: string;
  icon: React.ReactNode;
  visualElement?: React.ReactNode;
  links: Array<{ label: string; href: string; icon: 'external' | 'github' | 'research' }>;
  tech: string[];
}

const projects: Project[] = [
  {
    title: 'AETHER-Link',
    description: 'Developed an Adaptive Event-driven Threshold Hybrid Entangled Rendering system for high-performance computing.',
    icon: <Zap className="w-10 h-10 text-terminal-amber" />,
    tech: ['Rust', 'WebGPU', 'Triton', 'WASM'],
    links: [
        { label: 'ResearchGate', href: 'https://www.researchgate.net/publication/398493933_AETHER_-_Adaptive_Event-driven_Threshold_Hybrid_Entangled_Rendering', icon: 'research' },
        { label: 'GitHub', href: 'https://github.com/teerthsharma', icon: 'github' }
    ]
  },
  {
    title: 'Void-Engine',
    description: 'Built a sparse-attention driven neural engine optimizing latency by 40% using custom CUDA kernels.',
    icon: <Database className="w-10 h-10 text-blue-500" />,
    tech: ['C++', 'CUDA', 'Python', 'PyTorch'],
    links: [
        { label: 'GitHub', href: 'https://github.com/teerthsharma', icon: 'github' }
    ]
  },
  { // Placeholder for 3rd project to complete the grid
    title: 'Quantum-CLI',
    description: 'A terminal-based interface for visualizing quantum bit states and superposition probabilities.',
    icon: <BookOpen className="w-10 h-10 text-terminal-green" />,
    tech: ['TypeScript', 'Node.js', 'Quantum.js'],
    links: [
        { label: 'GitHub', href: 'https://github.com/teerthsharma', icon: 'github' }
    ]
  }
];

export function ProjectsSection() {
  return (
    <section className="section relative z-10 py-32 perspective-1000">
        <div className="max-w-7xl mx-auto px-6">
            
            {/* Header */}
            <motion.div
               initial={{ opacity: 0, y: 50 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               transition={{ duration: 0.8 }}
               className="mb-32 max-w-2xl"
            >
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-1 bg-terminal-green" />
                    <span className="font-mono text-terminal-green uppercase tracking-widest text-sm">Deployments</span>
                </div>
                <h2 className="text-4xl sm:text-5xl md:text-8xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/50 leading-[0.9]">
                    System <br/>
                    <span className="text-terminal-amber">Architectures</span>
                </h2>
            </motion.div>

            {/* 3D Staggered Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
                {projects.map((project, index) => {
                    // Stagger vertical placement for parallax feel
                    const marginTop = index === 1 ? 'md:mt-24' : index === 2 ? 'md:mt-48' : '';
                    
                    return (
                        <motion.div
                            key={index}
                            className={`relative ${marginTop}`}
                            initial={{ opacity: 0, y: 100, rotateX: 10 }}
                            whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.8, delay: index * 0.1 }}
                        >
                            <motion.div
                                animate={{ y: [0, -10, 0] }}
                                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: index * 2 }}
                                className="group h-full"
                            >
                                <div className="glass-card h-full p-8 flex flex-col justify-between hover:bg-white/5 transition-all duration-500 border border-white/5 hover:border-white/20 relative overflow-hidden">
                                    
                                    {/* Reveal Mask Effect on Hover */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-terminal-green/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                                    
                                    <div>
                                        <div className="mb-8 flex justify-between items-start">
                                            <div className="p-4 rounded-xl bg-white/5 border border-white/10 group-hover:scale-110 transition-transform duration-500">
                                                {project.icon}
                                            </div>
                                            <div className="flex gap-2">
                                                {project.links.map((link, i) => (
                                                    <a 
                                                        key={i} 
                                                        href={link.href} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                                        title={link.label}
                                                    >
                                                        {link.icon === 'github' ? <Github className="w-5 h-5" /> : <ExternalLink className="w-5 h-5" />}
                                                    </a>
                                                ))}
                                            </div>
                                        </div>

                                        <h3 className="text-3xl font-bold mb-4 group-hover:text-terminal-green transition-colors font-display">
                                            {project.title}
                                        </h3>
                                        
                                        <p className="text-muted-foreground leading-relaxed mb-8">
                                            {project.description}
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap gap-2 pt-8 border-t border-white/5">
                                        {project.tech.map((t) => (
                                            <span key={t} className="text-xs font-mono text-white/40 px-2 py-1 bg-white/5 rounded border border-white/5">
                                                {t}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    </section>
  );
}
