import { useEffect, useId, useRef } from 'react';
import { runTimeText } from '../../../editor/play/index.ts';
import { useVersion } from '../../hooks/index.ts';
import { Button } from '../../shared/index.ts';
import { usePlaySession } from '../../play/index.ts';
import './EndWindow.css';

const TITLES = { won: 'Level won', lost: 'Level lost' };

// Over the last frame once a Win or Lose ended the run: the title, the run's time, Leave, which is Stop,
// and Restart, the primary button, which takes the focus. A level can't hide or change it.
export function EndWindow() {
    // The outcome is read from the same session object each time it moves, so the React Compiler must not
    // keep an old answer.
    'use no memo';

    const play = usePlaySession();
    useVersion(play.version);
    const titleId = useId();
    const buttonsRef = useRef<HTMLDivElement>(null);
    const outcome = play.outcome;

    useEffect(() => {
        buttonsRef.current?.querySelector<HTMLElement>('.button[data-variant="primary"]')?.focus();
    }, [outcome]);

    if (outcome === undefined) return null;

    const time = runTimeText(outcome.tick);

    return (
        <div className="end-window">
            <div className="box" role="dialog" aria-modal="true" aria-labelledby={titleId}>
                <h2 id={titleId}>{TITLES[outcome.kind]}</h2>
                <p className="time">
                    Time <b>{time}</b>
                </p>
                <div className="buttons" ref={buttonsRef}>
                    <Button label="Leave" onClick={() => play.stop()} />
                    <Button label="Restart" variant="primary" onClick={() => play.restart()} />
                </div>
            </div>
        </div>
    );
}
