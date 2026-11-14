import { expect, test } from 'vitest';
import { ALLOWED_MATH_IN_CORE, BANNED_MATH_IN_CORE } from '../../eslint.config.ts';

test('every Math member in this Node is either allowed or banned in core', () => {
    const mathMembers = Object.getOwnPropertyNames(Math);
    const knownMembers = new Set([...ALLOWED_MATH_IN_CORE, ...BANNED_MATH_IN_CORE]);

    const unknownMembers = mathMembers.filter((member) => !knownMembers.has(member));

    expect(unknownMembers).toEqual([]);
});
