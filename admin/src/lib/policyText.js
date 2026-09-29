/**
 * The light markup policies are written in, shared with the public site's
 * policy pop-up so the admin preview matches what visitors see.
 *
 *   ## Heading          a line starting "## "
 *   - List item         consecutive lines starting "- "
 *   **bold**  *italic*  inline
 *   blank line          ends a paragraph
 *
 * Web and email addresses are turned into links when rendered.
 *
 * Keep in step with src/lib/policyText.js in the frontend repository.
 */

/** Parse policy text into blocks: { type: 'h' | 'p' | 'ul', text | items }. */
export function parsePolicy(text = '') {
  const blocks = [];
  let para = [];
  let list = null;

  const flushPara = () => {
    if (para.length) blocks.push({ type: 'p', text: para.join(' ') });
    para = [];
  };
  const flushList = () => {
    if (list) blocks.push({ type: 'ul', items: list });
    list = null;
  };

  for (const raw of String(text).split('\n')) {
    const line = raw.trim();
    if (!line) {
      flushPara();
      flushList();
    } else if (line.startsWith('## ')) {
      flushPara();
      flushList();
      blocks.push({ type: 'h', text: line.slice(3).trim() });
    } else if (line.startsWith('- ')) {
      flushPara();
      (list ??= []).push(line.slice(2).trim());
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();
  return blocks;
}

const INLINE = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|https?:\/\/[^\s)]+|[\w.+-]+@[\w-]+(?:\.[\w-]+)+)/g;

/** Split a line into inline pieces: { type: 'text' | 'b' | 'i' | 'url' | 'email', text }. */
export function parseInline(text = '') {
  return String(text)
    .split(INLINE)
    .filter(Boolean)
    .map((part) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return { type: 'b', text: part.slice(2, -2) };
      }
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        return { type: 'i', text: part.slice(1, -1) };
      }
      if (/^https?:\/\//.test(part)) return { type: 'url', text: part };
      if (/^[\w.+-]+@[\w-]+(?:\.[\w-]+)+$/.test(part)) return { type: 'email', text: part };
      return { type: 'text', text: part };
    });
}
