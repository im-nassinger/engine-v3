import { describe, expect, test } from 'vitest';

import type { AnyComponentSchema } from './AnyComponent.ts';
import { camelCaseOfLabel, snakeCaseOfLabel } from './attributeNames.ts';
import { BodyComponent } from './BodyComponent/BodyComponent.ts';
import { JointComponent } from './JointComponent/JointComponent.ts';
import { SurfaceComponent } from './SurfaceComponent/SurfaceComponent.ts';
import { NameComponent } from './NameComponent/NameComponent.ts';
import { PathComponent } from './PathComponent/PathComponent.ts';
import { ShapeComponent } from './ShapeComponent/ShapeComponent.ts';
import { StyleComponent } from './StyleComponent/StyleComponent.ts';
import { TransformComponent } from './TransformComponent/TransformComponent.ts';

// Every component class goes in this list. The registry replaces it later in stage 2.
const SCHEMAS: readonly AnyComponentSchema[] = [
    TransformComponent.schema,
    NameComponent.schema,
    ShapeComponent.schema,
    PathComponent.schema,
    StyleComponent.schema,
    BodyComponent.schema,
    SurfaceComponent.schema,
    JointComponent.schema,
];

describe.each(SCHEMAS)('the $typeName schema', (schema) => {
    test('each key is the camelCase of its label', () => {
        for (const field of schema.fields) {
            expect(field.key).toBe(camelCaseOfLabel(field.label));
        }
    });

    test('no two attributes clash', () => {
        const attributes = schema.fields.map((field) => snakeCaseOfLabel(field.label));
        const uniqueAttributes = new Set(attributes);

        expect(uniqueAttributes.size).toBe(attributes.length);
    });

    test('no two values share a key in level.json', () => {
        const fileKeys = schema.entries.map((entry) => schema.fileKeyOf(entry));
        const uniqueFileKeys = new Set(fileKeys);

        expect(uniqueFileKeys.size).toBe(fileKeys.length);
    });

    test('each default, stored values included, parses and sits in its range', () => {
        for (const entry of schema.entries) {
            const saved = entry.type.serialize(entry.defaultValue);
            const parsed = entry.type.parse(saved);
            const normalized = entry.type.normalize(entry.defaultValue);

            expect(parsed.ok).toBe(true);
            expect(entry.type.equals(normalized, entry.defaultValue)).toBe(true);
        }
    });

    test('each field and derived field has a description', () => {
        for (const field of [...schema.fields, ...schema.derivedFields]) {
            expect(field.description.length).toBeGreaterThan(0);
        }
    });

    test("each derived field's key is the camelCase of its label, and is no stored key", () => {
        for (const derived of schema.derivedFields) {
            expect(derived.key).toBe(camelCaseOfLabel(derived.label));
            expect(schema.findEntry(derived.key)).toBeUndefined();
        }
    });
});
