'use client';

import { motion } from 'framer-motion';
import { ExternalLink, Github, Database, Zap, BookOpen } from 'lucide-react';

import Image from 'next/image';

interface Project {
  title: string;
  description: string;
  image: string;
  links: Array<{ label: string; href: string; icon: 'external' | 'github' | 'research' }>;
  tech: string[];
}

const projects: Project[] = [
  {
    title: 'AETHER-Lang',
    description: 'Creator of the Aether runtime primitives for LLM Inference. A groundbreaking formally verified kernel proven in Lean 4 with 20+ sorry-free theorems by AgentHALO researchers, guaranteeing production safety mathematically.',
    image: '/projects/aether-lang.png',
    tech: ['Lean 4', 'C', 'Rust'],
    links: [
        { label: 'Paper/Proof', href: 'https://www.apoth3osis.io/paper-proof-code/aether-verified-kernel', icon: 'research' },
        { label: 'GitHub', href: 'https://github.com/teerthsharma/Aether-Lang', icon: 'github' }
    ]
  },
  {
    title: 'AETHER-Link',
    description: 'Production Runtime Integration connecting the formally verified Aether kernel primitives into the AgentHALO ecosystem. Inherits the mathematically proven resource safety of the Aether core.',
    image: '/projects/aether-link.png',
    tech: ['Lean 4', 'Rust', 'Wasm'],
    links: [
        { label: 'Research', href: 'https://www.apoth3osis.io/research/projects/aether-runtime-integration', icon: 'research' },
        { label: 'GitHub', href: 'https://github.com/teerthsharma/aether-link', icon: 'github' }
    ]
  },
  {
    title: 'AETHER-Wave',
    description: 'Topological signal processing and mathematical manifolds forming the core building blocks for the Aether runtime series. The mathematical foundation that enabled the Lean 4 formal proofs.',
    image: '/projects/aether-wave.png',
    tech: ['Lean 4', 'C++', 'CUDA', 'Python'],
    links: [
        { label: 'GitHub', href: 'https://github.com/teerthsharma/aether-wave', icon: 'github' }
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
                            initial={{ 
                                opacity: 0, 
                                y: 100, 
                                rotateX: 10,
                                rotateY: index % 3 === 0 ? 15 : index % 3 === 2 ? -15 : 0 // Tilt towards center
                            }}
                            whileInView={{ 
                                opacity: 1, 
                                y: 0, 
                                rotateX: 0,
                                rotateY: index % 3 === 0 ? 5 : index % 3 === 2 ? -5 : 0 // Maintain slight tilt
                            }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.8, delay: index * 0.1 }}
                        >
                            <motion.div
                                animate={{ y: [0, -10, 0] }}
                                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: index * 2 }}
                                className="group h-full"
                            >
                                <div className="glass-card h-full flex flex-col justify-between hover:bg-white/5 transition-all duration-500 border border-white/5 hover:border-white/20 relative overflow-hidden rounded-2xl">
                                    
                                    {/* Project Image Header */}
                                    <div className="relative w-full h-48 sm:h-56 overflow-hidden border-b border-white/10 group-hover:border-white/20 transition-colors">
                                        <Image
                                            src={project.image}
                                            alt={project.title}
                                            fill
                                            className="object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                    </div>

                                    {/* Reveal Mask Effect on Hover */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-terminal-green/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                                    
                                    <div className="p-8 pb-4 flex-grow">
                                        <div className="mb-6 flex justify-between items-start">
                                            <h3 className="text-3xl font-bold group-hover:text-terminal-green transition-colors font-display">
                                                {project.title}
                                            </h3>
                                            <div className="flex gap-2">
                                                {project.links.map((link, i) => (
                                                    <a 
                                                        key={i} 
                                                        href={link.href} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="p-2 hover:bg-white/10 rounded-full transition-colors bg-white/5"
                                                        title={link.label}
                                                    >
                                                        {link.icon === 'github' ? <Github className="w-5 h-5 text-white/70 hover:text-white" /> : <ExternalLink className="w-5 h-5 text-white/70 hover:text-white" />}
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        <p className="text-muted-foreground leading-relaxed mb-8">
                                            {project.description}
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap gap-2 px-8 pb-8">
                                        {project.tech.map((t) => (
                                            <span key={t} className="text-xs font-mono text-white/40 px-2 py-1 bg-white/5 rounded border border-white/5 hover:bg-white/10 hover:text-white/60 transition-colors">
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
