import type { AnyComponent } from '../../components/index.ts';
import type { Entity, Level } from '../../level/index.ts';
import type { JsonValue } from '../../fields/index.ts';

import { CURRENT_FORMAT_VERSION, LEVEL_FORMAT } from '../LevelData.ts';
import type { ComponentData, EntityData, LevelData } from '../LevelData.ts';
import { PhysicsVersions } from '../versions/PhysicsVersions.ts';

// The only code that turns a level into data. Every value is written, defaults included, by its type's
// serialize, so the file says exactly what the level held.
export class LevelWriter {
    write(level: Level): LevelData {
        const editor = {
            gridSize: level.editorData.gridSize,
            foldedRows: level.editorData.foldedRows(),
        };
        const entities = this.writeSubtree([level.world]);

        return {
            format: LEVEL_FORMAT,
            formatVersion: CURRENT_FORMAT_VERSION,
            physicsVersion: PhysicsVersions.current,
            name: level.name,
            editor,
            entities,
        };
    }

    // Each given entity with everything inside it, parents first. The given entities keep their own
    // parent's id, which the caller may ignore.
    writeSubtree(entities: readonly Entity[]): readonly EntityData[] {
        const written: EntityData[] = [];

        for (const subtreeRoot of entities) {
            this.writeEntityAndChildren(subtreeRoot, written);
        }

        return written;
    }

    private writeEntityAndChildren(entity: Entity, written: EntityData[]) {
        written.push(this.writeEntity(entity));

        for (const child of entity.children) {
            this.writeEntityAndChildren(child, written);
        }
    }

    private writeEntity(entity: Entity): EntityData {
        const components: Record<string, ComponentData> = {};

        for (const component of entity.components) {
            components[component.schema.typeName] = this.writeComponent(component);
        }

        const parentId = entity.parent?.id ?? null;

        return {
            id: entity.id,
            parent: parentId,
            hidden: entity.isHidden,
            locked: entity.isLocked,
            components,
        };
    }

    private writeComponent(component: AnyComponent): ComponentData {
        const values: Record<string, JsonValue> = {};

        for (const entry of component.schema.entries) {
            const fileKey = component.schema.fileKeyOf(entry);
            const value = component.readValue(entry.key);
            values[fileKey] = entry.type.serialize(value);
        }

        return values;
    }
}
