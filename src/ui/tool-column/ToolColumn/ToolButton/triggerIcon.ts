import { createLucideIcon } from 'lucide-react';

// The v3 mockup's Trigger tool icon, a dashed rectangle with a bolt, drawn on Lucide's 24 px grid so it sits
// beside its icons. Lucide has no dashed square with a bolt.
export const TriggerIcon = createLucideIcon('trigger', [
    ['rect', { x: '3', y: '5', width: '18', height: '14', rx: '1.5', strokeDasharray: '3 2.5', key: 'edge' }],
    ['path', { d: 'M13 8l-3 4.5h4L11 17', key: 'bolt' }],
]);
