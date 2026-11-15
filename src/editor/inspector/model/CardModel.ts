import type {
    AnyFieldDefinition,
    ComponentTypeName,
    ComponentValues,
    DerivedFieldDefinition,
} from '../../../core/components/index.ts';
import type { Unit } from '../../../core/fields/index.ts';

import type { Availability } from './Availability.ts';
import type { CardNote } from './CardNote.ts';

// A value the Inspector adds to a card that isn't the component's own. v1 has one: the BodyComponent's Mass.
export type ReadOnlyRow = {
    readonly key: string;
    readonly label: string;
    readonly description: string;
    readonly unit: Unit;
};

// value is MIXED when the selected entities hold different values.
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
          readonly kind: 'readOnlyRow';
          readonly definition: ReadOnlyRow;
          readonly value: unknown;
          readonly isEnabled: true;
          readonly isReadOnly: true;
      };

export type CardModel = {
    readonly typeName: ComponentTypeName;
    readonly isFolded: boolean;
    readonly fields: readonly FieldModel[];
    readonly canRemove: Availability;
    readonly canReset: Availability;
    // The editor messages about this component, such as a missing partner's note with its fix.
    readonly notes: readonly CardNote[];
};
