// The keys held down now, by KeyboardEvent.code, in the order they went down, and the keys pressed since
// the last batch, so a press shorter than a tick still reaches the game. The keyboard adapter presses
// and releases them; test play sends them with every batch.
export class HeldKeys {
    private readonly held = new Set<string>();
    private readonly pressed = new Set<string>();

    // A key already held, as the keyboard's repeat sends it, is no new press.
    press(code: string) {
        if (!this.held.has(code)) {
            this.pressed.add(code);
        }
        this.held.add(code);
    }

    release(code: string) {
        this.held.delete(code);
    }

    // When the keyboard is lost, the key ups go elsewhere, so a key would stick; its press goes too.
    releaseAll() {
        this.held.clear();
        this.pressed.clear();
    }

    // At a run's start: what was pressed in the editor, such as the key that started it, never reaches the
    // game. A key still held stays held.
    forgetPresses() {
        this.pressed.clear();
    }

    isHeld(code: string) {
        return this.held.has(code);
    }

    // A copy, so a batch already sent never changes.
    codes(): readonly string[] {
        return [...this.held];
    }

    // The keys pressed since the last call, in the order they first went down; the next batch starts
    // from none.
    takePresses(): readonly string[] {
        const presses = [...this.pressed];
        this.pressed.clear();

        return presses;
    }
}
