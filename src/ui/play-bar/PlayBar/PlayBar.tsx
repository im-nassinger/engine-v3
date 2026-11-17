import { Pause, Play, Square, StepForward } from 'lucide-react';
import type { MouseEvent } from 'react';
import type { PlayState } from '../../../editor/play/index.ts';
import { useReading, useVersion } from '../../hooks/index.ts';
import { usePlaySession } from '../../play/index.ts';
import { PlayBarButton } from './PlayBarButton/index.ts';
import './PlayBar.css';

const PAUSE_OR_RESUME = 'play.pauseOrResume';
const STEP = 'play.step';
const PLAY_OR_STOP = 'play.playOrStop';

const STATE_LABELS: Record<PlayState, string> = {
    idle: '',
    starting: 'STARTING',
    playing: 'PLAYING',
    paused: 'PAUSED',
    ended: 'ENDED',
};

// The keyboard stays where it was, so Space or Enter held for the game never presses a Play bar button.
function keepFocus(event: MouseEvent) {
    event.preventDefault();
}

// Floats at the top centre during test play: a coloured frame, the state's label with a dot, Pause or
// Resume, Step and Stop with their keys, and under them one message: why the run ended, "The game isn't
// responding", or a hint such as "Stop to edit". Clicking it takes the keyboard from the game, so every
// key held is let go, and the run goes on.
export function PlayBar() {
    // The state and the messages are read from the same session object each time it moves, so the React
    // Compiler must not keep an old answer.
    'use no memo';

    const play = usePlaySession();
    useVersion(play.version);
    const readHint = () => play.hint.current ?? '';
    const hint = useReading(play.hint.version, readHint);

    const state = play.state;
    const message = play.endedMessage ?? play.notice ?? hint;
    const pauseIcon = state === 'paused' ? Play : Pause;

    return (
        <div
            className="play-bar"
            data-state={state}
            role="toolbar"
            aria-label="Play bar"
            onPointerDown={() => play.releaseKeys()}
            onMouseDown={keepFocus}
        >
            <div className="controls">
                <span className="state-label">
                    <span className="dot" />
                    {STATE_LABELS[state]}
                </span>
                <PlayBarButton commandId={PAUSE_OR_RESUME} icon={pauseIcon} />
                <PlayBarButton commandId={STEP} icon={StepForward} />
                <PlayBarButton commandId={PLAY_OR_STOP} icon={Square} />
            </div>
            {message !== '' && (
                <p className="message" role="status">
                    {message}
                </p>
            )}
        </div>
    );
}
