import { useCommands } from '../../commands/index.ts';
import { useVersion } from '../../hooks/index.ts';
import { DialogBox } from './DialogBox/index.ts';
import { TextDialog } from './TextDialog/index.ts';

// The one open question, text request or notice of CommandRunner. A go-ahead button answers it; Cancel, a
// notice's OK and Esc close it and change nothing.
export function Dialogs() {
    const { runner } = useCommands();
    useVersion(runner.dialog.version);

    const dialog = runner.dialog.current;
    if (dialog === undefined) return null;

    const close = () => runner.closeDialog();

    if (dialog.kind === 'notice') {
        const notice = dialog.notice;

        return (
            <DialogBox title={notice.title} text={notice.text} confirmLabel="OK" onConfirm={close} onClose={close} />
        );
    }

    if (dialog.kind === 'textRequest') {
        const submit = (text: string) => runner.submitDialogText(text);

        return <TextDialog request={dialog.request} onSubmit={submit} onClose={close} />;
    }

    const question = dialog.question;
    const confirm = () => runner.confirmDialog();

    return (
        <DialogBox
            title={question.title}
            text={question.text}
            confirmLabel={question.confirmLabel}
            cancelLabel={question.cancelLabel ?? 'Cancel'}
            onConfirm={confirm}
            onClose={close}
        />
    );
}
