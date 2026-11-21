// solve.js — hybrid CSV reader.
// Fast path: lines with no `"` and no stray `\r` are cut with indexOf/slice.
// Slow path: anything else goes through a faithful port of the spec rules.

const codes = [];
let K = 0; // end index set by plain()
let SI = 0; // record end index set by slowRecord()
let SDL = 0; // line delta set by slowRecord()

// Read an unquoted run from s up to `,` / LF / CRLF. Lone CR is dropped (stray_cr).
function plain(text, s, n) {
  let piece = '';
  let k = s;
  let from = s;
  while (k < n) {
    const ch = text.charCodeAt(k);
    if (ch === 44 || ch === 10) break;
    if (ch === 13) {
      if (text.charCodeAt(k + 1) === 10) break;
      piece += text.slice(from, k);
      codes.push('stray_cr');
      from = ++k;
      continue;
    }
    k++;
  }
  K = k;
  return from === s ? text.slice(s, k) : piece + text.slice(from, k);
}

function slowRecord(text, i, n) {
  const fields = [];
  let dl = 0;
  for (;;) {
    let f;
    if (text.charCodeAt(i) === 34) {
      let j = i + 1;
      let q;
      for (;;) {
        q = text.indexOf('"', j);
        if (q === -1 || text.charCodeAt(q + 1) !== 34) break;
        j = q + 2;
      }
      if (q !== -1) {
        let raw = text.slice(i + 1, q);
        if (raw.indexOf('"') !== -1) raw = raw.replaceAll('""', '"');
        if (raw.indexOf('\r') !== -1) raw = raw.replace(/\r\n?/g, '\n');
        for (let p = raw.indexOf('\n'); p !== -1; p = raw.indexOf('\n', p + 1)) dl++;
        const junk = plain(text, q + 1, n);
        if (junk.length) {
          raw += junk;
          codes.push('quote_junk');
        }
        f = raw;
      } else {
        // never closed: the quote is an ordinary char, rest re-read as unquoted
        codes.push('unterminated_quote');
        f = '"' + plain(text, i + 1, n);
      }
    } else {
      f = plain(text, i, n);
    }
    fields.push(f);
    i = K;
    if (i >= n) break;
    const ch = text.charCodeAt(i);
    if (ch === 44) {
      i++;
      continue;
    }
    if (ch === 10) {
      i++;
      dl++;
      break;
    }
    i += 2; // CRLF
    dl++;
    break;
  }
  SI = i;
  SDL = dl;
  return fields;
}

export function run({ text, header }) {
  const n = text.length;
  let i = n > 0 && text.charCodeAt(0) === 0xfeff ? 1 : 0;
  let line = 1;
  let columns = null;
  const rows = [];
  const errors = [];
  let width = -1;
  // lazily-refreshed "next occurrence" caches keep the whole scan O(n)
  let nq = text.indexOf('"', i);
  let ncr = text.indexOf('\r', i);
  let nc = text.indexOf(',', i);

  while (i < n) {
    const c = text.charCodeAt(i);
    if (c === 10) {
      i++;
      line++;
      continue;
    }
    if (c === 13 && text.charCodeAt(i + 1) === 10) {
      i += 2;
      line++;
      continue;
    }
    if (nq !== -1 && nq < i) nq = text.indexOf('"', i);
    if (ncr !== -1 && ncr < i) ncr = text.indexOf('\r', i);
    const eol = text.indexOf('\n', i);
    const end = eol === -1 ? n : eol;

    let simple = nq === -1 || nq >= end;
    let fe = end;
    if (simple && ncr !== -1 && ncr < end) {
      if (eol !== -1 && ncr === end - 1) fe = end - 1; // plain CRLF terminator
      else simple = false;
    }

    const startLine = line;
    let fields;
    let nerr = 0;
    if (simple) {
      fields = [];
      if (nc !== -1 && nc < i) nc = text.indexOf(',', i);
      let s = i;
      while (nc !== -1 && nc < fe) {
        fields.push(text.slice(s, nc));
        s = nc + 1;
        nc = text.indexOf(',', s);
      }
      fields.push(text.slice(s, fe));
      i = eol === -1 ? n : eol + 1;
      line++;
    } else {
      codes.length = 0;
      fields = slowRecord(text, i, n);
      i = SI;
      line += SDL;
      nerr = codes.length;
    }

    const isHeader = header && width === -1;
    const row = isHeader ? null : rows.length;
    for (let e = 0; e < nerr; e++) errors.push({ code: codes[e], line: startLine, row });

    const len = fields.length;
    if (width === -1) {
      width = len;
    } else if (len < width) {
      errors.push({ code: 'short_row', line: startLine, row, fields: len });
      do fields.push(''); while (fields.length < width);
    } else if (len > width) {
      errors.push({ code: 'long_row', line: startLine, row, extra: fields.slice(width) });
      fields.length = width;
    }
    if (isHeader) columns = fields;
    else rows.push(fields);
  }
  return { columns, rows, errors };
}
