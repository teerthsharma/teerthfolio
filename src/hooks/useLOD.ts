'use client';

import { useState, useEffect } from 'react';

export type LODTier = 'A' | 'B' | 'C';

interface LODState {
    tier: LODTier;
    setTier: (tier: LODTier) => void;
    isAutoDetected: boolean;
}

// Detect device capabilities and return appropriate LOD tier
function detectTier(): LODTier {
    if (typeof window === 'undefined') return 'B';

    // Check for mobile devices
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
    );

    if (isMobile) return 'C';

    // Check for WebGL capabilities
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

        if (!gl) return 'C';

        // Get GPU renderer info
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
            const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();

            // High-end GPUs
            if (
                renderer.includes('rtx') ||
                renderer.includes('radeon rx 6') ||
                renderer.includes('radeon rx 7') ||
                renderer.includes('arc a') ||
                renderer.includes('m1') ||
                renderer.includes('m2') ||
                renderer.includes('m3')
            ) {
                return 'A';
            }

            // Low-end GPUs
            if (
                renderer.includes('intel hd') ||
                renderer.includes('intel uhd') ||
                renderer.includes('mali') ||
                renderer.includes('adreno')
            ) {
                return 'C';
            }
        }

        // Check device memory (if available)
        // @ts-expect-error - deviceMemory is not in all browsers
        const deviceMemory = navigator.deviceMemory;
        if (deviceMemory !== undefined) {
            if (deviceMemory >= 8) return 'A';
            if (deviceMemory < 4) return 'C';
        }

        // Check hardware concurrency
        const cores = navigator.hardwareConcurrency || 4;
        if (cores >= 8) return 'A';
        if (cores <= 2) return 'C';

        // Default to medium tier
        return 'B';

    } catch (e) {
        console.warn('LOD detection failed:', e);
        return 'B';
    }
}

export function useLOD(): LODState {
    const [tier, setTierState] = useState<LODTier>('B');
    const [isAutoDetected, setIsAutoDetected] = useState(true);

    useEffect(() => {
        const detectedTier = detectTier();
        setTierState(detectedTier);
        console.log(`[LOD] Auto-detected tier: ${detectedTier}`);
    }, []);

    const setTier = (newTier: LODTier) => {
        setTierState(newTier);
        setIsAutoDetected(false);
        console.log(`[LOD] Manually set tier: ${newTier}`);
    };

    return { tier, setTier, isAutoDetected };
}

// Performance tier descriptions
export const tierDescriptions: Record<LODTier, string> = {
    'A': 'Ultra (High-end Desktop)',
    'B': 'Medium (Laptop/Tablet)',
    'C': 'Mobile (Low Power)',
};

// Particle counts per tier
export const particleCounts: Record<LODTier, number> = {
    'A': 100000,
    'B': 20000,
    'C': 5000,
};
