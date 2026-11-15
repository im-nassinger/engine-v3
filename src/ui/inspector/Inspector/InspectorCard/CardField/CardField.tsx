import type { FieldModel } from '../../../../../editor/inspector/index.ts';
import { Tooltip } from '../../../../shared/index.ts';
import './CardField.css';

export type CardFieldProps = {
    field: FieldModel;
};

// One field's row: its label, whose hover shows the description, and the place its control goes. The
// controls for each field type come with the fields in ui/fields; until then the place stays empty.
export function CardField({ field }: CardFieldProps) {
    const { key, label, description } = field.definition;

    return (
        <div className="card-field" data-key={key} data-enabled={field.isEnabled}>
            <Tooltip label={description} isLong>
                <span className="label">{label}</span>
            </Tooltip>
            <span className="control" />
        </div>
    );
}
