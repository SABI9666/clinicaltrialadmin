/**
 * Renders a schema's fields, split into the numbered panels its `groups`
 * describe. A schema without groups falls back to one plain list, so only the
 * long forms pay for the extra structure.
 */
import Field from './Fields.jsx';

export default function FieldGroups({ schema, value, onChange, ctx }) {
  const render = (field) => (
    <Field
      key={field.key}
      field={field}
      ctx={ctx}
      value={value[field.key]}
      onChange={(v) => onChange(field.key, v)}
    />
  );

  if (!schema.groups) {
    return <div className="editor">{schema.fields.map(render)}</div>;
  }

  const byKey = Object.fromEntries(schema.fields.map((f) => [f.key, f]));
  const grouped = new Set(schema.groups.flatMap((g) => g.keys));
  const leftovers = schema.fields.filter((f) => !grouped.has(f.key));

  return (
    <div className="editor">
      {schema.groups.map((group, i) => (
        <section className="panel" key={group.title}>
          <header className="panel-head">
            <span className="panel-number" aria-hidden="true">
              {i + 1}
            </span>
            <div>
              <h3 className="panel-title">{group.title}</h3>
              {group.blurb && <p className="hint">{group.blurb}</p>}
            </div>
          </header>
          <div className="panel-body">
            {group.keys.filter((k) => byKey[k]).map((k) => render(byKey[k]))}
          </div>
        </section>
      ))}

      {leftovers.length > 0 && (
        <section className="panel">
          <header className="panel-head">
            <span className="panel-number" aria-hidden="true">
              {schema.groups.length + 1}
            </span>
            <div>
              <h3 className="panel-title">Everything else</h3>
            </div>
          </header>
          <div className="panel-body">{leftovers.map(render)}</div>
        </section>
      )}
    </div>
  );
}
