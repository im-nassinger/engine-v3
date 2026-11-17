import { describe, expect, test } from 'vitest';

import { camelCaseOfLabel, snakeCaseOfLabel } from './schema/attributeNames.ts';
import { createV1Registry } from './registry/createV1Registry.ts';

const registry = createV1Registry();
const SCHEMAS = registry.all().map((componentClass) => componentClass.schema);
// Fields with no description, because the owner found the label enough (2026-11-17).
const LABEL_ONLY_FIELDS = new Set(['JointComponent.letConnectedObjectsCollide']);

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

    test('each field and derived field has a description, but the ones whose label says enough', () => {
        for (const field of [...schema.fields, ...schema.derivedFields]) {
            if (LABEL_ONLY_FIELDS.has(`${schema.typeName}.${field.key}`)) continue;

            expect(field.description?.length).toBeGreaterThan(0);
        }
    });

    test("each derived field's key is the camelCase of its label, and is no stored key", () => {
        for (const derived of schema.derivedFields) {
            expect(derived.key).toBe(camelCaseOfLabel(derived.label));
            expect(schema.findEntry(derived.key)).toBeUndefined();
        }
    });
});
