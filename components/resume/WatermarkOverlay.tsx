import React from 'react';

interface WatermarkOverlayProps {
    show: boolean;
}

/**
 * Watermark overlay component that displays diagonal "PREVIEW" text
 * for free users. Only renders when show prop is true.
 */
export function WatermarkOverlay({ show }: WatermarkOverlayProps) {
    if (!show) return null;

    return (
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
            <div className="relative w-full h-full">
                {/* Repeating diagonal watermark pattern */}
                <div className="absolute inset-0 flex flex-wrap items-center justify-center">
                    {Array.from({ length: 20 }).map((_, index) => (
                        <div
                            key={index}
                            className="absolute select-none"
                            style={{
                                top: `${(index % 5) * 25}%`,
                                left: `${Math.floor(index / 5) * 30}%`,
                                transform: 'rotate(-45deg)',
                                fontSize: '3rem',
                                fontWeight: 'bold',
                                color: 'rgba(100, 100, 100, 0.15)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.2em',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            PREVIEW
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
