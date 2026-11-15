import type { FieldDefinition } from '../../fields/index.ts';

import { snakeCaseOfKey, snakeCaseOfLabel } from './attributeNames.ts';
import type { ComponentTypeName } from '../ComponentTypeName.ts';
import type { ComponentValues } from '../ComponentValues.ts';
import type { DerivedFieldDefinition } from './DerivedFieldDefinition.ts';
import type { PartnerRule } from './PartnerRule.ts';
import type { StoredValueDefinition } from './StoredValueDefinition.ts';

// One definition per key, each typed with its own key's value, so a field can't hold another key's type.
export type FieldOf<Values> = {
    [Key in keyof Values & string]: FieldDefinition<Values, Key>;
}[keyof Values & string];

export type StoredValueOf<Values> = {
    [Key in keyof Values & string]: StoredValueDefinition<Values, Key>;
}[keyof Values & string];

// A field or a stored value: everything the component keeps, with its key, type and default.
export type ValueEntryOf<Values> = FieldOf<Values> | StoredValueOf<Values>;

export type ComponentSchemaOptions<Values extends ComponentValues> = {
    readonly typeName: ComponentTypeName;
    readonly cardOrder: number;
    readonly hasCard: boolean;
    // Undefined for a component every entity has, which the Add Component menu never lists.
    readonly addMenuSection?: string;
    readonly addableByHand: boolean;
    readonly fields: readonly FieldOf<Values>[];
    readonly storedValues?: readonly StoredValueOf<Values>[];
    readonly derivedFields?: readonly DerivedFieldDefinition<Values, unknown>[];
    readonly partners?: readonly PartnerRule[];
};

function isField<Values>(entry: ValueEntryOf<Values>): entry is FieldOf<Values> {
    return 'label' in entry;
}

export class ComponentSchema<Values extends ComponentValues> {
    readonly typeName: ComponentTypeName;
    readonly cardOrder: number;
    readonly hasCard: boolean;
    readonly addMenuSection: string | undefined;
    readonly addableByHand: boolean;
    readonly fields: readonly FieldOf<Values>[];
    readonly storedValues: readonly StoredValueOf<Values>[];
    readonly derivedFields: readonly DerivedFieldDefinition<Values, unknown>[];
    readonly partners: readonly PartnerRule[];
    // The fields first, then the stored values: the order level.json writes them in.
    readonly entries: readonly ValueEntryOf<Values>[];

    constructor(options: ComponentSchemaOptions<Values>) {
        this.typeName = options.typeName;
        this.cardOrder = options.cardOrder;
        this.hasCard = options.hasCard;
        this.addMenuSection = options.addMenuSection;
        this.addableByHand = options.addableByHand;
        this.fields = options.fields;
        this.storedValues = options.storedValues ?? [];
        this.derivedFields = options.derivedFields ?? [];
        this.partners = options.partners ?? [];
        this.entries = [...this.fields, ...this.storedValues];
    }

    defaults() {
        const values: Partial<Values> = {};

        for (const entry of this.entries) {
            values[entry.key] = entry.type.clone(entry.defaultValue);
        }

        // Every key of Values has an entry: the schema test checks it for each component.
        return values as Values;
    }

    findField(key: string) {
        return this.fields.find((field) => field.key === key);
    }

    findFieldByAttribute(attribute: string) {
        return this.fields.find((field) => snakeCaseOfLabel(field.label) === attribute);
    }

    findEntry(key: string) {
        return this.entries.find((entry) => entry.key === key);
    }

    findDerivedField(key: string) {
        return this.derivedFields.find((derived) => derived.key === key);
    }

    // A field is saved under its attribute name, a stored value under its key's snake_case.
    fileKeyOf(entry: ValueEntryOf<Values>) {
        if (isField(entry)) return snakeCaseOfLabel(entry.label);

        return snakeCaseOfKey(entry.key);
    }

    findEntryByFileKey(fileKey: string) {
        return this.entries.find((entry) => this.fileKeyOf(entry) === fileKey);
    }
}
