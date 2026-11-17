import { describe, expect, test } from 'vitest';

import { JointComponent } from './JointComponent.ts';
import type { JointValues } from './JointValues.ts';

function applyingKeys(values: JointValues) {
    const applying = JointComponent.schema.fields.filter((field) => field.appliesWhen?.(values) ?? true);

    return applying.map((field) => field.key);
}

describe('JointComponent', () => {
    const defaults = JointComponent.schema.defaults();

    test('a new joint is a Hinge with no entities and the ranges of the requirements', () => {
        const joint = new JointComponent();

        expect(joint.get('type')).toBe('hinge');
        expect(joint.get('a')).toBeNull();
        expect(joint.get('minAngle')).toBe(-45);
        expect(joint.get('maxAngle')).toBe(45);
        expect(joint.get('motorSpeed')).toBe(180);
        expect(joint.get('length')).toBe(100);
    });

    test('Let connected objects collide has no description, its label says enough', () => {
        const setting = JointComponent.schema.fields.find((field) => field.key === 'letConnectedObjectsCollide');

        expect(setting?.label).toBe('Let connected objects collide');
        expect(setting?.description).toBeUndefined();
    });

    test('limits always include the placed position', () => {
        const joint = new JointComponent();

        expect(joint.writeValue('minAngle', 30)).toEqual({ ok: true, value: 0 });
        expect(joint.writeValue('maxAngle', -10)).toEqual({ ok: true, value: 0 });
    });

    test('a Hinge greys what only a Rope or Spring uses, and the limits and motor follow their switches', () => {
        const hingeKeys = applyingKeys(defaults);
        const withLimitsAndMotor = applyingKeys({ ...defaults, limitRotation: true, motor: true });

        expect(hingeKeys).toEqual([
            'type',
            'a',
            'b',
            'letConnectedObjectsCollide',
            'limitRotation',
            'motor',
            'resistance',
        ]);
        expect(withLimitsAndMotor).toContain('minAngle');
        expect(withLimitsAndMotor).toContain('motorStrength');
    });

    test('a Rope shows Length only when it does not match the drawn distance', () => {
        const matching = applyingKeys({ ...defaults, type: 'rope' });
        const typed = applyingKeys({ ...defaults, type: 'rope', matchDrawnDistance: false });

        expect(matching).toEqual(['type', 'a', 'b', 'letConnectedObjectsCollide', 'matchDrawnDistance']);
        expect(typed).toContain('length');
        expect(typed).not.toContain('restLength');
    });

    test('a Spring shares Match drawn distance with the Rope, and has its own stiffness and damping', () => {
        const spring = applyingKeys({ ...defaults, type: 'spring', matchDrawnDistance: false });

        expect(spring).toEqual([
            'type',
            'a',
            'b',
            'letConnectedObjectsCollide',
            'matchDrawnDistance',
            'restLength',
            'stiffness',
            'damping',
        ]);
    });

    test('the type, the two entities and the ends never change during play', () => {
        const fixedInPlay = JointComponent.schema.fields.filter((field) => !field.changeableInPlay);
        const fixedKeys = fixedInPlay.map((field) => field.key);

        expect(fixedKeys).toEqual(['type', 'a', 'b', 'letConnectedObjectsCollide', 'matchDrawnDistance']);
        expect(JointComponent.schema.findFieldByAttribute('ends')).toBeUndefined();
    });

    test('only the Joint tool makes one', () => {
        expect(JointComponent.schema.addableByHand).toBe(false);
    });
});
