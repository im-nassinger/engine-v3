import type { EditorMessage } from '../messages/index.ts';

// The status bar's count of editor messages: `2 warnings`, `1 warning, 1 tip`. None shows nothing,
// so the count is hidden.
export function messagesCount(messages: readonly EditorMessage[]) {
    const warnings = messages.filter((message) => message.kind === 'warning').length;
    const tips = messages.length - warnings;

    const parts: string[] = [];
    if (warnings > 0) {
        parts.push(counted(warnings, 'warning'));
    }
    if (tips > 0) {
        parts.push(counted(tips, 'tip'));
    }

    return parts.join(', ');
}

function counted(count: number, word: string) {
    const ending = count === 1 ? '' : 's';

    return `${count} ${word}${ending}`;
}
