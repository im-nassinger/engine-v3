import type { Compare, Condition, TimeUnit, Trigger, VariableValue, When } from '../../fields/index.ts';
import { KeyCodes } from '../../keys/index.ts';
import type { KeyCode } from '../../keys/index.ts';

// What the trigger is called: its own name, or one made from its When, such as "Touched", "jump pressed",
// "After 60 s", "Gets open" or "coins becomes 10 or more".
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
            return timerName('After', when.time, when.unit);
        case 'every':
            return timerName('Every', when.time, when.unit);
        case 'levelStart':
            return 'Level start';
        case 'custom':
            return when.name === null ? 'Gets an event' : `Gets ${when.name}`;
        case 'variableChanged':
            return variableChangedName(when.variable?.name ?? null, when.becomes);
    }
}

// "coins changes", "coins becomes 10 or more"; "A variable changes" while the variable is unset.
function variableChangedName(name: string | null, becomes: Condition | null) {
    if (name === null) return 'A variable changes';
    if (becomes === null) return `${name} changes`;

    return `${name} becomes ${conditionName(becomes.compare, becomes.value)}`;
}

// "10 or more", "not 10", "more than 10"; a string in quotes, so "becomes "" " reads as the empty string.
function conditionName(compare: Compare, value: VariableValue) {
    const shown = typeof value === 'string' ? `"${value}"` : String(value);

    switch (compare) {
        case 'is':
            return shown;
        case 'isNot':
            return `not ${shown}`;
        case 'more':
            return `more than ${shown}`;
        case 'less':
            return `less than ${shown}`;
        case 'atLeast':
            return `${shown} or more`;
        case 'atMost':
            return `${shown} or less`;
    }
}

function keyName(key: KeyCode | null) {
    if (key === null) return 'Key';

    return KeyCodes.label(key);
}

// "After 60 s", "Every 0.5 s", "Every 3 ticks"; "After a time" while the time is unset.
function timerName(start: string, time: number | null, unit: TimeUnit) {
    if (time === null) return `${start} a time`;
    if (unit === 'ticks') return `${start} ${time} ${time === 1 ? 'tick' : 'ticks'}`;

    const rounded = Math.round(time * 100) / 100;
    return `${start} ${rounded} s`;
}
