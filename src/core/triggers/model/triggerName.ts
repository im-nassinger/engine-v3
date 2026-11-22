import type { Trigger, When } from '../../fields/index.ts';
import { KeyCodes } from '../../keys/index.ts';
import type { KeyCode } from '../../keys/index.ts';

// What the trigger is called: its own name, or one made from its When, such as "Touched", "jump pressed",
// "After 60 s" or "No coin left".
export function triggerName(trigger: Trigger) {
    if (trigger.name !== null) return trigger.name;

    return nameOfWhen(trigger.when);
}

function nameOfWhen(when: When | null) {
    if (when === null) return 'New trigger';

    switch (when.kind) {
        case 'touched':
            return 'Touched';
        case 'untouched':
            return 'No longer touched';
        case 'input':
            return `${when.input ?? 'Input'} ${when.how}`;
        case 'key': {
            const keyLabel = keyName(when.key);
            return `${keyLabel} ${when.how}`;
        }
        case 'after':
            return timerName('After', when.seconds);
        case 'every':
            return timerName('Every', when.seconds);
        case 'levelStart':
            return 'Level start';
        case 'tagLeft':
            return `No ${when.tag ?? 'tag'} left`;
    }
}

function keyName(key: KeyCode | null) {
    if (key === null) return 'Key';

    return KeyCodes.label(key);
}

// "After 60 s", "Every 0.5 s"; "After a time" while the time is unset.
function timerName(start: string, seconds: number | null) {
    if (seconds === null) return `${start} a time`;

    const rounded = Math.round(seconds * 100) / 100;
    return `${start} ${rounded} s`;
}
