import {
    NameComponent,
    TagsComponent,
    TransformComponent,
    TriggerComponent,
    VariablesComponent,
    createV1Registry,
} from '../../../../core/components/index.ts';
import type { Trigger } from '../../../../core/fields/index.ts';
import { Level } from '../../../../core/level/index.ts';
import type { TriggerContext } from '../../../../core/triggers/index.ts';

// The mockup's example level: the World's `coins` and `lives` and its five inputs, a Player tagged
// `player`, and a Coin tagged `coin` holding the given triggers, numbered from 1.
export function buildTriggerLevel(triggers: readonly Partial<Trigger>[] = [{}]) {
    const level = Level.createNew();
    level.world.addComponent(
        new VariablesComponent({
            variables: [
                { name: 'coins', value: 0 },
                { name: 'lives', value: 3 },
            ],
        }),
    );

    const player = level.createEntity(level.world, 0);
    player.addComponent(new TransformComponent());
    player.addComponent(new NameComponent({ name: 'Player' }));
    player.addComponent(new TagsComponent({ tags: ['player'] }));

    const coin = level.createEntity(level.world, 1);
    coin.addComponent(new TransformComponent());
    coin.addComponent(new NameComponent({ name: 'Coin' }));
    coin.addComponent(new TagsComponent({ tags: ['coin'] }));

    const madeTriggers = triggers.map((parts, index) => triggerWith({ id: index + 1, ...parts }));
    const component = new TriggerComponent({ triggers: madeTriggers, nextTriggerId: madeTriggers.length + 1 });
    coin.addComponent(component);

    const registry = createV1Registry();
    const context: TriggerContext = { owner: coin, level, registry };

    return { level, player, coin, component, registry, context };
}

export function triggerWith(parts: Partial<Trigger>): Trigger {
    return {
        id: 1,
        name: null,
        on: true,
        when: { kind: 'touched' },
        checks: [],
        actions: [],
        ...parts,
    };
}
