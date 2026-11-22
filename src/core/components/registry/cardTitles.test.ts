import { describe, expect, test } from 'vitest';
import { cardTitle } from '../schema/cardTitle.ts';
import { createV1Registry } from './createV1Registry.ts';

const TITLES = new Map([
    ['TransformComponent', 'Transform'],
    ['NameComponent', 'Name'],
    ['ShapeComponent', 'Shape'],
    ['PathComponent', 'Path'],
    ['StyleComponent', 'Style'],
    ['BodyComponent', 'Body'],
    ['SurfaceComponent', 'Surface'],
    ['JointComponent', 'Joint'],
    ['CameraComponent', 'Camera'],
    ['PhysicsWorldComponent', 'PhysicsWorld'],
    ['TagsComponent', 'Tags'],
    ['VariablesComponent', 'Variables'],
    ['InputComponent', 'Input'],
]);

const schemas = createV1Registry()
    .all()
    .map((componentClass) => componentClass.schema);

describe('cardTitle', () => {
    test.each(schemas.map((schema) => schema.typeName))('%s has its title', (typeName) => {
        expect(cardTitle(typeName)).toBe(TITLES.get(typeName));
    });

    test("every partner note names the partner by its card's title", () => {
        const partners = schemas.flatMap((schema) => schema.partners);

        expect(partners.length).toBeGreaterThan(0);
        for (const partner of partners) {
            expect(partner.noteText).toContain(`Needs a ${cardTitle(partner.partner)} to `);
        }
    });
});
