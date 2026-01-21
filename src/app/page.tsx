'use client';

import { useRef, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { HeroSection } from '@/components/sections/HeroSection';
import { AboutSection } from '@/components/sections/AboutSection';
import { ExperienceSection } from '@/components/sections/ExperienceSection';
import { ProjectsSection } from '@/components/sections/ProjectsSection';
import { TerminalFooter } from '@/components/sections/TerminalFooter';
import { PerformanceHUD } from '@/components/hud/PerformanceHUD';
import { Loader } from '@/components/ui/Loader';

// Dynamic import for shader canvas (client-side only)
const ShaderCanvas = dynamic(
  () => import('@/components/shaders/ShaderCanvas').then(mod => mod.ShaderCanvas),
  { ssr: false }
);

export default function Home() {
  const aboutRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isShaderReady, setIsShaderReady] = useState(false);
  const [showContent, setShowContent] = useState(false);
  
  // Track scroll progress
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0;
      setScrollProgress(progress);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  const handleScrollToAbout = () => {
    aboutRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleShaderReady = () => {
    // Artificial constraint to ensure the loader stays for a "cinematic" amount of time
    // and to let the warm-up frame render fully.
    setTimeout(() => {
      setIsShaderReady(true);
      setTimeout(() => setShowContent(true), 500);
    }, 2000);
  };

  return (
    <main className="relative min-h-screen">
      {/* Cinematic Loader */}
      <Loader isLoading={!showContent} />

      {/* Pixelated Shader Background */}
      <ShaderCanvas scrollProgress={scrollProgress} onReady={handleShaderReady} />
      
      {/* Content overlay - hidden until shader is ready */}
      <div 
        className={`relative z-10 transition-opacity duration-1000 ${showContent ? 'opacity-100' : 'opacity-0'}`}
      >
        {/* Hero Section */}
        <HeroSection onScrollClick={handleScrollToAbout} />
        
        {/* About Section */}
        <div ref={aboutRef}>
          <AboutSection />
        </div>

        {/* Experience Section */}
        <ExperienceSection />
        
        {/* Projects Section */}
        <ProjectsSection />
        
        {/* Terminal Footer */}
        <TerminalFooter />
      </div>
      
      {/* Performance HUD */}
      <div className={`transition-opacity duration-1000 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
        <PerformanceHUD />
      </div>
    </main>
  );
}
