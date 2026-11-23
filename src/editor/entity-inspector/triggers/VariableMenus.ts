import { VariablesComponent } from '../../../core/components/index.ts';
import { variableTypeOf } from '../../../core/fields/index.ts';
import type { Target, VariableRef, VariableType } from '../../../core/fields/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import type { TriggerContext } from '../../../core/triggers/index.ts';

import { targetText } from './targetText.ts';
import type { TriggerMenuGroup, TriggerPartValue } from './TriggerWord.ts';

// A variable as a menu offers it: its name and the type its value has.
export type KnownVariable = {
    readonly name: string;
    readonly type: VariableType;
};

// Builds the row a picked variable makes, knowing the variable's type.
export type PlaceVariable = (ref: VariableRef, type: VariableType) => TriggerPartValue;

export const LEVEL_GROUP_TITLE = 'Level variables';
const NO_OWN_VARIABLES = 'no variables of its own';

// The variable menus of the trigger card: "The level's" (the World's VariablesComponent) first, then a group
// per owner, titled with its target. An owner known while editing (`this`, a named entity) offers its own
// variables; one known only in play (`other`, a tag) offers every name any entity but the World holds, as
// any of them may be the one. Each item carries its type, which picks the compare words and the value field.
export class VariableMenus {
    private readonly context: TriggerContext;

    constructor(context: TriggerContext) {
        this.context = context;
    }

    levelVariables() {
        return variablesOf(this.context.level.world);
    }

    // Undefined when the target is the World, whose variables are the level's.
    ownVariables(target: Target): readonly KnownVariable[] | undefined {
        const holder = this.holderOf(target);
        if (holder === this.context.level.world) return undefined;
        if (holder !== undefined) return variablesOf(holder);

        return this.everyOwnVariable();
    }

    // The type of the variable a reference names; undefined while it is unset or names no known variable.
    typeOf(ref: VariableRef | null) {
        if (ref === null) return undefined;

        let variables = this.levelVariables();
        if (ref.owner === 'own') {
            variables = this.ownVariables(ref.target) ?? [];
        }

        return variables.find((variable) => variable.name === ref.name)?.type;
    }

    groups(owners: readonly Target[], place: PlaceVariable) {
        const levelChoices = this.levelVariables().map((variable) => {
            const ref: VariableRef = { owner: 'level', name: variable.name };

            return variableChoice(variable, place(ref, variable.type));
        });
        const groups: TriggerMenuGroup[] = [{ title: LEVEL_GROUP_TITLE, choices: levelChoices, emptyText: undefined }];

        for (const owner of owners) {
            const variables = this.ownVariables(owner);
            if (variables === undefined) continue;

            const choices = variables.map((variable) => {
                const ref: VariableRef = { owner: 'own', target: owner, name: variable.name };

                return variableChoice(variable, place(ref, variable.type));
            });
            const title = targetText(owner, this.context.level) ?? 'the target';
            groups.push({ title, choices, emptyText: NO_OWN_VARIABLES });
        }

        return groups;
    }

    private holderOf(target: Target): Entity | undefined {
        if (target.kind === 'this') return this.context.owner;
        if (target.kind !== 'entity' || target.entity === null) return undefined;

        return this.context.level.findEntity(target.entity);
    }

    // Each name once, with the type it has on the first entity holding it, in Entities viewer order.
    private everyOwnVariable() {
        const seen = new Map<string, KnownVariable>();

        for (const entity of this.context.level.entitiesInPanelOrder()) {
            if (entity === this.context.level.world) continue;

            for (const variable of variablesOf(entity)) {
                if (seen.has(variable.name)) continue;

                seen.set(variable.name, variable);
            }
        }

        return [...seen.values()];
    }
}

function variablesOf(entity: Entity): readonly KnownVariable[] {
    const variables = entity.getComponent(VariablesComponent)?.get('variables') ?? [];

    return variables.map((variable) => {
        const type = variableTypeOf(variable.value);

        return { name: variable.name, type };
    });
}

function variableChoice(variable: KnownVariable, value: TriggerPartValue) {
    return { label: variable.name, disabledReason: undefined, value, note: variable.type, asks: undefined };
}
