import { InputComponent, TriggerComponent } from '../../components/index.ts';
import type { Level } from '../../level/index.ts';

// Every key the level uses: its inputs' keys and the raw keys its triggers wait for, so the page can
// keep those keys from the browser during play and leave it the rest.
export function levelKeys(level: Level): ReadonlySet<string> {
    const keys = new Set<string>();

    const inputs = level.world.getComponent(InputComponent)?.get('inputs') ?? [];
    for (const input of inputs) {
        for (const key of input.keys) {
            keys.add(key);
        }
    }

    for (const entity of level.entitiesInPanelOrder()) {
        const triggers = entity.getComponent(TriggerComponent)?.get('triggers') ?? [];
        for (const trigger of triggers) {
            const when = trigger.when;
            if (when?.kind === 'key' && when.key !== null) {
                keys.add(when.key);
            }
        }
    }

    return keys;
}
