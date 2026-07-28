## [2.0.0](https://github.com/omar-dulaimi/prisma-valibot-generator/compare/v1.2.0...v2.0.0) (2026-07-28)

### ⚠ BREAKING CHANGES

* **breaking:** every relative import in the generated output now ends in
`.js` rather than `.ts`, so regenerate after upgrading. Toolchains that resolve
specifiers literally against the filesystem, notably Deno and Node's own type
stripping, must now compile the generated files with tsc or a bundler instead
of executing them directly. Every tsc and bundler configuration is either
unaffected or fixed by this change.

Claude-Session: https://claude.ai/code/session_018FDR2Y8LpjgfsdD4FhQVZZ

### 🐛 Bug Fixes

* **breaking:** emit .js import specifiers so generated code compiles ([188611b](https://github.com/omar-dulaimi/prisma-valibot-generator/commit/188611b487838e2d3860defca98bb850b5a04f33))

### 📚 Documentation

* **ci:** describe the workflows that exist and the auth that works ([2d344cd](https://github.com/omar-dulaimi/prisma-valibot-generator/commit/2d344cdda2376bf0b483d9d4191344b8282a433f))

## [1.2.0](https://github.com/omar-dulaimi/prisma-valibot-generator/compare/v1.1.0...v1.2.0) (2025-09-26)

### 🚀 Features

* **generator:** enhance enum handling and error validation ([909caaa](https://github.com/omar-dulaimi/prisma-valibot-generator/commit/909caaab7e838732b00bab12a6bf012de9c68f26))
* **readme:** Added support for enumerations and configurable options for schema generation. ([f602918](https://github.com/omar-dulaimi/prisma-valibot-generator/commit/f6029188d4a0d617bf796585e0df4a2f400254e5))

### 🐛 Bug Fixes

* **generator:** address multiple validation and type safety issues ([1ea7b3d](https://github.com/omar-dulaimi/prisma-valibot-generator/commit/1ea7b3debcca8583b9fbf35504c5f61481da87a6))
* **scripts:** update npm test to run all test files ([e871f06](https://github.com/omar-dulaimi/prisma-valibot-generator/commit/e871f0603d50f59ced8542718fd91c7a67f5b039))

### 📚 Documentation

* **readme:** enhance documentation with comprehensive examples ([b591739](https://github.com/omar-dulaimi/prisma-valibot-generator/commit/b591739f1fa75363ba071dd240cc57268f915f87))

## [1.1.0](https://github.com/omar-dulaimi/prisma-valibot-generator/compare/v1.0.0...v1.1.0) (2025-08-16)

### 🚀 Features

* **generator:** make generated schemas and types tree-shakable and export types for schema outputs ([8a1a076](https://github.com/omar-dulaimi/prisma-valibot-generator/commit/8a1a0761aef502732d69694ee8450abe2dd7e3a7))

## 1.0.0 (2025-08-16)

### 🚀 Features

* initial release ([53da73c](https://github.com/omar-dulaimi/prisma-valibot-generator/commit/53da73c8fb53c042528b33fb7b3a61714fd82e8a))

### 📚 Documentation

* **readme:** comment out docs website links and badge; add lockfile for CI ([4787c8d](https://github.com/omar-dulaimi/prisma-valibot-generator/commit/4787c8dc679c788789d989ad36eabb6e8ec02e94))
