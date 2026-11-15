import { Signal } from '../events/index.ts';
import type { ParseOutcome } from '../fields/index.ts';

import type { AnyComponent, ComponentChange } from './AnyComponent.ts';
import type { ComponentSchema } from './schema/ComponentSchema.ts';
import type { ComponentValues } from './ComponentValues.ts';
import type { StoredValueDefinition } from './schema/StoredValueDefinition.ts';

type ComponentConstructor<Values extends ComponentValues> = new (values: Values) => Component<Values>;

// Holds one component's values: its fields and its stored values. It never knows which entity holds it:
// the entity listens to `changed`.
export abstract class Component<Values extends ComponentValues> implements AnyComponent {
    readonly schema: ComponentSchema<Values>;
    readonly changed = new Signal<ComponentChange>();
    private readonly values: Values;

    protected constructor(schema: ComponentSchema<Values>, values: Values) {
        this.schema = schema;
        this.values = { ...values };

        for (const entry of schema.entries) {
            const normalized = entry.type.normalize(values[entry.key]);
            this.values[entry.key] = entry.type.clone(normalized);
        }
    }

    get<Key extends keyof Values>(key: Key) {
        return this.values[key];
    }

    // Returns the value actually stored, after clamping, and signals only when it changed.
    set<Key extends keyof Values>(key: Key, value: Values[Key]) {
        const entry = this.requireEntry(key);
        const normalized = entry.type.normalize(value);
        const current = this.values[key];

        if (entry.type.equals(current, normalized)) return current;

        this.values[key] = entry.type.clone(normalized);
        this.changed.emit({ component: this, key: String(key) });

        return this.values[key];
    }

    // By key, for generic code: the Inspector, undo, the reader. Reaches fields and stored values alike.
    readValue(key: string): unknown {
        const entry = this.requireEntryByName(key);

        return this.values[entry.key];
    }

    writeValue(key: string, raw: unknown): ParseOutcome<unknown> {
        const entry = this.requireEntryByName(key);
        const parsed = entry.type.parse(raw);
        if (!parsed.ok) return parsed;

        const stored = this.set(entry.key, parsed.value);
        return { ok: true, value: stored };
    }

    // A derived field, such as a shape's Width, worked out from the stored values.
    readDerived(key: string): unknown {
        const derived = this.requireDerived(key);

        return derived.read(this.values);
    }

    // Parsed through the derived field's type, then written back as the stored values it changes.
    writeDerived(key: string, raw: unknown): ParseOutcome<unknown> {
        const derived = this.requireDerived(key);
        if (derived.write === undefined) {
            throw new Error(`${this.schema.typeName}'s ${key} is read-only.`);
        }

        const parsed = derived.type.parse(raw);
        if (!parsed.ok) return parsed;

        const normalized = derived.type.normalize(parsed.value);
        const written = derived.write(this.values, normalized);
        if (!written.ok) return written;

        for (const entry of this.schema.entries) {
            const hasNewValue = Object.hasOwn(written.value, entry.key);
            if (!hasNewValue) continue;

            const newValue = written.value[entry.key] as Values[typeof entry.key];
            this.set(entry.key, newValue);
        }

        const stored = derived.read(this.values);
        return { ok: true, value: stored };
    }

    copy(): Component<Values> {
        // Every component class takes its values as the constructor's only parameter.
        const ComponentType = this.constructor as ComponentConstructor<Values>;

        return new ComponentType(this.values);
    }

    // The fields only. A stored value, such as a polygon's points, is what the entity is, not a setting.
    resetToDefaults() {
        const defaults = this.schema.defaults();

        for (const field of this.schema.fields) {
            this.set(field.key, defaults[field.key]);
        }
    }

    private requireEntry<Key extends keyof Values>(key: Key) {
        const entry = this.schema.entries.find((candidate) => candidate.key === key);
        if (entry === undefined) {
            throw new Error(`${this.schema.typeName} has no value ${String(key)}.`);
        }

        // The schema's entries are typed per key, so the entry found for this key holds this key's type.
        return entry as StoredValueDefinition<Values, Key>;
    }

    private requireEntryByName(key: string) {
        const entry = this.schema.findEntry(key);
        if (entry === undefined) {
            throw new Error(`${this.schema.typeName} has no value ${key}.`);
        }

        return entry;
    }

    private requireDerived(key: string) {
        const derived = this.schema.findDerivedField(key);
        if (derived === undefined) {
            throw new Error(`${this.schema.typeName} has no derived field ${key}.`);
        }

        return derived;
    }
}
