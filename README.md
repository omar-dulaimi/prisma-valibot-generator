<div align="center">
	<h1>Prisma Valibot Generator</h1>
	<p><strong>Prisma → Valibot in one generate. Ship validated, typed data everywhere.</strong></p>
	<p>
		<a href="https://www.npmjs.com/package/prisma-valibot-generator"><img alt="npm version" src="https://img.shields.io/npm/v/prisma-valibot-generator.svg?color=16C464&label=npm"></a>
		<a href="https://www.npmjs.com/package/prisma-valibot-generator"><img alt="downloads" src="https://img.shields.io/npm/dw/prisma-valibot-generator.svg?color=8B5CF6&label=downloads"></a>
		<a href="https://github.com/omar-dulaimi/prisma-valibot-generator/actions"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/omar-dulaimi/prisma-valibot-generator/ci.yml?branch=master&label=CI"></a>
		<a href="https://github.com/omar-dulaimi/prisma-valibot-generator/blob/master/LICENSE"><img alt="MIT" src="https://img.shields.io/badge/license-MIT-0a0a0a.svg"></a>
		<img alt="TypeScript" src="https://img.shields.io/badge/types-TypeScript-blue.svg">
		<img alt="Module formats" src="https://img.shields.io/badge/modules-ESM%20%2B%20CJS-444.svg">
	</p>
        <sub>
                Prisma → Valibot generator: zero‑boilerplate validation for your models.<br/>
                🎯 Type-safe · 🧹 Clean schemas · 🔧 Configurable · 📏 Tree-shakeable
        </sub>
</div>

<!-- Documentation site removed for now -->

## Highlights

- **🚀 Generate Valibot schemas** from your Prisma models automatically
- **📦 Per-model exports**:
  - `{Model}Schema` (all fields required)
  - `Create{Model}Schema` (required scalars only)
  - `Update{Model}Schema` (all fields optional)
- **🎯 Advanced enum support**: Dedicated `enums.ts` with `v.picklist()` + value exports
- **🧹 Clean schemas**: Relations automatically excluded for focused validation
- **🔧 Full type coverage**: String/Int/Float/Boolean/DateTime/Json/Decimal/BigInt/Bytes/Arrays
- **⚙️ Configurable**: `enumValue` option supports `@map` for custom enum values
- **🛡️ Type-safe**: Runtime validation with comprehensive error handling
- **📏 Lightweight**: Tree-shakeable exports, minimal runtime overhead

## Prerequisites

- Node.js 18+
- Prisma 6.12+
- valibot

## Quick start

1) Star this repo 🌟

2) Install

```bash
npm i -D prisma-valibot-generator
# pnpm: pnpm add -D prisma-valibot-generator
# yarn: yarn add -D prisma-valibot-generator
# bun:  bun add -d prisma-valibot-generator
```

3) Add a generator block to your `schema.prisma`

```prisma
generator valibot {
  provider  = "prisma-valibot-generator"
  output    = "./src/generated/valibot" // optional
  enumValue = "name" // optional: "name" (default) | "dbName" (for @map support)
}
```

4) Generate

```bash
npx prisma generate
```

5) Import and use

```ts
import * as v from 'valibot';
import { 
  UserSchema, 
  CreateUserSchema, 
  UpdateUserSchema, 
  RoleEnum,
  RoleValues 
} from './src/generated/valibot';

// Validate complete model data
const user = v.parse(UserSchema, {
  id: 1,
  email: 'john@example.com',
  name: 'John Doe',
  role: 'ADMIN'
});

// Validate creation data (only required fields)
const newUser = v.parse(CreateUserSchema, { 
  email: 'jane@example.com',
  password: 'secret123'
});

// Validate updates (all fields optional)
const userUpdate = v.parse(UpdateUserSchema, { 
  name: 'Jane Smith' 
});

// Validate enums
const role = v.parse(RoleEnum, 'USER');

// Access enum values for UI components
console.log(RoleValues); // ['USER', 'ADMIN']
```

> On `"moduleResolution": "node16"` or `"nodenext"` in an ESM package, TypeScript does not allow
> importing a directory. Point at the barrel file instead:
> `import { UserSchema } from './src/generated/valibot/index.js';`

## Features

### 🎯 Enum Support

```prisma
enum Role {
  USER
  ADMIN     @map("administrator")
  MODERATOR @map("mod")
}

generator valibot {
  provider  = "prisma-valibot-generator"
  enumValue = "dbName" // Use @map values
}
```

```ts
import { RoleEnum, RoleValues } from './generated/valibot';

// Generated enum values respect @map
console.log(RoleValues); // ['USER', 'administrator', 'mod']

// Validation works with mapped values
v.parse(RoleEnum, 'administrator'); // ✅ Valid
v.parse(RoleEnum, 'ADMIN');         // ❌ Invalid
```

### 🧹 Relation Handling

Relations are automatically excluded from generated schemas for clean validation:

```prisma
model User {
  id    Int    @id
  email String
  posts Post[] // Excluded from schemas
}

model Post {
  id       Int  @id
  title    String
  author   User @relation(fields: [authorId], references: [id]) // Excluded
  authorId Int  // Included - it's a scalar field
}
```

### 🔧 Array Support

Arrays are fully supported with proper validation:

```prisma
model User {
  id       Int      @id
  tags     String[]
  scores   Int[]
}
```

```ts
const user = v.parse(UserSchema, {
  id: 1,
  tags: ['developer', 'typescript'],
  scores: [95, 87, 92]
});
```

### ⚙️ Configuration Options

| Option | Values | Default | Description |
|--------|--------|---------|-------------|
| `output` | `string` | `"./generated"` | Output directory for generated files |
| `enumValue` | `"name"` \| `"dbName"` | `"name"` | Whether to use enum names or `@map` values |

## Error Handling

The generator provides clear, actionable error messages:

```bash
# Invalid enum configuration
❌ Invalid enumValue config: 'invalid'. Must be 'name' or 'dbName'.

# Missing enum definition  
❌ Enum 'Status' not found in schema. Available enums: Role, Priority

# Empty enum
❌ Enum 'Status' has no values. Enums must have at least one value.
```

<!-- ## Docs & recipes -->

## Sponsor ❤️

If this saves you time or prevents bugs, please consider sponsoring to support maintenance and new features.

→ https://github.com/sponsors/omar-dulaimi

## Contributing

PRs welcome. Keep diffs focused and discuss larger changes in an issue first. See the test suites for expected behavior and coverage.

## License

MIT © [Omar Dulaimi](https://github.com/omar-dulaimi)
