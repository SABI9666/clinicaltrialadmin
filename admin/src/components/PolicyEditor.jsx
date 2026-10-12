import { useRef, useState } from 'react';
import { parseInline, parsePolicy } from '../lib/policyText.js';

/**
 * Editor for long-form formatted text: policies, reports and FAQ answers.
 *
 * The text is stored as plain text with a light markup, so it stays readable
 * in exports and diffs; the toolbar writes that markup for the editor, and the
 * preview renders it with the same parser the public site uses.
 */

function Inline({ text }) {
  return parseInline(text).map((part, i) => {
    switch (part.type) {
      case 'b':
        return <strong key={i}>{part.text}</strong>;
      case 'i':
        return <em key={i}>{part.text}</em>;
      case 'url':
      case 'email':
        return (
          <a key={i} href={part.type === 'email' ? `mailto:${part.text}` : part.text} target="_blank" rel="noreferrer">
            {part.text}
          </a>
        );
      default:
        return part.text;
    }
  });
}

export function PolicyPreview({ title, text }) {
  const blocks = parsePolicy(text);
  return (
    <div className="policy-preview">
      {title && <h2>{title}</h2>}
      {blocks.length === 0 && <p className="hint">Nothing to preview yet.</p>}
      {blocks.map((block, i) => {
        if (block.type === 'h') return <h3 key={i}><Inline text={block.text} /></h3>;
        if (block.type === 'ul') {
          return (
            <ul key={i}>
              {block.items.map((item, j) => (
                <li key={j}><Inline text={item} /></li>
              ))}
            </ul>
          );
        }
        return <p key={i}><Inline text={block.text} /></p>;
      })}
    </div>
  );
}

/** The start and end offsets of the whole lines the selection touches. */
function lineRange(value, start, end) {
  const from = value.lastIndexOf('\n', start - 1) + 1;
  const nl = value.indexOf('\n', end > start && value[end - 1] === '\n' ? end - 1 : end);
  return [from, nl === -1 ? value.length : nl];
}

export default function PolicyEditor({ value, onChange, rows = 22, title }) {
  const ref = useRef(null);
  const [view, setView] = useState('write'); // write | preview
  const text = value ?? '';

  /** Apply an edit and put the selection back where the editor expects it. */
  function commit(next, selStart, selEnd = selStart) {
    onChange(next);
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(selStart, selEnd);
    });
  }

  /** Wrap the selection in a marker, or unwrap it if it is already wrapped. */
  function wrap(marker, placeholder) {
    const el = ref.current;
    const { selectionStart: s, selectionEnd: e } = el;
    const m = marker.length;
    const before = text.slice(s - m, s);
    const after = text.slice(e, e + m);

    if (before === marker && after === marker && e > s) {
      commit(text.slice(0, s - m) + text.slice(s, e) + text.slice(e + m), s - m, e - m);
      return;
    }
    const inner = text.slice(s, e) || placeholder;
    commit(text.slice(0, s) + marker + inner + marker + text.slice(e), s + m, s + m + inner.length);
  }

  /** Toggle a prefix on every line the selection touches. */
  function prefixLines(prefix) {
    const el = ref.current;
    const [from, to] = lineRange(text, el.selectionStart, el.selectionEnd);
    const lines = text.slice(from, to).split('\n');
    const nonEmpty = lines.filter((l) => l.trim());
    const allHave = nonEmpty.length > 0 && nonEmpty.every((l) => l.startsWith(prefix));

    const other = prefix === '## ' ? '- ' : '## ';
    const next = lines
      .map((l) => {
        if (!l.trim()) return l;
        if (allHave) return l.slice(prefix.length);
        const bare = l.startsWith(other) ? l.slice(other.length) : l;
        return prefix + bare;
      })
      .join('\n');

    let result = text.slice(0, from) + next + text.slice(to);
    let end = from + next.length;

    // A heading reads as its own block; give it a blank line either side.
    if (prefix === '## ' && !allHave) {
      const needBefore = from > 0 && text.slice(Math.max(0, from - 2), from) !== '\n\n';
      const needAfter = to < text.length && text.slice(to, to + 2) !== '\n\n';
      if (needAfter) result = result.slice(0, end) + '\n' + result.slice(end);
      if (needBefore) {
        result = result.slice(0, from) + '\n' + result.slice(from);
        end += 1;
        commit(result, from + 1, end);
        return;
      }
    }
    commit(result, from, end);
  }

  function onKeyDown(e) {
    if (!(e.ctrlKey || e.metaKey)) return;
    const key = e.key.toLowerCase();
    if (key === 'b') {
      e.preventDefault();
      wrap('**', 'bold text');
    } else if (key === 'i') {
      e.preventDefault();
      wrap('*', 'italic text');
    }
  }

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <div className="policy-editor">
      <div className="policy-toolbar" role="toolbar" aria-label="Formatting">
        <div className="policy-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={view === 'write'}
            onClick={() => setView('write')}
          >
            Write
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'preview'}
            onClick={() => setView('preview')}
          >
            Preview
          </button>
        </div>

        {view === 'write' && (
          <div className="policy-tools">
            <button type="button" onClick={() => prefixLines('## ')} title="Heading">
              Heading
            </button>
            <button type="button" onClick={() => prefixLines('- ')} title="Bullet list">
              • List
            </button>
            <button type="button" onClick={() => wrap('**', 'bold text')} title="Bold (Ctrl+B)">
              <strong>B</strong>
            </button>
            <button type="button" onClick={() => wrap('*', 'italic text')} title="Italic (Ctrl+I)">
              <em>I</em>
            </button>
          </div>
        )}
      </div>

      {view === 'write' ? (
        <textarea
          ref={ref}
          className="policy-textarea"
          rows={rows}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          spellCheck
        />
      ) : (
        <PolicyPreview title={title} text={text} />
      )}

      <div className="policy-footer">
        <span>
          Select text, then use the buttons above. Leave a blank line between paragraphs. Web and
          email addresses become links automatically.
        </span>
        <span>{words.toLocaleString()} words</span>
      </div>
    </div>
  );
}
