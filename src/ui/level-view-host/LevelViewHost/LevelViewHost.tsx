import { useEffect, useRef } from 'react';
import { useLevelViewMount } from '../LevelViewMountContext.ts';
import './LevelViewHost.css';

// The box the level view's canvas lives in. React mounts it once and never renders inside it.
export function LevelViewHost() {
    const levelView = useLevelViewMount();
    const hostRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const host = hostRef.current;
        if (!host) return;

        levelView.mount(host);

        return () => levelView.unmount();
    }, [levelView]);

    return <div className="level-view-host" ref={hostRef} data-focus-place="level" />;
}
