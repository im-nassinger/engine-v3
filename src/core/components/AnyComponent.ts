import type { Signal } from '../events/index.ts';
import type { FieldDefinition, ParseOutcome } from '../fields/index.ts';

import type { ComponentTypeName } from './ComponentTypeName.ts';
import type { ComponentValues } from './ComponentValues.ts';
import type { DerivedFieldDefinition } from './DerivedFieldDefinition.ts';
import type { PartnerRule } from './PartnerRule.ts';

export type AnyFieldDefinition = FieldDefinition<ComponentValues, string>;

export type AnyComponentSchema = {
    readonly typeName: ComponentTypeName;
    readonly cardOrder: number;
    readonly hasCard: boolean;
    readonly addMenuSection: string | undefined;
    readonly addableByHand: boolean;
    readonly fields: readonly AnyFieldDefinition[];
    readonly derivedFields: readonly DerivedFieldDefinition<ComponentValues, unknown>[];
    readonly partners: readonly PartnerRule[];
    findField(key: string): AnyFieldDefinition | undefined;
    findFieldByAttribute(attribute: string): AnyFieldDefinition | undefined;
};

export type ComponentChange = {
    readonly component: AnyComponent;
    readonly key: string;
};

// Any component, whatever its values, for code that works by key: the entity, the Inspector, undo, the reader.
// Component<Values> can't play this part itself, because a schema typed by its keys never widens to all keys.
export type AnyComponent = {
    readonly schema: AnyComponentSchema;
    readonly changed: Signal<ComponentChange>;
    readValue(key: string): unknown;
    writeValue(key: string, raw: unknown): ParseOutcome<unknown>;
    copy(): AnyComponent;
    resetToDefaults(): void;
};
