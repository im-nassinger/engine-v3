import type { Signal } from '../events/index.ts';
import type { FieldDefinition, ParseOutcome, ValueType } from '../fields/index.ts';

import type { ComponentTypeName } from './ComponentTypeName.ts';
import type { ComponentValues } from './ComponentValues.ts';
import type { DerivedFieldDefinition } from './schema/DerivedFieldDefinition.ts';
import type { PartnerRule } from './schema/PartnerRule.ts';

export type AnyFieldDefinition = FieldDefinition<ComponentValues, string>;

// A field or a stored value of any component.
export type AnyValueEntry = {
    readonly key: string;
    readonly type: ValueType<unknown>;
    readonly defaultValue: unknown;
};

export type AnyComponentSchema = {
    readonly typeName: ComponentTypeName;
    readonly cardOrder: number;
    readonly hasCard: boolean;
    readonly addMenuSection: string | undefined;
    readonly addableByHand: boolean;
    readonly fields: readonly AnyFieldDefinition[];
    readonly storedValues: readonly AnyValueEntry[];
    readonly derivedFields: readonly DerivedFieldDefinition<ComponentValues, unknown>[];
    readonly partners: readonly PartnerRule[];
    readonly entries: readonly AnyValueEntry[];
    findField(key: string): AnyFieldDefinition | undefined;
    findFieldByAttribute(attribute: string): AnyFieldDefinition | undefined;
    findEntry(key: string): AnyValueEntry | undefined;
    findDerivedField(key: string): DerivedFieldDefinition<ComponentValues, unknown> | undefined;
    fileKeyOf(entry: AnyValueEntry): string;
    findEntryByFileKey(fileKey: string): AnyValueEntry | undefined;
};

export type ComponentChange = {
    readonly component: AnyComponent;
    readonly key: string;
};

// Any component, whatever its values, for code that works by key: the entity, the Entity inspector, undo, the reader.
// Component<Values> can't play this part itself, because a schema typed by its keys never widens to all keys.
export type AnyComponent = {
    readonly schema: AnyComponentSchema;
    readonly changed: Signal<ComponentChange>;
    readValue(key: string): unknown;
    writeValue(key: string, raw: unknown): ParseOutcome<unknown>;
    readDerived(key: string): unknown;
    writeDerived(key: string, raw: unknown): ParseOutcome<unknown>;
    copy(): AnyComponent;
    resetToDefaults(): void;
};
