// Usage: node bench.mjs   (BASELINE=./baseline.js to compare against the real baseline)
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { run } from './solve.js';
import { reference } from './reference.js';

const base = process.env.BASELINE
  ? (await import(pathToFileURL(resolve(process.env.BASELINE)).href)).run
  : reference;

const rowsN = 20000;
const mk = (f) => Array.from({ length: rowsN }, (_, r) => f(r)).join('');
const cases = {
  plain: mk((r) => `id${r},name${r},city${r % 50},${r * 3}\n`),
  crlf: mk((r) => `id${r},name${r},city${r % 50},${r * 3}\r\n`),
  quoted: mk((r) => `id${r},"na,me ""${r}""","multi\nline ${r}",${r}\n`),
  broken: mk((r) => (r % 7 === 0 ? `id${r},"open,x\n` : r % 5 === 0 ? `id${r},"q"junk,2,3,4\n` : `id${r},a\r,b,c\n`)),
};

const cpu = (fn) => {
  const s = process.cpuUsage();
  fn();
  const d = process.cpuUsage(s);
  return (d.user + d.system) / 1000;
};

for (const [name, text] of Object.entries(cases)) {
  const input = { text, header: true };
  run(input); base(input); // warm up
  const best = (f) => Math.min(...Array.from({ length: 5 }, () => cpu(() => f(input))));
  const a = best(run);
  const b = best(base);
  const same = JSON.stringify(run(input)) === JSON.stringify(base(input));
  console.log(`${name.padEnd(7)} solve ${a.toFixed(1)}ms  oracle ${b.toFixed(1)}ms  x${(b / a).toFixed(1)}  ${same ? 'same' : 'DIFFERENT'}`);
}
