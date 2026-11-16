import type { Unsubscribe } from '../../../core/events/index.ts';
import type { KeyboardInputData, ShortcutDispatcher } from '../../../editor/shortcuts/index.ts';

import { focusPlaceOf } from './focusPlaceOf.ts';

type KeyHandler = Pick<ShortcutDispatcher, 'handleKeyDown' | 'handleKeyUp'>;

const LEVEL_VIEW_SELECTOR = '[data-focus-place="level"]';

// The page's keyboard: every key press goes to the ShortcutDispatcher with where the keyboard and the
// mouse are, and the browser's default is stopped only when the editor used the key. Listens on the
// window in the capture phase, so a focused element can't swallow a key first.
export class KeyboardInput {
    private readonly handler: KeyHandler;
    private readonly page: Window;
    private readonly held = new Set<string>();
    private pointerOverLevelView = false;

    constructor(handler: KeyHandler, page: Window) {
        this.handler = handler;
        this.page = page;
    }

    // The physical keys held down now. Emptied when the window loses focus, because the key up
    // never arrives then, and a key would stick.
    isHeld(code: string) {
        return this.held.has(code);
    }

    connect(): Unsubscribe {
        const options = { capture: true };
        const handleKeyDown = (event: KeyboardEvent) => this.handleKeyDown(event);
        const handleKeyUp = (event: KeyboardEvent) => this.handleKeyUp(event);
        const handlePointerOver = (event: PointerEvent) => this.handlePointerOver(event);
        const handlePointerOut = (event: PointerEvent) => this.handlePointerOut(event);
        const handleBlur = (event: FocusEvent) => this.handleBlur(event);

        this.page.addEventListener('keydown', handleKeyDown, options);
        this.page.addEventListener('keyup', handleKeyUp, options);
        this.page.addEventListener('pointerover', handlePointerOver, options);
        this.page.addEventListener('pointerout', handlePointerOut, options);
        this.page.addEventListener('blur', handleBlur, options);

        return () => {
            this.page.removeEventListener('keydown', handleKeyDown, options);
            this.page.removeEventListener('keyup', handleKeyUp, options);
            this.page.removeEventListener('pointerover', handlePointerOver, options);
            this.page.removeEventListener('pointerout', handlePointerOut, options);
            this.page.removeEventListener('blur', handleBlur, options);
        };
    }

    private handleKeyDown(event: KeyboardEvent) {
        this.held.add(event.code);

        if (isAltAlone(event)) {
            event.preventDefault();
            return;
        }

        const input = readKeyboardInput(event);
        const focus = focusPlaceOf(this.page.document.activeElement);
        const used = this.handler.handleKeyDown(input, focus, this.pointerOverLevelView);

        if (used) {
            event.preventDefault();
        }
    }

    // Firefox and Windows open the browser's menu bar when Alt goes up after being pressed alone.
    private handleKeyUp(event: KeyboardEvent) {
        this.held.delete(event.code);
        this.handler.handleKeyUp(readKeyboardInput(event));

        if (isAltAlone(event)) {
            event.preventDefault();
        }
    }

    // An element losing focus reaches this capturing listener too; only the window's own blur means
    // the key ups will go elsewhere.
    private handleBlur(event: FocusEvent) {
        const windowLostFocus = event.target === this.page;
        if (windowLostFocus) {
            this.held.clear();
        }
    }

    private handlePointerOver(event: PointerEvent) {
        this.pointerOverLevelView = isInsideLevelView(event.target);
    }

    // Leaving the window has no element to go over, so nothing else would clear it.
    private handlePointerOut(event: PointerEvent) {
        const leftThePage = event.relatedTarget === null;
        if (leftThePage) {
            this.pointerOverLevelView = false;
        }
    }
}

function isAltAlone(event: KeyboardEvent) {
    const isAltKey = event.key === 'Alt';
    const otherModifier = event.ctrlKey || event.shiftKey || event.metaKey;

    return isAltKey && !otherModifier;
}

function isInsideLevelView(target: EventTarget | null) {
    if (!(target instanceof Element)) return false;

    const levelView = target.closest(LEVEL_VIEW_SELECTOR);

    return levelView !== null;
}

function readKeyboardInput(event: KeyboardEvent): KeyboardInputData {
    return {
        code: event.code,
        key: event.key,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
        altGraph: event.getModifierState('AltGraph'),
        repeat: event.repeat,
    };
}
