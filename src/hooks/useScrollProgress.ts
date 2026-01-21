'use client';

import { useState, useEffect } from 'react';

interface ScrollProgress {
    progress: number;       // Overall scroll progress (0-1)
    section: number;        // Current section index (0-based)
    sectionProgress: number; // Progress within current section (0-1)
}

export function useScrollProgress(sectionCount: number = 4): ScrollProgress {
    const [scrollProgress, setScrollProgress] = useState<ScrollProgress>({
        progress: 0,
        section: 0,
        sectionProgress: 0,
    });

    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;

            if (docHeight <= 0) {
                setScrollProgress({ progress: 0, section: 0, sectionProgress: 0 });
                return;
            }

            const progress = Math.min(scrollTop / docHeight, 1);
            const sectionHeight = 1 / sectionCount;
            const section = Math.floor(progress / sectionHeight);
            const sectionProgress = (progress % sectionHeight) / sectionHeight;

            setScrollProgress({
                progress,
                section: Math.min(section, sectionCount - 1),
                sectionProgress,
            });
        };

        // Initial calculation
        handleScroll();

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [sectionCount]);

    return scrollProgress;
}
