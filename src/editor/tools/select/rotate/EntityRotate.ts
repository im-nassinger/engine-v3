import { TransformComponent } from '../../../../core/components/index.ts';
import { Matrix2D } from '../../../../core/geometry/index.ts';
import type { Point, TransformValues } from '../../../../core/geometry/index.ts';
import type { EntityId } from '../../../../core/level/index.ts';
import { labelName } from '../../../../core/level/index.ts';
import type { ValueTarget } from '../../../history/index.ts';
import type { OpenLevel } from '../../../session/index.ts';
import type { SelectionFrame } from '../frame/SelectionFrame.ts';

// One entity turned through LiveEdit, which the caller begins with the targets: its Rotation, and its
// position moved so the centre of its frame stays in place on screen. The World never turns.
export class EntityRotate {
    readonly label: string;
    readonly targets: readonly ValueTarget[];
    readonly startRotation: number;
    // 1, or -1 under a mirroring parent, where a clockwise turn on screen is a counterclockwise Rotation.
    readonly screenDirection: 1 | -1;
    private readonly openLevel: OpenLevel;
    private readonly entityId: EntityId;
    private readonly start: TransformValues;
    // The frame's centre, in the entity's own space and in its parent's.
    private readonly centre: Point;
    private readonly centreInParent: Point;

    private constructor(openLevel: OpenLevel, frame: SelectionFrame, start: TransformValues, screenDirection: 1 | -1) {
        this.openLevel = openLevel;
        this.entityId = frame.entity.id;
        this.label = `Rotate ${labelName(frame.entity)}`;
        this.start = start;
        this.startRotation = start.rotation;
        this.screenDirection = screenDirection;
        this.centre = frame.box.centre;
        this.centreInParent = Matrix2D.fromTransform(start).apply(this.centre);
        this.targets = [this.rotationTarget, this.positionTarget];
    }

    private get rotationTarget(): ValueTarget {
        return { entityId: this.entityId, schema: TransformComponent.schema, key: 'rotation' };
    }

    private get positionTarget(): ValueTarget {
        return { entityId: this.entityId, schema: TransformComponent.schema, key: 'position' };
    }

    // undefined for the World, and under a parent flattened to a line, where no turn shows.
    static of(openLevel: OpenLevel, frame: SelectionFrame): EntityRotate | undefined {
        if (frame.kind === 'world') return undefined;

        const parent = frame.entity.parent;
        const transform = frame.entity.getComponent(TransformComponent);
        if (parent === undefined || transform === undefined) return undefined;

        const parentDeterminant = openLevel.caches.worldMatrices.matrixOf(parent).determinant();
        if (parentDeterminant === 0) return undefined;

        const start: TransformValues = {
            position: transform.get('position'),
            rotation: transform.get('rotation'),
            scale: transform.get('scale'),
            skew: transform.get('skew'),
        };

        return new EntityRotate(openLevel, frame, start, parentDeterminant > 0 ? 1 : -1);
    }

    // Writes the Rotation, and the position that keeps the frame's centre where it was.
    apply(rotation: number) {
        const turnedInPlace = Matrix2D.fromTransform({ ...this.start, position: { x: 0, y: 0 }, rotation });
        const centreOffset = turnedInPlace.apply(this.centre);
        const position = {
            x: this.centreInParent.x - centreOffset.x,
            y: this.centreInParent.y - centreOffset.y,
        };
        const { liveEdit } = this.openLevel;

        liveEdit.update(this.rotationTarget, rotation);
        liveEdit.update(this.positionTarget, position);
    }
}
