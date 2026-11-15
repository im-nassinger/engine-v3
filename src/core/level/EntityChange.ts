import type { AnyComponent } from '../components/index.ts';

export type SwitchName = 'hidden' | 'locked';

// What an entity announces about itself. Level adds the entity and forwards it as a LevelUpdate.
export type EntityChange =
    | { readonly kind: 'componentAdded' | 'componentRemoved'; readonly component: AnyComponent }
    | { readonly kind: 'valueChanged'; readonly component: AnyComponent; readonly key: string }
    | { readonly kind: 'switchChanged'; readonly switchName: SwitchName };
