import { LevelName } from '../LevelName/index.ts';
import { SaveStateButton } from '../SaveStateButton/index.ts';
import './LevelFile.css';

// The level's name and its save state, in an island of their own until stage 19 step 12 removes them.
export function LevelFile() {
    return (
        <div className="level-file">
            <LevelName />
            <SaveStateButton />
        </div>
    );
}
