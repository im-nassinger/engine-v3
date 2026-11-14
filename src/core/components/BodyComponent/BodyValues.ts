export type BodyType = 'static' | 'dynamic' | 'kinematic';

export type BodyValues = {
    type: BodyType;
    gravityScale: number;
    linearDamping: number;
    angularDamping: number;
    fixedRotation: boolean;
    bullet: boolean;
    merge: boolean;
};
