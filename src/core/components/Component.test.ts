import { describe, expect, test } from 'vitest';

import { NumberFieldType, TextFieldType, VectorFieldType } from '../fields/index.ts';
import type { Point } from '../geometry/index.ts';

import { Component } from './Component.ts';
import type { ComponentChange } from './AnyComponent.ts';
import { ComponentSchema } from './ComponentSchema.ts';
import { derivedField } from './DerivedFieldDefinition.ts';

type CrateValues = {
    size: Point;
    weight: number;
};

const crateSchema = new ComponentSchema<CrateValues>({
    typeName: 'CrateComponent',
    cardOrder: 1,
    hasCard: true,
    addMenuSection: 'Test',
    addableByHand: true,
    fields: [
        {
            key: 'size',
            label: 'Size',
            type: new VectorFieldType({ refuseZero: true }),
            defaultValue: { x: 1, y: 1 },
            description: 'How big the crate is.',
            changeableInPlay: false,
        },
        {
            key: 'weight',
            label: 'Weight',
            type: new NumberFieldType({ min: 0, max: 100 }),
            defaultValue: 10,
            description: 'How heavy the crate is.',
            changeableInPlay: true,
        },
    ],
});

class CrateComponent extends Component<CrateValues> {
    static readonly schema = crateSchema;

    constructor(values: CrateValues = crateSchema.defaults()) {
        super(crateSchema, values);
    }
}

function recordChanges(component: Component<CrateValues>) {
    const changes: ComponentChange[] = [];
    component.changed.subscribe((change) => changes.push(change));

    return changes;
}

describe('ComponentSchema', () => {
    test('defaults are fresh copies of each field default', () => {
        const first = crateSchema.defaults();
        const second = crateSchema.defaults();

        expect(first).toEqual({ size: { x: 1, y: 1 }, weight: 10 });
        expect(first.size).not.toBe(second.size);
    });

    test('finds a field by key and by attribute', () => {
        expect(crateSchema.findField('weight')?.label).toBe('Weight');
        expect(crateSchema.findFieldByAttribute('weight')?.key).toBe('weight');
        expect(crateSchema.findField('colour')).toBeUndefined();
    });
});

describe('Component', () => {
    test('a new component holds the defaults', () => {
        const crate = new CrateComponent();

        expect(crate.get('weight')).toBe(10);
        expect(crate.get('size')).toEqual({ x: 1, y: 1 });
    });

    test('the constructor normalizes and never keeps the caller object', () => {
        const size = { x: 2, y: 3 };
        const crate = new CrateComponent({ size, weight: 500 });

        expect(crate.get('weight')).toBe(100);
        expect(crate.get('size')).not.toBe(size);
    });

    test('set returns the value stored after clamping, and signals the change', () => {
        const crate = new CrateComponent();
        const changes = recordChanges(crate);

        const stored = crate.set('weight', 150);

        expect(stored).toBe(100);
        expect(crate.get('weight')).toBe(100);
        expect(changes).toEqual([{ component: crate, key: 'weight' }]);
    });

    test('set signals nothing when the stored value stays the same', () => {
        const crate = new CrateComponent();
        crate.set('weight', 100);
        const changes = recordChanges(crate);

        crate.set('weight', 100);
        crate.set('weight', 250);
        crate.set('size', { x: 1, y: 1 });

        expect(changes).toEqual([]);
    });

    test('writeValue parses untrusted data through the field type', () => {
        const crate = new CrateComponent();
        const changes = recordChanges(crate);

        const accepted = crate.writeValue('weight', 120);
        const refused = crate.writeValue('size', { x: 0, y: 2 });
        const wrongType = crate.writeValue('weight', '12');

        expect(accepted).toEqual({ ok: true, value: 100 });
        expect(refused).toEqual({ ok: false, problem: { reason: 'zero' } });
        expect(wrongType).toEqual({ ok: false, problem: { reason: 'wrongType' } });
        expect(crate.get('size')).toEqual({ x: 1, y: 1 });
        expect(changes).toHaveLength(1);
    });

    test('readValue reads by key', () => {
        const crate = new CrateComponent();

        expect(crate.readValue('weight')).toBe(10);
    });

    test('an unknown key is a bug', () => {
        const crate = new CrateComponent();

        expect(() => crate.readValue('colour')).toThrow();
        expect(() => crate.writeValue('colour', 1)).toThrow();
    });

    test('copy is the same class with the same values, sharing nothing', () => {
        const crate = new CrateComponent();
        crate.set('size', { x: 4, y: 5 });

        const copy = crate.copy();

        expect(copy).toBeInstanceOf(CrateComponent);
        expect(copy.get('size')).toEqual({ x: 4, y: 5 });
        expect(copy.get('size')).not.toBe(crate.get('size'));
        expect(copy.changed).not.toBe(crate.changed);
    });

    test('resetToDefaults signals each value that changes', () => {
        const crate = new CrateComponent();
        crate.set('weight', 50);
        const changes = recordChanges(crate);

        crate.resetToDefaults();

        expect(crate.get('weight')).toBe(10);
        expect(changes).toEqual([{ component: crate, key: 'weight' }]);
    });
});

type LabelValues = {
    text: string;
    // Stored, never shown: what the Width field reads and writes.
    widthInLetters: number;
};

const labelSchema = new ComponentSchema<LabelValues>({
    typeName: 'LabelComponent',
    cardOrder: 2,
    hasCard: true,
    addableByHand: true,
    fields: [
        {
            key: 'text',
            label: 'Text',
            type: new TextFieldType(),
            defaultValue: 'Hello',
            description: 'What the label says.',
            changeableInPlay: true,
        },
    ],
    storedValues: [
        { key: 'widthInLetters', type: new NumberFieldType({ min: 1, wholeNumber: true }), defaultValue: 5 },
    ],
    derivedFields: [
        derivedField<LabelValues, number>({
            key: 'width',
            label: 'Width',
            type: new NumberFieldType({ min: 0 }),
            description: 'How wide the label is, in pixels.',
            read: (values) => values.widthInLetters * 10,
            write: (_values, width) => {
                if (width === 0) return { ok: false, problem: { reason: 'flatShape' } };

                return { ok: true, value: { widthInLetters: width / 10 } };
            },
        }),
        derivedField<LabelValues, number>({
            key: 'length',
            label: 'Length',
            type: new NumberFieldType(),
            description: 'How many characters the text has.',
            read: (values) => values.text.length,
        }),
    ],
});

class LabelComponent extends Component<LabelValues> {
    static readonly schema = labelSchema;

    constructor(values: LabelValues = labelSchema.defaults()) {
        super(labelSchema, values);
    }
}

describe('stored values', () => {
    test('a stored value has a default, is normalized and is reached by key like a field', () => {
        const label = new LabelComponent({ text: 'Hi', widthInLetters: 3.4 });

        expect(labelSchema.defaults()).toEqual({ text: 'Hello', widthInLetters: 5 });
        expect(label.readValue('widthInLetters')).toBe(3);
        expect(label.writeValue('widthInLetters', 8)).toEqual({ ok: true, value: 8 });
        expect(label.writeValue('widthInLetters', 'wide')).toEqual({ ok: false, problem: { reason: 'wrongType' } });
    });

    test('a stored value is saved under its key in snake_case, a field under its attribute', () => {
        const textEntry = labelSchema.findEntry('text');
        const widthEntry = labelSchema.findEntry('widthInLetters');
        if (textEntry === undefined || widthEntry === undefined) throw new Error('Both entries should exist.');

        expect(labelSchema.fileKeyOf(textEntry)).toBe('text');
        expect(labelSchema.fileKeyOf(widthEntry)).toBe('width_in_letters');
        expect(labelSchema.findEntryByFileKey('width_in_letters')).toBe(widthEntry);
        expect(labelSchema.findFieldByAttribute('width_in_letters')).toBeUndefined();
    });

    test('reset to defaults resets the fields and leaves the stored values', () => {
        const label = new LabelComponent({ text: 'Hi', widthInLetters: 9 });

        label.resetToDefaults();

        expect(label.get('text')).toBe('Hello');
        expect(label.get('widthInLetters')).toBe(9);
    });
});

describe('derived fields', () => {
    test('read works the value out of the stored values', () => {
        const label = new LabelComponent();

        expect(label.readDerived('width')).toBe(50);
        expect(label.readDerived('length')).toBe(5);
    });

    test('write changes the stored values and signals each one', () => {
        const label = new LabelComponent();
        const changes: ComponentChange[] = [];
        label.changed.subscribe((change) => changes.push(change));

        const outcome = label.writeDerived('width', 120);

        expect(outcome).toEqual({ ok: true, value: 120 });
        expect(label.get('widthInLetters')).toBe(12);
        expect(changes).toEqual([{ component: label, key: 'widthInLetters' }]);
    });

    test('write passes on a refusal and changes nothing', () => {
        const label = new LabelComponent();

        expect(label.writeDerived('width', 0)).toEqual({ ok: false, problem: { reason: 'flatShape' } });
        expect(label.writeDerived('width', 'wide')).toEqual({ ok: false, problem: { reason: 'wrongType' } });
        expect(label.get('widthInLetters')).toBe(5);
    });

    test('a derived field without write is read-only', () => {
        const label = new LabelComponent();

        expect(() => label.writeDerived('length', 3)).toThrow();
        expect(() => label.readDerived('height')).toThrow();
    });
});
