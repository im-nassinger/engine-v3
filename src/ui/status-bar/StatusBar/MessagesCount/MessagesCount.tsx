import { TriangleAlert } from 'lucide-react';
import { messagesCount } from '../../../../editor/status/index.ts';
import type { OpenLevel } from '../../../../editor/session/index.ts';
import { useReading } from '../../../hooks/index.ts';
import { Icon, MenuButton } from '../../../shared/index.ts';
import { MessagesMenu } from './MessagesMenu/index.ts';
import './MessagesCount.css';

export type MessagesCountProps = {
    openLevel: OpenLevel;
};

// `2 warnings` at the right of the status bar, hidden at none. It opens the list of every message.
export function MessagesCount({ openLevel }: MessagesCountProps) {
    const messages = openLevel.messages;
    const readCount = () => messagesCount(messages.all());
    const count = useReading(messages.version, readCount);
    if (count === '') return null;

    const menu = <MessagesMenu openLevel={openLevel} />;

    return (
        <span className="messages-count">
            <MenuButton label={`Editor messages: ${count}`} menu={menu} look="status">
                <Icon icon={TriangleAlert} size="small" />
                {count}
            </MenuButton>
        </span>
    );
}
