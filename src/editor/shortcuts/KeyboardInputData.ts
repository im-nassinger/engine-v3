// One key press as the browser reports it, copied out of the KeyboardEvent by the KeyboardInput adapter.
// code is the physical key ('KeyZ', 'Digit3'), key what the layout typed ('z', '#', 'Enter').
export type KeyboardInputData = {
    readonly code: string;
    readonly key: string;
    readonly ctrlKey: boolean;
    readonly shiftKey: boolean;
    readonly altKey: boolean;
    readonly metaKey: boolean;
    // getModifierState('AltGraph'): Windows reports AltGr as Ctrl+Alt on many layouts.
    readonly altGraph: boolean;
    readonly repeat: boolean;
};

// On a Mac, Cmd is Ctrl and Option is Alt.
export type KeyboardPlatform = 'mac' | 'other';
