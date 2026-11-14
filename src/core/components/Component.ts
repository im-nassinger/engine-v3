import { Signal } from '../events/index.ts';
import type { FieldDefinition, ParseOutcome } from '../fields/index.ts';

import type { AnyComponent, ComponentChange } from './AnyComponent.ts';
import type { ComponentSchema } from './ComponentSchema.ts';
import type { ComponentValues } from './ComponentValues.ts';

type ComponentConstructor<Values extends ComponentValues> = new (values: Values) => Component<Values>;

// Holds one component's values. It never knows which entity holds it: the entity listens to `changed`.
export abstract class Component<Values extends ComponentValues> implements AnyComponent {
    readonly schema: ComponentSchema<Values>;
    readonly changed = new Signal<ComponentChange>();
    private readonly values: Values;

    protected constructor(schema: ComponentSchema<Values>, values: Values) {
        this.schema = schema;
        this.values = { ...values };

        for (const field of schema.fields) {
            const normalized = field.type.normalize(values[field.key]);
            this.values[field.key] = field.type.clone(normalized);
        }
    }

    get<Key extends keyof Values>(key: Key) {
        return this.values[key];
    }

    // Returns the value actually stored, after clamping, and signals only when it changed.
    set<Key extends keyof Values>(key: Key, value: Values[Key]) {
        const field = this.requireField(key);
        const normalized = field.type.normalize(value);
        const current = this.values[key];

        if (field.type.equals(current, normalized)) return current;

        this.values[key] = field.type.clone(normalized);
        this.changed.emit({ component: this, key: String(key) });

        return this.values[key];
    }

    // By key, for generic code: the Inspector, undo, the reader.
    readValue(key: string): unknown {
        const field = this.requireFieldByName(key);

        return this.values[field.key];
    }

    writeValue(key: string, raw: unknown): ParseOutcome<unknown> {
        const field = this.requireFieldByName(key);
        const parsed = field.type.parse(raw);
        if (!parsed.ok) return parsed;

        const stored = this.set(field.key, parsed.value);
        return { ok: true, value: stored };
    }

    copy(): Component<Values> {
        // Every component class takes its values as the constructor's only parameter.
        const ComponentType = this.constructor as ComponentConstructor<Values>;

        return new ComponentType(this.values);
    }

    resetToDefaults() {
        const defaults = this.schema.defaults();

        for (const field of this.schema.fields) {
            this.set(field.key, defaults[field.key]);
        }
    }

    private requireField<Key extends keyof Values>(key: Key) {
        const field = this.schema.fields.find((candidate) => candidate.key === key);
        if (field === undefined) {
            throw new Error(`${this.schema.typeName} has no field ${String(key)}.`);
        }

        // The schema's fields are typed per key, so the field found for this key holds this key's type.
        return field as FieldDefinition<Values, Key>;
    }

    private requireFieldByName(key: string) {
        const field = this.schema.findField(key);
        if (field === undefined) {
            throw new Error(`${this.schema.typeName} has no field ${key}.`);
        }

        return field;
    }
}
