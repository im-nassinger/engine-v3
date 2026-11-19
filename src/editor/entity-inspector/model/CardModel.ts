import type {
    AnyFieldDefinition,
    ComponentTypeName,
    ComponentValues,
    DerivedFieldDefinition,
} from '../../../core/components/index.ts';
import type { NumberFieldType, Unit } from '../../../core/fields/index.ts';

import type { Availability } from './Availability.ts';
import type { CardNote } from './CardNote.ts';

// The BodyComponent's Mass, a value the Entity inspector adds to the card that isn't the component's own.
// Typing one sets the densities of the body's surfaces (owner, 2026-11-19).
export type MassRow = {
    readonly key: 'mass';
    readonly label: string;
    readonly description: string;
    readonly unit: Unit;
    readonly type: NumberFieldType;
};

// value is MIXED when the selected entities hold different values; a vector's is a MixedVector instead.
export type FieldModel =
    | {
          readonly kind: 'field';
          readonly definition: AnyFieldDefinition;
          readonly value: unknown;
          // False when appliesWhen says it doesn't apply: greyed, with its value kept.
          readonly isEnabled: boolean;
          readonly isReadOnly: false;
      }
    | {
          readonly kind: 'derived';
          readonly definition: DerivedFieldDefinition<ComponentValues, unknown>;
          readonly value: unknown;
          readonly isEnabled: true;
          // A derived field without a write, or the World's Kind.
          readonly isReadOnly: boolean;
      }
    | {
          readonly kind: 'mass';
          readonly definition: MassRow;
          readonly value: unknown;
          readonly isEnabled: true;
          // When a shown body has no area, so no density gives it a mass.
          readonly isReadOnly: boolean;
      };

export type CardModel = {
    readonly typeName: ComponentTypeName;
    // What the card is called on screen: `Body` for the BodyComponent.
    readonly title: string;
    readonly isFolded: boolean;
    readonly fields: readonly FieldModel[];
    readonly canRemove: Availability;
    readonly canReset: Availability;
    // The editor messages about this component, such as a missing partner's note with its fix.
    readonly notes: readonly CardNote[];
};
