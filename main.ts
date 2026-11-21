// Provisional adapter. Replace this I/O contract when the official bounty kit is available.
// Node.js 22 runs this type-free .ts file with --experimental-strip-types.
import { readFileSync } from 'node:fs';
import { run } from './solve.js';

const input = JSON.parse(readFileSync(0, 'utf8'));
const output = run(input);
process.stdout.write(JSON.stringify(output));
