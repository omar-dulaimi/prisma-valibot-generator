import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { TestEnvironment } from './helpers/mock-generators';

/**
 * The other suites load the generated barrel with `await import('.../index.ts')`,
 * which the Vitest loader resolves regardless of what tsc would say about the
 * specifiers inside it. This one reads the emitted text instead, so a specifier
 * that only a loader accepts cannot pass unnoticed.
 *
 * `npm run test:packed` is the full version: it packs the tarball, installs it
 * into an empty directory and actually runs tsc over the result. This is the
 * cheap guard that runs on every `npm test`.
 */
describe('generated import specifiers', () => {
  it('emits relative specifiers that tsc accepts in every module mode', async () => {
    const env = await TestEnvironment.createTestEnv('valibot-specifiers');
    const schema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./test.db"
}

generator valibot {
  provider = "node ${process.cwd()}/lib/generator.js"
  output   = "${env.outputDir}"
}

enum Role {
  USER
  ADMIN
}

model User {
  id    Int    @id @default(autoincrement())
  email String @unique
  role  Role
}

model Post {
  id    Int    @id @default(autoincrement())
  title String
}
`;

    writeFileSync(env.schemaPath, schema);
    await env.runGeneration();

    const emitted = readdirSync(env.outputDir);
    expect(emitted).toContain('index.ts');

    const offenders: string[] = [];
    for (const file of emitted) {
      const contents = readFileSync(join(env.outputDir, file), 'utf8');
      for (const [, specifier] of contents.matchAll(/from '(\.[^']*)'/g)) {
        // `.js` resolves to the sibling `.ts` under bundler, node10, node16 and
        // nodenext, in both CommonJS and ESM, with no compiler flag. `.ts` needs
        // allowImportingTsExtensions (TS5097), which forbids emit; extensionless
        // breaks under node16/nodenext ESM (TS2835).
        if (!specifier.endsWith('.js')) {
          offenders.push(`${file}: ${specifier}`);
        }
      }
    }
    expect(offenders).toEqual([]);

    const barrel = readFileSync(join(env.outputDir, 'index.ts'), 'utf8');
    expect(barrel).toContain("export * from './User.schema.js';");
    expect(barrel).toContain("export * from './Post.schema.js';");
    expect(barrel).toContain("export * from './enums.js';");

    const userSchema = readFileSync(
      join(env.outputDir, 'User.schema.ts'),
      'utf8',
    );
    expect(userSchema).toContain("from './enums.js'");

    await env.cleanup();
  });
});
