// reference.js — deliberately simple, char-by-char reading of the spec.
// Used as the oracle until the real csv-reader 1.0.0 baseline is available.
// Spots marked ASSUMPTION are ambiguous in the summary: confirm against the baseline.

export function reference({ text, header }) {
  const n = text.length;
  let i = n > 0 && text[0] === '\uFEFF' ? 1 : 0;
  let line = 1;
  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;

  while (i < n) {
    // blank line = no record
    if (text[i] === '\n') { i++; line++; continue; }
    if (text[i] === '\r' && text[i + 1] === '\n') { i += 2; line++; continue; }

    const startLine = line;
    const fields = [];
    const codes = [];

    const readPlain = () => {
      let s = '';
      while (i < n) {
        const c = text[i];
        if (c === ',' || c === '\n') break;
        if (c === '\r') {
          if (text[i + 1] === '\n') break;
          codes.push('stray_cr'); // ASSUMPTION: also applies to junk after a closing quote
          i++;
          continue;
        }
        s += c;
        i++;
      }
      return s;
    };

    for (;;) {
      let f = '';
      let plainField = true;
      if (text[i] === '"') {
        let j = i + 1;
        let buf = '';
        let ln = 0;
        let closed = false;
        while (j < n) {
          const c = text[j];
          if (c === '"') {
            if (text[j + 1] === '"') { buf += '"'; j += 2; continue; }
            closed = true;
            j++;
            break;
          }
          if (c === '\r') { if (text[j + 1] === '\n') j++; buf += '\n'; ln++; j++; continue; }
          if (c === '\n') { buf += '\n'; ln++; j++; continue; }
          buf += c;
          j++;
        }
        if (closed) {
          plainField = false;
          f = buf;
          line += ln;
          i = j;
          const junk = readPlain();
          if (junk.length) { f += junk; codes.push('quote_junk'); }
        } else {
          codes.push('unterminated_quote');
          f = '"';
          i++;
        }
      }
      if (plainField) f += readPlain();
      fields.push(f);
      if (i >= n) break;
      if (text[i] === ',') { i++; continue; }
      if (text[i] === '\n') { i++; line++; break; }
      i += 2; // CRLF
      line++;
      break;
    }

    const isHeader = header && width === -1;
    const row = isHeader ? null : rows.length;
    for (const code of codes) errors.push({ code, line: startLine, row });
    if (width === -1) width = fields.length;
    else if (fields.length < width) {
      errors.push({ code: 'short_row', line: startLine, row, fields: fields.length });
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      errors.push({ code: 'long_row', line: startLine, row, extra: fields.slice(width) });
      fields.length = width;
    }
    if (isHeader) columns = fields;
    else rows.push(fields);
  }
  return { columns, rows, errors };
}
