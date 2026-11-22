import type { TriggerComponent } from '../../components/index.ts';

// The id a trigger added to this component gets: above every id it holds and every id it ever gave, so an
// id is never reused. Store it back with the new trigger as `nextTriggerId` + 1, in the same step.
export function newTriggerId(component: TriggerComponent) {
    let id = component.get('nextTriggerId');

    for (const trigger of component.get('triggers')) {
        if (trigger.id >= id) {
            id = trigger.id + 1;
        }
    }

    return id;
}
