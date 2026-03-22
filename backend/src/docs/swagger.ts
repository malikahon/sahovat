import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'yaml';
import type { Express } from 'express';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function setupSwagger(app: Express): void {
  const yamlContent = readFileSync(join(__dirname, 'openapi.yaml'), 'utf-8');
  const spec = parse(yamlContent);

  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(spec, {
      customSiteTitle: 'Sahovat API Documentation',
      customCss: '.swagger-ui .topbar { display: none }',
    }),
  );
}
