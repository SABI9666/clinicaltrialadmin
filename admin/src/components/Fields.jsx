import { useState } from 'react';
import { mediaUrl } from '../lib/api.js';
import MediaPicker from './MediaPicker.jsx';
import { OptionPicker, StatePicker } from './TaxonomyField.jsx';

/* Immutable helpers so edits never mutate the loaded document in place. */
const replaceAt = (arr, i, v) => arr.map((item, idx) => (idx === i ? v : item));
const removeAt = (arr, i) => arr.filter((_, idx) => idx !== i);
const moveItem = (arr, from, to) => {
  if (to < 0 || to >= arr.length) return arr;
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

function RowControls({ index, length, onMove, onRemove }) {
  return (
    <div className="row-controls">
      <button type="button" onClick={() => onMove(index, index - 1)} disabled={index === 0} title="Move up">
        ↑
      </button>
      <button
        type="button"
        onClick={() => onMove(index, index + 1)}
        disabled={index === length - 1}
        title="Move down"
      >
        ↓
      </button>
      <button type="button" className="danger" onClick={() => onRemove(index)} title="Remove">
        ✕
      </button>
    </div>
  );
}

/* ------------------------------ list fields ------------------------------ */

function StringList({ value = [], onChange, multiline = false, hint }) {
  const items = Array.isArray(value) ? value : [];
  const Input = multiline ? 'textarea' : 'input';

  return (
    <div className="list-field">
      {hint && <p className="hint">{hint}</p>}
      {items.map((item, i) => (
        <div className="list-row" key={i}>
          <Input
            value={item ?? ''}
            rows={multiline ? 3 : undefined}
            onChange={(e) => onChange(replaceAt(items, i, e.target.value))}
          />
          <RowControls
            index={i}
            length={items.length}
            onMove={(from, to) => onChange(moveItem(items, from, to))}
            onRemove={(idx) => onChange(removeAt(items, idx))}
          />
        </div>
      ))}
      <button type="button" className="add" onClick={() => onChange([...items, ''])}>
        + Add
      </button>
    </div>
  );
}

function ObjectList({ value = [], onChange, fields, itemLabel = 'Item', ctx }) {
  const items = Array.isArray(value) ? value : [];
  const blank = Object.fromEntries(fields.map((f) => [f.key, f.type === 'boolean' ? false : '']));

  return (
    <div className="list-field">
      {items.map((item, i) => (
        <div className="object-row" key={i}>
          <div className="object-row-head">
            <strong>
              {itemLabel} {i + 1}
            </strong>
            <RowControls
              index={i}
              length={items.length}
              onMove={(from, to) => onChange(moveItem(items, from, to))}
              onRemove={(idx) => onChange(removeAt(items, idx))}
            />
          </div>
          <div className="object-row-body">
            {fields.map((field) => (
              <Field
                key={field.key}
                field={field}
                ctx={ctx}
                value={item?.[field.key]}
                onChange={(v) => onChange(replaceAt(items, i, { ...item, [field.key]: v }))}
              />
            ))}
          </div>
        </div>
      ))}
      <button type="button" className="add" onClick={() => onChange([...items, { ...blank }])}>
        + Add {itemLabel.toLowerCase()}
      </button>
    </div>
  );
}

/** Countries, each with its own list of states — the trial search filters. */
function CountryList({ value = [], onChange }) {
  const items = Array.isArray(value) ? value : [];

  return (
    <div className="list-field">
      {items.map((country, i) => (
        <div className="object-row" key={i}>
          <div className="object-row-head">
            <strong>{country?.name || `Country ${i + 1}`}</strong>
            <RowControls
              index={i}
              length={items.length}
              onMove={(from, to) => onChange(moveItem(items, from, to))}
              onRemove={(idx) => onChange(removeAt(items, idx))}
            />
          </div>
          <div className="object-row-body">
            <label className="field">
              <span className="field-label">Country name</span>
              <input
                value={country?.name ?? ''}
                onChange={(e) => onChange(replaceAt(items, i, { ...country, name: e.target.value }))}
              />
            </label>
            <div className="field">
              <span className="field-label">States / territories in this country</span>
              <StringList
                value={country?.states ?? []}
                hint={`These appear in the site's "State / territory" dropdown once this country is chosen.`}
                onChange={(states) => onChange(replaceAt(items, i, { ...country, states }))}
              />
            </div>
          </div>
        </div>
      ))}
      <button type="button" className="add" onClick={() => onChange([...items, { name: '', states: [] }])}>
        + Add country
      </button>
    </div>
  );
}

/* ----------------------------- image + cta ------------------------------- */

function ImageField({ value = {}, onChange }) {
  const [picking, setPicking] = useState(false);
  const src = value?.src ?? '';

  return (
    <div className="image-field">
      <div className="image-preview">
        {src ? (
          <img src={mediaUrl(src)} alt={value?.alt ?? ''} />
        ) : (
          <span className="image-empty">No image</span>
        )}
      </div>

      <div className="image-controls">
        <label className="field">
          <span className="field-label">Image path or URL</span>
          <input
            value={src}
            placeholder="/media/example.jpg"
            onChange={(e) => onChange({ ...value, src: e.target.value })}
          />
        </label>

        <label className="field">
          <span className="field-label">Alt text</span>
          <input
            value={value?.alt ?? ''}
            placeholder="Describe the image for screen readers"
            onChange={(e) => onChange({ ...value, alt: e.target.value })}
          />
        </label>

        <div className="image-actions">
          <button type="button" onClick={() => setPicking(true)}>
            Choose or upload…
          </button>
          {src && (
            <button type="button" className="danger" onClick={() => onChange({ src: '', alt: '' })}>
              Clear
            </button>
          )}
        </div>
      </div>

      {picking && (
        <MediaPicker
          onClose={() => setPicking(false)}
          onSelect={(item) => {
            // A picked upload replaces both files, so drop any stale WebP
            // variant that belonged to the previous image.
            onChange({ src: item.url, alt: item.alt || value?.alt || '', webp: undefined });
            setPicking(false);
          }}
        />
      )}
    </div>
  );
}

function CtaField({ value = {}, onChange }) {
  return (
    <div className="cta-field">
      <label className="field">
        <span className="field-label">Label</span>
        <input
          value={value?.label ?? ''}
          onChange={(e) => onChange({ ...value, label: e.target.value })}
        />
      </label>
      <label className="field">
        <span className="field-label">Target</span>
        <input
          value={value?.href ?? ''}
          placeholder="#trials"
          onChange={(e) => onChange({ ...value, href: e.target.value })}
        />
      </label>
    </div>
  );
}

/* -------------------------------- Field ---------------------------------- */

export default function Field({ field, value, onChange, ctx }) {
  const { type, label, hint, rows, required } = field;

  if (type === 'group') {
    return (
      <fieldset className="group">
        <legend>{label}</legend>
        {field.blurb && <p className="hint group-blurb">{field.blurb}</p>}
        {field.fields.map((sub) => (
          <Field
            key={sub.key}
            field={sub}
            ctx={ctx}
            value={value?.[sub.key]}
            onChange={(v) => onChange({ ...(value ?? {}), [sub.key]: v })}
          />
        ))}
      </fieldset>
    );
  }

  if (type === 'boolean') {
    return (
      <label className="field field-inline">
        <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
        <span className="field-label">{label}</span>
      </label>
    );
  }

  const body = (() => {
    switch (type) {
      case 'textarea':
        return (
          <textarea rows={rows ?? 4} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
        );
      case 'number':
        return (
          <input
            type="number"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          />
        );
      case 'stringList':
        return <StringList value={value} onChange={onChange} hint={hint} />;
      case 'textList':
        return <StringList value={value} onChange={onChange} multiline hint={hint} />;
      case 'objectList':
        return (
          <ObjectList
            value={value}
            onChange={onChange}
            fields={field.fields}
            itemLabel={field.itemLabel}
            ctx={ctx}
          />
        );
      case 'taxonomy':
        return (
          <OptionPicker field={field} value={value} onChange={onChange} notify={ctx?.notify} />
        );
      case 'taxonomyStates':
        return (
          <StatePicker
            value={value}
            onChange={onChange}
            record={ctx?.record}
            notify={ctx?.notify}
          />
        );
      case 'countryList':
        return <CountryList value={value} onChange={onChange} />;
      case 'image':
        return <ImageField value={value} onChange={onChange} />;
      case 'cta':
        return <CtaField value={value} onChange={onChange} />;
      default:
        return <input value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
    }
  })();

  const simple = ['text', 'textarea', 'number'].includes(type);
  const Wrapper = simple ? 'label' : 'div';

  return (
    <Wrapper className="field">
      <span className="field-label">
        {label}
        {required && <em className="req"> *</em>}
      </span>
      {body}
      {hint && !['stringList', 'textList'].includes(type) && <p className="hint">{hint}</p>}
    </Wrapper>
  );
}
