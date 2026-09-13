import type { ReactNode } from "react";

interface FieldProps {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number | null;
  placeholder?: string;
  required?: boolean;
  step?: string;
  className?: string;
  children?: ReactNode;
  hint?: string;
}

/** Campo de formulario com label. Passe `children` para usar select/textarea custom. */
export function Field({
  label,
  name,
  type = "text",
  defaultValue,
  placeholder,
  required,
  step,
  className = "",
  children,
  hint,
}: FieldProps) {
  return (
    <div className={className}>
      <label className="label" htmlFor={name}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children ?? (
        <input
          id={name}
          name={name}
          type={type}
          step={step}
          required={required}
          placeholder={placeholder}
          defaultValue={defaultValue ?? undefined}
          className="input"
        />
      )}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function SelectField({
  label,
  name,
  defaultValue,
  required,
  options,
  className = "",
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <Field label={label} name={name} required={required} className={className}>
      <select
        id={name}
        name={name}
        required={required}
        defaultValue={defaultValue ?? options[0]?.value}
        className="input"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}
