import { InputComponent } from '../../components/index.ts';
import type { Level } from '../../level/index.ts';

import { NO_INPUTS } from './TickInputs.ts';
import type { TickInputs } from './TickInputs.ts';

import { InputState } from './InputState.ts';
import type { InputKeys } from './InputState.ts';

const NOTHING_DOWN: ReadonlySet<string> = new Set();

// The run's keys and inputs: the InputState of the tick being run, which InputPhase moves on each tick,
// and the unknown input names read so far, each once, for the run's warnings. The inputs are the World's
// when the run starts.
export class PlayInputs {
    private readonly inputKeys: InputKeys;
    private readonly unknown: string[] = [];
    private current: InputState;

    constructor(level: Level) {
        this.inputKeys = inputKeysOf(level);
        this.current = this.stateFor(NOTHING_DOWN, NO_INPUTS);
    }

    get state() {
        return this.current;
    }

    // In the order they were first read.
    get unknownInputs(): readonly string[] {
        return this.unknown;
    }

    advance(inputs: TickInputs) {
        this.current = this.stateFor(this.current.downKeys, inputs);
    }

    private stateFor(downBefore: ReadonlySet<string>, inputs: TickInputs) {
        return new InputState(downBefore, inputs, this.inputKeys, (name) => this.readUnknown(name));
    }

    private readUnknown(name: string) {
        if (this.unknown.includes(name)) return;

        this.unknown.push(name);
    }
}

function inputKeysOf(level: Level): InputKeys {
    const component = level.world.getComponent(InputComponent);
    const inputs = component?.get('inputs') ?? [];

    return new Map(inputs.map((input) => [input.name, input.keys]));
}
