import React from 'react';

interface WatermarkOverlayProps {
    show: boolean;
    text?: string;
}

/**
 * Professional Watermark Overlay for ShortlistAI
 * Uses a repeated SVG pattern for performance and crisp rendering.
 */
export function WatermarkOverlay({ show, text = "SHORTLIST AI • PREVIEW" }: WatermarkOverlayProps) {
    if (!show) return null;

    // SVG Pattern for the watermark
    // We encode the SVG to use it as a background image
    const svgPattern = `
      <svg width="300" height="300" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
        <text 
          x="50%" 
          y="50%" 
          fill="rgba(100, 116, 139, 0.15)" 
          font-family="system-ui, -apple-system, sans-serif" 
          font-weight="800" 
          font-size="24" 
          transform="rotate(-45, 150, 150)" 
          text-anchor="middle" 
          dominant-baseline="middle"
          letter-spacing="2"
        >
          ${text}
        </text>
      </svg>
    `.trim();

    const encodedSvg = encodeURIComponent(svgPattern);
    const bgImage = `url("data:image/svg+xml,${encodedSvg}")`;

    return (
        <div
            className="absolute inset-0 z-50 pointer-events-none select-none overflow-hidden rounded-xl"
            aria-hidden="true"
        >
            {/* 
                1. Backdrop Blur: Mildly obscures content to discourage screenshots 
                2. Mix Blend Mode: Ensures watermark is visible on both light/dark backgrounds
            */}
            <div
                className="w-full h-full backdrop-blur-[1px]"
                style={{
                    backgroundImage: bgImage,
                    backgroundRepeat: 'repeat',
                    backgroundPosition: 'center',
                    // Optional: 'multiply' for light mode, 'screen' for dark mode usually works best, 
                    // but 'normal' with rgba transparency is safest for generic use.
                }}
            />

            {/* Optional: Central Branding Logo (Industry Standard) */}
            <div className="absolute inset-0 flex items-center justify-center opacity-10">
                <div className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-2xl rotate-[-15deg] border-4 border-white">
                    SHORTLIST AI
                </div>
            </div>
        </div>
    );
}
