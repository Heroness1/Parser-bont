# Parser-bont

A JavaScript CSV parser candidate for the make.fun bounty **Read broken CSV files faster**.

> **Status:** implementation and local differential tests are in progress. The official `csv-reader@1.0.0` baseline and bounty harness have not yet been obtained, so compatibility with the official evaluator is not claimed.

## Runtime and contract

- Node.js 22
- JavaScript ES modules; no WASM, native addons, or prebuilt binaries
- Entry point: `solve.js` (`export function run(input)`)
- Input: `{ text: string, header: boolean }`
- Output: `{ columns, rows, errors }`

## Local checks

```sh
npm test
npm run bench
```

The local `reference.js` is a provisional oracle derived from the task summary. It is not the official baseline.

Current local verification:

- 600,000 seeded random differential cases passed against `reference.js` (seed 7).
- 335,923 exhaustive short strings (alphabet: `a`, comma, quote, CR, LF, BOM), both header modes, passed against `reference.js`.
- Internal CPU benchmark and pathological quote stress tests are available in `bench.mjs` and the development notes.

When the official baseline is available:

```sh
BASELINE=./baseline.js node fuzz.mjs 2000000 7
BASELINE=./baseline.js node bench.mjs
```

## Files

- `solve.js` — hybrid fast/slow parser implementation
- `reference.js` — deliberately simple provisional oracle
- `fuzz.mjs` — deterministic differential fuzzer with mismatch shrinking
- `bench.mjs` — CPU-time comparison harness
- `main.ts` — provisional stdin/stdout adapter; must be aligned with the official kit contract

Run the adapter on Node.js 22 with:

```sh
node --experimental-strip-types main.ts < input.json
```

## License

MIT. See [LICENSE](./LICENSE).
