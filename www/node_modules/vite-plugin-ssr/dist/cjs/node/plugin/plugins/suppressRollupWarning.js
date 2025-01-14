"use strict";
// Suppress Rollup warnings `Generated an empty chunk: "index.page.server"`
Object.defineProperty(exports, "__esModule", { value: true });
exports.suppressRollupWarning = void 0;
function suppressRollupWarning() {
    return {
        name: 'vite-plugin-ssr:suppressRollupWarning',
        apply: 'build',
        enforce: 'post',
        async configResolved(config) {
            const onWarnOriginal = config.build.rollupOptions.onwarn;
            config.build.rollupOptions.onwarn = function (warning, warn) {
                // Suppress
                if (suppressUnusedImport(warning))
                    return;
                if (suppressEmptyBundle(warning))
                    return;
                if (suppressUseClientDirective(warning))
                    return;
                // Pass through
                if (onWarnOriginal) {
                    onWarnOriginal.apply(this, arguments);
                }
                else {
                    warn(warning);
                }
            };
        }
    };
}
exports.suppressRollupWarning = suppressRollupWarning;
/** Suppress warning about Rollup removing the React Server Components `"use client";` directives */
function suppressUseClientDirective(warning) {
    return warning.code === 'MODULE_LEVEL_DIRECTIVE' && warning.message.includes('"use client"');
}
/** Suppress warning about generating emtpy chunks in dist/ */
function suppressEmptyBundle(warning) {
    return warning.code === 'EMPTY_BUNDLE';
}
/** Suppress warning about unused import statements */
function suppressUnusedImport(warning) {
    if (warning.code !== 'UNUSED_EXTERNAL_IMPORT')
        return false;
    // I guess it's expected that JSX contains unsused `import React from 'react'`
    if (warning.exporter === 'react' && warning.names?.includes('default'))
        return true;
    // If some library does something unexpected, we suppress since it isn't actionable
    if (warning.ids?.some((id) => id.includes('/node_modules/')))
        return true;
    return false;
}
