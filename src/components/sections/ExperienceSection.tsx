'use client';

import { motion } from 'framer-motion';
import { Briefcase, GraduationCap, PenTool, Server } from 'lucide-react';

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
    tech: ['Storytelling', 'Content Strategy']
  }
];

export function ExperienceSection() {
  return (
    <section className="section relative z-10 py-32">
      <div className="max-w-4xl mx-auto px-6">
        
        {/* Header */}
        <motion.div
           initial={{ opacity: 0, y: 30 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true, margin: "-100px" }}
           transition={{ duration: 0.6 }}
           className="mb-16 pl-6 border-l-2 border-dashed border-terminal-green/30"
        >
          <h2 className="text-sm font-mono text-primary mb-4 tracking-wider uppercase">
            // Mission Log (Experience)
          </h2>
          <h3 className="text-3xl md:text-5xl font-bold">
            Trajectory <span className="gradient-text">Timeline</span>
          </h3>
        </motion.div>

        {/* Timeline */}
        <div className="relative border-l border-white/10 ml-6 md:ml-8 space-y-12">
          {experienceData.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative pl-8 md:pl-12"
            >
              {/* Node on the line */}
              <div className={`absolute -left-[5px] md:-left-[9px] top-0 w-3 h-3 md:w-5 md:h-5 rounded-full bg-black border-2 border-current ${item.color}`} />
              
              <div className="glass-card p-6 md:p-8 hover:bg-white/5 transition-colors group">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-white/5 ${item.color}`}>
                      <item.icon className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <div>
                      <h4 className="text-lg md:text-xl font-bold group-hover:text-primary transition-colors">
                        {item.role}
                      </h4>
                      <p className="text-muted-foreground font-mono text-sm">
                        {item.company} // {item.location}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs md:text-sm font-mono py-1 px-3 rounded-full bg-white/5 text-muted-foreground border border-white/10 whitespace-nowrap">
                    {item.period}
                  </div>
                </div>

                <p className="text-sm md:text-base text-gray-300 leading-relaxed mb-4">
                  {item.description}
                </p>

                <div className="flex flex-wrap gap-2">
                  {item.tech.map((tech) => (
                    <span key={tech} className="text-xs font-mono text-muted-foreground/80 px-2 py-1 rounded bg-black/30">
                      #{tech}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
