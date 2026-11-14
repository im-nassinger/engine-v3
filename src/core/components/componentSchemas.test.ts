import { describe, expect, test } from 'vitest';

import type { AnyComponentSchema } from './AnyComponent.ts';
import { camelCaseOfLabel, snakeCaseOfLabel } from './attributeNames.ts';
import { NameComponent } from './NameComponent/NameComponent.ts';
import { TransformComponent } from './TransformComponent/TransformComponent.ts';

// Every component class goes in this list. The registry replaces it in stage 2.
const SCHEMAS: readonly AnyComponentSchema[] = [TransformComponent.schema, NameComponent.schema];

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

    test('each default parses and sits in its range', () => {
        for (const field of schema.fields) {
            const saved = field.type.serialize(field.defaultValue);
            const parsed = field.type.parse(saved);
            const normalized = field.type.normalize(field.defaultValue);

            expect(parsed.ok).toBe(true);
            expect(field.type.equals(normalized, field.defaultValue)).toBe(true);
        }
    });

    test('each field has a description', () => {
        for (const field of schema.fields) {
            expect(field.description.length).toBeGreaterThan(0);
        }
    });
});
