import { describe, expect, test } from 'vitest';

import type { EditorMessage } from '../messages/index.ts';

import { messagesCount } from './messagesCount.ts';

function message(kind: EditorMessage['kind']): EditorMessage {
    return {
        kind,
        entityId: undefined,
        componentType: undefined,
        fieldKey: undefined,
        text: 'A note.',
        fix: undefined,
    };
}

describe('messagesCount', () => {
    test('shows nothing without messages', () => {
        expect(messagesCount([])).toBe('');
    });

    test('counts warnings, one or several', () => {
        expect(messagesCount([message('warning')])).toBe('1 warning');
        expect(messagesCount([message('warning'), message('warning')])).toBe('2 warnings');
    });

    test('counts tips after warnings', () => {
        const messages = [message('tip'), message('warning'), message('tip')];

        expect(messagesCount(messages)).toBe('1 warning, 2 tips');
    });
});
