import type { KeyboardInputData, KeyboardPlatform } from './KeyboardInputData.ts';

// A key press in the editor's terms: Cmd already read as Ctrl on a Mac. The modifier no shortcut uses
// (the Windows key, or Ctrl on a Mac) is kept as otherModifier, so a press holding it matches nothing.
export class KeyPress {
    readonly code: string;
    readonly key: string;
    readonly ctrl: boolean;
    readonly shift: boolean;
    readonly alt: boolean;
    readonly otherModifier: boolean;
    readonly repeat: boolean;

    private constructor(input: KeyboardInputData, platform: KeyboardPlatform) {
        this.code = input.code;
        this.key = input.key;
        this.shift = input.shiftKey;
        this.alt = input.altKey;
        this.repeat = input.repeat;

        if (platform === 'mac') {
            this.ctrl = input.metaKey;
            this.otherModifier = input.ctrlKey;
        } else {
            this.ctrl = input.ctrlKey;
            this.otherModifier = input.metaKey;
        }
    }

    // undefined when AltGr is down: the person is typing a symbol, never asking for a shortcut.
    static fromKeyboard(input: KeyboardInputData, platform: KeyboardPlatform) {
        if (input.altGraph) return undefined;

        return new KeyPress(input, platform);
    }
}
