import { MainMenu } from '../../main-menu/index.ts';
import { GridSnapping } from './GridSnapping/index.ts';
import { HelpButton } from './HelpButton/index.ts';
import { LevelName } from './LevelName/index.ts';
import { PlayButton } from './PlayButton/index.ts';
import { SaveStateButton } from './SaveStateButton/index.ts';
import { UndoRedo } from './UndoRedo/index.ts';
import { ViewMenu } from './ViewMenu/index.ts';
import { Zoom } from './Zoom/index.ts';
import './TopBar.css';

// Left to right as the requirement lists it, with Play in the middle.
export function TopBar() {
    return (
        <div className="top-bar">
            <MainMenu />
            <LevelName />
            <SaveStateButton />
            <span className="separator" />
            <UndoRedo />
            <span className="separator" />
            <GridSnapping />
            <span className="grow" />
            <PlayButton />
            <span className="grow" />
            <ViewMenu />
            <Zoom />
            <HelpButton />
        </div>
    );
}
