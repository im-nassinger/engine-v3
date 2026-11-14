import { describe, expect, test } from 'vitest';

import { Signal } from './Signal.ts';

describe('Signal', () => {
    test('listeners run in the order they subscribed, with the payload', () => {
        const signal = new Signal<number>();
        const calls: string[] = [];

        signal.subscribe((payload) => calls.push(`first ${payload}`));
        signal.subscribe((payload) => calls.push(`second ${payload}`));
        signal.emit(7);

        expect(calls).toEqual(['first 7', 'second 7']);
    });

    test('an unsubscribed listener is not called', () => {
        const signal = new Signal<void>();
        let callCount = 0;

        const unsubscribe = signal.subscribe(() => callCount++);
        unsubscribe();
        signal.emit();

        expect(callCount).toBe(0);
    });

    test('unsubscribing twice is harmless', () => {
        const signal = new Signal<void>();
        const unsubscribe = signal.subscribe(() => {});

        unsubscribe();

        expect(unsubscribe).not.toThrow();
    });

    test('one function subscribed twice runs twice, and each unsubscribe removes one', () => {
        const signal = new Signal<void>();
        let callCount = 0;
        const listener = () => callCount++;

        const unsubscribeFirst = signal.subscribe(listener);
        signal.subscribe(listener);
        unsubscribeFirst();
        signal.emit();

        expect(callCount).toBe(1);
    });

    test('a listener can unsubscribe itself during an emit', () => {
        const signal = new Signal<void>();
        const calls: string[] = [];

        const unsubscribeFirst = signal.subscribe(() => {
            calls.push('first');
            unsubscribeFirst();
        });
        signal.subscribe(() => calls.push('second'));
        signal.emit();
        signal.emit();

        expect(calls).toEqual(['first', 'second', 'second']);
    });

    test('a listener removed during an emit is not called later in that emit', () => {
        const signal = new Signal<void>();
        const calls: string[] = [];
        let unsubscribeSecond = () => {};

        signal.subscribe(() => {
            calls.push('first');
            unsubscribeSecond();
        });
        unsubscribeSecond = signal.subscribe(() => calls.push('second'));
        signal.emit();

        expect(calls).toEqual(['first']);
    });

    test('a listener added during an emit runs from the next emit on', () => {
        const signal = new Signal<void>();
        const calls: string[] = [];
        let hasAddedLate = false;

        signal.subscribe(() => {
            calls.push('first');
            if (hasAddedLate) return;

            hasAddedLate = true;
            signal.subscribe(() => calls.push('late'));
        });
        signal.emit();
        signal.emit();

        expect(calls).toEqual(['first', 'first', 'late']);
    });
});
