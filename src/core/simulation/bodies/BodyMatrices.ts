import { Matrix2D } from '../../geometry/index.ts';
import type { BodyMatrixSource } from '../../derived/index.ts';
import type { EntityId } from '../../fields/index.ts';
import type { Entity } from '../../level/index.ts';
import type { BodyPoses, SceneBody } from '../../physics/index.ts';

const NO_SCALE = { x: 1, y: 1 };

// An entity that isn't a body but moves with one during play: a joint, with its A's body.
type Follower = {
    readonly body: Entity;
    readonly rest: Matrix2D;
};

// The play copy's body matrices: each body entity's level matrix is its current pose times the rest
// split off at the start, so children follow the body through WorldMatrixCache as usual. A joint entity
// follows its A's body the same way, with a rest of its own.
export class BodyMatrices implements BodyMatrixSource {
    private readonly poses: BodyPoses;
    private readonly bodiesByEntity = new Map<Entity, SceneBody>();
    private readonly entitiesById = new Map<EntityId, Entity>();
    private readonly followersByEntity = new Map<Entity, Follower>();
    private readonly followersByBody = new Map<Entity, Entity[]>();

    constructor(poses: BodyPoses) {
        this.poses = poses;
    }

    add(body: SceneBody) {
        this.bodiesByEntity.set(body.entity, body);
        this.entitiesById.set(body.entity.id, body.entity);
    }

    // From now on the entity keeps the place against the body that its level matrix gives it now.
    addFollower(entity: Entity, body: Entity, levelMatrix: Matrix2D) {
        const bodyPose = this.poseMatrixOf(body);
        if (bodyPose === undefined) throw new Error(`Entity ${body.id} is not a body in this run.`);

        const fromBody = bodyPose.invert();
        if (fromBody === undefined) throw new Error('A pose without scale always inverts.');

        const rest = fromBody.multiply(levelMatrix);
        this.followersByEntity.set(entity, { body, rest });

        const followers = this.followersByBody.get(body) ?? [];
        followers.push(entity);
        this.followersByBody.set(body, followers);
    }

    // The entities moving with the body, which are stale whenever it moves.
    followersOf(body: Entity): readonly Entity[] {
        return this.followersByBody.get(body) ?? [];
    }

    // Forgets the entity's body or the body it follows, and gives back its body; undefined when it had none.
    // The caller destroys the body.
    remove(entity: Entity) {
        this.removeFollower(entity);

        const body = this.bodiesByEntity.get(entity);
        if (body === undefined) return undefined;

        this.bodiesByEntity.delete(entity);
        this.entitiesById.delete(entity.id);

        return body;
    }

    // The body built for the entity itself, or undefined when it isn't one in this run.
    bodyOf(entity: Entity) {
        return this.bodiesByEntity.get(entity);
    }

    entityOf(id: EntityId) {
        return this.entitiesById.get(id);
    }

    matrixOf(entity: Entity) {
        const follower = this.followersByEntity.get(entity);
        if (follower !== undefined) {
            const bodyPose = this.poseMatrixOf(follower.body);
            return bodyPose?.multiply(follower.rest);
        }

        const rest = this.bodiesByEntity.get(entity)?.rest;
        if (rest === undefined) return undefined;

        const pose = this.poseMatrixOf(entity);

        return pose?.multiply(rest);
    }

    // The body's current pose as a matrix, from its space to level positions, without its rest.
    poseMatrixOf(body: Entity) {
        const pose = this.poses.poseOf(body.id);
        if (pose === undefined) return undefined;
        if (!this.bodiesByEntity.has(body)) return undefined;

        const position = { x: pose.x, y: pose.y };

        return Matrix2D.fromTransform({ position, rotation: pose.angle, scale: NO_SCALE, skew: 0 });
    }

    private removeFollower(entity: Entity) {
        const follower = this.followersByEntity.get(entity);
        if (follower === undefined) return;

        this.followersByEntity.delete(entity);
        const followers = this.followersByBody.get(follower.body) ?? [];
        const left = followers.filter((other) => other !== entity);
        this.followersByBody.set(follower.body, left);
    }
}
