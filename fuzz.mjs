// Usage:
//   node fuzz.mjs [iterations=300000] [seed=1]
//   BASELINE=./baseline.js node fuzz.mjs 2000000 7   (baseline must export `run`)
// Compares solve.js against the oracle (baseline if given, else reference.js)
// using JSON.stringify, so key order and types must match too.
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { run } from './solve.js';
import { reference } from './reference.js';

const iters = Number(process.argv[2] ?? 300000);
const seed = Number(process.argv[3] ?? 1);
const oracle = process.env.BASELINE
  ? (await import(pathToFileURL(resolve(process.env.BASELINE)).href)).run
  : reference;

function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(seed);
const TOK = ['a', 'b', '1', ' ', ',', ',', ',', '"', '"', '"', '""', '\n', '\n', '\r\n', '\r\n', '\r', '\uFEFF'];

const gen = () => {
  const len = Math.floor(rnd() * (rnd() < 0.1 ? 120 : 30));
  const t = [];
  for (let k = 0; k < len; k++) t.push(TOK[Math.floor(rnd() * TOK.length)]);
  return t;
};
const bad = (toks, header) => {
  const input = { text: toks.join(''), header };
  return JSON.stringify(run(structuredClone(input))) !== JSON.stringify(oracle(structuredClone(input)));
};

for (let k = 0; k < iters; k++) {
  let toks = gen();
  const header = rnd() < 0.5;
  if (!bad(toks, header)) continue;
  // greedy shrink
  for (let changed = true; changed; ) {
    changed = false;
    for (let p = 0; p < toks.length; p++) {
      const t2 = toks.slice(0, p).concat(toks.slice(p + 1));
      if (bad(t2, header)) { toks = t2; changed = true; p--; }
    }
  }
  const input = { text: toks.join(''), header };
  console.log('MISMATCH after', k, 'cases (seed', seed + ')');
  console.log('input   :', JSON.stringify(input));
  console.log('solve   :', JSON.stringify(run(input)));
  console.log('oracle  :', JSON.stringify(oracle(input)));
  process.exit(1);
}
console.log(`OK: ${iters} random cases identical (seed ${seed})`);
