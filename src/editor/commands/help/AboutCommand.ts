import { CURRENT_FORMAT_VERSION, PhysicsVersions } from '../../../core/level-data/index.ts';
import type { Availability, CommandOutcome, EditorCommand } from '../EditorCommand.ts';

export const GAME_NAME = 'engine-v3';

// Help's only v1 entry: a notice naming the game and the versions a level file it saves records.
export class AboutCommand implements EditorCommand {
    readonly id = 'help.about';
    readonly label = 'About';
    readonly menu = { menu: 'Help', section: 1, order: 10 } as const;
    readonly shortcuts = [];

    availability(): Availability {
        return { enabled: true };
    }

    run(): CommandOutcome {
        const physicsText = physicsVersionText();
        const lines = [GAME_NAME, `Level file format version ${CURRENT_FORMAT_VERSION}`, physicsText];
        const text = lines.join('\n');

        return { kind: 'notice', notice: { title: `About ${GAME_NAME}`, text } };
    }
}

function physicsVersionText() {
    const physicsVersion = PhysicsVersions.current;
    const build = PhysicsVersions.buildOf(physicsVersion);
    if (build === undefined) return `Physics version ${physicsVersion}`;

    return `Physics version ${physicsVersion} (Box2D ${build.box2dVersion})`;
}
