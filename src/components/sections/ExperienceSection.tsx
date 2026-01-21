'use client';

import { motion } from 'framer-motion';
import { GraduationCap, PenTool, Server } from 'lucide-react';

const experienceData = [
  {
    type: 'work',
    role: 'Chief Technology Officer (CTO) & Co-Founder',
    company: 'KarmicSphere Media',
    period: 'Jun 2025 – Present', 
    location: 'Jaipur, India',
    description: 'Leading technical strategy and infrastructure. Overseeing deployment of Linux-based systems and optimizing administrative workflows.',
    icon: Server,
    color: 'text-terminal-amber',
    borderColor: 'border-terminal-amber',
    tech: ['Linux', 'System Admin', 'Strategic Planning']
  },
  {
    type: 'education',
    role: 'Bachelor of Technology, Computer Science',
    company: 'Manipal University Jaipur',
    period: '2024 – 2028 (Expected)',
    location: 'Jaipur, India',
    description: 'Focus Areas: LLM Fine-tuning, Business Analysis, High-Energy Physics applications in Computing.',
    icon: GraduationCap,
    color: 'text-terminal-green',
    borderColor: 'border-terminal-green',
    tech: ['LLMs', 'Physics', 'CompSci']
  },
  {
    type: 'work',
    role: 'Writer (Self-Employed)',
    company: 'Remote',
    period: 'Jun 2021 – Jun 2025',
    location: 'Remote',
    description: 'Published writer specializing in creative and web content, developing a strong foundation in storytelling and communication.',
    icon: PenTool,
    color: 'text-blue-400',
    borderColor: 'border-blue-400',
    tech: ['Storytelling', 'Content Strategy']
  }
];

export function ExperienceSection() {
  return (
    <section className="section relative z-10 py-32 perspective-1000">
      <div className="max-w-5xl mx-auto px-6">
        
        {/* Header */}
        <motion.div
           initial={{ opacity: 0, scale: 0.9, rotateX: 20 }}
           whileInView={{ opacity: 1, scale: 1, rotateX: 0 }}
           viewport={{ once: true, margin: "-100px" }}
           transition={{ duration: 0.8 }}
           className="mb-24 text-center"
        >
          <h2 className="text-sm font-mono text-primary mb-4 tracking-[0.3em] uppercase opacity-80">
            // Mission Log 
          </h2>
          <h3 className="text-6xl md:text-8xl font-bold mb-4 tracking-tighter">
            Trajectory <span className="gradient-text">Timeline</span>
          </h3>
          <div className="w-px h-24 bg-gradient-to-b from-primary to-transparent mx-auto opacity-50" />
        </motion.div>

        {/* Timeline Container */}
        <div className="relative space-y-32">
          
          {/* Central Line */}
          <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-white/5 md:-translate-x-1/2">
            <motion.div 
               className="h-[300px] w-full bg-gradient-to-b from-transparent via-terminal-green to-transparent opacity-50 blur-sm"
               animate={{ top: ['-20%', '120%'] }}
               transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
               style={{ position: 'absolute' }}
            />
          </div>

          {experienceData.map((item, index) => {
            const isEven = index % 2 === 0;
            return (
              <div key={index} className={`relative flex flex-col md:flex-row gap-12 items-center ${isEven ? 'md:flex-row-reverse' : ''}`}>
                
                {/* Spacer (Empty side) */}
                <div className="hidden md:block flex-1" />

                {/* Central Node */}
                <div className="absolute left-4 md:left-1/2 md:-translate-x-1/2 z-10">
                   <motion.div 
                     initial={{ scale: 0 }}
                     whileInView={{ scale: 1 }}
                     viewport={{ once: true }}
                     className="w-4 h-4 rounded-full bg-black border border-white/50 flex items-center justify-center"
                   >
                     <div className={`w-2 h-2 rounded-full ${item.color.replace('text-', 'bg-')} animate-pulse`} />
                   </motion.div>
                </div>

                {/* Content Card with 3D Entrance */}
                <motion.div 
                  className="flex-1 pl-12 md:pl-0 w-full"
                  initial={{ 
                    opacity: 0, 
                    x: isEven ? -100 : 100, 
                    y: 50,
                    rotateY: isEven ? 45 : -45,
                    rotateX: 20
                  }}
                  whileInView={{ 
                    opacity: 1, 
                    x: 0, 
                    y: 0,
                    rotateY: 0,
                    rotateX: 0
                  }}
                  viewport={{ once: true, margin: "-10%" }}
                  transition={{ duration: 1, type: "spring", bounce: 0.3, delay: index * 0.2 }}
                >
                  <motion.div 
                    animate={{ y: [0, -15, 0] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: index * 1.2 }}
                  >
                    <div className={`glass-card p-8 md:p-10 relative overflow-hidden group hover:border-white/20 transition-all duration-500`}>
                      
                      {/* Tech decoration lines */}
                      <div className="absolute top-0 right-0 p-4 opacity-20">
                         <div className="w-16 h-1 bg-white/20 mb-1 ml-auto" />
                         <div className="w-8 h-1 bg-white/20 ml-auto" />
                      </div>

                      <div className="flex flex-col gap-6 mb-6">
                        <div className="flex items-center gap-4">
                           <div className={`p-4 rounded-2xl bg-white/5 ${item.color} backdrop-blur-md`}>
                             <item.icon className="w-8 h-8" />
                           </div>
                           <div>
                              <div className="font-mono text-xs text-white/30 uppercase tracking-widest mb-1">
                                {item.period}
                              </div>
                              <h4 className="text-2xl md:text-3xl font-bold leading-none group-hover:text-white transition-colors">
                                {item.role}
                              </h4>
                           </div>
                        </div>
                        
                        <div className="pl-2 border-l-2 border-white/10">
                          <p className="text-base font-mono text-muted-foreground">
                            {item.company} <br/> <span className="text-xs opacity-50">{item.location}</span>
                          </p>
                        </div>
                      </div>

                      <p className="text-gray-400 leading-relaxed mb-8 text-lg font-light">
                        {item.description}
                      </p>

                      <div className="flex flex-wrap gap-3">
                        {item.tech.map((tech) => (
                          <span key={tech} className="text-xs uppercase font-bold tracking-widest text-white/40 px-3 py-1 bg-white/5 rounded-full hover:bg-white/10 hover:text-white transition-colors cursor-default">
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </motion.div>

              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
