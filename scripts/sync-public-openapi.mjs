import { writeFileSync } from 'node:fs';
import { publicOpenApi } from '../src/lib/public-openapi.ts';
writeFileSync(new URL('../openapi.yaml', import.meta.url), JSON.stringify(publicOpenApi, null, 2) + '\n');
