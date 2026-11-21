# Parser-bont

A JavaScript CSV parser candidate for the make.fun bounty **Read broken CSV files faster**.

> Status: implementation and local differential tests are in progress. The official `csv-reader@1.0.0` baseline and bounty harness have not yet been obtained, so compatibility with the official evaluator is not claimed.

## Runtime

- Node.js 22
- JavaScript ES modules; no WASM, native addons, or prebuilt binaries
- Entry point: `solve.js` (`export function run(input)`)
- Input: `{ text: string, header: boolean }`
- Output: `{ columns, rows, errors }`

## Local checks

```sh
node fuzz.mjs 600000 7
node bench.mjs
```

When the official baseline is available:

```sh
BASELINE=./baseline.js node fuzz.mjs 2000000 7
BASELINE=./baseline.js node bench.mjs
```

The local `reference.js` is a provisional oracle derived from the task summary. Passing it does **not** establish exact compatibility with the official baseline.

## Files

- `solve.js` — hybrid fast/slow parser implementation
- `reference.js` — deliberately simple provisional oracle
- `fuzz.mjs` — deterministic differential fuzzer with mismatch shrinking
- `bench.mjs` — CPU-time comparison harness
- `main.ts` — provisional stdin/stdout adapter; must be aligned with the official kit contract

## License

MIT. See [LICENSE](./LICENSE).
