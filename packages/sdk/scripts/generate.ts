import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import openapiTS, { astToString } from 'openapi-typescript';

const openapiPath = resolve(import.meta.dir, '../../../apps/api/openapi.yaml');
const outputPath = resolve(import.meta.dir, '../src/generated/types.ts');
const openapiUrl = new URL(`file://${openapiPath}`);

const ast = await openapiTS(openapiUrl, {
  alphabetize: true,
  immutable: false,
  exportType: true,
});
const output = astToString(ast);

await mkdir(dirname(outputPath), { recursive: true });
await Bun.write(outputPath, output);

console.log(`generated: ${outputPath}`);
