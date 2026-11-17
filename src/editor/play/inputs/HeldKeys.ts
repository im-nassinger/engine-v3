// The keys held down now, by KeyboardEvent.code, in the order they went down. The keyboard adapter
// presses and releases them; test play sends them with every batch.
export class HeldKeys {
    private readonly held = new Set<string>();

    press(code: string) {
        this.held.add(code);
    }

    release(code: string) {
        this.held.delete(code);
    }

    // When the keyboard is lost, the key ups go elsewhere, so a key would stick.
    releaseAll() {
        this.held.clear();
    }

    isHeld(code: string) {
        return this.held.has(code);
    }

    // A copy, so a batch already sent never changes.
    codes(): readonly string[] {
        return [...this.held];
    }
}
