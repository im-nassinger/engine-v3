import { createLucideIcon } from 'lucide-react';

// The v2 mockup's three line icons, from jagged to smooth, drawn on Lucide's 24 px grid so they sit
// beside its icons.
export const SmoothLow = createLucideIcon('smooth-low', [
    ['path', { d: 'M3 14l3-5 2 6 3-8 2 7 3-6 2 5 3-4', key: 'low' }],
]);
export const SmoothMedium = createLucideIcon('smooth-medium', [
    ['path', { d: 'M3 14l4-4 3 4 4-5 3 4 4-3', key: 'medium' }],
]);
export const SmoothHigh = createLucideIcon('smooth-high', [['path', { d: 'M3 14c4-6 7-6 9 0s5 6 9 0', key: 'high' }]]);
