#!/usr/bin/env node
/**
 * Clean-room check of the artifact users actually receive.
 *
 * The unit tests import the generator from `src/` and load the generated barrel
 * with `await import('.../index.ts')`, which the Vitest loader resolves happily
 * no matter what tsc would say about it. That leaves the whole publish path
 * unchecked, so this script does what a user does instead:
 *
 *   build -> package.sh -> npm pack -> install the tarball into an empty dir
 *   -> npx prisma generate -> tsc --noEmit over the generated output
 *
 * The generated files are TypeScript sources the consumer compiles, so they are
 * type-checked under every moduleResolution tsc supports, in both CommonJS and
 * ESM. A generator that emits an import specifier only some of those accept is
 * broken for the rest, and that is invisible from inside this repo.
 */
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const keepTemp = process.argv.includes('--keep');

const log = (msg) => console.log(`[verify-packed] ${msg}`);

function run(command, args, cwd, extraEnv = {}) {
  try {
    return execFileSync(command, args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ...extraEnv },
    });
  } catch (error) {
    const detail = `${error.stdout ?? ''}${error.stderr ?? ''}`.trim();
    throw new Error(
      `\`${command} ${args.join(' ')}\` failed in ${cwd}\n${detail}`,
    );
  }
}

/** tsc, but non-zero exit is a value rather than a throw. */
function typeCheck(projectDir) {
  const tsc = path.join(projectDir, 'node_modules', 'typescript', 'bin', 'tsc');
  try {
    run(
      process.execPath,
      [tsc, '--noEmit', '-p', path.join(projectDir, 'tsconfig.json')],
      projectDir,
    );
    return { ok: true, output: '' };
  } catch (error) {
    // run() already folded stdout and stderr into the message.
    return { ok: false, output: error.message };
  }
}

const SCHEMA = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  // A literal URL, not env(): prisma generate never connects, and this keeps the
  // check from depending on a DATABASE_URL being exported on the runner.
  provider = "postgresql"
  url      = "postgresql://user:pass@localhost:5432/db"
}

generator valibot {
  provider = "prisma-valibot-generator"
  output   = "../src/generated/valibot"
}

model User {
  id       Int     @id @default(autoincrement())
  email    String  @unique
  name     String?
  password String
  role     Role?
  tags     String[]
  posts    Post[]
}

model Post {
  id       Int    @id @default(autoincrement())
  title    String
  author   User?  @relation(fields: [authorId], references: [id])
  authorId Int?
}

enum Role {
  USER
  ADMIN
}
`;

// README step 5, as a consumer would write it.
const consumer = (barrelSpecifier) => `import * as v from 'valibot';
import {
  UserSchema,
  CreateUserSchema,
  UpdateUserSchema,
  RoleEnum,
  RoleValues,
} from '${barrelSpecifier}';

const user = v.parse(UserSchema, {
  id: 1,
  email: 'john@example.com',
  name: 'John Doe',
  password: 'secret123',
  role: 'ADMIN',
  tags: ['a'],
});
const newUser = v.parse(CreateUserSchema, { email: 'jane@example.com', password: 'secret123' });
const userUpdate = v.parse(UpdateUserSchema, { name: 'Jane Smith' });
const role = v.parse(RoleEnum, 'USER');

void user;
void newUser;
void userUpdate;
void role;
void RoleValues;
`;

/**
 * Every module setting a consumer can compile the generated files under.
 *
 * `barrelSpecifier` differs only because node16/nodenext ESM forbids importing a
 * directory. That is the consumer's own import to write; what is under test is
 * the specifiers the generator emits inside the files it writes.
 */
const MODES = [
  {
    name: 'bundler/esm',
    type: 'module',
    module: 'esnext',
    moduleResolution: 'bundler',
    barrelSpecifier: './generated/valibot',
  },
  {
    name: 'node10/cjs',
    type: 'commonjs',
    module: 'commonjs',
    moduleResolution: 'node10',
    barrelSpecifier: './generated/valibot',
  },
  {
    name: 'node16/cjs',
    type: 'commonjs',
    module: 'node16',
    moduleResolution: 'node16',
    barrelSpecifier: './generated/valibot',
  },
  {
    name: 'node16/esm',
    type: 'module',
    module: 'node16',
    moduleResolution: 'node16',
    barrelSpecifier: './generated/valibot/index.js',
  },
  {
    name: 'nodenext/esm',
    type: 'module',
    module: 'nodenext',
    moduleResolution: 'nodenext',
    barrelSpecifier: './generated/valibot/index.js',
  },
];

function depRange(name) {
  const pkg = JSON.parse(
    readFileSync(path.join(repoRoot, 'package.json'), 'utf8'),
  );
  const range = pkg.dependencies?.[name] ?? pkg.devDependencies?.[name];
  if (!range)
    throw new Error(`no version range for ${name} in the root package.json`);
  return `${name}@${range}`;
}

const failures = [];
const workspace = mkdtempSync(path.join(tmpdir(), 'pvg-packed-'));

try {
  log('building and staging package/ via package.sh');
  run('bash', [path.join(repoRoot, 'package.sh')], repoRoot);

  log('packing the tarball');
  const packOutput = run(
    'npm',
    ['pack', '--silent', '--pack-destination', workspace],
    path.join(repoRoot, 'package'),
  );
  const tarball = path.join(
    workspace,
    packOutput.trim().split('\n').pop().trim(),
  );

  const app = path.join(workspace, 'app');
  mkdirSync(path.join(app, 'prisma'), { recursive: true });
  writeFileSync(
    path.join(app, 'package.json'),
    JSON.stringify(
      { name: 'pvg-clean-room', version: '1.0.0', private: true },
      null,
      2,
    ),
  );
  writeFileSync(path.join(app, 'prisma', 'schema.prisma'), SCHEMA);

  log('installing the tarball into an empty project');
  run(
    'npm',
    [
      'install',
      '--no-audit',
      '--no-fund',
      '--loglevel=error',
      tarball,
      depRange('prisma'),
      depRange('@prisma/client'),
      depRange('valibot'),
      depRange('typescript'),
    ],
    app,
  );

  log('running prisma generate');
  // Prisma spawns the generator by the bare `provider` name, so node_modules/.bin
  // has to be on PATH exactly as `npx`/`npm run` would put it there.
  const binDir = path.join(app, 'node_modules', '.bin');
  run(path.join(binDir, 'prisma'), ['generate'], app, {
    PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
  });

  const generatedDir = path.join(app, 'src', 'generated', 'valibot');
  const emitted = readdirSync(generatedDir);
  log(`generated: ${emitted.join(', ')}`);

  // Fast, readable failure before the tsc runs produce their wall of errors.
  for (const file of emitted) {
    const contents = readFileSync(path.join(generatedDir, file), 'utf8');
    for (const [, specifier] of contents.matchAll(/from '(\.[^']*)'/g)) {
      if (specifier.endsWith('.ts')) {
        failures.push(
          `${file}: emits a '.ts' import specifier (${specifier}); tsc rejects it without allowImportingTsExtensions`,
        );
      } else if (!specifier.endsWith('.js')) {
        failures.push(
          `${file}: emits an extensionless import specifier (${specifier}); node16/nodenext ESM rejects it`,
        );
      }
    }
  }

  for (const mode of MODES) {
    const dir = path.join(workspace, `check-${mode.name.replace('/', '-')}`);
    mkdirSync(path.join(dir, 'src'), { recursive: true });
    cpSync(
      path.join(app, 'src', 'generated'),
      path.join(dir, 'src', 'generated'),
      { recursive: true },
    );
    cpSync(path.join(app, 'node_modules'), path.join(dir, 'node_modules'), {
      recursive: true,
    });
    writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify(
        {
          name: 'pvg-consumer',
          version: '1.0.0',
          private: true,
          type: mode.type,
        },
        null,
        2,
      ),
    );
    writeFileSync(
      path.join(dir, 'src', 'consumer.ts'),
      consumer(mode.barrelSpecifier),
    );
    writeFileSync(
      path.join(dir, 'tsconfig.json'),
      JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2022',
            module: mode.module,
            moduleResolution: mode.moduleResolution,
            strict: true,
            noEmit: true,
            skipLibCheck: true,
          },
          include: ['src/**/*.ts'],
        },
        null,
        2,
      ),
    );

    const result = typeCheck(dir);
    log(
      `${result.ok ? 'PASS' : 'FAIL'}  tsc  module=${mode.module} moduleResolution=${mode.moduleResolution} type=${mode.type}`,
    );
    if (!result.ok) {
      failures.push(
        `${mode.name}: generated output does not compile\n${result.output.split(dir).join('.')}`,
      );
    }
  }
} catch (error) {
  // A step that cannot even run is itself a failure of the published package.
  failures.push(error.message);
} finally {
  if (keepTemp) {
    log(`left workspace at ${workspace}`);
  } else {
    rmSync(workspace, { recursive: true, force: true });
  }
}

if (failures.length > 0) {
  console.error(
    '\n[verify-packed] the published package produces output that does not compile:\n',
  );
  for (const failure of failures) console.error(`  - ${failure}\n`);
  process.exit(1);
}

log(
  'OK: the packed generator emits output that compiles under every module mode checked',
);
