#!/usr/bin/env node
'use strict';

/**
 * Parse-time benchmark for pascal-parser.
 *
 * This repo is TypeScript/Node, not Rust, so `criterion` does not apply.
 * Rather than pull in a benchmarking dependency (e.g. tinybench) for a
 * three-case script, this uses `performance.now()` directly around a
 * warmed-up loop and reports percentiles — proportional to the size of the
 * benchmark itself.
 *
 * Not part of the published package (excluded via package.json "files").
 * Run after building:
 *
 *   npm run build -w pascal-parser
 *   npm run bench -w pascal-parser
 */

const { performance } = require('node:perf_hooks');
const { parse } = require('../dist/index.js');

/** Builds a synthetic program with `statementCount` if/else statements, to scale AST size. */
function generateSource(statementCount) {
  const lines = [];
  for (let i = 0; i < statementCount; i++) {
    const slot = (i % 5) + 1;
    lines.push(
      `    if (a[${slot}] > b) then a[${slot}] := a[${slot}] + i * 2 - 1 else b := b + 1;`,
    );
  }
  return `program Bench;
var
    a: array[1..5] of integer;
    b, i: integer;
begin
    a[1] := 5; a[2] := 2; a[3] := 8; a[4] := 1; a[5] := 9;
    b := 0;
${lines.join('\n')}
end.`;
}

const CASES = [
  { name: 'small', statementCount: 10 },
  { name: 'medium', statementCount: 500 },
  { name: 'large', statementCount: 5000 },
];

const WARMUP_ITERATIONS = 5;
const MEASURED_ITERATIONS = 50;

function percentile(sortedDurationsMs, p) {
  const index = Math.min(
    sortedDurationsMs.length - 1,
    Math.ceil((p / 100) * sortedDurationsMs.length) - 1,
  );
  return sortedDurationsMs[index];
}

function bench(source) {
  for (let i = 0; i < WARMUP_ITERATIONS; i++) parse(source);

  const durationsMs = [];
  for (let i = 0; i < MEASURED_ITERATIONS; i++) {
    const start = performance.now();
    parse(source);
    durationsMs.push(performance.now() - start);
  }
  durationsMs.sort((a, b) => a - b);
  return {
    p50: percentile(durationsMs, 50),
    p95: percentile(durationsMs, 95),
    p99: percentile(durationsMs, 99),
    min: durationsMs[0],
    max: durationsMs[durationsMs.length - 1],
  };
}

function formatMs(ms) {
  return `${ms.toFixed(3)} ms`;
}

console.log(
  `pascal-parser parse-time benchmark (${MEASURED_ITERATIONS} iterations, ${WARMUP_ITERATIONS} warmup)\n`,
);

for (const { name, statementCount } of CASES) {
  const source = generateSource(statementCount);
  const stats = bench(source);
  console.log(`${name} (${statementCount} statements, ${source.length} bytes)`);
  console.log(
    `  p50: ${formatMs(stats.p50)}  p95: ${formatMs(stats.p95)}  p99: ${formatMs(stats.p99)}  min: ${formatMs(stats.min)}  max: ${formatMs(stats.max)}`,
  );
  console.log('');
}
