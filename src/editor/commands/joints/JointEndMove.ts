import { JointComponent, PathComponent, TransformComponent } from '../../../core/components/index.ts';
import { Matrix2D } from '../../../core/geometry/index.ts';
import type { Point } from '../../../core/geometry/index.ts';
import { labelName } from '../../../core/level/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import { drawnLength, jointPathPoints } from '../../../core/physics/index.ts';
import type { ValueTarget } from '../../history/index.ts';
import type { OpenLevel } from '../../session/index.ts';

export type JointEndSide = 'a' | 'b';

export type JointEndRefusal = { readonly kind: 'refused'; readonly reason: string };

// One end of a Rope or Spring dragged to a new spot on the same entity (owner, 2026-11-21): the other end
// stays where it is, the joint stays on its end A and its path is drawn again between the two. Each write
// goes through LiveEdit, which the caller begins with `targets` first, and commits with `label`:
// `Move an end of Rope 1`.
export class JointEndMove {
    readonly label: string;
    readonly side: JointEndSide;
    private readonly openLevel: OpenLevel;
    private readonly joint: Entity;
    private readonly type: 'rope' | 'spring';
    private readonly parentMatrix: Matrix2D;
    private readonly parentInverse: Matrix2D;
    private readonly startA: Point;
    private readonly startB: Point;

    private constructor(openLevel: OpenLevel, joint: Entity, side: JointEndSide, parentMatrix: Matrix2D) {
        this.openLevel = openLevel;
        this.joint = joint;
        this.side = side;
        this.parentMatrix = parentMatrix;
        this.parentInverse = parentMatrix.invert() ?? Matrix2D.identity();
        const component = joint.requireComponent(JointComponent);
        this.type = component.get('type') === 'spring' ? 'spring' : 'rope';
        const matrix = openLevel.caches.worldMatrices.matrixOf(joint);
        const ends = component.get('ends');
        this.startA = matrix.apply(ends.a);
        this.startB = matrix.apply(ends.b);
        this.label = `Move an end of ${labelName(joint)}`;
    }

    static of(openLevel: OpenLevel, joint: Entity, side: JointEndSide): JointEndMove | JointEndRefusal {
        if (openLevel.liveEdit.isActive) return { kind: 'refused', reason: 'Not during a drag' };
        if (openLevel.caches.hidden.isLocked(joint)) return { kind: 'refused', reason: "Locked entities don't move" };

        const component = joint.getComponent(JointComponent);
        const isTwoEnded = component !== undefined && component.get('type') !== 'hinge';
        if (!isTwoEnded || !joint.hasComponent(PathComponent)) {
            return { kind: 'refused', reason: 'Only a Rope or a Spring has two ends' };
        }

        const parentMatrix = openLevel.caches.worldMatrices.matrixOf(joint.parent ?? joint);
        if (joint.parent === undefined || parentMatrix.invert() === undefined) {
            return { kind: 'refused', reason: 'Nothing here can move' };
        }

        return new JointEndMove(openLevel, joint, side, parentMatrix);
    }

    get targets(): ValueTarget[] {
        const entityId = this.joint.id;

        return [
            { entityId, schema: TransformComponent.schema, key: 'position' },
            { entityId, schema: JointComponent.schema, key: 'ends' },
            { entityId, schema: PathComponent.schema, key: 'path' },
            { entityId, schema: JointComponent.schema, key: 'length' },
            { entityId, schema: JointComponent.schema, key: 'restLength' },
        ];
    }

    // Where the dragged end was in the level before the drag.
    get startLevelEnd() {
        return this.side === 'a' ? this.startA : this.startB;
    }

    // The dragged end to this level position.
    moveTo(levelEnd: Point) {
        const endA = this.side === 'a' ? levelEnd : this.startA;
        const endB = this.side === 'b' ? levelEnd : this.startB;
        const position = this.parentInverse.apply(endA);
        const transform = this.joint.requireComponent(TransformComponent);
        const ownMatrix = Matrix2D.fromTransform({
            position,
            rotation: transform.get('rotation'),
            scale: transform.get('scale'),
            skew: transform.get('skew'),
        });
        const inverse = this.parentMatrix.multiply(ownMatrix).invert();
        if (inverse === undefined) return;

        // The joint's origin is end A, where it was just put.
        const ends = { a: { x: 0, y: 0 }, b: inverse.apply(endB) };
        const [positionTarget, endsTarget, pathTarget, lengthTarget, restLengthTarget] = this.targets;
        if (positionTarget === undefined || endsTarget === undefined || pathTarget === undefined) return;
        if (lengthTarget === undefined || restLengthTarget === undefined) return;

        const { liveEdit } = this.openLevel;
        liveEdit.update(positionTarget, position);
        liveEdit.update(endsTarget, ends);
        liveEdit.update(pathTarget, jointPathPoints(this.type, ends.a, ends.b));
        // Match drawn distance keeps the shown length equal to the new gap.
        if (this.joint.requireComponent(JointComponent).get('matchDrawnDistance')) {
            liveEdit.update(lengthTarget, drawnLength(ends));
            liveEdit.update(restLengthTarget, drawnLength(ends));
        }
    }
}
