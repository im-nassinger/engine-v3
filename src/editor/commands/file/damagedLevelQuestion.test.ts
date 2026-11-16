import { describe, expect, test } from 'vitest';

import { FakeFiles } from '../../saving/testing/index.ts';

import { DAMAGED_FILE_NAME, DAMAGED_TITLE, EXPORT_RAW_LABEL, damagedLevelQuestion } from './damagedLevelQuestion.ts';

const damaged = {
    levelJson: '{"broken"',
    refusal: { reason: 'damaged', detail: 'Unexpected end' },
    noticeText: "The saved level couldn't be opened: it is damaged. It is kept, and you can export its raw data.",
} as const;

describe('damagedLevelQuestion', () => {
    test('asks with Export raw data and Close, and exports nothing until confirmed', () => {
        const files = new FakeFiles();

        const outcome = damagedLevelQuestion(damaged, files);

        if (outcome.kind !== 'needsConfirmation') throw new Error('Expected a question.');
        expect(outcome.question).toEqual({
            title: DAMAGED_TITLE,
            text: damaged.noticeText,
            confirmLabel: EXPORT_RAW_LABEL,
            cancelLabel: 'Close',
        });
        expect(files.exported).toHaveLength(0);
    });

    test('Export raw data hands out the saved text as it was', () => {
        const files = new FakeFiles();
        const outcome = damagedLevelQuestion(damaged, files);
        if (outcome.kind !== 'needsConfirmation') throw new Error('Expected a question.');

        const confirmed = outcome.confirm();

        expect(files.exported).toEqual([{ name: DAMAGED_FILE_NAME, text: '{"broken"', mediaType: 'application/json' }]);
        expect(confirmed).toEqual({ kind: 'done', text: 'Exported damaged-level.json' });
    });
});
