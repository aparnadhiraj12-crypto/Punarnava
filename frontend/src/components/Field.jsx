// components/Field.jsx - labelled text input, matching the redesign's .field style.
export default function Field({ label, error, children, ...rest }) {
  if (children) {
    // Used for <select> children, which need the same wrapper/label chrome.
    return (
      <label className="field">
        <span>{label}</span>
        {children}
        {error && <small>{error}</small>}
      </label>
    );
  }
  return (
    <label className="field">
      <span>{label}</span>
      <input className={error ? "input-error" : ""} {...rest} />
      {error && <small>{error}</small>}
    </label>
  );
}

export function SelectField({ label, value, onChange, options, ...rest }) {
  return (
    <Field label={label}>
      <select value={value} onChange={onChange} {...rest}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </Field>
  );
}
