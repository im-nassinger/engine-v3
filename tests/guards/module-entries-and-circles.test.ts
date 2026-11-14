import { readFileSync } from 'node:fs';
import { cruise } from 'dependency-cruiser';
import type { ICruiseOptions, IForbiddenRuleType } from 'dependency-cruiser';
import { describe, expect, test } from 'vitest';

const projectRoot = new URL('../../', import.meta.url).pathname;

type CruiserConfig = {
    forbidden: IForbiddenRuleType[];
    options: ICruiseOptions;
};

function readCruiserConfig() {
    const configText = readFileSync(`${projectRoot}.dependency-cruiser.json`, 'utf8');

    return JSON.parse(configText) as CruiserConfig;
}

async function findBrokenRules(sampleTree: string) {
    const config = readCruiserConfig();
    const options: ICruiseOptions = {
        ...config.options,
        baseDir: `${projectRoot}tests/guards/samples/${sampleTree}`,
        validate: true,
        ruleSet: { forbidden: config.forbidden },
    };

    const result = await cruise(['src'], options);
    if (typeof result.output === 'string') throw new Error('dependency-cruiser returned text instead of a result.');

    const violations = result.output.summary.violations;

    return violations.map((violation) => violation.rule.name);
}

describe('module entries and circles', () => {
    test('dependency-cruiser reports the deep import and the circle between modules', async () => {
        const brokenRules = await findBrokenRules('modules-broken');

        expect(brokenRules).toContain('module-entry');
        expect(brokenRules).toContain('no-circle-between-modules');
    });

    test('dependency-cruiser reports nothing on the fixed tree', async () => {
        const brokenRules = await findBrokenRules('modules-fixed');

        expect(brokenRules).toEqual([]);
    });
});
