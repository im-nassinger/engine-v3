import type { FieldDefinition } from '../fields/index.ts';

import { snakeCaseOfLabel } from './attributeNames.ts';
import type { ComponentTypeName } from './ComponentTypeName.ts';
import type { ComponentValues } from './ComponentValues.ts';
import type { DerivedFieldDefinition } from './DerivedFieldDefinition.ts';
import type { PartnerRule } from './PartnerRule.ts';

// One definition per key, each typed with its own key's value, so a field can't hold another key's type.
export type FieldOf<Values> = {
    [Key in keyof Values & string]: FieldDefinition<Values, Key>;
}[keyof Values & string];

export type ComponentSchemaOptions<Values extends ComponentValues> = {
    readonly typeName: ComponentTypeName;
    readonly cardOrder: number;
    readonly hasCard: boolean;
    // Undefined for a component every entity has, which the Add Component menu never lists.
    readonly addMenuSection?: string;
    readonly addableByHand: boolean;
    readonly fields: readonly FieldOf<Values>[];
    readonly derivedFields?: readonly DerivedFieldDefinition<Values, unknown>[];
    readonly partners?: readonly PartnerRule[];
};

export class ComponentSchema<Values extends ComponentValues> {
    readonly typeName: ComponentTypeName;
    readonly cardOrder: number;
    readonly hasCard: boolean;
    readonly addMenuSection: string | undefined;
    readonly addableByHand: boolean;
    readonly fields: readonly FieldOf<Values>[];
    readonly derivedFields: readonly DerivedFieldDefinition<Values, unknown>[];
    readonly partners: readonly PartnerRule[];

    constructor(options: ComponentSchemaOptions<Values>) {
        this.typeName = options.typeName;
        this.cardOrder = options.cardOrder;
        this.hasCard = options.hasCard;
        this.addMenuSection = options.addMenuSection;
        this.addableByHand = options.addableByHand;
        this.fields = options.fields;
        this.derivedFields = options.derivedFields ?? [];
        this.partners = options.partners ?? [];
    }

    defaults() {
        const values: Partial<Values> = {};

        for (const field of this.fields) {
            values[field.key] = field.type.clone(field.defaultValue);
        }

        // Every key of Values has a field: the schema test checks it for each component.
        return values as Values;
    }

    findField(key: string) {
        return this.fields.find((field) => field.key === key);
    }

    findFieldByAttribute(attribute: string) {
        return this.fields.find((field) => snakeCaseOfLabel(field.label) === attribute);
    }
}
