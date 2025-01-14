Workaround for:
 - [GitHub - TypeScript - Add flag to not transpile dynamic import() when module is CommonJS #43329](https://github.com/microsoft/TypeScript/issues/43329)
 - [GitHub - TypeScript - Allow ES Module Type-Only Imports from CJS Modules #49721](https://github.com/microsoft/TypeScript/issues/49721)
 - [Node.js Windows Bug ERR_UNSUPPORTED_ESM_URL_SCHEME](https://stackoverflow.com/questions/69665780/error-err-unsupported-esm-url-scheme-only-file-and-data-urls-are-supported-by/70057245#70057245)

Usage:

```js
import { import_ } from '@brillout/import'

// Same as `import()`
const module = await import_(moduleName)
```
