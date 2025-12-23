import { resolveFieldSchema, type Schema } from "~/models/base_schema_types";

export function FieldRenderer({
    schema,
    path,
    value,
    onChange
}: {
    schema: Schema;
    path: (string | number)[];
    value: any;
    onChange: (value: any) => void;
}) {
    const fieldSchema = resolveFieldSchema(schema, path, value);
    return renderFieldNode(fieldSchema, value, onChange, schema, path);
}

function renderFieldNode(
    schema: Schema,
    value: any,
    onChange: (value: any) => void,
    rootSchema: Schema,
    rootPath: (string | number)[]
) {
    // UNION
    if (schema.type === "union") {
        // pick variant based on value if possible
        const variant = schema.variants.find(
            v => value?.[v.discriminator] === v.value
        ) || schema.variants[0];

        return renderFieldNode(variant, value, onChange, rootSchema, rootPath);
    }

    // OBJECT
    if (schema.type === "object") {
        return (
            <div>
                {schema.label && <h3>{schema.label}</h3>}
                <div style={{ paddingLeft: "1rem", borderLeft: "2px solid #ccc" }}>
                    {Object.entries(schema.fields).map(([fieldName, fieldSchema]) => (
                        <FieldRenderer
                            key={fieldName}
                            schema={rootSchema}
                            path={[...rootPath, fieldName]}
                            value={value?.[fieldName]}
                            onChange={(newValue) => {
                                onChange({ ...value, [fieldName]: newValue });
                            }}
                        />
                    ))}
                </div>
            </div>
        );
    }

    // ARRAY
    if (schema.type === "array") {
        const arrayValue = Array.isArray(value) ? value : [];
        return (
            <div>
                {schema.label && <h3>{schema.label}</h3>}
                <div style={{ paddingLeft: "1rem" }}>
                    {arrayValue.map((item, index) => (
                        <div key={index} style={{ marginBottom: "1rem", border: "1px solid #ddd", padding: "0.5rem" }}>
                            <FieldRenderer
                                schema={rootSchema}
                                path={[...rootPath, index]}
                                value={item}
                                onChange={(newValue) => {
                                    const newArray = [...arrayValue];
                                    newArray[index] = newValue;
                                    onChange(newArray);
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    const newArray = arrayValue.filter((_, i) => i !== index);
                                    onChange(newArray);
                                }}
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={() => {
                            onChange([...arrayValue, undefined]);
                        }}
                    >
                        Add Item
                    </button>
                </div>
            </div>
        );
    }

    // NUMBER
    if (schema.type === "number") {
        return (
            <div>
                <label>{schema.label}</label>
                <input
                    type="number"
                    value={value ?? ""}
                    onChange={e => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                />
            </div>
        );
    }

    // DATE
    if (schema.type === "date") {
        const today = new Date().toISOString().split('T')[0];
        const maxDate = schema.validation?.maxDate || (schema.validation?.allow_future !== true ? today : undefined);
        const hasError = schema.validation && (
            (schema.validation.required && !value) ||
            (schema.validation.minDate && value && value < schema.validation.minDate) ||
            (maxDate && value && value > maxDate)
        );

        return (
            <div>
                <label>{schema.label}</label>
                <input
                    type="date"
                    value={value || ""}
                    onChange={e => onChange(e.target.value || undefined)}
                    className={hasError ? "error" : ""}
                    required={schema.validation?.required}
                    min={schema.validation?.minDate}
                    max={maxDate}
                />
                {hasError && (
                    <div className="error-message">
                        {!value && schema.validation?.required && `${schema.label} is required`}
                        {value && schema.validation?.minDate && value < schema.validation.minDate &&
                            `Date must be on or after ${schema.validation.minDate}`}
                        {value && maxDate && value > maxDate &&
                            `Date must be on or before ${maxDate}`}
                    </div>
                )}
            </div>
        );
    }

    // DATETIME
    if (schema.type === "datetime") {
        const now = new Date();
        const todayDate = now.toISOString().split('T')[0];
        const todayTime = now.toTimeString().split(' ')[0];
        const today = `${todayDate} ${todayTime}`;
        const maxDate = schema.validation?.maxDate || (schema.validation?.allow_future !== true ? today : undefined);
        const hasError = schema.validation && (
            (schema.validation.required && !value) ||
            (schema.validation.minDate && value && value < schema.validation.minDate) ||
            (maxDate && value && value > maxDate)
        );

        // Convert YYYY-MM-DD HH:MM:SS to datetime-local format (YYYY-MM-DDTHH:MM)
        const datetimeLocalValue = value 
            ? value.replace(' ', 'T').substring(0, 16) 
            : "";

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const localValue = e.target.value;
            if (!localValue) {
                onChange(undefined);
                return;
            }
            // Convert datetime-local format (YYYY-MM-DDTHH:MM or YYYY-MM-DDTHH:MM:SS) to YYYY-MM-DD HH:MM:SS
            // datetime-local typically returns YYYY-MM-DDTHH:MM, so we append :00 for seconds
            const normalized = localValue.replace('T', ' ');
            const dateTime = normalized.length === 16 
                ? normalized + ':00'  // Add seconds if not present
                : normalized.substring(0, 19); // Truncate to HH:MM:SS if seconds present
            onChange(dateTime);
        };

        return (
            <div>
                <label>{schema.label}</label>
                <input
                    type="datetime-local"
                    value={datetimeLocalValue}
                    onChange={handleChange}
                    className={hasError ? "error" : ""}
                    required={schema.validation?.required}
                    min={schema.validation?.minDate ? schema.validation.minDate.replace(' ', 'T').substring(0, 16) : undefined}
                    max={maxDate ? maxDate.replace(' ', 'T').substring(0, 16) : undefined}
                />
                {hasError && (
                    <div className="error-message">
                        {!value && schema.validation?.required && `${schema.label} is required`}
                        {value && schema.validation?.minDate && value < schema.validation.minDate &&
                            `DateTime must be on or after ${schema.validation.minDate}`}
                        {value && maxDate && value > maxDate &&
                            `DateTime must be on or before ${maxDate}`}
                    </div>
                )}
            </div>
        );
    }

    // BASIC RENDERERS
    switch (schema.type) {
        case "string": {
            const hasError = schema.validation && (
                (schema.validation.required && !value) ||
                (schema.validation.minLength !== undefined && value && value.length < schema.validation.minLength) ||
                (schema.validation.maxLength !== undefined && value && value.length > schema.validation.maxLength) ||
                (schema.validation.pattern && value && !new RegExp(schema.validation.pattern).test(value))
            );

            return (
                <div>
                    <label>{schema.label}</label>
                    <input
                        value={value || ""}
                        onChange={e => onChange(e.target.value || undefined)}
                        className={hasError ? "error" : ""}
                        required={schema.validation?.required}
                        minLength={schema.validation?.minLength}
                        maxLength={schema.validation?.maxLength}
                        pattern={schema.validation?.pattern?.toString().replace(/^\/|\/[gimuy]*$/g, '')}
                    />
                    {hasError && (
                        <div className="error-message">
                            {!value && schema.validation?.required && `${schema.label} is required`}
                            {value && schema.validation?.minLength && value.length < schema.validation.minLength &&
                                `Must be at least ${schema.validation.minLength} characters`}
                            {value && schema.validation?.maxLength && value.length > schema.validation.maxLength &&
                                `Must be at most ${schema.validation.maxLength} characters`}
                            {value && schema.validation?.pattern && !new RegExp(schema.validation.pattern).test(value) &&
                                `Invalid format`}
                        </div>
                    )}
                </div>
            );
        }

        case "boolean":
            return (
                <div>
                    <label>{schema.label}</label>
                    <input
                        type="checkbox"
                        checked={value || false}
                        onChange={e => onChange(e.target.checked)}
                    />
                </div>
            );

        case "enum":
            return (
                <div>
                    <label>{schema.label}</label>
                    <select
                        value={value || ""}
                        onChange={e => onChange(e.target.value)}
                    >
                        <option value="" disabled>Select…</option>
                        {Object.entries(schema.options).map(([k, v]) => (
                            <option key={k} value={k}>
                                {v}
                            </option>
                        ))}
                    </select>
                </div>
            );

        default:
            return <div>Cannot render: {(schema as any).type}</div>;
    }
}
