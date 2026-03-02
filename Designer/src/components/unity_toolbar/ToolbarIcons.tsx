import * as React from 'react';

/**
 * SVG icons replicating Unity Editor toolbar tool icons.
 * Each icon is 20x20 viewBox, stroke-based, matching Unity's monochrome style.
 */

interface IconProps {
    size?: number;
    color?: string;
}

/** Hand/Pan tool — open palm icon (Q) */
export function HandIcon({ size = 20, color = 'currentColor' }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Palm with fingers */}
            <path
                d="M10 18c-3.5 0-6-2.5-6-6V7a1 1 0 0 1 2 0v3M6 7V4a1 1 0 0 1 2 0v5M8 4V3a1 1 0 0 1 2 0v6M10 3V4a1 1 0 0 1 2 0v5M12 4v3a1 1 0 0 1 2 0v2c0 0 0 0 0 0M14 9v3c0 3.5-2.5 6-6 6"
                stroke={color}
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

/** Move tool — 4-directional cross arrows (W) */
export function MoveIcon({ size = 20, color = 'currentColor' }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Cross */}
            <line x1="10" y1="3" x2="10" y2="17" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
            <line x1="3" y1="10" x2="17" y2="10" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
            {/* Arrow heads */}
            <polyline points="7,6 10,3 13,6" fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="7,14 10,17 13,14" fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="6,7 3,10 6,13" fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="14,7 17,10 14,13" fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

/** Rotate tool — circular arrow (E) */
export function RotateIcon({ size = 20, color = 'currentColor' }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M14.5 5.5A6 6 0 1 0 16 10"
                stroke={color}
                strokeWidth="1.3"
                strokeLinecap="round"
            />
            <polyline
                points="14.5,2.5 14.5,5.5 11.5,5.5"
                fill="none"
                stroke={color}
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

/** Scale tool — box with diagonal resize arrows (R) */
export function ScaleIcon({ size = 20, color = 'currentColor' }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Center box */}
            <rect x="7" y="7" width="6" height="6" stroke={color} strokeWidth="1.3" rx="0.5" />
            {/* Diagonal arrows */}
            <line x1="4" y1="4" x2="7" y2="7" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
            <polyline points="4,6.5 4,4 6.5,4" fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="16" y1="16" x2="13" y2="13" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
            <polyline points="16,13.5 16,16 13.5,16" fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

/** Rect tool — rectangle with corner handles (T) */
export function RectIcon({ size = 20, color = 'currentColor' }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="5" width="12" height="10" stroke={color} strokeWidth="1.3" rx="0.5" />
            {/* Corner handles */}
            <rect x="3" y="4" width="2.5" height="2.5" fill={color} rx="0.3" />
            <rect x="14.5" y="4" width="2.5" height="2.5" fill={color} rx="0.3" />
            <rect x="3" y="13.5" width="2.5" height="2.5" fill={color} rx="0.3" />
            <rect x="14.5" y="13.5" width="2.5" height="2.5" fill={color} rx="0.3" />
        </svg>
    );
}

/** Transform tool — combined move+rotate+scale icon (Y) */
export function TransformIcon({ size = 20, color = 'currentColor' }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Center dot */}
            <circle cx="10" cy="10" r="1.5" fill={color} />
            {/* Axes */}
            <line x1="10" y1="8.5" x2="10" y2="3" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
            <line x1="11.5" y1="10" x2="17" y2="10" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
            {/* Arrow heads */}
            <polyline points="8,5 10,3 12,5" fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="15,8 17,10 15,12" fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            {/* Rotation arc */}
            <path d="M7.5 12.5 A4 4 0 0 1 7 10" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
            <path d="M12.5 12.5 A4 4 0 0 0 14 11.5" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
        </svg>
    );
}
