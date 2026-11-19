import { useEffect, useRef } from 'react';
import { useMinimapMount } from '../MinimapMountContext.ts';
import './Minimap.css';

// The box the minimap's canvas lives in, inside the island's 3 px edge. It only shows: moving the view with it
// is v3.
export function Minimap() {
    const minimap = useMinimapMount();
    const pictureRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const picture = pictureRef.current;
        if (!picture) return;

        minimap.mount(picture);

        return () => minimap.unmount();
    }, [minimap]);

    return (
        <div className="minimap">
            <div className="picture" ref={pictureRef} />
        </div>
    );
}
