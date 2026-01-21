'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, ExternalLink, FileText } from 'lucide-react';

interface TerminalLine {
  id: number;
  label: string;
  value: string;
  href?: string;
  copyable?: boolean;
}

const contactLinks: TerminalLine[] = [
  { id: 1, label: 'Email', value: 'teerths57@gmail.com', copyable: true },
  { id: 2, label: 'LinkedIn', value: 'linkedin.com/in/teerth-sharma', href: 'https://linkedin.com/in/teerth-sharma-423659320' },
  { id: 3, label: 'GitHub', value: 'github.com/teerthsharma', href: 'https://github.com/teerthsharma' },
  { id: 4, label: 'ResearchGate', value: 'researchgate.net/profile/Teerth-Sharma', href: 'https://www.researchgate.net/profile/Teerth-Sharma' },
];

export function TerminalFooter() {
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  
  const handleCopy = async (text: string, id: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  const handleLineClick = (line: TerminalLine) => {
    setSelectedOption(line.id);
    
    if (line.href) {
      window.open(line.href, '_blank', 'noopener,noreferrer');
    } else if (line.copyable) {
      handleCopy(line.value, line.id);
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = parseInt(e.key);
      if (key >= 1 && key <= 4) {
        const link = contactLinks.find(l => l.id === key);
        if (link) {
          handleLineClick(link);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  return (
    <section className="section relative z-10 py-24 min-h-[60vh]">
      <div className="max-w-3xl mx-auto px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h2 className="text-sm font-mono text-primary mb-4 tracking-wider uppercase">
            // Contact & Signal
          </h2>
          <h3 className="text-3xl md:text-4xl font-bold mb-4">
            Establish <span className="gradient-text">Connection</span>
          </h3>
        </motion.div>
        
        {/* Terminal window */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="rounded-lg overflow-hidden border border-terminal-green/30 bg-black/80 shadow-[0_0_30px_rgba(0,255,65,0.1)]"
        >
          {/* Terminal header */}
          <div className="flex items-center gap-2 px-4 py-2 bg-black/50 border-b border-terminal-green/20">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
            <span className="ml-4 text-xs font-mono text-muted-foreground">
              terminal@teerth-sharma:~ (secure)
            </span>
          </div>
          
          {/* Terminal content */}
          <div className="p-4 md:p-6 font-mono text-sm md:text-base">
            {/* Command prompt */}
            <div className="mb-4">
              <span className="text-terminal-green">user@root:~$</span>{' '}
              <span className="text-white">connect</span>{' '}
              <span className="text-muted-foreground">--protocol=secure --auto-link</span>
            </div>
            
            {/* Output header */}
            <div className="text-muted-foreground mb-4 animate-fade-in">
              &gt; Establishing uplink to Teerth Sharma...
              <br/>
              &gt; Available protocols detected: [1-4]
            </div>
            
            {/* Contact options */}
            <div className="space-y-2">
              {contactLinks.map((line, index) => (
                <motion.button
                  key={line.id}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                  onClick={() => handleLineClick(line)}
                  className={`w-full text-left flex items-start md:items-center gap-2 py-2 px-2 -mx-2 rounded transition-colors group ${
                    selectedOption === line.id 
                      ? 'bg-terminal-green/10' 
                      : 'hover:bg-terminal-green/5'
                  }`}
                >
                  <span className="text-terminal-green mt-1 md:mt-0">&gt;</span>
                  <span className="text-terminal-amber font-bold">[{line.id}]</span>
                  <span className="text-muted-foreground hidden md:inline">{line.label}:</span>
                  <span className="text-gray-300 flex-1 truncate">
                    {line.value}
                  </span>
                  
                  {/* Action indicator */}
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                    {copiedId === line.id ? (
                      <Check className="w-4 h-4 text-terminal-green" />
                    ) : (
                      line.id === 4 ? <FileText className="w-4 h-4 text-muted-foreground" /> :
                      line.href ? <ExternalLink className="w-4 h-4 text-muted-foreground" /> :
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    )}
                  </span>
                </motion.button>
              ))}
            </div>
            
            {/* Input prompt */}
            <div className="mt-6 flex items-center">
              <span className="text-terminal-green">&gt;</span>
              <span className="text-muted-foreground ml-2">Input selection [1-4]:</span>
              <span className="ml-2 w-2 h-5 bg-terminal-green animate-cursor" />
            </div>
          </div>
        </motion.div>
        
        {/* Footer credit */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-8 text-center"
        >
          <p className="text-xs text-muted-foreground font-mono">
            <span className="text-terminal-green">©</span> {new Date().getFullYear()} Teerth Sharma.{' '}
            <span className="text-muted-foreground/50">Built with passion and precision.</span>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
