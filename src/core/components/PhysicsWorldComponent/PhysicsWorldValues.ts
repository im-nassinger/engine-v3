export type GravityDirection = 'down' | 'up' | 'left' | 'right' | 'custom';

// Strength and direction are kept apart, so zero gravity keeps its direction for when the strength returns.
export type PhysicsWorldValues = {
    gravityStrength: number;
    gravityDirection: GravityDirection;
    gravityAngle: number;
    walls: boolean;
};
