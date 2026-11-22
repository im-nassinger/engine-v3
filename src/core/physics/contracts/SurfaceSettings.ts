import type { SurfaceDefinition } from './SurfaceDefinition.ts';

// The SurfaceComponent's values a running world can change on a surface it already has.
export type SurfaceSettings = Pick<SurfaceDefinition, 'friction' | 'restitution' | 'sensor'>;
