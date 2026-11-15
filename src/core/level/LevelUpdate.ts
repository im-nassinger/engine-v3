import type { AnyComponent } from '../components/index.ts';

import type { Entity } from './Entity.ts';
import type { SwitchName } from './EntityChange.ts';

// Only a notice that something changed. The undoable edit is a LevelChange, in the editor.
export type LevelUpdate =
    | { readonly kind: 'entityAdded'; readonly entity: Entity }
    | { readonly kind: 'entityRemoved' | 'entityMoved'; readonly entity: Entity; readonly formerParent: Entity }
    | {
          readonly kind: 'componentAdded' | 'componentRemoved';
          readonly entity: Entity;
          readonly component: AnyComponent;
      }
    | { readonly kind: 'valueChanged'; readonly entity: Entity; readonly component: AnyComponent; readonly key: string }
    | { readonly kind: 'switchChanged'; readonly entity: Entity; readonly switchName: SwitchName }
    | { readonly kind: 'levelRenamed' };
