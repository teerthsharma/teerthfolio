'use client';

import { motion } from 'framer-motion';
import { Cpu, Zap, BrainCircuit, Code, Terminal, Layers } from 'lucide-react';

const skillSets = [
  {
    category: 'Languages',
    icon: Code,
    skills: ['Rust (High Performance)', 'C++ (CUDA/Systems)', 'Python (PyTorch/MLX)', 'Assembly', 'TypeScript'],
  },
  {
    category: 'Systems & AI',
    icon: Terminal,
    skills: ['NVIDIA Triton', 'TensorRT-LLM', 'Apple Metal (MLX)', 'WebGPU', 'WASM', 'DirectStorage', 'Docker'],
  },
  {
    category: 'Core Competencies',
    icon: Layers,
    skills: ['Kernel Optimization', 'Sparse Attention', 'DSP', 'Latency Optimization', 'Psychoacoustics'],
  },
];

const highlights = [
  {
    icon: Cpu,
    title: 'Hardware-Aware Optimization',
    description: 'Designing algorithms that understand and exploit GPU architecture.',
  },
  {
    icon: Zap,
    title: 'Sparse Attention Mechanisms',
    description: 'Reducing computational complexity without sacrificing accuracy.',
  },
  {
    icon: BrainCircuit,
    title: 'Neural Network Inference',
    description: 'Optimizing TensorRT-LLM and custom CUDA kernels.',
  },
];

export function AboutSection() {
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
            {'// About'}
          </h2>
          <h3 className="text-3xl md:text-5xl font-bold mb-6">
            Engineering at the Edge of <span className="gradient-text">Possibility</span>
          </h3>
        </motion.div>
        
        {/* Main description */}
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true, margin: "-100px" }}
           transition={{ duration: 0.6, delay: 0.2 }}
           className="glass-card p-8 mb-16"
        >
          <p className="text-lg md:text-xl text-foreground/90 leading-relaxed">
            I specialize in <span className="text-primary font-semibold">hardware-aware AI optimization</span> and{' '}
            <span className="text-primary font-semibold">sparse attention mechanisms</span>. 
            My work focuses on the intersection of systems programming and machine learning—building 
            infrastructure that makes neural networks run faster, use less memory, and deploy anywhere.
          </p>
        </motion.div>
        
        {/* Highlight cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {highlights.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
              className="glass-card p-6 group hover:border-primary/30 transition-colors"
            >
              <item.icon className="w-10 h-10 text-primary mb-4 group-hover:scale-110 transition-transform" />
              <h4 className="text-lg font-semibold mb-2">{item.title}</h4>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Technical Arsenal */}
         <motion.div
           initial={{ opacity: 0, y: 30 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true }}
           transition={{ duration: 0.6 }}
        >
           <h3 className="text-2xl md:text-3xl font-bold mb-8 flex items-center gap-3">
             <span className="w-8 h-1 bg-primary rounded-full"></span>
             Technical Arsenal
           </h3>
           
           <div className="grid md:grid-cols-3 gap-8">
             {skillSets.map((set) => (
               <div key={set.category}>
                 <div className="flex items-center gap-2 mb-4 text-terminal-green/80 font-mono text-sm uppercase tracking-wider">
                   <set.icon className="w-4 h-4" />
                   {set.category}
                 </div>
                 <ul className="space-y-2">
                   {set.skills.map((skill) => (
                     <li key={skill} className="text-muted-foreground/80 hover:text-white transition-colors border-l border-white/10 pl-3 text-sm">
                       {skill}
                     </li>
                   ))}
                 </ul>
               </div>
             ))}
           </div>
        </motion.div>
        
        {/* Target companies */}
        <motion.div
           initial={{ opacity: 0 }}
           whileInView={{ opacity: 1 }}
           viewport={{ once: true }}
           transition={{ duration: 0.6, delay: 0.4 }}
           className="mt-16 text-center"
        >
          <p className="text-sm text-muted-foreground font-mono">
            <span className="text-terminal-green">target_orgs</span>:{' '}
            <span className="text-foreground/70">NVIDIA (TensorRT) • Google (XLA/JAX) • Meta (FAIR) • Microsoft (DirectStorage)</span>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
